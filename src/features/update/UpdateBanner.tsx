import { useEffect, useState } from 'react'
import { APP_VERSION, fetchDeployedVersion, reloadFresh } from './version'
import './UpdateBanner.css'

/** 켜 둔 동안 얼마마다 볼까. 배포는 하루 몇 번이라 이 정도면 넉넉하다. */
const EVERY_MS = 10 * 60 * 1000

/**
 * 새 버전 알림 띠(형님이 정했다).
 *
 * **저절로 새로고침하지 않고 묻는다** — 시트를 고치는 중이거나 행낭에서 판을 돌리는
 * 중에 화면이 날아가면 안 된다. 「나중에」로 닫을 수 있고, 닫아도 **다음에 앱으로
 * 돌아오면 다시 뜬다**(홈 화면 앱을 다시 여는 것이 곧 화면이 다시 보이는 때다).
 *
 * 보는 때는 셋 — 처음 뜰 때(들고 있던 낡은 껍데기로 떴을 수 있다), 앱으로 돌아올 때,
 * 켜 둔 동안 10분마다.
 */
export function UpdateBanner() {
  const [next, setNext] = useState<string | null>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (APP_VERSION === 'dev') return
    let alive = true
    const check = () => {
      void fetchDeployedVersion().then((v) => {
        if (alive && v !== null) setNext(v)
      })
    }
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return
      setDismissed(false)
      check()
    }
    check()
    const timer = window.setInterval(check, EVERY_MS)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      alive = false
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])

  if (next === null || dismissed) return null
  return <UpdateBannerPanel onReload={() => reloadFresh(next)} onLater={() => setDismissed(true)} />
}

/** 띠 그 자체 — 값만 받으므로 서버 렌더로 확인된다(구현 결정 194). */
export function UpdateBannerPanel({
  onReload,
  onLater,
}: {
  onReload: () => void
  onLater: () => void
}) {
  return (
    <div className="update" role="status">
      <span className="update__text">새 버전이 나왔다</span>
      <button type="button" className="update__go" onClick={onReload}>
        새로고침
      </button>
      <button type="button" className="update__later" aria-label="나중에" onClick={onLater}>
        ×
      </button>
    </div>
  )
}
