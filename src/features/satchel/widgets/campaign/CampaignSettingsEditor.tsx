import type { WidgetSettingsEditorProps } from '../types'
import { MAX_LEVEL, MIN_LEVEL, rowFor } from '../../../rules/scenarioLevel'
import { sanitizeCampaignSettings } from './settings'

/**
 * 모험 밖에서 쓸 시나리오 레벨.
 *
 * **모험에 앉으면 그 판의 레벨이 이긴다**(`0032`) — 여기 값은 혼자 굴려 볼 때만
 * 쓰인다. 그 사실을 화면에 적어 둔다: 안 적으면 「고쳐도 안 바뀐다」로 읽힌다.
 */
export function CampaignSettingsEditor({ value, onChange }: WidgetSettingsEditorProps) {
  const { level } = sanitizeCampaignSettings(value)
  const row = rowFor(level)

  return (
    <div className="deck-settings">
      <p className="deck-settings__hint">
        모험에 앉아 있으면 <strong>그 판의 레벨</strong>이 쓰인다. 여기 값은 앉지 않았을 때의
        것이다.
      </p>

      <div className="cstset">
        <button
          type="button"
          className="tally__caret"
          aria-label="레벨 1 내리기"
          disabled={level <= MIN_LEVEL}
          onClick={() => onChange({ level: level - 1 })}
        >
          ‹
        </button>
        <b className="cstset__n sl-numeral">{level}</b>
        <button
          type="button"
          className="tally__caret"
          aria-label="레벨 1 올리기"
          disabled={level >= MAX_LEVEL}
          onClick={() => onChange({ level: level + 1 })}
        >
          ›
        </button>
      </div>

      <p className="deck-settings__hint">
        금화 {row.goldPerCoin} · 함정 {row.trapDamage} · 위험 지형 {row.hazardDamage} · 경험{' '}
        {row.bonusXp}
      </p>
    </div>
  )
}
