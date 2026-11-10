import { describe, expect, it } from 'vitest'
import {
  MAP_FILE,
  arrowPath,
  clampZoom,
  fitZoom,
  isMapFile,
  placement,
  spreadTags,
  stepZoom,
  stickerFile,
  stickersFor,
  tagSpot,
} from './worldMapSpots'

/*
  **닫힌 것에는 아무것도 안 붙인다** — 실물 지도도 해금 전에는 인쇄된 동그라미뿐이다.
  번호와 좌표는 지어낸 것이다(구현 결정 532).
*/

const spot = { x: 100, y: 50, w: 20, h: 10 }
const list = [
  { no: 201, grid: '', name: '가', map: spot },
  { no: 202, grid: '', name: '나', map: spot },
  { no: 203, grid: '', name: '다', map: spot },
  { no: 204, grid: '', name: '라', map: null },
  { no: 205, grid: '', name: '마', map: spot },
]

describe('stickersFor', () => {
  it('열림·완료·막힘만 붙이고 닫힌 것과 자리 모르는 것은 뺀다', () => {
    const got = stickersFor(list, { 201: 'open', 202: 'done', 203: 'blocked', 204: 'open' })
    expect(got.map((s) => [s.no, s.state])).toEqual([
      [201, 'open'],
      [202, 'done'],
      [203, 'blocked'],
    ])
  })
})

describe('placement', () => {
  it('픽셀을 지도 크기에 대한 %로 옮긴다', () => {
    expect(placement(spot, 1000, 500)).toEqual({
      left: '10%',
      top: '10%',
      width: '2%',
      height: '2%',
    })
  })
})

describe('그림 이름', () => {
  it('스티커는 세 자리로 채운다', () => {
    expect(stickerFile(7)).toBe('gh-007.webp')
    expect(stickerFile(95)).toBe('gh-095.webp')
  })

  it('정해진 꼴이 아닌 것은 받지 않는다', () => {
    expect(isMapFile(MAP_FILE)).toBe(true)
    expect(isMapFile('gh-001.webp')).toBe(true)
    expect(isMapFile('gh-1.webp')).toBe(false)
    expect(isMapFile('gh-001.png')).toBe(false)
    expect(isMapFile('photo.webp')).toBe(false)
  })
})

describe('배율', () => {
  it('단추는 다음 단계로, 사이 값이면 가까운 쪽 단계로 간다', () => {
    expect(stepZoom(1, 1)).toBe(1.5)
    expect(stepZoom(1.7, 1)).toBe(2)
    expect(stepZoom(1.7, -1)).toBe(1.5)
    expect(stepZoom(4, 1)).toBe(4)
    expect(stepZoom(1, -1)).toBe(1)
  })

  it('벌린 만큼 키우되 단계 밖으로는 안 나간다', () => {
    expect(clampZoom(0.5)).toBe(1)
    expect(clampZoom(2.3)).toBe(2.3)
    expect(clampZoom(9)).toBe(4)
  })

  it('바닥을 넘기면 그 아래로 오므릴 수 있다', () => {
    expect(clampZoom(0.5, 0.4)).toBe(0.5)
    expect(clampZoom(0.2, 0.4)).toBe(0.4)
  })

  it('통째로 드는 배율은 덮는 폭과 드는 폭의 비다', () => {
    // 2:1 그림을 1:2 화면에 — 덮으면 폭 400, 들이면 폭 100.
    expect(fitZoom({ w: 100, h: 200 }, { w: 400, h: 200 })).toBe(0.25)
    // 화면이 더 납작하면 반대쪽이 병목이다 — 덮으면 400, 들이면 100(높이 50에 맞춰).
    expect(fitZoom({ w: 400, h: 50 }, { w: 200, h: 100 })).toBe(0.25)
    // 비가 같으면 줄일 것이 없다.
    expect(fitZoom({ w: 300, h: 150 }, { w: 200, h: 100 })).toBe(1)
  })
})

