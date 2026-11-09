import { useState } from 'react'
import { MiniDialog } from './MiniDialog'
import { useScenarioStore } from './scenarioStore'
import {
  achievementReqText,
  linksOf,
  scenarioName,
  type AchievementReq,
  type Missed,
  type Outcome,
  type ScenarioGraph,
} from './scenarioLinks'
import type { Scenario } from './scenarioNet'
import type { StoredState } from './scenarioState'
import './ScenarioOutcome.css'

/**
 * 시나리오를 완료하면 — **무엇이 열리고 무엇이 막혔는지 알린다**(`0049`·`0055`).
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ **완료하면 열기·막기는 저절로 바뀐다. 알리고 되돌리기를 함께 낸다.**      │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * 처음에는 권하기만 하고 「적용」을 눌러야 바꿨다(구현 결정 647). 업적 조건까지 셈할
 * 수 있게 된 뒤 형님이 저절로 바꾸게 했다 — 바꾸는 것은 스토어가 한다
 * (`scenarioStore.set`). **고르기는 저절로 안 연다**: 셋 중 하나를 고르는 것은 파티가
 * 정할 일이다.
 *
 * 나눴다: 자리(`ScenarioOutcomePrompt`, 스토어) · 알맹이(`ScenarioReportPanel`·
 * `MissedPanel`, 값만 받는다 — 서버 렌더로 확인된다, 구현 결정 194) · 미리 보기
 * (`ScenarioOutlook`).
 */

function names(nos: readonly number[], list: readonly Scenario[]): string {
  return nos.map((n) => scenarioName(n, list)).join(', ')
}

/** 기다리는 것의 모자란 선행. 묶음끼리는 「또는」, 묶음 안은 「와」. */
function missingText(missing: readonly (readonly number[])[]): string {
  return missing.map((g) => g.map((n) => `#${n}`).join('·')).join(' 또는 ')
}

/** 모자란 업적 조건. 묶음끼리는 「또는」, 묶음 안은 「와」. */
function achMissingText(
  graph: ScenarioGraph | null,
  missing: readonly (readonly AchievementReq[])[],
): string {
  if (graph === null) return ''
  return missing.map((g) => g.map((r) => achievementReqText(graph, r)).join('·')).join(' 또는 ')
}

/** 기다리는 까닭 — 선행과 업적 가운데 모자란 것만 적는다. */
function waitingText(graph: ScenarioGraph | null, w: Outcome['waiting'][number]): string {
  const scen = w.missing.length > 0 ? missingText(w.missing) : ''
  const ach = w.achMissing && w.achMissing.length > 0 ? achMissingText(graph, w.achMissing) : ''
  if (scen && ach) return `열리려면 ${scen}도 완료하고 업적이 맞아야 한다 — ${ach}.`
  if (ach) return `열리려면 업적이 맞아야 한다 — ${ach}.`
  return `열리려면 ${scen}도 완료해야 한다.`
}

/** 바꾸지는 않고 알리기만 하는 것들 — 기다리는 것·업적·이어 하기. 두 팝업이 함께 쓴다. */
function OutcomeNotes({
  outcome,
  list,
  graph,
}: {
  outcome: Pick<Outcome, 'waiting' | 'gains' | 'losses' | 'links'>
  list: readonly Scenario[]
  graph: ScenarioGraph | null
}) {
  return (
    <>
      {outcome.waiting.length > 0 && (
        <ul className="scout__notes">
          {outcome.waiting.map((w) => (
            <li key={w.no}>
              {scenarioName(w.no, list)} — {waitingText(graph, w)}
            </li>
          ))}
        </ul>
      )}

      {/*
        **업적은 알려 주기만 한다.** 기록지의 업적 칸은 편집 모드의 초안으로 고치는
        자리라(구현 결정 236) 여기서 몰래 바꾸면 초안과 어긋난다 — 무엇을 담을지 적어 두고
        담는 것은 사람이 한다.
      */}
      {(outcome.gains.length > 0 || outcome.losses.length > 0) && (
        <p className="scout__notes">
          업적
          {outcome.gains.length > 0 && <> — 얻음: {outcome.gains.join(', ')}</>}
          {outcome.losses.length > 0 && <> — 잃음: {outcome.losses.join(', ')}</>}. 기록지의 업적
          칸에 담는다.
        </p>
      )}

      {outcome.links.length > 0 && (
        <p className="scout__notes">곧바로 이어 갈 수 있다: {names(outcome.links, list)}</p>
      )}
    </>
  )
}

