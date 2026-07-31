import { canPlaceAt, findFreeSpot, type GridMetrics, type Placement } from '../grid'
import type { Layout, WidgetInstance } from './types'

/**
 * 레이아웃을 바꾸는 순수 함수들.
 *
 * 전부 새 객체를 낸다. 스토어는 이것들을 부르기만 하고 규칙을 다시 쓰지 않는다.
 * **유효하지 않은 조작은 `null`을 낸다** — 잘못된 배치를 스토어에 넣고 나중에
 * 화면에서 거르면 저장소에도 잘못된 값이 들어간다.
 */

export function placementOf(widget: WidgetInstance): Placement {
  return { x: widget.x, y: widget.y, w: widget.w, h: widget.h }
}

export function placementsOf(layout: Layout): Placement[] {
  return layout.widgets.map(placementOf)
}

/** 위젯을 새로 놓는다. 빈 자리가 없으면 `null`. */
export function addWidget(
  layout: Layout,
  definitionId: string,
  size: { w: number; h: number },
  metrics: GridMetrics,
  instanceId: string,
): Layout | null {
  const spot = findFreeSpot(size, placementsOf(layout), metrics)
  if (!spot) return null
  return {
    ...layout,
    widgets: [...layout.widgets, { instanceId, definitionId, ...spot }],
  }
}

/** 위젯을 없앤다. 없는 id면 그대로 돌려준다. */
export function removeWidget(layout: Layout, instanceId: string): Layout {
  const widgets = layout.widgets.filter((w) => w.instanceId !== instanceId)
  return widgets.length === layout.widgets.length ? layout : { ...layout, widgets }
}

/**
 * 위젯의 자리나 크기를 바꾼다. 놓을 수 없으면 `null`.
 *
 * 자기 자신을 겹침 판정에서 빼는 것이 핵심이다. 빼지 않으면 제자리에 그대로
 * 두는 것조차 실패한다.
 */
export function updatePlacement(
  layout: Layout,
  instanceId: string,
  next: Placement,
  metrics: GridMetrics,
): Layout | null {
  const index = layout.widgets.findIndex((w) => w.instanceId === instanceId)
  if (index < 0) return null
  if (!canPlaceAt(next, placementsOf(layout), metrics, index)) return null

  const widgets = layout.widgets.slice()
  widgets[index] = { ...widgets[index], ...next }
  return { ...layout, widgets }
}

/** 알 수 없는 위젯을 걸러낸다. 레지스트리에서 위젯을 뺐을 때 쓴다. */
export function dropUnknownWidgets(layout: Layout, isKnown: (id: string) => boolean): Layout {
  const widgets = layout.widgets.filter((w) => isKnown(w.definitionId))
  return widgets.length === layout.widgets.length ? layout : { ...layout, widgets }
}
