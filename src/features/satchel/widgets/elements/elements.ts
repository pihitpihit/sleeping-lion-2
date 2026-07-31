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
  /** 아이콘에서 뽑은 원본 색. */
  color: string
  /**
   * 타오름 빛무리의 안쪽 색. 없으면 `color`를 쓴다.
   *
   * 아이콘 색이 늘 빛무리로 쓸 만한 것은 아니다. 어둠은 아이콘이 거의 검정이라
   * 그대로 쓰면 어두운 바탕에 묻혀 타오르는지 알 수 없다. 그런 원소만 따로 준다.
   */
  glow?: string
  /** 빛무리 바깥 색. 없으면 `glow`. 안팎을 다르게 주면 두 겹으로 번진다. */
  glowOuter?: string
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
  // 어둠만 빛무리 색을 따로 준다. 아이콘 색(#202830)은 바탕과 거의 같아
  // 타오름이 보이지 않는다. 안쪽 보라 → 바깥 파랑으로 두 겹을 준다.
  { id: 'dark', name: '어둠', file: 'dark', color: '#202830', glow: '#A06CFF', glowOuter: '#4C6FF5' },
]

/** 빛무리에 쓸 안팎 색. 지정이 없으면 아이콘 색으로 돌아간다. */
export function glowOf(element: ElementDef): { inner: string; outer: string } {
  const inner = element.glow ?? element.color
  return { inner, outer: element.glowOuter ?? inner }
}

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

/** 트랙 위 위치(0~2)를 가장 가까운 상태로 되돌린다. */
export function stateAtSlot(slot: number): ElementState {
  const clamped = Math.min(Math.max(Math.round(slot), 0), SLOT_ORDER.length - 1)
  return SLOT_ORDER[clamped]
}

/**
 * 픽셀 위치에서 가장 가까운 슬롯을 찾는다. 드래그를 **놓을 때** 쓴다.
 *
 * 끄는 동안에는 손가락을 그대로 따라가고, 손을 뗀 뒤에야 이 판정으로 붙는다.
 * 끄는 중에 칸마다 튀면 조작감이 나쁘다.
 */
export function nearestSlotState(
  offset: number,
  slotOffsets: readonly [number, number, number],
): ElementState {
  let best = 0
  for (let i = 1; i < slotOffsets.length; i += 1) {
    if (Math.abs(slotOffsets[i] - offset) < Math.abs(slotOffsets[best] - offset)) best = i
  }
  return SLOT_ORDER[best]
}
