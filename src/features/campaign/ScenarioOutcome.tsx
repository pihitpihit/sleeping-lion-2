import { useEffect, useState } from 'react'
import { MiniDialog } from './MiniDialog'
import { useScenarioStore } from './scenarioStore'
import {
  hasOutcome,
  linksOf,
  outcomeOf,
  scenarioName,
  type Outcome,
  type ScenarioGraph,
} from './scenarioLinks'
import type { Scenario } from './scenarioNet'
import type { StoredState } from './scenarioState'
import './ScenarioOutcome.css'

/**
 * 시나리오를 완료하면 — **무엇이 열리고 무엇이 막히는지 권한다**(`0049`).
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ **저절로 바꾸지 않는다. 사람이 「적용」을 눌러야 상태가 바뀐다.**         │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * 규칙을 판정하지 않는다는 선(SPEC 1장)과 닫힌 것도 고를 수 있게 둔 결정(구현
 * 결정 537)과 같은 결이다. 열기·막기는 처음부터 다 켜 두고 하나씩 끌 수 있게 한다
 * — 대개는 다 맞으므로 한 번 누르면 끝나야 한다. **고르기는 아무것도 안 골라
 * 둔다**: 셋 중 하나를 고르는 것은 파티가 정할 일이다.
 *
 * 셋으로 갈랐다: 자리(`ScenarioOutcomePrompt`, 스토어) · 알맹이(`ScenarioOutcomePanel`,
 * 값만 받는다 — 서버 렌더로 확인된다, 구현 결정 194) · 미리 보기(`ScenarioOutlook`).
 */

function names(nos: readonly number[], list: readonly Scenario[]): string {
  return nos.map((n) => scenarioName(n, list)).join(', ')
}

/** 기다리는 것의 모자란 선행. 묶음끼리는 「또는」, 묶음 안은 「와」. */
function missingText(missing: readonly (readonly number[])[]): string {
  return missing.map((g) => g.map((n) => `#${n}`).join('·')).join(' 또는 ')
}

export function ScenarioOutcomePanel({
  no,
  list,
  outcome,
  onApply,
  onClose,
}: {
  no: number
  list: readonly Scenario[]
  outcome: Outcome
  onApply: (entries: { no: number; state: StoredState }[]) => void
  onClose: () => void
}) {
  const [opens, setOpens] = useState<number[]>(() => [...outcome.opens])
  const [blocks, setBlocks] = useState<number[]>(() => [...outcome.blocks])
  const [chosen, setChosen] = useState<number | null>(null)

  const toggle = (setter: typeof setOpens, n: number) =>
    setter((xs) => (xs.includes(n) ? xs.filter((x) => x !== n) : [...xs, n]))

  const entries = [
    ...opens.map((n) => ({ no: n, state: 'open' as const })),
    ...(chosen === null ? [] : [{ no: chosen, state: 'open' as const }]),
    ...blocks.map((n) => ({ no: n, state: 'blocked' as const })),
  ]

  return (
    <div className="scout">
      <p className="mini__body">
        <b>{scenarioName(no, list)}</b>을(를) 완료했다. 바꿀 것을 고른다.
      </p>

      {outcome.opens.length > 0 && (
        <fieldset className="scout__group">
          <legend className="scout__legend scout__legend--open">열림</legend>
          {outcome.opens.map((n) => (
            <label key={n} className="scout__row">
              <input
                type="checkbox"
                checked={opens.includes(n)}
                onChange={() => toggle(setOpens, n)}
              />
              {scenarioName(n, list)}
            </label>
          ))}
        </fieldset>
      )}

      {outcome.choose.length > 0 && (
        <fieldset className="scout__group">
          <legend className="scout__legend scout__legend--open">하나를 골라 연다</legend>
          {outcome.choose.map((n) => (
            <label key={n} className="scout__row">
              <input
                type="radio"
                name="scout-choose"
                checked={chosen === n}
                onChange={() => setChosen(n)}
              />
              {scenarioName(n, list)}
            </label>
          ))}
          {chosen !== null && (
            <button type="button" className="scout__unpick" onClick={() => setChosen(null)}>
              고른 것 물리기
            </button>
          )}
        </fieldset>
      )}

      {outcome.blocks.length > 0 && (
        <fieldset className="scout__group">
          <legend className="scout__legend scout__legend--blocked">막힘</legend>
          {outcome.blocks.map((n) => (
            <label key={n} className="scout__row">
              <input
                type="checkbox"
                checked={blocks.includes(n)}
                onChange={() => toggle(setBlocks, n)}
              />
              {scenarioName(n, list)}
            </label>
          ))}
        </fieldset>
      )}

      {outcome.waiting.length > 0 && (
        <ul className="scout__notes">
          {outcome.waiting.map((w) => (
            <li key={w.no}>
              {scenarioName(w.no, list)} — 열리려면 {missingText(w.missing)}도 완료해야 한다.
            </li>
          ))}
        </ul>
      )}

      {outcome.links.length > 0 && (
        <p className="scout__notes">곧바로 이어 갈 수 있다: {names(outcome.links, list)}</p>
      )}

      <div className="mini__acts">
        <button
          type="button"
          className="mini__go"
          disabled={entries.length === 0}
          onClick={() => onApply(entries)}
        >
          적용
        </button>
        <button type="button" className="mini__cancel" onClick={onClose}>
          나중에
        </button>
      </div>
    </div>
  )
}

