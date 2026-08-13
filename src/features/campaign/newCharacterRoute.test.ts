import { describe, expect, it } from 'vitest'
import { LAZY_ROUTES, readRoute, routeKey } from '../../routes'

/**
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ **`/character/new`는 `/character`의 뒷자리가 아니라 다른 화면이다.**       │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * 앞머리만 보면 캐릭터 한 장짜리 화면이 `new`를 id로 알아듣고 **빈 화면**을 낸다.
 * 그래서 `routeKey`가 정확히 맞는 것을 앞머리보다 먼저 본다.
 */
describe('캐릭터 생성 주소', () => {
  it('생성 화면으로 간다', () => {
    expect(readRoute('#/character/new')).toBe('/character/new')
    expect(routeKey('/character/new')).toBe('/character/new')
    expect(LAZY_ROUTES['/character/new']).toBeDefined()
  })

  it('캐릭터 한 장은 그대로 앞머리로 찾는다', () => {
    expect(routeKey('/character/8f1c-abcd')).toBe('/character')
    expect(readRoute('#/character/8f1c-abcd')).toBe('/character/8f1c-abcd')
  })
})