/** 하나를 골라 여는 갈림길 — 고르는 것은 파티가 정할 일이라 아무것도 안 골라 둔다. */
function ChoosePick({
  options,
  list,
  chosen,
  onChoose,
  name,
  legend = '하나를 골라 연다',
}: {
  options: readonly number[]
  list: readonly Scenario[]
  chosen: number | null
  onChoose: (no: number | null) => void
  name: string
  legend?: string
}) {
  return (
    <fieldset className="scout__group">
      <legend className="scout__legend scout__legend--open">{legend}</legend>
      {options.map((n) => (
        <label key={n} className="scout__row">
          <input type="radio" name={name} checked={chosen === n} onChange={() => onChoose(n)} />
          {scenarioName(n, list)}
        </label>
      ))}
      {chosen !== null && (
        <button type="button" className="scout__unpick" onClick={() => onChoose(null)}>
          고른 것 물리기
        </button>
      )}
    </fieldset>
  )
}

/**
 * 완료하면서 **저절로 바꾼 것**을 알린다(형님이 정했다 — 권하기만 하던 것을 바꿨다).
 *
 * 열고 막은 것을 적고 **되돌리기**를 함께 낸다 — 바꾼 것이 틀렸으면 그 자리에서 물린다.
 * 하나를 고르는 갈림길만 여기서 고른다. 값만 받으므로 서버 렌더로 확인된다.
 */
export function ScenarioReportPanel({
  no,
  list,
  outcome,
  applied,
  graph = null,
  onChoose,
  onUndo,
  onClose,
}: {
  no: number
  list: readonly Scenario[]
  outcome: Outcome
  applied: readonly { no: number; to: StoredState }[]
  graph?: ScenarioGraph | null
  onChoose: (no: number) => void
  onUndo: () => void
  onClose: () => void
}) {
  const [chosen, setChosen] = useState<number | null>(null)
  const opened = applied.filter((a) => a.to === 'open').map((a) => a.no)
  const blocked = applied.filter((a) => a.to === 'blocked').map((a) => a.no)
  const planned = outcome.opens.length + outcome.blocks.length
  const failed = planned > 0 && applied.length === 0

  return (
    <div className="scout">
      <p className="mini__body">
        <b>{scenarioName(no, list)}</b>을(를) 완료했다.
        {applied.length > 0 && ' 그래서 아래처럼 바꿨다.'}
      </p>

      {opened.length > 0 && (
        <p className="scout__done">
          <span className="scout__legend scout__legend--open">열었다</span> {names(opened, list)}
        </p>
      )}
      {blocked.length > 0 && (
        <p className="scout__done">
          <span className="scout__legend scout__legend--blocked">막았다</span>{' '}
          {names(blocked, list)}
        </p>
      )}
      {failed && (
        <p className="scout__notes" role="alert">
          열고 막을 것을 적지 못했다 — 「놓친 해금 찾기」로 다시 맞춘다.
        </p>
      )}

      {outcome.choose.length > 0 && (
        <ChoosePick
          options={outcome.choose}
          list={list}
          chosen={chosen}
          onChoose={setChosen}
          name="scout-choose"
        />
      )}

      <OutcomeNotes outcome={outcome} list={list} graph={graph} />

      <div className="mini__acts">
        {outcome.choose.length > 0 && (
          <button
            type="button"
            className="mini__go"
            disabled={chosen === null}
            onClick={() => chosen !== null && onChoose(chosen)}
          >
            고른 것 열기
          </button>
        )}
        {applied.length > 0 && (
          <button type="button" className="mini__cancel" onClick={onUndo}>
            되돌리기
          </button>
        )}
        <button
          type="button"
          className={outcome.choose.length > 0 ? 'mini__cancel' : 'mini__go'}
          onClick={onClose}
        >
          {outcome.choose.length > 0 ? '나중에' : '확인'}
        </button>
      </div>
    </div>
  )
}

