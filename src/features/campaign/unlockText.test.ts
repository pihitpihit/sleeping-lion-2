import { describe, expect, it } from 'vitest'
import { parseUnlockText } from './unlockText'

describe('parseUnlockText', () => {
  it('한 줄이 조건 하나다', () => {
    expect(parseUnlockText('평판이 10점 이상\n평판이 20점')).toEqual([
      { text: '평판이 10점 이상', boxes: 1 },
      { text: '평판이 20점', boxes: 1 },
    ])
  })

  it('앞의 수가 상자 수다', () => {
    expect(parseUnlockText('[10] 금화를 총 100개 기부')).toEqual([
      { text: '금화를 총 100개 기부', boxes: 10 },
    ])
  })

  it('빈 줄은 건너뛴다 — 붙여넣으면 섞여 든다', () => {
    expect(parseUnlockText('\n  \n조건\n\n')).toEqual([{ text: '조건', boxes: 1 }])
  })

  it('상자 수는 1~20 안으로 들인다', () => {
    expect(parseUnlockText('[0] 가')[0].boxes).toBe(1)
    expect(parseUnlockText('[99] 나')[0].boxes).toBe(20)
  })

  /** 대괄호로 시작하지 않으면 글의 일부다 — 수를 억지로 찾지 않는다. */
  it('앞에 수가 없으면 한 칸이다', () => {
    expect(parseUnlockText('10점 이상이 됨')).toEqual([{ text: '10점 이상이 됨', boxes: 1 }])
  })
})
