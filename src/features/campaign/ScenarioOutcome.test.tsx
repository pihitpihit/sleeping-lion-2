import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { ScenarioOutcomePanel, ScenarioOutlook } from './ScenarioOutcome'
import { buildGraph, type Outcome } from './scenarioLinks'

/*
  알맹이와 미리 보기는 값만 받으므로 서버 렌더로 확인된다(구현 결정 194).
  **지킬 것**: 열기·막기는 처음부터 켜져 있고, 고르기는 아무것도 안 골라 둔다 —
  셋 중 하나는 파티가 정할 일이다.
*/

const list = [
  { no: 201, grid: 'A-1', name: '가' },
  { no: 202, grid: 'A-2', name: '나' },
  { no: 203, grid: 'A-3', name: '다' },
]

const none: Outcome = { opens: [], blocks: [], choose: [], waiting: [], links: [] }

function panel(outcome: Partial<Outcome>) {
  return renderToStaticMarkup(
    <ScenarioOutcomePanel
      no={201}
      list={list}
      outcome={{ ...none, ...outcome }}
      onApply={() => {}}
      onClose={() => {}}
    />,
  )
}

describe('ScenarioOutcomePanel', () => {
  it('열기와 막기는 처음부터 켜 둔다', () => {
    const html = panel({ opens: [202], blocks: [203] })
    expect(html.match(/type="checkbox" checked=""/g)?.length).toBe(2)
    expect(html).toContain('#202 나')
    expect(html).toContain('#203 다')
  })

  it('고르기는 아무것도 안 골라 두고, 그것만 있으면 적용이 잠긴다', () => {
    const html = panel({ choose: [202, 203] })
    expect(html).toContain('type="radio"')
    expect(html).not.toMatch(/type="radio"[^>]*checked/)
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>적용/)
  })

  it('선행이 모자란 것은 무엇이 모자란지 적는다', () => {
    const html = panel({ opens: [202], waiting: [{ no: 203, missing: [[201, 202], [204]] }] })
    expect(html).toContain('#201·#202 또는 #204도 완료해야 한다')
  })
})

describe('ScenarioOutlook', () => {
  const graph = buildGraph(
    [
      { from: 201, to: 202, kind: 'unlocks' },
      { from: 201, to: 203, kind: 'blocks' },
      { from: 202, to: 203, kind: 'links' },
    ],
    [],
  )

  it('깨면 열리고 막히는 것을 적는다', () => {
    const html = renderToStaticMarkup(<ScenarioOutlook no={201} graph={graph} list={list} />)
    expect(html).toContain('깨면 열림')
    expect(html).toContain('깨면 막힘')
    expect(html).toContain('#203 다')
  })

  it('바뀔 것이 없거나 그래프를 모르면 아무것도 안 그린다', () => {
    expect(renderToStaticMarkup(<ScenarioOutlook no={202} graph={graph} list={list} />)).toBe('')
    expect(renderToStaticMarkup(<ScenarioOutlook no={201} graph={null} list={list} />)).toBe('')
  })
})
