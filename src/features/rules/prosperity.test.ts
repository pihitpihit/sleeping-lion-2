import { describe, expect, it } from 'vitest'
import { PROSPERITY_ROWS, cardNo, prosperityRow, unlockedThrough } from './prosperity'

/*
  인쇄된 표가 정본이다 — 형님이 찍어 보낸 시트를 그대로 적어 두고 식을 지나온
  값과 맞댄다(구현 결정 286과 같은 손질).
*/
const PRINTED: readonly (readonly number[])[] = [
  [1, 1, 14],
  [2, 15, 21],
  [3, 22, 28],
  [4, 29, 35],
  [5, 36, 42],
  [6, 43, 49],
  [7, 50, 56],
  [8, 57, 63],
  [9, 64, 70],
]

describe('번영도별 아이템 카드', () => {
  it('아홉 줄이 인쇄된 표와 같다', () => {
    expect(PROSPERITY_ROWS.map((r) => [r.level, r.from, r.to])).toEqual(PRINTED)
  })

  it('1레벨만 열넷이고 그 뒤로는 일곱씩이다', () => {
    expect(prosperityRow(1).to - prosperityRow(1).from + 1).toBe(14)
    for (let l = 2; l <= 9; l += 1) {
      expect(prosperityRow(l).to - prosperityRow(l).from + 1).toBe(7)
    }
  })

  it('표 밖의 수는 1~9 안으로 당긴다', () => {
    expect(prosperityRow(0).level).toBe(1)
    expect(prosperityRow(99).level).toBe(9)
  })

  it('그 번영도까지 풀린 것은 마지막 번호까지다 — 목록은 쌓인다', () => {
    expect(unlockedThrough(1)).toBe(14)
    expect(unlockedThrough(9)).toBe(70)
  })

  it('번호는 시트처럼 세 자리로 적는다', () => {
    expect(cardNo(1)).toBe('001')
    expect(cardNo(70)).toBe('070')
  })
})
