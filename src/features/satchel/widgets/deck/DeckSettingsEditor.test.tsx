import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { DeckSettingsEditor } from './DeckSettingsEditor'

/**
 * 덱 설정 화면.
 *
 * 서버 렌더로 문자열까지만 뽑는다(구현 결정 48).
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ **여기서 볼 수 있는 것은 특혜를 못 읽을 때의 얼굴뿐이다.**                 │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * zustand는 서버 스냅숏으로 `getInitialState`를 준다 — 스토어를 `setState`로
 * 갈아 끼워도 서버 렌더에는 **안 비친다**(구현 결정 134). 그래서 특혜가 몰 때의
 * 얼굴(손잡이를 걷고 나온 구성을 읽기만 하게 보여주는 것)은 여기서 확인할 수 없고
 * 화면에서 본다.
 *
 * 그 갈림의 알맹이는 이미 순수 함수 쪽에서 확인한다 — `perkDeckChanges`와
 * `resolveComposition`(`campaign/perks.test.ts`)이 "켠 상자 → 구성"을 통째로
 * 덮는다. 여기서는 **그 함수들을 못 읽을 때 화면이 서는지**만 본다.
 */

function render(settings: unknown, instanceId: string | null = 'w1') {
  return renderToStaticMarkup(
    <DeckSettingsEditor value={settings} onChange={() => {}} instanceId={instanceId} />,
  )
}

describe('특혜를 못 읽을 때', () => {
  it('손잡이를 내고 옮겨 적으라고 한다', () => {
    const html = render({ composition: { p0: 6, m1: 5 }, characterId: null })
    expect(html).toContain('deck-settings__stepper')
    expect(html).toContain('옮겨 적는다')
    expect(html).not.toContain('deck-settings__fixed')
  })

  it('설정값 그대로 센다', () => {
    expect(render({ composition: { p0: 3 }, characterId: null })).toContain('>3</strong>')
  })

  it('표준이 아니면 되돌리기를 낸다', () => {
    expect(render({ composition: { p0: 3 }, characterId: null })).toContain('표준 덱으로 되돌리기')
  })

  it('표식 붙은 종류도 줄로 나온다', () => {
    const html = render({ composition: { p0: 6, 'r.p0.fire': 2 }, characterId: null })
    expect(html).toContain('굴림')
    expect(html).toContain('불')
  })

  it('망가진 설정에서도 선다', () => {
    expect(render(undefined)).toContain('deck-settings')
    expect(render('덱')).toContain('deck-settings')
  })
})

describe('덱 새로 짜기', () => {
  it('아직 안 뽑았으면 내지 않는다 — 다시 짤 판이 없다', () => {
    expect(render({ composition: { p0: 6 }, characterId: null })).not.toContain('덱 새로 짜기')
  })

  /** 놓기 전에 묻는 팝업에는 인스턴스가 없다. 담긴 판도 없으므로 낼 것이 없다. */
  it('놓기 전에는 내지 않는다', () => {
    expect(render({ composition: { p0: 6 }, characterId: null }, null)).not.toContain(
      '덱 새로 짜기',
    )
  })
})
