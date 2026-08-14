import type { CSSProperties } from 'react'
import { MARKS } from '../satchel/widgets/deck/cardSpec'
import { InlineMark } from '../campaign/InlineMark'
import { useScrolled } from '../campaign/useScrolled'
/*
  띠(`topbar`)와 바깥 틀(`journal`)은 이제 일지만의 것이 아니라 **앱의 공통
  껍데기**다 — 생성 화면 둘이 이미 같은 것을 쓰고 있다. 옮겨 담는 것은 쓰는
  자리가 더 늘 때 한 번에 한다; 지금 나누면 같은 띠가 두 벌이 된다.
*/
import '../campaign/JournalPage.css'
import './ReferencePage.css'

/**
 * 참고 — `#/reference`.
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
 */
export function ReferencePage() {
  const scrolled = useScrolled()

  const groups = [
    { kind: 'condition', title: '상태이상', hint: '카드와 특혜 글에 붙는 표식이다.' },
    { kind: 'amount', title: '수를 다는 것', hint: '표식 옆의 수가 몇인지 함께 적힌다.' },
    { kind: 'element', title: '원소', hint: '원소 트래커와 같은 그림·같은 색이다.' },
    { kind: 'other', title: '그 밖', hint: null },
  ] as const

  return (
    <div className="journal">
      <header className="topbar" style={{ '--tb': scrolled } as CSSProperties}>
        <div className="topbar__inner">
          <a className="journal__back" href="#/" aria-label="여관으로">
            ←
          </a>
          <span className="topbar__names">
            <h1 className="topbar__name">참고</h1>
            <span className="topbar__sub">찾아보는 자리</span>
          </span>
        </div>
      </header>

      <div className="ref">
        <section className="ref__block">
          <h2 className="ref__title">표식 읽기</h2>
          <p className="ref__hint">
            보정 카드와 특혜 글에 나오는 표식 전부. <strong>수를 다는 것</strong>은 표식 옆에 몇인지
            함께 적힌다.
          </p>

          {groups.map((group) => {
            const marks = MARKS.filter((mark) => mark.kind === group.kind)
            if (marks.length === 0) return null
            return (
              <div key={group.kind} className="ref__group">
                <h3 className="ref__subtitle">{group.title}</h3>
                {group.hint !== null && <p className="ref__note">{group.hint}</p>}
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
              </div>
            )
          })}
        </section>

        <section className="ref__block">
          <h2 className="ref__title">채비 중</h2>
          <p className="ref__hint">
            규칙 요약과 그 밖에 찾아볼 것들이 여기로 온다. <strong>게임 원문은 담지 않는다</strong>{' '}
            — 표식과 수치, 우리가 적은 말까지다.
          </p>
        </section>
      </div>
    </div>
  )
}
