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

  it('고치기 문이 있다', () => {
    expect(render(fixture())).toContain('고치기')
  })

  /** 칸이 다 잠겨 있다 — 스치기만 해도 값이 바뀌던 것이 이 모드의 요점이다. */
  it('평판 손잡이가 잠겨 있다', () => {
    const html = render(fixture())
    expect(html).not.toMatch(/<button[^>]*class="sheet__step"(?![^>]*disabled)/)
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
    expect(render(fixture({ reputation: 0 }))).toContain('sheet__price--flat')
    expect(render(fixture({ reputation: 10 }))).toContain('sheet__price--down')
    expect(render(fixture({ reputation: -10 }))).toContain('sheet__price--up')
  })

  it('읽어주는 쪽에는 우리말이 간다', () => {
    expect(render(fixture({ reputation: 0 }))).toContain('sheet__hidden')
  })
})
