import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { DeckGalleryPanel } from './DeckGallery'
import { STANDARD_COMPOSITION } from '../satchel/widgets/deck/deck'

/**
 * 덱 펼쳐 보기.
 *
 * **알맹이만 본다.** 바깥 껍데기(`DeckGallery`)는 `createPortal`로 `document.body`
 * 에 그리는데 여기엔 jsdom이 없어 그 함수가 아예 돌지 않는다. 확인하고 싶은 것은
 * 자리가 아니라 **무엇이 늘어서는가**라서 둘을 갈라 두었다.
 *
 * 스토어를 안 건드리는 순수한 화면이라 그 알맹이는 서버 렌더로 끝까지 덮인다
 * (구현 결정 48·164).
 */

function render(composition: Record<string, number>) {
  return renderToStaticMarkup(<DeckGalleryPanel composition={composition} onClose={() => {}} />)
}

describe('카드 늘어놓기', () => {
  it('구성대로 한 장씩 다 낸다 — 표준이면 스무 장', () => {
    const html = render({ ...STANDARD_COMPOSITION })
    expect((html.match(/class="deckgallery__cell/g) ?? []).length).toBe(20)
    // 머리에도 총 장수가 적힌다.
    expect(html).toContain('20</span>장')
  })

  it('특혜로 늘어난 만큼 늘어난다', () => {
    const html = render({ p0: 2, 'p1.wound': 3 })
    expect((html.match(/class="deckgallery__cell/g) ?? []).length).toBe(5)
  })

  /** 덱 위젯이 쓰는 그림을 그대로 쓴다 — 다르면 같은 덱인지 알 수 없다. */
  it('덱 위젯과 같은 카드 앞면을 쓴다', () => {
    const html = render({ p1: 1 })
    expect(html).toContain('deck__face')
    expect(html).toContain('attack-modifiers/p1.webp')
    expect(html).toContain('attack-modifiers/card-face.webp')
  })

  it('표식과 굴림이 카드에 그대로 붙는다', () => {
    const html = render({ 'r.p0.fire': 1, 'p1.wound': 1 })
    expect(html).toContain('status/rolling.svg')
    expect(html).toContain('elements/fire.svg')
    expect(html).toContain('status/wound.svg')
  })

  it('읽어주는 쪽에는 카드마다 우리말이 간다', () => {
    // 퍽으로 더한 것이면 그 말이 뒤에 붙는다.
    expect(render({ 'r.p0.fire': 1 })).toContain('aria-label="굴림, 보정 없음, 불 (특혜로 더한 것)"')
    expect(render({ ...STANDARD_COMPOSITION })).toContain('aria-label="보정 없음"')
  })

  it('닫는 단추가 있다', () => {
    expect(render({ p0: 1 })).toContain('aria-label="닫기"')
  })

  it('팝업으로 알린다 — 뒤쪽 화면을 읽지 않게 한다', () => {
    const html = render({ p0: 1 })
    expect(html).toContain('role="dialog"')
    expect(html).toContain('aria-modal="true"')
  })

  /** 판(뽑힌 카드·남은 장수)은 축 ②의 것이다. 여기 새어 들면 안 된다. */
  it('판 이야기는 없다', () => {
    const html = render({ ...STANDARD_COMPOSITION })
    expect(html).not.toContain('deck__pile')
    expect(html).not.toContain('deck__discard')
    expect(html).not.toContain('deck__back')
  })

  /**
   * ┌────────────────────────────────────────────────────────────────────────┐
   * │ **퍽으로 더한 카드에만 금빛 테를 두른다.**                              │
   * └────────────────────────────────────────────────────────────────────────┘
   *
   * 글자를 붙이지 않는 것은 카드가 작아 읽을 자리가 없어서다. 읽어주는 쪽에만
   * 글자로 간다 — 테는 눈에만 보인다.
   */
  it('표준 덱만이면 두르는 것이 없다', () => {
    const html = render({ ...STANDARD_COMPOSITION })
    expect(html).not.toContain('deckgallery__cell--added')
    expect(html).not.toContain('deckgallery__legend')
  })

  it('퍽으로 더한 것에만 두른다', () => {
    // +1은 표준이 다섯이다. 일곱이면 뒤의 둘만 두른다.
    const html = render({ ...STANDARD_COMPOSITION, p1: 7 })
    expect((html.match(/deckgallery__cell--added/g) ?? []).length).toBe(2)
  })

  it('표준에 없던 종류는 통째로 두른다', () => {
    const html = render({ p0: 1, 'p1.wound': 2 })
    expect((html.match(/deckgallery__cell--added/g) ?? []).length).toBe(2)
  })

  it('읽어주는 쪽에도 알린다 — 테는 눈에만 보인다', () => {
    expect(render({ 'p1.wound': 1 })).toContain('(특혜로 더한 것)')
  })

  it('몇 장이 더해졌는지 머리에 적어 테가 무엇인지 알린다', () => {
    expect(render({ p0: 1, 'p1.wound': 2 })).toContain('deckgallery__legend')
  })

  it('알아볼 수 없는 종류가 섞여도 선다', () => {
    expect((render({ p0: 2, 없는것: 5 }).match(/class="deckgallery__cell/g) ?? []).length).toBe(2)
  })
})
