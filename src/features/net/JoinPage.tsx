import { useEffect, useRef, useState } from 'react'
import { useAuthStore } from '../auth/authStore'
import { NetError } from './adapter'
import { partyAdapter } from './index'
import { INVITE_STATE_MESSAGE, inviteState, parseInviteRoute } from './invite'
import { readRoute } from '../../routes'
import './JoinPage.css'

type Phase =
  { kind: 'checking' } | { kind: 'joined'; name: string } | { kind: 'failed'; why: string }

/**
 * 초대 링크를 연 화면.
 *
 * 여기 닿았다는 것은 **이미 로그인했다는 뜻이다** — 게이트가 먼저 로그인으로
 * 보내고 되돌려보낸다(N1). 그러니 로그인 여부는 다시 묻지 않는다.
 *
 * **링크만으로는 파티 이름조차 보여주지 않는다.** 들어오기 전에는 누가 누구와
 * 노는지 새어 나갈 이유가 없다.
 */
export function JoinPage() {
  const session = useAuthStore((s) => s.session)
  const [phase, setPhase] = useState<Phase>({ kind: 'checking' })
  // 초대 수락은 한 번만 시도한다. 다시 그려질 때마다 부르면 중복으로 들어간다.
  const tried = useRef(false)

  useEffect(() => {
    if (!session || tried.current) return
    tried.current = true

    void (async () => {
      const route = readRoute(window.location.hash) ?? ''
      const token = parseInviteRoute(route)
      if (token === null) {
        setPhase({ kind: 'failed', why: INVITE_STATE_MESSAGE.unknown })
        return
      }

      try {
        const party = await partyAdapter.acceptInvite(
          token,
          { userId: session.userId, displayName: session.displayName },
          Date.now(),
        )
        setPhase({ kind: 'joined', name: party.name })
      } catch (cause) {
        if (cause instanceof NetError) {
          setPhase({ kind: 'failed', why: cause.message })
          return
        }
        // 초대장을 다시 들여다보고 왜 막혔는지 가려낸다.
        const invite = await partyAdapter.findInvite(token).catch(() => null)
        const state = inviteState(invite, Date.now())
        setPhase({
          kind: 'failed',
          why: state === 'ok' ? '뜻대로 되지 않았습니다.' : INVITE_STATE_MESSAGE[state],
        })
      }
    })()
  }, [session])

  if (!session) return null

  return (
    <main className="parties parties--narrow">
      <header className="parties__head">
        <h1 className="parties__title">초대장</h1>
      </header>

      {phase.kind === 'checking' && <p className="parties__lede">초대장을 살피는 중…</p>}

      {phase.kind === 'joined' && (
        <>
          <p className="parties__lede">
            <strong>{phase.name}</strong>에 들었습니다.
          </p>
          <p className="party__actions">
            <a className="parties__go" href="#/parties">
              동행 보기
            </a>
          </p>
        </>
      )}

      {phase.kind === 'failed' && (
        <>
          <p className="parties__error" role="alert">
            {phase.why}
          </p>
          <p className="party__actions">
            <a className="parties__go" href="#/">
              여관으로
            </a>
          </p>
        </>
      )}
    </main>
  )
}
