import { openWire, type Wire } from './broadcast'

/**
 * 계정 하나에 통로 하나.
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ **행낭은 계정에 귀속된 통로 하나다. 제 계정만 듣고 보낸다.**              │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * 처음에는 배치와 판을 따로 두 통로로 날랐다. 나르는 것이 둘일 뿐 **자격을
 * 정하는 근거는 하나**다 — 둘 다 "내 계정의 것"이므로 통로도 하나여야 한다.
 * 통로가 늘면 잠그는 정책도 늘고, 하나를 빠뜨리면 그쪽만 열린 채로 남는다.
 *
 * 실어 나르는 것은 둘이다.
 *
 * | 종류 | 무엇 | 언제 |
 * |---|---|---|
 * | `settings` | 위젯 배치·화면 설정 | **늘** — 전투에 앉아 있어도 배치는 제 것이다 |
 * | `state` | 원소·라운드·HP/XP·덱 | **혼자일 때만** — 전투에 앉으면 그쪽 통로로 간다 |
 *
 * 전투에 앉으면 판은 전투 통로로 옮겨 가지만 배치는 여기 남는다. 형님이 정한
 * 선이다 — **구성은 제 것을 쓰고, 상태는 파티의 전투를 따른다.**
 *
 * Supabase는 붙기 전에 걸어둔 것만 듣는다. 그래서 두 종류를 **열 때 한꺼번에**
 * 걸어 두고, 실제로 쓰는 쪽이 나중에 손잡이만 갈아 끼운다.
 */

export const SETTINGS_EVENT = 'settings'
export const STATE_EVENT = 'state'

const EVENTS = [SETTINGS_EVENT, STATE_EVENT] as const

let current: { userId: string; wire: Wire } | null = null

/**
 * 내 계정 통로. 같은 계정이면 늘 같은 것을 돌려준다.
 *
 * **두 번 열지 않는다.** 배치 쪽과 판 쪽이 각자 열면 통로가 둘이 되어, 한 번
 * 만진 것이 두 번 나가고 받는 쪽도 두 번 앉힌다.
 */
export function accountWire(userId: string): Wire {
  if (current?.userId === userId) return current.wire
  current?.wire.close()
  current = { userId, wire: openWire(`satchel:${userId}`, EVENTS) }
  return current.wire
}

/** 로그아웃하거나 다른 계정으로 바꿀 때. */
export function closeAccountWire(): void {
  current?.wire.close()
  current = null
}