describe('arrowPath', () => {
  it('가는 쪽의 왼편으로 휘고, 양끝은 휜 방향으로 짧은 변의 절반만큼 물린다', () => {
    // 가운데 (10, 10) → (210, 10), 반지름 10씩. 휨은 길이의 12% = 24 → 조절점 (110, −14).
    const d = arrowPath({ x: 0, y: 0, w: 20, h: 20 }, { x: 200, y: 0, w: 20, h: 20 })
    expect(d).toBe('M19.7 7.7Q110 -14 200.3 7.7')
  })

  it('붙어 있는 둘 사이에도 길이 남는다 — 위로 넘어가는 아치가 된다', () => {
    // 가운데 사이 20인데 반지름 합도 20 — 곧게 물리면 남는 것이 없다.
    const d = arrowPath({ x: 0, y: 0, w: 20, h: 20 }, { x: 20, y: 0, w: 20, h: 20 })
    const [, sx, sy, , , ex, ey] = d.match(/M(\S+) (\S+)Q(\S+) (\S+) (\S+) (\S+)/)!.map(Number)
    expect(ex - sx).toBeGreaterThan(0)
    // 양끝이 스티커 위쪽 가장자리로 올라간다.
    expect(sy).toBeLessThan(10)
    expect(ey).toBeLessThan(10)
  })

  it('같은 자리면 긋지 않는다', () => {
    expect(arrowPath({ x: 0, y: 0, w: 20, h: 20 }, { x: 0, y: 0, w: 20, h: 20 })).toBe('')
  })
})

describe('tagSpot', () => {
  const view = { w: 400, h: 800 }
  const box = { left: 50, right: 350, top: 70, bottom: 700 }

  it('화면 안의 노드는 그 밑에 단다', () => {
    expect(tagSpot({ x: 200, y: 300 }, 40, view, box)).toEqual({ x: 200, y: 340, away: null })
  })

  it('화면 안이라도 테두리 가까이면 상자 안으로 당긴다', () => {
    expect(tagSpot({ x: 10, y: 790 }, 40, view, box)).toEqual({ x: 50, y: 700, away: null })
  })

  it('오른쪽 밖의 노드는 오른쪽 테두리에, 그쪽을 가리켜 단다', () => {
    const t = tagSpot({ x: 2000, y: 385 }, 40, view, box)
    expect(t.x).toBe(350)
    expect(t.y).toBeCloseTo(385)
    expect(t.away).toBeCloseTo(0)
  })

  it('위 밖의 노드는 위 테두리에 — 가운데에서 노드로 그은 선이 닿는 자리', () => {
    const t = tagSpot({ x: 200 + 315, y: 385 - 315 * 10 }, 40, view, box)
    expect(t.y).toBe(70)
    expect(t.x).toBeCloseTo(200 + 31.5)
    expect(t.away!).toBeLessThan(0)
  })

  it('출발점을 주면 거기서 그은 선을 따른다 — 화살표가 화면을 벗어나는 자리 가까이', () => {
    const t = tagSpot({ x: 2000, y: 100 }, 40, view, box, { x: 300, y: 100 })
    expect(t.x).toBe(350)
    expect(t.y).toBeCloseTo(100)
  })

  it('구석 밖이면 먼저 닿는 변에 선다', () => {
    const t = tagSpot({ x: -5000, y: 5000 }, 40, view, box)
    expect(t.x).toBe(50)
    expect(t.y).toBeLessThanOrEqual(700)
  })
})

describe('spreadTags', () => {
  const box = { left: 0, top: 0, right: 400, bottom: 800 }

  it('겹친 것만 아래로 민다', () => {
    const got = spreadTags(
      [
        { x: 100, y: 100, w: 80 },
        { x: 110, y: 105, w: 80 },
        { x: 300, y: 100, w: 80 },
      ],
      30,
      box,
    )
    expect(got.map((t) => t.y)).toEqual([100, 130, 100])
  })

  it('바닥을 넘으면 위로 민다', () => {
    const got = spreadTags(
      [
        { x: 100, y: 790, w: 80 },
        { x: 100, y: 790, w: 80 },
      ],
      30,
      box,
    )
    expect(got.map((t) => t.y)).toEqual([790, 760])
  })
})
