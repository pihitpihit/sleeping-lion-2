import { cellsToPixels, pixelsToCell, type GridMetrics, type Placement } from '../grid'

/**
 * 드래그·크기조절 중 '어디에 놓일지'를 계산한다.
 *
 * 포인터 처리는 테스트하기 어렵지만 이 계산은 순수하다. 갈라 두면 반올림 경계 같은
 * 조용한 오차를 테스트로 잡을 수 있다.
 *
 * 격자 밖으로 나가는 값도 그대로 낸다 — 자르면 '밖으로 끌었다'는 사실이 사라져
 * 무효 표시를 못 한다. 판정은 `canPlaceAt`이 한다.
 */

export interface Delta {
  dx: number
  dy: number
}

/** 끌어 옮겼을 때 놓일 자리. 크기는 그대로다. */
export function previewMove(start: Placement, delta: Delta, metrics: GridMetrics): Placement {
  const rect = cellsToPixels(start, metrics)
  const cell = pixelsToCell({ left: rect.left + delta.dx, top: rect.top + delta.dy }, metrics)
  return { ...start, x: cell.x, y: cell.y }
}

/**
 * 우하단 핸들을 끌었을 때의 크기. 좌상단은 고정이다.
 *
 * 최소 크기와 격자 경계로 자른다. 최대 크기는 정의가 주면 그것도 함께 본다.
 */
export function previewResize(
  start: Placement,
  delta: Delta,
  metrics: GridMetrics,
  minSize: { w: number; h: number },
  maxSize?: { w: number; h: number },
): Placement {
  if (metrics.cellWidth <= 0 || metrics.cellHeight <= 0) return start

  const rect = cellsToPixels(start, metrics)
  // n칸의 길이는 n*(cell+gap) - gap 이므로 역산하면 이 꼴이 된다. 셀이 정사각형이
  // 아니므로 축마다 따로 센다.
  const rawW = Math.round((rect.width + delta.dx + metrics.gap) / (metrics.cellWidth + metrics.gap))
  const rawH = Math.round(
    (rect.height + delta.dy + metrics.gap) / (metrics.cellHeight + metrics.gap),
  )

  const maxW = Math.min(maxSize?.w ?? metrics.columns, metrics.columns - start.x)
  const maxH = Math.min(maxSize?.h ?? metrics.rows, metrics.rows - start.y)

  return {
    ...start,
    w: Math.min(Math.max(minSize.w, rawW), Math.max(minSize.w, maxW)),
    h: Math.min(Math.max(minSize.h, rawH), Math.max(minSize.h, maxH)),
  }
}

/**
 * 드래그로 볼지 판단하는 최소 이동 거리(px).
 *
 * 손가락은 미세하게 흔들린다. 이 값 이전에는 드래그로 취급하지 않아야 탭과
 * 구분된다.
 */
export const DRAG_THRESHOLD = 4

export function exceedsThreshold(delta: Delta): boolean {
  return Math.abs(delta.dx) >= DRAG_THRESHOLD || Math.abs(delta.dy) >= DRAG_THRESHOLD
}

/**
 * 화면에서의 이동을 **위젯 안쪽 좌표**로 돌린다.
 *
 * 내용은 CSS `rotate`로 돌아가 있지만 포인터 좌표는 화면 기준으로 온다.
 * 180도로 돌려 마주 앉은 사람이 제 기준 '위로' 끄는 것은 화면에서는 '아래로'다.
 * 그대로 쓰면 값이 거꾸로 움직인다.
 *
 * 화면 = R(θ)·안쪽 이므로 안쪽 = R(−θ)·화면 이다.
 */
export function toLocalDelta(dx: number, dy: number, rotation: number): { dx: number; dy: number } {
  const rad = (-rotation * Math.PI) / 180
  // 90도 단위만 쓰므로 반올림하면 정확히 0과 ±1이 된다. 부동소수 찌꺼기를 없앤다.
  const cos = Math.round(Math.cos(rad))
  const sin = Math.round(Math.sin(rad))
  return { dx: unsign(dx * cos - dy * sin), dy: unsign(dx * sin + dy * cos) }
}

/** `-0`을 `0`으로 만든다. 값은 같지만 `Object.is`로 비교하면 갈리고, 밖으로
 *  내보낼 이유가 없다. */
function unsign(value: number): number {
  return value === 0 ? 0 : value
}
