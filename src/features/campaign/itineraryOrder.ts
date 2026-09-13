/**
 * 파티의 행적 — **차례를 정하는 규칙.**
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ **맨 위가 지금 머무는 곳이다.**                                           │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * 새로 간 곳이 위로 쌓인다. 「지금 어디인가」를 가장 자주 묻는데 그것이 아래에
 * 있으면 스무 줄을 지나야 한다.
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ **날짜는 차례를 정하는 데 쓰이고, 차례 자체는 `sort`가 들고 있다.**       │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * 날짜 없는 줄이 섞여 있으므로 날짜만으로는 세울 수가 없다 — 지난 판을 뒤늦게
 * 적을 때 날짜를 기억 못 하는 일이 흔하다. 그래서 **날짜를 적으면 그 줄만 제
 * 자리로 옮기고**(`placeByDate`) 나머지는 서로의 차례를 그대로 지킨다. 날짜 없는
 * 줄은 저절로 움직이지 않고 사람이 올리거나 내린다(`move`).
 *
 * 순수 함수라 표로 못박는다 — **차례가 틀리면 행적이 거짓말을 한다.**
 *
 * 이름이 `itinerary.ts`가 아닌 까닭은 화면 쪽이 `Itinerary.tsx`라서다 —
 * **대소문자만 다른 두 이름은 못 쓴다**(맥은 참고 리눅스는 안 참는다).
 */

export interface Stop {
  readonly id: string
  /** `YYYY-MM-DD`. 비워 둘 수 있다. */
  readonly at: string | null
  readonly scenario: string
  readonly code: string
  readonly place: string
  /**
   * 목록에서 고른 시나리오의 번호(`0044`). 손으로 적었거나 시나리오가 아닌 곳
   * (도시·길)이면 `null`.
   *
   * **셋(번호·코드·이름)은 그대로 둔다.** 목록이 나중에 고쳐져도 그때 적은 것이
   * 남아야 하고, 목록을 못 읽는 자리에서도 줄이 그대로 읽혀야 한다.
   */
  readonly scenarioNo: number | null
}

/** 날짜가 `YYYY-MM-DD` 꼴인가. 아니면 없는 것으로 본다 — 짐작해서 고치지 않는다. */
export function isDate(raw: unknown): raw is string {
  return typeof raw === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw)
}

/**
 * 그 줄을 날짜에 맞는 자리로 옮긴다.
 *
 * **날짜가 없으면 아무 일도 안 한다** — 그 줄은 사람이 놓은 자리를 지킨다.
 *
 * 위가 최신이므로 **자기보다 오래된 날짜를 만나는 앞자리**에 끼어든다. 날짜 없는
 * 줄은 견줄 것이 없어 **건너뛴다** — 그 줄을 기준으로 삼으면 날짜 있는 둘 사이에
 * 낀 날짜 없는 줄이 벽이 되어 제 자리로 못 간다.
 */
export function placeByDate(order: readonly Stop[], id: string): Stop[] {
  const at = order.findIndex((s) => s.id === id)
  if (at < 0) return [...order]
  const moving = order[at]
  if (!isDate(moving.at)) return [...order]

  const rest = order.filter((s) => s.id !== id)
  let insert = rest.length
  for (let i = 0; i < rest.length; i += 1) {
    const other = rest[i]
    if (!isDate(other.at)) continue
    // 나보다 오래된 것을 만났다 — 그 앞이 내 자리다.
    if (other.at < moving.at) {
      insert = i
      break
    }
  }
  return [...rest.slice(0, insert), moving, ...rest.slice(insert)]
}

/**
 * 한 칸 올리거나 내린다.
 *
 * 날짜 없는 줄을 끼워 넣는 길이다. **날짜가 있는 줄도 막지 않는다** — 책자의
 * 차례가 날짜와 어긋나는 판이 있을 수 있고, 규칙을 판정하지 않는다는 선이 여기도
 * 그대로다.
 *
 * **`id`만 있으면 무엇이든 옮긴다.** 은퇴한 캐릭터 표도 같은 규칙으로 차례를
 * 바꾸므로(`retirementStore`) 두 벌로 두면 언젠가 어긋난다.
 */
export function move<T extends { readonly id: string }>(
  order: readonly T[],
  id: string,
  delta: number,
): T[] {
  const at = order.findIndex((s) => s.id === id)
  if (at < 0) return [...order]
  const to = at + delta
  if (to < 0 || to >= order.length) return [...order]

  const next = [...order]
  const [moving] = next.splice(at, 1)
  next.splice(to, 0, moving)
  return next
}

/**
 * 지금 머무는 곳 — 맨 위 줄.
 *
 * **비어 있으면 `null`이다.** 「어디에도 없다」와 「모른다」를 같은 값으로 두지
 * 않는다(구현 결정 115).
 */
export function currentStop(order: readonly Stop[]): Stop | null {
  return order.length > 0 ? order[0] : null
}

/**
 * 한 줄을 사람이 읽는 한 마디로.
 *
 * 셋 다 비어 있을 수 있으므로 **있는 것만 이어 붙인다** — 빈 괄호나 `#`만 남은
 * 꼴이 뜨면 고장으로 읽힌다.
 */
export function stopLabel(stop: Stop): string {
  const parts: string[] = []
  if (stop.scenario.trim() !== '') parts.push(`#${stop.scenario.trim()}`)
  if (stop.code.trim() !== '') parts.push(stop.code.trim())
  if (stop.place.trim() !== '') parts.push(stop.place.trim())
  return parts.join(' ')
}
