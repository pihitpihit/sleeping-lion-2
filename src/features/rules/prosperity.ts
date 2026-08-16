/**
 * 번영도별로 상점에 풀리는 아이템 카드 — **수치의 나열이다.**
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ **번호의 범위일 뿐 카드의 글이 아니다.**                                  │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * 그래서 레포에 둘 수 있다(구현 결정 42·284와 같은 선) — 아이템 **이름**은 게임
 * 콘텐츠라 DB에만 있지만(`0023`) 몇 번부터 몇 번까지가 풀리는지는 표다.
 *
 * 형님이 실물 시트를 찍어 보내 주었다(2026-08-16). 1레벨만 열넷이고 그 뒤로는
 * 일곱씩 는다.
 */

export interface ProsperityRow {
  readonly level: number
  /** 이 번영도에서 풀리는 첫 카드 번호. */
  readonly from: number
  /** 마지막 카드 번호. */
  readonly to: number
}

export const MAX_PROSPERITY = 9

/**
 * 1레벨은 001–014, 그 뒤로는 일곱 장씩.
 *
 * **식이 있으므로 셈해서 낸다** — 값을 또 적어 두면 표와 어긋날 자리가 하나 는다
 * (구현 결정 285와 같은 결). 인쇄된 표와 맞는지는 시험이 지킨다.
 */
export function prosperityRow(level: number): ProsperityRow {
  const l = Math.max(1, Math.min(MAX_PROSPERITY, Math.trunc(level)))
  if (l === 1) return { level: 1, from: 1, to: 14 }
  return { level: l, from: 15 + (l - 2) * 7, to: 21 + (l - 2) * 7 }
}

export const PROSPERITY_ROWS: readonly ProsperityRow[] = Array.from(
  { length: MAX_PROSPERITY },
  (_, i) => prosperityRow(i + 1),
)

/** 그 번영도까지 상점에 있는 카드는 몇 번까지인가 — 목록은 쌓인다. */
export function unlockedThrough(level: number): number {
  return prosperityRow(level).to
}

/** 카드 번호를 시트에 적힌 세 자리로. */
export function cardNo(n: number): string {
  return String(n).padStart(3, '0')
}
