import { create } from 'zustand'
import { INITIAL, clampValue, step, type HpXp, type HpXpTrack } from './hpxp'

/**
 * HP/XP 값 — **도구 런타임이다.**
 *
 * SPEC 5.2에 따라 메모리에만 둔다. `persist` 금지, `localStorage` 금지.
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ **원소 트래커와 반대로 인스턴스마다 따로 갖는다.**                        │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * 원소판은 식탁 위에 하나뿐이라 모든 트래커가 같은 것을 비춰야 했다. 체력과
 * 경험은 **사람마다 다르다.** 넷이 앉으면 다이얼도 넷이고, 한 사람의 피가 깎였다고
 * 옆자리가 함께 깎이면 안 된다.
 *
 * 위젯을 치워도 값을 지우지 않는다. 되돌리기(편집 모드)로 다시 놓으면 숫자가
 * 그대로 돌아온다 — 실수로 치웠을 때 판이 멈추지 않는다. 어차피 메모리 전용이라
 * 새로고침하면 사라지고, `instanceId`는 다시 쓰이지 않으므로 남아도 섞이지 않는다.
 */

interface HpXpState {
  byInstance: Record<string, HpXp>
  valuesOf: (instanceId: string) => HpXp
  adjust: (instanceId: string, track: HpXpTrack, delta: number) => void
  /**
   * 값을 곧바로 앉힌다 — 「최대 체력으로 되돌리기」가 쓴다.
   *
   * `adjust`로는 못 한다. 지금 값이 얼마인지 알아야 델타를 셈할 수 있는데,
   * **부르는 쪽이 그것을 알 까닭이 없다.**
   */
  setTrack: (instanceId: string, track: HpXpTrack, value: number) => void
  reset: (instanceId: string) => void
  /** 뜬 판을 통째로 앉힌다. */
  hydrate: (byInstance: Record<string, HpXp>) => void
}

export const useHpXpStore = create<HpXpState>((set, get) => ({
  byInstance: {},

  valuesOf: (instanceId) => get().byInstance[instanceId] ?? INITIAL,

  adjust: (instanceId, track, delta) =>
    set((s) => {
      const current = s.byInstance[instanceId] ?? INITIAL
      return {
        byInstance: {
          ...s.byInstance,
          [instanceId]: { ...current, [track]: step(current[track], delta) },
        },
      }
    }),

  setTrack: (instanceId, track, value) =>
    set((s) => {
      const current = s.byInstance[instanceId] ?? INITIAL
      return {
        byInstance: {
          ...s.byInstance,
          [instanceId]: { ...current, [track]: clampValue(value) },
        },
      }
    }),

  reset: (instanceId) =>
    set((s) => {
      const next = { ...s.byInstance }
      delete next[instanceId]
      return { byInstance: next }
    }),

  hydrate: (byInstance) => set({ byInstance }),
}))
