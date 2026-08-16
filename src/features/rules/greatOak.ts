/**
 * 위대한 떡갈나무 — **기부한 금화가 쌓이는 판.**
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ **수치의 나열이라 레포에 둘 수 있다.**                                    │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * 형님이 실물 판을 찍어 보내 주었다(2026-08-16). 칸은 110부터 1000까지 열씩
 * 늘어서고, 어떤 칸에는 **번영도 +1** 표식이 박혀 있다.
 *
 * 담기는 것은 「얼마가 쌓였나」 하나뿐이고 나머지는 다 여기서 셈해서 낸다 —
 * 값을 또 적어 두면 표와 어긋날 자리가 는다(구현 결정 285와 같은 결).
 */

/** 첫 칸. 그 앞의 백은 **B봉투를 여는 기부**라 판에 없다. */
export const OAK_FIRST = 110

/** 마지막 칸. */
export const OAK_LAST = 1000

/** 칸 사이. 기부는 파티원 합산 이 단위로만 한다(형님이 정했다). */
export const OAK_STEP = 10

/**
 * 번영도 표식이 박힌 칸 사이 — **오십마다 하나.**
 *
 * 형님이 그렇게 정했다. 실물 판의 아래쪽 줄은 백 단위로 보이기도 하는데, 다르면
 * 이 수 하나만 고치면 된다.
 */
export const OAK_MARK_EVERY = 50

/** 판의 모든 칸. 사진처럼 열씩 늘어선다. */
export const OAK_CELLS: readonly number[] = Array.from(
  { length: (OAK_LAST - OAK_FIRST) / OAK_STEP + 1 },
  (_, i) => OAK_FIRST + i * OAK_STEP,
)

/** 이 칸에 번영도 표식이 있는가. */
export function isMark(cell: number): boolean {
  return cell % OAK_MARK_EVERY === 0
}

/** 판 밖으로 안 나간다 — 다 채우면 더 쌓이지 않는다. */
export function clampOak(total: number): number {
  if (!Number.isFinite(total)) return 0
  return Math.max(0, Math.min(OAK_LAST, Math.trunc(total)))
}

/**
 * 지금까지 얻은 번영도.
 *
 * **표식을 지날 때마다 하나씩**이다. 첫 표식이 150이므로 그 앞은 0이다 —
 * 100까지는 판에 오르기 전(B봉투를 여는 기부)이라 세지 않는다.
 */
export function prosperityFrom(total: number): number {
  const t = clampOak(total)
  if (t < OAK_FIRST) return 0
  return Math.max(0, Math.floor(t / OAK_MARK_EVERY) - Math.floor(OAK_FIRST / OAK_MARK_EVERY))
}

/** 다음 표식까지 얼마 남았는가. 다 찼으면 `null`. */
export function toNextMark(total: number): number | null {
  const t = clampOak(total)
  if (t >= OAK_LAST) return null
  const next = Math.max(OAK_FIRST, (Math.floor(t / OAK_MARK_EVERY) + 1) * OAK_MARK_EVERY)
  return next - t
}

/**
 * 파티원이 나눠 낸 것이 낼 수 있는 것인가.
 *
 * **합산이 열 단위여야 한다**(형님이 정했다) — 판의 칸이 열씩이라 그 사이에
 * 멈출 자리가 없다. 가진 것보다 많이 낼 수도 없다.
 */
export function checkGifts(
  gifts: readonly { amount: number; gold: number }[],
): 'empty' | 'step' | 'short' | null {
  let total = 0
  for (const gift of gifts) {
    if (!Number.isFinite(gift.amount) || gift.amount < 0) return 'short'
    if (gift.amount > gift.gold) return 'short'
    total += Math.trunc(gift.amount)
  }
  if (total <= 0) return 'empty'
  if (total % OAK_STEP !== 0) return 'step'
  return null
}
