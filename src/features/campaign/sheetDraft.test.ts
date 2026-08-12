import { describe, expect, it } from 'vitest'
import { MAX_CHECKMARKS } from './character'
import { draftOf, isDirty, sheetDiff } from './sheetDraft'
import type { Character } from './types'

/**
 * 시트 초안.
 *
 * **저장 단추가 살아나는 조건이 곧 `sheetDiff`가 낸 것이 비었는지다.** 둘을 따로
 * 세면 언젠가 어긋나고, 어긋나면 **고쳤는데 저장이 안 눌리는** 꼴이 난다 —
 * 사람이 그 자리에서 할 수 있는 일이 없어진다.
 */

function fixture(over: Partial<Character> = {}): Character {
  return {
    id: 'c1',
    campaignId: 'g1',
    ownerId: 'u1',
    ownerName: '형님',
    name: '무명',
    classIcon: 3,
    classId: null,
    level: 2,
    xp: 60,
    gold: 120,
    checkmarks: 4,
    perks: [1, 3],
    items: ['가죽 장화'],
    notes: '',
    retired: false,
    createdAt: 0,
    updatedAt: 0,
    version: 1,
    ...over,
  }
}

describe('초안 뜨기', () => {
  it('그대로 뜬다', () => {
    const c = fixture()
    const d = draftOf(c)
    expect(d.name).toBe(c.name)
    expect(d.perks).toEqual(c.perks)
    expect(d.items).toEqual(c.items)
  })

  /** 원본을 건드리면 저장하기 전에 이미 값이 바뀐 것이 된다. */
  it('배열은 사본으로 뜬다', () => {
    const c = fixture()
    const d = draftOf(c)
    d.perks.push(9)
    d.items.push('가짜')
    expect(c.perks).toEqual([1, 3])
    expect(c.items).toEqual(['가죽 장화'])
  })

  it('막 뜬 초안은 고친 것이 없다', () => {
    const c = fixture()
    expect(sheetDiff(c, draftOf(c))).toEqual({})
    expect(isDirty(c, draftOf(c))).toBe(false)
  })
})

describe('바뀐 칸만 낸다', () => {
  it('건드린 칸만 온다', () => {
    const c = fixture()
    const d = { ...draftOf(c), gold: 340 }
    expect(sheetDiff(c, d)).toEqual({ gold: 340 })
  })

  it('여러 칸을 한 번에 낸다 — 정산이 그렇다', () => {
    const c = fixture()
    const d = { ...draftOf(c), gold: 200, xp: 95, checkmarks: 6 }
    expect(sheetDiff(c, d)).toEqual({ gold: 200, xp: 95, checkmarks: 6 })
  })

  it('배열은 알맹이로 견준다 — 사본이라고 바뀐 것이 아니다', () => {
    const c = fixture()
    expect(sheetDiff(c, { ...draftOf(c), perks: [1, 3] })).toEqual({})
    expect(sheetDiff(c, { ...draftOf(c), items: ['가죽 장화'] })).toEqual({})
  })

  it('퍽이 바뀌면 낸다', () => {
    const c = fixture()
    expect(sheetDiff(c, { ...draftOf(c), perks: [1, 3, 5] })).toEqual({ perks: [1, 3, 5] })
  })

  it('퍽은 차례를 세워 낸다 — 켠 차례가 달라도 같은 것이다', () => {
    const c = fixture()
    expect(sheetDiff(c, { ...draftOf(c), perks: [3, 1] })).toEqual({})
  })

  it('아이템이 바뀌면 낸다', () => {
    const c = fixture()
    expect(sheetDiff(c, { ...draftOf(c), items: ['가죽 장화', '망토'] })).toEqual({
      items: ['가죽 장화', '망토'],
    })
  })
})

describe('울타리와 다듬기', () => {
  /** 눈에 안 보이는 차이로 저장 단추가 살아나면 안 된다. */
  it('이름의 앞뒤 공백은 턴다', () => {
    const c = fixture({ name: '무명' })
    expect(sheetDiff(c, { ...draftOf(c), name: '  무명  ' })).toEqual({})
    expect(sheetDiff(c, { ...draftOf(c), name: ' 홍명보 ' })).toEqual({ name: '홍명보' })
  })

  it('빈 아이템 줄은 걷는다', () => {
    const c = fixture({ items: [] })
    expect(sheetDiff(c, { ...draftOf(c), items: ['  ', ''] })).toEqual({})
  })

  it('숫자는 울타리 안으로 들인다 — 화면이 아무거나 칠 수 있다', () => {
    const c = fixture()
    expect(sheetDiff(c, { ...draftOf(c), level: 99 }).level).toBe(9)
    expect(sheetDiff(c, { ...draftOf(c), xp: -5 }).xp).toBe(0)
    expect(sheetDiff(c, { ...draftOf(c), checkmarks: 99 }).checkmarks).toBe(MAX_CHECKMARKS)
  })

  /**
   * **울타리에 걸려 제자리로 돌아온 값은 바뀐 것이 아니다.** 그러지 않으면 이미
   * 최대인 칸을 한 번 더 눌렀을 때 저장 단추가 살아난다.
   */
  it('울타리에 걸려 원래 값이 되면 안 낸다', () => {
    const c = fixture({ level: 9 })
    expect(sheetDiff(c, { ...draftOf(c), level: 12 })).toEqual({})
  })
})

describe('고친 것이 있는가', () => {
  it('한 칸이라도 바뀌면 참', () => {
    const c = fixture()
    expect(isDirty(c, { ...draftOf(c), notes: '한 줄' })).toBe(true)
    expect(isDirty(c, { ...draftOf(c), retired: true })).toBe(true)
    expect(isDirty(c, { ...draftOf(c), classId: 'x' })).toBe(true)
  })

  it('되돌려 놓으면 거짓 — 고쳤다 물린 것은 안 고친 것이다', () => {
    const c = fixture()
    const d = { ...draftOf(c), gold: 999 }
    expect(isDirty(c, d)).toBe(true)
    expect(isDirty(c, { ...d, gold: c.gold })).toBe(false)
  })
})
