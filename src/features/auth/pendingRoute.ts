/**
 * 로그인 뒤에 돌아갈 곳.
 *
 * 메신저로 받은 링크를 열었는데 로그인하고 나서 첫 화면으로 떨어지면 링크를
 * 다시 눌러야 한다. 초대 링크(N3)가 붙으면 이게 더 중요해진다.
 *
 * `sessionStorage`에 둔다 — 로그인 도중 새로고침해도 살아남고, 탭을 닫으면
 * 사라진다. 다음에 앱을 열었을 때 옛날에 가려던 곳으로 끌려가면 곤란하다.
 */

const KEY = 'sl2.pendingRoute'

/** 되돌아갈 곳으로 받아들일 만한가. 바깥 주소로 튕겨 보내지 않는다. */
export function isSafeReturnRoute(route: unknown): route is string {
  return typeof route === 'string' && route.startsWith('/') && !route.startsWith('//')
}

export function setPendingRoute(route: string): void {
  if (!isSafeReturnRoute(route)) return
  try {
    sessionStorage.setItem(KEY, route)
  } catch {
    // 못 적으면 로그인 뒤 첫 화면으로 간다. 앱이 멈추는 것보다 낫다.
  }
}

/** 꺼내면서 지운다. 한 번 쓰고 버리는 값이다. */
export function takePendingRoute(): string | null {
  let raw: string | null
  try {
    raw = sessionStorage.getItem(KEY)
    sessionStorage.removeItem(KEY)
  } catch {
    return null
  }
  return isSafeReturnRoute(raw) ? raw : null
}
