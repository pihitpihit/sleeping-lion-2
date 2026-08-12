import { describe, expect, it } from 'vitest'
import { backHref, characterIdFromHash, readJournalRoute } from './journalRoute'

/**
 * 일지의 두 갈래.
 *
 * | 주소 | 보이는 것 |
 * |---|---|
 * | `#/journal` | 내 캐릭터 + 캐릭터·파티 세우기 |
 * | `#/journal/<파티>` | 파티 시트 · 무리 · 동행 |
 *
 * **캐릭터는 제 주소를 갖는다**(`#/character/<id>`) — 파티에 안 든 캐릭터를 파티
 * 열쇠로 열 수 없기 때문이다(2026-08-12).
 *
 * 주소를 잘못 읽으면 **엉뚱한 화면이 뜨는 것이 아니라 빈 화면이 뜬다** — 목록으로
 * 읽히면 기록지가 안 열리고, 기록지로 읽히면 캐릭터가 안 열린다. 순수 함수로 떼어
 * 두었으니 여기서 못박는다.
 */

describe('주소 읽기', () => {
  it('목록', () => {
    expect(readJournalRoute('#/journal')).toEqual({ partyId: '' })
    expect(readJournalRoute('#/journal/')).toEqual({ partyId: '' })
  })

  it('기록지', () => {
    expect(readJournalRoute('#/journal/abc')).toEqual({ partyId: 'abc' })
  })

  it('일지가 아닌 주소는 목록으로 읽지 않는다', () => {
    expect(readJournalRoute('#/satchel')).toEqual({ partyId: '' })
    expect(readJournalRoute('#/character/abc')).toEqual({ partyId: '' })
    expect(readJournalRoute('#/')).toEqual({ partyId: '' })
    expect(readJournalRoute('')).toEqual({ partyId: '' })
  })
})

describe('캐릭터 주소', () => {
  it('캐릭터 id를 읽는다', () => {
    expect(characterIdFromHash('#/character/abc')).toBe('abc')
  })

  it('캐릭터 주소가 아니면 빈 문자열', () => {
    expect(characterIdFromHash('#/journal/abc')).toBe('')
    expect(characterIdFromHash('#/character')).toBe('')
    expect(characterIdFromHash('')).toBe('')
  })
})

describe('뒤로 가는 곳', () => {
  /**
   * **한 칸씩 올라간다.** 어디서 눌러도 목록으로 튀면 캐릭터를 열 때마다 두 번씩
   * 들어가야 한다.
   */
  it('기록지 → 일지', () => {
    expect(backHref({ partyId: 'a' })).toBe('#/journal')
  })

  it('일지 → 여관', () => {
    expect(backHref({ partyId: '' })).toBe('#/')
  })
})
