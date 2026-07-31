import { describe, expect, it } from 'vitest'
import { computeGridMetrics, EMPTY_METRICS, GRID_GAP, spanOf } from './gridMetrics'

/** 실제 기기의 보드 크기(툴바를 뺀 값, M1에서 실측). */
const DEVICES = [
  { name: 'iPhone SE', width: 375, height: 603 },
  { name: 'iPhone 15', width: 393, height: 788 },
  { name: '갤럭시 S24', width: 360, height: 716 },
  { name: '폰 가로', width: 852, height: 329 },
  { name: 'iPad 세로', width: 820, height: 1116 },
  { name: 'iPad 가로', width: 1180, height: 756 },
  { name: '데스크톱', width: 1440, height: 836 },
]

describe('computeGridMetrics', () => {
  it('격자가 보드 폭에 정확히 들어맞는다', () => {
    for (const device of DEVICES) {
      const m = computeGridMetrics(device)
      const used = m.paddingX * 2 + spanOf(m.columns, m.cellSize, m.gap)
      expect(used, device.name).toBeCloseTo(device.width, 6)
    }
  })

  it('격자가 보드 높이 안에 들어온다', () => {
    for (const device of DEVICES) {
      const m = computeGridMetrics(device)
      const used = spanOf(m.rows, m.cellSize, m.gap)
      expect(used, device.name).toBeLessThanOrEqual(device.height)
      expect(m.paddingY, device.name).toBeGreaterThanOrEqual(0)
    }
  })

  // 요구사항은 '앱 아이콘 수준'의 격자다. 어느 기기에서든 셀이 그 범위를 벗어나면
  // 위젯이 휑하거나 잘게 부서진다.
  it('모든 기기에서 셀이 아이콘 크기 범위에 들어온다', () => {
    for (const device of DEVICES) {
      const m = computeGridMetrics(device)
      expect(m.cellSize, `${device.name} (${m.columns}열)`).toBeGreaterThanOrEqual(72)
      expect(m.cellSize, `${device.name} (${m.columns}열)`).toBeLessThanOrEqual(96)
    }
  })

  it('셀은 정사각형이고 정수다', () => {
    for (const device of DEVICES) {
      const m = computeGridMetrics(device)
      expect(Number.isInteger(m.cellSize), device.name).toBe(true)
    }
  })

  it('폭이 넓어질수록 열이 늘거나 유지된다', () => {
    let previous = 0
    for (let width = 320; width <= 2560; width += 20) {
      const { columns } = computeGridMetrics({ width, height: 800 })
      expect(columns).toBeGreaterThanOrEqual(previous)
      previous = columns
    }
  })

  it('열 수가 하한과 상한 안에 있다', () => {
    expect(computeGridMetrics({ width: 200, height: 800 }).columns).toBe(4)
    expect(computeGridMetrics({ width: 6000, height: 800 }).columns).toBe(16)
  })

  // 상한이 없으면 2560px 모니터에서 셀이 147px까지 부푼다.
  it('아주 넓은 보드에서도 셀이 커지지 않고 격자가 가운데 놓인다', () => {
    for (const width of [1600, 2560, 3840]) {
      const m = computeGridMetrics({ width, height: 1000 })
      expect(m.cellSize, `${width}px`).toBeLessThanOrEqual(96)
      // 좌우 여백이 같아야 가운데다
      const used = m.paddingX * 2 + spanOf(m.columns, m.cellSize, m.gap)
      expect(used, `${width}px`).toBeCloseTo(width, 6)
    }
    // 상한을 넘으면 여백이 눈에 띄게 커진다 — 격자가 가운데 묶였다는 뜻이다
    expect(computeGridMetrics({ width: 2560, height: 1000 }).paddingX).toBeGreaterThan(400)
  })

  // 가로 폰에서 툴바가 상단이면 실제로 생기는 상황이다.
  it('높이가 한 칸도 못 담으면 셀을 줄여서라도 1행을 낸다', () => {
    const m = computeGridMetrics({ width: 852, height: 90 })
    expect(m.rows).toBe(1)
    expect(spanOf(m.rows, m.cellSize, m.gap)).toBeLessThanOrEqual(90)
    expect(m.cellSize).toBeGreaterThan(0)
  })

  it('잴 수 없는 크기에서는 던지지 않고 빈 격자를 낸다', () => {
    for (const bad of [
      { width: 0, height: 0 },
      { width: -100, height: 500 },
      { width: 500, height: 0 },
      { width: Number.NaN, height: 500 },
      { width: 500, height: Number.POSITIVE_INFINITY },
      { width: 10, height: 10 }, // 최소 여백도 못 뺀다
    ]) {
      expect(() => computeGridMetrics(bad)).not.toThrow()
      expect(computeGridMetrics(bad)).toEqual(EMPTY_METRICS)
    }
  })

  it('간격은 상수 그대로다', () => {
    expect(computeGridMetrics({ width: 375, height: 603 }).gap).toBe(GRID_GAP)
  })
})

describe('spanOf', () => {
  it('셀 사이에만 간격이 들어간다', () => {
    expect(spanOf(1, 80, 12)).toBe(80)
    expect(spanOf(2, 80, 12)).toBe(172)
    expect(spanOf(3, 80, 12)).toBe(264)
  })

  it('0개는 0이다', () => {
    expect(spanOf(0, 80, 12)).toBe(0)
    expect(spanOf(-1, 80, 12)).toBe(0)
  })
})
