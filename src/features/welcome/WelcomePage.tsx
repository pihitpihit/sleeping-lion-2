import { LionCrest } from './LionCrest'
import './WelcomePage.css'

/**
 * 웰컴 페이지.
 *
 * 메뉴는 아직 배치하지 않는다. 아래 두 장은 내비게이션이 아니라
 * SPEC 1장의 두 축이 무엇인지 보여주는 안내 카드이며, 전부 준비 중 상태다.
 */

const PILLARS = [
  {
    ordinal: 'I',
    title: '캠페인 기록지',
    body: '시나리오가 끝난 뒤의 정산을 남긴다. 골드와 경험치, 레벨업과 퍽, 아이템 변동, 번영과 명성. 세션 사이를 잇는 장부.',
  },
  {
    ordinal: 'II',
    title: '인게임 도구',
    body: '탁자 위에서 쓰는 것들. 원소 트래커, 공격 보정 덱, 주도권 정렬. 판이 끝나면 남기지 않고 잊는다.',
  },
]

export function WelcomePage() {
  return (
    <div className="welcome">
      <main className="welcome__sign">
        <LionCrest className="welcome__crest" />

        {/* 'Lion II'만 nbsp로 묶어 서수가 혼자 다음 줄로 떨어지지 않게 한다.
            전체를 묶으면 아주 좁은 화면에서 접힐 여지가 사라진다. */}
        <h1 className="welcome__wordmark">Sleeping Lion&nbsp;II</h1>

        <p className="welcome__ko-sign" lang="ko">
          잠자는 사자 2호점
        </p>

        <div className="welcome__rule" role="presentation">
          <span className="welcome__rule-line" />
          <span className="welcome__rule-gem" />
          <span className="welcome__rule-line" />
        </div>

        <p className="welcome__tagline">
          첫 여관에서 갈라져 나온 우리 파티의 아지트.
          <br />
          장부를 펴고, 자리를 잡으시오.
        </p>

        <ul className="welcome__pillars">
          {PILLARS.map((pillar) => (
            <li key={pillar.ordinal} className="welcome__pillar">
              <span className="welcome__pillar-ordinal" aria-hidden="true">
                {pillar.ordinal}
              </span>
              <h2 className="welcome__pillar-title">{pillar.title}</h2>
              <p className="welcome__pillar-body">{pillar.body}</p>
              <span className="welcome__pillar-status">준비 중</span>
            </li>
          ))}
        </ul>
      </main>

      <footer className="welcome__footer">
        <p>Gloomhaven · Jaws of the Lion 동행 도구</p>
        <p className="welcome__footer-fine">
          Cephalofair Games와 무관한 비영리 팬메이드 도구이며, 게임 콘텐츠 원문을
          담지 않습니다.
        </p>
      </footer>
    </div>
  )
}
