import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { ScenarioBoard } from './ScenarioBoard'
import { buildGraph } from './scenarioLinks'
import type { StoredState } from './scenarioState'

/*
  값과 손잡이를 다 받으므로 서버 렌더로 끝까지 확인된다(구현 결정 164).
  **지킬 것**: 열린 것만 늘어놓고, 누르는 단추는 편집 중에만 낸다 — 들여다보는
  동안 스치기만 해도 행적이 생기면 안 된다. 번호는 지어낸 것이다(구현 결정 532).
*/

const list = [
  { no: 201, grid: 'A-1', name: '가' },
  { no: 202, grid: 'A-2', name: '나' },
  { no: 203, grid: 'A-3', name: '다' },
  { no: 204, grid: 'A-4', name: '라' },
]

const states: Record<number, StoredState> = { 201: 'done', 202: 'open', 203: 'blocked' }

function render(over: Partial<Parameters<typeof ScenarioBoard>[0]> = {}) {
  return renderToStaticMarkup(
    <ScenarioBoard
      list={list}
      states={states}
      graph={null}
      editing={false}
      busy={false}
      onFinish={() => {}}
      {...over}
    />,
  )
}

describe('ScenarioBoard', () => {
  it('열린 것만 늘어놓는다', () => {
    const html = render()
    expect(html).toContain('#202')
    expect(html).not.toContain('#201')
    expect(html).not.toContain('#203')
    expect(html).not.toContain('#204')
  })

  it('완료·열림·막힘을 센다 — 닫힌 것은 세지 않는다', () => {
    const tally = render().match(/<p class="scboard__tally">.*?<\/p>/)?.[0] ?? ''
    const nums = [...tally.matchAll(/<b class="sl-numeral">(\d+)<\/b>/g)].map((m) => m[1])
    expect(nums).toEqual(['1', '1', '1', '4'])
  })

  it('들여다볼 때는 누를 것이 없고, 편집 중에만 완료·실패가 선다', () => {
    expect(render()).not.toContain('<button')
    const html = render({ editing: true })
    expect(html).toContain('>완료</button>')
    expect(html).toContain('>실패</button>')
  })

  it('깨면 무엇이 바뀌는지 곁에 적는다', () => {
    const graph = buildGraph(
      [
        { from: 202, to: 204, kind: 'unlocks' },
        { from: 202, to: 203, kind: 'blocks' },
      ],
      [],
    )
    const html = render({ graph })
    expect(html).toContain('깨면 열림')
    expect(html).toContain('#204 라')
    expect(html).toContain('깨면 막힘')
  })

  it('목록이 없어도 선다', () => {
    expect(render({ list: [] })).toContain('시나리오 목록이 아직 없다')
  })

  it('지도로 가는 손잡이가 있으면 카드마다 문을 덮는다', () => {
    const html = render({ onShowOnMap: () => {} })
    expect(html).toContain('aria-label="#202 나 지도에서 보기"')
  })

  it('편집 중에는 문을 안 덮는다 — 완료·실패 단추를 가린다', () => {
    const html = render({ onShowOnMap: () => {}, editing: true })
    expect(html).not.toContain('scboard__tap')
    expect(html).toContain('scboard__done')
  })

  it('찾은 보물을 주면 열린 카드마다 아직 안 찾은 보물을 적는다', () => {
    const withTreasure = list.map((s) => (s.no === 202 ? { ...s, treasures: [301, 302] } : s))
    const html = render({ list: withTreasure, found: [302] })
    expect(html).toContain('보물 #301 남음')
  })

  it('놓인 보물이 없는 카드에는 아무것도 안 적는다', () => {
    expect(render({ found: [] })).not.toContain('scboard__treasure')
  })
})
