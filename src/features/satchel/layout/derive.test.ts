import { describe, expect, it } from 'vitest'
import { canPlaceAt, isWithinGrid, type GridMetrics } from '../grid'
import { deriveLayout, layoutForColumns, pickSourceLayout } from './derive'
import type { Layout, WidgetInstance } from './types'

const MIN_1x1 = () => ({ w: 1, h: 1 })
const MIN_2x2 = () => ({ w: 2, h: 2 })

function grid(columns: number, rows: number): GridMetrics {
  return { columns, rows, cellWidth: 80, cellHeight: 80, gap: 12, paddingX: 0, paddingY: 0 }
}

function widget(id: string, x: number, y: number, w: number, h: number): WidgetInstance {
  return { instanceId: id, definitionId: 'test', x, y, w, h }
}

function layout(columns: number, widgets: WidgetInstance[]): Layout {
  return { columns, widgets }
}

/** 결과가 격자 안에 있고 서로 겹치지 않는가. 파생의 최소 보증이다. */
function assertSound(result: Layout, metrics: GridMetrics) {
  const placed: WidgetInstance[] = []
  for (const w of result.widgets) {
    expect(isWithinGrid(w, metrics), `${w.instanceId} 격자 밖`).toBe(true)
    expect(canPlaceAt(w, placed, metrics), `${w.instanceId} 겹침`).toBe(true)
    placed.push(w)
  }
}

describe('pickSourceLayout', () => {
  it('저장된 것이 없으면 null', () => {
    expect(pickSourceLayout({}, 8)).toBeNull()
  })

  it('열 수가 가장 가까운 것을 고른다', () => {
    const layouts = { 4: layout(4, []), 12: layout(12, []) }
    expect(pickSourceLayout(layouts, 5)?.columns).toBe(4)
    expect(pickSourceLayout(layouts, 11)?.columns).toBe(12)
  })

  // 넓은 배치를 좁은 격자에 밀어 넣으면 위젯이 버려질 확률이 높다.
  it('동률이면 작은 쪽을 고른다', () => {
    const layouts = { 4: layout(4, []), 8: layout(8, []) }
    expect(pickSourceLayout(layouts, 6)?.columns).toBe(4)
  })
})

describe('deriveLayout', () => {
  it('열이 늘면 가로로 비례해 벌어진다', () => {
    const source = layout(4, [widget('a', 0, 0, 2, 1), widget('b', 2, 0, 2, 1)])
    const result = deriveLayout(source, grid(8, 6), MIN_1x1)

    expect(result.columns).toBe(8)
    expect(result.widgets).toHaveLength(2)
    expect(result.widgets[0]).toMatchObject({ instanceId: 'a', x: 0, w: 4 })
    expect(result.widgets[1]).toMatchObject({ instanceId: 'b', x: 4, w: 4 })
    assertSound(result, grid(8, 6))
  })

  // 행 수는 열 수와 무관하게 높이에서 나온다. 같은 비율로 늘리면 엉뚱한 곳에 떨어진다.
  it('세로 좌표는 비율로 늘리지 않는다', () => {
    const source = layout(4, [widget('a', 0, 2, 1, 1)])
    const result = deriveLayout(source, grid(8, 6), MIN_1x1)
    expect(result.widgets[0].y).toBe(2)
  })

  it('열이 줄어도 최소 크기는 지킨다', () => {
    const source = layout(12, [widget('a', 0, 0, 3, 3)])
    const result = deriveLayout(source, grid(4, 6), MIN_2x2)
    expect(result.widgets[0].w).toBeGreaterThanOrEqual(2)
    expect(result.widgets[0].h).toBeGreaterThanOrEqual(2)
    assertSound(result, grid(4, 6))
  })

  it('겹치게 된 위젯을 빈 자리로 옮긴다', () => {
    // 12열에서 나란하던 둘이 4열로 오면 같은 자리를 노린다
    const source = layout(12, [widget('a', 0, 0, 3, 1), widget('b', 3, 0, 3, 1)])
    const result = deriveLayout(source, grid(4, 6), MIN_1x1)
    expect(result.widgets).toHaveLength(2)
    assertSound(result, grid(4, 6))
  })

  it('자리가 부족하면 일부를 버리되 남은 것은 유효하다', () => {
    const many = Array.from({ length: 20 }, (_, i) => widget(`w${i}`, 0, 0, 2, 2))
    const result = deriveLayout(layout(8, many), grid(4, 4), MIN_1x1)
    expect(result.widgets.length).toBeLessThan(20)
    expect(result.widgets.length).toBeGreaterThan(0)
    assertSound(result, grid(4, 4))
  })

  it('최소 크기가 격자보다 크면 그 위젯만 빠진다', () => {
    const source = layout(8, [widget('big', 0, 0, 6, 1), widget('small', 0, 1, 1, 1)])
    const minSize = (id: string) => (id === 'test' ? { w: 1, h: 1 } : { w: 99, h: 99 })
    const result = deriveLayout(source, grid(4, 4), minSize)
    expect(result.widgets.map((w) => w.instanceId)).toContain('small')
  })

  it('원본을 변형하지 않는다', () => {
    const source = layout(4, [widget('a', 1, 1, 2, 2)])
    const snapshot = JSON.stringify(source)
    deriveLayout(source, grid(8, 6), MIN_1x1)
    expect(JSON.stringify(source)).toBe(snapshot)
  })

  it('잴 수 없는 격자에서는 빈 레이아웃을 낸다', () => {
    const result = deriveLayout(layout(4, [widget('a', 0, 0, 1, 1)]), grid(0, 0), MIN_1x1)
    expect(result.widgets).toHaveLength(0)
  })

  // 열 수가 같아도 행 수는 툴바 위치나 화면 높이에 따라 달라진다.
  it('열 수가 같아도 행이 줄면 넘친 위젯을 다시 앉힌다', () => {
    const source = layout(4, [widget('a', 0, 5, 1, 1)])
    const result = deriveLayout(source, grid(4, 3), MIN_1x1)
    assertSound(result, grid(4, 3))
    expect(result.widgets[0].y).toBeLessThan(3)
  })
})

describe('layoutForColumns', () => {
  it('저장된 것이 없으면 빈 레이아웃', () => {
    expect(layoutForColumns({}, grid(4, 6), MIN_1x1).widgets).toHaveLength(0)
  })

  it('같은 열 수가 있으면 그것을 쓴다', () => {
    const layouts = { 4: layout(4, [widget('a', 1, 1, 1, 1)]) }
    const result = layoutForColumns(layouts, grid(4, 6), MIN_1x1)
    expect(result.widgets[0]).toMatchObject({ instanceId: 'a', x: 1, y: 1 })
  })

  it('없으면 가장 가까운 것에서 파생한다', () => {
    const layouts = { 4: layout(4, [widget('a', 0, 0, 2, 1)]) }
    const result = layoutForColumns(layouts, grid(8, 6), MIN_1x1)
    expect(result.columns).toBe(8)
    expect(result.widgets[0].w).toBe(4)
  })
})
