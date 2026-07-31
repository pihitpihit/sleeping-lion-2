import { describe, expect, it } from 'vitest'
import { HOME_ROUTE, readRoute } from './routes'

describe('readRoute', () => {
  it('빈 해시는 웰컴이다', () => {
    expect(readRoute('')).toBe(HOME_ROUTE)
    expect(readRoute('#')).toBe(HOME_ROUTE)
    expect(readRoute('#/')).toBe(HOME_ROUTE)
  })

  it('등록된 경로를 읽는다', () => {
    expect(readRoute('#/notice')).toBe('/notice')
    expect(readRoute('#/satchel')).toBe('/satchel')
  })

  it('알 수 없는 경로는 웰컴으로 되돌린다', () => {
    expect(readRoute('#/없는경로')).toBe(HOME_ROUTE)
    expect(readRoute('#/notice/더깊은곳')).toBe(HOME_ROUTE)
  })

  // 실제로 한 번 터졌던 버그다. 고지 페이지의 MIT 전문 링크(#mit-license)를 누르면
  // 라우트가 '/'로 떨어져 웰컴 페이지로 튕겼다.
  it('페이지 내 앵커는 라우트가 아니다', () => {
    expect(readRoute('#mit-license')).toBeNull()
    expect(readRoute('#section-2')).toBeNull()
  })
})
