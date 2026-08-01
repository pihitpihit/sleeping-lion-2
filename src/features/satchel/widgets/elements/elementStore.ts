import { create } from 'zustand'
import { nextElementState, type ElementState } from './elements'

/**
 * 원소 상태 — **도구 런타임이다.**
 *
 * SPEC 5.2에 따라 메모리에만 둔다. `persist` 금지, `localStorage` 금지.
 * 새로고침하면 전부 꺼짐으로 돌아가는 것이 의도된 동작이다. 위젯 배치(사용자
 * 설정)와는 성격이 다르다.
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ **행낭 전체에 하나뿐이다.** 트래커를 몇 개 놓든 같은 것을 본다.            │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * 처음에는 인스턴스별로 나눠 가졌다. 실물을 생각하면 틀렸다 — 식탁 위 원소판은
 * 하나이고, 트래커 위젯은 그것을 비추는 창일 뿐이다. 한 위젯에서 불이 타오르는데
 * 다른 위젯에서 꺼져 있으면 어느 쪽이 판의 상태인지 알 수 없다.
 *
 * 그래서 위젯을 여럿 놓는 뜻도 달라진다 — 서로 다른 상태를 보려는 것이 아니라
 * **같은 상태를 다른 자리·다른 방향에서 보려는 것**이다. 태블릿을 가운데 두고
 * 마주 앉는 경우이며, 위젯 회전과 짝을 이룬다.
 */

interface ElementTrackerState {
  /** 원소 id → 상태. 없으면 꺼짐. */
  elements: Record<string, ElementState>
  stateOf: (elementId: string) => ElementState
  setState: (elementId: string, state: ElementState) => void
  advance: (elementId: string) => void
  /** 전부 꺼짐으로. */
  resetAll: () => void
}

export const useElementStore = create<ElementTrackerState>((set, get) => ({
  elements: {},

  stateOf: (elementId) => get().elements[elementId] ?? 'inert',

  setState: (elementId, state) => set((s) => ({ elements: { ...s.elements, [elementId]: state } })),

  advance: (elementId) => {
    get().setState(elementId, nextElementState(get().stateOf(elementId)))
  },

  resetAll: () => set({ elements: {} }),
}))
