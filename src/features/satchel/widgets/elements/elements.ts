/**
 * 6원소의 정의와 상태.
 *
 * 아이콘은 `public/assets/creator-pack/elements/`에 있고 CC BY-NC-SA 4.0이다.
 * **`.tsx`에 인라인 SVG로 옮기지 않는다** — SA가 소스 파일로 번진다(SPEC 13.1).
 * 여기서는 파일 이름과 색만 들고 있다.
 */

/** 실물 원소판의 Strong / Waning / Inert. */
export type ElementState = 'strong' | 'waning' | 'inert'

export interface ElementDef {
  id: string
  /** 화면에 보이는 이름. */
  name: string
  /** `public/assets/creator-pack/elements/<file>.svg` */
  file: string
  /** 아이콘에서 뽑은 원본 색. 글레어에 쓴다. */
  color: string
}

/**
 * 배치 순서 — 불 / 얼음 / 바람 / 풀 / 빛 / 어둠.
 * 나중에 바뀔 여지가 있으므로 이 배열 하나만 고치면 되도록 둔다.
 */
export const ELEMENTS: readonly ElementDef[] = [
  { id: 'fire', name: '불', file: 'fire', color: '#E2421F' },
  { id: 'ice', name: '얼음', file: 'ice', color: '#56C8EF' },
  { id: 'air', name: '바람', file: 'air', color: '#98B0B5' },
  { id: 'earth', name: '풀', file: 'earth', color: '#7DA82A' },
  { id: 'light', name: '빛', file: 'light', color: '#ECA610' },
  { id: 'dark', name: '어둠', file: 'dark', color: '#202830' },
]

export const ELEMENT_STATE_LABEL: Record<ElementState, string> = {
  inert: '꺼짐',
  waning: '사그라듦',
  strong: '타오름',
}

/**
 * 탭할 때 넘어가는 순서. 게임 흐름과 같은 방향이다 —
 * 주입하면 타오르고, 라운드가 지나면 사그라들고, 또 지나면 꺼진다.
 */
export function nextElementState(state: ElementState): ElementState {
  return state === 'inert' ? 'strong' : state === 'strong' ? 'waning' : 'inert'
}

/**
 * 슬라이딩 트랙에서 왼쪽부터의 칸 번호.
 *
 * **왼쪽이 꺼짐, 오른쪽으로 갈수록 강하다** — 전력계 은유다. 활성화하면 오른쪽
 * 끝으로 튀고 라운드가 지날수록 왼쪽으로 내려온다.
 */
export const SLOT_ORDER: readonly ElementState[] = ['inert', 'waning', 'strong']

export function slotOf(state: ElementState): number {
  return SLOT_ORDER.indexOf(state)
}

/** 트랙 위 위치(0~2)를 가장 가까운 상태로 되돌린다. 드래그를 놓을 때 쓴다. */
export function stateAtSlot(slot: number): ElementState {
  const clamped = Math.min(Math.max(Math.round(slot), 0), SLOT_ORDER.length - 1)
  return SLOT_ORDER[clamped]
}
