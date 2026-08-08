import { create } from 'zustand'
import { useAttackDeckStore } from '../widgets/deck/deckStore'
import { useElementStore } from '../widgets/elements/elementStore'
import { useHpXpStore } from '../widgets/hpxp/hpxpStore'
import { useRoundStore } from '../widgets/round/roundStore'
import { captureRuntime, restoreRuntime, type RuntimeSnapshot } from '../runtime/snapshot'
import {
  closeBattle,
  fetchBattleState,
  findOpenBattle,
  joinBattle,
  leaveBattle,
  listParticipants,
  openBattle,
  openChannel,
  pushBattleState,
  sweepStaleBattles,
  type BattleChannel,
  type BattleRow,
  type Participant,
} from './battleNet'

/**
 * 전투 — 이번 판에 모인 사람들과 그들이 함께 보는 판.
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ **참여는 고르는 것이다. 안 앉으면 종전대로 혼자 돈다.**                   │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * 앉지 않으면 서버를 아예 부르지 않는다 — 행낭은 서버 없이 완전히 돌아야 한다
 * (절대 원칙 3). 앉으면 그때부터 판이 오간다.
 *
 * **전투는 파티에 매달리고 캠페인을 모른다**(구현 결정 19). 파티는 사람들의
 * 묶음이고 전투는 이번 판에 모인 사람들이다.
 */

interface BattleState {
  /** 지금 앉아 있는 판. 안 앉았으면 `null`. */
  battle: BattleRow | null
  participants: Participant[]
  /** 서버를 부르는 중. 단추를 잠근다. */
  busy: boolean
  error: string | null

  /** 이 파티에 열린 판이 있는지 살핀다. 앉지는 않는다. */
  look: (partyId: string) => Promise<BattleRow | null>
  open: (partyId: string, userId: string) => Promise<void>
  join: (battle: BattleRow, userId: string) => Promise<void>
  /** 자리에서 일어난다. 판은 남는다. */
  leave: (userId: string) => Promise<void>
  /** 판을 접는다 — 행이 지워지고 값도 함께 간다. */
  close: () => Promise<void>
  clearError: () => void
}

/* --------------------------------------------------------------------------
   판을 잇는 다리
   --------------------------------------------------------------------------
   스토어 넷이 바뀌면 뜬 뭉치를 통로로 보내고 표에 얹는다. 통로로 받은 것은
   스토어에 앉힌다.

   **받아서 앉히는 동안에는 보내지 않는다.** 안 그러면 앉히는 것이 다시 바뀜으로
   읽혀 되돌아 나가고, 둘이 서로 메아리를 주고받는다.
   -------------------------------------------------------------------------- */

/** 표에 얹는 것은 늦춘다. 통로가 이미 즉시 나르므로 급하지 않다. */
const PUSH_DELAY_MS = 1200

let channel: BattleChannel | null = null
let unsubscribes: (() => void)[] = []
let applying = false
let pushTimer: ReturnType<typeof setTimeout> | null = null

/**
 * 받은 판을 앉힌다.
 *
 * **앉히는 동안 빗장을 지른다.** Zustand의 구독 콜백은 `set` 안에서 **동기로**
 * 불리므로, 이 함수가 돌아올 때쯤이면 네 스토어의 알림이 이미 다 지나갔다.
 * 빗장이 없으면 그 알림들이 "내가 고쳤다"로 읽혀 되돌아 나가고, 두 기기가 서로
 * 메아리를 주고받는다.
 *
 * `finally`로 푸는 것은 복원 중에 하나가 던져도 빗장이 남지 않게 하기 위해서다 —
 * 남으면 그 뒤로 내 조작이 영영 안 나간다.
 */
function apply(snapshot: RuntimeSnapshot): void {
  applying = true
  try {
    restoreRuntime(snapshot)
  } finally {
    applying = false
  }
}

function detach(): void {
  if (pushTimer !== null) {
    clearTimeout(pushTimer)
    pushTimer = null
  }
  for (const off of unsubscribes) off()
  unsubscribes = []
  channel?.close()
  channel = null
}

