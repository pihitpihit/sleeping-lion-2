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
    // 경험·골드는 표식 위의 수로 — 다이얼은 편집 중에만 선다.
    expect(html).toContain('aria-label="골드 120"')
    expect(html).toContain('aria-label="경험 60"')
    expect(html).not.toContain('class="dial"')
    // 고치는 자리는 없다.
    expect(html).not.toContain('아이템을 적는다')
    expect(html).not.toContain('은퇴시킨다')
    expect(html).not.toContain('classpick__cell')
    expect(html).not.toContain('sheet__save')
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
 * `.char`는 로스터 줄 **밑에 매달리는** 상자다. 캐릭터 한 장짜리 화면에는 매달릴
 * 줄이 없으므로 **상자를 통째로 걷고**(`char--solo`) 넓은 화면에서 두 단으로
 * 선다(`paper--wide`). 어느 쪽이든 안쪽 칸은 평평하다(`paper`).
 */
describe('혼자 서는 시트', () => {
  it('줄 밑에 매달릴 때는 상자를 지킨다', () => {
    const html = render(fixture(), true)
    expect(html).not.toContain('char--solo')
    expect(html).not.toContain('paper--wide')
  })

  it('혼자 설 때는 상자를 걷고 두 단으로 설 수 있다', () => {
    const html = render(fixture(), true, false, true)
    expect(html).toContain('char--solo')
    expect(html).toContain('paper--wide')
  })

  it('어느 쪽이든 안쪽 칸은 평평하다', () => {
    expect(render(fixture(), true)).toContain('char paper')
    expect(render(fixture(), true, false, true)).toContain('char paper')
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

/**
 * ┌────────────────────────────────────────────────────────────────────────┐
 * │ **이름은 생성할 때 정한다. 시트에서는 읽기만 한다.**                     │
 * └────────────────────────────────────────────────────────────────────────┘
 *
 * 파티원은 이름으로 서로를 부른다 — 축 ②의 이름표도 그것이고 전투에서 누구의
 * 체력·덱인지 가리는 것도 그것이다. 막는 것은 서버다(`0017`).
 */
describe('이름은 못 고친다', () => {
  it('칸이 아니라 글로 그린다', () => {
    const html = render(fixture({ name: '홍명보' }), true)
    expect(html).toContain('char__name')
    expect(html).toContain('홍명보')
    expect(html).not.toContain('이름을 짓는다')
  })

  it('이름이 비어 있어도 자리는 지킨다', () => {
    expect(render(fixture({ name: '' }), true)).toContain('이름 없음')
  })
})

/**
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ **읽을 때는 표식 위의 수, 고칠 때는 다이얼.**                             │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * 들여다보는 동안에는 손잡이가 자리만 차지한다. 편집 모드는 서버 렌더로 볼 수
 * 없으므로(구현 결정 150) 여기서 못박는 것은 **읽기 쪽뿐**이다.
 */
describe('경험과 골드', () => {
  it('한 줄에 표식 위의 수로 선다', () => {
    const html = render(fixture(), true)
    expect(html).toContain('class="tally"')
    expect((html.match(/class="tally__item/g) ?? []).length).toBe(2)
  })

  /** 표식은 둘 다 이미 앱에서 쓰는 것이다 — 여기서 처음 보는 그림이 아니다. */
  it('경험은 팩의 별, 골드는 우리 금화다', () => {
    const html = render(fixture(), true)
    // 두께감까지 구워 담은 그림이다 — 물들이는 실루엣이 아니다.
    expect(html).toContain('general/xp-star-lit.webp')
    expect(html).toContain('class="gold__coin"')
  })

  /** 읽어주는 쪽에는 무엇의 수인지 함께 간다 — 그림과 숫자만으로는 알 수 없다. */
  it('읽어주는 쪽에 이름과 수가 함께 간다', () => {
    expect(render(fixture({ gold: 340 }), true)).toContain('aria-label="골드 340"')
  })

  /**
   * **남은 수가 아니라 온 만큼을 적는다.** 「다음까지 35」는 목표를 모르면 뜻이
   * 없다 — 얼마나 왔는지 보려면 지금 값과 눈금이 함께 있어야 한다.
   */
  it('경험은 지금 값과 다음 눈금을 함께 적는다', () => {
    // 60이면 2레벨(45~95). 다음 눈금은 95다.
    const html = render(fixture({ xp: 60 }), true)
    expect(html).toContain('60/95')
    expect(html).toContain('63%')
    expect(html).not.toContain('다음까지')
  })

  /** 아홉 레벨이면 다음 눈금이 없다 — 표식 위의 수가 전부다. */
  it('끝까지 올랐으면 아무것도 안 적는다', () => {
    const html = render(fixture({ xp: 600 }), true)
    expect(html).not.toContain('tally__label')
  })

  /** 골드는 적을 것이 없다 — 표식 밑에 「골드」라고 또 적지 않는다. */
  it('골드 밑에는 글자가 없다', () => {
    const html = render(fixture(), true)
    expect(html).not.toContain('>골드<')
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

  /** 눈금표 바로 위에 서므로 지금 몇 레벨인지가 표 옆에 늘 있다. */
  it('레벨 왕관이 눈금표 머리에 선다', () => {
    const html = render(fixture({ xp: 100 }), true)
    expect(html).toContain('class="levelchip"')
    expect(html).toContain('aria-label="레벨 3"')
  })

  it('클래스를 안 골랐어도 그려진다', () => {
    const html = render(fixture({ classIcon: 0 }), true)
    expect(html).toContain('char__badge-empty')
  })
})

/**
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ **칸을 가르는 것이 CSS이므로 짜임이 어긋나면 화면에만 드러난다.**          │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * 2026-08-12에 상자를 걷고 장식선으로 칸을 갈랐다. 그 선은 `.paper__col`의 자식에
 * 붙으므로 **감싼 것 바깥에 칸을 두면 앞 칸과 붙어 버린다** — 마크업은 멀쩡하고
 * 시험도 통과하는데 화면에서만 어긋나는 자리다(구현 결정 252와 같은 병).
 *
 * 그래서 시트의 **맨 윗줄 자식이 넷뿐**이라는 것을 못박는다.
 */
function topLevelClasses(html: string): string[] {
  const start = html.indexOf('<div class="char ')
  const out: string[] = []
  let depth = 0
  const tag = /<(\/?)([a-z0-9]+)([^>]*?)(\/?)>/g
  tag.lastIndex = start
  for (let m = tag.exec(html); m !== null; m = tag.exec(html)) {
    const [, close, , attrs, self] = m
    if (close === '/') {
      depth -= 1
      if (depth === 0) break
      continue
    }
    if (self === '/') {
      // 홀로 닫는 것(img·input)은 깊이를 바꾸지 않는다.
      if (depth === 1) out.push(/class="([^"]*)"/.exec(attrs)?.[1] ?? '')
      continue
    }
    if (depth === 1) out.push(/class="([^"]*)"/.exec(attrs)?.[1] ?? '')
    depth += 1
  }
  return out
}

describe('시트의 짜임 — 한 장의 종이', () => {
  it('맨 윗줄에는 두 단과 기록 문, 띠만 선다', () => {
    const kinds = topLevelClasses(render(fixture(), true, false, true)).map((c) =>
      c.split(' ').find((k) => k !== 'paper__col'),
    )
    expect(kinds).toEqual(['paper__col--a', 'paper__col--b', 'char__logrow', 'sheet__bar'])
  })

  /**
   * **혼자 설 때는 머리를 페이지의 붙박이 띠가 그린다.** 시트가 또 그리면 이름이
   * 두 줄로 겹친다. 매달릴 줄이 있는 로스터에서는 위에 아무것도 없으므로 시트가
   * 제 머리를 갖는다.
   */
  it('매달릴 때만 제 머리를 그린다', () => {
    expect(render(fixture(), true, false, true)).not.toContain('char__head')
    expect(render(fixture(), true, false, false)).toContain('char__head')
  })

  it('모든 칸이 두 단 안에 든다 — 밖에 남으면 선을 못 받는다', () => {
    const html = render(fixture(), true, false, true)
    const outside = topLevelClasses(html).filter((c) => c.includes('sheet__block'))
    expect(outside).toEqual([])
    // 덱까지 여섯 칸이 실제로 그려졌는지 함께 본다 — 세지 않으면 빈 단도 통과한다.
    expect((html.match(/class="sheet__block/g) ?? []).length).toBeGreaterThanOrEqual(5)
  })
})
