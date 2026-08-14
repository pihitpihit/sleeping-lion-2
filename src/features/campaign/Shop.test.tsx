import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { ShopPanel } from './Shop'

/*
  자리 잡기(`Shop`)는 `createPortal`이라 서버 렌더로 볼 수 없다 — 알맹이만 덮는다
  (구현 결정 194와 같은 손질). 확인하고 싶은 것은 자리가 아니라 **무엇이 늘어서고
  무엇이 잠기는가**다.
*/

const noop = () => {}
const ITEMS = [
  { id: 'a', name: '가죽 장화', cost: 20 },
  { id: 'b', name: '값비싼 반지', cost: 150 },
]

function render(gold: number, items: typeof ITEMS | null = ITEMS) {
  return renderToStaticMarkup(
    <ShopPanel
      items={items}
      failed={false}
      gold={gold}
      canDefine
      onDefine={noop}
      onDrop={noop}
      onBuy={noop}
      onClose={noop}
    />,
  )
}

describe('ShopPanel', () => {
  it('가진 골드를 머리에 적는다 — 값만으로는 살 수 있는지 알 수 없다', () => {
    expect(render(80)).toContain('가진 골드 80')
  })

  it('적어 둔 것이 이름과 값으로 늘어선다', () => {
    const html = render(80)
    expect(html).toContain('가죽 장화')
    expect(html).toContain('20 골드')
  })

  it('모자라는 것은 잠기고 까닭을 글자로 말한다', () => {
    const html = render(80)
    // 20짜리는 살 수 있고 150짜리는 못 산다.
    expect(html).toContain('구매')
    expect(html).toContain('골드 부족')
    expect(html.match(/disabled/g)?.length).toBeGreaterThan(0)
  })

  it('다 살 수 있으면 「골드 부족」이 없다', () => {
    expect(render(500)).not.toContain('골드 부족')
  })

  it('아직 아무것도 없으면 적으라고 한다 — 빈 화면으로 두지 않는다', () => {
    expect(render(0, [])).toContain('아직 적어 둔 것이 없다')
  })

  it('초안에 담긴다는 것을 알린다 — 저장을 안 누르면 안 남는다', () => {
    expect(render(80)).toContain('초안에 담긴다')
  })
})