/**
 * 앉은 사람 목록을 다시 읽는다.
 *
 * 스토어 액션이 아니라 모듈 함수로 둔다. 통로 콜백이 스토어보다 먼저 엮이므로
 * 액션으로 두면 아직 없는 것을 부르게 된다.
 */
async function refreshParticipants(): Promise<void> {
  const battle = useBattleStore.getState().battle
  if (!battle) return
  useBattleStore.setState({ participants: await listParticipants(battle.id) })
}

function attach(battleId: string): void {
  detach()

  channel = openChannel(
    battleId,
    (snapshot) => apply(snapshot),
    () => void refreshParticipants(),
  )

  const relay = () => {
    if (applying) return
    const snapshot = captureRuntime()
    channel?.send(snapshot)

    if (pushTimer !== null) clearTimeout(pushTimer)
    pushTimer = setTimeout(() => {
      pushTimer = null
      void pushBattleState(battleId, captureRuntime())
    }, PUSH_DELAY_MS)
  }

  unsubscribes = [
    useElementStore.subscribe(relay),
    useRoundStore.subscribe(relay),
    useHpXpStore.subscribe(relay),
    useAttackDeckStore.subscribe(relay),
  ]
}

function messageOf(cause: unknown): string {
  const raw = cause instanceof Error ? cause.message : String(cause ?? '')
  if (/fetch|network|Failed to fetch/i.test(raw)) return '서버에 닿지 못했다.'
  return '뜻대로 되지 않았습니다.'
}

export const useBattleStore = create<BattleState>((set, get) => ({
  battle: null,
  participants: [],
  busy: false,
  error: null,

  look: async (partyId) => {
    // 살피는 김에 잊힌 판을 거둔다. 사람은 판을 접지 않고 그냥 앱을 닫는다.
    void sweepStaleBattles()
    try {
      return await findOpenBattle(partyId)
    } catch {
      return null
    }
  },

  open: async (partyId, userId) => {
    set({ busy: true, error: null })
    try {
      const battle = await openBattle(partyId, userId)
      /**
       * **연 사람의 판이 첫 판이 된다.**
       *
       * 상 위에 이미 원소가 놓여 있는데 판을 펴면서 비우면 실물과 어긋난다.
       * 여기서는 표가 비어 있으므로 곧바로 지금 것을 얹는다.
       */
      await pushBattleState(battle.id, captureRuntime())
      attach(battle.id)
      set({ battle, participants: await listParticipants(battle.id) })
    } catch (cause) {
      set({ error: messageOf(cause) })
    } finally {
      set({ busy: false })
    }
  },

  join: async (battle, userId) => {
    set({ busy: true, error: null })
    try {
      await joinBattle(battle.id, userId)
      /**
       * **앉으면 판을 물려받는다.** 내 화면의 값이 아니라 상 위의 값이 사실이다.
       * 표를 먼저 읽고 앉힌 뒤에 통로를 연다 — 순서가 뒤면 물려받는 사이에 들어온
       * 갱신을 표에 있던 옛것이 덮는다.
       */
      const state = await fetchBattleState(battle.id)
      if (state) apply(state)
      attach(battle.id)
      set({ battle, participants: await listParticipants(battle.id) })
    } catch (cause) {
      set({ error: messageOf(cause) })
    } finally {
      set({ busy: false })
    }
  },

  leave: async (userId) => {
    const battle = get().battle
    if (!battle) return
    detach()
    set({ battle: null, participants: [] })
    try {
      await leaveBattle(battle.id, userId)
    } catch {
      // 자리에서 일어나는 것은 내 쪽에서 이미 끝났다. 서버가 늦어도 그만이다.
    }
  },

  close: async () => {
    const battle = get().battle
    if (!battle) return
    set({ busy: true, error: null })
    detach()
    try {
      await closeBattle(battle.id)
      set({ battle: null, participants: [] })
    } catch (cause) {
      set({ error: messageOf(cause) })
    } finally {
      set({ busy: false })
    }
  },

  clearError: () => set({ error: null }),
}))
