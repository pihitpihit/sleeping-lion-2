import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { PerkText } from './PerkText'

/**
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ **그림은 눈에만 보이므로 소리로도 갈려야 한다.**                          │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * 조각마다 `aria-hidden`을 걸고 줄 전체에 원문을 붙인다 — 조각조각 읽히면
 * 「굴림 바람 카드」가 「초록 마름모 파란 원 카드」가 된다.
 *
 * 생성 화면의 카드 자체는 스토어에 매달려 있어 서버 렌더로 볼 수 없다(구현
 * 결정 150) — 여기서는 **글을 그림으로 바꾸는 조각**만 덮는다.
 */
describe('특혜 글을 그림으로', () => {
  it('원문이 읽어주는 쪽에 통째로 간다', () => {
    const html = renderToStaticMarkup(<PerkText text="굴림 바람 카드 2장 추가" />)
    expect(html).toContain('aria-label="굴림 바람 카드 2장 추가"')
  })

  it('원소와 굴림이 그림으로 나온다', () => {
    const html = renderToStaticMarkup(<PerkText text="굴림 바람 카드 2장 추가" />)
    expect(html).toContain('status/rolling.svg')
    expect(html).toContain('elements/air.svg')
    // 바뀐 낱말은 글자로 남지 않는다.
    expect(html).not.toContain('>굴림<')
    expect(html).not.toContain('>바람<')
    // 나머지 글은 그대로다.
    expect(html).toContain('카드 2장 추가')
  })

  it('값은 메달 그림으로 나온다', () => {
    expect(renderToStaticMarkup(<PerkText text="+1 카드" />)).toContain('attack-modifiers/p1.webp')
  })

  /** 팩에 메달이 없는 값은 글자 그대로 둔다(구현 결정 115와 같은 결). */
  it('그림이 없는 값은 글자로 남는다', () => {
    const html = renderToStaticMarkup(<PerkText text="+3 카드" />)
    expect(html).not.toContain('attack-modifiers/p3')
    expect(html).toContain('+3')
  })

  /** DB에서 「불」 열 번 중 다섯이 「이동불가」 속이었다. */
  it('이동불가 안의 불을 잡지 않는다', () => {
    const html = renderToStaticMarkup(<PerkText text="이동불가 카드 1장 추가" />)
    expect(html).toContain('status/immobilize.svg')
    expect(html).not.toContain('elements/fire.svg')
  })
})
