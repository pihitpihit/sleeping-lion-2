import { describe, expect, it } from 'vitest'
import { fold } from './searchFold'

describe('fold', () => {
  it('공백은 통째로 빠진다 — 줄이는 것이 아니라 없앤다', () => {
    expect(fold('가죽 장화')).toBe(fold('가죽장화'))
    expect(fold('  가죽   장화  ')).toBe(fold('가죽장화'))
  })

  it('대소문자를 안 가린다', () => {
    expect(fold('Boots')).toBe(fold('boots'))
  })

  it('자모가 갈려 온 한글도 같게 본다 — 맥에서 친 것이 그렇다', () => {
    const nfd = '가죽'.normalize('NFD')
    expect(nfd).not.toBe('가죽')
    expect(fold(nfd)).toBe(fold('가죽'))
  })

  it('다른 물건은 여전히 다르다', () => {
    expect(fold('가죽 장화')).not.toBe(fold('가죽 갑옷'))
  })
})
