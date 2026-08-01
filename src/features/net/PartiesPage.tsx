import { useEffect, useState } from 'react'
import { useAuthStore } from '../auth/authStore'
import { NetError } from './adapter'
import { partyAdapter, useNetRevision } from './index'
import { inviteRoute, remainingLabel } from './invite'
import type { Identity, Invite, Member, Party } from './types'
import './PartiesPage.css'

/**
 * 동행 — 파티와 초대.
 *
 * **파티는 평평하다**(SPEC 6.2). 누구나 만들고, 파티원이면 누구나 초대하고,
 * 한 사람이 여러 파티에 속한다. 6장 첫머리의 "파티장"은 축 ①의 편집 권한에
 * 대한 것이라 여기 섞지 않는다.
 *
 * **시각을 렌더 안에서 읽지 않는다.** 데이터를 불러올 때 함께 찍어 두고 그것으로
 * 남은 시간을 셈한다 — 렌더 중 `Date.now()`를 부르면 같은 입력에 같은 결과가
 * 나오지 않는다(react-hooks/purity). 만료가 이틀이라 시간 단위로 보이면 그만이고,
 * 무언가 바뀔 때마다 다시 읽으므로 오래 묵지도 않는다.
 */
export function PartiesPage() {
  const session = useAuthStore((s) => s.session)
  const revision = useNetRevision()
  const userId = session?.userId ?? null

  const [parties, setParties] = useState<Party[]>([])
  /** 스스로 다시 읽고 싶을 때 올린다. 남이 바꾼 것은 `revision`이 알려준다. */
  const [tick, setTick] = useState(0)
  const [newName, setNewName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [openId, setOpenId] = useState<string | null>(null)

  useEffect(() => {
    if (userId === null) return
    let alive = true
    void (async () => {
      const list = await partyAdapter.listParties(userId)
      // 화면을 떠난 뒤 응답이 와서 유령 갱신이 일어나는 것을 막는다.
      if (alive) setParties(list)
    })()
    return () => {
      alive = false
    }
  }, [userId, revision, tick])

  if (session === null) return null
  const me: Identity = { userId: session.userId, displayName: session.displayName }

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

  return (
    <main className="parties">
      <header className="parties__head">
        <a className="parties__back" href="#/">
          ← 잠자는 사자 2호점
        </a>
        <h1 className="parties__title">동행</h1>
        <p className="parties__lede">
          같이 다니는 이들을 여기 모은다. 파티는 누구나 꾸릴 수 있고, 파티에 든 사람은 누구나 다른
          이를 부를 수 있다.
        </p>
      </header>

      <section className="parties__new">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            const name = newName
            setNewName('')
            run(() => partyAdapter.createParty(name, me, Date.now()))
          }}
        >
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="새 파티의 이름"
            aria-label="새 파티의 이름"
            maxLength={40}
          />
          <button type="submit" disabled={busy || newName.trim() === ''}>
            파티를 꾸린다
          </button>
        </form>
      </section>

      {error !== null && (
        <p className="parties__error" role="alert">
          {error}
        </p>
      )}

      {parties.length === 0 ? (
        <p className="parties__empty">아직 아무와도 동행하지 않는다.</p>
      ) : (
        <ul className="parties__list">
          {parties.map((party) => (
            <PartyCard
              key={party.id}
              party={party}
              me={me}
              open={openId === party.id}
              onToggle={() => setOpenId(openId === party.id ? null : party.id)}
              onRun={run}
              busy={busy}
              revision={revision}
              tick={tick}
            />
          ))}
        </ul>
      )}
    </main>
  )
}

interface CardProps {
  party: Party
  me: Identity
  open: boolean
  onToggle: () => void
  onRun: (work: () => Promise<unknown>) => void
  busy: boolean
  revision: number
  tick: number
}

function PartyCard({ party, me, open, onToggle, onRun, busy, revision, tick }: CardProps) {
  const [members, setMembers] = useState<Member[]>([])
  const [invites, setInvites] = useState<Invite[]>([])
  /** 목록을 읽은 시각. 남은 시간을 여기서부터 센다. */
  const [readAt, setReadAt] = useState(0)
  const [copied, setCopied] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    let alive = true
    void (async () => {
      const [m, i] = await Promise.all([
        partyAdapter.listMembers(party.id),
        partyAdapter.listInvites(party.id),
      ])
      if (alive) {
        setMembers(m)
        setInvites(i)
        setReadAt(Date.now())
      }
    })()
    return () => {
      alive = false
    }
  }, [open, party.id, revision, tick])

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
        // 클립보드가 막힌 곳(비보안 문맥 등)에서는 직접 고르게 둔다.
        window.prompt('이 링크를 보내십시오', text)
      })
  }

  return (
    <li className={`party ${open ? 'party--open' : ''}`}>
      <button type="button" className="party__head" onClick={onToggle} aria-expanded={open}>
        <span className="party__name">{party.name}</span>
        <span className="party__chevron" aria-hidden="true">
          {open ? '▾' : '▸'}
        </span>
      </button>

      {open && (
        <div className="party__body">
          <h2 className="party__sub">함께하는 이들</h2>
          <ul className="party__members">
            {members.map((m) => (
              <li key={m.userId}>
                {m.displayName}
                {m.userId === me.userId && <span className="party__me"> (나)</span>}
              </li>
            ))}
          </ul>

          <h2 className="party__sub">초대장</h2>
          <p className="party__hint">
            링크를 만들어 메신저로 보낸다. 이틀이 지나면 스스로 낡고, 그전에 거둘 수도 있다.
          </p>

          {invites.length > 0 && (
            <ul className="party__invites">
              {invites.map((invite) => (
                <li key={invite.token}>
                  <code className="party__token">…{invite.token.slice(-8)}</code>
                  <span className="party__left">{remainingLabel(invite.expiresAt, readAt)}</span>
                  <button type="button" onClick={() => copy(invite.token)}>
                    {copied === invite.token ? '베꼈다' : '링크 베끼기'}
                  </button>
                  <button
                    type="button"
                    className="party__revoke"
                    disabled={busy}
                    onClick={() => onRun(() => partyAdapter.revokeInvite(invite.token))}
                  >
                    거두기
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="party__actions">
            <button
              type="button"
              disabled={busy}
              onClick={() => onRun(() => partyAdapter.createInvite(party.id, me, Date.now()))}
            >
              초대장을 쓴다
            </button>
            <button
              type="button"
              className="party__leave"
              disabled={busy}
              onClick={() => {
                if (!window.confirm(`'${party.name}'에서 나가시겠습니까?`)) return
                onRun(() => partyAdapter.leaveParty(party.id, me.userId))
              }}
            >
              동행을 그만둔다
            </button>
          </div>
        </div>
      )}
    </li>
  )
}
