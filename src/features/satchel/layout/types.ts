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

/** 저장되는 것 — `localStorage`에도, 서버의 `satchel_settings.settings`에도. */
export interface SatchelSettings {
  version: number
  /**
   * 마지막으로 고친 시각.
   *
   * **기기가 어긋났을 때 늦게 고친 쪽이 이기는 판정에 쓴다**(SPEC 5.3). 이것이
   * 없으면 폰에서 짜 놓은 배치가 태블릿을 한 번 열었다는 이유로 지워진다.
   *
   * 옛 저장물에는 없다. 그때는 0으로 읽히는데, **빈 설정은 애초에 올려보내지
   * 않으므로**(`satchelNet`) 0짜리가 알맹이 있는 것을 밀어내지 못한다.
   */
  updatedAt: number
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
  /**
   * 위젯 **인스턴스별** 회전. 없으면 0도.
   *
   * 보드게임 상은 마주 앉거나 사방에서 가운데를 본다. 태블릿을 상 가운데 놓으면
   * 누군가에게는 모든 것이 거꾸로다. 위젯마다 방향을 돌려 각자 제 앞의 것을 제
   * 방향으로 보게 한다.
   *
   * **`widgetSettings`와 마찬가지로 레이아웃 바깥에 둔다.** 레이아웃은 열 수마다
   * 따로 저장되지만 어느 쪽에 앉았는지는 화면 폭과 무관하다 — 안에 넣으면 폰과
   * 태블릿에서 방향이 따로 놀게 된다.
   */
  widgetRotations: Record<string, Rotation>
}

/** 90도 단위. 임의 각도는 두지 않는다 — 상 둘레에 앉는 자리가 넷이다. */
export type Rotation = 0 | 90 | 180 | 270

export const ROTATIONS: readonly Rotation[] = [0, 90, 180, 270]

/** 다음 방향. 버튼을 누를 때마다 시계 방향으로 한 칸. */
export function nextRotation(rotation: Rotation): Rotation {
  return ROTATIONS[(ROTATIONS.indexOf(rotation) + 1) % ROTATIONS.length]
}

export function isRotation(value: unknown): value is Rotation {
  return value === 0 || value === 90 || value === 180 || value === 270
}

/** 90·270도에서는 가로세로가 바뀐다. 회전 전에 그 모양으로 그려야 한다. */
export function swapsAxes(rotation: Rotation): boolean {
  return rotation === 90 || rotation === 270
}

export const SETTINGS_VERSION = 1

export function emptySettings(): SatchelSettings {
  return {
    version: SETTINGS_VERSION,
    updatedAt: 0,
    layouts: {},
    toolbarPosition: 'auto',
    showWidgetTitles: true,
    widgetSettings: {},
    widgetRotations: {},
  }
}

/**
 * 아직 아무것도 짜지 않은 것인가.
 *
 * **빈 것을 서버에 올려보내지 않기 위해 쓴다.** 새 기기에서 처음 열면 빈 설정이
 * 만들어지는데, 그것이 올라가면 다른 기기에 있던 배치가 늦게 올라왔다는 이유로
 * 밀린다. 놓인 위젯이 하나도 없고 화면 설정도 기본이면 지킬 것이 없는 상태다.
 */
export function isEmptySettings(settings: SatchelSettings): boolean {
  const hasWidgets = Object.values(settings.layouts).some((l) => l.widgets.length > 0)
  return (
    !hasWidgets &&
    settings.toolbarPosition === 'auto' &&
    settings.showWidgetTitles &&
    Object.keys(settings.widgetSettings).length === 0 &&
    Object.keys(settings.widgetRotations).length === 0
  )
}

export function emptyLayout(columns: number): Layout {
  return { columns, widgets: [] }
}
