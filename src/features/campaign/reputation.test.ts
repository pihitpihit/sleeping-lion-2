import { describe, expect, it } from 'vitest'
import {
  MAX_REPUTATION,
  MIN_REPUTATION,
  REPUTATION_BANDS,
  clampReputation,
  priceModifierLabel,
  priceModifierSpeech,
  shopPriceModifier,
} from './reputation'

describe('평판 구간표', () => {
  it('눈금 전체를 빈틈없이 덮는다', () => {
    for (let value = MIN_REPUTATION; value <= MAX_REPUTATION; value += 1) {
      const hit = REPUTATION_BANDS.filter((b) => value >= b.min && value <= b.max)
      expect(hit, `평판 ${value}`).toHaveLength(1)
    }
  })

  it('구간이 이어져 있고 겹치지 않는다', () => {
    for (let i = 1; i < REPUTATION_BANDS.length; i += 1) {
      expect(REPUTATION_BANDS[i].min).toBe(REPUTATION_BANDS[i - 1].max + 1)
    }
    expect(REPUTATION_BANDS[0].min).toBe(MIN_REPUTATION)
    expect(REPUTATION_BANDS[REPUTATION_BANDS.length - 1].max).toBe(MAX_REPUTATION)
  })

  it('평판이 오르면 값이 싸지거나 그대로다 — 거꾸로 가지 않는다', () => {
    let previous = Number.POSITIVE_INFINITY
    for (let value = MIN_REPUTATION; value <= MAX_REPUTATION; value += 1) {
      const modifier = shopPriceModifier(value)
      expect(modifier, `평판 ${value}`).toBeLessThanOrEqual(previous)
      previous = modifier
    }
  })
})

describe('shopPriceModifier', () => {
  // 웹에서 확인된 두 점이다. 나머지 구간은 이 둘에 맞춰 세웠고
  // 2026-08-07에 형님이 실물 시트와 대조했다.
  it('알려진 두 점과 맞는다', () => {
    expect(shopPriceModifier(15)).toBe(-4)
    expect(shopPriceModifier(-19)).toBe(5)
  })

  it('가운데는 그대로다 — 다섯 칸이 0이다', () => {
    for (const value of [-2, -1, 0, 1, 2]) {
      expect(shopPriceModifier(value), `평판 ${value}`).toBe(0)
    }
    // 바로 바깥은 이미 걸린다.
    expect(shopPriceModifier(-3)).toBe(1)
    expect(shopPriceModifier(3)).toBe(-1)
  })

  it('양 끝이 ±5다', () => {
    expect(shopPriceModifier(MIN_REPUTATION)).toBe(5)
    expect(shopPriceModifier(MAX_REPUTATION)).toBe(-5)
  })

  it('구간 경계가 시트대로다', () => {
    const boundaries: [number, number][] = [
      [-19, 5],
      [-18, 4],
      [-15, 4],
      [-14, 3],
      [-11, 3],
      [-10, 2],
      [-7, 2],
      [-6, 1],
      [-3, 1],
      [6, -1],
      [7, -2],
      [10, -2],
      [11, -3],
      [14, -3],
      [18, -4],
      [19, -5],
    ]
    for (const [reputation, expected] of boundaries) {
      expect(shopPriceModifier(reputation), `평판 ${reputation}`).toBe(expected)
    }
  })

  it('눈금 밖은 끝값으로 본다', () => {
    expect(shopPriceModifier(999)).toBe(-5)
    expect(shopPriceModifier(-999)).toBe(5)
  })
})

describe('clampReputation', () => {
  it('눈금 안으로 들인다', () => {
    expect(clampReputation(30)).toBe(MAX_REPUTATION)
    expect(clampReputation(-30)).toBe(MIN_REPUTATION)
    expect(clampReputation(7)).toBe(7)
  })

  it('소수는 버리고 정수로 만든다', () => {
    expect(clampReputation(3.9)).toBe(3)
    expect(clampReputation(-3.9)).toBe(-3)
  })

  it('숫자가 아니면 0으로 본다', () => {
    expect(clampReputation(Number.NaN)).toBe(0)
    expect(clampReputation(Number.POSITIVE_INFINITY)).toBe(0)
  })
})

describe('화면 문구', () => {
  it('0은 그대로라고 적는다 — +0은 무언가 걸린 것처럼 읽힌다', () => {
    expect(priceModifierLabel(0)).toBe('그대로')
    expect(priceModifierSpeech(0)).toBe('물건값 그대로')
  })

  it('부호를 붙여 방향을 드러낸다', () => {
    expect(priceModifierLabel(3)).toBe('+3')
    expect(priceModifierLabel(-2)).toBe('−2')
  })

  it('읽어주는 쪽에는 우리말이 간다', () => {
    expect(priceModifierSpeech(3)).toBe('물건값 3 비싸짐')
    expect(priceModifierSpeech(-2)).toBe('물건값 2 싸짐')
  })
})
