import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { Itinerary } from './Itinerary'
import type { Stop } from './itineraryOrder'

/*
  값과 손잡이를 다 받으므로 서버 렌더로 끝까지 확인된다(구현 결정 164).
  **지킬 것은 맨 위가 「지금」이라는 것과, 열람 중에는 아무것도 못 고친다는 것.**
*/

const stops: Stop[] = [
  { id: 'a', at: '2026-09-12', scenario: '7', code: 'G-12', place: '버려진 사원', scenarioNo: 7 },
  { id: 'b', at: null, scenario: '', code: '', place: '광장', scenarioNo: null },
]

function render(over: Partial<Parameters<typeof Itinerary>[0]> = {}) {
  return renderToStaticMarkup(
    <Itinerary
      stops={stops}
      editing={false}
      busy={false}
      scenarios={[]}
      states={{}}
      onState={() => {}}
      today="2026-09-13"
      onAdd={() => {}}
      onEdit={() => {}}
      onRemove={() => {}}
      onShift={() => {}}
      {...over}
    />,
  )
}

describe('행적', () => {
  it('맨 위 줄에만 「지금」이 붙는다', () => {
    const html = render()
    expect((html.match(/itin__now/g) ?? []).length).toBe(1)
    expect(html.indexOf('지금')).toBeLessThan(html.indexOf('버려진 사원'))
  })

  it('세 칸을 한 마디로 이어 붙인다', () => {
    expect(render()).toContain('#7 G-12 버려진 사원')
  })

  it('날짜가 없으면 줄표를 적는다 — 빈 자리는 고장으로 읽힌다', () => {
    expect(render()).toContain('—')
  })

  it('열람 중에는 손잡이가 없다', () => {
    const html = render()
    expect(html).not.toContain('itin__tool')
    expect(html).not.toContain('itin__add')
  })

  it('편집 중에는 올리기·내리기·고치기와 적는 단추가 선다', () => {
    const html = render({ editing: true })
    expect(html).toContain('한 칸 위로')
    expect(html).toContain('한 칸 아래로')
    expect(html).toContain('itin__add')
  })

  it('맨 위는 더 올릴 수 없고 맨 아래는 더 내릴 수 없다', () => {
    const html = render({ editing: true })
    // 첫 줄의 ↑와 마지막 줄의 ↓ — 둘이 잠긴다.
    expect((html.match(/disabled=""/g) ?? []).length).toBe(2)
  })

  it('비어 있으면 무엇을 해야 하는지 적는다', () => {
    expect(render({ stops: [] })).toContain('편집으로 들어가 적는다')
    expect(render({ stops: [], editing: true })).toContain('아래에서 한 줄 적는다')
  })
})
