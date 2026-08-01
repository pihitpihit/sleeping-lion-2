import { sanitizeElementSettings, visibleCount } from './settings'

/**
 * 원소 트래커 안쪽 배치.
 *
 * 순수 함수다. 화면 코드가 좌표 산술을 다시 하지 않는다.
 */

export type Orientation = 'horizontal' | 'vertical'

export interface ElementLayout {
  orientation: Orientation
  /** 아이콘 한 변(px). 격자에 스냅하지 않는다 — 칸 크기를 안내하는 정도다. */
  iconSize: number
  /** 원소 하나가 차지하는 칸의 길이(배치 방향). */
  laneLength: number
  /** 원소 하나가 차지하는 칸의 폭(배치 방향과 수직). */
  laneThickness: number
  /** 트랙이 미끄러질 만큼 폭이 있는가. */
  canSlide: boolean
  /** 슬롯 세 개의 중심 좌표(칸 안에서, 배치 방향과 수직인 축). */
  slotOffsets: readonly [number, number, number]
  /** 위젯 안에서 원소 칸들이 시작하는 여백. */
  padStart: number
  padCross: number
}

/** 아이콘이 칸을 꽉 채우지 않도록 남기는 비율. */
const ICON_FILL = 0.74
/** 아이콘 최대 크기(px). 넓은 위젯에서 아이콘만 커지는 것을 막는다. */
const ICON_MAX = 120
/** 슬라이딩을 켜는 기준 — 수직 방향으로 아이콘 크기의 이 배수만큼 있어야 한다. */
const SLIDE_RATIO = 2
/** 아이콘 크기가 이보다 덜 차이 나면 같은 것으로 친다(px). */
const ICON_TIE = 0.5

interface Fit {
  iconSize: number
  laneLength: number
  canSlide: boolean
}

/**
 * 한 방향으로 늘어놓았을 때의 결과.
 *
 * `along`은 칸들이 늘어서는 축, `cross`는 석판이 미끄러지는 축이다.
 */
function fit(along: number, cross: number, count: number): Fit {
  const laneLength = along / count
  // 아이콘은 칸의 짧은 쪽에 맞춘다. 그래야 어느 방향에서든 넘치지 않는다.
  const iconSize = Math.min(ICON_MAX, Math.min(laneLength, cross) * ICON_FILL)
  return { iconSize, laneLength, canSlide: cross >= iconSize * SLIDE_RATIO }
}

/**
 * 위젯이 차지한 픽셀 크기를 받아 안쪽 배치를 계산한다.
 *
 * **방향은 두 갈래를 다 재 보고 고른다.** 위젯의 가로세로 비만 보고 정하면
 * 원소를 하나만 켠 채 넓고 낮게 놓았을 때 어긋난다 — 넓으니 수평을 고르는데,
 * 수평에서 석판이 미끄러지는 축은 '높이'라서 낮으면 미끄러질 자리가 없다.
 * 칸이 하나뿐일 때는 늘어놓을 것이 없으므로 **긴 쪽을 미끄러지는 축으로** 써야
 * 한다.
 *
 * 고르는 순서:
 * 1. 아이콘이 더 큰 쪽. 아이콘이 작아지면 무엇보다 먼저 눈에 띈다.
 * 2. 아이콘이 비슷하면 미끄러지는 쪽. 걸림 자국 셋이 보이는 편이 낫다.
 * 3. 그래도 같으면 세로 — 정사각형(예: 6×6)에서의 기존 선택을 지킨다.
 */
export function computeElementLayout(
  widget: { width: number; height: number },
  count: number,
): ElementLayout {
  const { width, height } = widget
  if (!(width > 0) || !(height > 0) || count < 1) {
    return {
      orientation: 'horizontal',
      iconSize: 0,
      laneLength: 0,
      laneThickness: 0,
      canSlide: false,
      slotOffsets: [0, 0, 0],
      padStart: 0,
      padCross: 0,
    }
  }

  // 수평 = 칸들이 가로로 늘어서고 석판은 위아래로 미끄러진다.
  // 세로  = 칸들이 세로로 쌓이고 석판은 좌우로 미끄러진다.
  const asHorizontal = fit(width, height, count)
  const asVertical = fit(height, width, count)

  let orientation: Orientation
  if (asHorizontal.iconSize > asVertical.iconSize + ICON_TIE) orientation = 'horizontal'
  else if (asVertical.iconSize > asHorizontal.iconSize + ICON_TIE) orientation = 'vertical'
  else if (asHorizontal.canSlide !== asVertical.canSlide)
    orientation = asHorizontal.canSlide ? 'horizontal' : 'vertical'
  else orientation = 'vertical'

  const chosen = orientation === 'horizontal' ? asHorizontal : asVertical
  const cross = orientation === 'horizontal' ? height : width
  const { iconSize, laneLength, canSlide } = chosen

  /**
   * 슬롯은 **아이콘 반지름만큼 안쪽에서** 시작하고 끝난다.
   *
   * 폭을 1/6·3/6·5/6로 나누면 양 끝 슬롯의 아이콘이 칸 밖으로 삐져나온다 —
   * 슬라이딩 기준이 `cross >= icon*2`이므로 1/6 지점은 icon/3인데 아이콘 반지름은
   * icon/2라 icon/6만큼 넘친다. 안쪽으로 밀어 넣어야 위젯 안에 머문다.
   */
  const half = iconSize / 2
  const slotOffsets: [number, number, number] = canSlide
    ? [half, cross / 2, cross - half]
    : [cross / 2, cross / 2, cross / 2]

  return {
    orientation,
    iconSize,
    laneLength,
    laneThickness: cross,
    canSlide,
    slotOffsets,
    padStart: 0,
    padCross: 0,
  }
}

/**
 * 위젯 크기가 허용되는가 — **가로 혹은 세로가 '보이는 원소 수' 이상**이어야 한다.
 *
 * 원소를 한 줄에 늘어놓으므로 그만큼의 칸이 필요하다. 더 짧으면 아이콘이 서로
 * 뭉개진다. 원소를 줄이면 제약도 함께 느슨해진다.
 */
export function isElementTrackerSizeAllowed(
  size: { w: number; h: number },
  settings: unknown,
): boolean {
  return Math.max(size.w, size.h) >= visibleCount(sanitizeElementSettings(settings))
}
