import { describe, expect, it } from 'vitest'
import { sanitizeCampaign } from './db'
import { MAX_REPUTATION, MIN_REPUTATION } from './reputation'

/*
  Dexie를 띄우지 않는다. 여기서 검증하는 것은 **레코드를 다듬는 순수 로직**이고,
  IndexedDB는 브라우저의 것이라 node에서 돌리려면 가짜를 끼워야 한다. 그 가짜가
  진짜와 다르게 굴면 시험이 거짓말을 한다 — 읽고 쓰는 것 자체는 화면에서 확인한다.

  **이 함수는 서버가 준 값도 거른다.** 거울에서 읽은 것만이 아니다 — 스키마를
  올린 뒤이거나 남이 다른 판으로 쓴 값일 수 있다.
*/

describe('sanitizeCampaign', () => {
  it('망가진 값에서도 쓸 수 있는 기록지를 낸다', () => {
    const c = sanitizeCampaign({ id: 'id-1' })
    expect(c.partyId).toBe('')
    expect(c.name).toBe('')
    expect(c.achievements).toEqual([])
    expect(c.reputation).toBe(0)
    expect(c.version).toBe(1)
  })

  it('타입이 어긋난 값은 기본값으로 떨어뜨린다', () => {
    const c = sanitizeCampaign({
      id: 'id-1',
      name: 42 as unknown as string,
      notes: null as unknown as string,
      reputation: '높음' as unknown as number,
      partyId: 7 as unknown as string,
    })
    expect(c.name).toBe('')
    expect(c.notes).toBe('')
    expect(c.reputation).toBe(0)
    expect(c.partyId).toBe('')
  })

  it('업적 목록에서 글자가 아닌 것을 걸러낸다', () => {
    const c = sanitizeCampaign({
      id: 'id-1',
      achievements: ['첫 걸음', 3, null, '두 번째'] as unknown as string[],
    })
    expect(c.achievements).toEqual(['첫 걸음', '두 번째'])
  })

  it('업적이 목록이 아니면 비운다', () => {
    const c = sanitizeCampaign({ id: 'id-1', achievements: '첫 걸음' as unknown as string[] })
    expect(c.achievements).toEqual([])
  })

  it('평판을 눈금 안으로 들인다 — 서버도 막지만 여기가 마지막 문이다', () => {
    expect(sanitizeCampaign({ id: 'a', reputation: 99 }).reputation).toBe(MAX_REPUTATION)
    expect(sanitizeCampaign({ id: 'a', reputation: -99 }).reputation).toBe(MIN_REPUTATION)
    expect(sanitizeCampaign({ id: 'a', reputation: 7.8 }).reputation).toBe(7)
  })

  it('멀쩡한 값은 그대로 지난다', () => {
    const source = {
      id: 'id-1',
      partyId: 'party-1',
      name: '잠자는 사자',
      location: '글룸헤이븐',
      notes: '문 앞에서 만나기로',
      achievements: ['첫 걸음'],
      reputation: 12,
      unlocks: { 'cond-1': 3 },
      globalAchievements: { '드레이크 처치': 2 },
      createdAt: 100,
      updatedAt: 200,
      version: 3,
    }
    expect(sanitizeCampaign(source)).toEqual(source)
  })
})

describe('개봉 조건 진행', () => {
  /** 서버 값을 믿지 않는다 — 모양이 아닌 것은 버린다. */
  it('수가 아닌 것과 0 이하는 걷는다', () => {
    const c = sanitizeCampaign({
      id: 'a',
      unlocks: { good: 2, zero: 0, minus: -1, text: '셋' } as unknown as Record<string, number>,
    })
    expect(c.unlocks).toEqual({ good: 2 })
  })

  it('없으면 빈 표다 — 없는 열쇠는 0으로 읽는다', () => {
    expect(sanitizeCampaign({ id: 'a' }).unlocks).toEqual({})
  })
})
