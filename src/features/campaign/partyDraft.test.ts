import { describe, expect, it } from 'vitest'
import { draftOf, isDirty, partyDiff } from './partyDraft'
import { MAX_REPUTATION, MIN_REPUTATION } from './reputation'
import type { Campaign } from './types'

/**
 * 파티 기록지의 초안.
 *
 * **저장 단추가 살아나는 조건이 곧 `partyDiff`가 낸 것이 비었는지다.** 둘을 따로
 * 세면 언젠가 어긋나고, 어긋나면 **고쳤는데 저장이 안 눌리는** 꼴이 난다.
 */

function fixture(over: Partial<Campaign> = {}): Campaign {
  return {
    id: 'g1',
    partyId: 'p1',
    name: '잠자는 사자',
    notes: '',
    achievements: ['첫 밤'],
    unlocks: {},
    treasures: [],
    oak: 0,
    prosperity: 1,
    globalAchievements: {},
    reputation: 2,
    createdAt: 0,
    updatedAt: 0,
    version: 1,
    ...over,
  }
}

describe('초안 뜨기', () => {
  it('막 뜬 초안은 고친 것이 없다', () => {
    const c = fixture()
    expect(partyDiff(c, draftOf(c))).toEqual({})
    expect(isDirty(c, draftOf(c))).toBe(false)
  })

  /** 원본을 건드리면 저장하기 전에 이미 값이 바뀐 것이 된다. */
  it('업적은 사본으로 뜬다', () => {
    const c = fixture()
    draftOf(c).achievements.push('가짜')
    expect(c.achievements).toEqual(['첫 밤'])
  })
})

describe('바뀐 칸만 낸다', () => {
  it('건드린 칸만 온다', () => {
    const c = fixture()
    expect(partyDiff(c, { ...draftOf(c), notes: '숲에서 만나기로' })).toEqual({
      notes: '숲에서 만나기로',
    })
  })

  /**
   * **파티는 여럿이 함께 쓴다.** 통째로 덮으면 그 사이 옆 사람이 고친 것을
   * 되돌린다 — 캐릭터보다 이쪽이 더 잦다.
   */
  it('여러 칸을 한 번에 낸다', () => {
    const c = fixture()
    const d = { ...draftOf(c), reputation: 5, notes: '한 줄' }
    expect(partyDiff(c, d)).toEqual({ reputation: 5, notes: '한 줄' })
  })

  it('업적은 알맹이로 견준다 — 사본이라고 바뀐 것이 아니다', () => {
    const c = fixture()
    expect(partyDiff(c, { ...draftOf(c), achievements: ['첫 밤'] })).toEqual({})
  })

  it('업적이 바뀌면 낸다', () => {
    const c = fixture()
    expect(partyDiff(c, { ...draftOf(c), achievements: ['첫 밤', '두 밤'] })).toEqual({
      achievements: ['첫 밤', '두 밤'],
    })
  })
})

describe('울타리와 다듬기', () => {
  /** 눈에 안 보이는 차이로 저장 단추가 살아나면 안 된다. */
  it('이름의 앞뒤 공백은 턴다', () => {
    const c = fixture()
    expect(partyDiff(c, { ...draftOf(c), name: '  잠자는 사자  ' })).toEqual({})
  })

  it('빈 업적 줄은 걷는다', () => {
    const c = fixture({ achievements: [] })
    expect(partyDiff(c, { ...draftOf(c), achievements: ['  ', ''] })).toEqual({})
  })

  it('평판을 눈금 안으로 들인다 — 화면이 아무거나 칠 수 있다', () => {
    const c = fixture()
    expect(partyDiff(c, { ...draftOf(c), reputation: 99 }).reputation).toBe(MAX_REPUTATION)
    expect(partyDiff(c, { ...draftOf(c), reputation: -99 }).reputation).toBe(MIN_REPUTATION)
  })

  /**
   * **울타리에 걸려 제자리로 돌아온 값은 바뀐 것이 아니다.** 그러지 않으면 이미
   * 최대인 칸을 한 번 더 눌렀을 때 저장 단추가 살아난다.
   */
  it('울타리에 걸려 원래 값이 되면 안 낸다', () => {
    const c = fixture({ reputation: MAX_REPUTATION })
    expect(partyDiff(c, { ...draftOf(c), reputation: 99 })).toEqual({})
  })
})

describe('고친 것이 있는가', () => {
  it('한 칸이라도 바뀌면 참', () => {
    const c = fixture()
    expect(isDirty(c, { ...draftOf(c), notes: '한 줄' })).toBe(true)
  })

  it('되돌려 놓으면 거짓 — 고쳤다 물린 것은 안 고친 것이다', () => {
    const c = fixture()
    const d = { ...draftOf(c), reputation: 9 }
    expect(isDirty(c, d)).toBe(true)
    expect(isDirty(c, { ...d, reputation: c.reputation })).toBe(false)
  })
})

describe('찾은 보물', () => {
  /*
    번호의 목록이라 **늘 세워 놓고 겹친 것을 걷는다**(`partyDiff`). 안 그러면
    같은 것을 껐다 켰을 뿐인데 저장 단추가 살아난다 — 눈에 안 보이는 차이로
    살아나면 안 된다(구현 결정 168).
  */
  const base = fixture({ treasures: [3, 9] })

  it('켜면 고친 것이 된다', () => {
    const draft = { ...draftOf(base), treasures: [3, 9, 41] }
    expect(partyDiff(base, draft).treasures).toEqual([3, 9, 41])
    expect(isDirty(base, draft)).toBe(true)
  })

  it('끄면 고친 것이 된다', () => {
    const draft = { ...draftOf(base), treasures: [3] }
    expect(partyDiff(base, draft).treasures).toEqual([3])
  })

  it('차례만 다르거나 겹친 것은 고친 것이 아니다', () => {
    expect(isDirty(base, { ...draftOf(base), treasures: [9, 3, 9] })).toBe(false)
  })

  it('0 이하는 걷는다 — 타일 번호는 1부터다', () => {
    const draft = { ...draftOf(base), treasures: [3, 9, 0, -1] }
    expect(isDirty(base, draft)).toBe(false)
  })
})
