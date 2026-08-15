import { describe, expect, it } from 'vitest'
import { deckSlotKey, sanitizeAttackDeckSettings } from './settings'

/*
  ┌────────────────────────────────────────────────────────────────────────┐
  │ **열쇠가 틀리면 넷이 앉아도 아무것도 안 겹친다.**                       │
  └────────────────────────────────────────────────────────────────────────┘

  몬스터 덱은 상에 하나뿐이므로 모두가 같은 자리를 봐야 한다(규칙서: 몬스터는
  한 덱을 함께 쓴다). 캐릭터 덱은 종전대로 고른 캐릭터의 id다.
*/

describe('누구의 덱인가', () => {
  it('옛 설정에는 없던 칸이라 캐릭터로 친다', () => {
    expect(sanitizeAttackDeckSettings({ composition: { p0: 1 } }).owner).toBe('character')
  })

  it('알아볼 수 없는 값도 캐릭터로 친다 — 몬스터 덱은 골라야 된다', () => {
    expect(sanitizeAttackDeckSettings({ owner: '몬스터' }).owner).toBe('character')
    expect(sanitizeAttackDeckSettings({ owner: 'monster' }).owner).toBe('monster')
  })

  /*
    **몬스터 덱은 상에 하나뿐이다.** 열쇠가 기기마다 다르면 넷이 앉아도 각자
    다른 덱에서 뽑는다 — 실물에서 몬스터 덱이 상 가운데 하나인 것과 어긋난다.
  */
  it('몬스터 덱의 열쇠는 못박혀 있다', () => {
    const monster = sanitizeAttackDeckSettings({ owner: 'monster', characterId: 'char-1' })
    expect(deckSlotKey(monster, 'widget-a')).toBe('monster')
    expect(deckSlotKey(monster, 'widget-b')).toBe('monster')
  })

  it('캐릭터 덱은 종전대로 캐릭터 id, 안 골랐으면 인스턴스 id다', () => {
    const picked = sanitizeAttackDeckSettings({ owner: 'character', characterId: 'char-1' })
    expect(deckSlotKey(picked, 'widget-a')).toBe('char-1')
    const none = sanitizeAttackDeckSettings({ owner: 'character' })
    expect(deckSlotKey(none, 'widget-a')).toBe('widget-a')
  })
})
