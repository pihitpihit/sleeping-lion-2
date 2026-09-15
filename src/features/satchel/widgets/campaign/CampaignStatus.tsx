import { useEffect, useState } from 'react'
import type { WidgetProps } from '../types'
import { useBoardSize } from '../../useBoardSize'
import { useBattleStore } from '../../battle/battleStore'
import { useRoundStore } from '../round/roundStore'
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
export function CampaignStatus({ mode, settings, onSettingsChange }: WidgetProps) {
  const { level: fallback } = sanitizeCampaignSettings(settings)
  const battle = useBattleStore((s) => s.battle)
  const setBattleLevel = useBattleStore((s) => s.setLevel)
  const [open, setOpen] = useState(false)

  /* 라운드 기록. 팝업이 보여 줄 값이라 여기서 읽어 넘긴다. */
  const round = useRoundStore((s) => s.round)
  const startedAt = useRoundStore((s) => s.startedAt)
  const laps = useRoundStore((s) => s.laps)

  /*
    지금 시각. **팝업이 떠 있는 동안에만 잰다** — 닫혀 있을 때 1초마다 다시 그리면
    상 위의 다른 위젯까지 함께 느려진다. 렌더 중에 부르지 않는 까닭은 구현 결정 12다.
  */
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!open) return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [open])

  const level = battle?.level ?? fallback
  const row = rowFor(level)

  /*
    ┌────────────────────────────────────────────────────────────────────────┐
    │ **고른다고 창이 닫히지 않는다**(형님이 정했다).                         │
    └────────────────────────────────────────────────────────────────────────┘

    상 위에서 「한 칸 올리면 얼마가 되는가」를 보려고 펼친 표다(구현 결정 443) —
    고르자마자 닫히면 **바뀐 값이 표의 어디에 앉는지 못 본다.** 한 칸 더 올릴지도
    거기서 정한다. 나가는 길은 ×·Escape·배경 누르기다.

    서버가 거절하면 옛 값으로 되돌아가는데(구현 결정 445) 그것도 표 위에서
    그대로 보인다 — 닫아 버리면 되돌아간 줄 모른다.
  */
  function pick(next: number) {
    if (battle !== null) void setBattleLevel(next)
    else onSettingsChange({ level: next })
  }

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

      {/*
        ┌────────────────────────────────────────────────────────────────────┐
        │ **위젯 전체가 하나의 단추다**(형님이 정했다).                       │
        └────────────────────────────────────────────────────────────────────┘

        머리만 눌리게 두었더니 어디를 눌러야 열리는지 알 수 없었다. 값을 늘어놓는
        `<ul>`을 단추 안에 넣을 수는 없으므로(HTML이 허락하지 않는다) **투명한
        단추를 위에 덮는다** — 읽기만 하는 위젯이라 밑의 글을 집을 일이 없다.

        편집 중에는 안 낸다 — 자리를 옮기려다 팝업이 뜨면 곤란하다.
      */}
      {mode !== 'edit' && (
        <button
          type="button"
          className="cst__open"
          aria-label={`캠페인 상태 자세히 보기. 지금 시나리오 레벨 ${level}, ${round}라운드.`}
          onClick={() => setOpen(true)}
        />
      )}

      {open && (
        <ScenarioLevelDialog
          level={level}
          locked={null}
          round={round}
          startedAt={startedAt}
          laps={laps}
          now={now}
          onPick={pick}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  )
}
