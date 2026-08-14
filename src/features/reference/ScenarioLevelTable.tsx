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
