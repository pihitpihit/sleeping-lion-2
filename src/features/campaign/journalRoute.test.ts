import { describe, expect, it } from 'vitest'
import { backHref, readJournalRoute } from './journalRoute'

/**
 * 일지의 세 갈래.
 *
 * | 주소 | 보이는 것 |
 * |---|---|
 * | `#/journal` | 내 캐릭터 + 파티 목록 |
 * | `#/journal/<파티>` | 파티 시트 · 무리 · 동행 |
 * | `#/journal/<파티>/<캐릭터>` | 그 캐릭터 시트 한 장 |
 *
 * 주소를 잘못 읽으면 **엉뚱한 화면이 뜨는 것이 아니라 빈 화면이 뜬다** — 목록으로
 * 읽히면 기록지가 안 열리고, 기록지로 읽히면 캐릭터가 안 열린다. 순수 함수로 떼어
 * 두었으니 여기서 못박는다.
 */

describe('주소 읽기', () => {
  it('목록', () => {
    expect(readJournalRoute('#/journal')).toEqual({ partyId: '', characterId: '' })
    expect(readJournalRoute('#/journal/')).toEqual({ partyId: '', characterId: '' })
  })

  it('기록지', () => {
    expect(readJournalRoute('#/journal/abc')).toEqual({ partyId: 'abc', characterId: '' })
  })

  it('캐릭터', () => {
    expect(readJournalRoute('#/journal/abc/def')).toEqual({ partyId: 'abc', characterId: 'def' })
  })

  it('일지가 아닌 주소는 목록으로 읽지 않는다', () => {
    expect(readJournalRoute('#/satchel')).toEqual({ partyId: '', characterId: '' })
    expect(readJournalRoute('#/')).toEqual({ partyId: '', characterId: '' })
    expect(readJournalRoute('')).toEqual({ partyId: '', characterId: '' })
  })

  it('뒤에 더 붙어도 앞 두 마디만 본다', () => {
    expect(readJournalRoute('#/journal/a/b/c')).toEqual({ partyId: 'a', characterId: 'b' })
  })
})

describe('뒤로 가는 곳', () => {
  /**
   * **한 칸씩 올라간다.** 어디서 눌러도 목록으로 튀면 캐릭터를 열 때마다 두 번씩
   * 들어가야 한다.
   */
  it('캐릭터 → 그 파티 기록지', () => {
    expect(backHref({ partyId: 'a', characterId: 'b' })).toBe('#/journal/a')
  })

  it('기록지 → 목록', () => {
    expect(backHref({ partyId: 'a', characterId: '' })).toBe('#/journal')
  })

  it('목록 → 여관', () => {
    expect(backHref({ partyId: '', characterId: '' })).toBe('#/')
  })
})
