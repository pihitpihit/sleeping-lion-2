import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { Price } from './Price'

/*
  **깎인 만큼이 보여야 깎였다는 것을 안다.** 낸 값만 적으면 그것이 제값인지
  깎인 값인지 알 수 없다.
*/

describe('값', () => {
  it('깎인 것이 없으면 수 하나만 적는다', () => {
    const html = renderToStaticMarkup(<Price cost={30} />)
    expect(html).toContain('30')
    expect(html).not.toContain('price__was')
  })

  it('원래 값이 같으면 덧붙이지 않는다 — 안 깎였는데 줄을 그으면 안 된다', () => {
    expect(renderToStaticMarkup(<Price cost={30} was={30} />)).not.toContain('price__was')
  })

  it('모르면 덧붙이지 않는다', () => {
    expect(renderToStaticMarkup(<Price cost={30} was={null} />)).not.toContain('price__was')
  })

  it('깎였으면 원래 값에 줄을 긋고 함께 낸다', () => {
    const html = renderToStaticMarkup(<Price cost={28} was={30} />)
    expect(html).toContain('price__was')
    expect(html).toContain('>30<')
    expect(html).toContain('>28<')
    expect(html).toContain('price__n--cut')
  })

  it('읽어주는 쪽에는 얼마나 깎였는지 우리말로 간다', () => {
    expect(renderToStaticMarkup(<Price cost={28} was={30} />)).toContain('2 깎임')
    expect(renderToStaticMarkup(<Price cost={33} was={30} />)).toContain('3 얹힘')
  })
})
