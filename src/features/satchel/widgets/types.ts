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
}

export interface WidgetSettingsEditorProps {
  value: unknown
  onChange: (next: unknown) => void
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
  Editor: ComponentType<WidgetSettingsEditorProps>
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
