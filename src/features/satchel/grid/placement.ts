import type { Placement } from './coords'
import type { GridMetrics } from './gridMetrics'

/**
 * 배치 판정.
 *
 * M3(열 수 변화 파생)과 M6(드래그·리사이즈)이 함께 쓴다. 규칙을 여기 모아 두어야
 * 화면 코드가 같은 판단을 다시 쓰지 않는다.
 */

/** 격자 안에 온전히 들어오는가. */
export function isWithinGrid(placement: Placement, metrics: GridMetrics): boolean {
  return (
    placement.w >= 1 &&
    placement.h >= 1 &&
    placement.x >= 0 &&
    placement.y >= 0 &&
    placement.x + placement.w <= metrics.columns &&
    placement.y + placement.h <= metrics.rows
  )
}

/**
 * 두 배치가 겹치는가.
 *
 * 변이 맞닿기만 한 것은 겹친 것이 아니다 — `x:0,w:2`와 `x:2,w:1`은 이웃이다.
 */
export function overlaps(a: Placement, b: Placement): boolean {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h
}

/**
 * 이 자리에 놓을 수 있는가.
 *
 * `ignoreIndex`는 자기 자신을 겹침 판정에서 빼기 위한 것이다. 드래그 중인 위젯을
 * 목록에 남겨둔 채 판정하면 **자기 자신과 겹친다**고 나와 어디에도 못 놓는다.
 * 흔히 놓치는 지점이라 인자로 드러내 둔다.
 */
export function canPlaceAt(
  placement: Placement,
  existing: readonly Placement[],
  metrics: GridMetrics,
  ignoreIndex = -1,
): boolean {
  if (!isWithinGrid(placement, metrics)) return false
  return existing.every((other, index) => index === ignoreIndex || !overlaps(placement, other))
}

/**
 * 주어진 크기가 들어갈 빈 자리를 찾는다. 위젯을 새로 켤 때 어디에 놓을지 정한다(M4).
 *
 * 좌상단부터 행 우선으로 훑는다. 자리가 없으면 `null` — 부르는 쪽이 조용히
 * 실패하지 말고 이유를 알려야 한다.
 */
export function findFreeSpot(
  size: { w: number; h: number },
  existing: readonly Placement[],
  metrics: GridMetrics,
): Placement | null {
  const { columns, rows } = metrics
  if (size.w < 1 || size.h < 1 || size.w > columns || size.h > rows) return null

  for (let y = 0; y <= rows - size.h; y += 1) {
    for (let x = 0; x <= columns - size.w; x += 1) {
      const candidate = { x, y, w: size.w, h: size.h }
      if (canPlaceAt(candidate, existing, metrics)) return candidate
    }
  }
  return null
}
