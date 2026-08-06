import { describe, expect, it } from 'vitest'
import {
  CARD_KINDS,
  MAX_PER_KIND,
  STANDARD_COMPOSITION,
  buildDeck,
  cardLabel,
  cardSpeech,
  compositionSize,
  computeDeckLayout,
  countOf,
  createDeck,
  discardCount,
  drawOne,
  freshDeck,
  needsShuffle,
  remainingCount,
  reshuffle,
  revealedCard,
  shuffle,
  totalCount,
  type DeckState,
  type Rng,
} from './deck'
import { applyPerkChanges, resolveComposition } from './perks'
import {
  defaultAttackDeckSettings,
  isStandardComposition,
  sanitizeAttackDeckSettings,
} from './settings'

/** 씨앗을 심은 난수기. 같은 씨앗이면 늘 같은 순서가 나온다. */
function seeded(seed: number): Rng {
  let state = seed >>> 0
  return () => {
    // xorshift32. 품질보다 재현성이 목적이다.
    state ^= state << 13
    state >>>= 0
    state ^= state >>> 17
    state ^= state << 5
    state >>>= 0
    return state / 0x100000000
  }
}

/** 늘 0을 내는 난수기 — 셔플이 맨 앞을 고르게 만든다. */
const zeroRng: Rng = () => 0

describe('표준 덱', () => {
  it('20장이다', () => {
    expect(compositionSize(STANDARD_COMPOSITION)).toBe(20)
  })

  it('구성이 규칙대로다', () => {
    expect(STANDARD_COMPOSITION).toEqual({ x0: 1, m2: 1, m1: 5, p0: 6, p1: 5, p2: 1, x2: 1 })
  })

  it('섞기 표시는 ×0과 ×2에만 있다', () => {
    const marked = CARD_KINDS.filter((kind) => kind.shuffleAfter).map((kind) => kind.id)
    expect(marked).toEqual(['x0', 'x2'])
  })

  it('퍽으로 넣을 수 있는 +3·+4도 종류로 열려 있다', () => {
    const ids = CARD_KINDS.map((kind) => kind.id)
    expect(ids).toContain('p3')
    expect(ids).toContain('p4')
    // 다만 표준 덱에는 들어가지 않는다.
    expect(countOf(STANDARD_COMPOSITION, 'p3')).toBe(0)
  })
})

describe('buildDeck', () => {
  it('구성대로 편다', () => {
    const cards = buildDeck(STANDARD_COMPOSITION)
    expect(cards).toHaveLength(20)
    expect(cards.filter((c) => c.kindId === 'p0')).toHaveLength(6)
    expect(cards.filter((c) => c.kindId === 'm1')).toHaveLength(5)
  })

  it('카드 id가 서로 다르다', () => {
    const cards = buildDeck(STANDARD_COMPOSITION)
    expect(new Set(cards.map((c) => c.id)).size).toBe(cards.length)
  })

  it('같은 입력에 같은 결과다 — 렌더 중에 불려도 안전하다', () => {
    expect(buildDeck(STANDARD_COMPOSITION)).toEqual(buildDeck(STANDARD_COMPOSITION))
  })

  it('모르는 종류는 무시한다', () => {
    expect(buildDeck({ p0: 2, 없는것: 5 })).toHaveLength(2)
  })

  it('장수 상한을 넘기지 않는다', () => {
    expect(buildDeck({ p0: 999 })).toHaveLength(MAX_PER_KIND)
  })

  it('음수는 0으로 본다', () => {
    expect(buildDeck({ p0: -3 })).toHaveLength(0)
  })
})

describe('shuffle', () => {
  it('장수와 내용물이 보존된다', () => {
    const cards = buildDeck(STANDARD_COMPOSITION)
    const mixed = shuffle(cards, seeded(7))
    expect(mixed).toHaveLength(cards.length)
    expect([...mixed].map((c) => c.id).sort()).toEqual([...cards].map((c) => c.id).sort())
  })

  it('원본을 건드리지 않는다', () => {
    const cards = buildDeck(STANDARD_COMPOSITION)
    const before = cards.map((c) => c.id)
    shuffle(cards, seeded(7))
    expect(cards.map((c) => c.id)).toEqual(before)
  })

  it('같은 씨앗이면 같은 순서다', () => {
    const cards = buildDeck(STANDARD_COMPOSITION)
    expect(shuffle(cards, seeded(42))).toEqual(shuffle(cards, seeded(42)))
  })
})

