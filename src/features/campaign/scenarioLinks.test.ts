import { describe, expect, it } from 'vitest'
import {
  arrowsOf,
  buildGraph,
  hasOutcome,
  missingRequires,
  outcomeOf,
  type ScenarioLink,
} from './scenarioLinks'
import type { StoredState } from './scenarioState'

/*
  **틀리면 엉뚱한 시나리오를 열라고 권한다.** 지어낸 작은 그래프로 갈래를 하나씩
  못박는다 — 실제 값은 DB에만 있다(`0049`).

    201 ─열기·이어짐→ 202 ─열기→ 203, 204
    203 ─열기→ 205 (205는 203·204를 다 깼어야 한다)
    204 ─막기→ 206, 204 ─열기→ 206 (자기가 열고 자기가 막는 일은 없지만 막기가 이긴다)
    207 ─고르기→ 208, 209
    210 ─열기→ 211 (211은 「210과 212」 또는 「213」)
*/
const L = (from: number, to: number, kind: ScenarioLink['kind']): ScenarioLink => ({
  from,
  to,
  kind,
})

const graph = buildGraph(
  [
    L(201, 202, 'unlocks'),
    L(201, 202, 'links'),
    L(202, 203, 'unlocks'),
    L(202, 204, 'unlocks'),
    L(203, 205, 'unlocks'),
    L(204, 206, 'unlocks'),
    L(204, 206, 'blocks'),
    L(204, 202, 'blocks'),
    L(207, 209, 'choose'),
    L(207, 208, 'choose'),
    L(210, 211, 'unlocks'),
  ],
  [
    { no: 205, grp: 0, req: 203 },
    { no: 205, grp: 0, req: 204 },
    { no: 211, grp: 0, req: 210 },
    { no: 211, grp: 0, req: 212 },
    { no: 211, grp: 1, req: 213 },
  ],
)

describe('outcomeOf', () => {
  it('깨면 열어 주는 닫힌 것을 권한다', () => {
    const o = outcomeOf(graph, 202, { 201: 'done', 202: 'open' })
    expect(o.opens).toEqual([203, 204])
    expect(o.blocks).toEqual([])
  })

  it('이미 열렸거나 깬 것은 권하지 않는다', () => {
    const o = outcomeOf(graph, 202, { 201: 'done', 203: 'open', 204: 'done' })
    expect(o.opens).toEqual([])
    expect(hasOutcome(o)).toBe(false)
  })

  it('선행이 모자라면 열지 않고 기다린다고 적는다', () => {
    const o = outcomeOf(graph, 203, { 201: 'done', 202: 'done' })
    expect(o.opens).toEqual([])
    expect(o.waiting).toEqual([{ no: 205, missing: [[204]] }])
  })

  it('남은 선행을 채우는 완료는 — 그것이 열어 주지 않았어도 — 연다', () => {
    const o = outcomeOf(graph, 204, { 201: 'done', 202: 'done', 203: 'done' })
    expect(o.opens).toEqual([205])
  })

  it('막는 것은 열기보다 이긴다 — 같은 완료가 열고 막으면 열라고 안 한다', () => {
    const o = outcomeOf(graph, 204, { 201: 'done', 202: 'done', 203: 'done' })
    expect(o.opens).not.toContain(206)
    expect(o.blocks).toEqual([206])
  })

  it('이미 깬 것과 이미 막힌 것은 막으라고 안 한다', () => {
    expect(outcomeOf(graph, 204, { 202: 'done' }).blocks).toEqual([206])
    expect(outcomeOf(graph, 204, { 202: 'done', 206: 'blocked' }).blocks).toEqual([])
  })

  it('고르기는 닫힌 것만 늘어놓는다', () => {
    expect(outcomeOf(graph, 207, {}).choose).toEqual([208, 209])
    expect(outcomeOf(graph, 207, { 208: 'open' }).choose).toEqual([209])
  })

  it('이어 갈 수 있는 것은 깬 것을 뺀다', () => {
    expect(outcomeOf(graph, 201, {}).links).toEqual([202])
    expect(outcomeOf(graph, 201, { 202: 'done' }).links).toEqual([])
  })

  it('상태에 이미 완료로 적혀 있어도 같게 셈한다', () => {
    const before: Record<number, StoredState> = { 201: 'done' }
    expect(outcomeOf(graph, 202, before)).toEqual(outcomeOf(graph, 202, { ...before, 202: 'done' }))
  })
})

