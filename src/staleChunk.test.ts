import { describe, expect, it } from 'vitest'
import { looksStale, shouldReload } from './staleChunk'

/*
  **여기서 틀리면 앱이 끝없이 깜빡인다.** 되불러오기를 부르는 판단이라 화면을
  거치지 않고 표로 못박는다.
*/

describe('looksStale', () => {
  it('브라우저 셋의 말을 모두 알아본다', () => {
    // 크롬 · 사파리 · 파이어폭스가 같은 일에 서로 다른 말을 쓴다.
    expect(
      looksStale(new TypeError('Failed to fetch dynamically imported module: https://x/a.js')),
    ).toBe(true)
    expect(looksStale(new Error('Importing a module script failed.'))).toBe(true)
    expect(looksStale(new TypeError('error loading dynamically imported module'))).toBe(true)
  })

  it('화면이 그리다 터진 것은 낡은 것이 아니다', () => {
    expect(looksStale(new TypeError("Cannot read properties of undefined (reading 'name')"))).toBe(
      false,
    )
  })
})

describe('shouldReload', () => {
  const stale = new TypeError('Failed to fetch dynamically imported module: https://x/a.js')

  it('처음 낡은 것을 만나면 한 번 되불러온다', () => {
    expect(shouldReload(stale, null, 1_000)).toBe(true)
  })

  it('되불러온 지 얼마 안 됐으면 그만둔다 — 진짜 없어진 조각이다', () => {
    expect(shouldReload(stale, 1_000, 1_000 + 5_000)).toBe(false)
  })

  it('한참 뒤에 다시 만나면 그때는 또 준다 — 그 사이에 새 배포가 나갔을 수 있다', () => {
    expect(shouldReload(stale, 1_000, 1_000 + 60_000)).toBe(true)
  })

  it('낡은 것이 아니면 되불러오지 않는다 — 새로 불러도 같은 자리에서 터진다', () => {
    expect(shouldReload(new Error('boom'), null, 1_000)).toBe(false)
  })
})
