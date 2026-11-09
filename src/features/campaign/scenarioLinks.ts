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
  /** 업적 조건·보상과 열쇠↔이름(`0054`·`0055`). 못 읽었으면 비어 있다. */
  readonly ach: AchievementData
}

export type AchievementScope = 'global' | 'party'

export interface AchievementReq {
  readonly scope: AchievementScope
  readonly code: string
  /** 이 업적이 **없어야** 한다. */
  readonly negate: boolean
  /** 되풀이해 이루는 전역 업적의 횟수. */
  readonly count: number
}

export interface AchievementReward {
  readonly scope: AchievementScope
  readonly code: string
  readonly lose: boolean
}

export interface AchievementData {
  /** 번호 → 조건 묶음들. 묶음 안은 모두, 묶음끼리는 하나라도. */
  readonly reqs: ReadonlyMap<number, readonly (readonly AchievementReq[])[]>
  readonly rewards: ReadonlyMap<number, readonly AchievementReward[]>
  /** `scope:code` → 우리 목록의 이름. */
  readonly names: ReadonlyMap<string, string>
}

const NO_ACH: AchievementData = { reqs: new Map(), rewards: new Map(), names: new Map() }

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
  ach: AchievementData = NO_ACH,
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

  return { out, unlockedBy, requires: req, ach }
}

/** 표에서 읽은 줄로 업적 자료를 묶는다. 묶음 번호 차례로 세운다. */
export function buildAchievementData(
  reqs: readonly ({ no: number; alt: number } & AchievementReq)[],
  rewards: readonly ({ no: number } & AchievementReward)[],
  names: readonly { scope: AchievementScope; code: string; name: string }[],
): AchievementData {
  const byNo = new Map<number, Map<number, AchievementReq[]>>()
  for (const { no, alt, scope, code, negate, count } of reqs) {
    const alts = byNo.get(no) ?? new Map<number, AchievementReq[]>()
    const group = alts.get(alt) ?? []
    group.push({ scope, code, negate, count })
    alts.set(alt, group)
    byNo.set(no, alts)
  }
  const reqMap = new Map<number, AchievementReq[][]>()
  for (const [no, alts] of byNo) {
    reqMap.set(
      no,
      [...alts.entries()].sort(([a], [b]) => a - b).map(([, g]) => g),
    )
  }
  const rewardMap = new Map<number, AchievementReward[]>()
  for (const { no, scope, code, lose } of rewards) {
    const list = rewardMap.get(no) ?? []
    list.push({ scope, code, lose })
    rewardMap.set(no, list)
  }
  return {
    reqs: reqMap,
    rewards: rewardMap,
    names: new Map(names.map((n) => [`${n.scope}:${n.code}`, n.name])),
  }
}

/** 파티가 가진 업적 — 열쇠로. 전역 업적은 몇 번 이뤘는지까지. */
export interface AchievementHave {
  readonly party: ReadonlySet<string>
  readonly global: ReadonlyMap<string, number>
}

/** 이름 견주기 — 공백·대소문자·자모 갈림을 접는다(`searchFold`와 같은 눈). */
function foldName(name: string): string {
  return name.replace(/\s+/g, '').normalize('NFC').toLowerCase()
}

/**
 * 기록지에 이름으로 담긴 업적을 열쇠로 옮긴다. **열쇠가 없는 이름(사람이 새로 적은
 * 업적)은 셈에서 빠진다** — 시나리오 조건이 가리킬 수 없는 것이라 빠져도 같다.
 */
export function achievementHave(
  graph: ScenarioGraph,
  party: readonly string[],
  global: Readonly<Record<string, number>>,
): AchievementHave {
  const byName = new Map<string, string>()
  for (const [key, name] of graph.ach.names) byName.set(foldName(name), key)
  const codeOf = (scope: AchievementScope, name: string) => {
    const key = byName.get(foldName(name))
    return key?.startsWith(`${scope}:`) ? key.slice(scope.length + 1) : null
  }
  const partySet = new Set<string>()
  for (const name of party) {
    const code = codeOf('party', name)
    if (code) partySet.add(code)
  }
  const globalMap = new Map<string, number>()
  for (const [name, n] of Object.entries(global)) {
    const code = codeOf('global', name)
    if (code && n > 0) globalMap.set(code, n)
  }
  return { party: partySet, global: globalMap }
}

/** 이 시나리오를 깨면 업적이 어떻게 되는가 — 얻을 것은 얻고 잃을 것은 잃은 뒤. */
function afterRewards(graph: ScenarioGraph, no: number, have: AchievementHave): AchievementHave {
  const rewards = graph.ach.rewards.get(no)
  if (!rewards) return have
  const party = new Set(have.party)
  const global = new Map(have.global)
  for (const r of rewards) {
    if (r.scope === 'party') {
      if (r.lose) party.delete(r.code)
      else party.add(r.code)
    } else if (r.lose) global.delete(r.code)
    else global.set(r.code, (global.get(r.code) ?? 0) + 1)
  }
  return { party, global }
}

