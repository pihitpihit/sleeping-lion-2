import { create } from 'zustand'
import { useElementStore } from '../elements/elementStore'
import { useAttackDeckStore } from '../deck/deckStore'

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
  /**
   * 판을 새로 시작한다 — 첫 라운드로 가고 **원소도 모두 끈다.**
   *
   * 처음에는 라운드만 되돌리고 원소는 두려 했다. 실물을 생각하면 틀렸다 —
   * 새 시나리오를 펴면 라운드 표식이 1로 가고 원소판도 비어 있다. 라운드만
   * 1로 가 있는데 불이 타오르고 있으면 어느 것이 판의 상태인지 알 수 없다.
   *
   * 라운드와 원소를 잇는 자리가 이미 여기이므로 함께 둔다.
   */
  restart: () => void
  /**
   * 뜬 판의 라운드를 그대로 앉힌다(`runtime/snapshot.ts`).
   *
   * **`advance`를 되풀이하지 않는다.** `advance`는 원소를 하강시키고 덱을
   * 섞으므로(구현 결정 34), 5라운드를 복원하려고 네 번 부르면 원소가 다 꺼지고
   * 덱이 네 번 섞인다. 복원은 판을 굴리는 것이 아니라 옮겨 놓는 것이다.
   */
  hydrate: (round: number) => void
}

export const useRoundStore = create<RoundState>((set, get) => ({
  round: FIRST_ROUND,

  advance: () => {
    if (get().round >= MAX_ROUND) return
    set({ round: get().round + 1 })
    useElementStore.getState().decayAll()
    // 섞기 표시가 뜬 보정 덱만 섞인다. 표시가 없는 덱은 건드리지 않는다.
    useAttackDeckStore.getState().shuffleMarked()
  },

  restart: () => {
    set({ round: FIRST_ROUND })
    useElementStore.getState().resetAll()
    // 새 시나리오를 펴면 보정 덱도 처음으로 돌아간다 — 원소를 끄는 것과 같은 이유다.
    useAttackDeckStore.getState().resetAll()
  },

  hydrate: (round) => set({ round: Math.min(MAX_ROUND, Math.max(FIRST_ROUND, round)) }),
}))
