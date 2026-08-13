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
    expect(got).toHaveLength(CLASS_ICON_COUNT)
    expect(got.map((c) => c.icon)).toEqual(
      Array.from({ length: CLASS_ICON_COUNT }, (_, i) => i + 1),
    )
    // 이름을 지어내지 않는다 — 번호로 부른다(구현 결정 40).
    expect(got[0]?.title).toBe('표식 1번')
    expect(got.every((c) => c.classId === null)).toBe(true)
  })

  it('표가 있으면 그중에서만 고른다', () => {
    const got = choicesOf([info(), info({ id: 'c2', name: '땜장이', icon: 5 })])
    expect(got).toHaveLength(2)
    expect(got.map((c) => c.title)).toEqual(['바위심장', '땜장이'])
    expect(got[0]?.classId).toBe('c1')
  })

  /**
   * **「나중에 정한다」는 두지 않는다**(2026-08-13). 서버는 클래스 없는 캐릭터를
   * 여전히 받지만 세우는 자리에서 고르지 않을 까닭이 없다 — 봉투를 뜯고 나서
   * 만드는 것이라 무엇인지 이미 안다.
   */
  it('안 고르는 칸을 두지 않는다', () => {
    for (const list of [[], [info()]]) {
      expect(choicesOf(list).some((c) => c.classId === null && c.icon === 0)).toBe(false)
    }
  })

  /** 팩에 그림이 없는 클래스도 담을 수 있다 — 사자의 턱 넷이 그렇다(`0012`). */
  it('그림이 없으면 첫 글자로 대신한다', () => {
    const got = choicesOf([info({ icon: null, name: '땜장이' })])
    expect(got[0]?.icon).toBe(0)
    expect(got[0]?.letter).toBe('땜')
  })

  /** 반쯤 채워진 표는 잘못 읽히기만 한다(구현 결정 116). */
  it('체력표는 아홉 칸이 아니면 없는 것으로 친다', () => {
    expect(choicesOf([info({ hp: [8, 9, 10] })])[0]?.hp).toEqual([])
    const nine = [8, 9, 10, 11, 12, 13, 14, 15, 16]
    expect(choicesOf([info({ hp: nine })])[0]?.hp).toEqual(nine)
  })
})
