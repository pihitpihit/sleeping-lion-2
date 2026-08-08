import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useAuthStore } from '../../auth/authStore'
import { partyAdapter } from '../../net'
import type { Party } from '../../net/types'
import { useBattleStore } from './battleStore'
import type { BattleRow } from './battleNet'
import './BattlePanel.css'

interface Props {
  onClose: () => void
}

/**
 * 전투 — 여는 자리.
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ **파티를 읽는다. 캠페인은 모른다.**                                       │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * 전투는 파티에 매달린다(구현 결정 19). 파티는 사람들의 묶음이라 축 ①의
 * 기록지와 다른 것이고, 그래서 여기서 파티 목록을 읽어도 두 축의 경계가 무너지지
 * 않는다. 기록지·캐릭터는 부르지 않는다.
 *
 * **`createPortal`로 `document.body`에 그린다.** 위젯 틀이 회전 때문에 늘
 * `transform`을 걸고 있고, `transform`이 걸린 조상은 `position: fixed`의 기준이
 * 된다(구현 결정 37). 도구 띠 안에 두면 90도 돌린 화면에서 팝업이 함께 눕는다.
 */
export function BattlePanel({ onClose }: Props) {
  const session = useAuthStore((s) => s.session)
  const battle = useBattleStore((s) => s.battle)
  const participants = useBattleStore((s) => s.participants)
  const busy = useBattleStore((s) => s.busy)
  const error = useBattleStore((s) => s.error)
  const look = useBattleStore((s) => s.look)
  const open = useBattleStore((s) => s.open)
  const join = useBattleStore((s) => s.join)
  const leave = useBattleStore((s) => s.leave)
  const close = useBattleStore((s) => s.close)

  const [parties, setParties] = useState<Party[]>([])
  const [partyId, setPartyId] = useState('')
  /** 고른 파티에 이미 열려 있는 판. 내가 앉지 않았어도 보인다. */
  const [found, setFound] = useState<BattleRow | null>(null)
  const [loading, setLoading] = useState(true)

  const userId = session?.userId ?? null

  useEffect(() => {
    if (userId === null) return
    let alive = true
    void (async () => {
      try {
        const list = await partyAdapter.listParties(userId)
        if (!alive) return
        setParties(list)
        setPartyId((current) => current || (list[0]?.id ?? ''))
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [userId])

  // 고른 파티에 열린 판이 있는지 살핀다. 앉지는 않는다.
  useEffect(() => {
    if (partyId === '' || battle !== null) return
    let alive = true
    void (async () => {
      const open = await look(partyId)
      if (alive) setFound(open)
    })()
    return () => {
      alive = false
    }
  }, [partyId, battle, look])

  useEffect(() => {
    function onKey(event: globalThis.KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  if (session === null) return null

  const seated = battle !== null

  return createPortal(
    <div className="battle-veil" role="presentation" onClick={onClose}>
      <div
        className="battle"
        role="dialog"
        aria-modal="true"
        aria-label="전투"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="battle__title">전투</h2>

        <p className="battle__lead">
          <strong>다른 사람과</strong> 판을 나누는 자리다. 같이 앉으면 원소판·라운드·체력·보정 덱을
          함께 본다. 판을 접으면 어디에도 남지 않는다.
        </p>
        <p className="battle__lead">
          내 기기끼리는 <strong>전투를 열지 않아도 저절로 맞춰진다</strong> — 같은 계정이면 판이
          하나다.
        </p>

        {error && (
          <p className="battle__error" role="alert">
            {error}
          </p>
        )}

        {seated ? (
          <>
            <h3 className="battle__label">앉은 사람</h3>
            <ul className="battle__seats">
              {participants.map((p) => (
                <li key={p.userId}>
                  {p.displayName || '이름 없음'}
                  {p.userId === session.userId && <span className="battle__me"> (나)</span>}
                </li>
              ))}
              {participants.length === 0 && <li className="battle__alone">혼자 앉아 있다.</li>}
            </ul>

            <div className="battle__actions">
              <button type="button" disabled={busy} onClick={() => void leave(session.userId)}>
                자리에서 일어난다
              </button>
              <button
                type="button"
                className="battle__fold"
                disabled={busy}
                onClick={() => void close(session.userId)}
              >
                판을 접는다
              </button>
            </div>
            <p className="battle__hint">
              일어나면 판은 남고 나만 빠진다. <strong>접으면 판이 사라진다</strong> — 값도 함께
              간다.
            </p>
          </>
        ) : (
          <>
            {loading && <p className="battle__alone">파티를 읽는 중.</p>}

            {!loading && parties.length === 0 && (
              <p className="battle__alone">
                아직 파티가 없다. <a href="#/journal">일지</a>에서 하나 세워라.
              </p>
            )}

            {parties.length > 0 && (
              <>
                <label className="battle__label" htmlFor="battle-party">
                  어느 파티
                </label>
                <select
                  id="battle-party"
                  className="battle__select"
                  value={partyId}
                  onChange={(e) => setPartyId(e.target.value)}
                >
                  {parties.map((party) => (
                    <option key={party.id} value={party.id}>
                      {party.name || '이름 없는 파티'}
                    </option>
                  ))}
                </select>

                <div className="battle__actions">
                  {found ? (
                    <button
                      type="button"
                      className="battle__go"
                      disabled={busy}
                      onClick={() => void join(found, session.userId)}
                    >
                      열린 판에 앉는다
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="battle__go"
                      disabled={busy || partyId === ''}
                      onClick={() => void open(partyId, session.userId)}
                    >
                      판을 편다
                    </button>
                  )}
                </div>

                <p className="battle__hint">
                  {found
                    ? '이미 열린 판이 있다. 앉으면 상 위의 값을 물려받는다 — 내 화면의 값이 아니라 그쪽이 사실이다.'
                    : '판을 펴면 지금 내 화면의 값이 첫 판이 된다.'}
                </p>
              </>
            )}
          </>
        )}

        <button type="button" className="battle__close" onClick={onClose}>
          닫기
        </button>
      </div>
    </div>,
    document.body,
  )
}
