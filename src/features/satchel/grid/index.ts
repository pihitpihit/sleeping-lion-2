export {
  computeGridMetrics,
  spanOf,
  EMPTY_METRICS,
  GRID_GAP,
  type GridMetrics,
  type Size,
} from './gridMetrics'
export { cellsToPixels, pixelsToCell, clampToGrid, type Placement, type PixelRect } from './coords'
export { isWithinGrid, overlaps, canPlaceAt, findFreeSpot } from './placement'
