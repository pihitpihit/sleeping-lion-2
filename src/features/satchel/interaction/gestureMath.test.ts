import { describe, expect, it } from 'vitest'
import { computeGridMetrics, type GridMetrics } from '../grid'
import { exceedsThreshold, previewMove, previewResize } from './gestureMath'

const M: GridMetrics = computeGridMetrics({ width: 375, height: 603 }) // 4x6, 78px, gap 12
const MIN = { w: 1, h: 1 }

describe('previewMove', () => {
  it('움직이지 않으면 제자리다', () => {
    const start = { x: 1, y: 1, w: 2, h: 2 }
    expect(previewMove(start, { dx: 0, dy: 0 }, M)).toEqual(start)
  })

  it('한 칸 폭만큼 끌면 한 칸 옮겨진다', () => {
    const step = M.cellWidth + M.gap
    const moved = previewMove({ x: 0, y: 0, w: 1, h: 1 }, { dx: step, dy: step }, M)
    expect(moved).toMatchObject({ x: 1, y: 1 })
  })

  // 반올림 경계. 절반을 못 넘으면 원래 칸에 머물러야 손이 흔들려도 안 튄다.
  it('절반을 넘어야 다음 칸으로 넘어간다', () => {
    const step = M.cellWidth + M.gap
    expect(previewMove({ x: 0, y: 0, w: 1, h: 1 }, { dx: step * 0.49, dy: 0 }, M).x).toBe(0)
    expect(previewMove({ x: 0, y: 0, w: 1, h: 1 }, { dx: step * 0.51, dy: 0 }, M).x).toBe(1)
  })

  it('크기는 건드리지 않는다', () => {
    const moved = previewMove({ x: 0, y: 0, w: 3, h: 2 }, { dx: 200, dy: 200 }, M)
    expect(moved.w).toBe(3)
    expect(moved.h).toBe(2)
  })

  // 자르면 '밖으로 끌었다'는 사실이 사라져 무효 표시를 못 한다.
  it('격자 밖으로 나가는 값도 그대로 낸다', () => {
    expect(previewMove({ x: 0, y: 0, w: 1, h: 1 }, { dx: -500, dy: 0 }, M).x).toBeLessThan(0)
    expect(previewMove({ x: 3, y: 0, w: 1, h: 1 }, { dx: 500, dy: 0 }, M).x).toBeGreaterThan(3)
  })
})

describe('previewResize', () => {
  it('움직이지 않으면 크기가 그대로다', () => {
    const start = { x: 0, y: 0, w: 2, h: 2 }
    expect(previewResize(start, { dx: 0, dy: 0 }, M, MIN)).toEqual(start)
  })

  it('한 칸 폭만큼 끌면 한 칸 커진다', () => {
    const step = M.cellWidth + M.gap
    const r = previewResize({ x: 0, y: 0, w: 1, h: 1 }, { dx: step, dy: step }, M, MIN)
    expect(r).toMatchObject({ w: 2, h: 2 })
  })

  it('좌상단은 고정이다', () => {
    const r = previewResize({ x: 2, y: 3, w: 1, h: 1 }, { dx: 200, dy: 200 }, M, MIN)
    expect(r).toMatchObject({ x: 2, y: 3 })
  })

  it('최소 크기 아래로는 줄지 않는다', () => {
    const r = previewResize({ x: 0, y: 0, w: 3, h: 3 }, { dx: -9999, dy: -9999 }, M, { w: 2, h: 2 })
    expect(r).toMatchObject({ w: 2, h: 2 })
  })

  it('격자 경계에서 멈춘다', () => {
    const r = previewResize({ x: 0, y: 0, w: 1, h: 1 }, { dx: 9999, dy: 9999 }, M, MIN)
    expect(r.w).toBe(M.columns)
    expect(r.h).toBe(M.rows)
  })

  it('시작 위치를 감안해 남은 칸까지만 커진다', () => {
    const r = previewResize({ x: M.columns - 2, y: 0, w: 1, h: 1 }, { dx: 9999, dy: 0 }, M, MIN)
    expect(r.w).toBe(2)
  })

  it('최대 크기 제한을 지킨다', () => {
    const r = previewResize({ x: 0, y: 0, w: 1, h: 1 }, { dx: 9999, dy: 9999 }, M, MIN, {
      w: 2,
      h: 3,
    })
    expect(r).toMatchObject({ w: 2, h: 3 })
  })

  it('잴 수 없는 격자에서는 그대로 낸다', () => {
    const empty: GridMetrics = {
      columns: 0,
      rows: 0,
      cellWidth: 0,
      cellHeight: 0,
      gap: 12,
      paddingX: 0,
      paddingY: 0,
    }
    const start = { x: 0, y: 0, w: 1, h: 1 }
    expect(previewResize(start, { dx: 100, dy: 100 }, empty, MIN)).toEqual(start)
  })
})

describe('exceedsThreshold', () => {
  it('미세한 흔들림은 드래그가 아니다', () => {
    expect(exceedsThreshold({ dx: 2, dy: 2 })).toBe(false)
  })

  it('한 축만 넘어도 드래그다', () => {
    expect(exceedsThreshold({ dx: 0, dy: 5 })).toBe(true)
    expect(exceedsThreshold({ dx: -5, dy: 0 })).toBe(true)
  })
})
