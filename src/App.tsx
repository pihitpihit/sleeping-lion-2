import { Suspense, useEffect, useState } from 'react'
import { HOME_ROUTE, LAZY_ROUTES, readRoute, routeKey } from './routes'
import { WelcomePage } from './features/welcome/WelcomePage'
import { AUTH_MODE } from './features/auth/mode'
import { guardRoute } from './features/auth/guard'
import { useAuthStore } from './features/auth/authStore'
import { setPendingRoute } from './features/auth/pendingRoute'

export default function App() {
  const [route, setRoute] = useState(() => readRoute(window.location.hash) ?? HOME_ROUTE)
  const session = useAuthStore((s) => s.session)
  const pruneExpired = useAuthStore((s) => s.pruneExpired)

  useEffect(() => {
    const onHashChange = () => {
      const next = readRoute(window.location.hash)
      if (next === null) return // 페이지 내 앵커 — 브라우저가 알아서 스크롤한다
      setRoute(next)
      window.scrollTo(0, 0)
    }
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  /**
   * 세션이 만료되는 순간 내보낸다.
   *
   * 렌더 안에서 `Date.now()`를 볼 수 없으므로(react-hooks/purity) 시각 판정은
   * 전부 렌더 밖에서 한다. 스토어가 띄울 때 한 번 걸러내고, 여기서는 앱을
   * 열어둔 채 만료를 넘기는 경우만 맡는다.
   */
  useEffect(() => {
    if (session === null) return
    const remaining = session.expiresAt - Date.now()
    if (remaining <= 0) {
      pruneExpired(Date.now())
      return
    }
    // setTimeout은 약 24.8일을 넘기면 즉시 터진다(32비트). 그보다 멀면 그냥 두고
    // 다음에 앱을 띄울 때 걸러낸다 — 스토어가 시작할 때 이미 그렇게 한다.
    const MAX_DELAY = 2 ** 31 - 1
    if (remaining > MAX_DELAY) return
    const timer = setTimeout(() => pruneExpired(Date.now()), remaining)
    return () => clearTimeout(timer)
  }, [session, pruneExpired])

  const decision = guardRoute(route, AUTH_MODE, session !== null)
  const redirectTo = decision.kind === 'redirect' ? decision.to : null
  const remember = decision.kind === 'redirect' ? decision.remember : undefined

  /**
   * 되돌려보내기는 렌더 도중에 하지 않는다. 렌더 중 해시를 바꾸면 그리는 중에
   * 상태가 또 바뀌어 화면이 한 번 깜빡인다.
   */
  useEffect(() => {
    if (redirectTo === null) return
    if (remember !== undefined) setPendingRoute(remember)
    window.location.hash = '#' + redirectTo
  }, [redirectTo, remember])

  // 보내는 동안에는 아무것도 그리지 않는다. 잠깐이라도 보이면 새는 것이다.
  if (redirectTo !== null) return null

  const LazyPage = LAZY_ROUTES[routeKey(route)]
  if (LazyPage) {
    /**
     * `key`에 라우트 전체를 준다.
     *
     * 값이 붙는 경로(`/join/<토큰>`)는 토큰만 달라도 **다른 화면**이다. 키가
     * 없으면 React가 같은 컴포넌트로 보고 그대로 두어, 초대 링크에서 다른 초대
     * 링크로 옮겼을 때 앞의 결과가 남는다. 실제로 그랬다.
     */
    return (
      <Suspense fallback={null}>
        <LazyPage key={route} />
      </Suspense>
    )
  }

  return <WelcomePage />
}
