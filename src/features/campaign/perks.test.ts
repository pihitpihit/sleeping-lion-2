import { describe, expect, it } from 'vitest'
import { EXPECTED_PERK_BOXES, parsePerkJson } from './perkJson'
import { sanitizePerkChanges, type ClassPerk } from './perkNet'
import { perkBoxCount, perkBoxes, perkDeckChanges, perkRowsOf } from './perks'
import { STANDARD_COMPOSITION, compositionSize, countOf } from '../satchel/widgets/deck/deck'
import { resolveComposition } from '../satchel/widgets/deck/perks'

function perk(over: Partial<ClassPerk> = {}): ClassPerk {
  return {
    id: 'p',
    classId: 'c',
    sort: 0,
    count: 1,
    text: '줄',
    changes: {},
    ...over,
  }
}

describe('특혜 상자 번호', () => {
  /**
   * 실물 시트는 줄마다 상자가 하나에서 셋까지 붙어 있고 다 세면 열다섯이다.
   * 캐릭터가 켜 둔 값은 **상자 번호**이므로 줄을 펴서 번호를 매기면 그대로 맞물린다.
   */
  it('줄을 차례로 펴서 번호를 매긴다', () => {
    const boxes = perkBoxes([
      perk({ id: 'a', sort: 0, count: 2 }),
      perk({ id: 'b', sort: 1, count: 1 }),
      perk({ id: 'c', sort: 2, count: 3 }),
    ])
    expect(boxes.map((b) => b.slot)).toEqual([1, 2, 3, 4, 5, 6])
    expect(boxes.map((b) => b.perk.id)).toEqual(['a', 'a', 'b', 'c', 'c', 'c'])
    expect(boxes.map((b) => b.indexInPerk)).toEqual([0, 1, 0, 0, 1, 2])
  })

  it('sort 차례를 따른다 — 들어온 차례가 아니다', () => {
    const boxes = perkBoxes([perk({ id: 'b', sort: 5 }), perk({ id: 'a', sort: 1 })])
    expect(boxes.map((b) => b.perk.id)).toEqual(['a', 'b'])
  })

  it('sort에 틈이 있어도 번호는 틈 없이 이어진다 — 번호는 위치이지 이름이 아니다', () => {
    const boxes = perkBoxes([perk({ id: 'a', sort: 0 }), perk({ id: 'b', sort: 9 })])
    expect(boxes.map((b) => b.slot)).toEqual([1, 2])
  })

  it('상자를 센다', () => {
    expect(perkBoxCount([perk({ count: 2 }), perk({ count: 3 })])).toBe(5)
    expect(perkBoxCount([])).toBe(0)
  })

  it('줄마다 첫 상자 번호를 준다 — 화면이 줄 단위로 그린다', () => {
    const rows = perkRowsOf([
      perk({ id: 'a', sort: 0, count: 2 }),
      perk({ id: 'b', sort: 1, count: 1 }),
      perk({ id: 'c', sort: 2, count: 3 }),
    ])
    expect(rows.map((r) => r.first)).toEqual([1, 3, 4])
  })
})

describe('켠 상자 → 덱 변경', () => {
  const table = [
    perk({ id: 'a', sort: 0, count: 2, changes: { m1: -2 } }),
    perk({ id: 'b', sort: 1, count: 1, changes: { m2: -1, p0: 1 } }),
    perk({ id: 'c', sort: 2, count: 1, changes: {} }),
  ]

  it('아무것도 안 켰으면 변경도 없다 — 표준 덱이다', () => {
    expect(perkDeckChanges(table, [])).toEqual([])
    expect(compositionSize(resolveComposition({}, []))).toBe(20)
  })

  /** 상자 하나에 그 줄의 변경이 한 번씩 얹힌다 — 실물에서도 그렇게 센다. */
  it('같은 줄의 상자를 둘 켜면 두 번 얹힌다', () => {
    const changes = perkDeckChanges(table, [1, 2])
    const next = resolveComposition({}, changes)
    expect(countOf(STANDARD_COMPOSITION, 'm1')).toBe(5)
    expect(countOf(next, 'm1')).toBe(1)
  })

  it('한 줄이 여러 종류를 건드릴 수 있다 — 교체가 그렇다', () => {
    const next = resolveComposition({}, perkDeckChanges(table, [3]))
    expect(countOf(next, 'm2')).toBe(0)
    expect(countOf(next, 'p0')).toBe(7)
  })

  it('덱을 안 건드리는 줄도 있다 — "부정적 시나리오 효과 무시"', () => {
    expect(perkDeckChanges(table, [4])).toEqual([])
  })

  /**
   * 클래스를 바꾸거나 표를 고치면 켜 둔 번호가 표 밖을 가리킬 수 있다. **그때
   * 던지면 덱이 통째로 서지 않는다**(절대 원칙 3).
   */
  it('표 밖의 번호는 조용히 지나친다', () => {
    expect(perkDeckChanges(table, [99, 1])).toHaveLength(1)
    expect(perkDeckChanges(table, [0])).toEqual([])
  })
})

