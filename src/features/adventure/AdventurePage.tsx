import { useEffect, useState, type CSSProperties } from 'react'
import { useAuthStore } from '../auth/authStore'
import { useMineStore } from '../campaign/mineStore'
import { useScrolled } from '../campaign/useScrolled'
import { whenText } from '../campaign/characterLog'
import { useBattleStore } from '../satchel/battle/battleStore'
import { useAdventureStore } from './adventureStore'
import { useCharacterStore } from '../campaign/characterStore'
import { levelForXp } from '../campaign/character'
import { clampLevel, recommendedLevel } from '../rules/scenarioLevel'
import { dedupeParties } from './parties'
import '../campaign/JournalPage.css'
import './AdventurePage.css'

/**
 * 모험 — `#/adventure`.
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ **여기서 시나리오가 실제로 시작된다.**                                    │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * 지금까지 판을 펴는 문은 행낭 안쪽에만 있었다 — 도구를 꺼내려고 들어간 김에
 * 여는 꼴이었다. **판을 여는 것은 도구를 꺼내는 것보다 앞선 일**이므로 대문에
 * 세운다(형님이 정했다).
 *
 * 갈래는 둘뿐이다: **새로 시작하거나, 이미 도는 것에 끼거나.** 도는 것이 없으면
 * 참여 쪽은 잠긴다 — 눌러 봐야 빈 목록이 나오는 자리를 열어 두지 않는다.
 *
 * 모험 하나는 전투 세션 하나다(`battles`) — 판이 끝나면 어디에도 남지 않는다
 * (SPEC 5.4). 새 모험에 무엇을 적을지는 형님이 따로 정한다; 지금은 어느 파티의
 * 모험인지만 고른다.
 */
/** 판을 열었으면 상으로 간다 — 도구가 거기 있다. */
function goToSatchel(): void {
  window.location.hash = '#/satchel'
}