describe('drawOne', () => {
  it('맨 위 한 장을 공개하고 버린 더미로 옮긴다', () => {
    const deck = createDeck(seeded(1))
    const top = deck.draw[0]
    const result = drawOne(deck, seeded(2))

    expect(result.card).toBe(top)
    expect(result.reshuffled).toBe(false)
    expect(remainingCount(result.state)).toBe(19)
    expect(discardCount(result.state)).toBe(1)
    expect(revealedCard(result.state)).toBe(top)
  })

  it('가장 최근에 공개한 것이 버린 더미의 맨 앞이다', () => {
    let state = createDeck(seeded(3))
    const first = drawOne(state, seeded(4))
    state = first.state
    const second = drawOne(state, seeded(5))

    expect(revealedCard(second.state)).toBe(second.card)
    expect(second.state.discard[1]).toBe(first.card)
  })

  it('덱이 비면 저절로 섞고 나서 뽑는다', () => {
    // 두 장짜리 덱을 만들어 바닥까지 뽑는다.
    let state: DeckState = createDeck(seeded(9), { p0: 1, p1: 1 })
    state = drawOne(state, seeded(9)).state
    state = drawOne(state, seeded(9)).state
    expect(remainingCount(state)).toBe(0)
    expect(discardCount(state)).toBe(2)

    const result = drawOne(state, seeded(9))
    expect(result.reshuffled).toBe(true)
    expect(result.card).not.toBeNull()
    // 두 장이 되돌아왔고 그중 한 장을 다시 뽑았다.
    expect(totalCount(result.state)).toBe(2)
    expect(remainingCount(result.state)).toBe(1)
    expect(discardCount(result.state)).toBe(1)
  })

  it('카드가 한 장도 없으면 null을 낸다', () => {
    const empty: DeckState = { draw: [], discard: [] }
    const result = drawOne(empty, seeded(1))
    expect(result.card).toBeNull()
    expect(result.reshuffled).toBe(false)
  })

  it('전체 장수는 뽑아도 변하지 않는다', () => {
    let state = createDeck(seeded(11))
    for (let n = 0; n < 25; n += 1) state = drawOne(state, seeded(n)).state
    expect(totalCount(state)).toBe(20)
  })
})

describe('reshuffle', () => {
  it('버린 것을 되돌리고 공개된 카드를 지운다', () => {
    let state = createDeck(seeded(13))
    state = drawOne(state, seeded(13)).state
    state = drawOne(state, seeded(13)).state
    expect(revealedCard(state)).not.toBeNull()

    const mixed = reshuffle(state, seeded(14))
    expect(remainingCount(mixed)).toBe(20)
    expect(discardCount(mixed)).toBe(0)
    expect(revealedCard(mixed)).toBeNull()
  })
})

describe('needsShuffle', () => {
  it('아무것도 공개하지 않았으면 거짓이다', () => {
    expect(needsShuffle(freshDeck())).toBe(false)
  })

  it('마지막 공개 카드에 표시가 있으면 참이다', () => {
    // ×2 한 장뿐인 덱 — 뽑으면 반드시 표시가 뜬다.
    const state = drawOne(createDeck(zeroRng, { x2: 1 }), zeroRng).state
    expect(needsShuffle(state)).toBe(true)
  })

  it('표시 없는 카드를 그 위에 덮으면 다시 거짓이 된다', () => {
    let state = createDeck(zeroRng, { x2: 1, p0: 1 })
    // 두 장을 다 뽑는다. 마지막에 공개된 것이 무엇이냐로 갈린다.
    const first = drawOne(state, zeroRng)
    state = first.state
    const second = drawOne(state, zeroRng)
    state = second.state

    expect(needsShuffle(state)).toBe(second.card?.shuffleAfter ?? false)
  })
})

describe('cardLabel / cardSpeech', () => {
  it('부호를 붙여 적는다', () => {
    expect(cardLabel({ kind: 'add', value: 1 })).toBe('+1')
    expect(cardLabel({ kind: 'add', value: 0 })).toBe('+0')
    expect(cardLabel({ kind: 'add', value: -2 })).toBe('−2')
    expect(cardLabel({ kind: 'multiply', value: 2 })).toBe('×2')
    expect(cardLabel({ kind: 'multiply', value: 0 })).toBe('×0')
  })

  it('읽어주는 쪽에는 우리말이 간다', () => {
    expect(cardSpeech({ effect: { kind: 'multiply', value: 0 }, shuffleAfter: true })).toBe(
      '빗나감, 섞기 표시',
    )
    expect(cardSpeech({ effect: { kind: 'add', value: 0 }, shuffleAfter: false })).toBe('보정 없음')
    expect(cardSpeech({ effect: { kind: 'add', value: -1 }, shuffleAfter: false })).toBe('1 뺌')
  })
})