/**
 * 방금 완료로 바뀐 것이 있으면 권하는 팝업을 띄운다.
 *
 * 기록지가 띄운다 — 행적의 상태 단추로 바꿔도, 시나리오 칸의 완료로 바꿔도 같은
 * 팝업이다. 두 벌로 그리면 어긋난다. **권할 것이 없으면 아무것도 안 띄우고 조용히 비운다.**
 */
export function ScenarioOutcomePrompt() {
  const pending = useScenarioStore((s) => s.pending)
  const graph = useScenarioStore((s) => s.graph)
  const states = useScenarioStore((s) => s.states)
  const list = useScenarioStore((s) => s.list)
  const apply = useScenarioStore((s) => s.apply)
  const markPending = useScenarioStore((s) => s.markPending)

  const outcome = pending !== null && graph !== null ? outcomeOf(graph, pending, states) : null
  const show = outcome !== null && hasOutcome(outcome)

  useEffect(() => {
    if (pending !== null && !show) markPending(null)
  }, [pending, show, markPending])

  if (!show || pending === null || outcome === null) return null

  return (
    <MiniDialog title="다음 시나리오" label="완료한 시나리오로 바뀌는 것">
      <ScenarioOutcomePanel
        key={pending}
        no={pending}
        list={list}
        outcome={outcome}
        onApply={(entries) => {
          markPending(null)
          void apply(entries)
        }}
        onClose={() => markPending(null)}
      />
    </MiniDialog>
  )
}

/**
 * 고른 시나리오를 깨면 어떻게 되는가 — **깨기 전에 보인다.**
 *
 * 갈림길은 깨고 나서야 아는 일이 많다. 막히는 것이 있으면 붉게 적는다.
 *
 * **그래프가 말하는 그대로 적는다** — 이미 깬 것도 걸러 내지 않는다. 이 시나리오가
 * 무엇을 하는지 말하는 자리이고, 실제로 무엇을 바꿀지는 완료할 때 권함 팝업이
 * 상태를 보고 셈한다(`outcomeOf`).
 */
export function ScenarioOutlook({
  no,
  graph,
  list,
}: {
  no: number
  graph: ScenarioGraph | null
  list: readonly Scenario[]
}) {
  if (graph === null) return null
  const mine = linksOf(graph, no)
  if (mine.unlocks.length === 0 && mine.choose.length === 0 && mine.blocks.length === 0) return null
  return (
    <ul className="scout__outlook">
      {mine.unlocks.length > 0 && (
        <li>
          <span className="scout__legend scout__legend--open">깨면 열림</span>{' '}
          {names(mine.unlocks, list)}
        </li>
      )}
      {mine.choose.length > 0 && (
        <li>
          <span className="scout__legend scout__legend--open">깨면 하나 고름</span>{' '}
          {names(mine.choose, list)}
        </li>
      )}
      {mine.blocks.length > 0 && (
        <li>
          <span className="scout__legend scout__legend--blocked">깨면 막힘</span>{' '}
          {names(mine.blocks, list)}
        </li>
      )}
    </ul>
  )
}
