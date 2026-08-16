import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { PartySheet } from './PartySheet'
import type { Campaign } from './types'

/**
 * 파티 기록지가 실제로 그려지는지 본다.
 *
 * 브라우저를 띄우지 않고 **서버 렌더로 문자열까지 뽑는다**(구현 결정 48).
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ **여기서 볼 수 있는 것은 열람 모드까지다.**                               │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * 편집 모드는 컴포넌트 안의 상태이고 서버 렌더는 단추를 누를 수 없다. 그 안에서
 * 벌어지는 일의 알맹이는 **순수 함수로 떼어 `partyDraft.test.ts`가 덮는다** —
 * 캐릭터 시트와 같은 짜임이다.
 */

function fixture(over: Partial<Campaign> = {}): Campaign {
  return {
    id: 'g1',
    partyId: 'p1',
    name: '잠자는 사자',
    location: '광장',
    notes: '',
    unlocks: {},
    oak: 0,
    prosperity: 1,
    globalAchievements: {},
    achievements: ['첫 밤'],
    reputation: 2,
    createdAt: 0,
    updatedAt: 0,
    version: 1,
    ...over,
  }
}

function render(campaign: Campaign, readOnly = false) {
  return renderToStaticMarkup(
    <PartySheet campaign={campaign} readOnly={readOnly} onEdit={() => {}} />,
  )
}

describe('열람 모드', () => {
  it('값은 다 보이되 고치는 칸은 없다', () => {
    const html = render(fixture())
    expect(html).toContain('잠자는 사자')
    expect(html).toContain('첫 밤')
    // 고치는 자리는 없다.
    expect(html).not.toContain('업적을 적는다')
    expect(html).not.toContain('sheet__remove')
    expect(html).not.toContain('sheet__save')
  })

  /** 글자가 아니라 연필 그림이지만 **읽어주는 이름은 그대로** 「고치기」다. */
  it('고치기 문이 있다', () => {
    expect(render(fixture())).toContain('고치기')
  })

  /** 읽을 때는 손잡이가 아예 없다 — 스치기만 해도 값이 바뀌던 것이 이 모드의 요점이다. */
  it('평판 손잡이가 없다', () => {
    const html = render(fixture())
    expect(html).not.toContain('tally__caret')
  })

  it('서버에 못 닿으면 고칠 길이 없고 왜인지 적는다', () => {
    const html = render(fixture(), true)
    expect(html).not.toContain('고치기')
    expect(html).toContain('서버에 닿지 못해')
  })

  it('업적이 없으면 없다고 적는다 — 빈 칸만 있으면 고장으로 읽힌다', () => {
    expect(render(fixture({ achievements: [] }))).toContain('아직 없다')
  })
})

describe('물건값', () => {
  /** 평판에서 나오는 값이라 입력받지 않는다 — 사람이 적으면 두 곳이 어긋난다. */
  it('평판에서 나온다', () => {
    expect(render(fixture({ reputation: 0 }))).toContain('tally__item--flat')
    expect(render(fixture({ reputation: 10 }))).toContain('tally__item--down')
    expect(render(fixture({ reputation: -10 }))).toContain('tally__item--up')
  })

  /** 읽을 때는 손잡이가 자리만 차지한다 — 캐럿은 편집 중에만 돋는다. */
  it('읽기 모드에는 손잡이가 없다', () => {
    expect(render(fixture())).not.toContain('tally__caret')
  })

  it('읽어주는 쪽에는 우리말이 간다', () => {
    expect(render(fixture({ reputation: 0 }))).toContain('sheet__hidden')
  })
})

/**
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ **캐릭터 시트와 같은 짜임이다 — 한 장의 종이.**                           │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * 장식선은 `.paper__col`의 자식마다 붙으므로 **칸이 그 밖에 남으면 앞 칸과 붙어
 * 버리고**, 저장 띠가 그 안에 들면 띠 위에 선이 그어져 칸으로 읽힌다. 둘 다
 * 마크업은 멀쩡하고 화면에서만 어긋난다(구현 결정 252와 같은 병).
 */
describe('기록지의 짜임 — 한 장의 종이', () => {
  it('칸은 단 안에 들고 저장 띠는 그 밖에 선다', () => {
    const html = render(fixture())
    const col = html.indexOf('class="paper__col"')
    const bar = html.indexOf('class="sheet__bar"')
    expect(col).toBeGreaterThan(-1)
    // 단이 먼저 열리고 띠는 그 뒤에 온다.
    expect(bar).toBeGreaterThan(col)
    /*
      칸은 여덟 — 이름·머무는 곳·번영도 줄·파티 업적·전역 업적·떡갈나무·개봉 조건·메모.
      **개봉 조건은 표가 비어 있어도 선다** — 왜 비었는지 적어 주어야 「UI가 안
      보인다」가 되지 않는다(형님이 짚었다).
    */
    expect((html.match(/class="sheet__block/g) ?? []).length).toBe(8)
    // 단이 닫힌 뒤에 띠가 서는지: 띠 앞쪽에 칸이 다 들어 있다.
    expect((html.slice(col, bar).match(/class="sheet__block/g) ?? []).length).toBe(8)
  })
})

describe('개봉 조건 칸', () => {
  /** 없어도 앱이 도는 것과 **왜 없는지 안 보이는 것**은 다르다(구현 결정 172). */
  it('표가 비어 있으면 어디서 넣는지 적는다', () => {
    const html = render(fixture())
    expect(html).toContain('봉투·상자 개봉 조건')
    expect(html).toContain('주인장 화면')
  })
})
