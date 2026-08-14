import { describe, expect, it } from 'vitest'
import { LOG_REASONS, changesOf, describeChange, reasonText, whenText } from './characterLog'
import type { Character } from './types'

function fixture(over: Partial<Character> = {}): Character {
  return {
    id: 'c1',
    campaignId: 'g1',
    ownerId: 'u1',
    ownerName: '형님',
    name: '이름',
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

describe('무엇이 바뀌었는가', () => {
  it('바뀐 칸의 전후를 짝지어 담는다', () => {
    expect(changesOf(fixture(), { gold: 160 })).toEqual([{ field: 'gold', from: 120, to: 160 }])
  })

  /** 레벨은 경험치에서 나오는 값이라 따로 안 적는다 — 두 줄이면 한 번이 두 번으로 읽힌다. */
  it('레벨은 담지 않는다', () => {
    const got = changesOf(fixture(), { xp: 100, level: 3 })
    expect(got.map((c) => c.field)).toEqual(['xp'])
  })

  it('안 건드린 칸은 담지 않는다', () => {
    expect(changesOf(fixture(), {})).toEqual([])
  })
})

describe('우리말로 옮기기', () => {
  /** 기록을 보는 까닭이 "얼마를 올렸나"이므로 차이가 곧 알맹이다. */
  it('수는 얼마나 움직였는지 함께 적는다', () => {
    expect(describeChange({ field: 'gold', from: 120, to: 160 })).toBe('골드 120 → 160 (+40)')
    expect(describeChange({ field: 'xp', from: 60, to: 45 })).toBe('경험 60 → 45 (−15)')
  })

  /** 통째로 늘어놓으면 무엇이 달라졌는지 되레 안 보인다. */
  it('특혜는 들고 난 번호만 적는다', () => {
    expect(describeChange({ field: 'perks', from: [1, 3], to: [1, 3, 5] })).toBe('특혜 5번 켬')
    expect(describeChange({ field: 'perks', from: [1, 3], to: [3] })).toBe('특혜 1번 끔')
    expect(describeChange({ field: 'perks', from: [1], to: [2] })).toBe('특혜 2번 켬, 1번 끔')
  })

  it('아이템도 들고 난 것만 적는다', () => {
    expect(describeChange({ field: 'items', from: ['장화'], to: ['장화', '망토'] })).toContain(
      '망토 더함',
    )
    expect(describeChange({ field: 'items', from: ['장화'], to: [] })).toContain('장화 뺌')
  })

  it('은퇴와 메모는 말로 적는다', () => {
    expect(describeChange({ field: 'retired', from: false, to: true })).toBe('은퇴시켰다')
    expect(describeChange({ field: 'retired', from: true, to: false })).toBe('다시 나섰다')
    expect(describeChange({ field: 'notes', from: '', to: '적어둔다' })).toBe('메모를 고쳤다')
    expect(describeChange({ field: 'notes', from: '있었다', to: '  ' })).toBe('메모를 비웠다')
  })
})

/**
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ **개발자용이 아니다 — 알고 싶은 것은 "얼마나 지났나"다.**                  │
 * └──────────────────────────────────────────────────────────────────────────┘
 */
describe('언제 고쳤는가', () => {
  const now = new Date(2026, 7, 13, 22, 32).getTime() // 2026-08-13 오후 10시 32분

  it('방금과 몇 분 전', () => {
    expect(whenText(now - 20_000, now)).toBe('방금')
    expect(whenText(now - 7 * 60_000, now)).toBe('7분 전')
    expect(whenText(now - 3 * 3_600_000, now)).toBe('3시간 전')
  })

  it('오늘 것은 시각만', () => {
    const morning = new Date(2026, 7, 13, 9, 5).getTime()
    expect(whenText(morning, now)).toBe('오늘 오전 9시 05분')
  })

  it('어제는 어제라고 적는다', () => {
    const y = new Date(2026, 7, 12, 20, 0).getTime()
    expect(whenText(y, now)).toBe('어제 오후 8시 00분')
  })

  it('그보다 오래되면 날짜까지', () => {
    const old = new Date(2026, 6, 2, 14, 30).getTime()
    expect(whenText(old, now)).toBe('7월 2일 오후 2시 30분')
  })

  /** 캠페인이 해를 넘길 수 있다. */
  it('해가 바뀌면 연도까지', () => {
    const old = new Date(2025, 11, 24, 19, 0).getTime()
    expect(whenText(old, now)).toBe('2025년 12월 24일 오후 7시 00분')
  })

  it('자정은 열두 시로 적는다 — 0시라고 하지 않는다', () => {
    const mid = new Date(2026, 7, 11, 0, 10).getTime()
    expect(whenText(mid, now)).toContain('오전 12시 10분')
  })
})

/**
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ **왜 바뀌었는지가 갈려야 한다.**                                          │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * 「골드 120 → 160」이 전투에서 노획한 것인지 손으로 맞춘 것인지 나중에 알 수
 * 없다 — 정산이 맞았는지 되짚는 것이 기록을 두는 까닭이다.
 */
describe('고친 까닭', () => {
  it('갈래마다 저마다 다른 말을 한다', () => {
    const said = LOG_REASONS.map(reasonText)
    expect(new Set(said).size).toBe(LOG_REASONS.length)
    expect(said.every((s) => s.trim() !== '')).toBe(true)
  })

  /**
   * 처음 한 줄이 없으면 기록이 중간부터 시작해 **맨 아래 줄이 첫 정산인 것처럼
   * 읽힌다.** 이름은 안 적는다 — 조사가 받침에 따라 갈린다.
   */
  it('생성은 한 줄로 적는다', () => {
    expect(describeChange({ field: 'created', from: null, to: true })).toBe('캐릭터를 만들었다')
  })

  /** 서버 값을 믿지 않는다 — 모르는 것이 와도 화면이 서야 한다. */
  it('모르는 까닭은 기타로 읽는다', () => {
    expect(reasonText('무엇인가')).toBe(reasonText('other'))
  })
})
