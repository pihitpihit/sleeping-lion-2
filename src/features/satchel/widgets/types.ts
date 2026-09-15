import type { ComponentType } from 'react'
import type { Rotation } from '../layout'

/** 편집 중에는 위젯이 상호작용을 받지 않는다. 드래그하려다 카드가 뽑히면 곤란하다. */
export type SatchelMode = 'play' | 'edit'

export interface WidgetProps {
  instanceId: string
  /** 이 위젯이 차지한 셀 크기. 내용 밀도를 바꾸는 데 쓴다. */
  size: { w: number; h: number }
  mode: SatchelMode
  /**
   * 이 위젯이 돌아간 각도.
   *
   * **손가락을 읽는 위젯만 쓴다.** 포인터 좌표는 화면 기준으로 오는데 내용은
   * 돌아가 있다. 180도로 돌려 마주 앉은 사람이 제 기준 '위로' 끄는 것은 화면
   * 기준으로는 '아래로'다 — 그대로 쓰면 값이 거꾸로 움직인다.
   */
  rotation: Rotation
  /**
   * 이 인스턴스의 설정. 스토어가 늘 `sanitize`를 거쳐 넘기므로 위젯은
   * 자기 타입으로 좁혀 받아도 된다.
   */
  settings: unknown
  /**
   * 설정을 고친다.
   *
   * ┌────────────────────────────────────────────────────────────────────────┐
   * │ **위젯이 행낭 스토어를 직접 부르지 않는다.**                            │
   * └────────────────────────────────────────────────────────────────────────┘
   *
   * 부르면 고리가 생긴다: `satchelStore` → `registry` → 위젯 → `satchelStore`.
   * 번들러가 모듈 차례를 어떻게 잡느냐에 따라 **아직 만들어지지 않은 것을 읽는
   * 자리**가 되고, 그때는 화면이 통째로 안 뜬다(구현 결정 585와 같은 종류의
   * 고장이다 — 아무 메시지도 안 남는다).
   *
   * 판을 굴리다가 설정을 여는 위젯(HP/XP·캠페인 상태)이 쓴다. 톱니가 여는
   * 화면은 종전대로 `SatchelPage`가 맡는다.
   */
  onSettingsChange: (next: unknown) => void
}

export interface WidgetSettingsEditorProps {
  value: unknown
  onChange: (next: unknown) => void
  /**
   * 어느 위젯의 설정인가. **아직 놓이지 않았으면 `null`.**
   *
   * 설정을 읽고 쓰는 데는 필요 없다. **위젯이 담고 있는 런타임 값에 손대야 할 때**
   * 쓴다 — 보정 덱의 '덱 새로 짜기'가 그렇다. 값이 담긴 열쇠는 인스턴스(또는 고른
   * 캐릭터)이므로 그것을 모르면 어느 덱을 다시 짤지 알 수 없다.
   *
   * 놓기 전에 묻는 팝업(`pendingAdd`)에는 인스턴스가 아직 없다. 그때는 다시 짤
   * 판도 없으므로 `null`이 맞다.
   */
  instanceId: string | null
}

/**
 * 설정을 지원하는 위젯이 내놓는 것.
 *
 * 레지스트리는 서로 다른 모양의 설정을 한 배열에 담으므로 `unknown`으로 들고
 * 있는다. 제네릭으로 끝까지 끌고 가면 등록·조회·저장 모든 곳에 타입 매개변수가
 * 번진다. **경계에서만 좁힌다** — 저장소에서 읽은 값은 늘 `sanitize`를 거치므로
 * 위젯 컴포넌트는 안심하고 자기 타입으로 받는다.
 */
export interface WidgetSettingsSpec {
  /** 없거나 망가진 값에서도 반드시 쓸 수 있는 값을 낸다. */
  sanitize: (raw: unknown) => unknown
  /**
   * 편집 모드의 톱니가 여는 화면. **없어도 된다.**
   *
   * ┌────────────────────────────────────────────────────────────────────────┐
   * │ **설정을 담되 톱니로 열지 않는 위젯이 있다.**                           │
   * └────────────────────────────────────────────────────────────────────────┘
   *
   * HP/XP 트래커가 그렇다 — 누구의 다이얼인지 고르는 일은 **판을 굴리다가**
   * 하는 것이라 편집 모드에 가둘 것이 아니다(형님이 정했다). 위젯이 제 모퉁이에
   * 단추를 두고 플레이 중에 연다. 그래도 `sanitize`는 있어야 한다 — 저장된
   * 값은 어느 경로로 들어왔든 거쳐야 한다.
   */
  Editor?: ComponentType<WidgetSettingsEditorProps>
}

export interface WidgetDefinition {
  /**
   * 레지스트리 키.
   *
   * **저장된 레이아웃의 일부다.** 이름을 바꾸면 기존 배치가 전부 '알 수 없는
   * 위젯'이 되어 버려진다. 한번 정하면 바꾸지 않는다.
   */
  id: string
  /** 툴바에 보일 이름. 화면 문구이므로 여관 문체를 따른다. */
  name: string
  defaultSize: { w: number; h: number }
  minSize: { w: number; h: number }
  /** 없으면 격자 크기까지. */
  maxSize?: { w: number; h: number }
  /** 없으면 무제한. 1이면 툴바에서 토글로 동작한다. */
  maxInstances?: number
  /**
   * `minSize`/`maxSize`로 표현할 수 없는 제약.
   *
   * 원소 트래커의 "가로 **혹은** 세로가 N칸 이상"이 그런 경우다. OR 조건이라
   * 한 쌍의 최소 크기로는 못 적는다 — `{6,6}`으로 두면 세로 막대(1×6)까지 막힌다.
   *
   * **설정에 따라 달라질 수 있다.** 원소를 둘만 고르면 긴 쪽이 2칸이면 된다.
   *
   * **크기가 바뀔 수 있는 모든 길목이 이 훅을 봐야 한다.** 크기 조절(M6),
   * 열 수 파생(M3), 새로 놓기(M4) 어느 하나라도 빠뜨리면 규칙을 어긴 크기가
   * 저장된다.
   */
  isSizeAllowed?: (size: { w: number; h: number }, settings: unknown) => boolean
  /** 설정을 지원하면 준다. 없으면 톱니바퀴 버튼이 나오지 않는다. */
  settings?: WidgetSettingsSpec
  Component: ComponentType<WidgetProps>
}