export function AdventurePage() {
  const session = useAuthStore((s) => s.session)
  const scrolled = useScrolled()

  const mine = useMineStore((s) => s.characters)
  const loadMine = useMineStore((s) => s.load)
  const items = useAdventureStore((s) => s.items)
  const loaded = useAdventureStore((s) => s.loaded)
  const loadAdventures = useAdventureStore((s) => s.load)

  const openBattle = useBattleStore((s) => s.open)
  const joinBattle = useBattleStore((s) => s.join)

  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  /** 무엇을 고르는 중인가. 처음에는 아무 쪽도 안 편다 — 고르는 것이 첫 일이다. */
  const [mode, setMode] = useState<'new' | 'join' | null>(null)
  const [partyId, setPartyId] = useState<string | null>(null)
  /** 이번 판에 앉힐 캐릭터들. **여기 없는 사람에게는 판이 안 보인다**(`0032`). */
  const [picked, setPicked] = useState<string[]>([])
  /** 난이도로 얼마나 얹었는가. 권장 레벨에 더한다. */
  const [bump, setBump] = useState(0)

  const userId = session?.userId ?? null

  useEffect(() => {
    if (userId === null) return
    void loadMine(userId)
    void loadAdventures()
  }, [userId, loadMine, loadAdventures])

  /*
    **파티에 든 캐릭터가 있어야 모험을 연다.** 판은 파티 단위로 열리므로
    (구현 결정 19) 어느 파티인지 말할 수 없으면 열 데가 없다. 은퇴한 캐릭터는
    상에 없는 사람이라 세지 않는다(구현 결정 79).
  */
  const parties = dedupeParties(mine)
  const party = parties.find((p) => p.id === partyId) ?? null

  /*
    고른 파티의 캐릭터 전부. **남의 캐릭터도 있어야 한다** — 이번 판에 누가 앉을지
    고르는 자리이므로 내 것만 보이면 파티가 아니다.
  */
  const crew = useCharacterStore((s) => s.characters)
  const loadCrew = useCharacterStore((s) => s.load)
  useEffect(() => {
    if (party === null) return
    void loadCrew(party.campaignId)
  }, [party, loadCrew])

  const roster = crew.filter((c) => !c.retired && c.deletedAt === null)
  const chosen = roster.filter((c) => picked.includes(c.id))

  /*
    **시나리오 레벨은 고른 사람들에게서 나온다** — 평균 ÷ 2, 올림
    (`rules/scenarioLevel.ts`). 레벨은 표를 믿지 않고 경험치에서 다시 뽑는다
    (구현 결정 225).
  */
  const base = recommendedLevel(chosen.map((c) => levelForXp(c.xp)))
  const level = base === null ? null : clampLevel(base + bump)

  /** 지금 보는 시각. 렌더 중에 `Date.now()`를 부르지 않는다(구현 결정 376). */
  const [now] = useState(() => Date.now())

  async function start() {
    if (userId === null || partyId === null || level === null || picked.length === 0) return
    setBusy(true)
    setError(null)
    try {
      await openBattle(partyId, picked, level)
      // 판을 열었으면 상으로 간다 — 도구가 거기 있다.
      goToSatchel()
    } catch (cause) {
      console.error('[adventure]', cause)
      setError('모험을 열지 못했다.')
      setBusy(false)
    }
  }

  async function join(battleId: string, party: string) {
    if (userId === null) return
    setBusy(true)
    setError(null)
    try {
      await joinBattle({ id: battleId, partyId: party, openedBy: '', openedAt: 0, level: 1 }, userId)
      goToSatchel()
    } catch (cause) {
      console.error('[adventure]', cause)
      setError('모험에 들지 못했다.')
      setBusy(false)
    }
  }

  if (session === null) return null

  return (
    <div className="journal">
      <header className="topbar" style={{ '--tb': scrolled } as CSSProperties}>
        <div className="topbar__inner">
          <a className="journal__back" href="#/" aria-label="여관으로">
            ←
          </a>
          <span className="topbar__names">
            <h1 className="topbar__name">모험</h1>
            <span className="topbar__sub">시나리오를 시작하는 자리</span>
          </span>
        </div>
      </header>

      <div className="adv">
        {error !== null && (
          <p className="journal__error" role="alert">
            {error}
          </p>
        )}

        {parties.length === 0 ? (
          /*
            파티에 든 캐릭터가 없으면 열 데가 없다. **막다른 안내는 만드는 자리로
            곧장 보낸다**(구현 결정 312).
          */
          <p className="adv__empty">
            파티에 든 캐릭터가 있어야 모험을 연다.{' '}
            <a href="#/journal">일지에서 캐릭터를 파티에 들인다.</a>
          </p>
        ) : (
          <>
            <div className="adv__choices">
              <button
                type="button"
                className={`adv__choice${mode === 'new' ? ' adv__choice--on' : ''}`}
                onClick={() => setMode('new')}
              >
                <span className="adv__choice-title">새 모험</span>
                <span className="adv__choice-sub">판을 새로 편다</span>
              </button>

              {/*
                **도는 것이 없으면 잠근다.** 눌러 봐야 빈 목록이 나오는 자리를
                열어 두면 고장으로 읽힌다.
              */}
              <button
                type="button"
                className={`adv__choice${mode === 'join' ? ' adv__choice--on' : ''}`}
                disabled={items.length === 0}
                onClick={() => setMode('join')}
              >
                <span className="adv__choice-title">모험에 참여</span>
                <span className="adv__choice-sub">
                  {loaded && items.length === 0
                    ? '도는 모험이 없다'
                    : `${items.length}개가 돌고 있다`}
                </span>
              </button>
            </div>

            {mode === 'new' && (
              <section className="adv__panel">
                <h2 className="adv__title">어느 파티의 모험인가</h2>
                <ul className="adv__parties">
                  {parties.map((p) => (
                    <li key={p.id}>
                      <button
                        type="button"
                        className={`adv__party${partyId === p.id ? ' adv__party--on' : ''}`}
                        onClick={() => setPartyId(p.id)}
                      >
                        {p.name}
                      </button>
                    </li>
                  ))}
                </ul>

                {/* ----------------------------------------------------------
                    누가 앉는가
                    ----------------------------------------------------------
                    ┌──────────────────────────────────────────────────────┐
                    │ **여기 없는 사람에게는 이 판이 안 보인다.**           │
                    └──────────────────────────────────────────────────────┘

                    아무 판에나 난입할 수 없게 한 것이다(형님이 정했다, `0032`) —
                    한 파티가 두 자리로 갈려 놀 수 있으므로 그 자리 사람만 본다.
                    ---------------------------------------------------------- */}
                {party !== null && (
                  <>
                    <h2 className="adv__title">누가 앉는가</h2>
                    <ul className="adv__crew">
                      {roster.map((c) => {
                        const on = picked.includes(c.id)
                        return (
                          <li key={c.id}>
                            <button
                              type="button"
                              className={`adv__member${on ? ' adv__member--on' : ''}`}
                              aria-pressed={on}
                              onClick={() =>
                                setPicked((list) =>
                                  on ? list.filter((id) => id !== c.id) : [...list, c.id],
                                )
                              }
                            >
                              <span className="adv__membername">{c.name || '이름 없음'}</span>
                              <span className="adv__memberlv sl-numeral">{levelForXp(c.xp)}</span>
                            </button>
                          </li>
                        )
                      })}
                      {roster.length === 0 && (
                        <li className="adv__empty">이 파티에 캐릭터가 없다.</li>
                      )}
                    </ul>

                    {/* ------------------------------------------------------
                        시나리오 레벨 — **고른 사람들에게서 나온다**
                        ------------------------------------------------------
                        평균 ÷ 2, 올림이 권장이고 거기서 캐럿으로 얹거나 뺀다
                        (쉬움 −1 · 어려움 +1 · 매우 어려움 +2와 같은 결).
                        ------------------------------------------------------ */}
                    <h2 className="adv__title">시나리오 레벨</h2>
                    {level === null ? (
                      <p className="adv__soon">앉을 사람을 고르면 권장 레벨이 나온다.</p>
                    ) : (
                      <div className="adv__level">
                        <button
                          type="button"
                          className="tally__caret"
                          aria-label="레벨 1 내리기"
                          disabled={level <= 0}
                          onClick={() => setBump((b) => b - 1)}
                        >
                          ‹
                        </button>
                        <b className="adv__levelno sl-numeral">{level}</b>
                        <button
                          type="button"
                          className="tally__caret"
                          aria-label="레벨 1 올리기"
                          disabled={level >= 7}
                          onClick={() => setBump((b) => b + 1)}
                        >
                          ›
                        </button>
                        <span className="adv__levelnote">
                          권장 <b className="sl-numeral">{base}</b>
                          {bump !== 0 && (
                            <>
                              {' '}
                              · {bump > 0 ? '+' : '−'}
                              <b className="sl-numeral">{Math.abs(bump)}</b>
                            </>
                          )}
                        </span>
                      </div>
                    )}
                  </>
                )}

                <div className="sheet__bar">
                  <button
                    type="button"
                    className="sheet__save"
                    disabled={busy || partyId === null || picked.length === 0 || level === null}
                    onClick={() => void start()}
                  >
                    모험 시작
                  </button>
                </div>
              </section>
            )}

            {mode === 'join' && items.length > 0 && (
              <section className="adv__panel">
                <h2 className="adv__title">도는 모험</h2>
                <ul className="adv__list">
                  {items.map((it) => (
                    <li key={it.battleId} className="adv__row">
                      <span className="adv__where">
                        <b>{it.partyName}</b>
                        <span className="adv__when">{whenText(it.openedAt, now)} 시작</span>
                      </span>
                      <button
                        type="button"
                        className="sheet__save"
                        disabled={busy}
                        onClick={() => void join(it.battleId, it.partyId)}
                      >
                        참여
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  )
}
