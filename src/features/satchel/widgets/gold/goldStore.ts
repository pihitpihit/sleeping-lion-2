import { create } from 'zustand'
import { MIN_GOLD, stepGold } from './gold'

/**
 * 주운 금화 — 도구 런타임 상태.
 *
 * SPEC 5.2에 따라 메모리에 둔다. `persist` 금지, `localStorage` 금지 —
 * 판이 끝나면 남지 않는다. 새로고침을 견디고 파티원과 나누는 것은
 * `runtime/snapshot.ts`가 맡는다.
 *
 * **자리마다 따로 센다(HP/XP와 같다).** 금화는 사람이 줍는 것이라 사람마다
 * 다르다 — 원소·라운드가 상 위에 하나뿐인 것과 반대다.
 */
interface GoldState {
  /** 자리 열쇠 → 주운 수. 없으면 0. */
  bySlot: Record<string, number>
  /**
   * 그 자리의 값. 없으면 0.
   *
   * **이름을 `valueOf`로 두지 않는다.** `Object.prototype.valueOf`와 부딪혀
   * 타입이 어긋난다 — 스토어를 `set`에 넘길 때 걸린다.
   */
  amountOf: (slot: string) => number
  adjust: (slot: string, delta: number) => void
  /** 뜬 판을 통째로 앉힌다(`runtime/snapshot.ts`). */
  hydrate: (bySlot: Record<string, number>) => void
}

export const useGoldStore = create<GoldState>((set, get) => ({
  bySlot: {},

  amountOf: (slot) => get().bySlot[slot] ?? MIN_GOLD,

  adjust: (slot, delta) =>
    set((s) => ({
      bySlot: { ...s.bySlot, [slot]: stepGold(s.bySlot[slot] ?? MIN_GOLD, delta) },
    })),

  hydrate: (bySlot) => set({ bySlot }),
}))
