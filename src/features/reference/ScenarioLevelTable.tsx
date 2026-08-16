import { PROSPERITY_ROWS, cardNo } from '../rules/prosperity'
import { levelExtra, stickerExtra } from '../rules/enhancement'
import { InlineMark } from '../campaign/InlineMark'
import { MARKS, type CardMark } from '../satchel/widgets/deck/cardSpec'

/** 표식 id로 그릴 것을 찾는다. 없으면 글자로 남는다. */
function markOf(id: string | undefined): CardMark | null {
  if (id === undefined) return null
  const def = MARKS.find((m) => m.id === id)
  return def ? { def, amount: null } : null
}
import {
  DIFFICULTIES,
  DIFFICULTY_MOD,
  DIFFICULTY_NAME,
  SCENARIO_LEVELS,
} from '../rules/scenarioLevel'
import './ScenarioLevelTable.css'

/**
 * 시나리오 레벨 표 · 난이도 보정표 — **규칙서의 그 표를 흉내 낸다.**
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ **상 위에서 규칙서를 펴는 대신 여는 화면이므로 같아 보여야 한다.**        │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * 양피지 바탕에 갈색 잉크, 머리글 밑의 두 겹 줄, 칸 사이의 ✕ 매듭 — 규칙서에서
 * 읽어 그대로 옮긴 얼개다. **문양은 우리가 그린 도형이고**(구현 결정 31·106과
 * 같은 선) 팩 에셋을 쓰지 않는다.
 *
 * 값은 하나도 여기 없다 — `rules/scenarioLevel.ts`가 정본이고 이 파일은 늘어놓기만
 * 한다. 나중에 전투를 펴거나 정산할 때도 같은 데서 꺼낸다.
 *
 * 머리글은 한글이라 Pirata One을 붙이지 않는다(구현 결정 39) — 명조로 두고 숫자만
 * `.sl-numeral`로 간다.
 */
export function ScenarioLevelTable() {
  return (
    <div className="gtable">
      <table className="gtable__t">
        <caption className="gtable__cap">시나리오 레벨</caption>
        <thead>
          <tr>
            <th scope="col">
              시나리오
              <br />
              레벨
            </th>
            <th scope="col">
              몬스터
              <br />
              레벨
            </th>
            <th scope="col">
              금화
              <br />
              환산
            </th>
            <th scope="col">
              함정
              <br />
              피해
            </th>
            <th scope="col">
              보너스
              <br />
              경험
            </th>
          </tr>
        </thead>
        <tbody>
          {SCENARIO_LEVELS.map((row) => (
            <tr key={row.level}>
              <th scope="row" className="sl-numeral">
                {row.level}
              </th>
              <td className="sl-numeral">{row.monsterLevel}</td>
              <td className="sl-numeral">{row.goldPerCoin}</td>
              <td className="sl-numeral">{row.trapDamage}</td>
              <td className="sl-numeral">{row.bonusXp}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/**
 * 난이도 보정표.
 *
 * 규칙서에서는 시나리오 레벨 표 옆에 나란히 서는 작은 표다 — 권장 레벨에 얼마를
 * 얹는지만 적는다.
 */
export function DifficultyTable() {
  return (
    <div className="gtable gtable--narrow">
      <table className="gtable__t">
        <caption className="gtable__cap">난이도</caption>
        <thead>
          <tr>
            <th scope="col">난이도</th>
            <th scope="col">레벨 보정</th>
          </tr>
        </thead>
        <tbody>
          {DIFFICULTIES.map((key) => {
            const mod = DIFFICULTY_MOD[key]
            return (
              <tr key={key}>
                <th scope="row">{DIFFICULTY_NAME[key]}</th>
                <td className="sl-numeral">
                  {/* 0에도 부호를 적는다 — 「보정 없음」이 한눈에 갈린다. */}
                  {mod > 0 ? `+${mod}` : mod < 0 ? `−${Math.abs(mod)}` : '+0'}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

/**
 * 번영도별로 상점에 풀리는 아이템 카드.
 *
 * **번호의 범위일 뿐 카드의 글이 아니다** — 그래서 레포에 둘 수 있다
 * (`rules/prosperity.ts`). 아이템 이름은 여전히 DB에만 있다.
 */
export function ProsperityTable() {
  return (
    <div className="gtable gtable--narrow">
      <table className="gtable__t">
        <caption className="gtable__cap">번영도와 아이템 카드</caption>
        <thead>
          <tr>
            <th scope="col">
              번영도
              <br />
              레벨
            </th>
            <th scope="col">아이템 카드</th>
          </tr>
        </thead>
        <tbody>
          {PROSPERITY_ROWS.map((row) => (
            <tr key={row.level}>
              <th scope="row" className="sl-numeral">
                {row.level}
              </th>
              <td className="sl-numeral">
                {cardNo(row.from)}–{cardNo(row.to)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/**
 * 카드 향상 가격표.
 *
 * **값이 늘어선 표일 뿐 카드의 글이 아니다** — 그래서 레포에 둘 수 있다
 * (`rules/enhancement.ts`).
 *
 * 실물이 세 칸으로 갈라 적는다: 능력치·효과·더하는 값. 여기서도 그대로 가른다 —
 * 상 위에서 찾는 순서가 그것이다(무엇을 붙일지 먼저, 얼마를 더할지 나중).
 */
export function EnhanceTable({
  title,
  rows,
}: {
  title: string
  rows: readonly { name: string; gold: number; mark?: string }[]
}) {
  return (
    <div className="gtable gtable--narrow">
      <table className="gtable__t">
        <caption className="gtable__cap">{title}</caption>
        <thead>
          <tr>
            <th scope="col">붙이는 것</th>
            <th scope="col">금화</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.name}>
              {/*
                **팩에 그림이 있는 것은 그림으로 낸다**(형님이 정했다) — 카드에
                그려지는 것과 같은 표식이라야 같은 것으로 읽힌다(구현 결정 319).
                없는 것은 글자로 남는다: 흉내 내 그리지 않는다(구현 결정 205).
              */}
              <th scope="row" className="gtable__row">
                {markOf(row.mark) && <InlineMark mark={markOf(row.mark)!} />}
                {row.name}
              </th>
              <td className="sl-numeral">{row.gold}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** 카드 레벨과 이미 붙은 스티커가 더하는 값. */
export function EnhanceExtraTable() {
  return (
    <div className="gtable gtable--narrow">
      <table className="gtable__t">
        <caption className="gtable__cap">더하는 값</caption>
        <thead>
          <tr>
            <th scope="col">카드 레벨</th>
            <th scope="col">금화</th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: 9 }, (_, i) => i + 1).map((level) => (
            <tr key={level}>
              <th scope="row" className="sl-numeral">
                {level}
              </th>
              <td className="sl-numeral">+{levelExtra(level)}</td>
            </tr>
          ))}
          {Array.from({ length: 4 }, (_, i) => i).map((n) => (
            <tr key={`s${n}`}>
              <th scope="row">
                스티커 <span className="sl-numeral">{n}</span>
              </th>
              <td className="sl-numeral">+{stickerExtra(n)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
