/**
 * 행낭 배치의 자료구조.
 *
 * **저장 정책은 SPEC 5.2가 정본이다.** 여기 있는 것은 전부 '사용자 설정'이라
 * `localStorage`에 남는다. 뽑은 카드·원소 상태 같은 도구 런타임 상태는 이쪽에
 * 넣지 않는다 — 그것은 메모리 전용이다.
 */

/** 보드에 실제로 놓인 위젯 하나. */
export interface WidgetInstance {
  /** 같은 종류를 여러 개 놓을 수 있으므로 정의 id와 별개로 둔다. */
  instanceId: string
  /** 레지스트리 키. 저장 데이터의 일부이므로 한번 정하면 바꾸지 않는다. */
  definitionId: string
  x: number
  y: number
  w: number
  h: number
}

/**
 * 한 열 수에 대한 배치 목록.
 *
 * 행 수는 저장하지 않는다. 높이에서 파생되고 툴바 위치에 따라서도 변하므로
 * 저장하면 실제와 어긋난 값이 남는다. 열 수만이 안정적인 키다.
 */
export interface Layout {
  columns: number
  widgets: WidgetInstance[]
}

export type ToolbarPosition = 'top' | 'left'

/** `localStorage`에 실제로 들어가는 것. */
export interface SatchelSettings {
  version: number
  /** 키는 열 수. */
  layouts: Record<number, Layout>
  /** 사용자가 직접 고른 툴바 위치. 고르지 않았으면 기기별 기본값을 쓴다(M5). */
  toolbarPosition: ToolbarPosition | null
}

export const SETTINGS_VERSION = 1

export function emptySettings(): SatchelSettings {
  return { version: SETTINGS_VERSION, layouts: {}, toolbarPosition: null }
}

export function emptyLayout(columns: number): Layout {
  return { columns, widgets: [] }
}
