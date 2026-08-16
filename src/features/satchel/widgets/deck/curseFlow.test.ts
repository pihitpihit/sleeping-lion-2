import { describe, expect, it } from 'vitest'
import {
  STANDARD_COMPOSITION,
  createDeck,
  drawTurn,
  makeCard,
  reshuffle,
  shuffleIn,
  totalCount,
  type DeckState,
} from './deck'

/*
  ┌────────────────────────────────────────────────────────────────────────┐
  │ **저주는 한 번 뽑히면 다시 안 돌아온다.**                               │
  └────────────────────────────────────────────────────────────────────────┘

  형님이 「다 뽑은 뒤에 섞으면 저주가 다시 채워진다」고 짚었다. 판을 통째로 굴려
  그 자리를 찾는다 — 뽑고, 다 떨어질 때까지 뽑고, 섞는다.
*/
function curses(state: DeckState): number {
  return [...state.draw, ...state.discard].filter((c) => c.kindId === 'x0.curse').length
}

describe('저주가 도로 채워지는가', () => {
  it('뽑은 저주는 섞어도 안 돌아온다', () => {
    let state = createDeck(() => 0.5, STANDARD_COMPOSITION)
    state = shuffleIn(state, [makeCard('c1', 'x0.curse')!, makeCard('c2', 'x0.curse')!], () => 0.5)
    expect(curses(state)).toBe(2)

    // 덱이 다 떨어지고 저절로 섞이는 데까지 굴린다.
    for (let i = 0; i < 60; i += 1) {
      state = drawTurn(state, () => 0.5).state
    }
    expect(curses(state)).toBe(0)

    state = reshuffle(state, () => 0.5)
    expect(curses(state)).toBe(0)
    // 표준 스무 장은 그대로 남는다.
    expect(totalCount(state)).toBe(20)
  })
})
