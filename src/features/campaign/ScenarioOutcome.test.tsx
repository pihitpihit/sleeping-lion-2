import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { MissedPanel, ScenarioOutlook, ScenarioReportPanel } from './ScenarioOutcome'
import { buildGraph, type Missed, type Outcome } from './scenarioLinks'

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

const none: Outcome = {
  opens: [],
  blocks: [],
  choose: [],
  waiting: [],
  links: [],
  gains: [],
  losses: [],
  achRewards: [],
}

function report(outcome: Partial<Outcome>, applied: { no: number; to: 'open' | 'blocked' }[] = []) {
  return renderToStaticMarkup(
    <ScenarioReportPanel
      no={201}
      list={list}
      outcome={{ ...none, ...outcome }}
      applied={applied}
      onChoose={() => {}}
      onUndo={() => {}}
      onClose={() => {}}
    />,
  )
}

describe('ScenarioReportPanel', () => {
  it('저절로 바꾼 것을 적고 되돌리기를 낸다', () => {
    const html = report({ opens: [202], blocks: [203] }, [
      { no: 202, to: 'open' },
      { no: 203, to: 'blocked' },
    ])
    expect(html).toContain('열었다')
    expect(html).toContain('막았다')
    expect(html).toContain('#202 나')
    expect(html).toContain('되돌리기')
    // 이미 바꿨으므로 고를 상자가 없다.
    expect(html).not.toContain('type="checkbox"')
  })

  it('적지 못했으면 바꿨다고 하지 않고, 되돌리기도 안 낸다', () => {
    const html = report({ opens: [202] }, [])
    expect(html).not.toContain('열었다')
    expect(html).not.toContain('되돌리기')
    expect(html).toContain('놓친 해금 찾기')
  })

  it('고르기는 저절로 안 열고 아무것도 안 골라 둔다 — 고르기 전에는 여는 단추가 잠긴다', () => {
    const html = report({ choose: [202, 203] })
    expect(html).not.toMatch(/type="radio"[^>]*checked/)
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>고른 것 열기/)
  })

  it('업적이 모자라면 무엇이 맞아야 하는지 적는다', () => {
    const g = buildGraph([], [], {
      reqs: new Map(),
      rewards: new Map(),
      names: new Map([['global:g-flee', '도주']]),
    })
    const html = renderToStaticMarkup(
      <ScenarioReportPanel
        no={201}
        list={list}
        graph={g}
        applied={[]}
        outcome={{
          ...none,
          waiting: [
            {
              no: 203,
              missing: [],
              achMissing: [[{ scope: 'global', code: 'g-flee', negate: true, count: 1 }]],
            },
          ],
        }}
        onChoose={() => {}}
        onUndo={() => {}}
        onClose={() => {}}
      />,
    )
    expect(html).toContain('열리려면 업적이 맞아야 한다 — 「도주」 없음.')
  })

  it('업적은 알리고 확인으로 닫는다', () => {
    const html = report({ gains: ['도주'] })
    expect(html).toContain('얻음: 도주')
    expect(html).toContain('확인')
  })

  it('선행이 모자란 것은 무엇이 모자란지 적는다', () => {
    const html = report({ waiting: [{ no: 203, missing: [[201, 202], [204]] }] })
    expect(html).toContain('#201·#202 또는 #204도 완료해야 한다')
  })
})

describe('ScenarioReportPanel — 업적', () => {
  const render = (ach: 'applied' | 'skipped' | 'failed') =>
    renderToStaticMarkup(
      <ScenarioReportPanel
        no={201}
        list={list}
        outcome={{ ...none, gains: ['도주'] }}
        applied={[]}
        ach={ach}
        onChoose={() => {}}
        onUndo={() => {}}
        onClose={() => {}}
      />,
    )

  it('담았으면 담았다고 하고 되돌리기를 낸다', () => {
    const html = render('applied')
    expect(html).toContain('업적 담았다')
    expect(html).toContain('되돌리기')
  })

  it('편집 중이라 안 담았으면 그렇게 적고 되돌리기를 안 낸다', () => {
    const html = render('skipped')
    expect(html).toContain('편집 중이라 담지 않았다')
    expect(html).not.toContain('되돌리기')
  })

  it('못 담았으면 직접 담으라고 적는다', () => {
    expect(render('failed')).toContain('담지 못했다')
  })
})

describe('MissedPanel', () => {
  const missedPanel = (m: Partial<Missed>) =>
    renderToStaticMarkup(
      <MissedPanel
        missed={{ opens: [], blocks: [], choose: [], ...m }}
        list={list}
        onApply={() => {}}
        onClose={() => {}}
      />,
    )

  it('열림·막힘은 처음부터 켜 둔다', () => {
    const html = missedPanel({ opens: [202], blocks: [203] })
    expect(html.match(/type="checkbox" checked=""/g)?.length).toBe(2)
  })

  it('갈림길은 고른 시나리오마다 따로 묻고 아무것도 안 골라 둔다', () => {
    const html = missedPanel({ choose: [{ from: 201, options: [202, 203] }] })
    expect(html).toContain('#201 가에서 하나를 골라 연다')
    expect(html).not.toMatch(/type="radio"[^>]*checked/)
  })

  it('놓친 것이 없으면 그렇게 적는다', () => {
    expect(missedPanel({})).toContain('놓친 것이 없다')
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
