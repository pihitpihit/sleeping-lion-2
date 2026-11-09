import type { Scenario } from './scenarioNet'

/**
 * 시나리오에 놓인 보물 가운데 **아직 안 찾은 것**(`0056`).
 *
 * 기록지가 찾은 번호를 들고 있으므로(`campaigns.treasures`) 놓인 번호에서 빼면 된다.
 * `null`은 「모른다」다 — 보물 표를 못 읽었거나 번호 붙은 보물이 놓이지 않은
 * 시나리오다. 빈 배열은 「다 찾았다」다. 둘을 섞으면 다 찾은 줄 안다.
 */
export function remainingTreasures(
  scenario: Pick<Scenario, 'treasures'>,
  found: readonly number[],
): number[] | null {
  const placed = scenario.treasures
  if (!placed || placed.length === 0) return null
  const have = new Set(found)
  return placed.filter((n) => !have.has(n))
}

/** 「보물 #38·#46 남음」 / 「보물 다 찾음」. 모르면 빈 글자. */
export function treasureText(remaining: readonly number[] | null): string {
  if (remaining === null) return ''
  if (remaining.length === 0) return '보물 다 찾음'
  return `보물 ${remaining.map((n) => `#${n}`).join('·')} 남음`
}
