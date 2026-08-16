import { useState } from 'react'
import type { WidgetProps } from '../types'
import { useBoardSize } from '../../useBoardSize'
import { useBattleStore } from '../../battle/battleStore'
import { useSatchelStore } from '../../store/satchelStore'
import { rowFor } from '../../../rules/scenarioLevel'
import { ScenarioLevelDialog } from './ScenarioLevelDialog'
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
 *
 * ── 눌러서 고른다
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ **고르는 자리와 표가 한 화면에 있어야 한다.**                             │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * 판을 열 때 정한 레벨이 늘 맞는 것은 아니다 — 상 위에서 「한 칸 올리자」가 나오고,
 * 그때 묻는 것은 언제나 **올리면 얼마가 되는가**다. 한 줄만 세워 둔 위젯으로는
 * 그것을 알 수 없어 표를 통째로 펼쳐 놓고 고르게 한다.
 *
 * 고른 것이 어디에 남는지는 지금 어디에 있느냐가 정한다:
 *   · 모험에 앉았으면 **판에 얹는다** — 상 위의 모두에게 간다(`0040`).
 *   · 안 앉았으면 **이 위젯의 설정에 남는다** — 혼자 굴려 볼 때 쓰는 값이다.
 *
 * **편집 중에는 안 열린다.** 자리를 옮기려다 팝업이 뜨면 곤란하다.
 */
export function CampaignStatus({ instanceId, mode, settings }: WidgetProps) {
  const { level: fallback } = sanitizeCampaignSettings(settings)
  const battle = useBattleStore((s) => s.battle)
  const setBattleLevel = useBattleStore((s) => s.setLevel)
  const setWidgetSettings = useSatchelStore((s) => s.setWidgetSettings)
  const [open, setOpen] = useState(false)

  const level = battle?.level ?? fallback
  const row = rowFor(level)

  function pick(next: number) {
    if (battle !== null) void setBattleLevel(next)
    else setWidgetSettings(instanceId, { level: next })
    setOpen(false)
  }

  const { ref, size } = useBoardSize<HTMLDivElement>()
  /* 좁으면 값 이름을 줄인다 — 한 칸짜리로도 놓을 수 있어야 한다. */
  const tight = size.width < 220

  return (
    <div className="cst" ref={ref}>
      <button
        type="button"
        className="cst__head"
        disabled={mode === 'edit'}
        aria-label={`시나리오 레벨 ${level} — 눌러서 표를 펼친다`}
        onClick={() => setOpen(true)}
      >
        <span className="cst__title">{tight ? '난이도' : '시나리오 레벨'}</span>
        <b className="cst__level sl-numeral">{level}</b>
      </button>

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

      {open && (
        <ScenarioLevelDialog
          level={level}
          locked={null}
          onPick={pick}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  )
}
