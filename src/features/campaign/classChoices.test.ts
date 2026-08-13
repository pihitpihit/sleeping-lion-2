import { describe, expect, it } from 'vitest'
import { CLASS_ICON_COUNT } from './character'
import { choicesOf } from './classChoices'
import type { ClassInfo } from './classNet'

function info(over: Partial<ClassInfo> = {}): ClassInfo {
  return { id: 'c1', icon: 3, name: '바위심장', handSize: 10, hp: [], sort: 0, ...over }
}

/**
 * 클래스 수치는 레포에 없고 DB에만 있다(절대 원칙 1). **안 넣어도 앱은 완전히
 * 돈다**(절대 원칙 3) — 그 갈래를 여기서 못박는다.
 */
describe('무엇을 늘어놓는가', () => {
  it('표가 비면 팩 아이콘 스물하나를 늘어놓는다', () => {
    const got = choicesOf([])
    expect(got).toHaveLength(CLASS_ICON_COUNT + 1)
    expect(got.slice(1).map((c) => c.icon)).toEqual(
      Array.from({ length: CLASS_ICON_COUNT }, (_, i) => i + 1),
    )
    // 이름을 지어내지 않는다 — 번호로 부른다(구현 결정 40).
    expect(got[1]?.title).toBe('표식 1번')
    expect(got.slice(1).every((c) => c.classId === null)).toBe(true)
  })

  it('표가 있으면 그중에서 고른다', () => {
    const got = choicesOf([info(), info({ id: 'c2', name: '땜장이', icon: 5 })])
    expect(got).toHaveLength(3)
    expect(got.slice(1).map((c) => c.title)).toEqual(['바위심장', '땜장이'])
    expect(got[1]?.classId).toBe('c1')
  })

  /** 아무것도 안 고른 상태이므로 첫 칸이다(구현 결정 183). */
  it('「나중에 정한다」가 맨 앞에 선다', () => {
    for (const list of [[], [info()]]) {
      const first = choicesOf(list)[0]
      expect(first?.classId).toBeNull()
      expect(first?.icon).toBe(0)
    }
  })

  /** 팩에 그림이 없는 클래스도 담을 수 있다 — 사자의 턱 넷이 그렇다(`0012`). */
  it('그림이 없으면 첫 글자로 대신한다', () => {
    const got = choicesOf([info({ icon: null, name: '땜장이' })])
    expect(got[1]?.icon).toBe(0)
    expect(got[1]?.letter).toBe('땜')
  })

  /** 반쯤 채워진 표는 잘못 읽히기만 한다(구현 결정 116). */
  it('체력표는 아홉 칸이 아니면 없는 것으로 친다', () => {
    expect(choicesOf([info({ hp: [8, 9, 10] })])[1]?.hp).toEqual([])
    const nine = [8, 9, 10, 11, 12, 13, 14, 15, 16]
    expect(choicesOf([info({ hp: nine })])[1]?.hp).toEqual(nine)
  })
})
