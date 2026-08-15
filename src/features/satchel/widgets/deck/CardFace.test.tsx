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

  /** `+3`·`+4`는 팩에 없어 원반을 빌려 구웠다 — 아홉 값이 모두 그림을 갖는다. */
  it('구운 값도 메달을 얹는다', () => {
    expect(renderToStaticMarkup(<CardFace card={card('p3')} />)).toContain(
      'attack-modifiers/p3.webp',
    )
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
    expect(html).toContain(`left:${FACE_SLOTS.shuffle.cx}%`)
    // **왼쪽 아래 홈(덱 주인 자리)에 그리지 않는다** — 형님이 짚어 옮긴 자리다.
    expect(html).not.toContain(`left:${FACE_SLOTS.owner.cx}%`)
    expect(renderToStaticMarkup(<CardFace card={card('p1')} />)).not.toContain('deck__shuffle')
  })

  it('주인을 안 건네면 홈은 빈다', () => {
    expect(renderToStaticMarkup(<CardFace card={card('x2')} />)).not.toContain('deck__owner')
  })

  it('섞기가 없는 카드에는 홈도 없다', () => {
    expect(renderToStaticMarkup(<CardFace card={card('p1')} />)).not.toContain('deck__socket')
  })

  it('표식은 메달과 따로 붙는다 — 메달은 여전히 값에서 고른다', () => {
    const html = renderToStaticMarkup(<CardFace card={card('p1.wound')} />)
    expect(html).toContain('attack-modifiers/p1.webp')
    expect(html).toContain('deck__mark')
  })

  /**
   * 색은 우리가 정하지 않는다 — **팩 그림에 이미 들어 있다.** 손으로 적어 둔
   * 색표를 쓰다가 팩에서 진짜 배지를 가져오면서 걷었다.
   */
  it('상태이상 배지에 우리가 색을 입히지 않는다', () => {
    const html = renderToStaticMarkup(<CardFace card={card('p1.immobilize')} />)
    expect(html).toContain('status/immobilize.svg')
    expect(html.toLowerCase()).not.toContain('background')
  })

  /**
   * 팩의 원소 아이콘은 **색 있는 원반에 흰 문양이 얹힌 통짜 배지다.** 마름모에
   * 넣고 흰빛으로 물들였더니 문양이 사라지고 흰 원반만 남았다 — 있는 그대로
   * 얹는 것이 맞다.
   */
  it('원소는 팩의 둥근 배지를 그대로 얹는다', () => {
    const html = renderToStaticMarkup(<CardFace card={card('p2.fire')} />)
    expect(html).toContain('elements/fire.svg')
    expect(html).toContain('deck__mark')
    // 바탕색을 깔지 않는다 — 그림에 이미 있다.
    expect(html.toLowerCase()).not.toContain('#e2421f')
  })

  /** 팩의 상태이상 열넷은 색까지 다 그려진 마름모다. 씌우거나 물들이지 않는다. */
  it('상태이상도 팩의 마름모 배지를 그대로 얹는다', () => {
    const html = renderToStaticMarkup(<CardFace card={card('p1.wound')} />)
    expect(html).toContain('status/wound.svg')
    expect(html).toContain('deck__mark')
    expect(html).not.toContain('deck__badge-text')
  })

  /** 치료·방어는 열넷에 없다. 검정 실루엣이라 우리가 마름모를 깐다. */
  it('팩에 배지가 없는 것은 마름모를 깔고 얹는다', () => {
    const html = renderToStaticMarkup(<CardFace card={card('p1.heal2')} />)
    expect(html).toContain('general/hp-drop.svg')
    expect(html).toContain('deck__badge-glyph')
    expect(html.toLowerCase()).toContain('#3f6b4a')
  })

  it('당기기는 밀기 그림을 반 바퀴 돌려 그린다', () => {
    const html = renderToStaticMarkup(<CardFace card={card('p1.pull1')} />)
    expect(html).toContain('status/push.svg')
    expect(html).toContain('deck__mark-art--turned')
  })

  it('밀기는 안 돌린다', () => {
    expect(renderToStaticMarkup(<CardFace card={card('p1.push1')} />)).not.toContain(
      'deck__mark-art--turned',
    )
  })

  it('그림이 아예 없으면 글자로 간다', () => {
    const html = renderToStaticMarkup(<CardFace card={card('p0.special')} />)
    expect(html).toContain('deck__badge-text')
  })

  /** 팩 그림에는 수가 없다 — 실물 카드도 표식 옆에 따로 적는다. */
  it('수를 단 표식은 수를 따로 얹는다', () => {
    const html = renderToStaticMarkup(<CardFace card={card('r.p0.push2')} />)
    expect(html).toContain('status/push.svg')
    expect(html).toContain('deck__badge-amount')
    expect(html).toContain('>2<')
  })

  /**
   * ┌────────────────────────────────────────────────────────────────────────┐
   * │ **쌓는 폭은 배지 제 크기로 잰다. 카드 비와 무관해야 한다.**              │
   * └────────────────────────────────────────────────────────────────────────┘
   *
   * `top`으로 쌓았더니 가로 %(`width`)와 세로 %(`top`)가 섞여 겹쳤다 — 카드가
   * 437:296이라 가로 15%짜리 배지가 세로로는 22%인데 간격을 17%로 두었다.
   * 이제 CSS `translate`가 쌓으며 그 %는 제 크기를 기준으로 한다.
   */
  it('표식이 둘 붙으면 가운데를 두고 위아래로 갈린다', () => {
    const html = renderToStaticMarkup(<CardFace card={card('p1.fire.ice')} />)
    expect(html).toContain('elements/fire.svg')
    expect(html).toContain('elements/ice.svg')
    // 자리는 같고 쌓는 값만 다르다.
    const tops = [...html.matchAll(/deck__mark"[^>]*top:([\d.]+)%/g)].map((m) => Number(m[1]))
    expect(new Set(tops).size).toBe(1)
    const idx = [...html.matchAll(/--deck-badge-i:([-\d.]+)/g)].map((m) => Number(m[1]))
    expect(idx).toEqual([-0.5, 0.5])
  })

  it('표식이 하나면 가운데 그대로다', () => {
    const html = renderToStaticMarkup(<CardFace card={card('p2.fire')} />)
    expect(html).toContain('--deck-badge-i:0')
  })

  it('셋이면 가운데를 두고 하나씩 위아래로 간다', () => {
    const html = renderToStaticMarkup(<CardFace card={card('p1.fire.ice.wound')} />)
    const idx = [...html.matchAll(/--deck-badge-i:([-\d.]+)/g)].map((m) => Number(m[1]))
    expect(idx).toEqual([-1, 0, 1])
  })

  /** 굴림도 팩의 상태이상 열넷 가운데 하나다 — 실물 카드의 초록 마름모와 같다. */
  it('굴림 카드에는 오른쪽 가운데에 굴림 배지가 붙는다', () => {
    const html = renderToStaticMarkup(<CardFace card={card('r.p1')} />)
    expect(html).toContain('status/rolling.svg')
    expect(html).toContain(`left:${FACE_SLOTS.rolling.cx}%`)
  })

  it('굴림이 아니면 굴림 배지가 없다', () => {
    expect(renderToStaticMarkup(<CardFace card={card('p1')} />)).not.toContain('deck__roll')
  })
})

