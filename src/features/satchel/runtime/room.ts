import { useAttackDeckStore } from '../widgets/deck/deckStore'
import { useElementStore } from '../widgets/elements/elementStore'
import { useGoldStore } from '../widgets/gold/goldStore'
import { useHpXpStore } from '../widgets/hpxp/hpxpStore'
import { useRoundStore } from '../widgets/round/roundStore'
import { captureRuntime, reconcileRuntime, restoreRuntime, type RuntimeSnapshot } from './snapshot'

/**
 * 판이 오가는 방.
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ **판 하나 = 방 하나. 혼자면 내 계정이 방이고, 전투에 앉으면 그 전투다.**  │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * 처음에는 전투에만 방을 두었다. 그러니 **같은 계정으로 두 곳에서 열면 화면이
 * 갈라졌다** — 전투는 다른 사람과 나누라고 만든 것인데, 같은 사람의 기기 둘
 * 사이에도 전투를 열어야 맞춰지는 꼴이었다. 형님이 짚었다.
 *
 * 방을 둘로 정리한다. 오가는 방식은 두 방이 같다:
 *
 * | 무엇 | 어떻게 |
 * |---|---|
 * | 즉시 | Broadcast — 탭은 로컬에서 먼저 먹고 곧장 퍼뜨린다 |
 * | 따라잡기 | 표 — 새로 들어오거나 새로고침한 사람이 읽는다 |
 *
 * **방을 옮기는 것은 이 파일 하나가 한다.** 전투에 앉고 일어나는 것은 곧 방을
 * 바꾸는 일이며, 두 곳에서 각자 구독을 붙이면 어느 쪽이 지금 방인지 흐려진다.
 */

/** 붙어 있는 동안 쓰는 손잡이. `close`는 이 방이 쓰던 것만 거둔다. */
export interface RoomChannel {
  close: () => void
}

/**
 * 방이 판을 담고 나르는 방식. 방마다 다른 것은 이것뿐이다.
 *
 * **통로를 여는 것도 방이 한다.** 계정 방은 계정 통로에 얹혀 가고(배치와 함께
 * 쓰므로 닫지 않는다), 전투 방은 제 통로를 따로 연다 — 자격을 정하는 근거가
 * 다르기 때문이다.
 */
export interface RoomBackend {
  /** 같은 방을 두 번 붙이지 않기 위한 이름. */
  key: string
  fetch: () => Promise<RuntimeSnapshot | null>
  push: (snapshot: RuntimeSnapshot) => Promise<boolean>
  /**
   * 서버가 밀어주는 변경을 받는다.
   *
   * **값이 함께 온다** — Postgres Changes는 밀기 전에 RLS로 자격을 보므로
   * 값을 실어도 안전하다(`changes.ts`).
   */
  connect: (onState: (snapshot: RuntimeSnapshot) => void) => RoomChannel
}

/**
 * 조작이 잇달아 들어올 때 잠잠해지기를 기다리는 시간.
 *
 * **표에 쓰는 것이 곧 남에게 가는 것이다.** 여기서 오래 끌면 옆 사람 화면이
 * 그만큼 늦게 바뀐다. 라운드를 넘기면 원소 여섯과 덱이 잇달아 움직이므로 묶기는
 * 해야 한다.
 */
const PUSH_DELAY_MS = 300

let current: RoomBackend | null = null
let channel: RoomChannel | null = null
let unsubscribes: (() => void)[] = []
let pushTimer: ReturnType<typeof setTimeout> | null = null

/**
 * 받은 판을 앉히는 동안 내 조작으로 오해하지 않게 지르는 빗장.
 *
 * Zustand의 구독 콜백은 `set` 안에서 **동기로** 불리므로, 앉히기가 끝날 때쯤이면
 * 네 스토어의 알림이 이미 다 지나갔다. 빗장이 없으면 그 알림들이 되돌아 나가고
 * 두 기기가 서로 메아리를 주고받는다.
 */
let applying = false

function apply(snapshot: RuntimeSnapshot): void {
  applying = true
  try {
    restoreRuntime(snapshot)
  } finally {
    // 복원 중에 하나가 던져도 빗장이 남으면 안 된다 — 남으면 그 뒤로 내 조작이
    // 영영 안 나간다.
    applying = false
  }
}

/** 지금 어느 방인가. 아무 방에도 없으면 `null`. */
export function currentRoomKey(): string | null {
  return current?.key ?? null
}

/** 방에서 나온다. 판은 스토어에 그대로 남는다 — 나오는 것이지 비우는 것이 아니다. */
export function leaveRoom(): void {
  if (pushTimer !== null) {
    clearTimeout(pushTimer)
    pushTimer = null
  }
  for (const off of unsubscribes) off()
  unsubscribes = []
  channel?.close()
  channel = null
  current = null
}

/**
 * 방에 들어간다.
 *
 * **표를 먼저 읽어 맞춘 뒤에 통로를 연다.** 순서가 뒤면 맞추는 사이에 들어온
 * 갱신을 표에 있던 옛것이 덮는다.
 *
 * 같은 방을 다시 부르면 아무 일도 하지 않는다 — 화면이 다시 그려질 때마다
 * 구독이 겹치면 한 번 만진 것이 여러 번 나간다.
 */
export async function enterRoom(backend: RoomBackend): Promise<void> {
  if (current?.key === backend.key) return
  leaveRoom()
  current = backend

  const remote = await backend.fetch()
  // 기다리는 사이에 다른 방으로 옮겨 갔으면 결과를 버린다.
  if (current?.key !== backend.key) return

  const { adopt, push } = reconcileRuntime(captureRuntime(), remote)
  if (adopt) apply(adopt)

  /**
   * 남이 만진 판이 왔다.
   *
   * 방 안에서는 **늦게 온 것이 그냥 이긴다.** 몇 초 단위로 여럿이 만지는 자리라
   * 시각을 견주면 손가락이 미끄러진다(구현 결정 22).
   *
   * **내가 올린 것이 돌아온 경우는 여기 오지 않는다** — 방 쪽에서 걸러낸다
   * (`EchoGuard`).
   */
  channel = backend.connect((snapshot) => {
    if (current?.key !== backend.key) return
    apply(snapshot)
  })

  /** 내가 만졌다 — 표에 쓴다. 서버가 알아서 남에게 밀어준다. */
  const relay = () => {
    if (applying) return
    if (pushTimer !== null) clearTimeout(pushTimer)
    pushTimer = setTimeout(() => {
      pushTimer = null
      void backend.push(captureRuntime())
    }, PUSH_DELAY_MS)
  }

  unsubscribes = [
    useElementStore.subscribe(relay),
    useRoundStore.subscribe(relay),
    useHpXpStore.subscribe(relay),
    useAttackDeckStore.subscribe(relay),
    useGoldStore.subscribe(relay),
  ]

  if (push) void backend.push(captureRuntime())
}
