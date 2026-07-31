import { describe, expect, it } from 'vitest'
import { defaultToolbarPosition, resolveToolbarPosition } from './position'

describe('defaultToolbarPosition', () => {
  it('폰 세로는 상단', () => {
    expect(defaultToolbarPosition({ width: 375, height: 667 })).toBe('top')
    expect(defaultToolbarPosition({ width: 393, height: 852 })).toBe('top')
    expect(defaultToolbarPosition({ width: 360, height: 780 })).toBe('top')
  })

  it('폰 가로는 좌측', () => {
    expect(defaultToolbarPosition({ width: 852, height: 393 })).toBe('left')
  })

  it('태블릿은 세로여도 좌측', () => {
    expect(defaultToolbarPosition({ width: 820, height: 1180 })).toBe('left')
    expect(defaultToolbarPosition({ width: 1180, height: 820 })).toBe('left')
  })

  it('데스크톱은 좌측', () => {
    expect(defaultToolbarPosition({ width: 1440, height: 900 })).toBe('left')
  })
})

describe('resolveToolbarPosition', () => {
  // 기본값이 계속 덮어쓰면 설정이 무의미해진다.
  it('사용자가 고른 값이 기본값을 이긴다', () => {
    expect(resolveToolbarPosition('left', { width: 375, height: 667 })).toBe('left')
    expect(resolveToolbarPosition('top', { width: 1440, height: 900 })).toBe('top')
  })

  it('고른 값이 없으면 기본값을 쓴다', () => {
    expect(resolveToolbarPosition(null, { width: 375, height: 667 })).toBe('top')
  })
})