function holds(req: AchievementReq, have: AchievementHave): boolean {
  const n =
    req.scope === 'party' ? (have.party.has(req.code) ? 1 : 0) : (have.global.get(req.code) ?? 0)
  return req.negate ? n === 0 : n >= req.count
}

/** 업적 조건을 보면 이 시나리오가 어떤가. */
export type AchievementVerdict =
  | { readonly kind: 'ok' }
  /** 가진 전역 업적이 「없어야 한다」에 걸린다 — 전역 업적은 잃지 않으므로 영영 못 한다. */
  | { readonly kind: 'blocked' }
  /** 아직 모자라다 — 묶음마다 걸리는 조건. */
  | { readonly kind: 'missing'; readonly missing: readonly (readonly AchievementReq[])[] }

export function achievementVerdict(
  graph: ScenarioGraph,
  no: number,
  have: AchievementHave,
): AchievementVerdict {
  const alts = graph.ach.reqs.get(no)
  if (!alts || alts.length === 0) return { kind: 'ok' }
  const failing = alts.map((g) => g.filter((r) => !holds(r, have)))
  if (failing.some((g) => g.length === 0)) return { kind: 'ok' }
  const dead = (g: readonly AchievementReq[]) => g.some((r) => r.negate && r.scope === 'global')
  if (failing.every(dead)) return { kind: 'blocked' }
  return { kind: 'missing', missing: failing.filter((g) => !dead(g)) }
}

/** 업적 조건 하나를 사람의 말로 — 「상인 도주」 없음, 「오염 종식」 ×3. */
export function achievementReqText(graph: ScenarioGraph, req: AchievementReq): string {
  const name = graph.ach.names.get(`${req.scope}:${req.code}`) ?? req.code
  if (req.negate) return `「${name}」 없음`
  return req.count > 1 ? `「${name}」 ×${req.count}` : `「${name}」`
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
  /** 열어 주긴 했는데 선행이나 업적이 모자라 아직 못 여는 것. */
  readonly waiting: readonly {
    readonly no: number
    readonly missing: readonly (readonly number[])[]
    /** 모자란 업적 조건 — 묶음끼리는 「또는」. */
    readonly achMissing?: readonly (readonly AchievementReq[])[]
  }[]
  /** 이것을 깨면 얻는 업적·잃는 업적의 이름. 기록지에 담는 것은 사람이 한다. */
  readonly gains: readonly string[]
  readonly losses: readonly string[]
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
  /**
   * 파티가 지금 가진 업적. **주면 업적 조건까지 본다** — 이 시나리오의 보상을 받은
   * 뒤의 것으로 셈한다(#8을 깨 얻는 업적이 #9를 막는 것처럼). 안 주면 연결만 본다.
   */
  have: AchievementHave | null = null,
): Outcome {
  const done = doneSet(states)
  done.add(no)
  const mine = linksOf(graph, no)
  const after = have === null ? null : afterRewards(graph, no, have)

  /* 이것이 열어 주는 것 + 이것을 선행으로 갖는 것(그것을 열어 준 것은 이미 완료). */
  const candidates = new Set<number>(mine.unlocks)
  for (const [target, groups] of graph.requires) {
    if (groups.some((g) => g.includes(no))) candidates.add(target)
  }

  const opens: number[] = []
  const achBlocks: number[] = []
  const waiting: Outcome['waiting'][number][] = []
  for (const target of [...candidates].sort((a, b) => a - b)) {
    if (target === no || stateOf(states, target) !== 'closed') continue
    const unlocked = (graph.unlockedBy.get(target) ?? []).some((by) => done.has(by))
    if (!unlocked) continue
    if (blockedBy(graph, target, done)) continue
    const missing = missingRequires(graph, target, done)
    const verdict: AchievementVerdict =
      after === null ? { kind: 'ok' } : achievementVerdict(graph, target, after)
    if (verdict.kind === 'blocked') {
      // 열렸지만 가진 업적이 「없어야 한다」에 걸려 영영 못 한다 — 막힘으로 권한다.
      achBlocks.push(target)
    } else if (missing.length === 0 && verdict.kind === 'ok') {
      opens.push(target)
    } else if (mine.unlocks.includes(target)) {
      waiting.push({
        no: target,
        missing,
        ...(verdict.kind === 'missing' ? { achMissing: verdict.missing } : {}),
      })
    }
  }

  /*
    **얻은 업적이 이미 열린 것을 막을 수도 있다.** 열려 있는 것 가운데 이 보상 전에는
    괜찮았는데 보상 뒤에 영영 못 하게 된 것을 막힘으로 권한다.
  */
  if (have !== null && after !== null) {
    for (const [s, state] of Object.entries(states)) {
      const target = Number(s)
      if (state !== 'open' || target === no) continue
      if (
        achievementVerdict(graph, target, after).kind === 'blocked' &&
        achievementVerdict(graph, target, have).kind !== 'blocked'
      ) {
        achBlocks.push(target)
      }
    }
  }

  const blocks = [
    ...new Set([
      ...mine.blocks.filter((t) => {
        const s = stateOf(states, t)
        return s !== 'done' && s !== 'blocked'
      }),
      ...achBlocks,
    ]),
  ].sort((a, b) => a - b)
  const choose = mine.choose.filter((t) => stateOf(states, t) === 'closed')
  const links = mine.links.filter((t) => stateOf(states, t) !== 'done')

  const nameOf = (r: AchievementReward) => graph.ach.names.get(`${r.scope}:${r.code}`) ?? r.code
  const rewards = graph.ach.rewards.get(no) ?? []
  const gains = rewards.filter((r) => !r.lose).map(nameOf)
  const losses = rewards.filter((r) => r.lose).map(nameOf)

  return { opens, blocks, choose, waiting, links, gains, losses }
}

