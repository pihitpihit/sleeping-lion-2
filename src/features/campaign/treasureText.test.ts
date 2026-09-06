import { describe, expect, it } from 'vitest'
import { parseTreasureText } from './treasureText'

/*
  붙여넣은 글이 책자와 같은 표가 되는가. **여기가 틀리면 책자와 다른 표가 들어간다.**
*/

describe('parseTreasureText', () => {
  it('번호와 글을 가른다 — 앞의 0은 책자 표기라 그대로 받는다', () => {
    const { rows, problems } = parseTreasureText("01 무작위 아이템 도안\n02 '대형 방패' 획득")
    expect(rows).toEqual([
      { no: 1, text: '무작위 아이템 도안' },
      { no: 2, text: "'대형 방패' 획득" },
    ])
    expect(problems).toEqual([])
  })

  it('번호 뒤의 구분자는 여러 꼴을 받는다 — 옮겨 적는 손에 따라 갈린다', () => {
    const { rows } = parseTreasureText('7: 가\n8. 나\n9) 다\n10 라')
    expect(rows.map((r) => r.no)).toEqual([7, 8, 9, 10])
  })

  it('번호 차례가 뒤섞여도 세워 놓는다 — 한 줄만 고쳐 넣을 수 있어야 한다', () => {
    const { rows } = parseTreasureText('12 나중\n03 먼저')
    expect(rows.map((r) => r.no)).toEqual([3, 12])
  })

  it('빈 줄은 넘긴다', () => {
    expect(parseTreasureText('\n\n1 가\n\n').rows).toHaveLength(1)
  })

  it('번호로 시작하지 않으면 조용히 버리지 않고 짚는다', () => {
    const { rows, problems } = parseTreasureText('무작위 아이템 도안')
    expect(rows).toEqual([])
    expect(problems[0]).toContain('번호로 시작하지 않는다')
  })

  it('글이 없으면 짚는다 — 번호만 적힌 줄은 표가 못 된다', () => {
    const { rows, problems } = parseTreasureText('42')
    expect(rows).toEqual([])
    expect(problems).toHaveLength(1)
  })

  it('같은 번호가 두 번이면 뒤엣것이 이기되 짚어 준다', () => {
    const { rows, problems } = parseTreasureText('5 앞\n5 뒤')
    expect(rows).toEqual([{ no: 5, text: '뒤' }])
    expect(problems[0]).toContain('두 번')
  })

  it('400자를 넘으면 짚는다 — 서버가 거절하는 값이다', () => {
    const { rows, problems } = parseTreasureText(`1 ${'가'.repeat(401)}`)
    expect(rows).toEqual([])
    expect(problems[0]).toContain('400자')
  })
})
