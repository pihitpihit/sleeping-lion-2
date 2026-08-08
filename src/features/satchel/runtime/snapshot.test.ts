import { beforeEach, describe, expect, it } from 'vitest'
import { createDeck, STANDARD_COMPOSITION } from '../widgets/deck/deck'
import { useAttackDeckStore } from '../widgets/deck/deckStore'
import { useElementStore } from '../widgets/elements/elementStore'
import { useHpXpStore } from '../widgets/hpxp/hpxpStore'
import { FIRST_ROUND, MAX_ROUND, useRoundStore } from '../widgets/round/roundStore'
import { readKept, writeKept } from './keep'
import {
  captureRuntime,
  emptyRuntime,
  isEmptyRuntime,
  restoreRuntime,
  RUNTIME_VERSION,
  sanitizeRuntime,
} from './snapshot'

/**
 * 판을 뜨고 되돌려 놓기.
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ **여기가 틀리면 새로고침 한 번에 판이 어긋난다.**                         │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * 특히 **복원이 판을 굴리지 않아야** 한다. 라운드를 앉히는 것과 라운드를 넘기는
 * 것은 다른 일이다 — 넘기면 원소가 하강하고 덱이 섞인다(구현 결정 34).
 */

/** 씨앗을 심은 난수기. 덱이 판마다 달라지면 견줄 수가 없다. */
function seeded(seed: number): () => number {
  let state = seed
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296
    return state / 4294967296
  }
}

function clearStores() {
  useElementStore.getState().hydrate({})
  useRoundStore.getState().hydrate(FIRST_ROUND)
  useHpXpStore.getState().hydrate({})
  useAttackDeckStore.getState().hydrate({})
}

beforeEach(clearStores)

describe('뜨고 되돌리기', () => {
  it('빈 판은 비었다고 안다', () => {
    expect(isEmptyRuntime(captureRuntime())).toBe(true)
    expect(isEmptyRuntime(emptyRuntime())).toBe(true)
  })

  it('무엇 하나라도 건드리면 비지 않았다', () => {
    useElementStore.getState().setState('fire', 'strong')
    expect(isEmptyRuntime(captureRuntime())).toBe(false)

    clearStores()
    useRoundStore.getState().advance()
    expect(isEmptyRuntime(captureRuntime())).toBe(false)

    clearStores()
    useHpXpStore.getState().adjust('w1', 'hp', 5)
    expect(isEmptyRuntime(captureRuntime())).toBe(false)
  })

  it('뜬 판을 그대로 되돌려 놓는다', () => {
    useElementStore.getState().setState('fire', 'strong')
    useElementStore.getState().setState('ice', 'waning')
    useHpXpStore.getState().adjust('w1', 'hp', 8)
    useHpXpStore.getState().adjust('w1', 'xp', 3)
    useAttackDeckStore.getState().hydrate({ d1: createDeck(seeded(7), STANDARD_COMPOSITION) })
    useRoundStore.getState().hydrate(5)

    const snapshot = captureRuntime()
    clearStores()
    expect(isEmptyRuntime(captureRuntime())).toBe(true)

    restoreRuntime(snapshot)

    expect(useElementStore.getState().stateOf('fire')).toBe('strong')
    expect(useElementStore.getState().stateOf('ice')).toBe('waning')
    expect(useHpXpStore.getState().valuesOf('w1')).toEqual({ hp: 8, xp: 3 })
    expect(useRoundStore.getState().round).toBe(5)
    expect(useAttackDeckStore.getState().stateOf('d1').draw).toHaveLength(20)
  })

  it('복원이 판을 굴리지 않는다 — 라운드를 앉혀도 원소가 하강하지 않는다', () => {
    /**
     * `advance`로 5라운드를 만들려 하면 원소가 네 번 하강해 다 꺼진다.
     * 복원은 옮겨 놓는 것이지 굴리는 것이 아니다.
     */
    useElementStore.getState().setState('fire', 'strong')
    const before = captureRuntime()

    clearStores()
    restoreRuntime({ ...before, round: 5 })

    expect(useRoundStore.getState().round).toBe(5)
    expect(useElementStore.getState().stateOf('fire')).toBe('strong')
  })
})