/** 권할 것이 하나라도 있는가. 바꿀 것이 없으면 팝업을 안 띄운다. */
export function hasOutcome(outcome: Outcome): boolean {
  return (
    outcome.opens.length > 0 ||
    outcome.blocks.length > 0 ||
    outcome.choose.length > 0 ||
    outcome.gains.length > 0 ||
    outcome.losses.length > 0
  )
}

/** 번호에 이름을 붙인다. 목록에 없으면 번호만 — 목록을 못 읽는 자리도 있다. */
export function scenarioName(
  no: number,
  list: readonly { readonly no: number; readonly name: string }[],
): string {
  const found = list.find((s) => s.no === no)
  return found && found.name !== '' ? `#${no} ${found.name}` : `#${no}`
}

/** 세계 지도에서 누른 스티커에 그릴 화살표. */
export interface MapArrows {
  /** 깨서 실제로 열린 곳(완료한 것만). */
  readonly out: readonly number[]
  /** 이것을 열어 준 곳. */
  readonly in: readonly number[]
  /** 깨서 실제로 막힌 곳(완료한 것만). */
  readonly blocks: readonly number[]
}

const NO_ARROWS: MapArrows = { out: [], in: [], blocks: [] }

/**
 * 누른 시나리오의 화살표(형님이 정했다).
 *
 * * **나감은 완료한 것만** — 깨서 실제로 열린 곳이다. 열기·고르기가 가리키는 곳 중
 *   지금 닫혀 있지 않은 것만 잇는다: 아직 안 연 곳(권함을 안 받았거나 고르기에서 안
 *   고른 곳)으로 그으면 「이것 때문에 열렸다」가 거짓이 된다.
 * * **들어옴은 시작 시나리오가 아닐 때** — 이 시나리오를 열어 줄 수 있는 것들이다.
 *   그중 완료한 것이 있으면 그것만 긋는다: 실제로 열어 준 쪽이다. 하나도 없으면
 *   (손으로 열어 둔 것) 열어 줄 수 있는 것을 다 긋는다 — 어디서 오는 길인지는 보인다.
 *
 * * **막힘도 완료한 것만, 실제로 막힌 것만** — 나감과 같은 결이다.
 * * **안 깬 것에서는 아무것도 나가지 않는다**(형님이 정했다). 「깨면 열림·막힘」을
 *   옅은 화살표로 그었다가 걷었다 — 일어난 일과 일어날 일이 한 지도에 섞이면 읽히지
 *   않는다. 그것은 시나리오 칸의 카드가 적는다.
 *
 * `links`(이어서 하기)는 여는 것이 아니라 잇지 않는다.
 */
export function arrowsOf(
  graph: ScenarioGraph | null,
  no: number,
  states: Record<number, StoredState>,
  initial: boolean,
): MapArrows {
  if (graph === null) return NO_ARROWS
  const opens = (row: Readonly<Record<LinkKind, readonly number[]>> | undefined) => [
    ...(row?.unlocks ?? []),
    ...(row?.choose ?? []),
  ]

  const isDone = stateOf(states, no) === 'done'
  const out = isDone
    ? [...new Set(opens(graph.out.get(no)))]
        .filter((to) => to !== no && stateOf(states, to) !== 'closed')
        .sort((a, b) => a - b)
    : []
  const blocks = isDone
    ? (graph.out.get(no)?.blocks ?? []).filter(
        (to) => to !== no && stateOf(states, to) === 'blocked',
      )
    : []

  let into: number[] = []
  if (!initial) {
    const sources: number[] = []
    for (const [from, row] of graph.out) {
      if (from !== no && opens(row).includes(no)) sources.push(from)
    }
    sources.sort((a, b) => a - b)
    const done = sources.filter((from) => stateOf(states, from) === 'done')
    into = done.length > 0 ? done : sources
  }

  return out.length + into.length + blocks.length === 0 ? NO_ARROWS : { out, in: into, blocks }
}
