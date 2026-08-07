import { Suspense, useEffect, useState } from 'react'
import { HOME_ROUTE, LAZY_ROUTES, readRoute, routeKey } from './routes'
import { WelcomePage } from './features/welcome/WelcomePage'
import { AUTH_MODE } from './features/auth/mode'
import { guardRoute, PUBLIC_ROUTES } from './features/auth/guard'
import { useAuthStore } from './features/auth/authStore'
import { setPendingRoute } from './features/auth/pendingRoute'
import { useApprovalStore } from './features/auth/approval'
import { PendingPage } from './features/auth/PendingPage'

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

  /**
   * 승인 게이트.
   *
   * 로그인 게이트를 지난 뒤 한 겹 더 있다 — **가입은 열려 있고 쓰는 것은
   * 승인받은 사람만 한다**(0004). 세션이 생기면 물어보고, 나가면 잊는다.
   */
  const approvalPhase = useApprovalStore((s) => s.phase)
  const checkApproval = useApprovalStore((s) => s.check)
  const resetApproval = useApprovalStore((s) => s.reset)

  useEffect(() => {
    if (session === null) {
      resetApproval()
      return
    }
    void checkApproval()
  }, [session, checkApproval, resetApproval])

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

  /**
   * 승인 전에는 문 앞에 세운다.
   *
   * **아직 안 물어봤을 때는 세우지 않는다**(`unknown`·`checking`). 물어보기도
   * 전에 "승인되지 않았다"고 말하면 멀쩡한 사람이 매번 그 화면을 스쳐 본다.
   *
   * 공개 경로(`#/notice`)는 그대로 연다 — 출처표시 의무는 로그인·승인과 무관하게
   * 배포에서 발생한다(SPEC 13.1).
   */
  if (session !== null && approvalPhase === 'pending' && !PUBLIC_ROUTES.includes(route)) {
    return <PendingPage />
  }

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
