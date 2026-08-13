/**
 * 라운드 트래커의 안쪽 배치.
 *
 * 크기가 자유롭다 — 한 칸짜리 작은 표식으로 둘 수도, 넓게 펴서 멀리서 보이게
 * 할 수도 있다. 그래서 **글자 크기를 상자에서 역산**한다.
 */

export interface RoundLayout {
  /** 숫자 글자 크기(px). */
  numberSize: number
  /** 'ROUND' 글자 크기(px). */
  labelSize: number
  /**
   * 이름표를 낼 자리가 있는가. 좁으면 숫자가 먼저다.
   *
   * **이름표가 빠지면 숫자 앞에 `R`을 붙인다.** 한 칸짜리로 두면 숫자만 덩그러니
   * 남아 그것이 라운드인지 체력인지 골드인지 알 수 없다 — 형님이 짚었다.
   */
  showLabel: boolean
  /** 왼쪽 위를 사선으로 자른 길이(px). 그 삼각형이 곧 '처음으로' 단추다. */
  cutSize: number
  /** 삼각형 안에 놓을 아이콘 한 변(px). */
  cutIconSize: number
}

/** 이보다 작아지면 이름표를 뺀다. 숫자가 먼저다. */
const LABEL_THRESHOLD = 88
const MIN_NUMBER = 12
const MAX_NUMBER = 96

export function computeRoundLayout(box: { width: number; height: number }): RoundLayout {
  const width = Number.isFinite(box.width) ? box.width : 0
  const height = Number.isFinite(box.height) ? box.height : 0
  if (width <= 0 || height <= 0) {
    return { numberSize: 0, labelSize: 0, showLabel: false, cutSize: 0, cutIconSize: 0 }
  }

  const showLabel = Math.min(width, height) >= LABEL_THRESHOLD

  // 이름표가 있으면 그만큼 세로를 내준다. 띠 창은 글자 크기와 같다.
  const forNumber = showLabel ? height * 0.62 : height * 0.96
  /*
    이름표가 빠진 자리에는 `R`이 숫자 앞에 붙으므로 **가로를 그만큼 더 나눠 준다.**
    `R`은 숫자의 0.85배이고 사이가 조금 뜨므로 숫자 몫은 절반이 조금 넘는다.
    **인색하게 잡으면 한 칸짜리에서 글자가 점처럼 남는다** — 형님이 세 번 짚었다.
    Pirata의 숫자는 진폭이 좁아(0.24~0.43em) 글자 크기를 넉넉히 줘도 두 자리가
    넘치지 않는다 — 그래서 몫을 크게 잡을 수 있다.
  */
  const widthShare = showLabel ? 0.52 : 0.5
  const numberSize = Math.max(MIN_NUMBER, Math.min(MAX_NUMBER, forNumber, width * widthShare))

  /*
    잘린 귀퉁이의 크기.

    손끝으로 짚을 만해야 하므로 아래로는 34px에서 멈추고, 위로는 판을 잡아먹지
    않게 56px에서 멈춘다.
  */
  const cutSize = Math.max(34, Math.min(56, Math.min(width, height) * 0.3))

  return {
    numberSize,
    labelSize: Math.max(9, numberSize * 0.22),
    showLabel,
    cutSize,
    cutIconSize: cutSize * ICON_IN_CUT,
  }
}

/**
 * 삼각형 안에서 아이콘이 차지하는 비율.
 *
 * 직각삼각형의 두 변이 `L`이면 빗변은 `x + y = L`이다. 아이콘을 `(0.3L, 0.3L)`에
 * 앉히면 오른쪽 아래 모서리가 `0.6L + s`이므로, `s`가 `0.4L`보다 작아야 빗변을
 * 넘지 않는다. 여유를 두어 0.36으로 잡았다 — 이 값과 아래 CSS의 위치(30%)는
 * 함께 움직여야 한다.
 */
const ICON_IN_CUT = 0.36
