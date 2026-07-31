import { describe, expect, it } from 'vitest'
import { ELEMENTS } from './elements'
import {
  defaultElementSettings,
  sanitizeElementSettings,
  visibleCount,
  visibleElements,
} from './settings'
import { isElementTrackerSizeAllowed } from './layout'

describe('sanitizeElementSettings', () => {
  it('없거나 망가진 값에서도 기본값을 낸다', () => {
    for (const bad of [undefined, null, 42, '문자열', [], { showAll: '네' }]) {
      const s = sanitizeElementSettings(bad)
      expect(s.showAll).toBe(true)
      expect(visibleCount(s)).toBe(ELEMENTS.length)
    }
  })

  it('저장된 선택을 읽는다', () => {
    const s = sanitizeElementSettings({
      showAll: false,
      visible: { fire: true, ice: true, air: false, earth: false, light: false, dark: false },
    })
    expect(s.showAll).toBe(false)
    expect(visibleElements(s).map((e) => e.id)).toEqual(['fire', 'ice'])
  })

  // 원소 없는 트래커는 쓸모가 없고 크기 제약도 0이 되어 의미를 잃는다.
  it('하나도 안 켜진 값은 기본값으로 되돌린다', () => {
    const s = sanitizeElementSettings({
      showAll: false,
      visible: Object.fromEntries(ELEMENTS.map((e) => [e.id, false])),
    })
    expect(s.showAll).toBe(true)
  })

  it('모르는 원소 키는 무시한다', () => {
    const s = sanitizeElementSettings({ showAll: false, visible: { fire: true, 없음: true } })
    expect(visibleElements(s).every((e) => ELEMENTS.includes(e))).toBe(true)
  })

  it('전체 표시가 켜져 있으면 개별 선택과 무관하게 여섯을 다 보인다', () => {
    const s = sanitizeElementSettings({ showAll: true, visible: { fire: false } })
    expect(visibleCount(s)).toBe(ELEMENTS.length)
  })
})

describe('크기 제약이 설정을 따른다', () => {
  const twoOnly = {
    showAll: false,
    visible: { fire: true, ice: true, air: false, earth: false, light: false, dark: false },
  }

  it('기본(여섯)이면 긴 쪽이 6칸 이상이어야 한다', () => {
    const all = defaultElementSettings()
    expect(isElementTrackerSizeAllowed({ w: 6, h: 1 }, all)).toBe(true)
    expect(isElementTrackerSizeAllowed({ w: 5, h: 5 }, all)).toBe(false)
  })

  it('둘만 고르면 2칸으로 줄일 수 있다', () => {
    expect(isElementTrackerSizeAllowed({ w: 2, h: 1 }, twoOnly)).toBe(true)
    expect(isElementTrackerSizeAllowed({ w: 1, h: 2 }, twoOnly)).toBe(true)
    expect(isElementTrackerSizeAllowed({ w: 1, h: 1 }, twoOnly)).toBe(false)
  })
})
