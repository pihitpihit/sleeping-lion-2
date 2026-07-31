import { canPlaceAt, clampToGrid, findFreeSpot, type GridMetrics, type Placement } from '../grid'
import { emptyLayout, type Layout, type WidgetInstance } from './types'

/**
 * 처음 보는 열 수로 들어왔을 때 기존 레이아웃에서 새 레이아웃을 만든다.
 *
 * **이 마일스톤에서 가장 조용히 틀리는 부분이다.** 순수 함수로 두고 테스트를
 * 촘촘히 붙인다.
 *
 * 규칙
 * 1. 열 수가 가장 가까운 레이아웃을 고른다. 동률이면 **작은 쪽** — 넓은 배치를
 *    좁은 격자에 밀어 넣는 것보다 반대가 안전하다.
 * 2. 가로(x, w)만 열 수 비율로 옮긴다. **세로는 옮기지 않는다** — 행 수는 열 수와
 *    무관하게 높이에서 나오고 툴바 위치에 따라서도 변하므로, 같은 비율로 늘리면
 *    엉뚱한 곳에 떨어진다.
 * 3. 격자 안으로 자르고, 겹치는 것부터 빈 자리로 옮긴다. 자리가 없으면 버린다.
 */

/** 열 수가 가장 가까운 레이아웃. 동률이면 작은 쪽. */
export function pickSourceLayout(
  layouts: Readonly<Record<number, Layout>>,
  targetColumns: number,
): Layout | null {
  const keys = Object.keys(layouts)
    .map(Number)
    .filter((n) => Number.isFinite(n) && n > 0)
  if (keys.length === 0) return null

  let best = keys[0]
  for (const key of keys) {
    const d = Math.abs(key - targetColumns)
    const bestD = Math.abs(best - targetColumns)
    if (d < bestD || (d === bestD && key < best)) best = key
  }
  return layouts[best] ?? null
}

export function deriveLayout(
  source: Layout,
  metrics: GridMetrics,
  minSizeOf: (definitionId: string) => { w: number; h: number },
  isSizeAllowed: (definitionId: string, size: { w: number; h: number }) => boolean = () => true,
): Layout {
  if (metrics.columns <= 0 || metrics.rows <= 0) return emptyLayout(metrics.columns)
  if (source.columns === metrics.columns) {
    // 열 수가 같아도 행 수는 다를 수 있다(툴바 위치·화면 높이). 자르고 겹침만 푼다.
    return repack(source.widgets, metrics, minSizeOf, isSizeAllowed)
  }

  const ratio = metrics.columns / source.columns
  const scaled = source.widgets.map((widget) => {
    const min = minSizeOf(widget.definitionId)
    return {
      ...widget,
      x: Math.round(widget.x * ratio),
      w: Math.max(min.w, Math.round(widget.w * ratio)),
    }
  })
  return repack(scaled, metrics, minSizeOf, isSizeAllowed)
}

/**
 * 격자 안으로 밀어 넣고 겹침을 푼다.
 *
 * 원래 순서대로 처리한다 — 결과가 입력에만 의존해야 같은 기기에서 늘 같은
 * 배치가 나온다.
 */
function repack(
  widgets: readonly WidgetInstance[],
  metrics: GridMetrics,
  minSizeOf: (definitionId: string) => { w: number; h: number },
  isSizeAllowed: (definitionId: string, size: { w: number; h: number }) => boolean,
): Layout {
  const placed: WidgetInstance[] = []
  const taken: Placement[] = []

  for (const widget of widgets) {
    const min = minSizeOf(widget.definitionId)
    const wanted = clampToGrid(
      {
        x: widget.x,
        y: widget.y,
        w: Math.max(min.w, widget.w),
        h: Math.max(min.h, widget.h),
      },
      metrics,
    )

    // 최소 크기가 격자보다 크면 이 기기에서는 놓을 수 없다.
    if (wanted.w > metrics.columns || wanted.h > metrics.rows) continue
    // 위젯 고유 제약(예: 긴 쪽이 6칸 이상)을 못 넘기면 이 격자에서는 뺀다.
    if (!isSizeAllowed(widget.definitionId, { w: wanted.w, h: wanted.h })) continue

    const spot = canPlaceAt(wanted, taken, metrics)
      ? wanted
      : findFreeSpot({ w: wanted.w, h: wanted.h }, taken, metrics)
    if (!spot) continue

    placed.push({ ...widget, ...spot })
    taken.push(spot)
  }

  return { columns: metrics.columns, widgets: placed }
}

/**
 * 현재 열 수의 레이아웃을 얻는다. 없으면 가장 가까운 것에서 파생한다.
 * 파생 결과는 부르는 쪽이 저장한다 — 이후로는 독립적으로 편집된다.
 */
export function layoutForColumns(
  layouts: Readonly<Record<number, Layout>>,
  metrics: GridMetrics,
  minSizeOf: (definitionId: string) => { w: number; h: number },
  isSizeAllowed: (definitionId: string, size: { w: number; h: number }) => boolean = () => true,
): Layout {
  if (metrics.columns <= 0) return emptyLayout(0)

  const existing = layouts[metrics.columns]
  if (existing) return repack(existing.widgets, metrics, minSizeOf, isSizeAllowed)

  const source = pickSourceLayout(layouts, metrics.columns)
  if (!source) return emptyLayout(metrics.columns)
  return deriveLayout(source, metrics, minSizeOf, isSizeAllowed)
}
