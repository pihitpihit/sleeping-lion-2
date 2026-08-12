import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { CardFace, CardStack } from './CardFace'
import { FACE_SLOTS, makeCard, type Card } from './deck'

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

  /**
   * ┌────────────────────────────────────────────────────────────────────────┐
   * │ **왼쪽 아래 홈은 덱 주인 자리다. 섞기는 오른쪽 아래다.**                 │
   * └────────────────────────────────────────────────────────────────────────┘
   *
   * 실물에서 그 홈에는 1·2·3·4·M이나 클래스 표식이 들어간다 — 판이 끝나고 덱을
   * 도로 가를 때 쓴다. 우리는 거기 섞기를 앉혀 두었다가 형님이 짚어 옮겼다.
   */
  it('섞기 표식은 곱하기 카드에만, 오른쪽 아래에 붙는다', () => {
    const html = renderToStaticMarkup(<CardFace card={card('x2')} />)
    expect(html).toContain('deck__shuffle')
    // 홈을 먼저 깔고 그 위에 표식을 앉힌다 — 표식만 얹으면 바탕 없이 떠 보인다.
    expect(html).toContain('deck__socket')
    expect(html.indexOf('deck__socket')).toBeLessThan(html.indexOf('deck__shuffle'))
    expect(FACE_SLOTS.shuffleIcon.size).toBeLessThan(FACE_SLOTS.shuffle.size)
    expect(html).toContain(`left:${FACE_SLOTS.shuffle.cx}%`)
    // 왼쪽 아래 홈(덱 주인 자리)이 아니다.
    expect(FACE_SLOTS.shuffle.cx).toBeGreaterThan(50)
    expect(FACE_SLOTS.owner.cx).toBeLessThan(50)
    expect(renderToStaticMarkup(<CardFace card={card('p1')} />)).not.toContain('deck__shuffle')
  })

  it('덱 주인 홈에는 아무것도 안 그린다 — 카드 그림에 이미 박혀 있다', () => {
    const html = renderToStaticMarkup(<CardFace card={card('x2')} />)
    expect(html).not.toContain(`left:${FACE_SLOTS.owner.cx}%`)
  })

  it('섞기가 없는 카드에는 홈도 없다', () => {
    expect(renderToStaticMarkup(<CardFace card={card('p1')} />)).not.toContain('deck__socket')
  })

  it('표식은 메달과 따로 붙는다 — 메달은 여전히 값에서 고른다', () => {
    const html = renderToStaticMarkup(<CardFace card={card('p1.wound')} />)
    expect(html).toContain('attack-modifiers/p1.webp')
    expect(html).toContain('deck__badge')
  })

  /** 색이 갈리는 것이 작은 배지에서는 글자보다 먼저 읽힌다. */
  it('상태이상 배지는 실물 표식 색을 쓴다 — 이동불가는 빨강', () => {
    const html = renderToStaticMarkup(<CardFace card={card('p1.immobilize')} />)
    expect(html.toLowerCase()).toContain('#a3301d')
  })

  it('원소 배지는 원소 트래커와 같은 아이콘·같은 색이다', () => {
    const html = renderToStaticMarkup(<CardFace card={card('p2.fire')} />)
    expect(html).toContain('elements/fire.svg')
    expect(html.toLowerCase()).toContain('#e2421f')
  })

  it('수를 단 표식은 수까지 적는다', () => {
    expect(renderToStaticMarkup(<CardFace card={card('r.p0.push2')} />)).toContain('>2<')
  })

  it('표식이 둘 붙으면 위아래로 쌓인다 — 같은 자리에 겹치지 않는다', () => {
    const html = renderToStaticMarkup(<CardFace card={card('p1.fire.ice')} />)
    expect(html).toContain('elements/fire.svg')
    expect(html).toContain('elements/ice.svg')
    const tops = [...html.matchAll(/deck__badge"[^>]*top:([\d.]+)%/g)].map((m) => Number(m[1]))
    expect(new Set(tops).size).toBe(2)
  })

  it('굴림 카드에는 오른쪽 가운데에 굴림 배지가 붙는다', () => {
    const html = renderToStaticMarkup(<CardFace card={card('r.p1')} />)
    expect(html).toContain('deck__badge--rolling')
    expect(html).toContain(`left:${FACE_SLOTS.rolling.cx}%`)
  })

  it('굴림이 아니면 굴림 배지가 없다', () => {
    expect(renderToStaticMarkup(<CardFace card={card('p1')} />)).not.toContain(
      'deck__badge--rolling',
    )
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
