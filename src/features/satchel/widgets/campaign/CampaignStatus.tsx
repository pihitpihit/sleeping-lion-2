import type { WidgetProps } from '../types'
import { useBoardSize } from '../../useBoardSize'
import { useBattleStore } from '../../battle/battleStore'
import { rowFor } from '../../../rules/scenarioLevel'
import { sanitizeCampaignSettings } from './settings'
import './CampaignStatus.css'

/**
 * 캠페인 상태 — **지금 판의 난이도와 그에 딸린 값들.**
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ **적지도 굴리지도 않는다 — 읽는 위젯이다.**                               │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * 시나리오 레벨 하나에서 넷이 따라 나온다(`rules/scenarioLevel.ts`): 금화 환산,
 * 함정 피해, 위험 지형(함정의 절반, 내림), 보너스 경험. 상 위에서 자꾸 묻게 되는
 * 수들이라 한자리에 세워 둔다.
 *
 * **모험에 앉아 있으면 그 판의 레벨이 이긴다** — 펼 때 참가자들의 레벨에서 셈해
 * 정한 값이라 사실에 가깝다. 안 앉았으면 설정에 적어 둔 값으로 돈다.
 */
export function CampaignStatus({ settings }: WidgetProps) {
  const { level: fallback } = sanitizeCampaignSettings(settings)
  const battle = useBattleStore((s) => s.battle)
  const level = battle?.level ?? fallback
  const row = rowFor(level)

  const { ref, size } = useBoardSize<HTMLDivElement>()
  /* 좁으면 값 이름을 줄인다 — 한 칸짜리로도 놓을 수 있어야 한다. */
  const tight = size.width < 220

  return (
    <div className="cst" ref={ref}>
      <div className="cst__head">
        <span className="cst__title">{tight ? '난이도' : '시나리오 레벨'}</span>
        <b className="cst__level sl-numeral">{level}</b>
      </div>

      <ul className="cst__facts">
        <li className="cst__fact">
          <span className="cst__name">{tight ? '금화' : '금화 환산'}</span>
          <b className="sl-numeral">{row.goldPerCoin}</b>
        </li>
        <li className="cst__fact">
          <span className="cst__name">{tight ? '함정' : '함정 피해'}</span>
          <b className="sl-numeral">{row.trapDamage}</b>
        </li>
        <li className="cst__fact">
          <span className="cst__name">{tight ? '지형' : '위험 지형'}</span>
          <b className="sl-numeral">{row.hazardDamage}</b>
        </li>
        <li className="cst__fact">
          <span className="cst__name">{tight ? '경험' : '보너스 경험'}</span>
          <b className="sl-numeral">{row.bonusXp}</b>
        </li>
      </ul>

      {battle === null && <span className="cst__solo">모험 밖 — 설정의 레벨</span>}
    </div>
  )
}
