import { sanitizeCharacterId } from '../../roster'

/**
 * HP/XP 트래커의 인스턴스별 설정.
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ **누구의 다이얼인가 — 이것 하나뿐이다.**                                  │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * 값은 위젯 인스턴스에 묶여 있었다(구현 결정 29). 인스턴스 id는 기기마다 다르므로
 * **판을 나눠도 서로 다른 열쇠를 본다** — 넷이 앉아도 아무것도 겹치지 않는다.
 * 캐릭터를 고르면 파티원 모두가 같은 열쇠를 보고, 한 사람의 체력이 한 자리에
 * 모인다.
 *
 * **안 골라도 도구는 그대로 돈다.** 로그인 전이거나 캐릭터를 아직 안 만들었을 때
 * 위젯이 죽으면 안 된다(절대 원칙 3). 그때는 종전대로 인스턴스 id를 열쇠로 쓴다.
 *
 * 설정은 이것뿐이라 **최대 체력이나 이름을 여기 담지 않는다.** HP/XP는 숫자를
 * 세는 것까지만 들어왔다(SPEC 1장) — 최대 체력을 모르고 피해를 적용하지 않는다.
 */
export interface HpXpSettings {
  /** 어느 캐릭터의 것인가. 안 골랐으면 `null`. */
  characterId: string | null
}

export function defaultHpXpSettings(): HpXpSettings {
  return { characterId: null }
}

export function sanitizeHpXpSettings(raw: unknown): HpXpSettings {
  if (typeof raw !== 'object' || raw === null) return defaultHpXpSettings()
  return { characterId: sanitizeCharacterId((raw as Partial<HpXpSettings>).characterId) }
}
