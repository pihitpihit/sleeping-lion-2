import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { HpXpLogPanel } from './HpXpLogView'
import type { HpXpLogEntry, HpXpRoundMark } from './hpxp'

/*
  자리 잡기(`createPortal`)는 서버 렌더로 볼 수 없으므로 알맹이만 본다
  (구현 결정 194). **라운드가 묶는 단위라야 「그때 무슨 일이 있었나」로 읽힌다.**
*/

const entries: HpXpLogEntry[] = [
  { round: 2, track: 'hp', delta: -5 },
  { round: 3, track: 'xp', delta: 2 },
  { round: 3, track: 'hp', delta: -3 },
]

const marks: HpXpRoundMark[] = [
  { round: 2, hp: 18, xp: 0 },
  { round: 3, hp: 13, xp: 0 },
]

function render(over: Partial<Parameters<typeof HpXpLogPanel>[0]> = {}) {
  return renderToStaticMarkup(
    <HpXpLogPanel who="바위심장" entries={entries} marks={marks} onClose={() => {}} {...over} />,
  )
}

describe('체력·경험 기록', () => {
  it('라운드마다 한 줄이다 — 같은 라운드의 둘이 한 줄에 선다', () => {
    const html = render()
    expect((html.match(/hplog__round"/g) ?? []).length).toBe(2)
  })

  it('늦은 라운드가 위로 — 방금 있었던 일을 가장 자주 묻는다', () => {
    const html = render()
    expect(html.indexOf('R3')).toBeLessThan(html.indexOf('R2'))
  })

  it('부호를 붙여 방향이 드러나게 한다', () => {
    const html = render()
    expect(html).toContain('−5')
    expect(html).toContain('+2')
  })

  it('판이 안 열렸으면 그렇다고 적는다 — 빈 화면은 고장으로 읽힌다', () => {
    expect(render({ entries: [], marks: [] })).toContain('아직 판이 열리지 않았다')
  })

  /*
    ┌──────────────────────────────────────────────────────────────────────────┐
    │ **움직인 만큼만으로는 「그때 몇이었나」를 알 수 없다.**                   │
    └──────────────────────────────────────────────────────────────────────────┘
  */
  it('라운드가 열릴 때의 값을 함께 적는다', () => {
    const html = render()
    expect(html).toContain('>18<')
    expect(html).toContain('>13<')
  })

  it('움직인 것이 없어도 라운드가 열렸으면 줄이 선다', () => {
    const html = render({ entries: [], marks: [{ round: 1, hp: 20, xp: 0 }] })
    expect(html).toContain('R1')
    expect(html).toContain('>20<')
  })

  it('캐릭터를 안 골랐으면 이름 대신 무엇의 기록인지 적는다', () => {
    expect(render({ who: '' })).toContain('체력·경험')
  })
})
