/**
 * 평판과 상점 가격 보정.
 *
 * 순수 함수로 떼어 둔다(SPEC 4.1). 화면은 이 표를 다시 적지 않는다.
 *
 * **저작권 경계.** 아래 표는 수치 구간의 대응일 뿐이다. 보정 덱의 구성(20장
 * 배분)과 같은 성격이며, SPEC 3장이 "게임 메커닉의 수치 표현이지 저작물 원문이
 * 아니다"라고 이미 정리한 자리다. 시트의 그림이나 문구를 옮기는 것이 아니다.
 *
 * **규칙을 판정하지는 않는다.** 물건값을 계산해 주거나 소지금에서 빼지 않는다.
 * 평판 옆에 적혀 있어 사람이 눈으로 읽던 숫자를 대신 읽어줄 뿐이다 — 축 ②의
 * 도구들과 같은 선이다.
 */

/** 평판이 갈 수 있는 범위. 실물 눈금이 여기까지다. */
export const MIN_REPUTATION = -20
export const MAX_REPUTATION = 20

/**
 * 평판 구간별 가격 보정.
 *
 * 가운데(−2~+2)만 다섯 칸이고 나머지는 네 칸씩이다. 규칙적이라 계산으로 뽑을
 * 수도 있지만 **표를 그대로 옮겨 둔다** — 계산식으로 바꾸면 실물과 대조할 때
 * 한 칸씩 밀렸는지 눈으로 확인할 수 없다.
 *
 * 2026-08-07에 형님이 실물 파티 시트와 대조해 일치를 확인했다.
 */
export const REPUTATION_BANDS: readonly { min: number; max: number; modifier: number }[] = [
  { min: -20, max: -19, modifier: 5 },
  { min: -18, max: -15, modifier: 4 },
  { min: -14, max: -11, modifier: 3 },
  { min: -10, max: -7, modifier: 2 },
  { min: -6, max: -3, modifier: 1 },
  { min: -2, max: 2, modifier: 0 },
  { min: 3, max: 6, modifier: -1 },
  { min: 7, max: 10, modifier: -2 },
  { min: 11, max: 14, modifier: -3 },
  { min: 15, max: 18, modifier: -4 },
  { min: 19, max: 20, modifier: -5 },
]

/** 눈금 밖으로 나가지 않게 들인다. 정수가 아니면 버린다. */
export function clampReputation(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.min(MAX_REPUTATION, Math.max(MIN_REPUTATION, Math.trunc(value)))
}

/**
 * 이 평판에서 물건값이 얼마나 오르내리는가.
 *
 * **양수면 비싸지고 음수면 싸진다.** 평판이 나쁘면 웃돈을 얹어야 하고 좋으면
 * 깎아준다 — 부호가 뒤집혀 보이지만 시트에 적힌 대로다.
 */
export function shopPriceModifier(reputation: number): number {
  const value = clampReputation(reputation)
  for (const band of REPUTATION_BANDS) {
    if (value >= band.min && value <= band.max) return band.modifier
  }
  // 표가 눈금 전체를 덮으므로 여기 오지 않는다. 그래도 0으로 떨어뜨린다 —
  // 표를 잘못 고쳤을 때 화면이 비는 것보다 낫다.
  return 0
}

/**
 * 화면에 적을 보정 문구.
 *
 * 부호를 붙여 방향이 드러나게 한다. 0은 '그대로'다 — `+0`이라고 적으면 무언가
 * 걸려 있는 것처럼 읽힌다.
 */
export function priceModifierLabel(modifier: number): string {
  if (modifier === 0) return '그대로'
  // U+2212(빼기표). 하이픈보다 획이 굵고 더하기표와 길이가 맞는다.
  return modifier > 0 ? `+${modifier}` : `−${Math.abs(modifier)}`
}

/** 읽어주는 쪽에 가는 우리말. */
export function priceModifierSpeech(modifier: number): string {
  if (modifier === 0) return '물건값 그대로'
  return modifier > 0 ? `물건값 ${modifier} 비싸짐` : `물건값 ${Math.abs(modifier)} 싸짐`
}
