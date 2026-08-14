import { useEffect, useState, type CSSProperties } from 'react'
import { useAuthStore } from '../auth/authStore'
import { useMineStore } from '../campaign/mineStore'
import { useScrolled } from '../campaign/useScrolled'
import { whenText } from '../campaign/characterLog'
import { useBattleStore } from '../satchel/battle/battleStore'
import { useAdventureStore } from './adventureStore'
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

  /** 지금 보는 시각. 렌더 중에 `Date.now()`를 부르지 않는다(구현 결정 376). */
  const [now] = useState(() => Date.now())

  async function start() {
    if (userId === null || partyId === null) return
    setBusy(true)
    setError(null)
    try {
      await openBattle(partyId, userId)
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
      await joinBattle({ id: battleId, partyId: party, openedBy: '', openedAt: 0 }, userId)
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

                {/*
                  적을 것은 여기 더 붙는다 — 시나리오 번호·난이도 같은 것들. 무엇을
                  받을지는 형님이 따로 정한다(그때 `rules/scenarioLevel.ts`가 권장
                  레벨을 낸다).
                */}
                <p className="adv__soon">시나리오와 난이도를 적는 칸은 곧 여기 붙는다.</p>

                <div className="sheet__bar">
                  <button
                    type="button"
                    className="sheet__save"
                    disabled={busy || partyId === null}
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
