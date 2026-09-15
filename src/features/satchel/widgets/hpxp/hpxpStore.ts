import { create } from 'zustand'
import {
  INITIAL,
  clampValue,
  markRoundValues,
  mergeLog,
  step,
  type HpXp,
  type HpXpLogEntry,
  type HpXpRoundMark,
  type HpXpTrack,
} from './hpxp'

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
  /**
   * 무엇이 언제 얼마나 움직였나. 열쇠는 값과 같다(캐릭터를 골랐으면 그 id).
   *
   * ┌────────────────────────────────────────────────────────────────────────┐
   * │ **메모리에만 둔다 — 판 뭉치에도 안 싣는다.**                            │
   * └────────────────────────────────────────────────────────────────────────┘
   *
   * 이것은 들여다보는 자리이지 판의 사실이 아니다. 뭉치에 실으면 **원소를 한 번
   * 켤 때마다 기록까지 통로로 나간다**(구현 결정 130과 같은 셈) — 줄이 쌓일수록
   * 무거워지는데 정작 나누어야 할 값은 아니다. 새로고침하면 사라진다.
   */
  logBySlot: Record<string, HpXpLogEntry[]>
  /** 라운드가 열릴 때의 값. 열쇠는 위와 같다. */
  marksBySlot: Record<string, HpXpRoundMark[]>
  valuesOf: (instanceId: string) => HpXp
  logOf: (instanceId: string) => HpXpLogEntry[]
  marksOf: (instanceId: string) => HpXpRoundMark[]
  /**
   * 라운드가 열렸다 — **지금 값을 그대로 찍어 둔다.**
   *
   * 판을 시작할 때와 라운드를 넘길 때 `roundStore`가 부른다(형님이 정했다).
   * **값이 있는 자리만** 찍는다: 손댄 적 없는 다이얼은 찍을 것이 없다.
   */
  markRound: (round: number) => void
  /** 판을 새로 시작하면 기록도 함께 내린다(`roundStore.restart`가 부른다). */
  clearLog: () => void
  /** `round`를 받는 까닭은 **기록이 몇 라운드의 것인지** 알아야 해서다. */
  adjust: (instanceId: string, track: HpXpTrack, delta: number, round?: number) => void
  /**
   * 값을 곧바로 앉힌다 — 「최대 체력으로 되돌리기」가 쓴다.
   *
   * `adjust`로는 못 한다. 지금 값이 얼마인지 알아야 델타를 셈할 수 있는데,
   * **부르는 쪽이 그것을 알 까닭이 없다.**
   */
  setTrack: (instanceId: string, track: HpXpTrack, value: number, round?: number) => void
  reset: (instanceId: string) => void
  /** 뜬 판을 통째로 앉힌다. */
  hydrate: (byInstance: Record<string, HpXp>) => void
}

/** 빈 기록. **한 벌만 두고 돌려 쓴다** — 위의 까닭이다. */
const NO_LOG: HpXpLogEntry[] = []
const NO_MARKS: HpXpRoundMark[] = []

export const useHpXpStore = create<HpXpState>((set, get) => ({
  byInstance: {},
  logBySlot: {},
  marksBySlot: {},

  valuesOf: (instanceId) => get().byInstance[instanceId] ?? INITIAL,
  /*
    ┌────────────────────────────────────────────────────────────────────────┐
    │ **빈 값을 매번 새로 만들지 않는다.**                                    │
    └────────────────────────────────────────────────────────────────────────┘

    화면이 이것을 selector로 부른다(`useHpXpStore((s) => s.logOf(slot))`). zustand는
    결과를 `Object.is`로 견주므로 **`?? []`가 매번 새 배열을 내면 「바뀌었다」로
    읽혀 렌더가 끝없이 돈다**(React #185). 값 쪽이 멀쩡했던 것은 `INITIAL`이
    모듈 상수였기 때문이다 — 빈 기록도 같은 상수를 쓴다.
  */
  logOf: (instanceId) => get().logBySlot[instanceId] ?? NO_LOG,
  marksOf: (instanceId) => get().marksBySlot[instanceId] ?? NO_MARKS,

  markRound: (round) =>
    set((s) => {
      const next = { ...s.marksBySlot }
      for (const [slot, values] of Object.entries(s.byInstance)) {
        next[slot] = markRoundValues(next[slot] ?? [], { round, hp: values.hp, xp: values.xp })
      }
      return { marksBySlot: next }
    }),

  clearLog: () => set({ logBySlot: {}, marksBySlot: {} }),

  adjust: (instanceId, track, delta, round) =>
    set((s) => {
      const current = s.byInstance[instanceId] ?? INITIAL
      const next = step(current[track], delta)
      return {
        byInstance: { ...s.byInstance, [instanceId]: { ...current, [track]: next } },
        /*
          **울타리에 걸려 제자리로 돌아온 것은 움직인 것이 아니다.** 0에서 더
          내려도 0이므로 기록에 남길 것이 없다(구현 결정 168과 같은 결).
        */
        logBySlot: noteLog(s.logBySlot, instanceId, round, track, next - current[track]),
      }
    }),

  setTrack: (instanceId, track, value, round) =>
    set((s) => {
      const current = s.byInstance[instanceId] ?? INITIAL
      const next = clampValue(value)
      return {
        byInstance: { ...s.byInstance, [instanceId]: { ...current, [track]: next } },
        logBySlot: noteLog(s.logBySlot, instanceId, round, track, next - current[track]),
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

/**
 * 기록에 한 줄 얹는다.
 *
 * **라운드를 모르면 안 적는다.** 판을 아직 시작하지 않았거나(`round`가 안 왔거나)
 * 움직인 것이 없으면 기록할 것이 없다 — 라운드를 짐작해 넣으면 그 줄이 거짓이 된다
 * (구현 결정 115).
 */
function noteLog(
  logs: Record<string, HpXpLogEntry[]>,
  slot: string,
  round: number | undefined,
  track: HpXpTrack,
  delta: number,
): Record<string, HpXpLogEntry[]> {
  if (round === undefined || delta === 0) return logs
  return { ...logs, [slot]: mergeLog(logs[slot] ?? [], round, track, delta) }
}
