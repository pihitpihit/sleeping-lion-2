import { clampLevel } from '../../../rules/scenarioLevel'

/**
 * 캠페인 상태 위젯의 설정.
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ **모험에 앉아 있으면 그 판의 레벨이 이긴다.**                             │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * 모험을 펼 때 참가자들의 레벨에서 셈해 정한 값이 있다(`0032`) — 그것이 사실에
 * 가깝다. 여기 값은 **혼자 굴려 볼 때** 쓴다: 앉지 않아도 판은 돌아야 한다
 * (절대 원칙 3).
 */
export interface CampaignWidgetSettings {
  level: number
}

export function defaultCampaignSettings(): CampaignWidgetSettings {
  return { level: 1 }
}

export function sanitizeCampaignSettings(raw: unknown): CampaignWidgetSettings {
  if (typeof raw !== 'object' || raw === null) return defaultCampaignSettings()
  const value = raw as Partial<CampaignWidgetSettings>
  if (typeof value.level !== 'number' || !Number.isFinite(value.level)) {
    return defaultCampaignSettings()
  }
  return { level: clampLevel(value.level) }
}
