import { describe, expect, it } from 'vitest'
import { GRID_GAP, type GridMetrics } from './gridMetrics'
import { hasFreeCell, sizeCandidates } from './sizing'

function grid(columns: number, rows: number): GridMetrics {
  return { columns, rows, cellSize: 84, gap: GRID_GAP, paddingX: 0, paddingY: 0 }
}

describe('sizeCandidates', () => {
  it('기본 크기가 맨 앞이다', () => {
    const list = sizeCandidates({ w: 2, h: 2 }, { w: 1, h: 1 }, grid(8, 8))
    expect(list[0]).toEqual({ w: 2, h: 2 })
  })

  it('최소 크기까지 내려온다', () => {
    const list = sizeCandidates({ w: 2, h: 2 }, { w: 1, h: 1 }, grid(8, 8))
    expect(list).toContainEqual({ w: 1, h: 1 })
  })

  it('눕힌 것도 낸다 — 폰에서 원소 트래커를 놓으려면 필요하다', () => {
    // 기본 6×2인데 4열뿐이다. 6×2는 못 들어가고 2×6은 들어간다.
    const list = sizeCandidates({ w: 6, h: 2 }, { w: 1, h: 1 }, grid(4, 8))
    expect(list).toContainEqual({ w: 2, h: 6 })
    expect(list).not.toContainEqual({ w: 6, h: 2 })
  })

  it('격자를 벗어나는 크기는 아예 담지 않는다', () => {
    const list = sizeCandidates({ w: 6, h: 6 }, { w: 1, h: 1 }, grid(3, 3))
    for (const size of list) {
      expect(size.w).toBeLessThanOrEqual(3)
      expect(size.h).toBeLessThanOrEqual(3)
    }
  })

  it('넓은 것부터 나온다 — 기본에 가까울수록 앞이다', () => {
    const list = sizeCandidates({ w: 4, h: 3 }, { w: 1, h: 1 }, grid(8, 8))
    for (let i = 1; i < list.length; i += 1) {
      const before = list[i - 1].w * list[i - 1].h
      const after = list[i].w * list[i].h
      expect(before).toBeGreaterThanOrEqual(after)
    }
  })

  it('넓이가 같으면 기본과 모양이 덜 다른 쪽이 앞이다', () => {
    // 6×2를 줄일 때 3×2(넓이 6)가 2×3보다 앞이어야 한다.
    const list = sizeCandidates({ w: 6, h: 2 }, { w: 1, h: 1 }, grid(8, 8))
    const a = list.findIndex((s) => s.w === 3 && s.h === 2)
    const b = list.findIndex((s) => s.w === 2 && s.h === 3)
    expect(a).toBeGreaterThanOrEqual(0)
    expect(b).toBeGreaterThanOrEqual(0)
    expect(a).toBeLessThan(b)
  })

  it('같은 크기를 두 번 내지 않는다', () => {
    const list = sizeCandidates({ w: 3, h: 3 }, { w: 1, h: 1 }, grid(8, 8))
    expect(new Set(list.map((s) => `${s.w}x${s.h}`)).size).toBe(list.length)
  })

  it('격자가 없으면 빈 목록이다', () => {
    expect(sizeCandidates({ w: 2, h: 2 }, { w: 1, h: 1 }, grid(0, 0))).toEqual([])
  })
})

describe('hasFreeCell', () => {
  it('빈 격자에는 자리가 있다', () => {
    expect(hasFreeCell([], grid(4, 4))).toBe(true)
  })

  it('빈틈없이 찼으면 자리가 없다', () => {
    expect(hasFreeCell([{ x: 0, y: 0, w: 4, h: 4 }], grid(4, 4))).toBe(false)
  })

  it('한 칸이라도 남으면 자리가 있다', () => {
    const filled = [
      { x: 0, y: 0, w: 4, h: 3 },
      { x: 0, y: 3, w: 3, h: 1 },
    ]
    expect(hasFreeCell(filled, grid(4, 4))).toBe(true)
  })

  it('격자 밖으로 삐져나간 부분은 세지 않는다', () => {
    // 열 수가 줄어드는 순간 잠깐 이런 배치가 남는다. 그것 때문에
    // "자리가 없다"고 하면 안 된다.
    expect(hasFreeCell([{ x: 2, y: 0, w: 6, h: 4 }], grid(4, 4))).toBe(true)
  })

  it('격자가 없으면 자리도 없다', () => {
    expect(hasFreeCell([], grid(0, 0))).toBe(false)
  })
})
