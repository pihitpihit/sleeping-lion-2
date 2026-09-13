import { create } from 'zustand'
import type { ScenarioState, StoredState } from './scenarioState'
import { listScenarioStates, listScenarios, setScenarioState, type Scenario } from './scenarioNet'

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

  load: (campaignId: string, force?: boolean) => Promise<void>
  set: (no: number, state: ScenarioState) => Promise<void>
}

export const useScenarioStore = create<ScenarioStoreState>((set, get) => ({
  list: [],
  listed: false,
  campaignId: null,
  states: {},
  loaded: false,
  error: null,

  load: async (campaignId, force = false) => {
    if (get().campaignId === campaignId && get().loaded && !force) return
    set({ campaignId })
    try {
      // 목록은 한 번만. 상태는 기록지가 바뀔 때마다.
      const [list, states] = await Promise.all([
        get().listed ? Promise.resolve(get().list) : listScenarios(),
        listScenarioStates(campaignId),
      ])
      if (get().campaignId !== campaignId) return
      set({ list, listed: true, states, loaded: true, error: null })
    } catch (cause) {
      console.error('[scenarios]', cause)
      set({ loaded: true })
    }
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
    }
  },
}))
