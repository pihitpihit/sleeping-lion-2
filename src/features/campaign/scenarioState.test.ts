import { describe, expect, it } from 'vitest'
import {
  STATES,
  STATE_HINT,
  STATE_LABEL,
  isReachable,
  isStoredState,
  stateOf,
  type StoredState,
} from './scenarioState'

describe('시나리오 상태', () => {
  it('담긴 것이 없으면 닫힘이다 — 아흔다섯 줄을 미리 깔지 않는다', () => {
    expect(stateOf({}, 7)).toBe('closed')
  })

  it('담긴 것을 그대로 읽는다', () => {
    const stored: Record<number, StoredState> = { 7: 'done', 8: 'blocked' }
    expect(stateOf(stored, 7)).toBe('done')
    expect(stateOf(stored, 8)).toBe('blocked')
  })

  it('모르는 말은 담지 않는다 — 서버 값을 믿지 않는다', () => {
    expect(isStoredState('done')).toBe(true)
    expect(isStoredState('closed')).toBe(false)
    expect(isStoredState('깸')).toBe(false)
    expect(isStoredState(null)).toBe(false)
  })

  /*
    **두 글자로 맞춘다.** 넷이 한 벌로 읽혀야 하고 좁은 칸에 서는 말이다 —
    하나만 길면 그 줄만 밀린다.
  */
  it('네 말이 다 두 글자다', () => {
    for (const s of STATES) expect(STATE_LABEL[s]).toHaveLength(2)
  })

  it('읽어주는 쪽에는 뜻을 풀어 보낸다', () => {
    for (const s of STATES) expect(STATE_HINT[s].length).toBeGreaterThan(2)
  })

  it('말이 겹치지 않는다', () => {
    expect(new Set(STATES.map((s) => STATE_LABEL[s])).size).toBe(STATES.length)
  })

  it('갈 수 있는 것은 열림과 완료다 — 막지는 않고 차례만 미룬다', () => {
    expect(isReachable('open')).toBe(true)
    expect(isReachable('done')).toBe(true)
    expect(isReachable('closed')).toBe(false)
    expect(isReachable('blocked')).toBe(false)
  })
})
