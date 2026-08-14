/**
 * 낡은 껍데기를 알아보는 눈 — `RouteBoundary`가 쓴다.
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ **여기서 틀리면 앱이 끝없이 깜빡인다.**                                   │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * 되불러오기를 부르는 판단이라 화면에서 떼어 순수 함수로 둔다 — 표로 못박아야
 * 하는 종류의 규칙이다(구현 결정 158과 같은 손질).
 */

/** `sessionStorage` 열쇠. 탭을 닫으면 잊는다 — 다음에 열 때는 다시 한 번 준다. */
const RELOAD_KEY = 'sl2:stale-reload'

/** 되불러오기를 두 번 잇달아 하지 않는 사이 — 그 안에 또 터지면 진짜 고장이다. */
const RELOAD_GAP_MS = 20_000

/**
 * 낡은 껍데기가 없어진 조각을 부른 것으로 보이는가.
 *
 * 브라우저마다 말이 다르다 — 크롬은 `Failed to fetch dynamically imported
 * module`, 사파리는 `Importing a module script failed`, 파이어폭스는 `error
 * loading dynamically imported module`. **셋을 다 본다.**
 */
export function looksStale(error: unknown): boolean {
  const text = error instanceof Error ? `${error.name}: ${error.message}` : String(error)
  return /dynamically imported module|module script failed|Importing a module|ChunkLoadError/i.test(
    text,
  )
}

/**
 * 지금 되불러올 것인가.
 *
 * **무한 되불러오기가 가장 나쁘다.** 조각이 진짜로 없어진 것이라면 새로 불러도
 * 같은 자리에서 터지므로, 마지막으로 되불러온 지 얼마 안 됐으면 그만두고 화면에
 * 적는다.
 */
export function shouldReload(error: unknown, lastAt: number | null, now: number): boolean {
  if (!looksStale(error)) return false
  if (lastAt === null) return true
  return now - lastAt > RELOAD_GAP_MS
}

/** 마지막으로 되불러온 시각. 저장소를 막아 둔 브라우저에서는 모른다고 한다. */
export function readLastReload(): number | null {
  try {
    const raw = window.sessionStorage.getItem(RELOAD_KEY)
    if (raw === null) return null
    const n = Number(raw)
    return Number.isFinite(n) ? n : null
  } catch {
    return null
  }
}

export function writeLastReload(at: number): void {
  try {
    window.sessionStorage.setItem(RELOAD_KEY, String(at))
  } catch {
    /* 저장소를 막아 둔 브라우저 — 되불러오기는 그대로 하되 셈만 못 한다. */
  }
}
