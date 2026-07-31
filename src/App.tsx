import { Suspense, useEffect, useState } from 'react'
import { HOME_ROUTE, LAZY_ROUTES, readRoute } from './routes'
import { WelcomePage } from './features/welcome/WelcomePage'

export default function App() {
  const [route, setRoute] = useState(() => readRoute(window.location.hash) ?? HOME_ROUTE)

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

  const LazyPage = LAZY_ROUTES[route]
  if (LazyPage) {
    return (
      <Suspense fallback={null}>
        <LazyPage />
      </Suspense>
    )
  }

  return <WelcomePage />
}
