import { describe, expect, it } from 'vitest'
import { parseClassJson } from './classJson'

/**
 * 붙여넣은 글자를 읽어내기.
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ **한 줄이라도 틀리면 아무것도 넣지 않는다.**                              │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * 반쯤 들어가면 무엇이 들어갔고 무엇이 안 들어갔는지 사람이 다시 세야 한다.
 * 그리고 **어디가 틀렸는지 짚어 준다** — 모르면 붙여넣기가 수수께끼가 된다.
 */

const HP = [8, 9, 11, 12, 14, 15, 17, 18, 20]
const ONE = JSON.stringify([{ icon: 3, name: '가', handSize: 10, hp: HP }])

describe('클래스 JSON 읽기', () => {
  it('제대로 된 것을 읽는다', () => {
    const out = parseClassJson(ONE)
    expect(out.problems).toEqual([])
    expect(out.classes).toEqual([{ icon: 3, name: '가', handSize: 10, hp: HP }])
  })

  it('이름 앞뒤 공백은 다듬는다', () => {
    const out = parseClassJson(JSON.stringify([{ icon: 1, name: '  가 ', handSize: 9, hp: HP }]))
    expect(out.classes[0].name).toBe('가')
  })

  it('JSON이 아니면 그렇다고 말한다', () => {
    expect(parseClassJson('{이건 아님').problems[0]).toMatch(/JSON/)
  })

  it('배열이 아니면 잡는다', () => {
    expect(parseClassJson('{"icon":1}').problems[0]).toMatch(/배열/)
  })

  it('아이콘 번호가 1~21을 벗어나면 잡는다', () => {
    for (const icon of [0, 22, 1.5, '3']) {
      const out = parseClassJson(JSON.stringify([{ icon, name: '가', handSize: 9, hp: HP }]))
      expect(out.problems[0], String(icon)).toMatch(/icon/)
      expect(out.classes).toHaveLength(0)
    }
  })

  it('같은 아이콘이 두 번 나오면 잡는다 — 나중 것이 앞 것을 지운다', () => {
    const out = parseClassJson(
      JSON.stringify([
        { icon: 3, name: '가', handSize: 9, hp: HP },
        { icon: 3, name: '나', handSize: 9, hp: HP },
      ]),
    )
    expect(out.problems[0]).toMatch(/이미 나왔/)
  })

  it('이름이 비면 잡는다', () => {
    const out = parseClassJson(JSON.stringify([{ icon: 3, name: '   ', handSize: 9, hp: HP }]))
    expect(out.problems[0]).toMatch(/name/)
  })

  it('체력이 아홉 칸이 아니면 잡는다 — 실물 시트의 눈금이 아홉이다', () => {
    const out = parseClassJson(
      JSON.stringify([{ icon: 3, name: '가', handSize: 9, hp: [8, 9, 11] }]),
    )
    expect(out.problems[0]).toMatch(/9칸/)
  })

  it('체력에 정수가 아닌 것이 섞이면 잡는다', () => {
    const bad = [8, 9, 11, 12, 14, 15, 17, 18, '20']
    const out = parseClassJson(JSON.stringify([{ icon: 3, name: '가', handSize: 9, hp: bad }]))
    expect(out.problems[0]).toMatch(/hp/)
  })

  it('틀린 줄만 빠지고 나머지는 읽힌다 — 어디가 틀렸는지 함께 말한다', () => {
    const out = parseClassJson(
      JSON.stringify([
        { icon: 1, name: '가', handSize: 9, hp: HP },
        { icon: 99, name: '나', handSize: 9, hp: HP },
        { icon: 2, name: '다', handSize: 9, hp: HP },
      ]),
    )
    expect(out.classes.map((c) => c.icon)).toEqual([1, 2])
    expect(out.problems).toHaveLength(1)
    expect(out.problems[0]).toMatch(/2번째/)
  })
})
