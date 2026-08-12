import { useEffect, useState } from 'react'
import { useAuthStore } from '../auth/authStore'
import { useJournalStore } from './campaignStore'
import { CharacterSheet } from './CharacterSheet'
import { characterIdFromHash } from './journalRoute'
import { useOneCharacterStore } from './oneCharacter'
import './JournalPage.css'

/**
 * 캐릭터 한 장 — `#/character/<id>`.
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ **파티를 몰라도 열린다.**                                                 │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * 캐릭터가 먼저 서고 파티에는 나중에 든다(2026-08-12). 그래서 주소에 파티가
 * 들어가지 않는다 — 예전 `#/journal/<파티>/<캐릭터>`는 파티 없는 캐릭터를 열 수가
 * 없었다.
 *
 * 파티에 들었으면 그 기록지로 가는 문을 내고, 안 들었으면 **드는 자리**를 낸다.
 */
export function CharacterPage() {
  const session = useAuthStore((s) => s.session)
  const [id, setId] = useState(() => characterIdFromHash(window.location.hash))

  useEffect(() => {
    const onHash = () => setId(characterIdFromHash(window.location.hash))
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const character = useOneCharacterStore((s) => s.character)
  const loaded = useOneCharacterStore((s) => s.loaded)
  const busy = useOneCharacterStore((s) => s.busy)
  const error = useOneCharacterStore((s) => s.error)
  const load = useOneCharacterStore((s) => s.load)
  const edit = useOneCharacterStore((s) => s.edit)
  const join = useOneCharacterStore((s) => s.join)
  const remove = useOneCharacterStore((s) => s.remove)

  /** 들 수 있는 파티 — 내가 든 것뿐이다. 서버도 같은 것을 본다(`0015`). */
  const entries = useJournalStore((s) => s.entries)
  const refresh = useJournalStore((s) => s.refresh)

  const userId = session?.userId ?? null
  const displayName = session?.displayName ?? ''

  useEffect(() => {
    if (id === '') return
    void load(id)
  }, [id, load])

  useEffect(() => {
    if (userId === null) return
    void refresh({ userId, displayName })
  }, [userId, displayName, refresh])

  if (session === null) return null

  const mine = character !== null && character.ownerId === session.userId
  const party = entries.find((e) => e.campaign?.id === character?.campaignId)
  const partyName = party ? party.campaign?.name || party.party.name : ''

  return (
    <div className="journal">
      <header className="journal__bar">
        <a className="journal__back" href="#/journal" aria-label="일지로">
          ←
        </a>
        <h1 className="journal__title">{character?.name || '캐릭터'}</h1>
      </header>

      {error && (
        <p className="journal__error" role="alert">
          {error}
        </p>
      )}

      {character === null ? (
        loaded && <p className="journal__empty">그런 캐릭터가 없다.</p>
      ) : (
        <>
          {/*
            파티 자리.

            **시트 위에 둔다.** 정산하다 파티 시트를 보러 가는 일이 잦은데 아래에
            두면 긴 시트를 끝까지 내려야 한다.
          */}
          {character.campaignId ? (
            <a className="journal__toparty" href={`#/journal/${party?.party.id ?? ''}`}>
              {partyName || '파티'} 기록지로
            </a>
          ) : (
            mine && (
              <JoinParty
                busy={busy}
                parties={entries.map((e) => ({
                  campaignId: e.campaign?.id ?? '',
                  name: e.campaign?.name || e.party.name || '이름 없는 파티',
                }))}
                onJoin={(campaignId) => void join(campaignId)}
              />
            )
          )}

          <CharacterSheet
            key={character.id}
            character={character}
            standalone
            mine={mine}
            onEdit={(edits) => void edit(edits)}
            onRemove={() => {
              void remove()
              window.location.hash = '#/journal'
            }}
          />
        </>
      )}
    </div>
  )
}

/**
 * 파티에 드는 자리 — **아직 안 든 캐릭터에만 나온다.**
 *
 * 고를 수 있는 것은 **내가 든 파티**뿐이다. 서버도 같은 것을 보므로(`0015`의
 * `with check`) 여기서 좁히는 것은 헛손질을 줄이는 것일 뿐이다.
 *
 * 들 파티가 하나도 없으면 **파티를 세우러 가는 길**을 낸다 — 막다른 곳을 두지
 * 않는다.
 */
function JoinParty({
  parties,
  busy,
  onJoin,
}: {
  parties: readonly { campaignId: string; name: string }[]
  busy: boolean
  onJoin: (campaignId: string) => void
}) {
  const usable = parties.filter((p) => p.campaignId !== '')

  return (
    <section className="joinparty">
      <h2 className="joinparty__title">아직 파티에 들지 않았다</h2>
      {usable.length === 0 ? (
        <p className="joinparty__hint">
          들 파티가 없다. <a href="#/journal">일지에서 파티를 세워라.</a>
        </p>
      ) : (
        <>
          <p className="joinparty__hint">어느 파티에 넣을지 고른다.</p>
          <ul className="joinparty__list">
            {usable.map((p) => (
              <li key={p.campaignId}>
                <button
                  type="button"
                  className="joinparty__pick"
                  disabled={busy}
                  onClick={() => onJoin(p.campaignId)}
                >
                  {p.name}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}
