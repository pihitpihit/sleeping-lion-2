import { spanOf, type GridMetrics, type Placement } from '../grid'
import type { Layout } from '../layout'
import { getWidgetDefinition } from '../widgets/registry'
import type { SatchelMode } from '../widgets/types'
import { WidgetFrame } from './WidgetFrame'

interface Props {
  layout: Layout
  metrics: GridMetrics
  mode: SatchelMode
  showWidgetTitles: boolean
  settingsOf: (instanceId: string, definitionId: string) => unknown
  onCommit: (instanceId: string, next: Placement) => boolean
  onRemove: (instanceId: string) => void
  onOpenSettings: (instanceId: string) => void
}

/**
 * 격자 배경과 위젯을 그린다.
 *
 * 좌표 산술은 전부 `cellsToPixels`가 한다 — 렌더러가 다시 계산하지 않는다.
 */
export function WidgetBoard({
  layout,
  metrics,
  mode,
  showWidgetTitles,
  settingsOf,
  onCommit,
  onRemove,
  onOpenSettings,
}: Props) {
  if (metrics.columns <= 0 || metrics.rows <= 0) return null

  const step = metrics.cellSize + metrics.gap

  /**
   * 격자는 셀마다 점을 찍는다.
   *
   * 선으로 그리면 셀 크기가 소수일 때 흐려지고, 셀 수만큼 DOM을 만들면
   * 12×8에 96개가 된다. 배경 하나로 끝내는 편이 가볍고 홈화면과도 닮았다.
   */
  /**
   * 격자는 **칸 사이를 지나는 점선**으로 그린다.
   *
   * 칸 한가운데에 표시를 두면 위젯을 어디까지 늘릴지 가늠이 안 된다. 경계선이
   * 있어야 "여기부터 다음 칸"이 보인다. 선은 간격 한복판(칸과 칸 사이)을 지난다.
   *
   * SVG로 그리는 이유는 두 가지다. CSS 그라디언트로는 진짜 점선을 만들 수 없고,
   * 선은 열+행+2개뿐이라 칸마다 DOM을 만드는 것(14×9면 126개)과 비교가 안 된다.
   */
  const boardWidth = metrics.paddingX * 2 + spanOf(metrics.columns, metrics.cellSize, metrics.gap)
  const boardHeight = metrics.paddingY * 2 + spanOf(metrics.rows, metrics.cellSize, metrics.gap)
  const half = metrics.gap / 2
  const verticals = Array.from(
    { length: metrics.columns + 1 },
    (_, k) => metrics.paddingX - half + k * step,
  )
  const horizontals = Array.from(
    { length: metrics.rows + 1 },
    (_, k) => metrics.paddingY - half + k * step,
  )

  return (
    <>
      {mode === 'edit' && (
        <svg
          className="widget-board__grid"
          width={boardWidth}
          height={boardHeight}
          aria-hidden="true"
        >
          {verticals.map((x) => (
            <line key={`v${x}`} x1={x} y1={horizontals[0]} x2={x} y2={horizontals.at(-1)} />
          ))}
          {horizontals.map((y) => (
            <line key={`h${y}`} x1={verticals[0]} y1={y} x2={verticals.at(-1)} y2={y} />
          ))}
        </svg>
      )}

      {layout.widgets.map((widget, index) => {
        const definition = getWidgetDefinition(widget.definitionId)
        // 알 수 없는 위젯은 이미 걸러졌지만 한 겹 더 막는다.
        if (!definition) return null

        const others = layout.widgets
          .filter((_, i) => i !== index)
          .map(({ x, y, w, h }) => ({ x, y, w, h }))

        return (
          <WidgetFrame
            key={widget.instanceId}
            widget={widget}
            definition={definition}
            metrics={metrics}
            mode={mode}
            others={others}
            showTitle={showWidgetTitles}
            settings={settingsOf(widget.instanceId, widget.definitionId)}
            onCommit={(next) => onCommit(widget.instanceId, next)}
            onRemove={() => onRemove(widget.instanceId)}
            onOpenSettings={() => onOpenSettings(widget.instanceId)}
          />
        )
      })}
    </>
  )
}
