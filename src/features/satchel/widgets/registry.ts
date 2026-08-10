import { HpXpTracker } from './hpxp/HpXpTracker'
import { RoundTracker } from './round/RoundTracker'
import { isHpXpSizeAllowed } from './hpxp/hpxp'
import { HpXpSettingsEditor } from './hpxp/HpXpSettingsEditor'
import { sanitizeHpXpSettings } from './hpxp/settings'
import { ElementTracker } from './elements/ElementTracker'
import { isElementTrackerSizeAllowed } from './elements/layout'
import { ElementSettingsEditor } from './elements/ElementSettingsEditor'
import { sanitizeElementSettings } from './elements/settings'
import { GoldCounter } from './gold/GoldCounter'
import { GoldSettingsEditor } from './gold/GoldSettingsEditor'
import { isGoldSizeAllowed } from './gold/gold'
import { sanitizeGoldSettings } from './gold/settings'
import { AttackDeck } from './deck/AttackDeck'
import { DeckSettingsEditor } from './deck/DeckSettingsEditor'
import { sanitizeAttackDeckSettings } from './deck/settings'
import type { WidgetDefinition } from './types'

/**
 * 위젯 레지스트리.
 *
 * **여기 있는 것이 곧 채택 도구다**(SPEC 1장). 배치를 시험하려고 두었던 Test
 * 위젯은 실제 도구가 갖춰져 걷어냈다(2026-08-10) — 도구 띠에 쓸 일 없는 것이
 * 섞여 있으면 고르는 데 방해만 된다.
 */
const DEFINITIONS: WidgetDefinition[] = [
  {
    id: 'elements',
    // 도구 이름은 무엇인지 즉시 알아야 하는 정보다. 정취보다 명확함이 먼저다.
    name: '원소 트래커',
    defaultSize: { w: 6, h: 2 },
    // 짧은 쪽 제한은 1이고, "긴 쪽이 6 이상"은 isSizeAllowed가 본다.
    minSize: { w: 1, h: 1 },
    // 인스턴스 제한 없음 — 여러 개 놓고 각기 다른 원소를 골라 볼 수 있다.
    isSizeAllowed: isElementTrackerSizeAllowed,
    settings: {
      sanitize: sanitizeElementSettings,
      Editor: ElementSettingsEditor,
    },
    Component: ElementTracker,
  },
  {
    id: 'gold',
    // 무엇인지 즉시 알아야 하는 이름이다. HP/XP 트래커와 같은 선.
    name: '골드 카운터',
    // **한 칸에서 크지 않는다.** 담는 것이 숫자 하나뿐이라 넓혀도 빈 자리만
    // 생긴다. 대신 격자가 꽉 차 가도 끼워 넣을 틈이 있다.
    defaultSize: { w: 1, h: 1 },
    minSize: { w: 1, h: 1 },
    maxSize: { w: 1, h: 1 },
    // 크기 손잡이가 아예 안 나오도록 여기서도 못박는다 — 최대·최소만으로는
    // 파생 경로에서 다른 크기가 새어 들 수 있다.
    isSizeAllowed: isGoldSizeAllowed,
    // 인스턴스 제한 없음 — 사람마다 하나씩 놓는다.
    settings: { sanitize: sanitizeGoldSettings, Editor: GoldSettingsEditor },
    Component: GoldCounter,
  },
  {
    id: 'hpxp',
    // 형님 지시 — 여관 문체로 바꾸지 않는다. 무엇인지 즉시 알아야 하는 이름이다.
    name: 'HP/XP 트래커',
    defaultSize: { w: 4, h: 2 },
    // 짧은 쪽 1칸까지 줄어든다. "긴 쪽 4칸, 짧은 쪽 2칸까지"는 isSizeAllowed가 본다 —
    // maxSize 한 쌍으로는 4×2와 2×4를 함께 허용할 수 없다.
    minSize: { w: 1, h: 1 },
    // 인스턴스 제한 없음 — 사람마다 하나씩 놓는다. 값은 서로 섞이지 않는다.
    isSizeAllowed: isHpXpSizeAllowed,
    // 누구의 다이얼인지 고른다. 골라야 전투에서 파티원과 값이 이어진다.
    settings: { sanitize: sanitizeHpXpSettings, Editor: HpXpSettingsEditor },
    Component: HpXpTracker,
  },
  {
    id: 'deck',
    name: '공격 보정 덱',
    // 더미와 버린 덱이 나란히 놓이는 크기. 좁히면 버린 덱을 접는다.
    defaultSize: { w: 2, h: 2 },
    // 한 칸까지 줄어든다 — 더미만 남고 공개된 카드가 그 자리에 겹친다.
    minSize: { w: 1, h: 1 },
    // 인스턴스 제한 없음. 사람마다 자기 덱을 놓는다(실물의 1·2·3·4·M과 같다).
    settings: {
      sanitize: sanitizeAttackDeckSettings,
      Editor: DeckSettingsEditor,
    },
    Component: AttackDeck,
  },
  {
    id: 'round',
    name: '라운드 트래커',
    defaultSize: { w: 2, h: 2 },
    // 크기 자유 — 한 칸짜리 표식으로도, 넓게 펴서 멀리서 보이게도 쓴다.
    minSize: { w: 1, h: 1 },
    // 인스턴스 제한 없음. 값은 행낭 전체에 하나뿐이라 몇 개를 놓든 같은 것을 본다.
    Component: RoundTracker,
  },
]

