/**
 * NOTICE.md에서 사이트에 공개할 구간만 뽑는다.
 *
 * 그 문서는 두 독자를 상대한다 — 방문자에게 필요한 것은 표기 의무가 있는 사실뿐이고,
 * 우리가 지킬 규칙과 판단 근거(쓸 수 없는 글꼴, SA 전염 범위 등)는 저장소에만 둔다.
 * 파일을 둘로 쪼개면 사본이 원본과 어긋나므로, 한 파일 안에서 구간만 표시한다.
 *
 * 이 함수는 **빌드 시점에** vite.config.ts의 플러그인이 호출한다. 런타임에 거르면
 * 걸러낸 내용이 JS 번들에 그대로 실려 나가므로, 화면에 안 보일 뿐 배포는 된다.
 */

// 마커는 '한 줄을 통째로 차지할 때만' 유효하다. 이 제약이 없으면 문서가
// 자기 편집 규칙을 설명하며 인용한 마커까지 진짜로 취급해, 설명문 조각이
// 공개 구간으로 새어 나온다.
const MARKED_BLOCK =
  /^[ \t]*<!--[ \t]*site:begin[ \t]*-->[ \t]*$([\s\S]*?)^[ \t]*<!--[ \t]*site:end[ \t]*-->[ \t]*$/gm

export function extractPublicSections(markdown: string): string {
  const blocks = [...markdown.matchAll(MARKED_BLOCK)]
  if (blocks.length === 0) {
    // 마커가 사라졌다면 조용히 전문을 노출하는 대신 빌드를 깨뜨린다.
    // 실수로 전부 공개되는 쪽이 페이지가 안 뜨는 쪽보다 나쁘다.
    throw new Error('NOTICE.md에 site:begin / site:end 마커가 없습니다.')
  }
  return blocks.map((block) => block[1].trim()).join('\n\n')
}
