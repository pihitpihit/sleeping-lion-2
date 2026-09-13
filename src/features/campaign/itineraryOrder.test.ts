import { describe, expect, it } from 'vitest'
import { currentStop, isDate, move, placeByDate, stopLabel, type Stop } from './itineraryOrder'

/*
  **차례가 틀리면 행적이 거짓말을 한다.** 위가 최신이고, 날짜를 적으면 그 줄만
  제 자리로 가며, 날짜 없는 줄은 저절로 움직이지 않는다.
*/

function stop(id: string, at: string | null = null): Stop {
  return { id, at, scenario: '', code: '', place: id, scenarioNo: null }
}

describe('isDate', () => {
  it('YYYY-MM-DD만 날짜로 본다', () => {
    expect(isDate('2026-09-13')).toBe(true)
    expect(isDate('2026-9-3')).toBe(false)
    expect(isDate('')).toBe(false)
    expect(isDate(null)).toBe(false)
    expect(isDate(20260913)).toBe(false)
  })
})

describe('placeByDate', () => {
  it('새 날짜가 가장 최신이면 맨 위로 간다', () => {
    const order = [stop('a', '2026-09-05'), stop('b', '2026-09-01')]
    const next = placeByDate([...order, stop('c', '2026-09-12')], 'c')
    expect(next.map((s) => s.id)).toEqual(['c', 'a', 'b'])
  })

  it('가운데 날짜면 그 사이로 들어간다', () => {
    const order = [stop('a', '2026-09-12'), stop('b', '2026-09-01'), stop('c', '2026-09-05')]
    expect(placeByDate(order, 'c').map((s) => s.id)).toEqual(['a', 'c', 'b'])
  })

  it('가장 오래된 날짜면 맨 아래로 간다', () => {
    const order = [stop('a', '2026-09-12'), stop('b', '2026-09-05'), stop('c', '2026-01-01')]
    expect(placeByDate(order, 'c').map((s) => s.id)).toEqual(['a', 'b', 'c'])
  })

  it('날짜가 없으면 아무 일도 안 한다 — 사람이 놓은 자리를 지킨다', () => {
    const order = [stop('a', '2026-09-12'), stop('b'), stop('c', '2026-09-01')]
    expect(placeByDate(order, 'b').map((s) => s.id)).toEqual(['a', 'b', 'c'])
  })

  /*
    ┌────────────────────────────────────────────────────────────────────────┐
    │ **날짜 없는 줄은 벽이 되지 않는다.**                                    │
    └────────────────────────────────────────────────────────────────────────┘

    견줄 것이 없으므로 건너뛴다. 기준으로 삼으면 날짜 있는 둘 사이에 낀 날짜
    없는 줄 때문에 제 자리로 못 간다.
  */
  it('날짜 없는 줄은 건너뛴다', () => {
    const order = [
      stop('a', '2026-09-12'),
      stop('x'),
      stop('b', '2026-09-01'),
      stop('c', '2026-09-05'),
    ]
    expect(placeByDate(order, 'c').map((s) => s.id)).toEqual(['a', 'x', 'c', 'b'])
  })

  it('견줄 날짜가 하나도 없으면 맨 아래로 간다', () => {
    const order = [stop('x'), stop('y'), stop('c', '2026-09-05')]
    expect(placeByDate(order, 'c').map((s) => s.id)).toEqual(['x', 'y', 'c'])
  })

  it('없는 줄을 옮기라고 하면 그대로 돌려준다', () => {
    const order = [stop('a', '2026-09-12')]
    expect(placeByDate(order, '없음').map((s) => s.id)).toEqual(['a'])
  })
})

describe('move', () => {
  const order = [stop('a'), stop('b'), stop('c')]

  it('한 칸 올린다', () => {
    expect(move(order, 'b', -1).map((s) => s.id)).toEqual(['b', 'a', 'c'])
  })

  it('한 칸 내린다', () => {
    expect(move(order, 'b', 1).map((s) => s.id)).toEqual(['a', 'c', 'b'])
  })

  it('끝에서 더 가지 않는다 — 조용히 사라지면 안 된다', () => {
    expect(move(order, 'a', -1).map((s) => s.id)).toEqual(['a', 'b', 'c'])
    expect(move(order, 'c', 1).map((s) => s.id)).toEqual(['a', 'b', 'c'])
  })
})

describe('currentStop', () => {
  it('맨 위가 지금 머무는 곳이다', () => {
    expect(currentStop([stop('a'), stop('b')])?.id).toBe('a')
  })

  it('비어 있으면 모른다고 한다', () => {
    expect(currentStop([])).toBeNull()
  })
})

describe('stopLabel', () => {
  it('시나리오·코드·이름을 이어 붙인다', () => {
    expect(
      stopLabel({
        id: '1',
        at: null,
        scenario: '7',
        code: 'G-12',
        place: '버려진 사원',
        scenarioNo: null,
      }),
    ).toBe('#7 G-12 버려진 사원')
  })

  it('있는 것만 이어 붙인다 — 빈 괄호나 # 하나가 남으면 고장으로 읽힌다', () => {
    expect(
      stopLabel({ id: '1', at: null, scenario: '', code: '', place: '광장', scenarioNo: null }),
    ).toBe('광장')
    expect(
      stopLabel({ id: '1', at: null, scenario: '7', code: '', place: '', scenarioNo: null }),
    ).toBe('#7')
    expect(
      stopLabel({ id: '1', at: null, scenario: ' ', code: ' ', place: ' ', scenarioNo: null }),
    ).toBe('')
  })
})
