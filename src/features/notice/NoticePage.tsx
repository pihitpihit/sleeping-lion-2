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
 * NOTICE.md에서 사이트에 공개할 구간만 뽑는다.
 *
 * 그 문서는 두 독자를 상대한다 — 방문자에게 필요한 것은 표기 의무가 있는 사실뿐이고,
 * 우리가 지킬 규칙과 판단 근거(쓸 수 없는 글꼴, SA 전염 범위 등)는 저장소에만 둔다.
 * 파일을 둘로 쪼개면 사본이 원본과 어긋나므로, 한 파일 안에서 구간만 표시한다.
 */
function extractPublicSections(markdown: string): string {
  // 마커는 '한 줄을 통째로 차지할 때만' 유효하다. 이 제약이 없으면 문서가
  // 자기 편집 규칙을 설명하며 인용한 마커까지 진짜로 취급해, 설명문 조각이
  // 공개 구간으로 새어 나온다.
  const MARKED_BLOCK =
    /^[ \t]*<!--[ \t]*site:begin[ \t]*-->[ \t]*$([\s\S]*?)^[ \t]*<!--[ \t]*site:end[ \t]*-->[ \t]*$/gm
  const blocks = [...markdown.matchAll(MARKED_BLOCK)]
  if (blocks.length === 0) {
    // 마커가 사라졌다면 조용히 전문을 노출하는 대신 눈에 띄게 실패시킨다.
    throw new Error('NOTICE.md에 site:begin / site:end 마커가 없습니다.')
  }
  return blocks.map((block) => block[1].trim()).join('\n\n')
}

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
    () =>
      marked.parse(rewriteRepoLinks(extractPublicSections(noticeSource)), {
        async: false,
        gfm: true,
      }) as string,
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

        <h1 className="notice__title">출처와 라이선스</h1>

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
