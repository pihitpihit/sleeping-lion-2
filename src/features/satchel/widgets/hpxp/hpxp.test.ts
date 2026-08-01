import { beforeEach, describe, expect, it } from 'vitest'
import {
  clampValue,
  computeHpXpLayout,
  DRAG_STEP_PX,
  isHpXpSizeAllowed,
  MAX_VALUE,
  MIN_VALUE,
  step,
  stepsFromDrag,
  toLocalDelta,
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

  it('표식이 반쪽 안에 들어온다', () => {
    for (const box of [
      { width: 760, height: 170 },
      { width: 360, height: 170 },
      { width: 190, height: 84 },
      { width: 170, height: 760 },
      { width: 84, height: 190 },
      { width: 300, height: 300 },
    ]) {
      const l = computeHpXpLayout(box)
      const halfW = l.orientation === 'side-by-side' ? box.width / 2 : box.width
      const halfH = l.orientation === 'side-by-side' ? box.height : box.height / 2
      expect(l.markSize).toBeLessThanOrEqual(Math.min(halfW, halfH) + 1e-9)
    }
  })

  it('숫자가 표식보다 작다', () => {
    for (const box of [
      { width: 760, height: 170 },
      { width: 190, height: 84 },
      { width: 84, height: 190 },
    ]) {
      const l = computeHpXpLayout(box)
      expect(l.numberSize).toBeLessThan(l.markSize)
    }
  })

  it('넓이가 0이면 조용히 0을 낸다', () => {
    for (const bad of [
      { width: 0, height: 100 },
      { width: 100, height: 0 },
      { width: Number.NaN, height: 100 },
    ]) {
      expect(() => computeHpXpLayout(bad)).not.toThrow()
      expect(computeHpXpLayout(bad).markSize).toBe(0)
      expect(computeHpXpLayout(bad).numberSize).toBe(0)
    }
  })
})

/**
 * 회전은 눈으로 확인하기 어렵다 — 돌려 앉아 봐야 알고, 반대로 움직여도 '그런가
 * 보다' 하게 된다. 표로 못 박는다.
 */
describe('손가락 이동을 위젯 안쪽 좌표로 돌린다', () => {
  it('돌리지 않았으면 그대로다', () => {
    expect(toLocalDelta(3, -7, 0)).toEqual({ dx: 3, dy: -7 })
  })

  it('180도면 위아래·좌우가 뒤집힌다', () => {
    // 마주 앉은 사람이 제 기준 위로 끄는 것은 화면에서는 아래로다.
    expect(toLocalDelta(0, 10, 180)).toEqual({ dx: 0, dy: -10 })
    expect(toLocalDelta(5, 0, 180)).toEqual({ dx: -5, dy: 0 })
  })

  it('90도면 화면의 아래가 안쪽의 오른쪽이 된다', () => {
    // 내용이 시계 방향으로 90도 돌았으므로, 안쪽의 +x가 화면의 +y로 나온다.
    expect(toLocalDelta(0, 10, 90)).toEqual({ dx: 10, dy: 0 })
    expect(toLocalDelta(10, 0, 90)).toEqual({ dx: 0, dy: -10 })
  })

  it('270도는 90도의 반대다', () => {
    expect(toLocalDelta(0, 10, 270)).toEqual({ dx: -10, dy: 0 })
  })

  it('네 방향 모두 길이를 지킨다', () => {
    for (const r of [0, 90, 180, 270]) {
      const { dx, dy } = toLocalDelta(3, 4, r)
      expect(Math.hypot(dx, dy)).toBeCloseTo(5, 9)
    }
  })
})

describe('끈 거리에서 칸 수', () => {
  it('위로 끌면 늘고 아래로 끌면 준다', () => {
    expect(stepsFromDrag(-DRAG_STEP_PX)).toBe(1)
    expect(stepsFromDrag(DRAG_STEP_PX)).toBe(-1)
    expect(stepsFromDrag(-DRAG_STEP_PX * 3)).toBe(3)
  })

  it('한 칸이 안 되면 움직이지 않는다', () => {
    expect(stepsFromDrag(0)).toBe(0)
    expect(stepsFromDrag(-DRAG_STEP_PX + 1)).toBe(0)
    expect(stepsFromDrag(DRAG_STEP_PX - 1)).toBe(0)
  })

  /** 0에서 대칭이어야 한다. 반올림을 쓰면 위아래가 한 칸씩 어긋난다. */
  it('올릴 때와 내릴 때의 문턱이 같다', () => {
    for (let px = 1; px < DRAG_STEP_PX * 4; px += 1) {
      // 대칭을 곧게 적는다. `-stepsFromDrag(px)`로 비교하면 0일 때 `-0`이 나와
      // Object.is에서 갈린다 — 시험이 만들어낸 함정이지 코드의 문제가 아니다.
      expect(stepsFromDrag(-px) + stepsFromDrag(px)).toBe(0)
    }
  })

  it('이상한 값에도 0을 낸다', () => {
    expect(stepsFromDrag(Number.NaN)).toBe(0)
    expect(stepsFromDrag(10, 0)).toBe(0)
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
