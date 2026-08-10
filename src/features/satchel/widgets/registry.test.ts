import { describe, expect, it } from 'vitest'
import {
  getWidgetDefinition,
  isKnownWidget,
  minSizeOf,
  validateDefinition,
  widgetDefinitions,
} from './registry'
import type { WidgetDefinition } from './types'

const STUB = {
  id: 'x',
  name: 'X',
  defaultSize: { w: 2, h: 2 },
  minSize: { w: 1, h: 1 },
  Component: () => null,
} satisfies WidgetDefinition

describe('레지스트리', () => {
  it('채택 도구가 등록돼 있다', () => {
    for (const id of ['elements', 'deck', 'hpxp', 'round', 'gold']) {
      expect(isKnownWidget(id), id).toBe(true)
    }
  })

  it('개발용 Test 위젯은 걷어냈다', () => {
    // 도구 띠에 쓸 일 없는 것이 섞여 있으면 고르는 데 방해만 된다.
    expect(isKnownWidget('test')).toBe(false)
  })

  it('골드 카운터는 한 칸에서 크지 않는다', () => {
    const gold = getWidgetDefinition('gold')
    expect(gold?.defaultSize).toEqual({ w: 1, h: 1 })
    expect(gold?.maxSize).toEqual({ w: 1, h: 1 })
    // 파생 경로로도 다른 크기가 새어 들지 않게 훅이 함께 막는다.
    expect(gold?.isSizeAllowed?.({ w: 2, h: 1 }, undefined)).toBe(false)
  })

  it('모르는 id는 undefined', () => {
    expect(getWidgetDefinition('없음')).toBeUndefined()
    expect(isKnownWidget('없음')).toBe(false)
  })

  it('모르는 위젯의 최소 크기는 1x1로 본다', () => {
    expect(minSizeOf('없음')).toEqual({ w: 1, h: 1 })
  })

  it('등록된 정의가 모두 앞뒤가 맞는다', () => {
    for (const definition of widgetDefinitions) {
      expect(validateDefinition(definition), definition.id).toBeNull()
    }
  })
})

describe('validateDefinition', () => {
  it('기본 크기가 최소보다 작으면 잡는다', () => {
    const bad = { ...STUB, defaultSize: { w: 1, h: 1 }, minSize: { w: 2, h: 2 } }
    expect(validateDefinition(bad)).toMatch(/기본 크기/)
  })

  it('최대 크기가 기본보다 작으면 잡는다', () => {
    expect(validateDefinition({ ...STUB, maxSize: { w: 1, h: 1 } })).toMatch(/최대 크기/)
  })

  it('최소 크기가 1보다 작으면 잡는다', () => {
    expect(validateDefinition({ ...STUB, minSize: { w: 0, h: 1 } })).toMatch(/최소 크기/)
  })
})
