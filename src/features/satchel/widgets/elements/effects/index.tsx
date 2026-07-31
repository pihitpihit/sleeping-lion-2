import { FireEffect } from './FireEffect'

/**
 * 원소별 고유 효과.
 *
 * 타오름 상태일 때 아이콘 뒤에 그린다. 없는 원소는 공통 빛무리만 쓴다 —
 * 여섯을 한꺼번에 만들면 무엇이 문제인지 알기 어려우므로 하나씩 붙인다.
 *
 * **컴포넌트를 값으로 넘기지 않고 여기서 갈라 쓴다.** 렌더 도중에 조회한
 * 컴포넌트를 변수에 담아 그리면 매 렌더마다 다른 타입으로 취급돼 상태가
 * 날아갈 수 있다.
 */
export function ElementEffect({ elementId }: { elementId: string }) {
  if (elementId === 'fire') return <FireEffect />
  return null
}
