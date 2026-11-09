import { describe, expect, it } from 'vitest'
import {
  MAP_FILE,
  clampZoom,
  isMapFile,
  placement,
  stepZoom,
  stickerFile,
  stickersFor,
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
})