/**
 * 왼쪽 아래 홈은 **덱 주인의 자리다** — 판이 끝나고 덱을 도로 가를 때 쓴다.
 * 실물에는 1·2·3·4·M이나 그 카드를 넣어 준 클래스의 표식이 들어간다.
 *
 * **카드는 스스로 알아내지 않고 받아서 그린다.** 축 ②가 축 ①에 닿는 자리는
 * `perkSource.ts` 하나여야 한다(구현 결정 142).
 */
describe('덱 주인 표식', () => {
  it('그림이 있으면 홈에 그림을 앉힌다', () => {
    const html = renderToStaticMarkup(
      <CardFace
        card={card('p1')}
        owner={{ iconUrl: '/x/class-17.svg', letter: '바', name: '바위심장' }}
      />,
    )
    expect(html).toContain('deck__owner')
    expect(html).toContain('class-17.svg')
    expect(html).toContain(`left:${FACE_SLOTS.ownerInner.cx}%`)
    // 홈 테 안쪽에 앉는다 — 바깥 지름을 쓰면 테를 덮어 홈이 사라진다.
    expect(FACE_SLOTS.ownerInner.size).toBeLessThan(FACE_SLOTS.owner.size)
  })

  /** 팩에 그림이 없는 클래스가 있다(사자의 턱 넷). 그때는 첫 글자로 대신한다. */
  it('그림이 없으면 첫 글자를 앉힌다', () => {
    const html = renderToStaticMarkup(
      <CardFace card={card('p1')} owner={{ iconUrl: null, letter: '적', name: '적위병' }} />,
    )
    expect(html).toContain('deck__owner-letter')
    expect(html).toContain('>적<')
  })

  it('그림도 글자도 없으면 홈을 비워 둔다', () => {
    const html = renderToStaticMarkup(
      <CardFace card={card('p1')} owner={{ iconUrl: null, letter: '', name: '' }} />,
    )
    expect(html).not.toContain('deck__owner')
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

describe('덱 주인 표식', () => {
  const owner = (letter: string) => ({ iconUrl: null, letter, name: '주인' })

  /** 실물 몬스터 덱의 `M`이 그 서체로 박혀 있다. */
  it('라틴 한 글자는 글룸헤이븐 서체로 적는다', () => {
    const html = renderToStaticMarkup(<CardFace card={card('p1')} owner={owner('M')} />)
    expect(html).toContain('sl-numeral')
  })

  /** Pirata One은 라틴 전용이라 한글은 대체 서체로 떨어진다(구현 결정 39). */
  it('한글 첫 글자에는 안 붙인다', () => {
    const html = renderToStaticMarkup(<CardFace card={card('p1')} owner={owner('바')} />)
    expect(html).toContain('바')
    expect(html).not.toContain('sl-numeral')
  })
})
