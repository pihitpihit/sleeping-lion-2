import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { LogPanel } from './LogView'

/**
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ **자리 잡기와 알맹이를 갈라 두면 알맹이는 확인할 수 있다.**                │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * `createPortal`은 `document.body`를 요구해 서버 렌더로 확인할 수가 없는데,
 * 확인하고 싶은 것은 자리가 아니라 **무엇이 늘어서는가**다(구현 결정 194).
 */
const NOW = new Date(2026, 7, 13, 22, 32).getTime()

describe('고친 기록', () => {
  it('읽는 중과 빈 것과 실패를 저마다 다르게 말한다', () => {
    const said = [
      renderToStaticMarkup(<LogPanel entries={null} failed={false} now={NOW} onClose={() => {}} />),
      renderToStaticMarkup(<LogPanel entries={[]} failed={false} now={NOW} onClose={() => {}} />),
      renderToStaticMarkup(<LogPanel entries={null} failed now={NOW} onClose={() => {}} />),
    ]
    expect(said[0]).toContain('읽는 중')
    expect(said[1]).toContain('아직 고친 것이 없다')
    expect(said[2]).toContain('불러오지 못했다')
  })

  /** 한 번의 저장이 한 덩어리다 — 여러 칸을 함께 고치므로 줄이 여럿일 수 있다. */
  it('한 덩어리에 여러 줄이 선다', () => {
    const html = renderToStaticMarkup(
      <LogPanel
        entries={[
          {
            id: 'e1',
            at: NOW - 5 * 60_000,
            actorName: '형님',
            reason: 'scenario',
            changes: [
              { field: 'gold', from: 120, to: 160 },
              { field: 'xp', from: 60, to: 95 },
            ],
          },
        ]}
        failed={false}
        now={NOW}
        onClose={() => {}}
      />,
    )
    expect(html).toContain('5분 전')
    expect(html).toContain('골드 120 → 160 (+40)')
    expect(html).toContain('경험 60 → 95 (+35)')
  })

  /** 서버 값을 믿지 않는다 — 모양이 어긋난 것이 섞여도 화면이 서야 한다. */
  it('변화가 없는 덩어리도 그려진다', () => {
    const html = renderToStaticMarkup(
      <LogPanel
        entries={[{ id: 'e2', at: NOW - 20_000, actorName: '', reason: 'manual', changes: [] }]}
        failed={false}
        now={NOW}
        onClose={() => {}}
      />,
    )
    expect(html).toContain('방금')
  })
})
