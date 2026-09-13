import { useMemo, useState } from 'react'
import { fold } from './searchFold'
import type { Scenario } from './scenarioNet'
import {
  STATES,
  STATE_HINT,
  STATE_LABEL,
  isReachable,
  stateOf,
  type ScenarioState,
  type StoredState,
} from './scenarioState'

/**
 * 시나리오 고르기 — **행적을 손으로 치지 않게 한다**(형님이 정했다).
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ **고르면 번호·좌표·이름이 한 번에 채워진다.**                             │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * 갈 때마다 셋을 치는 것은 일이고, 무엇보다 **사람마다 다르게 적으면 같은 곳이 여러
 * 이름으로 남는다** — 상점·업적을 목록에서 고르게 한 것과 같은 까닭이다(구현 결정
 * 345·352).
 *
 * **번호로도 이름으로도 찾는다.** 상 위에서 「7번」이라 부르기도 하고 이름으로
 * 부르기도 한다. 공백·대소문자 차이는 무시한다(`searchFold`, 구현 결정 348).
 *
 * **막지 않는다.** 닫힌 시나리오도 고를 수 있다 — 적어 두지 않았을 뿐일 수 있고,
 * 규칙을 판정하는 것은 우리 일이 아니다(SPEC 1장). 차례만 아래로 미룬다.
 *
 * 값과 손잡이를 다 받으므로 서버 렌더로 끝까지 확인된다(구현 결정 164).
 */
export function ScenarioPicker({
  list,
  states,
  picked,
  onPick,
  onState,
}: {
  list: readonly Scenario[]
  states: Record<number, StoredState>
  /** 지금 고른 번호. 안 골랐으면 `null`. */
  picked: number | null
  onPick: (scenario: Scenario | null) => void
  onState: (no: number, state: ScenarioState) => void
}) {
  const [query, setQuery] = useState('')

  const found = useMemo(() => {
    const q = fold(query)
    if (q === '') return list
    return list.filter(
      (s) => fold(s.name).includes(q) || fold(`${s.no}`).includes(q) || fold(s.grid).includes(q),
    )
  }, [list, query])

  /* 갈 수 있는 것이 위로. **닫힌 것을 지우지 않고 미루기만 한다.** */
  const sorted = useMemo(
    () =>
      [...found].sort((a, b) => {
        const ra = isReachable(stateOf(states, a.no)) ? 0 : 1
        const rb = isReachable(stateOf(states, b.no)) ? 0 : 1
        return ra !== rb ? ra - rb : a.no - b.no
      }),
    [found, states],
  )

  if (list.length === 0) {
    return <p className="itin__hint">시나리오 목록이 아직 없다. 아래 칸에 손으로 적는다.</p>
  }

  const chosen = picked === null ? null : (list.find((s) => s.no === picked) ?? null)

  if (chosen !== null) {
    const state = stateOf(states, chosen.no)
    return (
      <div className="scpick scpick--chosen">
        <div className="scpick__line">
          <span className="scpick__no sl-numeral">#{chosen.no}</span>
          <span className="scpick__grid sl-numeral">{chosen.grid}</span>
          <span className="scpick__name">{chosen.name}</span>
          <button
            type="button"
            className="scpick__clear"
            aria-label="고른 시나리오 물리기"
            onClick={() => onPick(null)}
          >
            물리기
          </button>
        </div>

        {/*
          **상태는 방문의 결과가 아니라 시나리오가 지금 어떤 상태인가다**(`0045`).
          닫힘·열림은 방문에 붙을 수 있는 값이 아니므로 기록지의 것이며, 여기서
          고치면 기록지 전체에 반영된다.
        */}
        <div className="scpick__states" role="group" aria-label="시나리오 상태">
          {STATES.map((s) => (
            <button
              key={s}
              type="button"
              className={`scpick__state scpick__state--${s}${s === state ? ' scpick__state--on' : ''}`}
              aria-pressed={s === state}
              aria-label={`${STATE_LABEL[s]} — ${STATE_HINT[s]}`}
              onClick={() => onState(chosen.no, s)}
            >
              {STATE_LABEL[s]}
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="scpick">
      <input
        type="search"
        className="scpick__search"
        placeholder="번호·이름·좌표로 찾기"
        aria-label="시나리오 찾기"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      {sorted.length === 0 ? (
        <p className="itin__hint">찾는 시나리오가 없다. 아래 칸에 손으로 적는다.</p>
      ) : (
        <ul className="scpick__list">
          {sorted.slice(0, 40).map((s) => {
            const state = stateOf(states, s.no)
            return (
              <li key={s.no}>
                <button type="button" className="scpick__row" onClick={() => onPick(s)}>
                  <span className="scpick__no sl-numeral">#{s.no}</span>
                  <span className="scpick__grid sl-numeral">{s.grid}</span>
                  <span className="scpick__name">{s.name}</span>
                  <span className={`scpick__tag scpick__tag--${state}`}>{STATE_LABEL[state]}</span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
      {/* 마흔 줄에서 끊는다 — 아흔다섯을 다 늘어놓으면 찾는 것이 더 멀어진다. */}
      {sorted.length > 40 && (
        <p className="itin__hint">{sorted.length - 40}줄 더 있다. 찾아서 좁힌다.</p>
      )}
    </div>
  )
}