/** 정의가 앞뒤가 맞는지 확인한다. 어긋난 정의는 개발 중에 즉시 드러나야 한다. */
export function validateDefinition(definition: WidgetDefinition): string | null {
  const { id, minSize, defaultSize, maxSize, isSizeAllowed } = definition
  if (!id) return '빈 id'
  if (minSize.w < 1 || minSize.h < 1) return `${id}: 최소 크기가 1보다 작다`
  if (defaultSize.w < minSize.w || defaultSize.h < minSize.h) {
    return `${id}: 기본 크기가 최소 크기보다 작다`
  }
  if (maxSize && (maxSize.w < defaultSize.w || maxSize.h < defaultSize.h)) {
    return `${id}: 최대 크기가 기본 크기보다 작다`
  }
  // 기본 크기가 스스로의 제약을 못 넘으면 위젯을 놓을 수조차 없다.
  // 설정은 기본값으로 본다 — 새로 놓을 때의 상태다.
  if (isSizeAllowed && !isSizeAllowed(defaultSize, definition.settings?.sanitize(undefined))) {
    return `${id}: 기본 크기가 isSizeAllowed를 통과하지 못한다`
  }
  return null
}

const BY_ID = new Map<string, WidgetDefinition>()
for (const definition of DEFINITIONS) {
  const problem = validateDefinition(definition)
  if (problem) throw new Error(`위젯 정의가 잘못됐다 — ${problem}`)
  BY_ID.set(definition.id, definition)
}

export const widgetDefinitions: readonly WidgetDefinition[] = DEFINITIONS

export function getWidgetDefinition(id: string): WidgetDefinition | undefined {
  return BY_ID.get(id)
}

export function isKnownWidget(id: string): boolean {
  return BY_ID.has(id)
}

/** 파생·재배치에 쓰는 최소 크기 조회. 모르는 위젯은 1×1로 본다. */
export function minSizeOf(id: string): { w: number; h: number } {
  return BY_ID.get(id)?.minSize ?? { w: 1, h: 1 }
}

/**
 * 이 위젯이 그 크기로 있어도 되는가.
 *
 * **크기가 바뀔 수 있는 모든 길목이 이것을 봐야 한다** — 크기 조절, 열 수 파생,
 * 새로 놓기. 한 군데라도 빠뜨리면 규칙을 어긴 크기가 저장된다.
 * 모르는 위젯은 통과시킨다(어차피 렌더되지 않고 걸러진다).
 */
export function isSizeAllowedFor(
  id: string,
  size: { w: number; h: number },
  settings?: unknown,
): boolean {
  const definition = BY_ID.get(id)
  if (!definition) return true
  if (size.w < definition.minSize.w || size.h < definition.minSize.h) return false
  if (definition.maxSize && (size.w > definition.maxSize.w || size.h > definition.maxSize.h)) {
    return false
  }
  return definition.isSizeAllowed?.(size, settings) ?? true
}

/** 저장된 값을 그 위젯이 쓸 수 있는 설정으로 다듬는다. 설정을 안 쓰면 undefined. */
export function sanitizeSettingsFor(id: string, raw: unknown): unknown {
  return BY_ID.get(id)?.settings?.sanitize(raw)
}

/** 설정 화면을 지원하는가 — 톱니바퀴 버튼을 낼지 정한다. */
export function hasSettings(id: string): boolean {
  return BY_ID.get(id)?.settings != null
}
