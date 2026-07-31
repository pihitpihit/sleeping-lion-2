import { describe, expect, it } from 'vitest'
import type { GridMetrics } from '../grid'
import { addWidget, dropUnknownWidgets, removeWidget, updatePlacement } from './operations'
import type { Layout } from './types'

const GRID: GridMetrics = { columns: 4, rows: 3, cellSize: 80, gap: 12, paddingX: 0, paddingY: 0 }

function base(): Layout {
  return {
    columns: 4,
    widgets: [{ instanceId: 'a', definitionId: 'test', x: 0, y: 0, w: 2, h: 2 }],
  }
}

describe('addWidget', () => {
  it('빈 자리에 놓는다', () => {
    const next = addWidget(base(), 'test', { w: 2, h: 2 }, GRID, 'b')
    expect(next?.widgets).toHaveLength(2)
    expect(next?.widgets[1]).toMatchObject({ instanceId: 'b', x: 2, y: 0 })
  })

  it('자리가 없으면 null', () => {
    const full: Layout = {
      columns: 4,
      widgets: [{ instanceId: 'a', definitionId: 'test', x: 0, y: 0, w: 4, h: 3 }],
    }
    expect(addWidget(full, 'test', { w: 1, h: 1 }, GRID, 'b')).toBeNull()
  })

  it('원본을 변형하지 않는다', () => {
    const layout = base()
    addWidget(layout, 'test', { w: 1, h: 1 }, GRID, 'b')
    expect(layout.widgets).toHaveLength(1)
  })
})

describe('removeWidget', () => {
  it('id로 지운다', () => {
    expect(removeWidget(base(), 'a').widgets).toHaveLength(0)
  })

  it('없는 id면 같은 객체를 돌려준다', () => {
    const layout = base()
    expect(removeWidget(layout, '없음')).toBe(layout)
  })
})

describe('updatePlacement', () => {
  it('빈 자리로 옮긴다', () => {
    const next = updatePlacement(base(), 'a', { x: 2, y: 1, w: 2, h: 2 }, GRID)
    expect(next?.widgets[0]).toMatchObject({ x: 2, y: 1 })
  })

  // 자기 자신을 겹침 판정에서 빼지 않으면 제자리에 두는 것조차 실패한다.
  it('제자리에 그대로 두는 것도 성공한다', () => {
    expect(updatePlacement(base(), 'a', { x: 0, y: 0, w: 2, h: 2 }, GRID)).not.toBeNull()
  })

  it('격자 밖이면 null', () => {
    expect(updatePlacement(base(), 'a', { x: 3, y: 0, w: 2, h: 2 }, GRID)).toBeNull()
  })

  it('다른 위젯과 겹치면 null', () => {
    const two = addWidget(base(), 'test', { w: 2, h: 2 }, GRID, 'b')!
    expect(updatePlacement(two, 'b', { x: 1, y: 0, w: 2, h: 2 }, GRID)).toBeNull()
  })

  it('없는 id면 null', () => {
    expect(updatePlacement(base(), '없음', { x: 0, y: 0, w: 1, h: 1 }, GRID)).toBeNull()
  })
})

describe('dropUnknownWidgets', () => {
  it('레지스트리에 없는 위젯만 뺀다', () => {
    const layout: Layout = {
      columns: 4,
      widgets: [
        { instanceId: 'a', definitionId: 'test', x: 0, y: 0, w: 1, h: 1 },
        { instanceId: 'b', definitionId: '사라진위젯', x: 1, y: 0, w: 1, h: 1 },
      ],
    }
    const next = dropUnknownWidgets(layout, (id) => id === 'test')
    expect(next.widgets.map((w) => w.instanceId)).toEqual(['a'])
  })

  it('모두 알려진 것이면 같은 객체를 돌려준다', () => {
    const layout = base()
    expect(dropUnknownWidgets(layout, () => true)).toBe(layout)
  })
})