describe('missingRequires', () => {
  it('묶음 안은 모두, 묶음끼리는 하나라도', () => {
    expect(missingRequires(graph, 211, new Set([210]))).toEqual([[212], [213]])
    expect(missingRequires(graph, 211, new Set([210, 212]))).toEqual([])
    expect(missingRequires(graph, 211, new Set([213]))).toEqual([])
  })

  it('다른 묶음을 품는 묶음은 걷는다 — 같은 말을 두 번 하지 않는다', () => {
    const g = buildGraph(
      [],
      [
        { no: 201, grp: 0, req: 202 },
        { no: 201, grp: 0, req: 203 },
        { no: 201, grp: 1, req: 202 },
        { no: 201, grp: 1, req: 204 },
      ],
    )
    // 204를 깼으면 「202·203 또는 202」가 남는데 그것은 「202」다.
    expect(missingRequires(g, 201, new Set([204]))).toEqual([[202]])
    // 아무것도 안 깼으면 둘은 서로를 안 품는다.
    expect(missingRequires(g, 201, new Set())).toEqual([
      [202, 203],
      [202, 204],
    ])
  })

  it('선행이 없으면 모자란 것도 없다', () => {
    expect(missingRequires(graph, 203, new Set())).toEqual([])
  })
})

describe('arrowsOf', () => {
  /* 지어낸 연결: 301이 302를 열고 303·304 중 하나를 고르게 한다. 305도 302를 연다. */
  const g = buildGraph(
    [
      { from: 301, to: 302, kind: 'unlocks' },
      { from: 301, to: 303, kind: 'choose' },
      { from: 301, to: 304, kind: 'choose' },
      { from: 301, to: 306, kind: 'links' },
      { from: 305, to: 302, kind: 'unlocks' },
      { from: 301, to: 307, kind: 'blocks' },
      { from: 301, to: 308, kind: 'blocks' },
    ],
    [],
  )

  it('안 깼으면 나가는 것이 하나도 없다 — 열림도 막힘도', () => {
    const a = arrowsOf(g, 301, { 301: 'open', 302: 'open', 307: 'blocked' }, true)
    expect(a.out).toEqual([])
    expect(a.blocks).toEqual([])
  })

  it('깼으면 실제로 막힌 것만 막힘으로 나간다', () => {
    expect(arrowsOf(g, 301, { 301: 'done', 307: 'blocked' }, true).blocks).toEqual([307])
  })

  it('완료한 것은 실제로 열린 곳으로만 나간다 — 안 고른 갈래·이어서 하기는 빠진다', () => {
    const a = arrowsOf(g, 301, { 301: 'done', 302: 'open', 303: 'done', 306: 'open' }, true)
    expect(a.out).toEqual([302, 303])
    expect(a.in).toEqual([])
  })

  it('완료하지 않았으면 나가는 것이 없다', () => {
    expect(arrowsOf(g, 301, { 302: 'open' }, true).out).toEqual([])
  })

  it('열어 준 것 중 완료한 쪽만 들어온다', () => {
    expect(arrowsOf(g, 302, { 301: 'done', 302: 'open' }, false).in).toEqual([301])
  })

  it('완료한 쪽이 없으면 열어 줄 수 있는 것을 다 긋는다', () => {
    expect(arrowsOf(g, 302, { 302: 'open' }, false).in).toEqual([301, 305])
  })

  it('고르기로 열린 것도 들어온다', () => {
    expect(arrowsOf(g, 304, { 301: 'done', 304: 'open' }, false).in).toEqual([301])
  })

  it('시작 시나리오는 들어오는 것이 없다', () => {
    expect(arrowsOf(g, 302, { 301: 'done' }, true).in).toEqual([])
  })

  it('연결을 모르면 아무것도 없다', () => {
    expect(arrowsOf(null, 302, {}, false)).toEqual({ out: [], in: [], blocks: [] })
  })
})
