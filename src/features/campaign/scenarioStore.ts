import { create } from 'zustand'
import { stateOf, type ScenarioState, type StoredState } from './scenarioState'
import {
  listScenarioGraph,
  listScenarioStates,
  listScenarios,
  setScenarioState,
  setScenarioStates,
  type Scenario,
} from './scenarioNet'
import {
  achievementHave,
  outcomeOf,
  hasOutcome,
  type AchievementHave,
  type Outcome,
  type ScenarioGraph,
} from './scenarioLinks'

/** 완료하면서 저절로 바꾼 것 — 무엇이 어떻게 바뀌었고, 되돌리면 무엇으로 가는가. */
export interface DoneReport {
  readonly no: number
  readonly outcome: Outcome
  /**
   * 업적 보상을 기록지에 담았는가. `pending`이면 화면이 담고(`ScenarioOutcomePrompt`)
   * 결과를 적는다. 편집 중이면 초안과 어긋나므로 안 담는다(`skipped`).
   */
  readonly ach: 'none' | 'pending' | 'applied' | 'skipped' | 'failed'
  /** 담기 전의 업적 — 되돌릴 때 쓴다. */
  readonly achBefore?: { party: readonly string[]; global: Readonly<Record<string, number>> }
  readonly applied: readonly {
    readonly no: number
    readonly to: StoredState
    readonly from: ScenarioState
  }[]
}

/**
 * 시나리오 목록과 상태.
 *
 * 목록은 **한 번 읽으면 그만**이다(모두가 같은 표를 본다). 상태는 기록지마다
 * 다르므로 기록지를 펼칠 때 읽는다.
 *
 * 못 읽어도 화면은 선다(절대 원칙 3) — 그때는 고를 목록이 없고 손으로 적는다.
 */
interface ScenarioStoreState {
  list: Scenario[]
  listed: boolean
  campaignId: string | null
  states: Record<number, StoredState>
  loaded: boolean
  error: string | null
  /** 시나리오끼리의 연결(`0049`). 못 읽었으면 `null` — 그때는 아무것도 권하지 않는다. */
  graph: ScenarioGraph | null
  /**
   * 방금 완료하면서 바뀐 것. 화면이 이것을 보고 알린다(`ScenarioOutcomePrompt`).
   * 다 보였으면 비운다.
   */
  report: DoneReport | null
  /** 기록지에 저장된 업적(이름). 완료할 때 업적 조건까지 셈하는 데 쓴다. */
  achievements: { party: readonly string[]; global: Readonly<Record<string, number>> } | null

  load: (campaignId: string, force?: boolean) => Promise<void>
  /** 권한 것을 한 번에 적는다. 닫힘으로 되돌리는 일은 없다. */
  apply: (entries: readonly { no: number; state: StoredState }[]) => Promise<void>
  /** 완료하면서 저절로 바꾼 것을 되돌린다. */
  undoReport: () => Promise<void>
  clearReport: () => void
  /** 업적을 담은 결과를 적는다. */
  markReportAch: (ach: DoneReport['ach'], before?: DoneReport['achBefore']) => void
  setAchievements: (party: readonly string[], global: Readonly<Record<string, number>>) => void
  /** 지금 가진 업적 — 열쇠로. 업적이나 연결을 모르면 `null`. */
  have: () => AchievementHave | null
  set: (no: number, state: ScenarioState) => Promise<void>
}

