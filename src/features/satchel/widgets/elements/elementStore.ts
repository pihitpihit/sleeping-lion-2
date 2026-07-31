import { create } from 'zustand'
import { nextElementState, type ElementState } from './elements'

/**
 * 원소 상태 — **도구 런타임이다.**
 *
 * SPEC 5.2에 따라 메모리에만 둔다. `persist` 금지, `localStorage` 금지.
 * 새로고침하면 전부 꺼짐으로 돌아가는 것이 의도된 동작이다. 위젯 배치(사용자
 * 설정)와는 성격이 다르다.
 *
 * 인스턴스별로 나눠 갖는다. 지금은 트래커가 하나뿐이지만 스토어가 그 가정에
 * 기대지 않게 한다.
 */

type ElementMap = Record<string, ElementState>

interface ElementTrackerState {
  byInstance: Record<string, ElementMap>
  stateOf: (instanceId: string, elementId: string) => ElementState
  setState: (instanceId: string, elementId: string, state: ElementState) => void
  advance: (instanceId: string, elementId: string) => void
  reset: (instanceId: string) => void
}

export const useElementStore = create<ElementTrackerState>((set, get) => ({
  byInstance: {},

  stateOf: (instanceId, elementId) => get().byInstance[instanceId]?.[elementId] ?? 'inert',

  setState: (instanceId, elementId, state) =>
    set((s) => ({
      byInstance: {
        ...s.byInstance,
        [instanceId]: { ...s.byInstance[instanceId], [elementId]: state },
      },
    })),

  advance: (instanceId, elementId) => {
    const current = get().stateOf(instanceId, elementId)
    get().setState(instanceId, elementId, nextElementState(current))
  },

  reset: (instanceId) =>
    set((s) => {
      const next = { ...s.byInstance }
      delete next[instanceId]
      return { byInstance: next }
    }),
}))
