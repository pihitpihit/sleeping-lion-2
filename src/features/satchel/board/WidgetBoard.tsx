import type { CSSProperties } from 'react'
import { spanOf, type GridMetrics, type Placement } from '../grid'
import type { Layout } from '../layout'
import { getWidgetDefinition } from '../widgets/registry'
import type { SatchelMode } from '../widgets/types'
import { WidgetFrame } from './WidgetFrame'

interface Props {
  layout: Layout
  metrics: GridMetrics
  mode: SatchelMode
  onCommit: (instanceId: string, next: Placement) => boolean
  onRemove: (instanceId: string) => void
}

/**
 * 격자 배경과 위젯을 그린다.
 *
 * 좌표 산술은 전부 `cellsToPixels`가 한다 — 렌더러가 다시 계산하지 않는다.
 */
export function WidgetBoard({ layout, metrics, mode, onCommit, onRemove }: Props) {
  if (metrics.columns <= 0 || metrics.rows <= 0) return null

  const step = metrics.cellSize + metrics.gap

  /**
   * 격자는 셀마다 점을 찍는다.
   *
   * 선으로 그리면 셀 크기가 소수일 때 흐려지고, 셀 수만큼 DOM을 만들면
   * 12×8에 96개가 된다. 배경 하나로 끝내는 편이 가볍고 홈화면과도 닮았다.
   */
  const gridStyle: CSSProperties = {
    // 격자 영역에 정확히 겹쳐 둔다. 보드 전체에 깔면 가장자리 밖까지 점이 찍힌다.
    left: `${metrics.paddingX}px`,
    top: `${metrics.paddingY}px`,
    width: `${spanOf(metrics.columns, metrics.cellSize, metrics.gap)}px`,
    height: `${spanOf(metrics.rows, metrics.cellSize, metrics.gap)}px`,
    backgroundImage: 'radial-gradient(circle, var(--sl-border-strong) 1.5px, transparent 1.5px)',
    backgroundSize: `${step}px ${step}px`,
    // radial-gradient의 원은 타일 한가운데에 놓인다. 원을 셀 한가운데로 보내려면
    // 타일 원점을 (셀/2 − 타일/2) 만큼 당겨야 하고, 그 값이 −간격/2다.
    backgroundPosition: `${-metrics.gap / 2}px ${-metrics.gap / 2}px`,
  }

  return (
    <>
      {mode === 'edit' && (
        <div className="widget-board__grid" style={gridStyle} aria-hidden="true" />
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
            onCommit={(next) => onCommit(widget.instanceId, next)}
            onRemove={() => onRemove(widget.instanceId)}
          />
        )
      })}
    </>
  )
}
