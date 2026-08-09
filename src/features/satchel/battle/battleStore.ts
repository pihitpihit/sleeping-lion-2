import { create } from 'zustand'
import { STATE_EVENT } from '../accountChannel'
import { enterRoom, leaveRoom, type RoomBackend } from '../runtime/room'
import { soloRoom } from '../runtime/soloNet'
import {
  closeBattle,
  fetchBattleState,
  findMyBattle,
  findOpenBattle,
  joinBattle,
  leaveBattle,
  listParticipants,
  openBattle,
  openBattleWire,
  pushBattleState,
  sweepStaleBattles,
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
  /**
   * 새로고침 뒤 이미 앉아 있던 판으로 되돌아간다.
   *
   * 화면은 새로고침하면 전투를 잊지만 서버에는 앉아 있다고 남아 있다. 그대로
   * 두면 **본인은 공유 중인 줄 아는데 조작이 아무에게도 안 가는** 상태가 된다.
   */
  resume: (userId: string) => Promise<void>
  open: (partyId: string, userId: string) => Promise<void>
  join: (battle: BattleRow, userId: string) => Promise<void>
  /** 자리에서 일어난다. 판은 남는다. */
  leave: (userId: string) => Promise<void>
  /** 판을 접는다 — 행이 지워지고 값도 함께 간다. */
  close: (userId: string) => Promise<void>
  /**
   * 내 계정 방으로 들어간다.
   *
   * **전투에 앉지 않아도 기기끼리는 맞춰진다.** 전투는 다른 사람과 나누라고
   * 있는 것이지, 같은 사람의 기기 둘 사이에 협상할 것은 없다.
   */
  enterSolo: (userId: string) => Promise<void>
  clearError: () => void
}

/* --------------------------------------------------------------------------
   방 옮기기
   --------------------------------------------------------------------------
   구독과 통로를 붙이는 일은 `runtime/room.ts` 한 곳이 한다. 여기서는 **어느
   방으로 갈지만** 정한다 — 앉으면 전투 방, 일어나면 다시 내 계정 방이다.
   -------------------------------------------------------------------------- */

/** 전투 방. 값은 `battles.state`에 담기고 통로는 그 전투의 것이다. */
function battleRoom(battleId: string): RoomBackend {
  return {
    key: `battle:${battleId}`,
    fetch: () => fetchBattleState(battleId),
    push: (snapshot) => pushBattleState(battleId, snapshot),
    connect: (onState) => {
      const wire = openBattleWire(battleId, onState)
      return {
        send: (snapshot) => wire.send(STATE_EVENT, snapshot),
        // 전투 통로는 이 방만 쓰므로 통째로 닫는다.
        close: () => wire.close(),
      }
    },
  }
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

function goToBattle(battleId: string): Promise<void> {
  void refreshParticipants()
  return enterRoom(battleRoom(battleId))
}

/**
 * 전투에서 나와 내 계정 방으로 돌아간다.
 *
 * **판은 스토어에 그대로 남는다.** 자리에서 일어난다고 상 위의 것이 사라지지
 * 않는다 — 다만 이제부터는 내 방에만 쌓인다.
 */
function goToSolo(userId: string | null): Promise<void> {
  if (userId === null) {
    leaveRoom()
    return Promise.resolve()
  }
  return enterRoom(soloRoom(userId))
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

  resume: async (userId) => {
    if (get().battle !== null) return
    const mine = await findMyBattle(userId)
    if (!mine || get().battle !== null) return

    // 서버에 남아 있는 값이 사실이다. 내 화면 것을 올려보내지 않는다 — 자리를
    // 비운 사이에 남들이 굴린 판을 덮으면 안 된다.
    await goToBattle(mine.id)
    set({ battle: mine, participants: await listParticipants(mine.id) })
  },

  open: async (partyId, userId) => {
    set({ busy: true, error: null })
    try {
      const battle = await openBattle(partyId, userId)
      /**
       * **연 사람의 판이 첫 판이 된다.**
       *
       * 상 위에 이미 원소가 놓여 있는데 펴면서 비우면 실물과 어긋난다. 새 전투는
       * 표가 비어 있으므로 `enterRoom`의 맞추기가 알아서 내 것을 올린다 —
       * 빈 쪽이 알맹이를 밀어내지 못한다.
       */
      await goToBattle(battle.id)
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
      // **앉으면 판을 물려받는다.** 표를 먼저 읽고 맞춘 뒤 통로를 여는 것은
      // `enterRoom`이 한다.
      await goToBattle(battle.id)
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
    set({ battle: null, participants: [] })
    // 판은 그대로 두고 방만 내 것으로 옮긴다.
    await goToSolo(userId)
    try {
      await leaveBattle(battle.id, userId)
    } catch {
      // 자리에서 일어나는 것은 내 쪽에서 이미 끝났다. 서버가 늦어도 그만이다.
    }
  },

  close: async (userId) => {
    const battle = get().battle
    if (!battle) return
    set({ busy: true, error: null })
    await goToSolo(userId)
    try {
      await closeBattle(battle.id)
      set({ battle: null, participants: [] })
    } catch (cause) {
      set({ error: messageOf(cause) })
    } finally {
      set({ busy: false })
    }
  },

  /** 로그인한 사람이 정해지면 내 계정 방으로 들어간다. 전투 중이면 그대로 둔다. */
  enterSolo: async (userId) => {
    if (get().battle !== null) return
    await goToSolo(userId)
  },

  clearError: () => set({ error: null }),
}))
