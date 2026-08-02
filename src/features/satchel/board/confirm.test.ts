import { describe, expect, it } from 'vitest'
import { CONFIRM_DELAY_MS, armProgress, isArmed, remainingMs, secondsLeft } from './confirm'

describe('뜸', () => {
  it('시간이 갈수록 줄어든다', () => {
    expect(remainingMs(1000, 0)).toBe(1000)
    expect(remainingMs(1000, 400)).toBe(600)
    expect(remainingMs(1000, 1000)).toBe(0)
  })

  /** 음수가 나가면 띠가 거꾸로 차고 초가 마이너스로 적힌다. */
  it('지나도 0에서 멎는다', () => {
    expect(remainingMs(1000, 5000)).toBe(0)
    expect(armProgress(remainingMs(1000, 5000))).toBe(1)
    expect(secondsLeft(remainingMs(1000, 5000))).toBe(0)
  })

  it('시계가 이상하면 뜸을 끝난 것으로 본다', () => {
    // 눌리지 않는 단추로 갇히는 것이 더 나쁘다 — 뜸은 안전장치지 자물쇠가 아니다.
    expect(remainingMs(Number.NaN, 0)).toBe(0)
    expect(remainingMs(1000, Number.NaN)).toBe(0)
  })
})

describe('남은 초', () => {
  /**
   * **올림이다.** 4999ms를 '4'로 적으면 5초짜리 뜸이 4초로 시작해 1초가 통째로
   * 사라져 보이고, 0.4초 남았을 때 '0'이 적히면 눌러도 안 먹는 고장으로 읽힌다.
   */
  it('올려 센다 — 0이 적히는 동안 눌리지 않는 일이 없다', () => {
    expect(secondsLeft(CONFIRM_DELAY_MS)).toBe(5)
    expect(secondsLeft(4999)).toBe(5)
    expect(secondsLeft(3000)).toBe(3)
    expect(secondsLeft(2999)).toBe(3)
    expect(secondsLeft(2001)).toBe(3)
    expect(secondsLeft(2000)).toBe(2)
    expect(secondsLeft(400)).toBe(1)
    expect(secondsLeft(1)).toBe(1)
    expect(secondsLeft(0)).toBe(0)
  })

  it('0초가 적히는 때와 눌리는 때가 같다', () => {
    for (const left of [3000, 1500, 400, 1, 0]) {
      expect(secondsLeft(left) === 0).toBe(isArmed(left))
    }
  })
})

describe('채워지는 띠', () => {
  it('빈 채로 시작해 다 차며 끝난다', () => {
    expect(armProgress(CONFIRM_DELAY_MS)).toBe(0)
    expect(armProgress(CONFIRM_DELAY_MS / 2)).toBeCloseTo(0.5)
    expect(armProgress(0)).toBe(1)
  })

  it('0..1 밖으로 나가지 않는다', () => {
    for (const left of [-500, 0, 1500, CONFIRM_DELAY_MS, CONFIRM_DELAY_MS * 3]) {
      const p = armProgress(left)
      expect(p).toBeGreaterThanOrEqual(0)
      expect(p).toBeLessThanOrEqual(1)
    }
  })

  it('길이가 0이면 다 찬 것으로 본다', () => {
    expect(armProgress(0, 0)).toBe(1)
    expect(armProgress(100, 0)).toBe(1)
  })
})

describe('눌러도 되는가', () => {
  it('뜸이 남았으면 안 된다', () => {
    expect(isArmed(CONFIRM_DELAY_MS)).toBe(false)
    expect(isArmed(1)).toBe(false)
    expect(isArmed(0)).toBe(true)
  })

  /**
   * 관성 탭을 끊을 만큼은 있어야 하고, 초를 세는 창이 두 자리로 벌어질 만큼
   * 길어서는 안 된다 — 그쯤 되면 뜸이 아니라 벌이다.
   */
  it('뜸은 손이 멈출 만한 길이다', () => {
    expect(CONFIRM_DELAY_MS).toBeGreaterThanOrEqual(2000)
    expect(CONFIRM_DELAY_MS).toBeLessThan(10000)
  })
})
