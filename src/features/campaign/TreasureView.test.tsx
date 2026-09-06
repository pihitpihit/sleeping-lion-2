import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { TreasurePanel } from './TreasureView'

/*
  자리 잡기(`createPortal`)는 서버 렌더로 볼 수 없으므로 알맹이만 본다
  (구현 결정 194). 여기서 지킬 것은 **획득한 것만 내용이 보이는가**다 —
  책자가 「이 정보를 알지 마십시오」라고 적어 둔 글이다.
*/

/* 따옴표는 HTML로 나갈 때 이스케이프되므로 시험 글에는 넣지 않는다. */
const items = [
  { no: 2, text: '대형 방패 획득' },
  { no: 3, text: '철편 갑옷 획득' },
]

function render(found: number[], editing = false) {
  return renderToStaticMarkup(
    <TreasurePanel
      items={items}
      found={new Set(found)}
      count={5}
      editing={editing}
      onToggle={() => {}}
      onClose={() => {}}
    />,
  )
}

describe('보물 색인 자세히 보기', () => {
  it('획득한 것만 내용이 보인다', () => {
    const html = render([2])
    expect(html).toContain('대형 방패 획득')
    expect(html).not.toContain('철편 갑옷 획득')
  })

  it('못 찾은 줄은 그렇다고만 적는다 — 빈 줄이면 고장으로 읽힌다', () => {
    expect(render([2])).toContain('아직 못 찾음')
  })

  it('표에 없는 줄도 자리를 지킨다 — 표가 비어도 번호는 켤 수 있어야 한다', () => {
    const html = render([])
    for (const no of [1, 2, 3, 4, 5]) {
      expect(html).toContain(`aria-label="보물 ${no}번"`)
    }
  })

  it('획득한 번호가 표 밖이면 줄이 늘어난다 — 표를 줄여 넣어도 안 사라진다', () => {
    expect(render([9])).toContain('보물 9번')
  })

  it('열람 중에는 줄을 누를 수 없다', () => {
    expect((render([2]).match(/disabled/g) ?? []).length).toBe(5)
    expect(render([2], true)).not.toContain('disabled')
  })

  it('몇 개 찾았는지 머리에 적는다', () => {
    expect(render([2, 3])).toContain('지금 2개')
  })
})
