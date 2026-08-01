import type { AuthMode } from './mode'

/**
 * 어느 화면을 열어줄지 정한다.
 *
 * 순수 함수로 떼어 둔다 — 게이트가 새는지 눈으로 확인할 수는 없고, 표로 적어
 * 시험해야 하는 종류의 규칙이다.
 */

export const LOGIN_ROUTE = '/login'

/**
 * 로그인 없이도 열리는 곳.
 *
 * **공지는 게이트 밖이다.** Creator Pack의 출처표시 의무는 로그인 여부와
 * 무관하게 배포에서 발생하므로(SPEC 13.1), 표기를 게이트 뒤에 숨기지 않는다.
 */
export const PUBLIC_ROUTES: readonly string[] = ['/notice']

export type GuardDecision =
  | { kind: 'allow' }
  /** 이리로 보낸다. `remember`가 있으면 로그인 뒤 그리로 되돌린다. */
  | { kind: 'redirect'; to: string; remember?: string }

export function guardRoute(route: string, mode: AuthMode, signedIn: boolean): GuardDecision {
  if (mode === 'demo') {
    // 로그인이 없는 배포다. 로그인 화면은 갈 곳이 아니다.
    return route === LOGIN_ROUTE ? { kind: 'redirect', to: '/' } : { kind: 'allow' }
  }

  if (PUBLIC_ROUTES.includes(route)) return { kind: 'allow' }

  if (route === LOGIN_ROUTE) {
    // 이미 들어와 있으면 로그인 화면을 다시 보여줄 이유가 없다.
    return signedIn ? { kind: 'redirect', to: '/' } : { kind: 'allow' }
  }

  if (signedIn) return { kind: 'allow' }
  return { kind: 'redirect', to: LOGIN_ROUTE, remember: route }
}
