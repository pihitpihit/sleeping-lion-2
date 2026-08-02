import { create } from 'zustand'
import { useElementStore } from '../elements/elementStore'

/**
 * 라운드 — **도구 런타임이다.**
 *
 * SPEC 5.2에 따라 메모리에만 둔다. `persist` 금지, `localStorage` 금지.
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ **행낭 전체에 하나뿐이다.** 원소 트래커와 같다.                           │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * 라운드는 판의 사실이지 사람의 것이 아니다. 트래커를 둘 놓았는데 하나는 3라운드,
 * 다른 하나는 5라운드일 수 없다. 체력·경험이 사람마다 다른 것과 반대다.
 *
 * 넘길 때 **원소를 함께 내린다.** 두 스토어를 잇는 유일한 자리이며, 여기 두는
 * 이유는 라운드가 넘어가는 것과 원소가 내려가는 것이 실물에서 한 동작이기
 * 때문이다 — 화면 쪽에 두면 트래커를 두 개 놓았을 때 어느 쪽이 내리는지 흐려진다.
 */

/** 실물처럼 1부터 센다. 0라운드는 없다. */
export const FIRST_ROUND = 1

/**
 * 띠에 담을 마지막 숫자.
 *
 * 규칙이 정한 상한이 아니라 **띠의 길이**다. 이만큼 가는 판은 이미 끝난 판이다.
 */
export const MAX_ROUND = 99

interface RoundState {
  round: number
  /** 다음 라운드로. 원소가 한 단계씩 내려간다. */
  advance: () => void
  /** 첫 라운드로 되돌린다. 원소는 건드리지 않는다 — 원소는 원소대로 지운다. */
  reset: () => void
}

export const useRoundStore = create<RoundState>((set, get) => ({
  round: FIRST_ROUND,

  advance: () => {
    if (get().round >= MAX_ROUND) return
    set({ round: get().round + 1 })
    useElementStore.getState().decayAll()
  },

  reset: () => set({ round: FIRST_ROUND }),
}))
