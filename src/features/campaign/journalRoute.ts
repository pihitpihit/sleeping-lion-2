/**
 * 일지의 주소를 읽는다.
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ **화면 파일에서 뗀다.** 순수 함수라 Vitest로 못박을 수 있다.              │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * 주소를 잘못 읽으면 엉뚱한 화면이 뜨는 것이 아니라 **빈 화면이 뜬다** — 목록으로
 * 읽히면 기록지가 안 열리고, 기록지로 읽히면 캐릭터가 안 열린다.
 *
 * `JournalPage`에 두었더니 `react-refresh/only-export-components`가 막았다.
 * 컴포넌트 파일이 컴포넌트 아닌 것을 함께 내보내면 편집 중 갱신이 깨진다.
 */

export interface JournalRoute {
  /** `#/journal/<파티>` — 목록이면 빈 문자열. */
  partyId: string
}

/**
 * `#/journal/a` → `{ partyId: 'a' }`
 *
 * **캐릭터 마디는 없다.** 캐릭터는 제 주소를 갖는다(`#/character/<id>`) —
 * 파티에 안 든 캐릭터를 파티 열쇠로 열 수 없기 때문이다(2026-08-12).
 */
export function readJournalRoute(hash: string): JournalRoute {
  const parts = hash.replace(/^#\//, '').split('/')
  if (parts[0] !== 'journal') return { partyId: '' }
  return { partyId: parts[1] ?? '' }
}

/**
 * 뒤로 단추가 가는 곳.
 *
 * **한 칸씩 올라간다.** 기록지에서는 일지로, 일지에서는 여관으로.
 */
export function backHref(route: JournalRoute): string {
  if (route.partyId) return '#/journal'
  return '#/'
}

/**
 * `#/character/abc` → `abc`. 캐릭터 주소가 아니면 빈 문자열.
 *
 * **캐릭터는 제 주소를 갖는다.** 파티에 안 든 캐릭터를 파티 열쇠로 열 수 없기
 * 때문이다(2026-08-12) — 예전에는 `#/journal/<파티>/<캐릭터>`였다.
 */
export function characterIdFromHash(hash: string): string {
  const parts = hash.replace(/^#\//, '').split('/')
  return parts[0] === 'character' ? (parts[1] ?? '') : ''
}