describe('거르기', () => {
  it('모르는 판은 통째로 버린다 — 어긋난 판보다 빈 판이 낫다', () => {
    const good = { ...emptyRuntime(), round: 7, elements: { fire: 'strong' } }
    expect(sanitizeRuntime({ ...good, v: 999 })).toEqual(emptyRuntime())
    expect(sanitizeRuntime({ ...good, v: undefined })).toEqual(emptyRuntime())
  })

  it('사람이 아닌 것을 넣어도 던지지 않는다', () => {
    expect(sanitizeRuntime(null)).toEqual(emptyRuntime())
    expect(sanitizeRuntime('그냥 글자')).toEqual(emptyRuntime())
    expect(sanitizeRuntime(42)).toEqual(emptyRuntime())
    expect(sanitizeRuntime({ v: RUNTIME_VERSION })).toEqual(emptyRuntime())
  })

  it('꺼진 원소는 담지 않는다 — 없는 것을 꺼짐으로 읽는다', () => {
    const out = sanitizeRuntime({
      ...emptyRuntime(),
      elements: { fire: 'strong', ice: 'inert', air: '타오름' },
    })
    expect(out.elements).toEqual({ fire: 'strong' })
  })

  it('라운드를 눈금 안에 가둔다', () => {
    expect(sanitizeRuntime({ ...emptyRuntime(), round: 0 }).round).toBe(FIRST_ROUND)
    expect(sanitizeRuntime({ ...emptyRuntime(), round: -5 }).round).toBe(FIRST_ROUND)
    expect(sanitizeRuntime({ ...emptyRuntime(), round: 500 }).round).toBe(MAX_ROUND)
    expect(sanitizeRuntime({ ...emptyRuntime(), round: '5' }).round).toBe(FIRST_ROUND)
  })

  it('HP/XP를 눈금 안에 가둔다', () => {
    const out = sanitizeRuntime({
      ...emptyRuntime(),
      hpxp: { a: { hp: -3, xp: 500 }, b: { hp: 'x', xp: 4 } },
    })
    expect(out.hpxp).toEqual({ a: { hp: 0, xp: 99 }, b: { hp: 0, xp: 4 } })
  })

  it('카드의 효과는 저장된 것이 아니라 종류표에서 다시 읽는다', () => {
    /**
     * 저장물에 든 `effect`는 `kindId`에서 나온 사본이다. 사본이 표와 어긋나면
     * 화면에 뜬 그림과 실제로 셈하는 값이 달라진다 — 그림은 `kindId`로 고르고
     * 값은 `effect`로 셈하기 때문이다.
     */
    const out = sanitizeRuntime({
      ...emptyRuntime(),
      decks: {
        d1: {
          draw: [
            { id: 'c1', kindId: 'p1', effect: { kind: 'add', value: 99 }, shuffleAfter: true },
          ],
          discard: [],
        },
      },
    })
    expect(out.decks.d1.draw[0]).toEqual({
      id: 'c1',
      kindId: 'p1',
      effect: { kind: 'add', value: 1 },
      shuffleAfter: false,
    })
  })

  it('알 수 없는 카드 종류는 걸러낸다', () => {
    const out = sanitizeRuntime({
      ...emptyRuntime(),
      decks: {
        d1: {
          draw: [
            { id: 'c1', kindId: '없는것' },
            { id: 'c2', kindId: 'p1' },
          ],
          discard: [],
        },
      },
    })
    expect(out.decks.d1.draw).toHaveLength(1)
    expect(out.decks.d1.draw[0].kindId).toBe('p1')
  })

  it('한 장도 못 알아본 덱은 아예 앉히지 않는다 — 빈 덱은 막힌 상태다', () => {
    const out = sanitizeRuntime({
      ...emptyRuntime(),
      decks: { d1: { draw: [], discard: [] }, d2: '덱 아님' },
    })
    expect(out.decks).toEqual({})
  })
})

describe('그물 — sessionStorage', () => {
  /** `sessionStorage`와 같은 모양의 가짜. 테스트 환경에는 진짜가 없다. */
  function fakeStorage() {
    const map = new Map<string, string>()
    return {
      getItem: (k: string) => map.get(k) ?? null,
      setItem: (k: string, v: string) => void map.set(k, v),
      removeItem: (k: string) => void map.delete(k),
      size: () => map.size,
    }
  }

  it('남긴 것을 그대로 읽어 온다', () => {
    const storage = fakeStorage()
    const snapshot = { ...emptyRuntime(), round: 4, elements: { fire: 'waning' as const } }
    writeKept(snapshot, storage)
    expect(readKept(storage)).toEqual(snapshot)
  })

  it('빈 판은 남기지 않고, 남아 있던 것은 지운다', () => {
    const storage = fakeStorage()
    writeKept({ ...emptyRuntime(), round: 4 }, storage)
    expect(storage.size()).toBe(1)

    writeKept(emptyRuntime(), storage)
    expect(storage.size()).toBe(0)
    expect(readKept(storage)).toBeNull()
  })

  it('망가진 것이 들어 있어도 던지지 않는다', () => {
    const storage = fakeStorage()
    storage.setItem('sl2.satchel.runtime', '{ 이건 JSON이')
    expect(readKept(storage)).toBeNull()
  })

  it('저장소가 아예 없어도 던지지 않는다', () => {
    expect(readKept(null)).toBeNull()
    expect(() => writeKept(emptyRuntime(), null)).not.toThrow()
  })
})
