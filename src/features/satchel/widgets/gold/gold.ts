/**
 * 골드 카운터의 셈.
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ **주운 금화를 세는 것까지다. 캐릭터의 골드를 고치지 않는다.**             │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * 시나리오를 도는 동안 바닥에서 금화 표식을 줍는다. 그 수를 세는 자리이며,
 * 판이 끝나면 사람이 정산해 캐릭터 시트에 옮긴다 — **옮기는 것은 사람이 한다.**
 * 축 ②는 캐릭터를 고치지 않는다(SPEC 1장).
 *
 * HP/XP와 같은 결이다(`hpxp.ts`) — 눈금 안에 가두고, 조작은 끌기와 탭으로 한다.
 */

export const MIN_GOLD = 0

/**
 * 셀 수 있는 최대.
 *
 * 한 칸짜리 위젯이라 숫자가 들어갈 자리가 좁다. 세 자리를 넘기면 금화 그림 위에
 * 글자가 넘쳐 읽히지 않는다. 시나리오 하나에서 줍는 금화가 세 자리를 넘을 일도
 * 없다.
 */
export const MAX_GOLD = 999

export function clampGold(value: number): number {
  if (!Number.isFinite(value)) return MIN_GOLD
  return Math.min(MAX_GOLD, Math.max(MIN_GOLD, Math.round(value)))
}

export function stepGold(value: number, delta: number): number {
  return clampGold(value + delta)
}

/**
 * 한 칸짜리로 못박는다.
 *
 * **금화 한 닢은 커져도 담을 것이 늘지 않는다.** 숫자 하나뿐이라 넓히면 빈 자리만
 * 생기고, 상 위에서 자리를 차지하는 것에 견줘 얻는 것이 없다. 대신 어디에나
 * 끼워 넣을 수 있다 — 한 칸이면 격자가 꽉 차 가도 들어갈 틈이 있다.
 */
export function isGoldSizeAllowed(size: { w: number; h: number }): boolean {
  return size.w === 1 && size.h === 1
}
