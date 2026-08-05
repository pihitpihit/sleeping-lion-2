import {
  CARD_KINDS,
  MAX_PER_KIND,
  STANDARD_COMPOSITION,
  compositionSize,
  countOf,
  type DeckComposition,
} from './deck'

/**
 * 공격 보정 덱의 인스턴스별 설정.
 *
 * **사용자 설정이다** — `localStorage`에 남는다(SPEC 5.2가 "덱 구성도 사용자
 * 설정에 속한다"고 미리 적어 두었다). 뽑은 카드와 버린 더미(도구 런타임)는
 * 메모리에만 있고 새로고침하면 초기화된다. 둘은 성격이 다르다.
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ **덱 구성의 정본은 캐릭터의 퍽이다. 여기 값은 퍽을 못 읽을 때 쓴다.**     │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * SPEC 1장이 2026-08-05에 개정되어 공격 보정 덱은 캐릭터의 퍽을 읽는다. 순서를
 * 정하는 것은 `perks.ts`의 `resolveComposition`이며, **퍽을 읽을 수 있으면 그것이
 * 이긴다** — 사람이 적어 둔 값보다 캐릭터가 실제로 가진 퍽이 사실에 가깝다.
 *
 * 여기 값은 **퍽을 읽을 수 없을 때** 쓰인다. 로그인 전이거나, 캐릭터를 고르지
 * 않았거나, 축 ①이 아직 서지 않은 지금이 그렇다. 절대 원칙 3(offline-first)에
 * 따라 그런 때에도 덱은 돌아가야 한다.
 *
 * **클래스별 퍽 목록은 담지 않는다.** 그것은 게임 콘텐츠이므로 SPEC 3장에 걸린다.
 * 우리가 다루는 것은 종류와 장수까지다.
 */
export interface AttackDeckSettings {
  /** 종류 id → 장수. */
  composition: Record<string, number>
}

export function defaultAttackDeckSettings(): AttackDeckSettings {
  return { composition: { ...STANDARD_COMPOSITION } }
}

function clampCount(raw: unknown): number | null {
  if (typeof raw !== 'number' || !Number.isFinite(raw)) return null
  return Math.max(0, Math.min(MAX_PER_KIND, Math.trunc(raw)))
}

/**
 * 저장된 값에서 쓸 수 있는 설정을 건져낸다.
 *
 * 없거나 망가졌거나 종류 목록이 바뀐 뒤여도 반드시 유효한 값을 낸다. **모르는
 * 종류는 버린다** — 남겨두면 `buildDeck`이 무시할 뿐인데 저장소에는 영원히 쌓인다.
 */
export function sanitizeAttackDeckSettings(raw: unknown): AttackDeckSettings {
  if (typeof raw !== 'object' || raw === null) return defaultAttackDeckSettings()

  const value = raw as Partial<AttackDeckSettings>
  if (typeof value.composition !== 'object' || value.composition === null) {
    return defaultAttackDeckSettings()
  }

  const source = value.composition as Record<string, unknown>
  const composition: Record<string, number> = {}
  for (const kind of CARD_KINDS) {
    const count = clampCount(source[kind.id])
    if (count !== null) composition[kind.id] = count
  }

  // 한 장도 없는 덱은 만들지 않는다. 뽑을 것이 없으면 위젯이 고장난 것처럼 보인다.
  if (compositionSize(composition) === 0) return defaultAttackDeckSettings()

  return { composition }
}

/** 지금 구성이 표준 덱 그대로인가 — '표준으로 되돌리기'를 낼지 정한다. */
export function isStandardComposition(composition: DeckComposition): boolean {
  return CARD_KINDS.every(
    (kind) => countOf(composition, kind.id) === countOf(STANDARD_COMPOSITION, kind.id),
  )
}
