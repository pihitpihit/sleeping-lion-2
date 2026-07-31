import { TestWidget } from './TestWidget'
import { ElementTracker } from './elements/ElementTracker'
import { isElementTrackerSizeAllowed } from './elements/layout'
import { ElementSettingsEditor } from './elements/ElementSettingsEditor'
import { sanitizeElementSettings } from './elements/settings'
import type { WidgetDefinition } from './types'

/**
 * 위젯 레지스트리.
 *
 * SPEC 1장이 채택 도구를 셋으로 한정하지만 Test는 개발용 예외다. 실제 도구
 * (원소 트래커 / 공격 보정 덱 / 주도권 정렬)가 갖춰지면 뺄지 판단한다.
 */
const DEFINITIONS: WidgetDefinition[] = [
  {
    id: 'test',
    name: 'Test',
    defaultSize: { w: 2, h: 2 },
    minSize: { w: 1, h: 1 },
    // 최대 제한 없음 — 격자 전체까지 늘릴 수 있어야 크기 조절을 시험할 수 있다.
    // 인스턴스 제한도 없음 — 여러 개 놓고 겹침·재배치를 봐야 한다.
    Component: TestWidget,
  },
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
