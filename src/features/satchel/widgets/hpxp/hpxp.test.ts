import { beforeEach, describe, expect, it } from 'vitest'
import {
  clampValue,
  computeHpXpLayout,
  isHpXpSizeAllowed,
  MAX_VALUE,
  MIN_VALUE,
  step,
} from './hpxp'
import { useHpXpStore } from './hpxpStore'

describe('값의 범위', () => {
  /** 실물 다이얼은 끝에서 더 돌아가지 않는다. 넘어가지 않고 멈춘다. */
  it('끝에서 멈춘다 — 넘어가지 않는다', () => {
    expect(step(MIN_VALUE, -1)).toBe(MIN_VALUE)
    expect(step(MAX_VALUE, 1)).toBe(MAX_VALUE)
    expect(step(MIN_VALUE, -99)).toBe(MIN_VALUE)
    expect(step(MAX_VALUE, 99)).toBe(MAX_VALUE)
  })

  it('한 칸씩 오르내린다', () => {
    expect(step(5, 1)).toBe(6)
    expect(step(5, -1)).toBe(4)
  })

  it('이상한 값은 바닥으로 되돌린다', () => {
    for (const bad of [Number.NaN, Infinity, -Infinity]) {
      expect(clampValue(bad)).toBe(MIN_VALUE)
    }
    expect(clampValue(-7)).toBe(MIN_VALUE)
    expect(clampValue(1000)).toBe(MAX_VALUE)
    expect(clampValue(3.6)).toBe(4)
  })
})

describe('놓을 수 있는 크기 — 긴 쪽 4칸, 짧은 쪽 2칸까지', () => {
  it('가로로 눕히든 세로로 세우든 같은 제한이다', () => {
    for (const [w, h] of [
      [4, 2],
      [2, 4],
      [4, 1],
      [1, 4],
      [3, 2],
      [2, 3],
      [2, 1],
      [1, 2],
      [2, 2],
    ]) {
      expect(isHpXpSizeAllowed({ w, h })).toBe(true)
    }
  })

  it('너무 크면 막는다', () => {
    for (const [w, h] of [
      [5, 2],
      [2, 5],
      [4, 3],
      [3, 4],
      [4, 4],
      [6, 2],
    ]) {
      expect(isHpXpSizeAllowed({ w, h })).toBe(false)
    }
  })

  /** 반쪽 둘에 숫자와 단추 둘씩을 담을 수 없다. */
  it('1×1은 막는다', () => {
    expect(isHpXpSizeAllowed({ w: 1, h: 1 })).toBe(false)
  })
})

describe('안쪽 배치', () => {
  it('가로로 길면 붉은 쪽이 왼쪽, 세로로 길면 위쪽이다', () => {
    expect(computeHpXpLayout({ width: 360, height: 170 }).orientation).toBe('side-by-side')
    expect(computeHpXpLayout({ width: 170, height: 360 }).orientation).toBe('stacked')
  })

  it('정사각형이면 가로로 눕힌다 — 실물이 그 모양이다', () => {
    expect(computeHpXpLayout({ width: 200, height: 200 }).orientation).toBe('side-by-side')
  })

  it('좁으면 표식을 뺀다 — 숫자가 먼저다', () => {
    expect(computeHpXpLayout({ width: 360, height: 170 }).showMarks).toBe(true)
    expect(computeHpXpLayout({ width: 170, height: 84 }).showMarks).toBe(false)
  })

  it('숫자와 단추가 반쪽 안에 들어온다', () => {
    for (const box of [
      { width: 360, height: 170 },
      { width: 170, height: 360 },
      { width: 180, height: 84 },
      { width: 84, height: 180 },
    ]) {
      const l = computeHpXpLayout(box)
      const halfW = l.orientation === 'side-by-side' ? box.width / 2 : box.width
      const halfH = l.orientation === 'side-by-side' ? box.height : box.height / 2
      const across = Math.min(halfW, halfH)
      expect(l.knobSize).toBeLessThanOrEqual(across + 1e-9)
      expect(l.numberSize).toBeLessThanOrEqual(across + 1e-9)
    }
  })

  it('넓이가 0이면 조용히 0을 낸다', () => {
    for (const bad of [
      { width: 0, height: 100 },
      { width: 100, height: 0 },
      { width: Number.NaN, height: 100 },
    ]) {
      expect(() => computeHpXpLayout(bad)).not.toThrow()
      expect(computeHpXpLayout(bad).numberSize).toBe(0)
    }
  })
})

