import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useAuthStore } from '../../auth/authStore'
import { partyAdapter } from '../../net'
import type { Party } from '../../net/types'
import { useBattleStore } from './battleStore'
import type { BattleRow } from './battleNet'
import { useRosterStore } from '../roster'
import { levelForXp } from '../../campaign/character'
import { clampLevel, recommendedLevel } from '../../rules/scenarioLevel'
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
 * 않는다. 기록지는 부르지 않는다.
 *
 * **판을 여는 자리가 다시 여기다**(2026-11-09). 모험 화면으로 옮겼다가 걷었다 —
 * 판을 굴리는 곳이 행낭이라 여는 문만 대문에 따로 있으니 동선이 갈렸다. 누가
 * 앉을지와 시나리오 레벨은 그대로 정한다(`0032`). 캐릭터는 축 ②가 이미 읽는
 * 이름표(`roster.ts`)에서 고른다 — 식별자·이름·경험치만 보고 고치지 않는다.
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
  const join = useBattleStore((s) => s.join)
  const leave = useBattleStore((s) => s.leave)
  const close = useBattleStore((s) => s.close)
  const open = useBattleStore((s) => s.open)

  const [parties, setParties] = useState<Party[]>([])
  const [partyId, setPartyId] = useState('')
  /** 고른 파티에 이미 열려 있는 판. 내가 앉지 않았어도 보인다. */
  const [found, setFound] = useState<BattleRow | null>(null)
  const [loading, setLoading] = useState(true)
  /**
   * 이번 판에 앉힐 캐릭터들. **여기 없는 사람에게는 판이 안 보인다**(`0032`).
   * `null`이면 아직 손대지 않은 것이고 그때는 내 캐릭터가 골라진 채로 선다 —
   * 대개는 제 캐릭터로 여는 판이다.
   */
  const [picked, setPicked] = useState<string[] | null>(null)
  /** 난이도로 얼마나 얹었는가. 권장 레벨에 더한다. */
  const [bump, setBump] = useState(0)

  const roster = useRosterStore((s) => s.entries)
  const loadRoster = useRosterStore((s) => s.load)
  useEffect(() => {
    void loadRoster()
  }, [loadRoster])

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

  /* 고른 파티의 캐릭터 — 남의 것도 있어야 한다. 지우기 유예 중인 것은 서버가 거절한다. */
  const crew = roster.filter((c) => c.partyId === partyId && !c.deleted)
  const chosenIds = picked ?? crew.filter((c) => c.ownerId === session.userId).map((c) => c.id)
  const chosen = crew.filter((c) => chosenIds.includes(c.id))
  const mineChosen = chosen.some((c) => c.ownerId === session.userId)
  /* 평균 ÷ 2, 올림이 권장이고 캐럿으로 얹거나 뺀다(`rules/scenarioLevel.ts`). */
  const base = recommendedLevel(chosen.map((c) => levelForXp(c.xp)))
  const level = base === null ? null : clampLevel(base + bump)

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
                아직 파티가 없다. <a href="#/journal/new">파티를 생성한다.</a>
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
                  onChange={(e) => {
                    setPartyId(e.target.value)
                    // 파티가 바뀌면 고른 사람도 처음으로 — 남의 파티 사람을 들고 넘어가지 않는다.
                    setPicked(null)
                    setBump(0)
                  }}
                >
                  {parties.map((party) => (
                    <option key={party.id} value={party.id}>
                      {party.name || '이름 없는 파티'}
                    </option>
                  ))}
                </select>

                {!found && (
                  <>
                    <h3 className="battle__label">누가 앉는가</h3>
                    <ul className="battle__crew">
                      {crew.map((c) => {
                        const on = chosenIds.includes(c.id)
                        return (
                          <li key={c.id}>
                            <button
                              type="button"
                              className={`battle__member${on ? ' battle__member--on' : ''}`}
                              aria-pressed={on}
                              onClick={() =>
                                setPicked(
                                  on ? chosenIds.filter((id) => id !== c.id) : [...chosenIds, c.id],
                                )
                              }
                            >
                              <span className="battle__membername">
                                {c.name || '이름 없음'}
                                {c.ownerId !== session.userId && c.ownerName !== '' && (
                                  <span className="battle__owner"> · {c.ownerName}</span>
                                )}
                              </span>
                              <span className="battle__memberlv sl-numeral">
                                {levelForXp(c.xp)}
                              </span>
                            </button>
                          </li>
                        )
                      })}
                      {crew.length === 0 && (
                        <li className="battle__alone">이 파티에 든 캐릭터가 없다.</li>
                      )}
                    </ul>

                    <h3 className="battle__label">시나리오 레벨</h3>
                    {level === null ? (
                      <p className="battle__alone">앉을 사람을 고르면 권장 레벨이 나온다.</p>
                    ) : (
                      <div className="battle__level">
                        <button
                          type="button"
                          className="battle__caret"
                          aria-label="레벨 1 내리기"
                          disabled={level <= 0}
                          onClick={() => setBump((b) => b - 1)}
                        >
                          ‹
                        </button>
                        <b className="battle__levelno sl-numeral">{level}</b>
                        <button
                          type="button"
                          className="battle__caret"
                          aria-label="레벨 1 올리기"
                          disabled={level >= 7}
                          onClick={() => setBump((b) => b + 1)}
                        >
                          ›
                        </button>
                        <span className="battle__levelnote">
                          권장 <b className="sl-numeral">{base}</b>
                        </span>
                      </div>
                    )}
                  </>
                )}

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
                      disabled={busy || level === null || !mineChosen}
                      onClick={() => void open(partyId, chosenIds, level ?? 1)}
                    >
                      판을 편다
                    </button>
                  )}
                </div>

                <p className="battle__hint">
                  {found
                    ? '이미 열린 판이 있다. 앉으면 상 위의 값을 물려받는다 — 내 화면의 값이 아니라 그쪽이 사실이다.'
                    : chosen.length > 0 && !mineChosen
                      ? '내 캐릭터가 하나는 앉아야 판을 편다 — 안 그러면 연 판이 내 눈에 안 보인다.'
                      : '판을 펴면 지금 내 화면의 값이 첫 판이 된다. 고른 캐릭터의 주인에게만 판이 보인다.'}
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
