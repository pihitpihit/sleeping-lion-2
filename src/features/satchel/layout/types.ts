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

/** 실제로 그려지는 위치. */
export type ToolbarPosition = 'top' | 'left'

/**
 * 사용자가 고를 수 있는 값. `auto`는 기기와 방향에 맡긴다는 뜻이며,
 * 회전하면 따라 바뀐다. 고정값을 고르면 회전해도 그대로다.
 */
export type ToolbarPreference = ToolbarPosition | 'auto'

/** `localStorage`에 실제로 들어가는 것. */
export interface SatchelSettings {
  version: number
  /** 키는 열 수. */
  layouts: Record<number, Layout>
  /** 툴바 위치 선호. `auto`면 기기·방향에 맡긴다. */
  toolbarPosition: ToolbarPreference
  /**
   * 위젯 제목 띠를 보일지.
   *
   * 끄면 그만큼 공간이 위젯 내용에 돌아간다 — 위젯은 자기 영역을 관측해
   * 스스로 다시 배치하므로 별도 처리가 필요 없다.
   */
  showWidgetTitles: boolean
  /**
   * 위젯 **인스턴스별** 설정. 모양은 위젯마다 다르므로 unknown으로 둔다.
   *
   * 레이아웃 안이 아니라 바깥에 둔다 — 레이아웃은 열 수마다 따로 저장되지만
   * `instanceId`는 파생을 거쳐도 유지되므로, 안에 넣으면 열 수마다 복제되어
   * 서로 어긋난다.
   */
  widgetSettings: Record<string, unknown>
}

export const SETTINGS_VERSION = 1

export function emptySettings(): SatchelSettings {
  return {
    version: SETTINGS_VERSION,
    layouts: {},
    toolbarPosition: 'auto',
    showWidgetTitles: true,
    widgetSettings: {},
  }
}

export function emptyLayout(columns: number): Layout {
  return { columns, widgets: [] }
}
