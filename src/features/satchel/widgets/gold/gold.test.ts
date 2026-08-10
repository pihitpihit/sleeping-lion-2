import { describe, expect, it } from 'vitest'
import { clampGold, isGoldSizeAllowed, MAX_GOLD, MIN_GOLD, stepGold } from './gold'

describe('금화 세기', () => {
  it('0 밑으로 내려가지 않는다 — 줍지 않은 것을 뱉을 수는 없다', () => {
    expect(stepGold(0, -1)).toBe(MIN_GOLD)
    expect(clampGold(-5)).toBe(MIN_GOLD)
  })

  it('세 자리에서 멎는다 — 한 칸에 그보다 큰 숫자가 안 들어간다', () => {
    expect(stepGold(MAX_GOLD, 1)).toBe(MAX_GOLD)
    expect(clampGold(5000)).toBe(MAX_GOLD)
  })

  it('더하고 뺀다', () => {
    expect(stepGold(10, 5)).toBe(15)
    expect(stepGold(10, -3)).toBe(7)
  })

  it('이상한 값은 0으로 본다', () => {
    expect(clampGold(Number.NaN)).toBe(MIN_GOLD)
    expect(clampGold(Number.POSITIVE_INFINITY)).toBe(MIN_GOLD)
  })

  it('소수는 반올림한다 — 끌기가 중간에 멎어도 정수만 남는다', () => {
    expect(clampGold(3.4)).toBe(3)
    expect(clampGold(3.6)).toBe(4)
  })
})

describe('크기', () => {
  it('한 칸만 허용한다', () => {
    expect(isGoldSizeAllowed({ w: 1, h: 1 })).toBe(true)
  })

  it('그 밖은 전부 막는다 — 넓혀도 담을 것이 늘지 않는다', () => {
    expect(isGoldSizeAllowed({ w: 2, h: 1 })).toBe(false)
    expect(isGoldSizeAllowed({ w: 1, h: 2 })).toBe(false)
    expect(isGoldSizeAllowed({ w: 2, h: 2 })).toBe(false)
  })
})
