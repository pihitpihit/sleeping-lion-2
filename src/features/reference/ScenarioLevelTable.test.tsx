import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { DifficultyTable, ScenarioLevelTable } from './ScenarioLevelTable'

/*
  **화면에 나오는 수가 표의 수인지 본다.** 값은 `rules/scenarioLevel.ts`에서
  오지만, 늘어놓다 한 칸을 빠뜨리거나 열을 바꿔 놓으면 시험 없이는 모른다 —
  규칙서를 대신 펴는 화면이라 틀린 수는 판을 어긋나게 한다.
*/

const cellsOf = (html: string) =>
  [...html.matchAll(/<t[hd][^>]*>([^<]*)<\/t[hd]>/g)].map((m) => m[1])

describe('ScenarioLevelTable', () => {
  const html = renderToStaticMarkup(<ScenarioLevelTable />)

  it('여덟 줄이 다 선다', () => {
    expect(html.match(/<tr>/g)?.length).toBe(9) // 머리글 한 줄 + 여덟 줄
  })

  it('레벨 3 줄이 규칙서와 같다 — 3·3·5·10', () => {
    // 다섯 칸이 한 줄이다. 값으로 자리를 찾으면 다른 줄의 같은 수에 걸린다.
    const cells = cellsOf(html)
    expect(cells.slice(3 * 5, 4 * 5)).toEqual(['3', '3', '3', '5', '10'])
  })

  it('마지막 줄의 금화는 6이다 — 여기만 두 칸 뛴다', () => {
    const cells = cellsOf(html)
    expect(cells.slice(-5)).toEqual(['7', '7', '6', '9', '18'])
  })
})

describe('DifficultyTable', () => {
  const html = renderToStaticMarkup(<DifficultyTable />)

  it('네 갈래와 그 보정을 적는다', () => {
    expect(cellsOf(html).slice(2)).toEqual([
      '쉬움',
      '−1',
      '보통',
      '+0',
      '어려움',
      '+1',
      '매우 어려움',
      '+2',
    ])
  })
})
