import { create } from 'zustand'
import { useElementStore } from '../elements/elementStore'
import { useAttackDeckStore } from '../deck/deckStore'
import { useHpXpStore } from '../hpxp/hpxpStore'

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
  /**
   * 지금 라운드가 시작된 시각(epoch ms). **아직 시작 전이면 `null`.**
   *
   * ┌────────────────────────────────────────────────────────────────────────┐
   * │ **판은 저절로 시작하지 않는다 — 사람이 시작 단추를 누른다.**            │
   * └────────────────────────────────────────────────────────────────────────┘
   *
   * 위젯을 놓자마자 시계가 도는 것은 틀렸다(형님이 정했다). 상 위에 도구를 늘어놓는
   * 동안에도 시간이 흐르면 첫 라운드가 실제보다 길게 기록된다.
   *
   * **시각을 담는 것이지 흐른 시간을 담지 않는다.** 흐른 시간을 담으면 1초마다
   * 값이 바뀌어 전투 통로로 초당 한 번씩 나간다 — 시작 시각은 라운드가 넘어갈
   * 때만 바뀐다.
   */
  startedAt: number | null
  /**
   * 끝난 라운드들이 각각 얼마나 걸렸는가(ms). 첫 칸이 1라운드다.
   *
   * 라운드가 넘어가는 순간에만 한 칸씩 는다 — 지금 도는 라운드는 여기 없다.
   */
  laps: number[]
  /** 시계를 건다. 이미 돌고 있으면 아무 일도 안 한다 — 두 번 눌러 처음으로 가면 안 된다. */
  start: (now: number) => void
  /** 다음 라운드로. 원소가 한 단계씩 내려가고, 이번 라운드에 걸린 시간이 기록된다. */
  advance: (now?: number) => void
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
  hydrate: (round: number, startedAt?: number | null, laps?: readonly number[]) => void
}

/** 담긴 기록이 모양이 아닐 수 있다 — 남의 기기에서 온 것이다. */
function sanitizeLaps(raw: readonly number[] | undefined): number[] {
  if (!Array.isArray(raw)) return []
  return raw.filter((ms) => typeof ms === 'number' && Number.isFinite(ms) && ms >= 0)
}

export const useRoundStore = create<RoundState>((set, get) => ({
  round: FIRST_ROUND,
  startedAt: null,
  laps: [],

  start: (now) => {
    if (get().startedAt !== null) return
    set({ startedAt: now })
  },

  advance: (now) => {
    if (get().round >= MAX_ROUND) return

    /*
      **시작 전에는 라운드도 안 넘어간다.** 시계가 안 도는데 라운드만 올라가면
      그 라운드의 기록이 통째로 빈다 — 무엇이 빠졌는지 나중에 알 수가 없다.
    */
    const { startedAt, laps } = get()
    if (startedAt === null) return

    const at = typeof now === 'number' && Number.isFinite(now) ? now : startedAt
    set({
      round: get().round + 1,
      laps: [...laps, Math.max(0, at - startedAt)],
      startedAt: at,
    })
    useElementStore.getState().decayAll()
    // 섞기 표시가 뜬 보정 덱만 섞인다. 표시가 없는 덱은 건드리지 않는다.
    useAttackDeckStore.getState().shuffleMarked()
  },

  restart: () => {
    // 시계도 함께 내린다 — 새 판은 다시 눌러서 시작한다.
    set({ round: FIRST_ROUND, startedAt: null, laps: [] })
    useElementStore.getState().resetAll()
    // 새 시나리오를 펴면 보정 덱도 처음으로 돌아간다 — 원소를 끄는 것과 같은 이유다.
    useAttackDeckStore.getState().resetAll()
    /*
      **체력·경험 기록도 함께 내린다**(형님이 정했다). 지난 판의 「3라운드에 5
      깎였다」가 새 판에 남아 있으면 이번 판의 기록으로 읽힌다 — 값(체력·경험)은
      건드리지 않는다: 그것은 사람의 것이고 판이 바뀐다고 0이 되지 않는다.
    */
    useHpXpStore.getState().clearLog()
  },

  hydrate: (round, startedAt, laps) =>
    set({
      round: Math.min(MAX_ROUND, Math.max(FIRST_ROUND, round)),
      startedAt:
        typeof startedAt === 'number' && Number.isFinite(startedAt) && startedAt > 0
          ? startedAt
          : null,
      laps: sanitizeLaps(laps),
    }),
}))
