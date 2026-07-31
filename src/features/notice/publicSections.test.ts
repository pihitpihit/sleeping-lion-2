import { describe, expect, it } from 'vitest'
import { extractPublicSections } from './publicSections'

describe('extractPublicSections', () => {
  it('마커로 감싼 구간만 뽑는다', () => {
    const md = [
      '# 제목',
      '저장소 전용 도입부',
      '<!-- site:begin -->',
      '공개할 내용',
      '<!-- site:end -->',
      '저장소 전용 꼬리말',
    ].join('\n')

    expect(extractPublicSections(md)).toBe('공개할 내용')
  })

  it('마커가 여러 벌이면 이어붙인다', () => {
    const md = [
      '<!-- site:begin -->',
      '첫 구간',
      '<!-- site:end -->',
      '가운데는 저장소 전용',
      '<!-- site:begin -->',
      '둘째 구간',
      '<!-- site:end -->',
    ].join('\n')

    expect(extractPublicSections(md)).toBe('첫 구간\n\n둘째 구간')
  })

  // 실제로 한 번 터졌던 버그다. 문서가 자기 편집 규칙을 설명하며 마커를 인용했더니
  // 그 사이의 조각("와")이 공개 구간으로 새어 나와 제목 아래에 찍혔다.
  it('줄 한복판에 인용된 마커는 무시한다', () => {
    const md = [
      '> `<!-- site:begin -->` 와 `<!-- site:end -->` 로 감싼 구간만 공개된다',
      '<!-- site:begin -->',
      '진짜 공개 내용',
      '<!-- site:end -->',
    ].join('\n')

    expect(extractPublicSections(md)).toBe('진짜 공개 내용')
  })

  // 마커가 사라졌을 때 조용히 전문을 노출하면, 저장소 전용으로 적어둔 내용이
  // 통째로 공개된다. 그것보다 페이지가 안 뜨는 편이 낫다.
  it('마커가 없으면 던진다', () => {
    expect(() => extractPublicSections('# 마커 없는 문서')).toThrow(/site:begin/)
  })

  it('앞뒤 공백을 다듬는다', () => {
    const md = '<!-- site:begin -->\n\n\n  내용  \n\n\n<!-- site:end -->'
    expect(extractPublicSections(md)).toBe('내용')
  })
})
