import { describe, expect, it } from 'vitest'
import { sanitizeAttackDeckSettings } from './widgets/deck/settings'
import { sanitizeHpXpSettings } from './widgets/hpxp/settings'
import { sanitizeCharacterId, slotKeyFor } from './roster'

/**
 * 값이 담기는 열쇠.
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ **여기가 틀리면 넷이 앉아도 아무것도 안 겹친다.**                         │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * 위젯 인스턴스 id는 기기마다 다르다. 그것을 열쇠로 쓰면 판을 나눠도 서로 다른
 * 자리를 보므로, 공유가 도는 것처럼 보여도 체력과 덱은 따로 논다.
 */

describe('열쇠 고르기', () => {
  it('캐릭터를 골랐으면 그 id다 — 파티원 모두가 같은 자리를 본다', () => {
    expect(slotKeyFor('char-1', 'widget-abc')).toBe('char-1')
  })

  it('안 골랐으면 위젯 인스턴스 id다 — 이 기기 안에서만 센다', () => {
    expect(slotKeyFor(null, 'widget-abc')).toBe('widget-abc')
  })

  it('기기가 달라도 같은 캐릭터면 같은 자리다', () => {
    expect(slotKeyFor('char-1', '형님의-위젯')).toBe(slotKeyFor('char-1', '아우의-위젯'))
  })

  it('캐릭터를 안 고른 둘은 서로 섞이지 않는다', () => {
    expect(slotKeyFor(null, 'w1')).not.toBe(slotKeyFor(null, 'w2'))
  })
})

describe('캐릭터 id 거르기', () => {
  it('글자면 받고 아니면 안 고른 것으로 친다', () => {
    expect(sanitizeCharacterId('char-1')).toBe('char-1')
    expect(sanitizeCharacterId('')).toBeNull()
    expect(sanitizeCharacterId(null)).toBeNull()
    expect(sanitizeCharacterId(42)).toBeNull()
    expect(sanitizeCharacterId({ id: 'x' })).toBeNull()
  })
})

describe('HP/XP 설정', () => {
  it('없으면 안 고른 것이다', () => {
    expect(sanitizeHpXpSettings(undefined)).toEqual({ characterId: null })
    expect(sanitizeHpXpSettings('망가짐')).toEqual({ characterId: null })
  })

  it('고른 것을 지킨다', () => {
    expect(sanitizeHpXpSettings({ characterId: 'char-1' })).toEqual({ characterId: 'char-1' })
  })
})

describe('덱 설정', () => {
  it('구성이 망가져도 고른 캐릭터는 지킨다', () => {
    /**
     * 구성이 어긋났다고 캐릭터까지 놓으면, 설정 화면을 한 번 잘못 건드린 뒤로
     * 그 덱만 판에서 떨어져 나간다.
     */
    const out = sanitizeAttackDeckSettings({ characterId: 'char-1', composition: '망가짐' })
    expect(out.characterId).toBe('char-1')
    expect(Object.keys(out.composition).length).toBeGreaterThan(0)
  })

  it('한 장도 없는 구성이어도 고른 캐릭터는 지킨다', () => {
    const out = sanitizeAttackDeckSettings({ characterId: 'char-1', composition: { p1: 0 } })
    expect(out.characterId).toBe('char-1')
  })

  it('멀쩡한 구성은 그대로 두고 캐릭터를 함께 낸다', () => {
    const out = sanitizeAttackDeckSettings({ characterId: 'char-2', composition: { p1: 3, m1: 2 } })
    expect(out.characterId).toBe('char-2')
    expect(out.composition.p1).toBe(3)
    expect(out.composition.m1).toBe(2)
  })

  it('아무것도 없으면 표준 덱에 캐릭터 없음', () => {
    const out = sanitizeAttackDeckSettings(undefined)
    expect(out.characterId).toBeNull()
  })
})
