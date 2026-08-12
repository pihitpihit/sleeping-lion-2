import { useEffect, useState } from 'react'
import { useAuthStore } from '../auth/authStore'
import type { Identity } from '../net/types'
import { useJournalStore } from './campaignStore'
import { classInfoOf, useClassStore } from './classStore'
import { classIconUrl } from './character'
import { Crew } from './Crew'
import { ClassPicker } from './ClassPicker'
import { createCharacter } from './characterNet'
import type { MyCharacter } from './mineNet'
import { useMineStore } from './mineStore'
import { PartySheet } from './PartySheet'
import { Roster } from './Roster'
import { backHref, readJournalRoute } from './journalRoute'
import './JournalPage.css'

/**
 * 일지 — 축 ①.
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ **캐릭터가 먼저고, 파티는 그 캐릭터가 속한 곳이다.**                      │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * 2026-08-12까지는 파티가 먼저 보이고 그 안에 캐릭터가 있었다. 사람이 앱을 여는
 * 까닭은 **제 캐릭터를 보려는 것**이므로 순서를 뒤집었다. 파티 목록은 아래에
 * 그대로 남는다 — 파티 시트·초대·평판으로 가는 길이 그것뿐이다.
 *
 * **표는 안 바꿨다.** 캐릭터는 여전히 기록지에 달려 있고 기록지는 파티에 달려
 * 있다. 파티 하나에 기록지 하나뿐이라 `campaign_id`가 사실상 "어느 파티"와
 * 같으므로, 뒤집을 것은 화면이지 표가 아니었다.
 *
 * 갈래가 셋이다.
 *
 * | 주소 | 보이는 것 |
 * |---|---|
 * | `#/journal` | 내 캐릭터 + 파티 목록 |
 * | `#/journal/<파티>` | 파티 시트 · 무리 · 동행 |
 * | `#/journal/<파티>/<캐릭터>` | 그 캐릭터 시트 한 장 |
 *
 * 초대 링크와 같은 방식이라 라우터를 새로 들이지 않는다(`routes.ts`).
 */
