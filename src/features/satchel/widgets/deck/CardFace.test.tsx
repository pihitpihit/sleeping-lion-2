import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { CardFace, CardStack } from './CardFace'
import { makeCard, type Card } from './deck'

/**
 * 카드 앞면이 실제로 그려지는지 본다.
 *
 * 브라우저를 띄우지 않고 **서버 렌더로 문자열까지 뽑는다**(구현 결정 48). 표식과
 * 굴림이 붙은 카드에서 마운트 중에 터지지 않는다는 것, 굴림이 이어진 뽑기가 겹쳐
 * 그려진다는 것을 여기서 확인한다. 색과 간격은 화면에서 본다.
 *
 * **위젯(`AttackDeck`)이 아니라 앞면만 본다.** 위젯은 뽑은 것을 스토어에서 읽는데,
 * 서버 렌더는 스토어의 **처음 상태**를 본다(zustand가 `getInitialState`를 서버
 * 스냅숏으로 준다). 그래서 스토어에 앉혀 둔 판이 서버 렌더에는 비치지 않는다.
 */

function card(kindId: string): Card {
  const made = makeCard(kindId, kindId)
  if (!made) throw new Error(`읽지 못한 종류: ${kindId}`)
  return made
}

describe('카드 앞면', () => {
  it('값 메달을 얹는다', () => {
    expect(renderToStaticMarkup(<CardFace card={card('p1')} />)).toContain(
      'attack-modifiers/p1.webp',
    )
  })

  it('그림이 없는 값(+3)은 숫자를 직접 그린다', () => {
    const html = renderToStaticMarkup(<CardFace card={card('p3')} />)
    expect(html).toContain('deck__numeral')
    expect(html).toContain('+3')
  })

  it('섞기 표식은 곱하기 카드에만 붙는다', () => {
    expect(renderToStaticMarkup(<CardFace card={card('x2')} />)).toContain('deck__shuffle')
    expect(renderToStaticMarkup(<CardFace card={card('p1')} />)).not.toContain('deck__shuffle')
  })

  it('표식은 메달과 따로 붙는다 — 메달은 여전히 값에서 고른다', () => {
    const html = renderToStaticMarkup(<CardFace card={card('p1.wound')} />)
    expect(html).toContain('attack-modifiers/p1.webp')
    expect(html).toContain('부상')
  })

  it('원소 표식은 원소 트래커와 같은 아이콘을 쓴다', () => {
    expect(renderToStaticMarkup(<CardFace card={card('p2.fire')} />)).toContain('elements/fire.svg')
  })

  it('수를 단 표식은 수까지 적는다', () => {
    expect(renderToStaticMarkup(<CardFace card={card('r.p0.push2')} />)).toContain('밀기2')
  })

  it('표식이 둘 붙은 카드도 둘 다 낸다', () => {
    const html = renderToStaticMarkup(<CardFace card={card('p1.fire.ice')} />)
    expect(html).toContain('elements/fire.svg')
    expect(html).toContain('elements/ice.svg')
  })

  it('굴림 카드에는 굴림 표식이 붙는다', () => {
    const html = renderToStaticMarkup(<CardFace card={card('r.p1')} />)
    expect(html).toContain('deck__face--rolling')
    expect(html).toContain('deck__rolling')
  })

  it('굴림이 아니면 굴림 표식이 없다', () => {
    expect(renderToStaticMarkup(<CardFace card={card('p1')} />)).not.toContain('deck__rolling')
  })
})

describe('굴림으로 이어진 뽑기', () => {
  it('한 장뿐이면 겹칠 것이 없다', () => {
    const html = renderToStaticMarkup(<CardStack chain={[card('p1')]} />)
    expect(html).not.toContain('deck__stack')
    expect(html).toContain('deck__face')
  })

  it('아무것도 안 뽑았으면 아무것도 안 그린다', () => {
    expect(renderToStaticMarkup(<CardStack chain={[]} />)).toBe('')
  })

  it('여러 장이면 겹쳐 늘어놓는다', () => {
    const html = renderToStaticMarkup(
      <CardStack chain={[card('r.p0.fire'), card('r.p1'), card('p2')]} />,
    )
    expect(html).toContain('deck__stack')
    expect((html.match(/deck__stack-item/g) ?? []).length).toBe(3)
  })

  /**
   * **마지막 카드가 칸을 정확히 채운다.** 굴림이 몇 장 이어지든 결과 카드의 자리가
   * 움직이지 않아야 한다 — 움직이면 크게 띄운 카드가 날아가 앉을 자리도 어긋난다.
   */
  it('맨 앞 카드는 물러나지 않는다', () => {
    const html = renderToStaticMarkup(
      <CardStack chain={[card('r.p0.fire'), card('r.p1'), card('p2')]} />,
    )
    const backs = [...html.matchAll(/--deck-stack-back:\s*(\d+)/g)].map((m) => Number(m[1]))
    expect(backs).toEqual([2, 1, 0])
  })
})
