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
  return route === HOME_ROUTE || route in LAZY_ROUTES ? route : HOME_ROUTE
}
