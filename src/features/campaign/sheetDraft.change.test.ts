import { describe, expect, it } from 'vitest'
import { moveOf, toggleOf } from './sheetDraft'

/**
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ **고친 자리를 색으로 짚어 주려면 무엇이 어느 쪽으로 움직였는지 알아야.**   │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * 화면은 이 값을 클래스로 옮길 뿐이다 — 판단은 여기서 하고 시험도 여기서 한다.
 */
describe('수가 움직인 쪽', () => {
  it('오르면 위, 내리면 아래, 그대로면 없음', () => {
    expect(moveOf(10, 12)).toBe('up')
    expect(moveOf(10, 8)).toBe('down')
    expect(moveOf(10, 10)).toBeNull()
  })

  /** 되돌려 놓으면 색도 함께 사라져야 한다 — 저장이 안 눌리는 것과 같은 결이다. */
  it('되돌려 놓으면 표시가 없다', () => {
    expect(moveOf(10, 10)).toBeNull()
  })
})

describe('켬끔이 움직인 쪽', () => {
  it('켜면 위, 끄면 아래, 그대로면 없음', () => {
    expect(toggleOf(false, true)).toBe('up')
    expect(toggleOf(true, false)).toBe('down')
    expect(toggleOf(true, true)).toBeNull()
    expect(toggleOf(false, false)).toBeNull()
  })
})
