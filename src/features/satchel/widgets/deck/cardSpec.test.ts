import { describe, expect, it } from 'vitest'
import {
  MARKS,
  VALUE_IDS,
  makeCardSpec,
  markSpeech,
  parseCardSpec,
  specSpeech,
  valueHasArt,
} from './cardSpec'
import {
  STANDARD_COMPOSITION,
  buildDeck,
  buildDeckMarked,
  compositionKinds,
  compositionSize,
  createDeck,
  drawTurn,
  freshDeck,
  makeCard,
  needsShuffle,
  revealedChain,
  totalCount,
  type Rng,
} from './deck'

/** 늘 0을 내는 난수기 — 셔플이 맨 앞을 고르게 만든다(순서를 붙박아 둔다). */
const zeroRng: Rng = () => 0

describe('명세 낱말', () => {
  it('값만 있는 것은 그대로 읽힌다 — 옛 열쇠가 그냥 통과한다', () => {
    for (const id of VALUE_IDS) {
      const spec = parseCardSpec(id)
      expect(spec, id).not.toBeNull()
      expect(spec!.id).toBe(id)
      expect(spec!.rolling).toBe(false)
      expect(spec!.marks).toEqual([])
    }
  })

  it('굴림을 읽는다', () => {
    const spec = parseCardSpec('r.p1')!
    expect(spec.rolling).toBe(true)
    expect(spec.effect).toEqual({ kind: 'add', value: 1 })
  })

  it('표식을 읽는다', () => {
    const spec = parseCardSpec('p1.wound')!
    expect(spec.marks).toHaveLength(1)
    expect(spec.marks[0].def.name).toBe('부상')
    expect(spec.marks[0].amount).toBeNull()
  })

  it('수를 단 표식을 읽는다', () => {
    const spec = parseCardSpec('r.p0.push2')!
    expect(spec.rolling).toBe(true)
    expect(markSpeech(spec.marks[0])).toBe('밀기2')
  })

  it('표식이 둘 붙은 카드도 있다', () => {
    const spec = parseCardSpec('p1.fire.ice')!
    expect(spec.marks.map((m) => m.def.id)).toEqual(['fire', 'ice'])
  })

  /**
   * **한 카드는 한 가지로만 적힌다.** 그러지 않으면 구성표에 같은 카드가 두 줄로
   * 앉아 장수가 갈라진다.
   */
  it('표식 차례가 달라도 같은 낱말이 된다', () => {
    expect(parseCardSpec('p1.ice.fire')!.id).toBe('p1.fire.ice')
    expect(parseCardSpec('p1.fire.ice')!.id).toBe('p1.fire.ice')
  })

  it('알아볼 수 없는 것은 버린다', () => {
    expect(parseCardSpec('')).toBeNull()
    expect(parseCardSpec('없는것')).toBeNull()
    expect(parseCardSpec('p9')).toBeNull()
    expect(parseCardSpec('p1.모름')).toBeNull()
    expect(parseCardSpec('r')).toBeNull()
    expect(parseCardSpec('r.r.p1')).toBeNull()
    expect(parseCardSpec(null)).toBeNull()
    expect(parseCardSpec(7)).toBeNull()
  })

  it('같은 표식이 두 번 붙은 것은 버린다 — 조용히 접으면 열쇠가 갈린다', () => {
    expect(parseCardSpec('p1.fire.fire')).toBeNull()
  })

  it('수를 다는 표식에 수가 없으면 버린다 — 짐작해서 채우지 않는다', () => {
    expect(parseCardSpec('r.p0.push')).toBeNull()
    expect(parseCardSpec('p1.heal')).toBeNull()
  })

  it('수를 안 다는 표식에 수가 붙으면 버린다', () => {
    expect(parseCardSpec('p1.wound2')).toBeNull()
  })

  it('조각으로도 짓는다', () => {
    const spec = makeCardSpec({ valueId: 'p0', rolling: true, marks: ['muddle'] })!
    expect(spec.id).toBe('r.p0.muddle')
  })

  it('섞기는 곱하기 카드 둘에만 붙는다 — 굴림에는 안 붙는다', () => {
    expect(parseCardSpec('x0')!.shuffleAfter).toBe(true)
    expect(parseCardSpec('x2')!.shuffleAfter).toBe(true)
    expect(parseCardSpec('p1')!.shuffleAfter).toBe(false)
    expect(parseCardSpec('r.p1')!.shuffleAfter).toBe(false)
  })

  it('읽어주는 말에 굴림과 표식이 함께 간다', () => {
    expect(specSpeech(parseCardSpec('r.p0.fire')!)).toBe('굴림, 보정 없음, 불')
    expect(specSpeech(parseCardSpec('p1.heal2')!)).toBe('1 더함, 치료2')
  })

  it('표식 낱말이 서로 겹치지 않는다', () => {
    expect(new Set(MARKS.map((m) => m.id)).size).toBe(MARKS.length)
  })

  /** 일곱은 팩에서 왔고 `p3`·`p4`는 그 원반을 빌려 구웠다(2026-08-13). */
  it('아홉 값이 모두 그림을 갖는다', () => {
    expect(VALUE_IDS.filter(valueHasArt)).toEqual(VALUE_IDS)
    expect(valueHasArt('p9')).toBe(false)
  })
})

