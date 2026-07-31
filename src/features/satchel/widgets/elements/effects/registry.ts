/**
 * 고유 효과가 있는 원소.
 *
 * 있으면 공통 빛무리를 끈다 — 겹치면 효과가 묻힌다.
 * 컴포넌트와 한 파일에 두면 개발 중 빠른 새로고침이 깨지므로 갈라 둔다.
 */
const WITH_EFFECT = new Set(['fire'])

export function hasElementEffect(elementId: string): boolean {
  return WITH_EFFECT.has(elementId)
}
