import { SCENARIO_LEVELS } from '../../../rules/scenarioLevel'

/**
 * 난이도 표의 알맹이 — **늘어서는 것과 고르는 것.**
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ **자리 잡기와 알맹이를 가른다.**                                          │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * 팝업은 `createPortal`로 `document.body`에 그려야 하는데(위젯 틀은 회전 때문에
 * 늘 `transform`을 걸고 있다, 구현 결정 37) 그러면 서버 렌더로 확인할 수가 없다.
 * 확인하고 싶은 것은 자리가 아니라 **무엇이 늘어서고 어느 줄이 켜지는가**다 —
 * 갈라 두면 그쪽만 통째로 덮인다(구현 결정 194·354와 같은 손질).
 *
 * 값은 `rules/scenarioLevel.ts` 한 곳에서 온다. 참조 화면이 그리는 표와 같은
 * 데서 나오므로 **두 화면이 다른 수를 말할 자리가 없다**(구현 결정 283).
 */
export function ScenarioLevelPanel({
  level,
  locked,
  onPick,
}: {
  /** 지금 판의 난이도. */
  level: number
  /**
   * 고를 수 없는 까닭. 고를 수 있으면 `null`.
   *
   * **눌러도 안 되는 채로 두지 않는다** — 까닭을 글자로 적는다(구현 결정 172).
   */
  locked: string | null
  onPick: (level: number) => void
}) {
  return (
    <div className="lvl">
      <p className="lvl__lead">시나리오 레벨 하나에서 넷이 따라 나온다. 누르면 그 레벨로 바꾼다.</p>

      <div className="lvl__scroll">
        <table className="lvl__table">
          <thead>
            <tr>
              <th scope="col">레벨</th>
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
                위험
                <br />
                지형
              </th>
              <th scope="col">
                보너스
                <br />
                경험
              </th>
            </tr>
          </thead>
          <tbody>
            {SCENARIO_LEVELS.map((row) => {
              const on = row.level === level
              return (
                <tr key={row.level} className={on ? 'lvl__row lvl__row--on' : 'lvl__row'}>
                  <th scope="row">
                    <button
                      type="button"
                      className="lvl__pick"
                      disabled={locked !== null}
                      aria-pressed={on}
                      aria-label={`시나리오 레벨 ${row.level}`}
                      onClick={() => onPick(row.level)}
                    >
                      <span className="sl-numeral">{row.level}</span>
                    </button>
                  </th>
                  <td className="sl-numeral">{row.goldPerCoin}</td>
                  <td className="sl-numeral">{row.trapDamage}</td>
                  <td className="sl-numeral">{row.hazardDamage}</td>
                  <td className="sl-numeral">{row.bonusXp}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {locked !== null && <p className="lvl__locked">{locked}</p>}
    </div>
  )
}
