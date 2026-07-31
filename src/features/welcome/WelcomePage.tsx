import { LionCrest } from './LionCrest'
import './WelcomePage.css'

/**
 * 웰컴 페이지.
 *
 * 메뉴는 아직 배치하지 않는다. 아래 두 장은 내비게이션이 아니라
 * SPEC 1장의 두 축이 무엇인지 보여주는 안내 카드이며, 전부 채비 중 상태다.
 *
 * 문체 원칙 — 여관 주인이 간판과 장부에 적어둔 말투로 쓴다. 번역투("~하는 것들",
 * "동행 도구", "정산")와 기술 문서 어휘를 화면에 그대로 내보내지 않는다.
 * SPEC은 기술 용어로 쓰되(캠페인 기록지·인게임 도구), 화면 문구는 결이 맞게 옮긴다.
 */

const PILLARS = [
  {
    ordinal: 'I',
    title: '캠페인 장부',
    body: '한 판이 끝나면 셈을 적는다. 금화와 경험치, 레벨과 퍽, 손에 넣은 물건, 도시의 번영과 우리 명성까지. 다음 원정까지 남는 것들이다.',
  },
  {
    ordinal: 'II',
    title: '탁자 위 도구',
    body: '판이 도는 동안에만 쓴다. 원소와 보정 덱, 주도권 순서. 자리를 뜨면 알아서 치워진다.',
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
          본점은 글룸헤이븐 어귀에, 2호점은 여기에.
          <br />
          돌아와서는 장부를 펴고, 다시 나설 때는 연장을 챙긴다.
        </p>

        <ul className="welcome__pillars">
          {PILLARS.map((pillar) => (
            <li key={pillar.ordinal} className="welcome__pillar">
              <span className="welcome__pillar-ordinal" aria-hidden="true">
                {pillar.ordinal}
              </span>
              <h2 className="welcome__pillar-title">{pillar.title}</h2>
              <p className="welcome__pillar-body">{pillar.body}</p>
              <span className="welcome__pillar-status">채비 중</span>
            </li>
          ))}
        </ul>
      </main>

      <footer className="welcome__footer">
        <p>글룸헤이븐과 사자의 턱에 쓰는 도구</p>
        <p className="welcome__footer-fine">
          Cephalofair Games와 무관하게 팬이 만든 비영리 도구입니다. 게임 원문은 담지
          않습니다.
        </p>
        {/* CC BY-NC-SA의 저작자표시(BY)는 '합리적으로 실행 가능한' 방식의 표기를
            요구한다. 에셋을 실제로 들이기 전이라도 글꼴 출처는 여기 둔다. */}
        <p className="welcome__footer-fine">
          © 2026 plastics {' · '} 글꼴{' '}
          <a href="https://fonts.google.com/specimen/Pirata+One" className="welcome__link">
            Pirata One
          </a>{' ('}
          {/* index.html과 달리 JSX의 href는 Vite가 base를 다시 쓰지 않는다.
              BASE_URL('/sleeping-lion-2/')을 직접 붙여야 하위 경로 배포에서 안 깨진다. */}
          <a
            href={`${import.meta.env.BASE_URL}licenses/pirata-one-OFL.txt`}
            className="welcome__link"
          >
            SIL OFL 1.1
          </a>
          {') · '}
          <a href="#/notice" className="welcome__link">
            출처와 라이선스
          </a>
        </p>
      </footer>
    </div>
  )
}
