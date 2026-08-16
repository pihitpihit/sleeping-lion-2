import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { SCENARIO_LEVELS } from '../../../rules/scenarioLevel'
import { ScenarioLevelPanel } from './ScenarioLevelPanel'

/*
  팝업의 알맹이만 본다 — 자리 잡는 쪽은 `createPortal`이라 서버 렌더로 확인할 수
  없다(구현 결정 194). 여기서 지킬 것은 **여덟 줄이 다 서고, 지금 레벨이 켜지고,
  못 고를 때는 까닭이 글자로 남는가**다.
*/

describe('ScenarioLevelPanel', () => {
  it('레벨 여덟 줄이 다 선다 — 표에서 한 줄이 빠지면 고를 수 없는 난이도가 생긴다', () => {
    const html = renderToStaticMarkup(
      <ScenarioLevelPanel level={1} locked={null} onPick={() => {}} />,
    )
    for (const row of SCENARIO_LEVELS) {
      expect(html).toContain(`시나리오 레벨 ${row.level}`)
    }
    expect(SCENARIO_LEVELS).toHaveLength(8)
  })

  it('지금 레벨만 켜진다', () => {
    const html = renderToStaticMarkup(
      <ScenarioLevelPanel level={3} locked={null} onPick={() => {}} />,
    )
    expect(html.match(/lvl__row--on/g)).toHaveLength(1)
    expect(html.match(/aria-pressed="true"/g)).toHaveLength(1)
  })

  it('못 고르면 까닭이 글자로 남는다 — 눌러도 안 되는 채로 두지 않는다', () => {
    const html = renderToStaticMarkup(
      <ScenarioLevelPanel level={1} locked="여기서는 못 고른다" onPick={() => {}} />,
    )
    expect(html).toContain('여기서는 못 고른다')
    expect(html.match(/disabled/g)).toHaveLength(SCENARIO_LEVELS.length)
  })

  it('딸려 나오는 넷을 함께 적는다 — 올리면 얼마가 되는지 보려고 여는 표다', () => {
    const html = renderToStaticMarkup(
      <ScenarioLevelPanel level={0} locked={null} onPick={() => {}} />,
    )
    const row = SCENARIO_LEVELS[7]
    expect(html).toContain(`>${row.trapDamage}<`)
    expect(html).toContain(`>${row.bonusXp}<`)
  })
})