export const useScenarioStore = create<ScenarioStoreState>((set, get) => ({
  list: [],
  listed: false,
  campaignId: null,
  states: {},
  loaded: false,
  error: null,
  graph: null,
  report: null,
  achievements: null,

  load: async (campaignId, force = false) => {
    if (get().campaignId === campaignId && get().loaded && !force) return
    set({ campaignId })
    try {
      // 목록은 한 번만. 상태는 기록지가 바뀔 때마다.
      const [list, states, graph] = await Promise.all([
        get().listed ? Promise.resolve(get().list) : listScenarios(),
        listScenarioStates(campaignId),
        get().graph !== null ? Promise.resolve(get().graph) : listScenarioGraph().catch(() => null),
      ])
      if (get().campaignId !== campaignId) return
      set({ list, listed: true, states, graph, loaded: true, error: null })
    } catch (cause) {
      console.error('[scenarios]', cause)
      set({ loaded: true })
    }
  },

  apply: async (entries) => {
    const campaignId = get().campaignId
    if (campaignId === null || entries.length === 0) return
    const before = get().states
    const next = { ...before }
    for (const { no, state } of entries) next[no] = state
    set({ states: next, error: null })
    try {
      await setScenarioStates(campaignId, entries)
    } catch (cause) {
      console.error('[scenarios]', cause)
      set({ states: before, error: '시나리오 상태를 바꾸지 못했다.' })
    }
  },

  undoReport: async () => {
    const report = get().report
    const campaignId = get().campaignId
    set({ report: null })
    if (report === null || campaignId === null || report.applied.length === 0) return
    const before = get().states
    const next = { ...before }
    for (const { no, from } of report.applied) {
      if (from === 'closed') delete next[no]
      else next[no] = from
    }
    set({ states: next, error: null })
    try {
      for (const { no, from } of report.applied) {
        await setScenarioState(campaignId, no, from === 'closed' ? null : from)
      }
    } catch (cause) {
      console.error('[scenarios]', cause)
      // 어디까지 되돌렸는지 알 수 없다 — 서버에서 다시 읽는다.
      set({ error: '되돌리지 못했다. 다시 읽는다.' })
      await get().load(campaignId, true)
    }
  },

  clearReport: () => set({ report: null }),

  markReportAch: (ach, before) =>
    set((s) => (s.report ? { report: { ...s.report, ach, achBefore: before } } : {})),

  setAchievements: (party, global) => set({ achievements: { party, global } }),

  have: () => {
    const { graph, achievements } = get()
    if (graph === null || achievements === null) return null
    return achievementHave(graph, achievements.party, achievements.global)
  },

  set: async (no, state) => {
    const campaignId = get().campaignId
    if (campaignId === null) return

    // 손끝에서 먼저 바꾸고 서버가 뒤따른다(구현 결정 445).
    const before = get().states
    const next = { ...before }
    if (state === 'closed') delete next[no]
    else next[no] = state
    set({ states: next, error: null })

    try {
      await setScenarioState(campaignId, no, state === 'closed' ? null : state)
    } catch (cause) {
      console.error('[scenarios]', cause)
      set({ states: before, error: '시나리오 상태를 바꾸지 못했다.' })
      return
    }

    /*
      ┌──────────────────────────────────────────────────────────────────────┐
      │ **완료로 바뀌면 열 것·막을 것을 저절로 바꾼다**(형님이 정했다).       │
      └──────────────────────────────────────────────────────────────────────┘
      권하기만 하던 것을 바꿨다(구현 결정 647) — 대개는 다 맞아서 「적용」을 누르는
      일만 남았고, 누르지 않고 닫으면 그대로 빠졌다(놓친 해금이 그렇게 생겼다).
      **업적 조건까지 셈할 수 있게 된 뒤에** 바꿨다 — 연결만 보고 열면 업적이 모자란
      곳까지 열린다. 대신 무엇을 바꿨는지 알리고 **되돌리기**를 함께 낸다.
      하나를 고르는 갈림길은 파티가 정할 일이라 저절로 안 연다.
      완료로 **바뀐** 때만 — 완료를 다시 눌렀다고 또 바뀌면 안 된다.
    */
    const graph = get().graph
    if (state !== 'done' || before[no] === 'done' || graph === null) return
    const states = get().states
    const outcome = outcomeOf(graph, no, states, get().have())
    const entries = [
      ...outcome.opens.map((n) => ({ no: n, state: 'open' as const })),
      ...outcome.blocks.map((n) => ({ no: n, state: 'blocked' as const })),
    ]
    const planned = entries.map((e) => ({ no: e.no, to: e.state, from: stateOf(states, e.no) }))
    if (entries.length > 0) await get().apply(entries)
    // 적기에 실패하면 `apply`가 되돌린다 — 그때 「바꿨다」고 알리면 거짓이다.
    const now = get().states
    const applied = planned.every((e) => now[e.no] === e.to) ? planned : []
    if (hasOutcome(outcome)) {
      set({
        report: { no, outcome, applied, ach: outcome.achRewards.length > 0 ? 'pending' : 'none' },
      })
    }
  },
}))
