import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { RoundLogPanel } from './RoundLogPanel'

/*
  값만 받는 순수한 화면이라 서버 렌더로 끝까지 확인된다(구현 결정 164).
  **여기서 지킬 것은 「모르는 것을 아는 척하지 않는가」다**(구현 결정 115).
*/

function render(over: Partial<Parameters<typeof RoundLogPanel>[0]> = {}) {
  return renderToStaticMarkup(
    <RoundLogPanel round={1} startedAt={null} laps={[]} now={0} {...over} />,
  )
}

describe('라운드 기록', () => {
  it('시작 전에는 시간을 안 적는다 — 0으로 적으면 재는 중인 줄 안다', () => {
    const html = render()
    expect(html).toContain('--:--')
    expect(html).toContain('시작 단추')
  })

  it('시작했으면 이번 라운드가 얼마나 흘렀는지 적는다', () => {
    expect(render({ startedAt: 1000, now: 1000 + 65_000 })).toContain('01:05')
  })

  it('끝난 라운드가 없으면 평균이 없다', () => {
    const html = render({ startedAt: 1000, now: 2000 })
    expect(html).toContain('아직 넘긴 라운드가 없다')
  })

  it('라운드마다 걸린 시간을 줄로 늘어놓는다', () => {
    const html = render({ round: 3, startedAt: 1000, now: 1000, laps: [60_000, 120_000] })
    expect(html).toContain('01:00')
    expect(html).toContain('02:00')
  })

  it('평균을 낸다', () => {
    const html = render({ round: 3, startedAt: 1, now: 1, laps: [60_000, 120_000] })
    // 평균 90초 = 01:30
    expect(html).toContain('01:30')
  })

  it('가장 긴 라운드가 막대를 꽉 채운다 — 어디가 길었는지 훑어져야 한다', () => {
    const html = render({ laps: [50_000, 100_000] })
    expect(html).toContain('width:100%')
    expect(html).toContain('width:50%')
  })

  it('현재 라운드를 적는다', () => {
    expect(render({ round: 7 })).toContain('>7<')
  })
})
