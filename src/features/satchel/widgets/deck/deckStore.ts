import { create } from 'zustand'
import {
  createDeck,
  drawOne,
  freshDeck,
  needsShuffle,
  reshuffle,
  STANDARD_COMPOSITION,
  type Card,
  type DeckComposition,
  type DeckState,
} from './deck'

/**
 * 공격 보정 덱의 상태 — **도구 런타임이다.**
 *
 * SPEC 5.2에 따라 메모리에만 둔다. `persist` 금지, `localStorage` 금지.
 * 새로고침하면 덱이 처음으로 돌아가는 것이 의도된 동작이다. **덱 구성**(어떤
 * 카드를 몇 장 넣는가)은 성격이 달라 위젯 설정에 남는다 — `settings.ts` 참조.
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ **HP/XP와 같이 인스턴스마다 따로 갖는다. 원소·라운드와 반대다.**          │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * 식탁 위 원소판은 하나뿐이라 모든 트래커가 같은 것을 비춰야 했다. 보정 덱은
 * **사람마다 자기 것을 가진다** — 실물에서도 1·2·3·4번 덱을 각자 하나씩 고르고
 * 몬스터는 M을 쓴다. 넷이 앉으면 덱도 넷이고, 한 사람이 뽑았다고 옆자리 덱이
 * 함께 줄면 안 된다.
 *
 * 위젯을 치워도 값을 지우지 않는다. 되돌리기로 다시 놓으면 뽑던 자리가 그대로
 * 돌아온다 — HP/XP와 같은 이유다.
 */

/** 아직 아무것도 뽑지 않은 덱. 표기용이며 실제로 뽑기 전에 섞는다. */
const UNTOUCHED: DeckState = freshDeck(STANDARD_COMPOSITION)

interface AttackDeckState {
  byInstance: Record<string, DeckState>

  /** 저장된 것이 없으면 섞지 않은 기본 덱을 돌려준다. 장수 표기는 이미 맞는다. */
  stateOf: (instanceId: string) => DeckState

  /**
   * 맨 위 한 장을 공개한다. 덱이 비었으면 저절로 섞고 나서 뽑는다.
   *
   * 구성을 함께 받는다 — 처음 뽑는 순간 그 구성으로 덱을 만들어야 하기 때문이다.
   *
   * **뽑은 카드를 돌려준다.** 화면이 그것을 크게 한 번 보여주기 때문이다. 스토어를
   * 다시 읽어 가장 최근 것을 꺼내도 되지만, 그러면 "방금 이 조작으로 나온 카드"와
   * "지금 맨 위에 있는 카드"가 같다는 보장이 코드에 남지 않는다.
   */
  reveal: (instanceId: string, composition: DeckComposition) => Card | null

  /** 손으로 섞는다. 공개돼 있던 카드도 함께 되돌아간다. */
  shuffleNow: (instanceId: string, composition: DeckComposition) => void

  /**
   * 라운드가 넘어갈 때 — **섞기 표시가 뜬 덱만** 섞는다.
   *
   * 표시가 없는 덱은 건드리지 않는다. 라운드가 지났다고 멀쩡한 덱을 섞으면
   * 세어 둔 것이 날아간다.
   */
  shuffleMarked: () => void

  /** 판을 새로 시작할 때 — 전부 처음으로. 구성은 다음에 뽑을 때 다시 읽는다. */
  resetAll: () => void

  /** 이 인스턴스만 처음으로. */
  reset: (instanceId: string) => void

  /** 뜬 판을 통째로 앉힌다. */
  hydrate: (byInstance: Record<string, DeckState>) => void
}

export const useAttackDeckStore = create<AttackDeckState>((set, get) => ({
  byInstance: {},

  stateOf: (instanceId) => get().byInstance[instanceId] ?? UNTOUCHED,

  reveal: (instanceId, composition) => {
    // 처음 뽑는 것이면 이 자리에서 덱을 만들어 섞는다. 미리 만들어 두지 않는
    // 이유는 구성이 퍽에 따라 달라지기 때문이다 — 놓는 순간이 아니라 뽑는
    // 순간의 구성이 맞다.
    const current = get().byInstance[instanceId] ?? createDeck(Math.random, composition)
    const result = drawOne(current, Math.random)
    set((s) => ({ byInstance: { ...s.byInstance, [instanceId]: result.state } }))
    return result.card
  },

  shuffleNow: (instanceId, composition) =>
    set((s) => {
      const current = s.byInstance[instanceId]
      const next = current ? reshuffle(current, Math.random) : createDeck(Math.random, composition)
      return { byInstance: { ...s.byInstance, [instanceId]: next } }
    }),

  shuffleMarked: () =>
    set((s) => {
      let touched = false
      const next: Record<string, DeckState> = {}
      for (const [instanceId, deck] of Object.entries(s.byInstance)) {
        if (needsShuffle(deck)) {
          next[instanceId] = reshuffle(deck, Math.random)
          touched = true
        } else {
          next[instanceId] = deck
        }
      }
      // 바뀐 것이 없으면 같은 객체를 돌려준다 — 괜한 렌더를 만들지 않는다.
      return touched ? { byInstance: next } : s
    }),

  resetAll: () => set({ byInstance: {} }),

  reset: (instanceId) =>
    set((s) => {
      if (!(instanceId in s.byInstance)) return s
      const next = { ...s.byInstance }
      delete next[instanceId]
      return { byInstance: next }
    }),

  hydrate: (byInstance) => set({ byInstance }),
}))
