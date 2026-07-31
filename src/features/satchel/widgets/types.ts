import type { ComponentType } from 'react'

/** 편집 중에는 위젯이 상호작용을 받지 않는다. 드래그하려다 카드가 뽑히면 곤란하다. */
export type SatchelMode = 'play' | 'edit'

export interface WidgetProps {
  instanceId: string
  /** 이 위젯이 차지한 셀 크기. 내용 밀도를 바꾸는 데 쓴다. */
  size: { w: number; h: number }
  mode: SatchelMode
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
  Component: ComponentType<WidgetProps>
}
