import { stateOf, type StoredState } from './scenarioState'

/**
 * 시나리오끼리의 연결(`0049`) — **깨면 무엇이 열리고 무엇이 막히는가.**
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ **권하기만 한다. 저절로 바꾸지 않는다.**                                  │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * 규칙을 판정하는 것은 우리 일이 아니다(SPEC 1장). 닫힌 것도 고를 수 있게 둔 것과
 * 같은 결이다(구현 결정 537) — 여기서 셈한 것은 「이렇게 바뀔 만하다」를 화면이
 * 내미는 데만 쓴다. 사람이 적용을 눌러야 상태가 바뀐다.
 *
 * 열리는 조건은 GHS가 셈하는 것과 같다: **완료한 것 중 하나가 열어 주었고, 선행
 * 묶음 가운데 하나를 다 깼다.** 업적을 거치는 조건은 여기 없다(`0049` 머리 참조).
 *
 * 순수 함수라 표로 못박는다.
 */

export type LinkKind = 'unlocks' | 'choose' | 'links' | 'blocks'

export interface ScenarioLink {
  readonly from: number
  readonly to: number
  readonly kind: LinkKind
}

export interface ScenarioGraph {
  /** 번호 → 갈래별로 가리키는 번호들. */
  readonly out: ReadonlyMap<number, Readonly<Record<LinkKind, readonly number[]>>>
  /** 번호 → 열어 주는 번호들(`unlocks`를 거꾸로). */
  readonly unlockedBy: ReadonlyMap<number, readonly number[]>
  /** 번호 → 선행 묶음들. 묶음 안은 모두, 묶음끼리는 하나라도. */
  readonly requires: ReadonlyMap<number, readonly (readonly number[])[]>
}

const EMPTY: Readonly<Record<LinkKind, readonly number[]>> = {
  unlocks: [],
  choose: [],
  links: [],
  blocks: [],
}

export function isLinkKind(raw: unknown): raw is LinkKind {
  return raw === 'unlocks' || raw === 'choose' || raw === 'links' || raw === 'blocks'
}

export function buildGraph(
  links: readonly ScenarioLink[],
  requires: readonly { no: number; grp: number; req: number }[],
): ScenarioGraph {
  const out = new Map<number, Record<LinkKind, number[]>>()
  const unlockedBy = new Map<number, number[]>()
  for (const { from, to, kind } of links) {
    const row = out.get(from) ?? { unlocks: [], choose: [], links: [], blocks: [] }
    if (!row[kind].includes(to)) row[kind].push(to)
    out.set(from, row)
    if (kind === 'unlocks') {
      const by = unlockedBy.get(to) ?? []
      if (!by.includes(from)) by.push(from)
      unlockedBy.set(to, by)
    }
  }
  for (const row of out.values()) for (const list of Object.values(row)) list.sort((a, b) => a - b)
  for (const list of unlockedBy.values()) list.sort((a, b) => a - b)

  const groups = new Map<number, Map<number, number[]>>()
  for (const { no, grp, req } of requires) {
    const byGroup = groups.get(no) ?? new Map<number, number[]>()
    const group = byGroup.get(grp) ?? []
    if (!group.includes(req)) group.push(req)
    byGroup.set(grp, group)
    groups.set(no, byGroup)
  }
  const req = new Map<number, number[][]>()
  for (const [no, byGroup] of groups) {
    req.set(
      no,
      [...byGroup.entries()].sort(([a], [b]) => a - b).map(([, g]) => g.sort((a, b) => a - b)),
    )
  }

  return { out, unlockedBy, requires: req }
}

export function linksOf(
  graph: ScenarioGraph,
  no: number,
): Readonly<Record<LinkKind, readonly number[]>> {
  return graph.out.get(no) ?? EMPTY
}

/** 선행 묶음 가운데 아직 못 깬 것들. **하나라도 다 깬 묶음이 있으면 빈 배열이다.** */
export function missingRequires(
  graph: ScenarioGraph,
  no: number,
  done: ReadonlySet<number>,
): number[][] {
  const groups = graph.requires.get(no)
  if (!groups || groups.length === 0) return []
  const missing = groups.map((g) => g.filter((n) => !done.has(n)))
  if (missing.some((g) => g.length === 0)) return []
  /*
    **다른 묶음을 품는 묶음은 걷는다.** 「A·B 또는 A」는 「A」와 같은
    말이다 — 겹쳐 적으면 더 깨야 하는 줄 안다. 같은 묶음이 둘이면 하나만 남긴다.
  */
  return missing.filter(
    (g, i) =>
      !missing.some(
        (h, j) => j !== i && h.every((n) => g.includes(n)) && (h.length < g.length || j < i),
      ),
  )
}

