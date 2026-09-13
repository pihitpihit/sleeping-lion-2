/**
 * 시나리오 상태 넷 — **「그 방문의 결과」가 아니라 「지금 어떤 상태인가」다.**
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ **닫힘은 줄이 없는 것으로 나타낸다.**                                     │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * 아흔다섯 줄을 기록지마다 미리 깔지 않는다(`0045`) — 처음에는 전부 닫혀 있고 손댄
 * 것만 줄이 생긴다. 그래서 `stateOf`가 **없는 것을 `closed`로 읽는다.**
 *
 * 순수 함수라 표로 못박는다.
 */

/** 서버에 담기는 값. `closed`는 줄이 없는 것이므로 여기 없다. */
export type StoredState = 'open' | 'blocked' | 'done'

/** 화면이 다루는 값. 넷이다. */
export type ScenarioState = 'closed' | StoredState

/**
 * 화면에 서는 말.
 *
 * **두 글자로 맞춘다** — 넷이 한 벌로 읽혀야 하고, 좁은 칸에 서는 말이다.
 * 형님이 「못감」이라 부른 것은 문장이라 `막힘`으로 적는다(열림·닫힘과 같은 결).
 *
 * 글자가 닮은 닫힘·막힘은 **색으로 가른다**(흐림 / 잉걸빛) — 말만으로 갈리기를
 * 바라면 훑을 때 걸린다.
 */
export const STATE_LABEL: Record<ScenarioState, string> = {
  closed: '닫힘',
  open: '열림',
  blocked: '막힘',
  done: '완료',
}

/** 읽어주는 쪽에는 뜻을 풀어 보낸다 — 두 글자는 눈으로 훑는 말이다. */
export const STATE_HINT: Record<ScenarioState, string> = {
  closed: '아직 해금되지 않음',
  open: '갈 수 있음',
  blocked: '해금됐지만 지금은 갈 수 없음',
  done: '시나리오를 깼음',
}

/** 고를 때 늘어놓는 차례. 판이 나아가는 차례이기도 하다. */
export const STATES: readonly ScenarioState[] = ['closed', 'open', 'blocked', 'done']

/** 담긴 값에서 상태를 읽는다. **없으면 닫힘이다.** */
export function stateOf(stored: Record<number, StoredState>, no: number): ScenarioState {
  return stored[no] ?? 'closed'
}

/** 서버 값을 믿지 않는다 — 모르는 말은 없는 것으로 본다. */
export function isStoredState(raw: unknown): raw is StoredState {
  return raw === 'open' || raw === 'blocked' || raw === 'done'
}

/**
 * 이 상태에서 행적에 적을 만한가.
 *
 * **막지는 않는다**(규칙을 판정하지 않는다, SPEC 1장) — 닫힌 것을 골랐다면 적어
 * 두지 않았을 뿐일 수 있다. 목록에서 아래로 미룰 뿐이다.
 */
export function isReachable(state: ScenarioState): boolean {
  return state === 'open' || state === 'done'
}
