import { sanitizeCharacterId } from '../../roster'

/**
 * 골드 카운터의 인스턴스별 설정 — 누구의 것인지 하나뿐이다.
 *
 * HP/XP와 같은 이유다(`hpxp/settings.ts`). 위젯 인스턴스 id는 기기마다 다르므로
 * 그것을 열쇠로 쓰면 **전투에서 판을 나눠도 서로 다른 자리를 본다.** 캐릭터를
 * 고르면 파티원 모두가 같은 자리를 본다.
 *
 * **안 골라도 돈다.** 그때는 이 기기 안에서만 센다(절대 원칙 3).
 */
export interface GoldSettings {
  characterId: string | null
}

export function defaultGoldSettings(): GoldSettings {
  return { characterId: null }
}

export function sanitizeGoldSettings(raw: unknown): GoldSettings {
  if (typeof raw !== 'object' || raw === null) return defaultGoldSettings()
  return { characterId: sanitizeCharacterId((raw as Partial<GoldSettings>).characterId) }
}
