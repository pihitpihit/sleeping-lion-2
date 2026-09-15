import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { HpXpLogPanel } from './HpXpLogView'
import type { HpXpLogRow } from './hpxp'

/*
  자리 잡기(`createPortal`)는 서버 렌더로 볼 수 없으므로 알맹이만 본다
  (구현 결정 194). **라운드마다 한 줄이고, 값과 증감이 그 줄에 함께 선다.**
*/

const rows: HpXpLogRow[] = [
  { round: 3, hp: 18, xp: 2, hpDelta: 4, xpDelta: 0 },
  { round: 2, hp: 21, xp: 0, hpDelta: -3, xpDelta: 2 },
  { round: 1, hp: 26, xp: 0, hpDelta: -5, xpDelta: 0 },
]

function render(over: Partial<Parameters<typeof HpXpLogPanel>[0]> = {}) {
  return renderToStaticMarkup(
    <HpXpLogPanel who="바위심장" rows={rows} maxHp={null} onClose={() => {}} {...over} />,
  )
}

describe('체력·경험 기록', () => {
  it('라운드마다 한 줄이다', () => {
    expect((render().match(/hplog__round"/g) ?? []).length).toBe(3)
  })

  it('줄 차례는 받은 그대로다 — 늦은 라운드가 위로 온다', () => {
    const html = render()
    expect(html.indexOf('R3')).toBeLessThan(html.indexOf('R1'))
  })

  /* 「생명」·「경험」은 글자가 아니라 그림이다 — 판 위에서 보는 그것과 같아야 한다. */
  it('칸 이름을 그림으로 낸다', () => {
    const html = render()
    expect(html).toContain('hp-drop-deep-lit')
    expect(html).toContain('xp-star-lit')
  })

  it('라운드가 열렸을 때의 값을 적는다', () => {
    const html = render()
    expect(html).toContain('>26<')
    expect(html).toContain('>21<')
  })

  /*
    **괄호는 안 두른다** — 색과 부호가 이미 「움직인 만큼」이라고 말한다.
    `not.toContain('(')`로는 못 본다: 표식 그림이 `url(...)`을 싣고 있다.
  */
  it('움직인 만큼을 값 옆에 곁들인다', () => {
    const html = render()
    expect(html).toContain('>−5</span>')
    expect(html).toContain('>+2</span>')
  })

  /* `+0`이 붙으면 무언가 있었던 것처럼 읽힌다. */
  it('안 움직였으면 괄호를 안 붙인다', () => {
    const html = render({ rows: [{ round: 1, hp: 26, xp: 0, hpDelta: 0, xpDelta: 0 }] })
    expect(html).not.toContain('hplog__delta')
  })

  it('판이 안 열렸으면 그렇다고 적는다 — 빈 화면은 고장으로 읽힌다', () => {
    expect(render({ rows: [] })).toContain('아직 판이 열리지 않았다')
  })

  it('캐릭터를 안 골랐으면 이름 대신 무엇의 기록인지 적는다', () => {
    expect(render({ who: '' })).toContain('체력·경험')
  })
})

/*
  ┌──────────────────────────────────────────────────────────────────────────┐
  │ **다이얼과 같은 눈으로 본다** — 판 위에서 녹색이던 것이 기록에서 아무      │
  │ 색도 아니면 같은 사실인 줄 모른다.                                        │
  └──────────────────────────────────────────────────────────────────────────┘
*/
describe('최대 체력 표시', () => {
  it('그 라운드가 최대에서 열렸으면 그 칸만 물든다', () => {
    const html = render({ maxHp: 26 })
    expect((html.match(/hplog__cell--full/g) ?? []).length).toBe(1)
    expect(html).not.toContain('hplog__cell--over')
  })

  it('넘었으면 다른 색이다', () => {
    const html = render({ maxHp: 18 })
    expect(html).toContain('hplog__cell--over')
  })

  it('모르면 아무것도 안 물든다', () => {
    const html = render({ maxHp: null })
    expect(html).not.toContain('hplog__cell--full')
    expect(html).not.toContain('hplog__cell--over')
  })
})
