import { useEffect, useState } from 'react'
import { useAuthStore } from '../auth/authStore'
import type { Identity } from '../net/types'
import { useJournalStore } from './campaignStore'
import { Crew } from './Crew'
import { PartySheet } from './PartySheet'
import { priceModifierLabel, shopPriceModifier } from './reputation'
import './JournalPage.css'

/**
 * 일지 — 축 ①.
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ **항목 하나 = 파티 하나 = 기록지 하나.**                                  │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * 처음에는 '동행'(사람들의 파티)을 따로 두었다. 그러면 화면에 파티가 둘이 되어
 * 어느 쪽을 만들라는 것인지 알 수 없다 — 형님이 "두 개가 따로 논다"고 짚었다.
 * 실물에서는 하나다. 파티 시트가 곧 그 파티이고, 파티원 관리도 그 시트에 딸린다.
 *
 * 경로는 `#/journal`(목록)과 `#/journal/<파티 id>`(기록지)다. 초대 링크와 같은
 * 방식이라 라우터를 새로 들이지 않는다(`routes.ts`).
 */
export function JournalPage() {
  const session = useAuthStore((s) => s.session)

  const entries = useJournalStore((s) => s.entries)
  const current = useJournalStore((s) => s.current)
  const loaded = useJournalStore((s) => s.loaded)
  const offline = useJournalStore((s) => s.offline)
  const busy = useJournalStore((s) => s.busy)
  const error = useJournalStore((s) => s.error)
  const refresh = useJournalStore((s) => s.refresh)
  const open = useJournalStore((s) => s.open)
  const close = useJournalStore((s) => s.close)
  const addParty = useJournalStore((s) => s.addParty)
  const edit = useJournalStore((s) => s.edit)
  const leave = useJournalStore((s) => s.leave)

  const [newName, setNewName] = useState('')
  const [openId, setOpenId] = useState(() => idFromHash(window.location.hash))

  useEffect(() => {
    const onHash = () => setOpenId(idFromHash(window.location.hash))
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const userId = session?.userId ?? null
  const displayName = session?.displayName ?? ''

  useEffect(() => {
    if (userId === null) return
    const me: Identity = { userId, displayName }
    if (openId) void open(openId, me)
    else {
      close()
      void refresh(me)
    }
  }, [openId, userId, displayName, open, close, refresh])

  if (session === null) return null
  const me: Identity = { userId: session.userId, displayName: session.displayName }

  async function onCreate() {
    const id = await addParty(newName, me)
    if (!id) return
    setNewName('')
    window.location.hash = `#/journal/${id}`
  }

  const title = openId && current ? current.campaign?.name || current.party.name : '일지'

  return (
    <div className="journal">
      <header className="journal__bar">
        <a
          className="journal__back"
          href={openId ? '#/journal' : '#/'}
          aria-label={openId ? '일지 목록으로' : '처음으로'}
        >
          ←
        </a>
        <h1 className="journal__title">{title}</h1>
      </header>

      {/* 거울을 보여주는 중이라는 것을 걷을 수 없게 알린다. 고칠 수 없기 때문이다. */}
      {offline && (
        <p className="journal__offline" role="status">
          서버에 닿지 못했다. <strong>마지막으로 본 것</strong>을 보여준다 — 지금은 고칠 수 없다.
        </p>
      )}

      {error && (
        <p className="journal__error" role="alert">
          {error}
        </p>
      )}

      {openId ? (
        current?.campaign ? (
          <>
            <PartySheet
              key={current.campaign.id}
              campaign={current.campaign}
              readOnly={offline}
              onEdit={(edits) => void edit(edits)}
            />
            {!offline && (
              <Crew
                partyId={current.party.id}
                partyName={current.party.name}
                me={me}
                onLeave={() => {
                  void leave(current.party.id, me)
                  window.location.hash = '#/journal'
                }}
              />
            )}
          </>
        ) : (
          loaded && <p className="journal__empty">그런 기록지가 없다.</p>
        )
      ) : (
        <>
          {loaded && entries.length === 0 && (
            <p className="journal__empty">아직 적어둔 것이 없다. 파티를 하나 세워라.</p>
          )}

          {entries.length > 0 && (
            <ul className="journal__list">
              {entries.map(({ party, campaign }) => {
                const reputation = campaign?.reputation ?? 0
                return (
                  <li key={party.id}>
                    <a className="journal__entry" href={`#/journal/${party.id}`}>
                      <span className="journal__entry-name">
                        {campaign?.name || party.name || '이름 없는 파티'}
                      </span>
                      <span className="journal__entry-meta">
                        {campaign?.location && (
                          <span className="journal__entry-place">{campaign.location}</span>
                        )}
                        <span className="sl-numeral" aria-label={`평판 ${reputation}`}>
                          {reputation > 0 ? `+${reputation}` : reputation}
                        </span>
                        <span className="journal__entry-price sl-numeral" aria-hidden="true">
                          {priceModifierLabel(shopPriceModifier(reputation))}
                        </span>
                      </span>
                    </a>
                  </li>
                )
              })}
            </ul>
          )}

          {!offline && (
            <div className="journal__new">
              <input
                className="journal__new-input"
                value={newName}
                placeholder="새 파티 이름"
                aria-label="새 파티 이름"
                maxLength={40}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    void onCreate()
                  }
                }}
              />
              <button
                type="button"
                className="journal__new-button"
                disabled={busy || newName.trim() === ''}
                onClick={() => void onCreate()}
              >
                세우기
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

/** `#/journal/abc` → `abc`. 목록이면 빈 문자열. */
function idFromHash(hash: string): string {
  const parts = hash.replace(/^#\//, '').split('/')
  return parts[0] === 'journal' ? (parts[1] ?? '') : ''
}
