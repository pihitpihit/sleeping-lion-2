import { lazy, type ComponentType } from 'react'

/**
 * 라우트 표.
 *
 * 갈래가 셋이고 중첩 경로가 없어 정식 라우터를 쓰지 않는다. 캠페인 기록지(축 ①)에
 * 들어가면서 중첩·파라미터가 필요해지면 react-router로 교체하고, 그때도 GitHub
 * Pages가 정적 호스팅이므로 HashRouter를 쓴다.
 */

/** 웰컴은 첫 화면이므로 지연 로드하지 않는다. */
export const HOME_ROUTE = '/'

/**
 * 지연 로드하는 화면들. 각자 별도 청크가 되어 웰컴 번들을 늘리지 않는다.
 * 고지는 marked를, 행낭은 격자·제스처 코드를 끌고 온다.
 */
export const LAZY_ROUTES: Record<string, ComponentType> = {
  '/notice': lazy(() =>
    import('./features/notice/NoticePage').then((m) => ({ default: m.NoticePage })),
  ),
  '/satchel': lazy(() =>
    import('./features/satchel/SatchelPage').then((m) => ({ default: m.SatchelPage })),
  ),
  // 로그인은 따로 떨어져 있어야 한다. `demo` 빌드는 이 청크를 아예 받지 않는다.
  '/login': lazy(() => import('./features/auth/LoginPage').then((m) => ({ default: m.LoginPage }))),
  '/join': lazy(() => import('./features/net/JoinPage').then((m) => ({ default: m.JoinPage }))),
  // 일지 — 축 ①. 목록과 기록지 한 장을 한 화면이 함께 다룬다.
  /*
    주인장 — 대기자 승인·클래스 수치·특혜 표. 관리자만 볼 수 있고, 서버가 다시
    확인한다.

    **두 주소가 같은 화면을 연다.** `/admin`이 정본이고 단추도 그리로 간다.
    `/gate`는 「문지기」이던 시절의 주소이며 남겨 둔다 — 즐겨찾기나 손버릇으로
    치는 사람이 빈 화면을 보지 않게 하는 한 줄이다.
  */
  '/gate': lazy(() => import('./features/auth/AdminPage').then((m) => ({ default: m.AdminPage }))),
  '/admin': lazy(() => import('./features/auth/AdminPage').then((m) => ({ default: m.AdminPage }))),
  '/journal': lazy(() =>
    import('./features/campaign/JournalPage').then((m) => ({ default: m.JournalPage })),
  ),
  /*
    캐릭터 한 장.

    **주소에 파티가 없다.** 캐릭터가 먼저 서고 파티에는 나중에 들므로
    (2026-08-12, `0015`), 파티를 열쇠로 삼으면 아직 안 든 캐릭터를 열 수가 없다.
  */
  '/character': lazy(() =>
    import('./features/campaign/CharacterPage').then((m) => ({ default: m.CharacterPage })),
  ),
  /*
    캐릭터 생성.

    **`/character` 밑에 있지만 그 화면이 아니다.** 클래스와 이름은 세울 때만
    정할 수 있으므로(`0014`·`0017`) 고르는 자리가 따로 있어야 한다. id 자리에
    `new`가 오는 셈인데 id는 uuid라 부딪히지 않는다 — `routeKey`가 **정확히
    맞는 것을 앞머리보다 먼저** 보므로 이쪽으로 온다.
  */
  '/character/new': lazy(() =>
    import('./features/campaign/NewCharacterPage').then((m) => ({ default: m.NewCharacterPage })),
  ),
}

/**
 * 뒤에 값이 붙는 경로.
 *
 * `#/join/<토큰>`이 첫 사례이고 `#/journal/<기록지 id>`가 그 다음이다. 이것들
 * 때문에 react-router를 들이는 것은 아직 과하므로, **첫 마디만 보고 화면을 고르고
 * 나머지는 화면이 직접 읽는다.** 중첩이 생기면 그때 갈아탄다.
 */
const PREFIX_ROUTES: readonly string[] = ['/join', '/journal', '/character']

/**
 * 라우트에서 화면을 찾을 열쇠. `/join/abc` → `/join`
 *
 * **정확히 맞는 것이 앞머리보다 먼저다.** `/character/new`는 `/character`의
 * 뒷자리에 값이 붙은 꼴이지만 다른 화면이다 — 앞머리만 보면 캐릭터 한 장짜리
 * 화면이 `new`를 id로 알아듣고 빈 화면을 낸다.
 */
export function routeKey(route: string): string {
  if (route in LAZY_ROUTES) return route
  const head = '/' + (route.split('/')[1] ?? '')
  return PREFIX_ROUTES.includes(head) ? head : route
}

/**
 * 해시를 라우트로 읽는다.
 *
 * 페이지 내 앵커(`#mit-license`)는 라우트가 아니므로 null을 돌려준다 — 이걸
 * 구분하지 않으면 문서 안 목차 링크를 누를 때마다 라우트가 '/'로 떨어져 웰컴
 * 페이지로 튕긴다. 실제로 한 번 그렇게 터졌다.
 *
 * @returns 라우트 경로, 또는 페이지 내 앵커면 null
 */
export function readRoute(hash: string): string | null {
  if (hash === '' || hash === '#') return HOME_ROUTE
  if (!hash.startsWith('#/')) return null

  const route = hash.slice(1)
  // 알 수 없는 경로는 웰컴으로 되돌린다.
  if (route === HOME_ROUTE || route in LAZY_ROUTES) return route
  // 값이 붙는 경로는 첫 마디로 알아본다. `/join`만으로는 열지 않는다 —
  // 토큰이 없으면 볼 것이 없다.
  const key = routeKey(route)
  return key !== route && key in LAZY_ROUTES ? route : HOME_ROUTE
}
