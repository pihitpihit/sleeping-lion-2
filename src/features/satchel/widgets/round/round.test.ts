import { beforeEach, describe, expect, it } from 'vitest'
import { averageLap, computeRoundLayout, elapsedMs, formatDuration } from './round'
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
    useRoundStore.getState().restart()
    /*
      **시계를 걸어야 라운드가 넘어간다**(2026-09-11). 시계가 안 도는데 라운드만
      올라가면 그 라운드의 기록이 통째로 비고, 무엇이 빠졌는지 나중에 알 수 없다.
    */
    useRoundStore.getState().start(0)
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

  /**
   * 새 시나리오를 펴면 라운드 표식이 1로 가고 원소판도 비어 있다. 라운드만
   * 1인데 불이 타오르고 있으면 어느 것이 판의 상태인지 알 수 없다.
   */
  it('처음으로 되돌리면 라운드와 원소가 함께 초기화된다', () => {
    useElementStore.getState().setState('fire', 'strong')
    useElementStore.getState().setState('ice', 'waning')
    useRoundStore.getState().advance()

    useRoundStore.getState().restart()

    expect(useRoundStore.getState().round).toBe(FIRST_ROUND)
    expect(useElementStore.getState().stateOf('fire')).toBe('inert')
    expect(useElementStore.getState().stateOf('ice')).toBe('inert')
  })

  it('마지막 칸까지 갔어도 처음으로 돌아온다', () => {
    for (let i = 0; i < MAX_ROUND; i += 1) useRoundStore.getState().advance()
    expect(useRoundStore.getState().round).toBe(MAX_ROUND)
    useRoundStore.getState().restart()
    expect(useRoundStore.getState().round).toBe(FIRST_ROUND)
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

/**
 * 삼각형 안에 아이콘을 넣는 일이라 눈으로는 "대충 맞네"까지밖에 못 본다.
 * 빗변을 넘는지는 셈으로 확인한다.
 */
describe('잘린 귀퉁이', () => {
  const boxes = [
    { width: 80, height: 80 },
    { width: 180, height: 180 },
    { width: 400, height: 120 },
    { width: 120, height: 400 },
    { width: 700, height: 700 },
  ]

  it('손끝으로 짚을 만한 크기에서 멈춘다', () => {
    for (const box of boxes) {
      const l = computeRoundLayout(box)
      expect(l.cutSize).toBeGreaterThanOrEqual(34)
      expect(l.cutSize).toBeLessThanOrEqual(56)
    }
  })

  /**
   * 직각삼각형의 두 변이 `L`이면 빗변은 `x + y = L`이다. 아이콘 가운데가
   * `(0.3L, 0.3L)`(CSS의 30%)이므로 오른쪽 아래 모서리는 `0.6L + s`다.
   */
  it('아이콘이 빗변을 넘지 않는다', () => {
    for (const box of boxes) {
      const l = computeRoundLayout(box)
      const corner = 0.6 * l.cutSize + l.cutIconSize
      expect(corner).toBeLessThanOrEqual(l.cutSize)
    }
  })

  it('아이콘이 삼각형보다 크지 않다', () => {
    for (const box of boxes) {
      const l = computeRoundLayout(box)
      expect(l.cutIconSize).toBeGreaterThan(0)
      expect(l.cutIconSize).toBeLessThan(l.cutSize)
    }
  })

  it('넓이가 0이면 귀퉁이도 0이다', () => {
    const l = computeRoundLayout({ width: 0, height: 100 })
    expect(l.cutSize).toBe(0)
    expect(l.cutIconSize).toBe(0)
  })
})

describe('라운드에 걸린 시간', () => {
  describe('formatDuration', () => {
    it('밀리초를 mm:ss로 적는다', () => {
      expect(formatDuration(0)).toBe('00:00')
      expect(formatDuration(1000)).toBe('00:01')
      expect(formatDuration(61_000)).toBe('01:01')
      expect(formatDuration(10 * 60_000 + 7_000)).toBe('10:07')
    })

    it('내림이다 — 아직 안 지난 분이 지난 것으로 읽히면 안 된다', () => {
      expect(formatDuration(59_900)).toBe('00:59')
      expect(formatDuration(119_999)).toBe('01:59')
    })

    it('모양이 아닌 값과 음수는 00:00으로 본다', () => {
      expect(formatDuration(-5)).toBe('00:00')
      expect(formatDuration(Number.NaN)).toBe('00:00')
    })

    it('한 시간을 넘으면 분이 60을 넘는다 — 막지 않는다', () => {
      expect(formatDuration(65 * 60_000)).toBe('65:00')
    })
  })

  describe('elapsedMs', () => {
    it('시작 전에는 0이다', () => {
      expect(elapsedMs(null, 1000)).toBe(0)
    })

    it('시작한 뒤로 흐른 만큼이다', () => {
      expect(elapsedMs(1000, 4000)).toBe(3000)
    })

    it('거꾸로 가는 것은 0으로 본다 — 남의 기기 시계가 어긋날 수 있다', () => {
      expect(elapsedMs(9000, 1000)).toBe(0)
    })
  })

  describe('averageLap', () => {
    it('기록이 없으면 모른다고 한다', () => {
      expect(averageLap([])).toBeNull()
    })

    it('기록된 것들의 평균이다', () => {
      expect(averageLap([1000, 3000])).toBe(2000)
    })

    it('모양이 아닌 값은 셈에서 뺀다', () => {
      expect(averageLap([1000, Number.NaN, -5, 3000])).toBe(2000)
    })
  })
})

describe('시계는 눌러야 돈다', () => {
  beforeEach(() => {
    useRoundStore.getState().restart()
  })

  it('새 판은 시작 전이다 — 위젯을 놓자마자 시간이 흐르면 안 된다', () => {
    expect(useRoundStore.getState().startedAt).toBeNull()
    expect(useRoundStore.getState().laps).toEqual([])
  })

  it('시작 전에는 라운드가 안 넘어간다 — 기록이 빈 라운드가 생기면 안 된다', () => {
    useRoundStore.getState().advance(1000)
    expect(useRoundStore.getState().round).toBe(FIRST_ROUND)
  })

  it('두 번 눌러도 처음으로 돌아가지 않는다', () => {
    useRoundStore.getState().start(1000)
    useRoundStore.getState().start(9000)
    expect(useRoundStore.getState().startedAt).toBe(1000)
  })

  it('넘길 때마다 걸린 시간이 한 칸씩 쌓이고 시계가 다시 걸린다', () => {
    useRoundStore.getState().start(1000)
    useRoundStore.getState().advance(4000)
    expect(useRoundStore.getState().laps).toEqual([3000])
    expect(useRoundStore.getState().startedAt).toBe(4000)

    useRoundStore.getState().advance(10_000)
    expect(useRoundStore.getState().laps).toEqual([3000, 6000])
  })

  it('처음으로 되돌리면 시계와 기록도 함께 내려간다', () => {
    useRoundStore.getState().start(1000)
    useRoundStore.getState().advance(4000)
    useRoundStore.getState().restart()
    expect(useRoundStore.getState().startedAt).toBeNull()
    expect(useRoundStore.getState().laps).toEqual([])
  })

  it('앉힐 때 모양이 아닌 것은 버린다 — 남의 기기에서 온 값이다', () => {
    useRoundStore.getState().hydrate(3, 0, [1000, Number.NaN, -5] as number[])
    expect(useRoundStore.getState().startedAt).toBeNull()
    expect(useRoundStore.getState().laps).toEqual([1000])
  })
})

describe('시계 자리', () => {
  /*
    **한 칸짜리에도 낸다**(2026-09-11, 형님이 정했다). 문턱을 두었더니 큰 위젯
    에서만 시간이 보였다 — `mm:ss`는 다섯 글자지만 Pirata의 숫자는 진폭이 좁아
    한 칸 폭에서도 들어간다.
  */
  const CELL = { w: 85, h: 77 }

  it('한 칸짜리에도 시계가 선다', () => {
    expect(computeRoundLayout({ width: CELL.w, height: CELL.h }).showTimer).toBe(true)
  })

  it('가로가 한 칸이어도, 세로가 한 칸이어도 선다', () => {
    expect(computeRoundLayout({ width: CELL.w, height: CELL.h * 2 }).showTimer).toBe(true)
    expect(computeRoundLayout({ width: CELL.w * 2, height: CELL.h }).showTimer).toBe(true)
  })

  it('점처럼 남지 않는다 — 한 칸에서도 10px은 넘는다', () => {
    expect(computeRoundLayout({ width: CELL.w, height: CELL.h }).timerSize).toBeGreaterThan(10)
  })

  /*
    **줄이 늘어난 만큼 세로를 다시 나눈다.** 다 더한 높이가 상자를 넘으면 아래가
    잘린다 — 사이(`gap`)가 숫자 크기에 비례하므로 그것까지 세어야 한다.
  */
  it.each([
    ['한 칸', 85, 77],
    ['가로 두 칸', 178, 77],
    ['세로 두 칸', 85, 162],
    ['두 칸', 178, 162],
    ['세 칸 폭', 271, 162],
  ])('%s에서 안 넘친다', (_label, width, height) => {
    const L = computeRoundLayout({ width, height })
    const rows = 1 + (L.showLabel ? 1 : 0) + (L.showTimer ? 1 : 0)
    const gap = L.numberSize * 0.15 * (rows - 1)
    const padding = height * 0.04
    const used =
      L.numberSize +
      (L.showLabel ? L.labelSize : 0) +
      (L.showTimer ? L.timerSize : 0) +
      gap +
      padding
    expect(used).toBeLessThanOrEqual(height)
  })
})
