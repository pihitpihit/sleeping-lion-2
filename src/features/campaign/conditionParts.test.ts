import { describe, expect, it } from 'vitest'
import { splitConditionText } from './conditionParts'

describe('splitConditionText', () => {
  it('해·월식은 클래스 표식으로 갈린다', () => {
    expect(splitConditionText('평판이 10점 이상: ☀ 상자 개봉')).toEqual([
      { kind: 'text', text: '평판이 ' },
      { kind: 'latin', text: '10' },
      { kind: 'text', text: '점 이상: ' },
      { kind: 'icon', icon: 11, glyph: '☀' },
      { kind: 'text', text: ' 상자 개봉' },
    ])
  })

  it('영문은 따로 뽑는다 — 글룸헤이븐 서체로 적는다', () => {
    expect(splitConditionText('A봉투 개봉')).toEqual([
      { kind: 'latin', text: 'A' },
      { kind: 'text', text: '봉투 개봉' },
    ])
  })

  /** 형님이 정했다 — 영문·숫자 표기는 웬만하면 그 서체다. */
  it('수도 그 서체로 간다', () => {
    expect(splitConditionText('도시 이벤트 77번')).toEqual([
      { kind: 'text', text: '도시 이벤트 ' },
      { kind: 'latin', text: '77' },
      { kind: 'text', text: '번' },
    ])
  })

  it('아무것도 없으면 한 조각이다', () => {
    expect(splitConditionText('캐릭터 은퇴')).toEqual([{ kind: 'text', text: '캐릭터 은퇴' }])
  })
})
