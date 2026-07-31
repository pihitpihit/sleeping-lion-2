import { spanOf, type GridMetrics } from './gridMetrics'

/** 위젯 하나의 자리와 크기. 단위는 셀이다. */
export interface Placement {
  x: number
  y: number
  w: number
  h: number
}

/** 화면에 그릴 때 쓰는 절대 사각형. 단위는 px이며 보드 좌상단 기준이다. */
export interface PixelRect {
  left: number
  top: number
  width: number
  height: number
}

/** 격자 좌표 → 픽셀 사각형. 위젯을 절대 위치로 그릴 때 쓴다. */
export function cellsToPixels(placement: Placement, metrics: GridMetrics): PixelRect {
  const { cellSize, gap, paddingX, paddingY } = metrics
  return {
    left: paddingX + placement.x * (cellSize + gap),
    top: paddingY + placement.y * (cellSize + gap),
    width: spanOf(placement.w, cellSize, gap),
    height: spanOf(placement.h, cellSize, gap),
  }
}

/**
 * 픽셀 위치 → 가장 가까운 격자 좌표.
 *
 * 받는 것은 **위젯의 좌상단**이지 포인터가 아니다. 드래그 중에는 위젯의 현재
 * 좌상단을 넘겨 어느 칸에 놓일지 미리 본다(M6).
 *
 * 격자 밖으로 나가는 값도 그대로 돌려준다 — 자르는 것은 `clampToGrid`의 일이고,
 * 여기서 함께 하면 "격자 밖으로 끌었다"는 사실이 사라져 무효 표시를 못 한다.
 */
export function pixelsToCell(
  point: { left: number; top: number },
  metrics: GridMetrics,
): { x: number; y: number } {
  // 빈 격자(EMPTY_METRICS)는 cellSize가 0이지만 gap은 그대로라 step만 보면
  // 0이 아니다. 셀 크기로 판단해야 한다.
  if (metrics.cellSize <= 0) return { x: 0, y: 0 }
  const step = metrics.cellSize + metrics.gap
  return {
    x: Math.round((point.left - metrics.paddingX) / step),
    y: Math.round((point.top - metrics.paddingY) / step),
  }
}

/**
 * 배치를 격자 안으로 밀어 넣는다.
 *
 * 크기를 먼저 자르고 위치를 자른다 — 순서가 반대면 격자보다 큰 위젯의 위치를
 * 음수로 밀어 넣게 된다.
 */
export function clampToGrid(placement: Placement, metrics: GridMetrics): Placement {
  const { columns, rows } = metrics
  if (columns <= 0 || rows <= 0) return { x: 0, y: 0, w: 0, h: 0 }

  const w = Math.min(Math.max(1, placement.w), columns)
  const h = Math.min(Math.max(1, placement.h), rows)
  return {
    x: Math.min(Math.max(0, placement.x), columns - w),
    y: Math.min(Math.max(0, placement.y), rows - h),
    w,
    h,
  }
}