/**
 * 완료하면서 바꾼 것이 있으면 알리는 팝업을 띄운다.
 *
 * 기록지가 띄운다 — 행적의 상태 단추로 바꿔도, 시나리오 칸의 완료로 바꿔도 같은
 * 팝업이다. 두 벌로 그리면 어긋난다. 바꾸는 일은 스토어가 이미 했다(`scenarioStore.set`).
 */
export function ScenarioOutcomePrompt() {
  const report = useScenarioStore((s) => s.report)
  const graph = useScenarioStore((s) => s.graph)
  const list = useScenarioStore((s) => s.list)
  const apply = useScenarioStore((s) => s.apply)
  const undoReport = useScenarioStore((s) => s.undoReport)
  const clearReport = useScenarioStore((s) => s.clearReport)

  if (report === null) return null

  return (
    <MiniDialog title="다음 시나리오" label="완료한 시나리오로 바뀐 것">
      <ScenarioReportPanel
        key={report.no}
        no={report.no}
        list={list}
        outcome={report.outcome}
        applied={report.applied}
        graph={graph}
        onChoose={(n) => {
          clearReport()
          void apply([{ no: n, state: 'open' }])
        }}
        onUndo={() => void undoReport()}
        onClose={clearReport}
      />
    </MiniDialog>
  )
}

/**
 * 놓친 해금 — 완료한 것 전체로 보면 빠진 열림·막힘을 골라 적용한다(`missedOf`).
 *
 * 저절로 바꾸지 않고 **고르게 한다** — 완료 때 바꾸는 것과 달리 여기 오는 것은 한참
 * 전 일이라, 그사이 손으로 정해 둔 사정이 있을 수 있다. 다 켜 둔 채로 연다: 대개는
 * 다 맞으므로 한 번 누르면 끝나야 한다. 값만 받으므로 서버 렌더로 확인된다.
 */
export function MissedPanel({
  missed,
  list,
  onApply,
  onClose,
}: {
  missed: Missed
  list: readonly Scenario[]
  onApply: (entries: { no: number; state: StoredState }[]) => void
  onClose: () => void
}) {
  const [opens, setOpens] = useState<number[]>(() => [...missed.opens])
  const [blocks, setBlocks] = useState<number[]>(() => [...missed.blocks])
  const [chosen, setChosen] = useState<Record<number, number | null>>({})

  const toggle = (setter: typeof setOpens, n: number) =>
    setter((xs) => (xs.includes(n) ? xs.filter((x) => x !== n) : [...xs, n]))

  const picked = Object.values(chosen).filter((n): n is number => n !== null)
  const entries = [
    ...opens.map((n) => ({ no: n, state: 'open' as const })),
    ...picked.map((n) => ({ no: n, state: 'open' as const })),
    ...blocks.map((n) => ({ no: n, state: 'blocked' as const })),
  ]
  const empty = missed.opens.length + missed.blocks.length + missed.choose.length === 0

  if (empty) {
    return (
      <div className="scout">
        <p className="mini__body">
          놓친 것이 없다. 완료한 시나리오로 바뀌어야 할 것이 다 바뀌어 있다.
        </p>
        <div className="mini__acts">
          <button type="button" className="mini__go" onClick={onClose}>
            확인
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="scout">
      <p className="mini__body">
        완료한 시나리오 전체로 보면 아직 안 바뀐 것이다. 바꿀 것을 고른다.
      </p>

      {missed.opens.length > 0 && (
        <fieldset className="scout__group">
          <legend className="scout__legend scout__legend--open">열림</legend>
          {missed.opens.map((n) => (
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

      {missed.blocks.length > 0 && (
        <fieldset className="scout__group">
          <legend className="scout__legend scout__legend--blocked">막힘</legend>
          {missed.blocks.map((n) => (
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

      {missed.choose.map((c) => (
        <ChoosePick
          key={c.from}
          options={c.options}
          list={list}
          chosen={chosen[c.from] ?? null}
          onChoose={(n) => setChosen((x) => ({ ...x, [c.from]: n }))}
          name={`scout-missed-${c.from}`}
          legend={`${scenarioName(c.from, list)}에서 하나를 골라 연다`}
        />
      ))}

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
