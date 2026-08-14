import { describe, expect, it } from 'vitest'
import {
  DIFFICULTY_MOD,
  SCENARIO_LEVELS,
  recommendedLevel,
  rowFor,
  scenarioLevelFor,
  soloVariant,
} from './scenarioLevel'

/*
  ┌────────────────────────────────────────────────────────────────────────┐
  │ **인쇄된 표가 정본이다. 우리 식이 그것과 맞는지 본다.**                  │
  └────────────────────────────────────────────────────────────────────────┘

  함정 피해와 보너스 경험은 셈해서 내므로(`2+L`·`4+2L`) 식이 틀리면 화면의 표가
  통째로 거짓이 된다. 규칙서에서 눈으로 읽은 여덟 줄을 그대로 적어 두고 견준다 —
  **상수끼리 견주는 것이 아니라** 식을 지나온 값을 인쇄된 값과 맞대는 것이다.
*/

/** 글룸헤이븐 규칙서 15쪽 · 사자의 턱 규칙서 29쪽. [레벨, 몬스터, 금화, 함정, 경험] */
const PRINTED: readonly (readonly number[])[] = [
  [0, 0, 2, 2, 4],
  [1, 1, 2, 3, 6],
  [2, 2, 3, 4, 8],
  [3, 3, 3, 5, 10],
  [4, 4, 4, 6, 12],
  [5, 5, 4, 7, 14],
  [6, 6, 5, 8, 16],
  [7, 7, 6, 9, 18],
]

describe('시나리오 레벨 표', () => {
  it('여덟 줄이 인쇄된 표와 같다', () => {
    expect(
      SCENARIO_LEVELS.map((r) => [r.level, r.monsterLevel, r.goldPerCoin, r.trapDamage, r.bonusXp]),
    ).toEqual(PRINTED)
  })

  it('위험 지형은 함정의 절반이고 내린다', () => {
    // 2→1, 3→1, 4→2, 5→2 … 홀수에서 내려가는 것이 핵심이다.
    expect(SCENARIO_LEVELS.map((r) => r.hazardDamage)).toEqual([1, 1, 2, 2, 3, 3, 4, 4])
  })

  it('표 밖의 수는 0~7 안으로 당긴다', () => {
    expect(rowFor(-3).level).toBe(0)
    expect(rowFor(99).level).toBe(7)
  })
})

describe('recommendedLevel', () => {
  it('평균을 반으로 나누고 올린다', () => {
    // 규칙서의 예: 6·4·4·3 → 평균 4.25 → 2.125 → 올려서 3.
    expect(recommendedLevel([6, 4, 4, 3])).toBe(3)
  })

  it('넷이 다 2레벨이면 아직 1이다 — 누군가 3이 되어야 2로 오른다', () => {
    expect(recommendedLevel([2, 2, 2, 2])).toBe(1)
    expect(recommendedLevel([3, 2, 2, 2])).toBe(2)
  })

  it('아무도 없으면 모른다고 한다', () => {
    expect(recommendedLevel([])).toBeNull()
  })
})

describe('scenarioLevelFor', () => {
  it('난이도만큼 얹는다', () => {
    const party = [2, 2, 2, 2] // 권장 1
    expect(scenarioLevelFor(party, 'easy')).toBe(0)
    expect(scenarioLevelFor(party, 'normal')).toBe(1)
    expect(scenarioLevelFor(party, 'hard')).toBe(2)
    expect(scenarioLevelFor(party, 'veryHard')).toBe(3)
  })

  it('0 밑으로도 7 위로도 안 나간다', () => {
    expect(scenarioLevelFor([1], 'easy')).toBe(0)
    expect(scenarioLevelFor([9, 9, 9, 9], 'veryHard')).toBe(7)
  })

  it('보정값은 규칙서의 넷 그대로다', () => {
    expect(DIFFICULTY_MOD).toEqual({ easy: -1, normal: 0, hard: 1, veryHard: 2 })
  })
})

describe('soloVariant', () => {
  it('몬스터와 함정만 오르고 금화·경험은 그대로다', () => {
    const solo = soloVariant(rowFor(3))
    expect([solo.monsterLevel, solo.trapDamage]).toEqual([4, 6])
    expect([solo.goldPerCoin, solo.bonusXp]).toEqual([3, 10])
    // 함정이 오르면 위험 지형도 따라 오른다.
    expect(solo.hazardDamage).toBe(3)
  })

  it('몬스터 레벨은 7에서 멎는다', () => {
    expect(soloVariant(rowFor(7)).monsterLevel).toBe(7)
  })
})
