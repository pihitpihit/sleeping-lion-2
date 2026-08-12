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

function render(character: Character, mine: boolean, offline = false, standalone = false) {
  return renderToStaticMarkup(
    <CharacterSheet
      character={character}
      mine={mine}
      offline={offline}
      standalone={standalone}
      onEdit={() => {}}
      onRemove={() => {}}
    />,
  )
}

/**
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ **여기서 볼 수 있는 것은 열람 모드까지다.**                               │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * 편집 모드는 컴포넌트 안의 상태이고 서버 렌더는 단추를 누를 수 없다. 그 안에서
 * 벌어지는 일(무엇이 바뀌었나 · 저장 단추가 사는가 · 무엇을 보내는가)의 알맹이는
 * **순수 함수로 떼어 `sheetDraft.test.ts`가 통째로 덮는다** — 화면에 매달린
 * 것만 남기지 않으려고 뗀 것이다.
 */
describe('열람 모드', () => {
  it('값은 다 보이되 고치는 칸은 없다', () => {
    const html = render(fixture(), true)
    // 값은 보인다.
    expect(html).toContain('가죽 장화')
    expect(html).toContain('value="120"')
    // 고치는 자리는 없다.
    expect(html).not.toContain('아이템을 적는다')
    expect(html).not.toContain('은퇴시킨다')
    expect(html).not.toContain('classpick__cell')
    expect(html).not.toContain('char__save')
  })

  it('내 것이면 고치기 문이 있다', () => {
    expect(render(fixture(), true)).toContain('고치기')
  })

  /** 칸이 다 잠겨 있다 — 스치기만 해도 값이 바뀌던 것이 이 모드의 요점이다. */
  it('모든 손잡이가 잠겨 있다', () => {
    const html = render(fixture(), true)
    expect(html).not.toMatch(/<button[^>]*class="char__level[^"]*"(?![^>]*disabled)/)
    expect(html).not.toMatch(/<button[^>]*class="char__check[^"]*"(?![^>]*disabled)/)
  })

  it('남의 것이면 고칠 길이 없고 왜인지 적는다', () => {
    const html = render(fixture({ ownerId: 'u2' }), false)
    expect(html).not.toContain('고치기')
    expect(html).toContain('남의 시트라 보기만 한다')
    // 그래도 값은 보인다 — 누가 몇 레벨인지 안 보이면 같이 놀 수 없다.
    expect(html).toContain('가죽 장화')
  })

  it('서버에 못 닿으면 내 것이어도 고칠 길이 없다', () => {
    const html = render(fixture(), true, true)
    expect(html).not.toContain('고치기')
    expect(html).toContain('서버에 닿지 못해')
  })

  it('아이템이 없으면 없다고 적는다 — 빈 칸만 있으면 고장으로 읽힌다', () => {
    expect(render(fixture({ items: [] }), true)).toContain('아직 없다')
  })
})

/**
 * `.char`는 로스터 줄 **밑에 매달리는** 상자다 — 위 테두리가 없고 위쪽 모서리가
 * 각졌다. 캐릭터 한 장짜리 화면에는 매달릴 줄이 없으므로 제 테두리를 갖고 폭을
 * 스스로 잡아야 한다. 그러지 않으면 **위가 뚫린 채 화면 끝까지 펼쳐진다.**
 */
describe('혼자 서는 시트', () => {
  it('줄 밑에 매달릴 때는 제 테를 두르지 않는다', () => {
    expect(render(fixture(), true)).not.toContain('char--solo')
  })

  it('혼자 설 때는 제 테를 두른다', () => {
    expect(render(fixture(), true, false, true)).toContain('char--solo')
  })
})

/**
 * 실물 시트는 **세 칸짜리 여섯 묶음**이다(구현 결정 42). 흘려 넣고 셋째마다 여백을
 * 주었더니 한 줄에 몇 개가 들어가느냐가 화면 폭에 따라 달라져 묶음이 줄을 넘어가
 * 끊겼다. 격자로 못박아 **줄 하나가 곧 한 묶음**이 되게 했다.
 *
 * 줄이 실제로 셋씩 끊기는지는 격자가 하는 일이라 여기서 볼 수 없다 — 칸이 열여덟
 * 개인 것과 묶음 여백을 주던 손질이 사라진 것까지가 여기 몫이다.
 */
describe('전투 목표', () => {
  it('칸이 열여덟이다', () => {
    const html = render(fixture(), true)
    expect((html.match(/class="char__check[ "]/g) ?? []).length).toBe(18)
  })

  it('묶음 여백을 주던 손질은 사라졌다 — 이제 격자가 묶는다', () => {
    expect(render(fixture(), true)).not.toContain('char__check--last')
  })

  it('채운 만큼만 켜진다', () => {
    const html = render(fixture({ checkmarks: 7 }), true)
    expect((html.match(/char__check--on/g) ?? []).length).toBe(7)
  })
})

describe('그 밖', () => {
  /**
   * ┌────────────────────────────────────────────────────────────────────────┐
   * │ **레벨은 경험치가 정한다. 누르는 자리가 아니다.**                        │
   * └────────────────────────────────────────────────────────────────────────┘
   *
   * 2026-08-12에 구현 결정 43을 뒤집었다 — 그전에는 사람이 눈금을 눌러 정했고
   * 경험이 앞서면 "올릴 때가 되었다"고 알리기만 했다.
   */
  it('표에 옛 레벨이 남아 있어도 경험치대로 그린다', () => {
    const html = render(fixture({ level: 1, xp: 100 }), true)
    expect(html).toContain('aria-label="레벨 3"')
    expect(html).not.toContain('올릴 때가 되었다')
  })

  it('눈금은 누를 수 없다', () => {
    const html = render(fixture({ xp: 100 }), true)
    // 단추가 아니라 목록이다.
    expect(html).not.toMatch(/<button[^>]*class="char__level/)
    expect(html).toContain('<ol class="char__levels"')
  })

  it('지나온 눈금에 표를 낸다 — 어디까지 왔는지 보인다', () => {
    const html = render(fixture({ xp: 100 }), true)
    expect((html.match(/char__level--past/g) ?? []).length).toBe(2)
    expect((html.match(/char__level--on/g) ?? []).length).toBe(1)
  })

  it('클래스를 안 골랐어도 그려진다', () => {
    const html = render(fixture({ classIcon: 0 }), true)
    expect(html).toContain('char__badge-empty')
  })
})
