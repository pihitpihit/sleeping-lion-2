import { lazy, type ComponentType } from 'react'

/**
 * 화면 조각을 불러온다 — **한 번 못 받았다고 포기하지 않는다.**
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ **폰에서 한 번 미끄러지는 것은 고장이 아니다.**                           │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * 조각 하나를 여는 데 파일이 여럿 날아온다(제 것 + 함께 쓰는 것들 + 스타일).
 * 그중 하나만 못 받아도 `import()`가 통째로 엎어지고, 그러면 화면이 어두운 채로
 * 남는다 — 형님이 참조 화면에서 「어두운 화면이 뜬다. 재시도 하다 보면 다시 잘
 * 나오기도 한다」고 짚은 자리다. **다시 잘 나온다는 것이 곧 한 번 미끄러졌다는
 * 뜻이다.**
 *
 * 그래서 잠깐 쉬었다 두 번 더 해 본다. 그래도 안 되면 그때 `RouteBoundary`가
 * 받아 낸다 — 낡은 껍데기라면 거기서 한 번 새로 불러오고, 아니면 무슨 일인지
 * 화면에 적는다.
 *
 * **쉬는 사이가 늘어나는 것**은 신호가 잠깐 끊긴 자리에서 세 번을 한꺼번에
 * 던져 봐야 셋 다 같은 이유로 엎어지기 때문이다.
 */

/** 다시 해 보기 전에 쉬는 사이. 길이가 곧 시도 횟수다. */
const WAITS_MS = [300, 900]

const sleep = (ms: number) => new Promise((done) => setTimeout(done, ms))

/**
 * 못 받으면 쉬었다 다시. 마지막까지 못 받으면 그 오류를 그대로 올린다.
 *
 * 시험이 시각을 못 붙들게 `waits`와 `rest`를 받는다 — 진짜 기다리면 시험이
 * 그만큼 느려지고, 느린 시험은 결국 안 돌린다.
 */
export async function fetchWithRetry<T>(
  load: () => Promise<T>,
  waits: readonly number[] = WAITS_MS,
  rest: (ms: number) => Promise<unknown> = sleep,
): Promise<T> {
  let last: unknown = null
  for (let i = 0; i <= waits.length; i++) {
    if (i > 0) await rest(waits[i - 1] ?? 0)
    try {
      return await load()
    } catch (cause) {
      console.warn('[chunk]', i + 1, cause)
      last = cause
    }
  }
  throw last
}

/** 라우트 표가 쓰는 것. `lazy`와 똑같이 생겼고 다시 해 보는 것만 더 있다. */
export function lazyPage<T extends ComponentType<Record<string, never>>>(
  load: () => Promise<{ default: T }>,
): T {
  return lazy(() => fetchWithRetry(load)) as unknown as T
}
