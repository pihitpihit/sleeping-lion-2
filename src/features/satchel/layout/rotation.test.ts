import { describe, expect, it } from 'vitest'
import { ROTATIONS, isRotation, nextRotation, swapsAxes, type Rotation } from './types'
import { loadSettings, storageKeyFor, type StorageLike } from './storage'

function storageWith(value: unknown): StorageLike {
  const raw = typeof value === 'string' ? value : JSON.stringify(value)
  return { getItem: (key) => (key === storageKeyFor(null) ? raw : null), setItem: () => {} }
}

describe('nextRotation', () => {
  it('시계 방향으로 한 칸씩 돌고 제자리로 온다', () => {
    expect(nextRotation(0)).toBe(90)
    expect(nextRotation(90)).toBe(180)
    expect(nextRotation(180)).toBe(270)
    expect(nextRotation(270)).toBe(0)
  })

  it('네 번 누르면 원래대로', () => {
    let r: Rotation = 0
    for (let i = 0; i < 4; i += 1) r = nextRotation(r)
    expect(r).toBe(0)
  })

  it('어느 값에서 시작해도 네 방향을 모두 지난다', () => {
    for (const start of ROTATIONS) {
      const seen = new Set<Rotation>()
      let r = start
      for (let i = 0; i < 4; i += 1) {
        seen.add(r)
        r = nextRotation(r)
      }
      expect(seen.size).toBe(4)
    }
  })
})

describe('swapsAxes', () => {
  /** 90·270도에서는 가로세로를 바꿔 그린 뒤 돌려야 원래 칸을 정확히 채운다. */
  it('90·270도에서만 축이 바뀐다', () => {
    expect(swapsAxes(0)).toBe(false)
    expect(swapsAxes(180)).toBe(false)
    expect(swapsAxes(90)).toBe(true)
    expect(swapsAxes(270)).toBe(true)
  })
})

describe('isRotation', () => {
  it('90도 단위만 받는다', () => {
    for (const good of ROTATIONS) expect(isRotation(good)).toBe(true)
    for (const bad of [45, 1, 360, -90, '90', null, undefined, Number.NaN, {}]) {
      expect(isRotation(bad)).toBe(false)
    }
  })
})

describe('저장된 회전 읽기', () => {
  it('없으면 빈 것으로 시작한다 — 옛 저장분과도 맞는다', () => {
    const old = { version: 1, layouts: {}, toolbarPosition: 'auto', showWidgetTitles: true }
    expect(loadSettings(null, storageWith(old)).widgetRotations).toEqual({})
  })

  it('90도 단위만 살리고 나머지는 버린다', () => {
    const stored = {
      version: 1,
      layouts: {},
      widgetRotations: { a: 90, b: 45, c: 180, d: '270', e: null, f: 0 },
    }
    expect(loadSettings(null, storageWith(stored)).widgetRotations).toEqual({ a: 90, c: 180, f: 0 })
  })

  it('회전이 객체가 아니어도 나머지 설정은 살아남는다', () => {
    const stored = { version: 1, layouts: {}, showWidgetTitles: false, widgetRotations: 'ㅋ' }
    const settings = loadSettings(null, storageWith(stored))
    expect(settings.widgetRotations).toEqual({})
    expect(settings.showWidgetTitles).toBe(false)
  })
})