describe('표식 붙은 구성', () => {
  it('표식 붙은 열쇠로도 덱을 편다', () => {
    const cards = buildDeck({ p0: 1, 'p1.wound': 2, 'r.p0.fire': 1 })
    expect(cards).toHaveLength(4)
    expect(cards.filter((c) => c.spec.rolling)).toHaveLength(1)
    expect(cards.filter((c) => c.spec.marks.length > 0)).toHaveLength(3)
  })

  it('장수를 센다', () => {
    expect(compositionSize({ p0: 1, 'p1.wound': 2 })).toBe(3)
  })

  it('아홉 값이 먼저, 표식 붙은 것이 나중에 온다', () => {
    const kinds = compositionKinds({ 'p1.wound': 1, p0: 1, x0: 1 })
    expect(kinds.map((k) => k.id)).toEqual(['x0', 'p0', 'p1.wound'])
  })

  it('같은 입력에 같은 결과다 — 렌더 중에 불려도 안전하다', () => {
    const composition = { 'r.p0.fire': 2, p0: 3, 'p1.wound': 1 }
    expect(buildDeck(composition)).toEqual(buildDeck(composition))
  })
})

/**
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ **어디서 온 카드인지는 표준 덱과 견주면 갈린다.**                         │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * 카드에 꼬리표를 달지 않는다 — 구성표와 표준 덱만 있으면 언제든 다시 셀 수 있는
 * 것을 저장하면 저장물이 표와 어긋날 자리가 하나 더 생긴다(구현 결정 65와 같은 결).
 */
describe('표준인가 퍽으로 더한 것인가', () => {
  it('표준 덱은 한 장도 더한 것이 없다', () => {
    expect(buildDeckMarked(STANDARD_COMPOSITION).every((c) => !c.added)).toBe(true)
  })

  it('표준에 없던 종류는 통째로 더한 것이다', () => {
    const marked = buildDeckMarked({ 'p1.wound': 2, p3: 1 })
    expect(marked.every((c) => c.added)).toBe(true)
    expect(marked).toHaveLength(3)
  })

  /** 종류마다 **표준 장수까지가 원래 있던 것**이고 그 뒤가 더한 것이다. */
  it('표준보다 더 놓인 것만 더한 것으로 센다', () => {
    // +1은 표준이 다섯이다. 일곱이면 뒤의 둘이 더한 것.
    const marked = buildDeckMarked({ p1: 7 })
    expect(marked.map((c) => c.added)).toEqual([false, false, false, false, false, true, true])
  })

  it('표준보다 적게 놓이면 더한 것이 없다', () => {
    expect(buildDeckMarked({ p1: 2 }).every((c) => !c.added)).toBe(true)
  })

  it('차례는 `buildDeck`과 같다 — 같은 구성이면 늘 같은 결과다', () => {
    const composition = { p0: 3, 'p1.wound': 1, 'r.p0.fire': 2 }
    expect(buildDeckMarked(composition).map((c) => c.card)).toEqual(buildDeck(composition))
  })
})

