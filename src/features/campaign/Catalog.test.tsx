import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { CatalogPanel, type CatalogEntry } from './Catalog'

/*
  자리 잡기(`CatalogPopup`)는 `createPortal`이라 서버 렌더로 볼 수 없다 — 알맹이만
  덮는다(구현 결정 194). 확인하고 싶은 것은 자리가 아니라 **무엇이 늘어서고 언제
  「추가」가 나오는가**다.
*/

const noop = () => {}
const ENTRIES: CatalogEntry[] = [
  { id: 'a', name: '가죽 장화' },
  { id: 'b', name: '값비싼 반지' },
]

function render(owned: string[] = [], entries: CatalogEntry[] | null = ENTRIES) {
  return renderToStaticMarkup(
    <CatalogPanel
      title="상점"
      ownedWord="보유"
      entries={entries}
      owned={owned}
      canDefine
      tail={() => null}
      dropNote="지우면 다른 사람에게서도 사라진다."
      onAdd={noop}
      onDrop={noop}
      onClose={noop}
    />,
  )
}

describe('CatalogPanel', () => {
  it('적어 둔 것이 늘어선다', () => {
    const html = render()
    expect(html).toContain('가죽 장화')
    expect(html).toContain('값비싼 반지')
  })

  /*
    **적기 전에 먼저 찾는다.** 아무것도 안 친 상태에서는 더할 것이 없으므로
    「추가」가 없어야 한다 — 늘 서 있으면 이미 있는 것을 또 적게 된다.
  */
  it('아무것도 안 쳤으면 「추가」가 없다', () => {
    expect(render()).not.toContain('추가')
  })

  it('들고 있는 것은 그렇다고 적는다', () => {
    expect(render(['가죽 장화'])).toContain('보유')
  })

  it('둘 이상이면 몇 개인지 함께 적는다', () => {
    expect(render(['가죽 장화', '가죽 장화'])).toMatch(/보유<[^>]*>\s*2/)
  })

  /** 띄어쓰기가 달라도 같은 것으로 본다(`fold`) — 없다고 하면 두 벌이 생긴다. */
  it('공백이 달라도 보유로 센다', () => {
    expect(render(['가죽장화'])).toContain('보유')
  })

  it('안 들고 있으면 아무 표도 안 붙는다', () => {
    expect(render([])).not.toContain('보유')
  })

  it('아직 못 읽었으면 읽는 중이라 한다', () => {
    expect(render([], null)).toContain('읽는 중')
  })

  it('하나도 없으면 적으라고 한다 — 빈 화면으로 두지 않는다', () => {
    expect(render([], [])).toContain('아직 적어 둔 것이 없다')
  })
})
