import { useEffect, useState } from 'react'
import { ClassDataEditor } from '../campaign/ClassDataEditor'
import { approveUser, listPendingUsers, useApprovalStore, type PendingUser } from './approval'
import './PendingPage.css'

/**
 * 문지기 — 대기자를 들이는 화면.
 *
 * **관리자만 볼 수 있다.** 다만 화면이 막는 것은 UX일 뿐이라 여기서 가리는 것에
 * 기대지 않는다 — 목록을 꺼내는 함수도 승인하는 함수도 서버에서 관리자인지 다시
 * 본다(`0004_approval.sql`).
 *
 * **승인과 파티 가입은 다르다.** 여기서 승인하면 그 사람은 앱을 쓸 수 있게 되지만
 * 우리 기록지는 아직 못 본다 — 그것은 초대 링크로 파티에 들어야 열린다. 벽이
 * 두 겹인 것이 의도다.
 */
export function AdminPage() {
  const isAdmin = useApprovalStore((s) => s.isAdmin)
  const phase = useApprovalStore((s) => s.phase)
  const refreshPending = useApprovalStore((s) => s.refreshPending)

  const [pending, setPending] = useState<PendingUser[]>([])
  const [loaded, setLoaded] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  /** 스스로 다시 읽고 싶을 때 올린다. */
  const [tick, setTick] = useState(0)

  /*
    상태를 **기다린 뒤에만** 바꾼다. 이펙트 몸통에서 곧바로 setState를 부르면
    렌더가 꼬리를 문다 — `Crew`와 같은 모양으로 맞춘다.

    떠난 뒤 응답이 와서 유령 갱신이 일어나는 것도 `alive`로 막는다.
  */
  useEffect(() => {
    if (!isAdmin) return
    let alive = true
    void (async () => {
      try {
        const rows = await listPendingUsers()
        if (!alive) return
        setPending(rows)
        setError(null)
        // 계정 띠의 뱃지도 같은 수를 보게 한다. 여기서 들이고 나갔는데 뱃지에
        // 옛 수가 남아 있으면 아직 누가 기다리는 줄 안다.
        void refreshPending()
      } catch (cause) {
        console.error('[admin]', cause)
        if (alive) setError('대기자를 불러오지 못했습니다.')
      } finally {
        if (alive) setLoaded(true)
      }
    })()
    return () => {
      alive = false
    }
  }, [isAdmin, tick, refreshPending])

  const reload = () => setTick((n) => n + 1)

  if (phase === 'checking' || phase === 'unknown') return null

  if (!isAdmin) {
    return (
      <main className="pending">
        <h1 className="pending__title">문지기</h1>
        <p className="pending__body">이 문은 주인장만 엽니다.</p>
        <p className="pending__actions">
          <a className="pending__out" href="#/">
            여관으로
          </a>
        </p>
      </main>
    )
  }

  return (
    <main className="pending pending--wide">
      <header className="pending__head">
        <a className="pending__back" href="#/" aria-label="처음으로">
          ←
        </a>
        <h1 className="pending__title">문지기</h1>
      </header>

      <p className="pending__hint">
        승인하면 앱을 쓸 수 있게 됩니다. <strong>기록지는 아직 보이지 않습니다</strong> — 그것은
        초대 링크로 파티에 들어야 열립니다.
      </p>

      {error !== null && (
        <p className="pending__warn" role="alert">
          {error}
        </p>
      )}

      {loaded && pending.length === 0 && <p className="pending__body">기다리는 사람이 없습니다.</p>}

      {pending.length > 0 && (
        <ul className="admin__list">
          {pending.map((user) => (
            <li key={user.id}>
              <span className="admin__email">{user.email}</span>
              <button
                type="button"
                className="admin__approve"
                disabled={busy !== null}
                onClick={() => {
                  setBusy(user.id)
                  approveUser(user.id)
                    .then(reload)
                    .catch(() => setError('승인하지 못했습니다.'))
                    .finally(() => setBusy(null))
                }}
              >
                {busy === user.id ? '들이는 중…' : '들이기'}
              </button>
            </li>
          ))}
        </ul>
      )}

      <p className="pending__actions">
        <button type="button" className="pending__recheck" onClick={reload}>
          다시 보기
        </button>
      </p>

      {/* 카드에 인쇄된 값이 들어오는 자리. 저장소에는 넣지 않는다(절대 원칙 1). */}
      <ClassDataEditor />
    </main>
  )
}
