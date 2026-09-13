import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { ScenarioPicker } from './ScenarioPicker'
import type { StoredState } from './scenarioState'

/*
  값과 손잡이를 다 받으므로 서버 렌더로 끝까지 확인된다(구현 결정 164).
  **지킬 것은 목록이 없어도 서는 것**(절대 원칙 3)과 **닫힌 것을 지우지 않고
  미루기만 하는 것**(규칙을 판정하지 않는다).
*/

const list = [
  { no: 1, grid: 'G-10', name: '가' },
  { no: 2, grid: 'H-11', name: '나' },
  { no: 3, grid: 'K-17', name: '다' },
]

function render(over: Partial<Parameters<typeof ScenarioPicker>[0]> = {}) {
  return renderToStaticMarkup(
    <ScenarioPicker
      list={list}
      states={{}}
      picked={null}
      onPick={() => {}}
      onState={() => {}}
      {...over}
    />,
  )
}

describe('시나리오 고르기', () => {
  it('목록이 없으면 손으로 적으라고 알린다 — 빈 화면은 고장으로 읽힌다', () => {
    expect(render({ list: [] })).toContain('손으로 적는다')
  })

  it('번호·좌표·이름을 함께 낸다 — 상 위에서 셋 다로 부른다', () => {
    const html = render()
    expect(html).toContain('#1')
    expect(html).toContain('G-10')
    expect(html).toContain('가')
  })

  it('담긴 것이 없으면 다 닫힘이다', () => {
    expect((render().match(/scpick__tag--closed/g) ?? []).length).toBe(3)
  })

  /*
    **닫힌 것을 지우지 않는다.** 적어 두지 않았을 뿐일 수 있다 — 규칙을 판정하는
    것은 우리 일이 아니다(SPEC 1장). 차례만 아래로 미룬다.
  */
  it('갈 수 있는 것이 위로 오되 닫힌 것도 남는다', () => {
    const states: Record<number, StoredState> = { 3: 'open' }
    const html = render({ states })
    expect(html).toContain('#1')
    expect(html.indexOf('#3')).toBeLessThan(html.indexOf('#1'))
  })

  it('고르면 그 줄만 서고 상태 넷이 나온다', () => {
    const html = render({ picked: 2 })
    expect(html).toContain('나')
    expect(html).not.toContain('scpick__search')
    for (const label of ['닫힘', '열림', '막힘', '완료']) expect(html).toContain(label)
  })

  it('고른 시나리오의 지금 상태만 켜진다', () => {
    const html = render({ picked: 2, states: { 2: 'blocked' } })
    expect((html.match(/scpick__state--on/g) ?? []).length).toBe(1)
    expect(html).toContain('scpick__state--blocked scpick__state--on')
  })

  it('물릴 수 있다 — 잘못 골랐을 때 빠져나갈 길이 있어야 한다', () => {
    expect(render({ picked: 2 })).toContain('물리기')
  })
})
