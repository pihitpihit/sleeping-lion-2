import { describe, expect, it } from 'vitest'
import type { Placement } from './coords'
import type { GridMetrics } from './gridMetrics'
import { canPlaceAt, findFreeSpot, isWithinGrid, overlaps } from './placement'

/** 손으로 세기 쉬운 4×3 격자. 픽셀 값은 이 판정들과 무관하다. */
const GRID: GridMetrics = {
  columns: 4,
  rows: 3,
  cellSize: 80,
  gap: 12,
  paddingX: 0,
  paddingY: 0,
}

describe('isWithinGrid', () => {
  it('격자를 꽉 채운 배치도 안에 있다', () => {
    expect(isWithinGrid({ x: 0, y: 0, w: 4, h: 3 }, GRID)).toBe(true)
  })

  it('한 칸이라도 넘치면 밖이다', () => {
    expect(isWithinGrid({ x: 3, y: 0, w: 2, h: 1 }, GRID)).toBe(false)
    expect(isWithinGrid({ x: 0, y: 2, w: 1, h: 2 }, GRID)).toBe(false)
    expect(isWithinGrid({ x: -1, y: 0, w: 1, h: 1 }, GRID)).toBe(false)
  })

  it('크기가 0 이하면 배치가 아니다', () => {
    expect(isWithinGrid({ x: 0, y: 0, w: 0, h: 1 }, GRID)).toBe(false)
  })
})

describe('overlaps', () => {
  // 이 판정을 >= 로 쓰면 나란한 위젯이 겹쳤다고 나와 아무것도 못 놓는다.
  it('변이 맞닿기만 한 것은 겹친 것이 아니다', () => {
    expect(overlaps({ x: 0, y: 0, w: 2, h: 1 }, { x: 2, y: 0, w: 1, h: 1 })).toBe(false)
    expect(overlaps({ x: 0, y: 0, w: 1, h: 2 }, { x: 0, y: 2, w: 1, h: 1 })).toBe(false)
  })

  it('한 칸이라도 물리면 겹친다', () => {
    expect(overlaps({ x: 0, y: 0, w: 2, h: 2 }, { x: 1, y: 1, w: 2, h: 2 })).toBe(true)
  })

  it('완전히 품은 것도 겹친다', () => {
    expect(overlaps({ x: 0, y: 0, w: 4, h: 3 }, { x: 1, y: 1, w: 1, h: 1 })).toBe(true)
  })

  it('대각선으로 스친 것은 겹치지 않는다', () => {
    expect(overlaps({ x: 0, y: 0, w: 1, h: 1 }, { x: 1, y: 1, w: 1, h: 1 })).toBe(false)
  })
})

describe('canPlaceAt', () => {
  const existing: Placement[] = [{ x: 0, y: 0, w: 2, h: 2 }]

  it('빈 자리에는 놓을 수 있다', () => {
    expect(canPlaceAt({ x: 2, y: 0, w: 2, h: 2 }, existing, GRID)).toBe(true)
  })

  it('겹치는 자리에는 못 놓는다', () => {
    expect(canPlaceAt({ x: 1, y: 1, w: 2, h: 2 }, existing, GRID)).toBe(false)
  })

  // 흔히 놓치는 지점이다. 드래그 중인 위젯을 목록에 남겨둔 채 판정하면
  // 자기 자신과 겹친다고 나와 어디에도 못 놓는다.
  it('ignoreIndex로 자기 자신을 겹침 판정에서 뺀다', () => {
    // 같은 자리에 그대로 놓기 — 자기를 빼지 않으면 실패한다
    expect(canPlaceAt({ x: 0, y: 0, w: 2, h: 2 }, existing, GRID)).toBe(false)
    expect(canPlaceAt({ x: 0, y: 0, w: 2, h: 2 }, existing, GRID, 0)).toBe(true)
  })

  it('격자를 벗어나면 겹치지 않아도 못 놓는다', () => {
    expect(canPlaceAt({ x: 3, y: 0, w: 2, h: 1 }, [], GRID)).toBe(false)
  })
})

describe('findFreeSpot', () => {
  it('빈 격자에서는 좌상단을 낸다', () => {
    expect(findFreeSpot({ w: 2, h: 2 }, [], GRID)).toEqual({ x: 0, y: 0, w: 2, h: 2 })
  })

  it('행 우선으로 훑어 첫 빈 자리를 낸다', () => {
    const existing: Placement[] = [{ x: 0, y: 0, w: 2, h: 1 }]
    expect(findFreeSpot({ w: 1, h: 1 }, existing, GRID)).toEqual({ x: 2, y: 0, w: 1, h: 1 })
  })

  it('격자가 꽉 차면 null이다', () => {
    const full: Placement[] = [{ x: 0, y: 0, w: 4, h: 3 }]
    expect(findFreeSpot({ w: 1, h: 1 }, full, GRID)).toBeNull()
  })

  it('격자보다 큰 크기는 null이다', () => {
    expect(findFreeSpot({ w: 5, h: 1 }, [], GRID)).toBeNull()
    expect(findFreeSpot({ w: 1, h: 4 }, [], GRID)).toBeNull()
  })

  it('0 이하 크기는 null이다', () => {
    expect(findFreeSpot({ w: 0, h: 1 }, [], GRID)).toBeNull()
  })

  it('찾은 자리는 실제로 놓을 수 있다', () => {
    const existing: Placement[] = [
      { x: 0, y: 0, w: 2, h: 2 },
      { x: 2, y: 0, w: 1, h: 1 },
    ]
    const spot = findFreeSpot({ w: 1, h: 2 }, existing, GRID)
    expect(spot).not.toBeNull()
    expect(canPlaceAt(spot!, existing, GRID)).toBe(true)
  })
})
