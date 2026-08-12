import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { DeckPreview } from './DeckPreview'
import type { ClassPerk } from './perkNet'

/**
 * 캐릭터 시트의 덱 구성.
 *
 * **스토어를 하나도 안 건드리는 순수한 화면**이라 서버 렌더로 끝까지 볼 수 있다
 * (구현 결정 48). 특혜가 몰 때의 덱 설정 화면을 못 덮었던 것과 다르다 —
 * 저쪽은 스토어에 매달려 있었다(구현 결정 150).
 */

function perk(over: Partial<ClassPerk> = {}): ClassPerk {
  return { id: 'p', classId: 'c', sort: 0, count: 1, text: '줄', changes: {}, ...over }
}

const TABLE: ClassPerk[] = [
  perk({ id: 'a', sort: 0, count: 2, text: '−1 카드 2장 제거', changes: { m1: -2 } }),
  perk({ id: 'b', sort: 1, count: 1, text: '굴림 불 2장 추가', changes: { 'r.p0.fire': 2 } }),
  perk({ id: 'c', sort: 2, count: 1, text: '+1 부상 1장 추가', changes: { 'p1.wound': 1 } }),
]

describe('덱 구성 보기', () => {
  /**
   * **특혜 표가 없으면 아예 안 낸다.** 그때는 구성의 정본이 위젯 설정이고 시트는
   * 그것을 모른다 — "표준 20장"이라고 적으면 손으로 맞춰 둔 덱과 어긋난다.
   */
  it('특혜 표가 없으면 아무것도 안 그린다', () => {
    expect(renderToStaticMarkup(<DeckPreview perks={[]} checked={[1, 2]} />)).toBe('')
  })

  it('아무것도 안 켰으면 표준 덱 20장이다', () => {
    const html = renderToStaticMarkup(<DeckPreview perks={TABLE} checked={[]} />)
    expect(html).toContain('>20</span>')
    // 표준 그대로이므로 달라진 표시가 없다.
    expect(html).not.toContain('deckview__delta')
  })

  it('켠 대로 장수가 바뀌고 달라진 만큼을 적는다', () => {
    // 1·2번 상자 = 첫 줄 두 번 → −1이 넉 장 빠진다. 5 → 1
    const html = renderToStaticMarkup(<DeckPreview perks={TABLE} checked={[1, 2]} />)
    expect(html).toContain('>16</span>')
    expect(html).toContain('deckview__delta')
    expect(html).toContain('−4')
  })

  it('표식 붙은 카드가 그림·글자와 함께 나온다', () => {
    // 3번 = 굴림 불, 4번 = +1 부상
    const html = renderToStaticMarkup(<DeckPreview perks={TABLE} checked={[3, 4]} />)
    expect(html).toContain('굴림')
    expect(html).toContain('elements/fire.svg')
    expect(html).toContain('부상')
    expect(html).toContain('attack-modifiers/p1.webp')
  })

  it('읽어주는 쪽에는 우리말이 통째로 간다', () => {
    const html = renderToStaticMarkup(<DeckPreview perks={TABLE} checked={[3]} />)
    expect(html).toContain('aria-label="굴림, 보정 없음, 불 2장"')
  })

  /**
   * 판(남은 장수·뽑힌 카드)은 축 ②의 것이다. 여기 새어 들면 안 된다.
   *
   * 세는 수가 **구성에서 나온 값 하나뿐**인지로 본다 — 런타임이 새어 들면 반드시
   * 다른 수가 하나 더 뜬다. 덱 위젯의 조각(더미·버린 덱)도 없어야 한다.
   */
  it('구성에서 나온 수만 있고 판은 없다', () => {
    const html = renderToStaticMarkup(<DeckPreview perks={TABLE} checked={[1]} />)
    expect(html).not.toContain('deck__pile')
    expect(html).not.toContain('deck__discard')

    // 알약의 장수를 다 더하면 머리에 적힌 총합과 같다. 남은 장수가 섞여 들면
    // 이 셈이 어긋난다.
    const chips = [...html.matchAll(/deckview__count[^>]*>×(\d+)</g)].map((m) => Number(m[1]))
    const total = Number(/모두 <span class="sl-numeral">(\d+)</.exec(html)?.[1])
    expect(chips.reduce((a, b) => a + b, 0)).toBe(total)
  })

  it('표 밖의 번호를 켜 두었어도 선다', () => {
    expect(renderToStaticMarkup(<DeckPreview perks={TABLE} checked={[99]} />)).toContain('deckview')
  })
})
