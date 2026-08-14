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
    deletedAt: null,
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
    expect(d.notes).toBe(c.notes)
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
    // 경험치가 눈금을 넘었으므로 레벨이 딸려 나간다.
    expect(sheetDiff(c, d)).toEqual({ gold: 200, xp: 95, checkmarks: 6, level: 3 })
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
  it('빈 아이템 줄은 걷는다', () => {
    const c = fixture({ items: [] })
    expect(sheetDiff(c, { ...draftOf(c), items: ['  ', ''] })).toEqual({})
  })

  it('숫자는 울타리 안으로 들인다 — 화면이 아무거나 칠 수 있다', () => {
    const c = fixture()
    expect(sheetDiff(c, { ...draftOf(c), xp: -5 }).xp).toBe(0)
    expect(sheetDiff(c, { ...draftOf(c), checkmarks: 99 }).checkmarks).toBe(MAX_CHECKMARKS)
  })

  /**
   * **울타리에 걸려 제자리로 돌아온 값은 바뀐 것이 아니다.** 그러지 않으면 이미
   * 최대인 칸을 한 번 더 눌렀을 때 저장 단추가 살아난다.
   */
  it('울타리에 걸려 원래 값이 되면 안 낸다', () => {
    const c = fixture({ checkmarks: MAX_CHECKMARKS })
    expect(sheetDiff(c, { ...draftOf(c), checkmarks: 99 })).toEqual({})
  })
})

/**
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ **레벨은 고르는 값이 아니라 경험치에서 나오는 값이다.**                    │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * 2026-08-12에 구현 결정 43을 뒤집었다. 초안에는 없고, 경험치를 고치면 딸려
 * 나간다 — **표에도 적어 두어야** 목록 화면이 시트와 다른 수를 말하지 않는다.
 */
describe('레벨은 경험치가 정한다', () => {
  it('초안에 레벨 칸이 없다', () => {
    expect('level' in draftOf(fixture())).toBe(false)
  })

  it('경험치를 올리면 레벨이 딸려 나간다', () => {
    const c = fixture({ xp: 60, level: 2 })
    expect(sheetDiff(c, { ...draftOf(c), xp: 100 })).toEqual({ xp: 100, level: 3 })
  })

  it('경험치를 내리면 레벨도 내려간다', () => {
    const c = fixture({ xp: 100, level: 3 })
    expect(sheetDiff(c, { ...draftOf(c), xp: 10 })).toEqual({ xp: 10, level: 1 })
  })

  it('눈금을 안 넘으면 레벨은 안 나간다', () => {
    const c = fixture({ xp: 60, level: 2 })
    expect(sheetDiff(c, { ...draftOf(c), xp: 70 })).toEqual({ xp: 70 })
  })

  /** 표에 옛 값이 남아 있으면 아무것도 안 고쳐도 바로잡아 보낸다. */
  it('표의 레벨이 경험치와 어긋나 있으면 바로잡는다', () => {
    const c = fixture({ xp: 500, level: 1 })
    expect(sheetDiff(c, draftOf(c))).toEqual({ level: 9 })
  })
})

/**
 * **이름과 클래스는 초안에 없다.** 생성할 때 정하고 그 뒤로는 못 바꾼다 —
 * 캐릭터가 곧 클래스이고, 파티원은 이름으로 서로를 부른다(판 도중에 바뀌면 옆
 * 사람이 보던 것이 딴 사람이 된다). 막는 것은 서버이며(`0014`·`0017`) 초안에서
 * 빼 둔 것은 **보낼 수조차 없게** 하는 것이다.
 */
describe('이름과 클래스는 못 바꾼다', () => {
  it('초안에 이름·클래스 칸이 없다', () => {
    const d = draftOf(fixture())
    expect('name' in d).toBe(false)
    expect('classId' in d).toBe(false)
    expect('classIcon' in d).toBe(false)
  })

  it('무엇을 고쳐도 클래스는 안 나간다', () => {
    const c = fixture()
    const edits = sheetDiff(c, { ...draftOf(c), gold: 999, retired: true })
    expect('classId' in edits).toBe(false)
    expect('classIcon' in edits).toBe(false)
    expect('name' in edits).toBe(false)
  })
})

describe('고친 것이 있는가', () => {
  it('한 칸이라도 바뀌면 참', () => {
    const c = fixture()
    expect(isDirty(c, { ...draftOf(c), notes: '한 줄' })).toBe(true)
    expect(isDirty(c, { ...draftOf(c), retired: true })).toBe(true)
  })

  it('되돌려 놓으면 거짓 — 고쳤다 물린 것은 안 고친 것이다', () => {
    const c = fixture()
    const d = { ...draftOf(c), gold: 999 }
    expect(isDirty(c, d)).toBe(true)
    expect(isDirty(c, { ...d, gold: c.gold })).toBe(false)
  })
})
