import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { Retirements } from './Retirements'
import type { Retirement } from './retirementNet'

/*
  값과 손잡이를 다 받으므로 서버 렌더로 끝까지 확인된다(구현 결정 164).
  **지킬 것은 모르는 값을 아는 척하지 않는 것**(구현 결정 115)과 열람 중에는
  아무것도 못 고치는 것.
*/

const rows: Retirement[] = [
  {
    id: 'a',
    characterId: 'c1',
    player: 'pihitpihit',
    name: '바위심장',
    className: '바위심장',
    classIcon: 0,
    level: 6,
    perks: 9,
  },
  {
    id: 'b',
    characterId: null,
    player: '',
    name: '옛 캐릭터',
    className: '',
    classIcon: 0,
    level: null,
    perks: null,
  },
]

function render(over: Partial<Parameters<typeof Retirements>[0]> = {}) {
  return renderToStaticMarkup(
    <Retirements
      rows={rows}
      editing={false}
      busy={false}
      onAdd={() => {}}
      onEdit={() => {}}
      onRemove={() => {}}
      onShift={() => {}}
      {...over}
    />,
  )
}

describe('은퇴한 캐릭터', () => {
  it('다섯 칸을 다 낸다', () => {
    const html = render()
    for (const label of ['플레이어', '캐릭터', '클래스', '레벨', '특혜']) {
      expect(html).toContain(label)
    }
    expect(html).toContain('바위심장')
    expect(html).toContain('>6<')
  })

  it('모르는 값은 줄표다 — 0으로 적으면 그것이 값으로 읽힌다', () => {
    const html = render()
    // 손으로 적은 줄의 플레이어·클래스·레벨·특혜 넷이 비어 있다.
    expect((html.match(/—/g) ?? []).length).toBeGreaterThanOrEqual(4)
  })

  it('열람 중에는 손잡이가 없다', () => {
    const html = render()
    expect(html).not.toContain('itin__tool')
    expect(html).not.toContain('itin__add')
  })

  it('편집 중에는 차례를 옮기고 손으로 적을 수 있다', () => {
    const html = render({ editing: true })
    expect(html).toContain('한 칸 위로')
    expect(html).toContain('손으로 한 줄 적기')
  })

  it('비어 있으면 시트에서 은퇴를 켜면 남는다고 알린다', () => {
    expect(render({ rows: [] })).toContain('그때의 레벨과 특혜가')
  })
})
