import { describe, expect, it } from 'vitest'
import { ELEMENTS, glowOf, type ElementDef } from './elements'

const def = (extra: Partial<ElementDef> = {}): ElementDef => ({
  id: 'x',
  name: '시험',
  file: 'x',
  color: '#112233',
  ...extra,
})

describe('glowOf', () => {
  it('지정이 없으면 아이콘 색으로 안팎을 모두 채운다', () => {
    expect(glowOf(def())).toEqual({ inner: '#112233', outer: '#112233' })
  })

  it('안쪽만 주면 바깥도 그것을 따른다', () => {
    expect(glowOf(def({ glow: '#ff0000' }))).toEqual({ inner: '#ff0000', outer: '#ff0000' })
  })

  it('안팎을 따로 주면 두 겹이 된다', () => {
    expect(glowOf(def({ glow: '#ff0000', glowOuter: '#0000ff' }))).toEqual({
      inner: '#ff0000',
      outer: '#0000ff',
    })
  })

  it('바깥만 주면 안쪽은 아이콘 색을 쓴다', () => {
    expect(glowOf(def({ glowOuter: '#0000ff' }))).toEqual({ inner: '#112233', outer: '#0000ff' })
  })
})

describe('어둠 원소', () => {
  /**
   * 아이콘 색이 바탕과 거의 같아 그대로 쓰면 타오르는지 보이지 않는다.
   * 빛무리만 따로 밝게 준다 — 아이콘 자체는 원본 색을 지킨다.
   */
  it('빛무리를 아이콘 색과 다르게 가진다', () => {
    const dark = ELEMENTS.find((e) => e.id === 'dark')!
    const { inner, outer } = glowOf(dark)
    expect(inner).not.toBe(dark.color)
    expect(outer).not.toBe(dark.color)
    expect(inner).not.toBe(outer)
  })

  it('나머지 원소는 아이콘 색을 그대로 쓴다', () => {
    for (const element of ELEMENTS.filter((e) => e.id !== 'dark')) {
      expect(glowOf(element)).toEqual({ inner: element.color, outer: element.color })
    }
  })
})
