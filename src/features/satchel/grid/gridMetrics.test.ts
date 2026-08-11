import { describe, expect, it } from 'vitest'
import { computeGridMetrics, EMPTY_METRICS, GRID_GAP, spanOf } from './gridMetrics'

/** 실제 기기의 보드 크기(툴바를 뺀 값, M1에서 실측). */
const DEVICES = [
  { name: 'iPhone SE', width: 375, height: 603 },
  { name: 'iPhone 15', width: 393, height: 788 },
  // 아이폰 15 Pro에서 화면 아래가 통째로 비어 있다는 지적을 받은 크기다.
  { name: 'iPhone 15 Pro', width: 393, height: 634 },
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

  /*
    화면을 잘 쓰는지 재는 자리다.

    셀 크기를 폭에서만 뽑고 행을 내림하면 남는 높이가 최대 한 칸 가까이 버려지고,
    그 구멍이 화면 아래에 통째로 남는다. 실제로 아이폰 15 Pro에서 화면의 6분의
    1이 그렇게 비었다.
  */
  it('세로로 남는 공간은 되찾는다 — 셀 하한에 걸릴 때만 남긴다', () => {
    for (const device of DEVICES) {
      const m = computeGridMetrics(device)
      const leftover = device.height - spanOf(m.rows, m.cellSize, m.gap)
      /*
        남는 띠가 간격 한 칸보다 얇으면 칸 사이의 틈과 구별되지 않는다. 위아래
        최소 여백(8+8)까지 더한 만큼은 봐준다.

        2026-08-10에 여기 기준을 **반 칸에서 간격 한 칸으로** 좁혔다. 반 칸으로는
        아이폰 15 Pro의 여덟째 줄이 막혔다 — 남은 높이가 16px이라 반 칸(42px)에
        못 미쳤는데, 셀은 74px로 하한을 넘겼는데도 그랬다.
      */
      if (leftover <= GRID_GAP + 16) continue

      // 남았는데 못 채웠다면, 행을 하나 더 넣을 때 셀이 하한 밑으로
      // 떨어지는 경우뿐이어야 한다. 가로로 누운 폰이 그렇다 — 높이가 애초에
      // 모자라 더 채우려면 글자가 뭉갠다.
      const denser = m.rows + 1
      const cellForDenser = Math.floor((device.height - 16 - (denser - 1) * m.gap) / denser)
      expect(
        cellForDenser,
        `${device.name} (${m.rows}행 × ${m.cellSize}px): ${leftover}px를 버렸는데 더 넣을 수 있었다`,
      ).toBeLessThan(72)
    }
  })

  /*
    형님이 짚은 자리다 — "아이폰 15 Pro 기준 세로 7개가 되는데 8개까지 가능하지
    않을까". 되찾기 기준이 반 칸이던 시절에는 7행에서 멎었다.
  */
  it('아이폰 15 Pro의 세로 여덟 줄을 지킨다', () => {
    // 상단 띠(60)와 안전영역(위 59·아래 34)을 뺀 보드 크기.
    const m = computeGridMetrics({ width: 393, height: 852 - 60 - 59 - 34 })
    expect(m.columns).toBe(4)
    expect(m.rows).toBe(8)
    // 여덟 줄을 얻으려고 셀을 하한 밑으로 떨어뜨리지는 않았다.
    expect(m.cellSize).toBeGreaterThanOrEqual(72)
  })

  /*
    반대쪽 한계도 못박는다. 조건을 아예 걷어내면 15 Pro Max가 아홉 줄까지 가면서
    셀이 74px로 주저앉는데, 그 화면은 여덟 줄에 84px로 딱 맞는다 — **목표 크기에
    가까운 쪽이 낫다.**
  */
  it('되찾기가 목표 크기를 지나쳐 짜내지 않는다', () => {
    const m = computeGridMetrics({ width: 430, height: 932 - 60 - 59 - 34 })
    expect(m.rows).toBe(8)
    expect(m.cellSize).toBeGreaterThanOrEqual(80)
  })

  it('좁고 높은 폰에서도 격자가 화면을 채운다', () => {
    // 되찾기가 없을 때 6행에 머물던 크기다.
    const m = computeGridMetrics({ width: 393, height: 634 })
    expect(m.rows).toBeGreaterThanOrEqual(7)
    expect(m.cellSize).toBeGreaterThanOrEqual(72)
  })

  it('행을 늘리려고 셀을 하한 밑으로 줄이지는 않는다', () => {
    for (let height = 200; height <= 1400; height += 7) {
      const m = computeGridMetrics({ width: 393, height })
      if (m.rows > 1) {
        expect(m.cellSize, `높이 ${height}`).toBeGreaterThanOrEqual(72)
      }
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
