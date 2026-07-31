import { useMemo } from 'react'
import { marked } from 'marked'
// 저장소 루트의 문서를 그대로 읽어 렌더한다. 화면용 사본을 따로 두면
// 반드시 원본과 어긋나므로, NOTICE.md와 LICENSE가 유일한 원본이다.
import noticeSource from '../../../NOTICE.md?raw'
import licenseSource from '../../../LICENSE?raw'
import './NoticePage.css'

/**
 * 출처와 라이선스 페이지.
 *
 * CC BY-NC-SA의 저작자표시(BY)는 '합리적으로 실행 가능한' 방식의 표기를 요구한다.
 * 고지를 보려고 사이트를 떠나 GitHub로 가야 하는 것보다, 사이트 안에서 바로
 * 읽히는 편이 그 요건에 더 맞다.
 */

/**
 * 저장소 기준 상대경로를 사이트에서 실제로 열리는 주소로 바꾼다.
 * NOTICE.md의 링크는 GitHub에서 보는 것을 전제로 쓰여 있어 그대로 두면 404가 난다.
 */
function rewriteRepoLinks(markdown: string): string {
  const base = import.meta.env.BASE_URL
  return (
    markdown
      // 배포물에 포함돼 실제로 서빙되는 파일 → 사이트 주소로
      .replaceAll('./public/licenses/pirata-one-OFL.txt', `${base}licenses/pirata-one-OFL.txt`)
      // 이 페이지 하단에 전문을 싣는 문서 → 같은 페이지 앵커로
      .replaceAll('(./LICENSE)', '(#mit-license)')
  )
}

export function NoticePage() {
  const html = useMemo(
    () => marked.parse(rewriteRepoLinks(noticeSource), { async: false, gfm: true }) as string,
    [],
  )

  return (
    <div className="notice">
      <div className="notice__sheet">
        <nav className="notice__nav">
          <a href="#/" className="notice__back">
            ← 잠자는 사자 2호점
          </a>
        </nav>

        {/* 내용은 우리가 작성한 저장소 문서이며 사용자 입력이 아니다. */}
        <article className="notice__prose" dangerouslySetInnerHTML={{ __html: html }} />

        <section className="notice__prose" id="mit-license">
          <h2>MIT 라이선스 전문</h2>
          <p>이 저장소의 소스 코드에 적용된다.</p>
          <pre className="notice__license-text">{licenseSource}</pre>
        </section>
      </div>
    </div>
  )
}
