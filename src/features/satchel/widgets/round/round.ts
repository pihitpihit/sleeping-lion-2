/**
 * 라운드 트래커의 안쪽 배치.
 *
 * 크기가 자유롭다 — 한 칸짜리 작은 표식으로 둘 수도, 넓게 펴서 멀리서 보이게
 * 할 수도 있다. 그래서 **글자 크기를 상자에서 역산**한다.
 */

export interface RoundLayout {
  /** 숫자 글자 크기(px). */
  numberSize: number
  /** '라운드' 글자 크기(px). */
  labelSize: number
  /** 이름표를 낼 자리가 있는가. 좁으면 숫자가 먼저다. */
  showLabel: boolean
}

/** 이보다 작아지면 이름표를 뺀다. 숫자가 먼저다. */
const LABEL_THRESHOLD = 88
const MIN_NUMBER = 12
const MAX_NUMBER = 96

export function computeRoundLayout(box: { width: number; height: number }): RoundLayout {
  const width = Number.isFinite(box.width) ? box.width : 0
  const height = Number.isFinite(box.height) ? box.height : 0
  if (width <= 0 || height <= 0) return { numberSize: 0, labelSize: 0, showLabel: false }

  const showLabel = Math.min(width, height) >= LABEL_THRESHOLD

  // 이름표가 있으면 그만큼 세로를 내준다. 띠 창은 글자 크기와 같다.
  const forNumber = showLabel ? height * 0.62 : height * 0.82
  const numberSize = Math.max(MIN_NUMBER, Math.min(MAX_NUMBER, forNumber, width * 0.52))

  return { numberSize, labelSize: Math.max(9, numberSize * 0.22), showLabel }
}
