import { describe, expect, it } from 'vitest'
import { adventureNote } from './adventureNote'
import { dedupeParties } from './parties'

/*
  대문에 무엇이 뜨는지와 어느 파티를 고를 수 있는지를 정하는 두 함수다. 화면을
  거치지 않고 표로 못박는다 — **틀리면 열 수 없는 문이 열린 것처럼 보인다.**
*/

describe('adventureNote', () => {
  it('도는 것이 없으면 아무 말도 안 한다', () => {
    expect(adventureNote([])).toBeNull()
  })

  it('하나면 어디서 도는지 적는다', () => {
    expect(adventureNote(['잠자는 사자'])).toBe('잠자는 사자에서 모험 중')
  })

  it('여럿이면 센다 — 이름이 늘어서면 카드가 무너진다', () => {
    expect(adventureNote(['가', '나'])).toBe('2개의 모험')
    expect(adventureNote(['가', '나', '다'])).toBe('3개의 모험')
  })
})

describe('dedupeParties', () => {
  const of = (partyId: string | null, partyName: string | null, retired = false) => ({
    partyId,
    partyName,
    campaignId: partyId === null ? null : `g-${partyId}`,
    retired,
  })

  it('같은 파티는 한 번만 — 캐릭터를 둘 세울 수 있다', () => {
    expect(dedupeParties([of('p1', '사자'), of('p1', '사자'), of('p2', '늑대')])).toEqual([
      { id: 'p1', name: '사자', campaignId: 'g-p1' },
      { id: 'p2', name: '늑대', campaignId: 'g-p2' },
    ])
  })

  it('파티에 안 든 캐릭터는 셈에 없다', () => {
    expect(dedupeParties([of(null, null)])).toEqual([])
  })

  it('은퇴한 캐릭터는 상에 없는 사람이다', () => {
    expect(dedupeParties([of('p1', '사자', true)])).toEqual([])
  })

  it('이름이 비어 있어도 고를 수는 있어야 한다', () => {
    expect(dedupeParties([of('p1', '')])).toEqual([
      { id: 'p1', name: '이름 없는 파티', campaignId: 'g-p1' },
    ])
  })
})
