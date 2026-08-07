import { useEffect, useState } from 'react'
import { partyAdapter, useNetRevision } from '../net'
import { NetError } from '../net/adapter'
import { inviteRoute, remainingLabel } from '../net/invite'
import type { Identity, Invite, Member } from '../net/types'

interface Props {
  partyId: string
  partyName: string
  me: Identity
  onLeave: () => void
}

/**
 * 함께하는 이들 — 기록지에 딸린 파티원과 초대장.
 *
 * '동행'이라는 별도 화면에 있던 것을 기록지 안으로 옮겼다. **파티가 둘로 보이던
 * 것을 하나로 합치면서** 이것도 따라온 것이다 — 실물에서 파티 시트 옆에 누가
 * 있는지 적어두는 것과 같다.
 *
 * **시각을 렌더 안에서 읽지 않는다.** 불러올 때 함께 찍어 두고 그것으로 남은
 * 시간을 셈한다(react-hooks/purity). 만료가 이틀이라 시간 단위로 보이면 그만이다.
 */
export function Crew({ partyId, partyName, me, onLeave }: Props) {
  const revision = useNetRevision()
  const [members, setMembers] = useState<Member[]>([])
  const [invites, setInvites] = useState<Invite[]>([])
  const [readAt, setReadAt] = useState(0)
  const [tick, setTick] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    void (async () => {
      try {
        const [m, i] = await Promise.all([
          partyAdapter.listMembers(partyId),
          partyAdapter.listInvites(partyId),
        ])
        if (!alive) return
        setMembers(m)
        setInvites(i)
        setReadAt(Date.now())
        setError(null)
      } catch (cause) {
        // 파티원을 못 읽어도 기록지는 보여야 한다. 여기만 조용히 접는다.
        if (alive) setError(cause instanceof NetError ? cause.message : null)
      }
    })()
    return () => {
      alive = false
    }
  }, [partyId, revision, tick])

  function run(work: () => Promise<unknown>) {
    setBusy(true)
    setError(null)
    work()
      .catch((cause: unknown) => {
        setError(cause instanceof NetError ? cause.message : '뜻대로 되지 않았습니다.')
      })
      .finally(() => {
        setBusy(false)
        setTick((n) => n + 1)
      })
  }

  /** 링크는 손으로 고르기 어렵다. 눌러서 베껴지게 하고, 막히면 주소를 펼쳐 준다. */
  function copy(token: string) {
    const url = new URL(window.location.href)
    url.hash = '#' + inviteRoute(token)
    const text = url.toString()
    navigator.clipboard
      .writeText(text)
      .then(() => {
        setCopied(token)
        setTimeout(() => setCopied(null), 2000)
      })
      .catch(() => {
        window.prompt('이 링크를 보내십시오', text)
      })
  }

  return (
    <section className="sheet__block crew">
      <h2 className="sheet__label">함께하는 이들</h2>

      <ul className="crew__members">
        {members.map((m) => (
          <li key={m.userId}>
            {m.displayName || '이름 없음'}
            {m.userId === me.userId && <span className="crew__me"> (나)</span>}
          </li>
        ))}
        {members.length === 0 && <li className="crew__alone">아직 혼자다.</li>}
      </ul>

      {error !== null && (
        <p className="crew__error" role="alert">
          {error}
        </p>
      )}

      {invites.length > 0 && (
        <ul className="crew__invites">
          {invites.map((invite) => (
            <li key={invite.token}>
              <code className="crew__token">…{invite.token.slice(-8)}</code>
              <span className="crew__left">{remainingLabel(invite.expiresAt, readAt)}</span>
              <button type="button" onClick={() => copy(invite.token)}>
                {copied === invite.token ? '베꼈다' : '링크 베끼기'}
              </button>
              <button
                type="button"
                className="crew__revoke"
                disabled={busy}
                onClick={() => run(() => partyAdapter.revokeInvite(invite.token))}
              >
                거두기
              </button>
            </li>
          ))}
        </ul>
      )}

      <p className="crew__hint">
        링크를 만들어 메신저로 보낸다. 이틀이 지나면 스스로 낡고, 그전에 거둘 수도 있다.
      </p>

      <div className="crew__actions">
        <button
          type="button"
          className="crew__invite"
          disabled={busy}
          onClick={() => run(() => partyAdapter.createInvite(partyId, me, Date.now()))}
        >
          초대장을 쓴다
        </button>
        <button
          type="button"
          className="crew__leave"
          disabled={busy}
          onClick={() => {
            if (!window.confirm(`'${partyName}'에서 나가시겠습니까?`)) return
            onLeave()
          }}
        >
          동행을 그만둔다
        </button>
      </div>
    </section>
  )
}
