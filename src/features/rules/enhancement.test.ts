import { describe, expect, it } from 'vitest'
import {
  ENHANCE_EFFECTS,
  ENHANCE_STATS,
  ENHANCE_SUMMON,
  enhanceCost,
  hexCost,
  levelExtra,
  stickerExtra,
} from './enhancement'

describe('향상 가격표', () => {
  it('인쇄된 값 그대로다', () => {
    expect(ENHANCE_STATS.find((e) => e.name === '공격')?.gold).toBe(50)
    expect(ENHANCE_STATS.find((e) => e.name === '방어')?.gold).toBe(100)
    expect(ENHANCE_SUMMON.find((e) => e.name === '이동')?.gold).toBe(100)
    expect(ENHANCE_EFFECTS.find((e) => e.name === '무장해제')?.gold).toBe(150)
  })

  it('레벨은 하나 오를 때마다 25씩 — 1레벨은 0이다', () => {
    expect(levelExtra(1)).toBe(0)
    expect(levelExtra(2)).toBe(25)
    expect(levelExtra(9)).toBe(200)
  })

  it('이미 붙은 스티커는 하나마다 75다', () => {
    expect(stickerExtra(0)).toBe(0)
    expect(stickerExtra(3)).toBe(225)
  })

  it('공격 칸은 200을 칸 수로 나누고 내린다', () => {
    expect(hexCost(1)).toBe(200)
    expect(hexCost(3)).toBe(66)
    expect(hexCost(4)).toBe(50)
  })

  /** 실물 표의 예시: 3레벨 카드에 이미 하나 붙은 복수 대상 공격 +1. */
  it('곱이 먼저고 더함이 나중이다', () => {
    expect(enhanceCost({ base: 50, multiTarget: true, level: 3, stickers: 1 })).toBe(
      50 * 2 + 50 + 75,
    )
    expect(enhanceCost({ base: 30 })).toBe(30)
  })
})
