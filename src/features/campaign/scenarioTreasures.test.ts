import { describe, expect, it } from 'vitest'
import { remainingTreasures, treasureText } from './scenarioTreasures'

/* 번호는 지어낸 것이다(구현 결정 532). */
describe('remainingTreasures', () => {
  it('놓인 번호에서 찾은 것을 뺀다', () => {
    expect(remainingTreasures({ treasures: [201, 202] }, [202, 300])).toEqual([201])
  })

  it('다 찾았으면 빈 배열 — 모르는 것(null)과 다르다', () => {
    expect(remainingTreasures({ treasures: [201] }, [201])).toEqual([])
    expect(remainingTreasures({ treasures: [] }, [])).toBeNull()
    expect(remainingTreasures({}, [])).toBeNull()
  })
})

describe('treasureText', () => {
  it('남은 번호를 적고, 다 찾았으면 그렇게, 모르면 아무것도', () => {
    expect(treasureText([201, 202])).toBe('보물 #201·#202 남음')
    expect(treasureText([])).toBe('보물 다 찾음')
    expect(treasureText(null)).toBe('')
  })
})