describe('변경표 거르기', () => {
  it('알아볼 수 없는 종류는 버린다', () => {
    expect(sanitizePerkChanges({ m1: -2, 없는것: 3 })).toEqual({ m1: -2 })
  })

  it('낱말을 한 가지 꼴로 세운다 — 같은 카드가 두 줄로 갈리면 안 된다', () => {
    expect(sanitizePerkChanges({ 'p1.ice.fire': 1 })).toEqual({ 'p1.fire.ice': 1 })
  })

  it('0은 담지 않는다 — 아무 일도 안 하는 줄이 표에 남는다', () => {
    expect(sanitizePerkChanges({ m1: 0 })).toEqual({})
  })

  it('배열이나 딴것이 오면 빈 표다', () => {
    expect(sanitizePerkChanges([1, 2])).toEqual({})
    expect(sanitizePerkChanges(null)).toEqual({})
    expect(sanitizePerkChanges('m1')).toEqual({})
  })
})

describe('붙여넣기 읽기', () => {
  it('제대로 된 것을 읽는다', () => {
    const out = parsePerkJson(
      '[{"count":2,"text":"줄1","changes":{"m1":-2}},{"count":1,"text":"줄2","changes":{"r.p0.fire":2}}]',
      'c1',
    )
    expect(out.problems).toEqual([])
    expect(out.perks).toHaveLength(2)
    expect(out.boxes).toBe(3)
    // 붙여넣은 차례가 곧 `sort`다 — 상자 번호가 여기서 나온다.
    expect(out.perks.map((p) => p.sort)).toEqual([0, 1])
    expect(out.perks[0].classId).toBe('c1')
  })

  it('JSON이 아니면 짚어 준다', () => {
    expect(parsePerkJson('{', 'c1').problems).toHaveLength(1)
    expect(parsePerkJson('{"a":1}', 'c1').problems[0]).toContain('배열')
  })

  /**
   * **알 수 없는 카드를 조용히 넘기지 않는다.** 손으로 적어 붙여넣는 자리라 오타가
   * 나기 쉽고, 걸러 버리면 켠 상자가 아무 일도 안 하는 채로 남는다 — 그것이
   * 화면에는 정상으로 보인다.
   */
  it('알 수 없는 카드를 짚어 준다', () => {
    const out = parsePerkJson('[{"count":1,"text":"줄","changes":{"p9":1}}]', 'c1')
    expect(out.perks).toEqual([])
    expect(out.problems[0]).toContain('p9')
  })

  it('count와 text를 살핀다', () => {
    expect(parsePerkJson('[{"count":0,"text":"줄","changes":{}}]', 'c1').problems).toHaveLength(1)
    expect(parsePerkJson('[{"count":1,"text":"","changes":{}}]', 'c1').problems).toHaveLength(1)
    expect(parsePerkJson('[{"count":1,"text":"줄","changes":[]}]', 'c1').problems).toHaveLength(1)
  })

  it('0 델타를 짚어 준다 — 아무 일도 안 하는 줄이 된다', () => {
    expect(
      parsePerkJson('[{"count":1,"text":"줄","changes":{"m1":0}}]', 'c1').problems,
    ).toHaveLength(1)
  })

  it('덱을 안 건드리는 줄은 그대로 받는다', () => {
    const out = parsePerkJson('[{"count":1,"text":"부정적 효과 무시","changes":{}}]', 'c1')
    expect(out.problems).toEqual([])
    expect(out.perks[0].changes).toEqual({})
  })

  /** 세는 것을 도울 뿐 막지는 않는다 — 우리가 안 본 클래스가 다를 수 있다. */
  it('상자 수를 세어 준다', () => {
    const rows = Array.from({ length: 15 }, () => '{"count":1,"text":"줄","changes":{}}')
    expect(parsePerkJson(`[${rows.join(',')}]`, 'c1').boxes).toBe(EXPECTED_PERK_BOXES)
  })

  it('한 줄이라도 틀리면 그 줄을 빼고 문제를 남긴다', () => {
    const out = parsePerkJson(
      '[{"count":1,"text":"좋은 줄","changes":{}},{"count":1,"text":"","changes":{}}]',
      'c1',
    )
    expect(out.problems).toHaveLength(1)
    expect(out.perks).toHaveLength(1)
  })
})
