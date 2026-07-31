import { describe, expect, it } from 'vitest'
import { computeElementLayout, isElementTrackerSizeAllowed } from './layout'
import { ELEMENTS, nearestSlotState, nextElementState, slotOf, stateAtSlot } from './elements'

describe('isElementTrackerSizeAllowed', () => {
  // 요구사항: 가로 '혹은' 세로가 6칸 이상. minSize {w,h} 한 쌍으로는 못 적는 조건이다.
  it('한쪽만 6칸 이상이면 통과한다', () => {
    expect(isElementTrackerSizeAllowed({ w: 6, h: 1 })).toBe(true)
    expect(isElementTrackerSizeAllowed({ w: 1, h: 6 })).toBe(true)
    expect(isElementTrackerSizeAllowed({ w: 8, h: 3 })).toBe(true)
  })

  it('둘 다 6칸 미만이면 막는다', () => {
    expect(isElementTrackerSizeAllowed({ w: 5, h: 5 })).toBe(false)
    expect(isElementTrackerSizeAllowed({ w: 1, h: 1 })).toBe(false)
  })
})

describe('computeElementLayout', () => {
  it('가로가 길면 수평, 세로가 길면 수직으로 늘어놓는다', () => {
    expect(computeElementLayout({ width: 600, height: 100 }).orientation).toBe('horizontal')
    expect(computeElementLayout({ width: 100, height: 600 }).orientation).toBe('vertical')
  })

  it('정사각형이면 수직이다', () => {
    expect(computeElementLayout({ width: 400, height: 400 }).orientation).toBe('vertical')
  })

  it('원소 여섯 칸이 위젯을 고르게 나눠 갖는다', () => {
    const l = computeElementLayout({ width: 600, height: 100 })
    expect(l.laneLength * ELEMENTS.length).toBeCloseTo(600, 6)
  })

  it('아이콘이 칸 안에 들어오고 꽉 채우지는 않는다', () => {
    for (const size of [
      { width: 600, height: 100 },
      { width: 100, height: 600 },
      { width: 480, height: 240 },
    ]) {
      const l = computeElementLayout(size)
      expect(l.iconSize).toBeGreaterThan(0)
      expect(l.iconSize).toBeLessThan(l.laneLength)
      expect(l.iconSize).toBeLessThan(l.laneThickness)
    }
  })

  it('아이콘이 무한정 커지지 않는다', () => {
    expect(computeElementLayout({ width: 4000, height: 4000 }).iconSize).toBeLessThanOrEqual(120)
  })

  // 슬라이딩 여부가 이 위젯의 두 가지 표현을 가른다.
  it('수직 여유가 아이콘 두 배 이상이면 미끄러진다', () => {
    const wide = computeElementLayout({ width: 600, height: 300 })
    expect(wide.canSlide).toBe(true)
    expect(new Set(wide.slotOffsets).size).toBe(3)
  })

  it('여유가 없으면 미끄러지지 않고 세 슬롯이 한 점에 모인다', () => {
    const thin = computeElementLayout({ width: 600, height: 90 })
    expect(thin.canSlide).toBe(false)
    expect(new Set(thin.slotOffsets).size).toBe(1)
  })

  // 실제로 삐져나갔던 버그다. 폭을 1/6·3/6·5/6로 나누면 슬라이딩 기준(cross >= icon*2)
  // 아래에서 양 끝 아이콘이 icon/6만큼 칸 밖으로 나간다.
  it('아이콘이 어느 슬롯에서도 칸 밖으로 나가지 않는다', () => {
    for (const size of [
      { width: 600, height: 300 },
      { width: 600, height: 148 }, // 슬라이딩 경계 언저리
      { width: 600, height: 200 },
      { width: 300, height: 900 },
      { width: 240, height: 640 },
    ]) {
      const l = computeElementLayout(size)
      const half = l.iconSize / 2
      for (const offset of l.slotOffsets) {
        expect(offset - half, `${size.width}x${size.height} 앞쪽`).toBeGreaterThanOrEqual(-0.001)
        expect(offset + half, `${size.width}x${size.height} 뒤쪽`).toBeLessThanOrEqual(
          l.laneThickness + 0.001,
        )
      }
    }
  })

  it('슬롯이 칸 안에 들어온다', () => {
    const l = computeElementLayout({ width: 600, height: 300 })
    for (const offset of l.slotOffsets) {
      expect(offset).toBeGreaterThan(0)
      expect(offset).toBeLessThan(l.laneThickness)
    }
  })

  it('잴 수 없는 크기에서 던지지 않는다', () => {
    for (const bad of [
      { width: 0, height: 0 },
      { width: -10, height: 100 },
      { width: Number.NaN, height: 100 },
    ]) {
      expect(() => computeElementLayout(bad)).not.toThrow()
      expect(computeElementLayout(bad).iconSize).toBe(0)
    }
  })
})

describe('원소 상태', () => {
  it('탭하면 꺼짐 → 타오름 → 사그라듦 → 꺼짐 으로 돈다', () => {
    expect(nextElementState('inert')).toBe('strong')
    expect(nextElementState('strong')).toBe('waning')
    expect(nextElementState('waning')).toBe('inert')
  })

  // 왼쪽이 꺼짐, 오른쪽으로 갈수록 강하다.
  it('슬롯은 왼쪽부터 꺼짐·사그라듦·타오름 순이다', () => {
    expect(slotOf('inert')).toBe(0)
    expect(slotOf('waning')).toBe(1)
    expect(slotOf('strong')).toBe(2)
  })

  it('트랙 위 위치를 가장 가까운 상태로 되돌린다', () => {
    expect(stateAtSlot(-5)).toBe('inert')
    expect(stateAtSlot(0.4)).toBe('inert')
    expect(stateAtSlot(0.6)).toBe('waning')
    expect(stateAtSlot(99)).toBe('strong')
  })

  // 끄는 동안에는 손가락을 따라가고, 손을 뗀 뒤에야 이 판정으로 붙는다.
  it('놓은 자리에서 가장 가까운 슬롯으로 붙는다', () => {
    const slots = [20, 100, 180] as const
    expect(nearestSlotState(20, slots)).toBe('inert')
    expect(nearestSlotState(55, slots)).toBe('inert')
    expect(nearestSlotState(65, slots)).toBe('waning')
    expect(nearestSlotState(139, slots)).toBe('waning')
    expect(nearestSlotState(141, slots)).toBe('strong')
    expect(nearestSlotState(999, slots)).toBe('strong')
    expect(nearestSlotState(-999, slots)).toBe('inert')
  })

  it('슬롯 간격이 고르지 않아도 가까운 쪽을 고른다', () => {
    const slots = [0, 10, 200] as const
    expect(nearestSlotState(9, slots)).toBe('waning')
    expect(nearestSlotState(120, slots)).toBe('strong')
  })

  it('여섯 원소가 요구된 순서대로다', () => {
    expect(ELEMENTS.map((e) => e.id)).toEqual(['fire', 'ice', 'air', 'earth', 'light', 'dark'])
  })
})
