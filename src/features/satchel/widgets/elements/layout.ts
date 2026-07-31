import { ELEMENTS } from './elements'

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

/**
 * 위젯이 차지한 픽셀 크기를 받아 안쪽 배치를 계산한다.
 *
 * 방향은 긴 쪽을 따른다. 정사각형이면 수평 — 실물 원소판이 가로로 놓인다.
 */
export function computeElementLayout(widget: { width: number; height: number }): ElementLayout {
  const { width, height } = widget
  if (!(width > 0) || !(height > 0)) {
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

  const orientation: Orientation = width >= height ? 'horizontal' : 'vertical'
  const along = orientation === 'horizontal' ? width : height
  const cross = orientation === 'horizontal' ? height : width

  const laneLength = along / ELEMENTS.length
  // 아이콘은 칸의 짧은 쪽에 맞춘다. 그래야 어느 방향에서든 넘치지 않는다.
  const iconSize = Math.min(ICON_MAX, Math.min(laneLength, cross) * ICON_FILL)

  const canSlide = cross >= iconSize * SLIDE_RATIO

  // 슬라이딩할 때는 세 슬롯을 폭에 고르게 펴고, 아니면 셋 다 한가운데다.
  const slotOffsets: [number, number, number] = canSlide
    ? [cross * (1 / 6), cross * (3 / 6), cross * (5 / 6)]
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
 * 위젯 크기가 허용되는가 — **가로 혹은 세로가 6칸 이상**이어야 한다.
 *
 * 원소가 여섯이므로 한 줄에 늘어놓으려면 최소 여섯 칸이 필요하다. 6칸보다 짧으면
 * 아이콘이 서로 뭉개진다.
 */
export function isElementTrackerSizeAllowed(size: { w: number; h: number }): boolean {
  return Math.max(size.w, size.h) >= ELEMENTS.length
}
