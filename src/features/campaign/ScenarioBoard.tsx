import { ScenarioOutlook } from './ScenarioOutcome'
import type { ScenarioGraph } from './scenarioLinks'
import type { Scenario } from './scenarioNet'
import { STATE_LABEL, stateOf, type StoredState } from './scenarioState'
import './ScenarioBoard.css'

/**
 * 기록지의 시나리오 칸 — **다음에 어디로 갈 수 있는가.**
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ **열린 시나리오를 늘어놓고, 깨면 무엇이 바뀌는지 곁에 적는다.**           │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * 시나리오 결과를 적는 자리가 여기다(2026-11-09). 모험 화면에서 판을 마치며 적게
 * 했다가 그 화면을 걷었다 — 상태와 행적이 원래 기록지에 있으므로 여기서 끝나야
 * 한다.
 *
 * **완료**는 행적에 오늘 날짜로 한 줄을 남기고 상태를 완료로 바꾼다 — 그러면
 * 무엇이 열리는지 권하는 팝업이 뜬다(`ScenarioOutcomePrompt`). **실패**는 행적에만
 * 남는다: 그 자리에 갔던 것은 사실이고 시나리오는 여전히 열려 있다.
 *
 * 누르는 단추는 편집 중에만 낸다 — 행적과 같은 결이다(들여다보는 동안 스치기만
 * 해도 바뀌면 안 된다, 구현 결정 165).
 *
 * 값과 손잡이를 다 받으므로 서버 렌더로 끝까지 확인된다(구현 결정 164).
 */
export function ScenarioBoard({
  list,
  states,
  graph,
  editing,
  busy,
  onFinish,
}: {
  list: readonly Scenario[]
  states: Record<number, StoredState>
  graph: ScenarioGraph | null
  editing: boolean
  busy: boolean
  onFinish: (scenario: Scenario, outcome: 'done' | 'failed') => void
}) {
  if (list.length === 0) {
    return <p className="scboard__empty">시나리오 목록이 아직 없다.</p>
  }

  const open = list.filter((s) => stateOf(states, s.no) === 'open')
  const count = (state: StoredState) => list.filter((s) => stateOf(states, s.no) === state).length

  return (
    <div className="scboard">
      {/* 얼마나 왔는지 한 줄로. 닫힘은 「아직 모르는 것」이라 세지 않는다. */}
      <p className="scboard__tally">
        <span>
          {STATE_LABEL.done} <b className="sl-numeral">{count('done')}</b>
        </span>
        <span>
          {STATE_LABEL.open} <b className="sl-numeral">{open.length}</b>
        </span>
        <span className="scboard__tally--blocked">
          {STATE_LABEL.blocked} <b className="sl-numeral">{count('blocked')}</b>
        </span>
        <span className="scboard__total">
          / <b className="sl-numeral">{list.length}</b>
        </span>
      </p>

      {open.length === 0 ? (
        <p className="scboard__empty">
          열린 시나리오가 없다. {editing ? '행적에서 시나리오를 골라 상태를 바꾼다.' : ''}
        </p>
      ) : (
        <ul className="scboard__rows">
          {open.map((s) => (
            <li key={s.no} className="scboard__row">
              <div className="scboard__line">
                <span className="scboard__no sl-numeral">#{s.no}</span>
                <span className="scboard__grid sl-numeral">{s.grid}</span>
                <span className="scboard__name">{s.name}</span>
                {editing && (
                  <span className="scboard__acts">
                    <button
                      type="button"
                      className="scboard__done"
                      disabled={busy}
                      aria-label={`#${s.no} 완료 — 행적에 남기고 상태를 완료로`}
                      onClick={() => onFinish(s, 'done')}
                    >
                      완료
                    </button>
                    <button
                      type="button"
                      className="scboard__fail"
                      disabled={busy}
                      aria-label={`#${s.no} 실패 — 행적에만 남긴다`}
                      onClick={() => onFinish(s, 'failed')}
                    >
                      실패
                    </button>
                  </span>
                )}
              </div>
              <ScenarioOutlook no={s.no} graph={graph} list={list} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
