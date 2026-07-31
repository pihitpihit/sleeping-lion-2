import { Suspense, lazy, useEffect, useState } from 'react'
import { WelcomePage } from './features/welcome/WelcomePage'

/**
 * 최소 해시 라우팅.
 *
 * GitHub Pages는 정적 호스팅이라 `/notice` 같은 실제 경로로 들어오면 404를 준다
 * (SPA 폴백을 쓰려면 404.html 우회가 필요하다). 해시는 서버 설정 없이 어디서나
 * 동작하므로 지금 단계에선 이쪽이 맞다.
 *
 * Phase 1에서 캠페인·도구 라우팅을 붙일 때 정식 라우터로 교체한다. 그때도
 * HashRouter를 쓰면 이 결정을 그대로 이어갈 수 있다.
 */

// marked를 웰컴 페이지 번들에 끌어들이지 않도록 분리한다.
const NoticePage = lazy(() =>
  import('./features/notice/NoticePage').then((m) => ({ default: m.NoticePage })),
)

/**
 * 해시를 라우트로 읽는다. 페이지 내 앵커(`#mit-license`)는 라우트가 아니므로
 * null을 돌려준다 — 이걸 구분하지 않으면 문서 안 목차 링크를 누를 때마다
 * 라우트가 '/'로 떨어져 웰컴 페이지로 튕긴다.
 */
function readRoute(): string | null {
  const hash = window.location.hash
  if (hash === '' || hash === '#') return '/'
  if (hash.startsWith('#/')) return hash.slice(1)
  return null
}

export default function App() {
  const [route, setRoute] = useState(() => readRoute() ?? '/')

  useEffect(() => {
    const onHashChange = () => {
      const next = readRoute()
      if (next === null) return // 페이지 내 앵커 — 브라우저가 알아서 스크롤한다
      setRoute(next)
      window.scrollTo(0, 0)
    }
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  if (route === '/notice') {
    return (
      <Suspense fallback={null}>
        <NoticePage />
      </Suspense>
    )
  }

  return <WelcomePage />
}
