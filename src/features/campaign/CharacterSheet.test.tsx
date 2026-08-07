import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { CharacterSheet } from './CharacterSheet'
import type { Character } from './types'

/**
 * 캐릭터 시트가 실제로 그려지는지 본다.
 *
 * 브라우저를 띄우지 않고 **서버 렌더로 문자열까지 뽑는다.** jsdom을 들이지 않고도
 * 컴포넌트가 마운트 중에 터지지 않는다는 것과, 권한에 따라 칸이 잠기는지를 확인할
 * 수 있다. 눈으로 봐야 하는 것(색·간격)은 여기서 알 수 없고 화면에서 본다.
 *
 * **권한을 여기서 지키는 것이 아니다** — 막는 것은 RLS다(`0005_characters.sql`).
 * 이 확인은 남의 시트에서 헛손질하지 않게 하는 UX 쪽이다.
 */

function fixture(over: Partial<Character> = {}): Character {
  return {
    id: 'c1',
    campaignId: 'g1',
    ownerId: 'u1',
    ownerName: '형님',
    name: '이름',
    classIcon: 3,
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

function render(character: Character, mine: boolean, offline = false) {
  return renderToStaticMarkup(
    <CharacterSheet
      character={character}
      mine={mine}
      offline={offline}
      onEdit={() => {}}
      onRemove={() => {}}
    />,
  )
}

describe('캐릭터 시트', () => {
  it('내 것이면 칸이 열려 있다', () => {
    const html = render(fixture(), true)
    expect(html).toContain('가죽 장화')
    expect(html).toContain('아이템을 적는다')
    expect(html).toContain('은퇴시킨다')
    // 클래스 표식은 스물하나가 다 나온다.
    expect(html.match(/aria-label="클래스 표식 \d+번"/g) ?? []).toHaveLength(21)
    // 고른 것 하나만 켜져 있다.
    expect(html.match(/classpick__cell--on/g) ?? []).toHaveLength(1)
  })

  it('남의 것이면 어느 칸도 열려 있지 않다', () => {
    const html = render(fixture({ ownerId: 'u2' }), false)
    // 글자 칸·단추가 전부 잠긴다.
    expect(html).not.toContain('아이템을 적는다')
    expect(html).not.toContain('은퇴시킨다')
    expect(html).not.toContain('classpick__cell')
    // 그래도 값은 보인다 — 누가 몇 레벨인지 안 보이면 같이 놀 수 없다.
    expect(html).toContain('가죽 장화')
  })

  it('서버에 못 닿으면 내 것이어도 잠긴다', () => {
    const html = render(fixture(), true, true)
    expect(html).not.toContain('아이템을 적는다')
    expect(html).not.toContain('은퇴시킨다')
  })

  it('경험이 다음 눈금에 닿으면 알리기만 한다 — 레벨을 올려주지 않는다', () => {
    const html = render(fixture({ level: 1, xp: 100 }), true)
    expect(html).toContain('올릴 때가 되었다')
    // 켜진 눈금은 여전히 1이다.
    expect(html).toContain('aria-checked="true" aria-label="레벨 1')
  })

  it('경험이 모자라면 재촉하지 않는다', () => {
    const html = render(fixture({ level: 2, xp: 60 }), true)
    expect(html).not.toContain('올릴 때가 되었다')
  })

  it('클래스를 안 골랐어도 그려진다', () => {
    const html = render(fixture({ classIcon: 0 }), true)
    expect(html).toContain('char__badge-empty')
  })
})