describe('computeDeckLayout', () => {
  it('크기가 없으면 0을 낸다', () => {
    const layout = computeDeckLayout({ width: 0, height: 0 })
    expect(layout.cardWidth).toBe(0)
    expect(layout.showDiscard).toBe(false)
  })

  it('넉넉하면 버린 덱을 낸다', () => {
    const layout = computeDeckLayout({ width: 340, height: 200 })
    expect(layout.showDiscard).toBe(true)
    expect(layout.arrangement).not.toBe('single')
  })

  it('좁으면 버린 덱을 접는다', () => {
    const layout = computeDeckLayout({ width: 70, height: 90 })
    expect(layout.showDiscard).toBe(false)
    expect(layout.arrangement).toBe('single')
    // 접었어도 카드는 그려야 한다.
    expect(layout.cardWidth).toBeGreaterThan(0)
  })

  it('넓고 낮으면 좌우로, 좁고 높으면 위아래로 가른다', () => {
    expect(computeDeckLayout({ width: 400, height: 160 }).arrangement).toBe('side-by-side')
    expect(computeDeckLayout({ width: 160, height: 400 }).arrangement).toBe('stacked')
  })

  it('글자 크기가 카드보다 먼저 사라지지 않는다', () => {
    const layout = computeDeckLayout({ width: 60, height: 80 })
    expect(layout.faceSize).toBeGreaterThan(0)
    expect(layout.countSize).toBeGreaterThan(0)
  })

  it('섞기 표식이 작아도 사라지지는 않는다', () => {
    expect(computeDeckLayout({ width: 60, height: 80 }).markSize).toBeGreaterThan(0)
  })
})

describe('설정', () => {
  it('망가진 값에서도 표준 덱을 낸다', () => {
    expect(sanitizeAttackDeckSettings(undefined)).toEqual(defaultAttackDeckSettings())
    expect(sanitizeAttackDeckSettings(null)).toEqual(defaultAttackDeckSettings())
    expect(sanitizeAttackDeckSettings('덱')).toEqual(defaultAttackDeckSettings())
    expect(sanitizeAttackDeckSettings({ composition: 3 })).toEqual(defaultAttackDeckSettings())
  })

  it('모르는 종류는 버린다', () => {
    const result = sanitizeAttackDeckSettings({ composition: { p0: 2, 없는것: 4 } })
    expect(result.composition).toEqual({ p0: 2 })
  })

  it('장수를 울타리 안으로 들인다', () => {
    const result = sanitizeAttackDeckSettings({ composition: { p0: 999, p1: -4, p2: 1.7 } })
    expect(result.composition.p0).toBe(MAX_PER_KIND)
    expect(result.composition.p1).toBe(0)
    expect(result.composition.p2).toBe(1)
  })

  it('한 장도 없는 덱은 표준으로 되돌린다', () => {
    expect(sanitizeAttackDeckSettings({ composition: { p0: 0 } })).toEqual(
      defaultAttackDeckSettings(),
    )
  })

  it('표준인지 알아본다', () => {
    expect(isStandardComposition(STANDARD_COMPOSITION)).toBe(true)
    expect(isStandardComposition({ ...STANDARD_COMPOSITION, m1: 3 })).toBe(false)
  })
})

describe('퍽 연동', () => {
  it('퍽이 시키는 대로 장수를 고친다', () => {
    const next = applyPerkChanges(STANDARD_COMPOSITION, [
      { kindId: 'm1', delta: -2 },
      { kindId: 'p1', delta: 1 },
    ])
    expect(next.m1).toBe(3)
    expect(next.p1).toBe(6)
    // 건드리지 않은 것은 그대로다.
    expect(next.p0).toBe(6)
  })

  it('0 밑으로 내려가지 않는다', () => {
    const next = applyPerkChanges(STANDARD_COMPOSITION, [{ kindId: 'm2', delta: -5 }])
    expect(next.m2).toBe(0)
  })

  it('모르는 종류는 건너뛴다', () => {
    const next = applyPerkChanges(STANDARD_COMPOSITION, [{ kindId: '없는것', delta: 3 }])
    expect(compositionSize(next)).toBe(20)
  })

  it('퍽을 못 읽으면 설정값을 쓴다 — 덱이 비지 않는다', () => {
    const settings = { p0: 3 }
    expect(resolveComposition(settings, null)).toBe(settings)
  })

  it('퍽을 읽으면 그것이 이긴다', () => {
    const settings = { p0: 3 }
    const resolved = resolveComposition(settings, [{ kindId: 'p1', delta: 1 }])
    // 설정이 아니라 표준 덱에 퍽을 얹은 결과다.
    expect(resolved.p1).toBe(6)
    expect(resolved.p0).toBe(6)
  })
})
