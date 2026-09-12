import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { TreasureList } from './TreasureReference'

/*
  스토어에 매달린 껍데기는 서버 렌더에 안 비치므로(구현 결정 150) 늘어놓는 일만
  본다. **여기에는 「찾았는가」가 없다** — 참조는 어느 파티의 것도 아니다.
*/

describe('참조의 보물 색인', () => {
  it('번호와 글을 차례대로 늘어놓는다', () => {
    const html = renderToStaticMarkup(
      <TreasureList
        items={[
          { no: 1, text: '무작위 아이템 도안' },
          { no: 2, text: '금화 15개 획득' },
        ]}
      />,
    )
    expect(html.indexOf('무작위 아이템 도안')).toBeLessThan(html.indexOf('금화 15개 획득'))
  })

  it('찾았는지 켜는 칸이 없다 — 참조는 고치는 자리가 아니다', () => {
    const html = renderToStaticMarkup(<TreasureList items={[{ no: 1, text: '가' }]} />)
    expect(html).not.toContain('<button')
    expect(html).not.toContain('aria-pressed')
  })

  it('표가 없으면 어디서 넣는지 적는다 — 왜 비었는지 안 보이면 고장으로 읽힌다', () => {
    const html = renderToStaticMarkup(<TreasureList items={[]} />)
    expect(html).toContain('주인장 화면')
  })
})
