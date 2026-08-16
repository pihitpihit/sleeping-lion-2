import { describe, expect, it } from 'vitest'
import {
  OAK_BASE,
  OAK_CELLS,
  OAK_UNLOCK_BONUS,
  OAK_FIRST,
  OAK_LAST,
  checkGifts,
  clampOak,
  isMark,
  prosperityFrom,
  oakTotal,
  toNextMark,
} from './greatOak'

describe('떡갈나무 판', () => {
  it('110에서 1000까지 열씩이다 — 사진의 그 판이다', () => {
    expect(OAK_CELLS[0]).toBe(OAK_FIRST)
    expect(OAK_CELLS[OAK_CELLS.length - 1]).toBe(OAK_LAST)
    expect(OAK_CELLS).toHaveLength(90)
  })

  it('표식은 오십마다 하나다', () => {
    expect(isMark(150)).toBe(true)
    expect(isMark(200)).toBe(true)
    expect(isMark(160)).toBe(false)
  })

  it('판 밖으로 안 나간다', () => {
    expect(clampOak(-5)).toBe(0)
    expect(clampOak(9999)).toBe(OAK_LAST)
  })
})

describe('여는 기부', () => {
  /** B봉투를 여는 100이 곧 판의 시작점이다(형님이 짚었다). */
  it('열리는 순간 이미 100이 쌓여 있다', () => {
    expect(oakTotal(0)).toBe(OAK_BASE)
    expect(oakTotal(10)).toBe(110)
    expect(oakTotal(900)).toBe(1000)
  })

  it('판 끝을 넘지 않는다', () => {
    expect(oakTotal(99999)).toBe(1000)
  })
})

describe('번영도', () => {
  /** B봉투를 여는 것 자체가 하나다 — 금화 100개를 낸 삯이다. */
  it('판이 열리는 것만으로 하나를 받는다', () => {
    expect(OAK_UNLOCK_BONUS).toBe(1)
  })

  /** 100까지는 B봉투를 여는 기부라 판에 오르기 전이다. */
  it('첫 표식(150) 앞에서는 0이다', () => {
    expect(prosperityFrom(0)).toBe(0)
    expect(prosperityFrom(140)).toBe(0)
  })

  it('표식을 지날 때마다 하나씩 는다', () => {
    expect(prosperityFrom(150)).toBe(1)
    expect(prosperityFrom(190)).toBe(1)
    expect(prosperityFrom(200)).toBe(2)
    expect(prosperityFrom(1000)).toBe(18)
  })

  it('다음 표식까지 남은 수를 센다', () => {
    expect(toNextMark(140)).toBe(10)
    expect(toNextMark(150)).toBe(50)
    expect(toNextMark(1000)).toBeNull()
  })
})

describe('나눠 내기', () => {
  const g = (amount: number, gold: number) => ({ amount, gold })

  it('합산이 열 단위여야 한다 — 칸 사이에 멈출 자리가 없다', () => {
    expect(checkGifts([g(10, 100), g(20, 100)])).toBeNull()
    expect(checkGifts([g(5, 100), g(10, 100)])).toBe('step')
    // 각자는 열 단위가 아니어도 된다 — 합산만 맞으면 된다.
    expect(checkGifts([g(5, 100), g(5, 100)])).toBeNull()
  })

  it('가진 것보다 많이 못 낸다', () => {
    expect(checkGifts([g(50, 30)])).toBe('short')
  })

  it('아무도 안 내면 낼 것이 없다', () => {
    expect(checkGifts([g(0, 100), g(0, 100)])).toBe('empty')
  })
})
