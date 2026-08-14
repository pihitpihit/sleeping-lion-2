import type { CSSProperties } from 'react'
import { MARKS } from '../satchel/widgets/deck/cardSpec'
import { InlineMark } from '../campaign/InlineMark'
import { useScrolled } from '../campaign/useScrolled'
import { DifficultyTable, ScenarioLevelTable } from './ScenarioLevelTable'
/*
  띠(`topbar`)와 바깥 틀(`journal`)은 이제 일지만의 것이 아니라 **앱의 공통
  껍데기**다 — 생성 화면 둘이 이미 같은 것을 쓰고 있다. 옮겨 담는 것은 쓰는
  자리가 더 늘 때 한 번에 한다; 지금 나누면 같은 띠가 두 벌이 된다.
*/
import '../campaign/JournalPage.css'
import './ReferencePage.css'

/**
 * 참조 — `#/reference`.
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ **찾아보는 자리다. 무엇도 고치지 않는다.**                                │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * 일지는 적는 곳이고 행낭은 굴리는 곳인데, 놀다 보면 **그냥 들여다볼 것**이 따로
 * 있다 — 표식이 무엇인지, 눈금이 어디부터인지. 지금까지는 그런 것이 화면 여기저기
 * 곁다리로 붙어 있어 볼 때마다 어딘가로 들어가야 했다.
 *
 * **게임 원문은 담지 않는다**(절대 원칙 1). 여기 늘어서는 것은 우리가 그린 표식과
 * 우리가 정한 이름뿐이고, 규칙 문장·카드 원문·시나리오 서사는 오지 않는다.
 *
 * 섹션은 **접힌다.** 찾아보는 자리라 늘어날 일만 남았고, 다 펴 두면 원하는 것에
 * 닿기까지 남의 것을 한참 지나야 한다. 여닫는 것은 `<details>`가 한다 — 직접
 * 만들면 키보드·읽어주기까지 흉내 내야 하고 흉내는 늘 어딘가 어긋난다.
 */

interface Section {
  readonly kind: 'condition' | 'amount' | 'element' | 'other'
  readonly title: string
  readonly hint: string
}

const SECTIONS: readonly Section[] = [
  { kind: 'condition', title: '상태이상', hint: '보정 카드와 특혜 글에 붙는 표식이다.' },
  { kind: 'amount', title: '수를 다는 표식', hint: '표식 옆에 몇인지 함께 적힌다.' },
  { kind: 'element', title: '원소', hint: '원소 트래커와 같은 그림·같은 색이다.' },
  { kind: 'other', title: '그 밖', hint: '낱말로 못 적는 것은 「특」 한 글자로 둔다.' },
]

export function ReferencePage() {
  const scrolled = useScrolled()

  return (
    <div className="journal">
      <header className="topbar" style={{ '--tb': scrolled } as CSSProperties}>
        <div className="topbar__inner">
          <a className="journal__back" href="#/" aria-label="여관으로">
            ←
          </a>
          <span className="topbar__names">
            <h1 className="topbar__name">참조</h1>
            <span className="topbar__sub">찾아보는 자리</span>
          </span>
        </div>
      </header>

      <div className="ref">
        <p className="ref__lead">
          표식과 눈금, 헷갈릴 때 펼쳐 보는 것들. <strong>게임 원문은 담지 않는다</strong> — 여기
          있는 것은 표식과 수치, 우리가 적은 말까지다.
        </p>

        {/*
          시나리오 레벨.

          **표는 화면에만 있는 것이 아니다** — 값은 `rules/scenarioLevel.ts`에서
          오고, 나중에 전투를 펴거나 시나리오를 정산할 때도 같은 데서 꺼낸다.
          여기 있는 것은 그 표를 사람이 읽는 모양으로 늘어놓은 것뿐이다.
        */}
        <details className="ref__block" open>
          <summary className="ref__summary">
            <span className="ref__title">시나리오 레벨</span>
            <span className="ref__count sl-numeral" aria-hidden="true">
              0–7
            </span>
          </summary>

          <p className="ref__hint">
            권장 레벨은 <strong>파티 평균 레벨 ÷ 2, 올림</strong>이다. 넷이 다 2레벨이면 1이고,
            누군가 3레벨이 되어야 2로 오른다. 여기에 난이도만큼 얹는다.
          </p>

          <div className="ref__papers">
            <ScenarioLevelTable />
            <DifficultyTable />
          </div>

          <ul className="ref__notes">
            <li>몬스터 스탯 묶음은 언제나 시나리오 레벨과 같다.</li>
            <li>위험 지형 피해는 함정 피해의 절반이고 내린다(1·1·2·2·3·3·4·4).</li>
            <li>
              혼자서 여럿을 굴리면 <strong>몬스터 레벨과 함정 피해만 1씩</strong> 올리고 금화와
              경험은 그대로 둔다.
            </li>
            <li className="ref__src">글룸헤이븐 규칙서 15쪽 · 사자의 턱 규칙서 29쪽 (같은 표)</li>
          </ul>
        </details>

        {SECTIONS.map((section) => {
          const marks = MARKS.filter((mark) => mark.kind === section.kind)
          if (marks.length === 0) return null
          return (
            <details key={section.kind} className="ref__block">
              <summary className="ref__summary">
                <span className="ref__title">{section.title}</span>
                <span className="ref__count sl-numeral" aria-hidden="true">
                  {marks.length}
                </span>
              </summary>

              <p className="ref__hint">{section.hint}</p>
              <ul className="ref__marks">
                {marks.map((def) => (
                  <li key={def.id} className="ref__mark">
                    {/*
                      표식은 눈에만 보이는 것이라 `aria-hidden`이 걸려 있다
                      (`InlineMark`) — 이름이 그 옆에 글자로 서 있으므로 읽어
                      주는 쪽에도 그대로 간다.
                    */}
                    <InlineMark mark={{ def, amount: def.numeric === true ? 1 : null }} />
                    <span className="ref__markname">{def.name}</span>
                  </li>
                ))}
              </ul>
            </details>
          )
        })}

        <details className="ref__block">
          <summary className="ref__summary">
            <span className="ref__title">채비 중</span>
          </summary>
          <p className="ref__hint">
            규칙 요약과 그 밖에 찾아볼 것들이 여기로 온다. 무엇을 먼저 놓을지는 형님이 정한다.
          </p>
        </details>
      </div>
    </div>
  )
}
