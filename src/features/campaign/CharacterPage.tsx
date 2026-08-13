import { useEffect, useState } from 'react'
import { useAuthStore } from '../auth/authStore'
import { useJournalStore } from './campaignStore'
import { classIconUrl } from './character'
import { CharacterSheet } from './CharacterSheet'
import { classInfoOf, useClassStore } from './classStore'
import { characterIdFromHash } from './journalRoute'
import { useOneCharacterStore } from './oneCharacter'
import { useAtTop } from './useAtTop'
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
  const atTop = useAtTop()

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

  const classes = useClassStore((s) => s.list)
  const loadClasses = useClassStore((s) => s.load)
  useEffect(() => {
    void loadClasses()
  }, [loadClasses])

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

  /*
    띠에 이름표를 세우는 데 필요한 것 — 표식 그림과 클래스 이름.

    **클래스 수치가 없어도 그대로 돈다**(절대 원칙 3). 그때는 아이콘과 이름만
    보이던 종전 모습이다.
  */
  const info = classInfoOf(classes, character?.classId ?? null, character?.classIcon ?? 0)
  const iconUrl = classIconUrl(info?.icon ?? character?.classIcon ?? 0)

  return (
    <div className="journal">
      {/*
        ┌────────────────────────────────────────────────────────────────────┐
        │ **띠 하나가 화면 위를 통째로 덮는다.**                              │
        └────────────────────────────────────────────────────────────────────┘

        뒤로가기 띠와 시트의 머리가 따로 있어 **이름이 두 줄로 겹쳤고**, 붙박이가
        페이지 여백 안에 있어 **좌우로 다른 것들이 지나가는 것이 다 보였다** —
        형님이 셋 다 짚었다. 하나로 합쳐 화면 끝까지 밀고, 안전영역까지 제 바탕으로
        덮는다.

        파티로 가는 문도 여기 넣는다. 글자 단추로 한 줄을 쓰기에는 아까운 자리다.
      */}
      <header className={`topbar${atTop ? ' topbar--tall' : ''}`}>
        <div className="topbar__inner">
          <a className="journal__back" href="#/journal" aria-label="일지로">
            ←
          </a>

          {character && (
            <>
              <span className="topbar__badge" aria-hidden={iconUrl === null}>
                {iconUrl ? (
                  <img
                    src={iconUrl}
                    alt={`클래스 표식 ${character.classIcon}번`}
                    draggable={false}
                  />
                ) : (
                  <span aria-hidden="true">?</span>
                )}
              </span>

              <span className="topbar__names">
                <h1 className="topbar__name">{character.name || '이름 없음'}</h1>
                <span className="topbar__sub">
                  {character.ownerName || '이름 없음'}의 캐릭터
                  {info && (
                    <>
                      {' · '}
                      <span className="topbar__class">{info.name}</span>
                      {info.handSize > 0 && (
                        <>
                          {' · '}손 <span className="sl-numeral">{info.handSize}</span>장
                        </>
                      )}
                    </>
                  )}
                </span>
              </span>
            </>
          )}

          {/*
            파티 기록지로 — **펼친 기록지 그림**이다. 직접 그린 도형이라 Creator
            Pack 격리 규칙(1-1)에 걸리지 않는다. 눈에만 보이는 표식이므로 읽어
            주는 쪽에는 파티 이름까지 글자로 간다.
          */}
          {character?.campaignId && (
            <a
              className="topbar__party"
              href={`#/journal/${party?.party.id ?? ''}`}
              aria-label={`${partyName || '파티'} 기록지로`}
              title={`${partyName || '파티'} 기록지로`}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path
                  d="M12 6.6C10.1 5.3 7.7 4.7 4.6 4.7v12.6c3.1 0 5.5.6 7.4 1.9 1.9-1.3 4.3-1.9 7.4-1.9V4.7c-3.1 0-5.5.6-7.4 1.9Z"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinejoin="round"
                />
                <path d="M12 6.6v12.6" fill="none" stroke="currentColor" strokeWidth="1.6" />
              </svg>
            </a>
          )}
        </div>
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
          {/* 아직 파티에 안 들었으면 드는 자리를 낸다. 들었으면 띠의 문이 그 몫이다. */}
          {!character.campaignId && mine && (
            <JoinParty
              busy={busy}
              parties={entries.map((e) => ({
                campaignId: e.campaign?.id ?? '',
                name: e.campaign?.name || e.party.name || '이름 없는 파티',
              }))}
              onJoin={(campaignId) => void join(campaignId)}
            />
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
          들 파티가 없다. <a href="#/journal">일지에서 파티를 생성한다.</a>
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
