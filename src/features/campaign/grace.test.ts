import { describe, expect, it } from 'vitest'
import { GRACE_MS, dueAt, graceShort, graceText } from './grace'

/*
  **여기가 틀리면 「아직 있다」고 적힌 캐릭터가 사라진다.** 남은 시간을 적는 일은
  화면을 거치지 않고 표로 못박는다.
*/

const HOUR = 60 * 60 * 1000
const MIN = 60 * 1000
const at = 1_000_000_000_000

describe('dueAt', () => {
  it('이틀 뒤다 — 서버가 거두는 값과 같아야 한다', () => {
    expect(dueAt(at) - at).toBe(GRACE_MS)
    expect(GRACE_MS).toBe(48 * HOUR)
  })
})

describe('graceText', () => {
  it('막 눌렀으면 이틀이 남아 있다', () => {
    expect(graceText(at, at)).toBe('2일 뒤 사라진다')
  })

  it('하루가 넘게 남으면 시간까지 적는다 — 오늘 안에 손을 써야 하는지 알아야 한다', () => {
    expect(graceText(at, at + 20 * HOUR)).toBe('1일 4시간 뒤 사라진다')
  })

  it('올려 센다 — 있는 시간보다 적게 말하면 늦은 줄 안다', () => {
    // 1시간 1분 남았다. 내려 세면 「1시간」이 되어 실제보다 적게 말한다.
    expect(graceText(at, dueAt(at) - HOUR - MIN)).toBe('2시간 뒤 사라진다')
    expect(graceText(at, dueAt(at) - 30 * MIN)).toBe('30분 뒤 사라진다')
    expect(graceText(at, dueAt(at) - 10)).toBe('1분 뒤 사라진다')
  })

  it('「1일 24시간」이라 적지 않는다', () => {
    // 1일 23시간 59분 → 올려 세면 24시간이 되는 자리.
    expect(graceText(at, dueAt(at) - (47 * HOUR + 59 * MIN))).toBe('2일 뒤 사라진다')
  })

  it('지났으면 곧 사라진다고 한다 — 치우는 것은 서버라 그 사이가 있다', () => {
    expect(graceText(at, dueAt(at))).toBe('곧 사라진다')
    expect(graceText(at, dueAt(at) + HOUR)).toBe('곧 사라진다')
  })
})

describe('graceShort', () => {
  it('목록에는 짧게 적는다', () => {
    expect(graceShort(at, at)).toBe('2일 남음')
    expect(graceShort(at, dueAt(at) - 3 * HOUR)).toBe('3시간 남음')
    expect(graceShort(at, dueAt(at) - 5 * MIN)).toBe('5분 남음')
    expect(graceShort(at, dueAt(at))).toBe('곧 사라짐')
  })
})
