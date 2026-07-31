import { LOCALE, messages } from '../../i18n/messages'
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
 *
 * 태그라인의 두 낱말이 그대로 두 카드 제목이다 — 일지(축 ①), 행낭(축 ②).
 * 수식어를 붙이지 않는다. '모험 일지'·'원정 행낭'처럼 꾸미면 무엇도 구별해주지
 * 못하면서 태그라인과의 메아리만 흐려진다. 간판은 말수가 적다.
 *
 * 카드 본문은 무엇을 다루는지만 적고 동작은 설명하지 않는다. "다음 원정까지
 * 남는다", "끝나면 비워진다" 같은 문장은 영속성 여부를 풀어 쓴 기능 설명이라
 * 간판에 어울리지 않는다. 그건 SPEC이 할 말이다.
 *
 * 그리고 탁자 위 현실을 가리키지 않는다. "한 판이 끝나면", "판이 도는 동안"은
 * 보드게임을 하고 있다는 층위의 말이라 여관 안의 목소리가 깨진다.
 * 대신 게임 세계 안의 말로 적는다 — 모험, 싸움.
 *
 * 어휘는 일상어로 고른다. 정취를 노리다 "셈", "여정록" 같은 말을 끌어오면
 * 한 번 더 읽어야 하고, 간판은 한 번에 읽혀야 한다.
 */

const PILLARS = [
  {
    ordinal: 'I',
    title: '일지',
    body: '모험을 기록한다. 금화와 경험치, 레벨과 퍽, 손에 넣은 물건, 도시의 번영과 우리 명성까지.',
  },
  {
    ordinal: 'II',
    title: '행낭',
    body: '원소와 보정 덱, 주도권 순서. 싸움이 붙으면 꺼내 쓴다.',
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
          돌아와서는 일지를 적고, 다시 나설 때는 행낭을 챙긴다.
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
        <p>{messages.siteTagline[LOCALE]}</p>
        {/* 첫 줄이 정취 쪽으로 갔으므로, 어떤 게임에 쓰는지는 이 줄이 밝힌다. */}
        <p className="welcome__footer-fine">
          글룸헤이븐 · 사자의 턱 팬 제작 도구. Cephalofair Games와 무관한 비영리
          도구이며 게임 원문은 담지 않습니다.
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
