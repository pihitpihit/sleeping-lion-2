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
  /** `#/journal/<파티>/<캐릭터>` — 없으면 빈 문자열. */
  characterId: string
}

/** `#/journal/a/b` → `{ partyId: 'a', characterId: 'b' }` */
export function readJournalRoute(hash: string): JournalRoute {
  const parts = hash.replace(/^#\//, '').split('/')
  if (parts[0] !== 'journal') return { partyId: '', characterId: '' }
  return { partyId: parts[1] ?? '', characterId: parts[2] ?? '' }
}

/**
 * 뒤로 단추가 가는 곳.
 *
 * **한 칸씩 올라간다.** 캐릭터에서는 그 파티 기록지로, 기록지에서는 목록으로,
 * 목록에서는 여관으로. 어디서 눌러도 목록으로 튀면 캐릭터를 열 때마다 두 번씩
 * 들어가야 한다.
 */
export function backHref(route: JournalRoute): string {
  if (route.characterId) return `#/journal/${route.partyId}`
  if (route.partyId) return '#/journal'
  return '#/'
}
