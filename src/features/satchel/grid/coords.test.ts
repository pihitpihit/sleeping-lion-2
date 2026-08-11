import { describe, expect, it } from 'vitest'
import { cellsToPixels, clampToGrid, pixelsToCell } from './coords'
import { computeGridMetrics, EMPTY_METRICS, spanOf } from './gridMetrics'

const METRICS = computeGridMetrics({ width: 375, height: 603 })

describe('cellsToPixels', () => {
  it('좌상단 칸은 여백에서 시작한다', () => {
    const rect = cellsToPixels({ x: 0, y: 0, w: 1, h: 1 }, METRICS)
    expect(rect.left).toBe(METRICS.paddingX)
    expect(rect.top).toBe(METRICS.paddingY)
    expect(rect.width).toBe(METRICS.cellWidth)
    expect(rect.height).toBe(METRICS.cellHeight)
  })

  it('여러 칸을 차지하면 사이 간격까지 먹는다', () => {
    const rect = cellsToPixels({ x: 0, y: 0, w: 2, h: 3 }, METRICS)
    expect(rect.width).toBe(spanOf(2, METRICS.cellWidth, METRICS.gap))
    expect(rect.height).toBe(spanOf(3, METRICS.cellHeight, METRICS.gap))
  })

  it('마지막 칸이 격자 오른쪽 끝에 닿는다', () => {
    const last = cellsToPixels({ x: METRICS.columns - 1, y: 0, w: 1, h: 1 }, METRICS)
    expect(last.left + last.width).toBeCloseTo(375 - METRICS.paddingX, 6)
  })
})

describe('pixelsToCell', () => {
  // 두 함수는 서로의 역이어야 한다. 어긋나면 드래그 중 미리보기가 한 칸씩 밀린다.
  it('모든 칸에서 좌상단 왕복이 정확하다', () => {
    for (let y = 0; y < METRICS.rows; y += 1) {
      for (let x = 0; x < METRICS.columns; x += 1) {
        const rect = cellsToPixels({ x, y, w: 1, h: 1 }, METRICS)
        expect(pixelsToCell(rect, METRICS)).toEqual({ x, y })
      }
    }
  })

  it('칸 한복판도 같은 칸으로 읽는다', () => {
    for (let y = 0; y < METRICS.rows; y += 1) {
      for (let x = 0; x < METRICS.columns; x += 1) {
        const rect = cellsToPixels({ x, y, w: 1, h: 1 }, METRICS)
        const center = { left: rect.left + rect.width / 2, top: rect.top + rect.height / 2 }
        // 한복판은 다음 칸 쪽으로 치우치지만 아직 넘어가지는 않는다.
        expect(pixelsToCell(center, METRICS)).toEqual({ x, y })
      }
    }
  })

  it('격자 밖은 자르지 않고 그대로 돌려준다', () => {
    // 자르는 것은 clampToGrid의 일이다. 여기서 함께 하면 '밖으로 끌었다'는
    // 사실이 사라져 무효 표시를 못 한다.
    const far = pixelsToCell({ left: -1000, top: -1000 }, METRICS)
    expect(far.x).toBeLessThan(0)
    expect(far.y).toBeLessThan(0)
  })

  it('빈 격자에서 던지지 않는다', () => {
    expect(pixelsToCell({ left: 100, top: 100 }, EMPTY_METRICS)).toEqual({ x: 0, y: 0 })
  })
})

describe('clampToGrid', () => {
  it('격자 안의 배치는 그대로 둔다', () => {
    const placement = { x: 1, y: 1, w: 2, h: 2 }
    expect(clampToGrid(placement, METRICS)).toEqual(placement)
  })

  it('오른쪽·아래로 넘친 배치를 안으로 민다', () => {
    const clamped = clampToGrid({ x: 99, y: 99, w: 2, h: 2 }, METRICS)
    expect(clamped.x).toBe(METRICS.columns - 2)
    expect(clamped.y).toBe(METRICS.rows - 2)
  })

  it('음수 좌표를 0으로 올린다', () => {
    expect(clampToGrid({ x: -5, y: -5, w: 1, h: 1 }, METRICS)).toEqual({ x: 0, y: 0, w: 1, h: 1 })
  })

  // 크기를 먼저 자르지 않으면 격자보다 큰 위젯의 위치가 음수로 밀린다.
  it('격자보다 큰 배치는 크기부터 자른다', () => {
    const clamped = clampToGrid({ x: 0, y: 0, w: 999, h: 999 }, METRICS)
    expect(clamped).toEqual({ x: 0, y: 0, w: METRICS.columns, h: METRICS.rows })
  })

  it('크기 0 이하는 1로 올린다', () => {
    const clamped = clampToGrid({ x: 0, y: 0, w: 0, h: -3 }, METRICS)
    expect(clamped.w).toBe(1)
    expect(clamped.h).toBe(1)
  })
})