describe('굴림 — 뽑기가 이어진다', () => {
  it('굴림이 없으면 한 장으로 끝난다', () => {
    const result = drawTurn(createDeck(zeroRng, { p0: 3 }), zeroRng)
    expect(result.chain).toHaveLength(1)
    expect(result.chain[0].spec.rolling).toBe(false)
  })

  it('굴림이 나오면 굴림 아닌 것이 나올 때까지 이어진다', () => {
    // 섞지 않은 덱은 종류 차례대로다 — 아홉 값이 먼저, 그다음 표식 붙은 것.
    // `p0` 한 장 뒤에 굴림 둘이 오므로 순서를 뒤집어 굴림부터 뽑히게 놓는다.
    const deck = freshDeck({ 'r.p0.fire': 2, p1: 1 })
    const rolledFirst = { draw: [...deck.draw].reverse(), discard: [] }

    const result = drawTurn(rolledFirst, zeroRng)
    expect(result.chain).toHaveLength(3)
    expect(result.chain.slice(0, 2).every((c) => c.spec.rolling)).toBe(true)
    expect(result.chain[2].spec.rolling).toBe(false)
  })

  it('굴림만 든 덱에서도 멎는다 — 무한 고리를 막는 울타리다', () => {
    const deck = freshDeck({ 'r.p0.fire': 3 })
    const result = drawTurn(deck, zeroRng)
    expect(result.chain).toHaveLength(3)
    expect(totalCount(result.state)).toBe(3)
  })

  it('덱이 비면 섞고 나서 뽑는다', () => {
    let state = createDeck(zeroRng, { p0: 2 })
    state = drawTurn(state, zeroRng).state
    state = drawTurn(state, zeroRng).state
    const result = drawTurn(state, zeroRng)
    expect(result.reshuffled).toBe(true)
    expect(result.chain).toHaveLength(1)
  })

  it('한 장도 없으면 아무것도 안 뽑는다', () => {
    const result = drawTurn({ draw: [], discard: [] }, zeroRng)
    expect(result.chain).toEqual([])
    expect(result.reshuffled).toBe(false)
  })
})

describe('마지막 뽑기 되짚기', () => {
  it('굴림이 없으면 한 장이다', () => {
    const state = drawTurn(createDeck(zeroRng, { p0: 3 }), zeroRng).state
    expect(revealedChain(state)).toHaveLength(1)
  })

  it('굴림으로 이어진 것을 뽑은 차례대로 되짚는다', () => {
    const deck = freshDeck({ 'r.p0.fire': 2, p1: 1 })
    const rolledFirst = { draw: [...deck.draw].reverse(), discard: [] }
    const { state, chain } = drawTurn(rolledFirst, zeroRng)
    expect(revealedChain(state).map((c) => c.id)).toEqual(chain.map((c) => c.id))
  })

  it('지난 뽑기까지 끌어오지 않는다', () => {
    let state = freshDeck({ p0: 1, p1: 1, p2: 1 })
    state = drawTurn(state, zeroRng).state
    state = drawTurn(state, zeroRng).state
    expect(revealedChain(state)).toHaveLength(1)
  })

  it('아무것도 안 뽑았으면 비어 있다', () => {
    expect(revealedChain(freshDeck({ p0: 1 }))).toEqual([])
  })
})

describe('섞기 표시', () => {
  it('굴림 뒤에 ×2가 나오면 섞기가 걸린다', () => {
    const deck = freshDeck({ x2: 1, 'r.p0.fire': 1 })
    const rolledFirst = { draw: [...deck.draw].reverse(), discard: [] }
    const { state } = drawTurn(rolledFirst, zeroRng)
    expect(needsShuffle(state)).toBe(true)
  })
})

describe('카드 짓기', () => {
  it('알아볼 수 없는 종류면 짓지 않는다', () => {
    expect(makeCard('a', '없는것')).toBeNull()
  })

  it('열쇠를 한 가지 꼴로 세워 둔다', () => {
    expect(makeCard('a', 'p1.ice.fire')!.kindId).toBe('p1.fire.ice')
  })
})