/**
 * 원소 트래커와 **반대다.** 체력과 경험은 사람마다 다르므로 인스턴스가 값을
 * 따로 가진다. 합치도록 되돌리면 이 시험이 깨진다.
 */
describe('인스턴스마다 값을 따로 갖는다', () => {
  beforeEach(() => {
    useHpXpStore.getState().reset('갑')
    useHpXpStore.getState().reset('을')
  })

  it('건드리기 전에는 둘 다 0이다', () => {
    expect(useHpXpStore.getState().valuesOf('갑')).toEqual({ hp: 0, xp: 0 })
  })

  it('한쪽을 올려도 다른 쪽은 그대로다', () => {
    useHpXpStore.getState().adjust('갑', 'hp', 5)
    expect(useHpXpStore.getState().valuesOf('갑').hp).toBe(5)
    expect(useHpXpStore.getState().valuesOf('을').hp).toBe(0)
  })

  it('생명과 경험이 서로를 건드리지 않는다', () => {
    useHpXpStore.getState().adjust('갑', 'hp', 3)
    expect(useHpXpStore.getState().valuesOf('갑')).toEqual({ hp: 3, xp: 0 })
    useHpXpStore.getState().adjust('갑', 'xp', 2)
    expect(useHpXpStore.getState().valuesOf('갑')).toEqual({ hp: 3, xp: 2 })
  })

  it('스토어를 거쳐도 끝에서 멈춘다', () => {
    useHpXpStore.getState().adjust('갑', 'hp', -1)
    expect(useHpXpStore.getState().valuesOf('갑').hp).toBe(MIN_VALUE)
    for (let i = 0; i < MAX_VALUE + 5; i += 1) useHpXpStore.getState().adjust('갑', 'xp', 1)
    expect(useHpXpStore.getState().valuesOf('갑').xp).toBe(MAX_VALUE)
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

    useHpXpStore.getState().adjust('갑', 'hp', 1)

    if (original) Object.defineProperty(globalThis, 'localStorage', original)
    else Reflect.deleteProperty(globalThis, 'localStorage')

    expect(written).toEqual([])
  })
})

/**
 * 여백을 CSS와 계산이 따로 정했더니 내용이 반쪽 밖으로 넘쳐, 가운데서 두 `+`
 * 단추가 겹쳤다. 한쪽이 다른 쪽을 가려 눌리지 않았다. 이 시험이 그것을 잡는다.
 */
describe('한 줄에 늘어설 것이 반쪽 안에 들어온다', () => {
  const boxes = [
    { width: 760, height: 170 },
    { width: 380, height: 170 },
    { width: 190, height: 84 },
    { width: 170, height: 760 },
    { width: 170, height: 380 },
    { width: 84, height: 190 },
    { width: 360, height: 360 },
  ]

  it('표식·손잡이·창·손잡이와 틈의 합이 긴 변을 넘지 않는다', () => {
    for (const box of boxes) {
      const l = computeHpXpLayout(box)
      const halfW = l.orientation === 'side-by-side' ? box.width / 2 : box.width
      const halfH = l.orientation === 'side-by-side' ? box.height : box.height / 2
      const along = Math.max(halfW, halfH)

      const pieces = l.windowWidth + l.knobSize * 2 + (l.showMarks ? l.knobSize : 0)
      const gaps = l.gap * (l.showMarks ? 3 : 2)
      const used = pieces + gaps + l.padOuter + l.padInner

      expect(used).toBeLessThanOrEqual(along + 1e-6)
    }
  })

  it('숫자가 짧은 변 안에도 들어온다', () => {
    for (const box of boxes) {
      const l = computeHpXpLayout(box)
      const halfW = l.orientation === 'side-by-side' ? box.width / 2 : box.width
      const halfH = l.orientation === 'side-by-side' ? box.height : box.height / 2
      const across = Math.min(halfW, halfH)
      // 창 높이는 숫자의 1.5배다(CSS).
      expect(l.numberSize * 1.5).toBeLessThanOrEqual(across + 1e-6)
    }
  })
})
