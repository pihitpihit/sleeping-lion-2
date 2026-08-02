import { beforeEach, describe, expect, it } from 'vitest'
import { computeRoundLayout } from './round'
import { FIRST_ROUND, MAX_ROUND, useRoundStore } from './roundStore'
import { useElementStore } from '../elements/elementStore'
import { decayElementState, ELEMENTS } from '../elements/elements'

describe('원소 하강', () => {
  /**
   * **탭 순서와 다르다.** 탭은 돌고 돌지만 하강은 한 방향으로만 내려가고 바닥에서
   * 멎는다 — 꺼진 원소가 라운드가 지났다고 다시 타오르면 안 된다.
   */
  it('강함 → 약함 → 꺼짐으로 내려가고 바닥에서 멎는다', () => {
    expect(decayElementState('strong')).toBe('waning')
    expect(decayElementState('waning')).toBe('inert')
    expect(decayElementState('inert')).toBe('inert')
  })

  it('아무리 내려도 다시 타오르지 않는다', () => {
    let state = decayElementState('strong')
    for (let i = 0; i < 10; i += 1) state = decayElementState(state)
    expect(state).toBe('inert')
  })
})

describe('라운드를 넘기면 원소가 함께 내려간다', () => {
  beforeEach(() => {
    useRoundStore.getState().reset()
    useElementStore.getState().resetAll()
  })

  it('1라운드에서 시작한다 — 0라운드는 없다', () => {
    expect(useRoundStore.getState().round).toBe(1)
    expect(FIRST_ROUND).toBe(1)
  })

  it('넘길 때마다 하나씩 오른다', () => {
    useRoundStore.getState().advance()
    expect(useRoundStore.getState().round).toBe(2)
    useRoundStore.getState().advance()
    expect(useRoundStore.getState().round).toBe(3)
  })

  it('여섯 원소가 한 번에 내려간다', () => {
    const elements = useElementStore.getState()
    elements.setState('fire', 'strong')
    elements.setState('ice', 'waning')
    elements.setState('air', 'strong')
    // 나머지 셋은 꺼진 채로 둔다.

    useRoundStore.getState().advance()

    const after = useElementStore.getState()
    expect(after.stateOf('fire')).toBe('waning')
    expect(after.stateOf('ice')).toBe('inert')
    expect(after.stateOf('air')).toBe('waning')
    expect(after.stateOf('earth')).toBe('inert')
    expect(after.stateOf('light')).toBe('inert')
    expect(after.stateOf('dark')).toBe('inert')
  })

  it('꺼진 원소는 그대로다 — 라운드가 지났다고 타오르지 않는다', () => {
    useRoundStore.getState().advance()
    for (const element of ELEMENTS) {
      expect(useElementStore.getState().stateOf(element.id)).toBe('inert')
    }
  })

  it('두 라운드를 넘기면 강한 것도 꺼진다', () => {
    useElementStore.getState().setState('fire', 'strong')
    useRoundStore.getState().advance()
    useRoundStore.getState().advance()
    expect(useElementStore.getState().stateOf('fire')).toBe('inert')
  })

  it('마지막 칸에서 멈춘다 — 넘어가지 않는다', () => {
    for (let i = 0; i < MAX_ROUND + 10; i += 1) useRoundStore.getState().advance()
    expect(useRoundStore.getState().round).toBe(MAX_ROUND)
  })

  /** 멈춘 뒤에도 계속 누르면 원소가 계속 내려가면 곤란하다. */
  it('마지막 칸에서는 원소도 건드리지 않는다', () => {
    for (let i = 0; i < MAX_ROUND; i += 1) useRoundStore.getState().advance()
    useElementStore.getState().setState('fire', 'strong')
    useRoundStore.getState().advance()
    expect(useElementStore.getState().stateOf('fire')).toBe('strong')
  })

  it('되돌리면 첫 라운드로 가되 원소는 건드리지 않는다', () => {
    useElementStore.getState().setState('fire', 'strong')
    useRoundStore.getState().reset()
    expect(useRoundStore.getState().round).toBe(FIRST_ROUND)
    expect(useElementStore.getState().stateOf('fire')).toBe('strong')
  })

  /** SPEC 5.2 — 도구 런타임은 메모리 전용이다. */
  it('저장소에 아무것도 쓰지 않는다', () => {
    const written: string[] = []
    const fake = {
      setItem: (k: string) => written.push(k),
      getItem: () => null,
      removeItem: () => {},
    }
    const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: fake })

    useRoundStore.getState().advance()

    if (original) Object.defineProperty(globalThis, 'localStorage', original)
    else Reflect.deleteProperty(globalThis, 'localStorage')

    expect(written).toEqual([])
  })
})

describe('안쪽 배치', () => {
  it('좁으면 이름표를 뺀다 — 숫자가 먼저다', () => {
    expect(computeRoundLayout({ width: 180, height: 180 }).showLabel).toBe(true)
    expect(computeRoundLayout({ width: 180, height: 60 }).showLabel).toBe(false)
  })

  it('숫자 창이 상자 안에 들어온다', () => {
    for (const box of [
      { width: 80, height: 80 },
      { width: 180, height: 180 },
      { width: 400, height: 120 },
      { width: 120, height: 400 },
    ]) {
      const l = computeRoundLayout(box)
      // 띠 창은 글자 크기와 같다(NumberReel.css).
      expect(l.numberSize).toBeLessThanOrEqual(box.height + 1e-9)
    }
  })

  it('넓이가 0이면 조용히 0을 낸다', () => {
    for (const bad of [
      { width: 0, height: 100 },
      { width: 100, height: 0 },
      { width: Number.NaN, height: 100 },
    ]) {
      expect(() => computeRoundLayout(bad)).not.toThrow()
      expect(computeRoundLayout(bad).numberSize).toBe(0)
    }
  })
})