export function JournalPage() {
  const session = useAuthStore((s) => s.session)

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

  const mine = useMineStore((s) => s.characters)
  const mineLoaded = useMineStore((s) => s.loaded)
  const loadMine = useMineStore((s) => s.load)

  const [newName, setNewName] = useState('')
  const [route, setRoute] = useState(() => readJournalRoute(window.location.hash))

  useEffect(() => {
    const onHash = () => setRoute(readJournalRoute(window.location.hash))
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const userId = session?.userId ?? null
  const displayName = session?.displayName ?? ''
  const { partyId } = route

  useEffect(() => {
    if (userId === null) return
    const me: Identity = { userId, displayName }
    if (partyId) void open(partyId, me)
    else {
      close()
      void refresh(me)
    }
  }, [partyId, userId, displayName, open, close, refresh])

  /**
   * 내 캐릭터는 **목록으로 돌아올 때마다** 다시 읽는다.
   *
   * 기록지 안에서 캐릭터를 세우거나 거두고 나오면 목록이 달라져 있다. 한 번 읽고
   * 마는 채로 두면 방금 만든 캐릭터가 첫 화면에 없다.
   */
  useEffect(() => {
    if (userId === null || partyId) return
    void loadMine(userId)
  }, [userId, partyId, loadMine])

  const reloadMine = () => {
    if (userId !== null) void loadMine(userId)
  }

  if (session === null) return null
  const me: Identity = { userId: session.userId, displayName: session.displayName }

  async function onCreate() {
    const id = await addParty(newName, me)
    if (!id) return
    setNewName('')
    window.location.hash = `#/journal/${id}`
  }

  const partyTitle = current ? current.campaign?.name || current.party.name : ''
  const title = partyId ? partyTitle : '일지'

  return (
    <div className="journal">
      <header className="journal__bar">
        <a
          className="journal__back"
          href={backHref(route)}
          aria-label={partyId ? '일지 목록으로' : '처음으로'}
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

      {!partyId ? (
        <>
          <MyCharacters characters={mine} loaded={mineLoaded} />

          {!offline && <NewCharacter ownerId={me.userId} onMade={reloadMine} />}

          {/*
            파티 세우기.

            **목록은 안 낸다**(2026-08-12) — 일지는 캐릭터를 보는 자리다. 파티
            기록지로는 캐릭터의 부제를 눌러 들어간다. 그래도 **세우는 자리는
            남긴다**: 첫 파티는 어디선가 세워야 하고, 캐릭터의 「파티에 들기」가
            여기로 보낸다.
          */}
          {!offline && (
            <>
              <h2 className="journal__section">새 파티</h2>
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
            </>
          )}
        </>
      ) : !current?.campaign ? (
        loaded && <p className="journal__empty">그런 기록지가 없다.</p>
      ) : (
        <>
          <PartySheet
            key={current.campaign.id}
            campaign={current.campaign}
            readOnly={offline}
            onEdit={(edits) => void edit(edits)}
          />
          {/*
            캐릭터는 **거울이 있어 오프라인에서도 보인다.** 고치는 것만 잠근다 —
            골드와 경험은 지하에서 세 시간 하는 동안 계속 들여다보는 값이다.
          */}
          <Roster campaignId={current.campaign.id} me={me} readOnly={offline} />

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
      )}
    </div>
  )
}

/**
 * 캐릭터 세우기 — **파티보다 먼저.**
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ **캐릭터가 먼저 서고 파티에는 나중에 든다.**                              │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * 2026-08-12까지는 파티를 세우고 그 안에서 캐릭터를 만들었다. 실제로 사람은 제
 * 캐릭터를 먼저 정하고 누구와 놀지는 그다음에 정한다 — 봉투를 뜯는 것과 약속을
 * 잡는 것은 다른 일이다. 표도 그렇게 바뀌었다(`0015`).
 *
 * 이름과 클래스만 받는다. **클래스는 여기서만 정할 수 있다** — 세운 뒤에는 못
 * 바꾼다(구현 결정 181).
 */
function NewCharacter({ ownerId, onMade }: { ownerId: string; onMade: () => void }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [icon, setIcon] = useState(0)
  const [classId, setClassId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function make() {
    const trimmed = name.trim()
    if (trimmed === '') return
    setBusy(true)
    setError(null)
    try {
      // 파티 없이 세운다. 드는 것은 캐릭터 화면에서 따로 한다.
      const made = await createCharacter(null, ownerId, trimmed, icon, classId)
      onMade()
      window.location.hash = `#/character/${made.id}`
    } catch (cause) {
      console.error('[character]', cause)
      setError('세우지 못했다.')
    } finally {
      setBusy(false)
    }
  }

  if (!open) {
    return (
      <button type="button" className="journal__newchar" onClick={() => setOpen(true)}>
        캐릭터 세우기
      </button>
    )
  }

  return (
    <section className="newchar">
      <h2 className="journal__section">새 캐릭터</h2>

      <div className="journal__new">
        <input
          className="journal__new-input"
          value={name}
          placeholder="이름을 짓는다"
          aria-label="새 캐릭터 이름"
          maxLength={40}
          autoFocus
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      <p className="char__note">
        클래스는 <strong>세울 때만 정한다.</strong> 그 뒤로는 못 바꾼다.
      </p>
      <ClassPicker
        classId={classId}
        icon={icon}
        disabled={busy}
        onChange={(next) => {
          setClassId(next.classId)
          setIcon(next.icon)
        }}
      />

      {error !== null && (
        <p className="journal__error" role="alert">
          {error}
        </p>
      )}

      <div className="sheet__bar">
        <button
          type="button"
          className="sheet__cancel"
          onClick={() => {
            setOpen(false)
            setName('')
          }}
        >
          그만두기
        </button>
        <button
          type="button"
          className="sheet__save"
          disabled={busy || name.trim() === ''}
          onClick={() => void make()}
        >
          세우기
        </button>
      </div>
    </section>
  )
}

/* --------------------------------------------------------------------------
   내 캐릭터 — 첫 화면 맨 위
   -------------------------------------------------------------------------- */

function MyCharacters({
  characters,
  loaded,
}: {
  characters: readonly MyCharacter[]
  loaded: boolean
}) {
  const classes = useClassStore((s) => s.list)
  const loadClasses = useClassStore((s) => s.load)
  useEffect(() => {
    void loadClasses()
  }, [loadClasses])

  // 은퇴한 캐릭터는 상에 없다. 지우지 않은 것은 기록의 일부이므로 파티 기록지
  // 안에는 남아 있고, 여기서만 접는다.
  const active = characters.filter((c) => !c.retired)

  return (
    <>
      <h2 className="journal__section">내 캐릭터</h2>

      {loaded && active.length === 0 && (
        <p className="journal__empty">아직 세운 캐릭터가 없다. 아래에서 하나 세워라.</p>
      )}

      {active.length > 0 && (
        <ul className="journal__mine">
          {active.map((c) => {
            const info = classInfoOf(classes, c.classId, c.classIcon)
            const iconUrl = classIconUrl(c.classIcon)
            return (
              <li key={c.id}>
                <a className="journal__char" href={`#/character/${c.id}`}>
                  {/* 양피지 원반. 아이콘 색을 건드리지 않는다(구현 결정 41). */}
                  <span
                    className={`journal__char-badge${iconUrl ? '' : ' journal__char-badge--plain'}`}
                    aria-hidden="true"
                  >
                    {iconUrl ? <img src={iconUrl} alt="" draggable={false} /> : '?'}
                  </span>

                  <span className="journal__char-body">
                    <span className="journal__char-name">{c.name || '이름 없음'}</span>
                    <span className="journal__char-sub">
                      {/* 클래스 수치를 안 넣었으면 이름이랄 것이 없다 — 그때는
                          파티만 적는다. 이름을 지어내지 않는다(구현 결정 40). */}
                      {info && <span className="journal__char-class">{info.name}</span>}
                      {/* 어느 파티에 속했는지. **아직 안 들었으면 그렇게 적는다.** */}
                      <span
                        className={`journal__char-party${c.partyName ? '' : ' journal__char-party--none'}`}
                      >
                        {c.partyName ?? '파티 없음'}
                      </span>
                    </span>
                  </span>

                  <span className="journal__char-level sl-numeral" aria-label={`레벨 ${c.level}`}>
                    {c.level}
                  </span>
                </a>
              </li>
            )
          })}
        </ul>
      )}
    </>
  )
}
