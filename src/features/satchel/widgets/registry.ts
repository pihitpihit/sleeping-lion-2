import { TestWidget } from './TestWidget'
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
]

/** 정의가 앞뒤가 맞는지 확인한다. 어긋난 정의는 개발 중에 즉시 드러나야 한다. */
export function validateDefinition(definition: WidgetDefinition): string | null {
  const { id, minSize, defaultSize, maxSize } = definition
  if (!id) return '빈 id'
  if (minSize.w < 1 || minSize.h < 1) return `${id}: 최소 크기가 1보다 작다`
  if (defaultSize.w < minSize.w || defaultSize.h < minSize.h) {
    return `${id}: 기본 크기가 최소 크기보다 작다`
  }
  if (maxSize && (maxSize.w < defaultSize.w || maxSize.h < defaultSize.h)) {
    return `${id}: 최대 크기가 기본 크기보다 작다`
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
