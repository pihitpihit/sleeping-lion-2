import { create } from 'zustand'
import type { ScenarioState, StoredState } from './scenarioState'
import {
  listScenarioGraph,
  listScenarioStates,
  listScenarios,
  setScenarioState,
  setScenarioStates,
  type Scenario,
} from './scenarioNet'
import type { ScenarioGraph } from './scenarioLinks'

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
   * 방금 완료로 바뀐 시나리오. 화면이 이것을 보고 「무엇이 열리는가」를 권한다
   * (`ScenarioOutcomePrompt`). 권할 것을 다 보였으면 비운다.
   */
  pending: number | null

  load: (campaignId: string, force?: boolean) => Promise<void>
  /** 권한 것을 한 번에 적는다. 닫힘으로 되돌리는 일은 없다. */
  apply: (entries: readonly { no: number; state: StoredState }[]) => Promise<void>
  markPending: (no: number | null) => void
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
  pending: null,

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

  markPending: (no) => set({ pending: no }),

  set: async (no, state) => {
    const campaignId = get().campaignId
    if (campaignId === null) return

    // 손끝에서 먼저 바꾸고 서버가 뒤따른다(구현 결정 445).
    const before = get().states
    const next = { ...before }
    if (state === 'closed') delete next[no]
    else next[no] = state
    set({ states: next, error: null })

    // 완료로 **바뀐** 때만 권한다 — 완료를 다시 눌렀다고 또 뜨면 귀찮다.
    if (state === 'done' && before[no] !== 'done') set({ pending: no })

    try {
      await setScenarioState(campaignId, no, state === 'closed' ? null : state)
    } catch (cause) {
      console.error('[scenarios]', cause)
      set({ states: before, error: '시나리오 상태를 바꾸지 못했다.' })
      if (get().pending === no) set({ pending: null })
    }
  },
}))