export interface Outcome {
  /** 새로 열 만한 것 — 지금 닫혀 있고, 열어 줄 것과 선행을 다 갖췄다. */
  readonly opens: readonly number[]
  /** 막힐 것 — 아직 완료도 막힘도 아니다. */
  readonly blocks: readonly number[]
  /** 이 가운데 하나를 골라 연다. 닫힌 것만. */
  readonly choose: readonly number[]
  /** 열어 주긴 했는데 선행이 모자라 아직 못 여는 것. */
  readonly waiting: readonly {
    readonly no: number
    readonly missing: readonly (readonly number[])[]
  }[]
  /** 곧바로 이어 갈 수 있는 것. 이미 완료한 것은 뺀다. */
  readonly links: readonly number[]
}

function doneSet(states: Record<number, StoredState>): Set<number> {
  const out = new Set<number>()
  for (const [no, state] of Object.entries(states)) if (state === 'done') out.add(Number(no))
  return out
}

/** 완료한 것 가운데 이것을 막는 것이 있는가. */
function blockedBy(graph: ScenarioGraph, no: number, done: ReadonlySet<number>): boolean {
  for (const d of done) if (linksOf(graph, d).blocks.includes(no)) return true
  return false
}

/**
 * 이것을 완료하면 무엇이 바뀔 만한가.
 *
 * **이 완료와 이어진 것만 본다** — 이것이 열어 주거나, 이것을 선행으로 갖는 것.
 * 예전에 열어 둘 것을 안 연 자리까지 들추면 지금 무엇 때문에 뜬 팝업인지 흐려진다.
 *
 * 상태는 이것이 **이미 완료로 적힌 뒤**의 것이든 아니든 같게 셈한다.
 */
export function outcomeOf(
  graph: ScenarioGraph,
  no: number,
  states: Record<number, StoredState>,
): Outcome {
  const done = doneSet(states)
  done.add(no)
  const mine = linksOf(graph, no)

  /* 이것이 열어 주는 것 + 이것을 선행으로 갖는 것(그것을 열어 준 것은 이미 완료). */
  const candidates = new Set<number>(mine.unlocks)
  for (const [target, groups] of graph.requires) {
    if (groups.some((g) => g.includes(no))) candidates.add(target)
  }

  const opens: number[] = []
  const waiting: { no: number; missing: number[][] }[] = []
  for (const target of [...candidates].sort((a, b) => a - b)) {
    if (target === no || stateOf(states, target) !== 'closed') continue
    const unlocked = (graph.unlockedBy.get(target) ?? []).some((by) => done.has(by))
    if (!unlocked) continue
    if (blockedBy(graph, target, done)) continue
    const missing = missingRequires(graph, target, done)
    if (missing.length === 0) opens.push(target)
    else if (mine.unlocks.includes(target)) waiting.push({ no: target, missing })
  }

  const blocks = mine.blocks.filter((t) => {
    const s = stateOf(states, t)
    return s !== 'done' && s !== 'blocked'
  })
  const choose = mine.choose.filter((t) => stateOf(states, t) === 'closed')
  const links = mine.links.filter((t) => stateOf(states, t) !== 'done')

  return { opens, blocks, choose, waiting, links }
}

/** 권할 것이 하나라도 있는가. 바꿀 것이 없으면 팝업을 안 띄운다. */
export function hasOutcome(outcome: Outcome): boolean {
  return outcome.opens.length > 0 || outcome.blocks.length > 0 || outcome.choose.length > 0
}

/** 번호에 이름을 붙인다. 목록에 없으면 번호만 — 목록을 못 읽는 자리도 있다. */
export function scenarioName(
  no: number,
  list: readonly { readonly no: number; readonly name: string }[],
): string {
  const found = list.find((s) => s.no === no)
  return found && found.name !== '' ? `#${no} ${found.name}` : `#${no}`
}
