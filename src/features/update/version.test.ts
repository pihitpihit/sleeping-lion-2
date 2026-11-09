import { describe, expect, it } from 'vitest'
import { freshUrl, newVersionOf } from './version'

describe('newVersionOf', () => {
  it('다르면 새 버전이다', () => {
    expect(newVersionOf('abc1234', { version: 'def5678' })).toBe('def5678')
  })

  it('같으면 아니다', () => {
    expect(newVersionOf('abc1234', { version: 'abc1234' })).toBeNull()
  })

  it('로컬 빌드는 견주지 않는다 — 늘 다르다고 뜨면 귀찮다', () => {
    expect(newVersionOf('dev', { version: 'def5678' })).toBeNull()
    expect(newVersionOf('abc1234', { version: 'dev' })).toBeNull()
  })

  it('모양이 틀리면 새 버전이 아니다 — 엉뚱한 응답에 단추를 띄우지 않는다', () => {
    expect(newVersionOf('abc1234', null)).toBeNull()
    expect(newVersionOf('abc1234', '<html>')).toBeNull()
    expect(newVersionOf('abc1234', { version: 3 })).toBeNull()
    expect(newVersionOf('abc1234', { version: '' })).toBeNull()
  })
})

describe('freshUrl', () => {
  it('물음표 뒤에 버전을 붙이고 보던 화면(#)은 그대로 둔다', () => {
    expect(freshUrl('/sleeping-lion-2/', '#/satchel', 'def5678')).toBe(
      '/sleeping-lion-2/?v=def5678#/satchel',
    )
  })
})
