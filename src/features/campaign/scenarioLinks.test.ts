import { describe, expect, it } from 'vitest'
import {
  achievementHave,
  achievementVerdict,
  arrowsOf,
  buildAchievementData,
  buildGraph,
  hasOutcome,
  missedOf,
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

/*
  업적 조건·보상(`0055`). 업적 이름과 열쇠는 지어낸 것이다(구현 결정 532).
  401을 깨면 전역 업적 g-flee를 얻는다. 402는 g-flee가 **없어야** 한다.
  403은 파티 업적 p-plan이 있어야 한다. 404는 g-loop를 세 번 이뤄야 한다.
*/
describe('업적 조건', () => {
  const ach = buildAchievementData(
    [
      { no: 402, alt: 0, scope: 'global', code: 'g-flee', negate: true, count: 1 },
      { no: 403, alt: 0, scope: 'party', code: 'p-plan', negate: false, count: 1 },
      { no: 404, alt: 0, scope: 'global', code: 'g-loop', negate: false, count: 3 },
    ],
    [
      { no: 401, scope: 'global', code: 'g-flee', lose: false },
      { no: 401, scope: 'party', code: 'p-plan', lose: true },
    ],
    [
      { scope: 'global', code: 'g-flee', name: '도주' },
      { scope: 'party', code: 'p-plan', name: '계 획' },
      { scope: 'global', code: 'g-loop', name: '되풀이' },
    ],
  )
  const g = buildGraph(
    [
      { from: 401, to: 402, kind: 'unlocks' },
      { from: 401, to: 403, kind: 'unlocks' },
      { from: 401, to: 404, kind: 'unlocks' },
    ],
    [],
    ach,
  )

  it('기록지의 이름을 열쇠로 옮긴다 — 공백이 달라도 같은 업적, 모르는 이름은 빠진다', () => {
    const have = achievementHave(g, ['계획', '손으로 적은 것'], { 되풀이: 2 })
    expect([...have.party]).toEqual(['p-plan'])
    expect(have.global.get('g-loop')).toBe(2)
  })

  it('없어야 하는 전역 업적을 가졌으면 영영 막힌다', () => {
    const have = achievementHave(g, [], { 도주: 1 })
    expect(achievementVerdict(g, 402, have).kind).toBe('blocked')
  })

  it('횟수가 모자라면 기다린다', () => {
    const have = achievementHave(g, [], { 되풀이: 2 })
    expect(achievementVerdict(g, 404, have).kind).toBe('missing')
    expect(achievementVerdict(g, 404, achievementHave(g, [], { 되풀이: 3 })).kind).toBe('ok')
  })

  it('깨서 얻는 업적까지 셈한다 — 얻은 업적이 막고, 잃은 업적 때문에 못 연다', () => {
    const have = achievementHave(g, ['계획'], { 되풀이: 3 })
    const o = outcomeOf(g, 401, { 401: 'done' }, have)
    // 402는 401이 주는 「도주」 때문에 막힌다.
    expect(o.blocks).toEqual([402])
    // 403은 401이 「계획」을 가져가서 못 연다 — 기다림으로 적는다.
    expect(o.opens).toEqual([404])
    expect(o.waiting.map((w) => w.no)).toEqual([403])
    expect(o.gains).toEqual(['도주'])
    expect(o.losses).toEqual(['계 획'])
  })

  it('얻은 업적이 이미 열린 것을 막으면 막힘으로 권한다', () => {
    const have = achievementHave(g, [], {})
    const o = outcomeOf(g, 401, { 401: 'done', 402: 'open' }, have)
    expect(o.blocks).toEqual([402])
  })

  it('업적을 안 주면 연결만 본다', () => {
    const o = outcomeOf(g, 401, { 401: 'done' })
    expect(o.opens).toEqual([402, 403, 404])
  })
})

describe('missedOf', () => {
  /* 501이 502·503을 연다. 504는 501이 막는다. 505는 501·506을 다 깨야 한다. 501이 507·508 중 하나를 고르게 한다. */
  const g = buildGraph(
    [
      { from: 501, to: 502, kind: 'unlocks' },
      { from: 501, to: 503, kind: 'unlocks' },
      { from: 501, to: 504, kind: 'blocks' },
      { from: 501, to: 505, kind: 'unlocks' },
      { from: 501, to: 507, kind: 'choose' },
      { from: 501, to: 508, kind: 'choose' },
    ],
    [
      { no: 505, grp: 0, req: 501 },
      { no: 505, grp: 0, req: 506 },
    ],
  )
  const all = [501, 502, 503, 504, 505, 506, 507, 508]

  it('완료한 것이 연 곳 중 닫힌 것을 열림으로, 막는 곳을 막힘으로 찾는다', () => {
    const m = missedOf(g, { 501: 'done', 503: 'open', 504: 'open' }, null, all)
    expect(m.opens).toEqual([502])
    expect(m.blocks).toEqual([504])
  })

  it('선행이 모자라면 열지 않는다', () => {
    expect(missedOf(g, { 501: 'done' }, null, all).opens).not.toContain(505)
    expect(missedOf(g, { 501: 'done', 506: 'done' }, null, all).opens).toContain(505)
  })

  it('아직 아무것도 안 고른 갈림길을 알린다 — 하나라도 골랐으면 안 알린다', () => {
    expect(missedOf(g, { 501: 'done' }, null, all).choose).toEqual([
      { from: 501, options: [507, 508] },
    ])
    expect(missedOf(g, { 501: 'done', 508: 'open' }, null, all).choose).toEqual([])
  })

  it('완료·막힘은 건드리지 않는다', () => {
    const m = missedOf(g, { 501: 'done', 502: 'done', 504: 'blocked' }, null, all)
    expect(m.opens).not.toContain(502)
    expect(m.blocks).toEqual([])
  })
})

describe('열었지만 이미 막힌 것', () => {
  /* 601이 602를 연다. 603(이미 완료)이 602를 막는다. */
  const g = buildGraph(
    [
      { from: 601, to: 602, kind: 'unlocks' },
      { from: 603, to: 602, kind: 'blocks' },
    ],
    [],
  )

  it('완료한 것이 막고 있으면 열지 않고 막힘으로 적는다 — 놓친 해금 찾기와 같은 말', () => {
    const states = { 601: 'done', 603: 'done' } as const
    const o = outcomeOf(g, 601, states)
    expect(o.opens).toEqual([])
    expect(o.blocks).toEqual([602])
    expect(missedOf(g, states, null, [601, 602, 603]).blocks).toEqual([602])
  })
})
