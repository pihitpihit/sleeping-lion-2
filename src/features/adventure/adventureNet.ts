import { supabase } from '../auth/supabase'

/**
 * 모험 — **시나리오를 실제로 시작하는 자리.**
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ **모험 하나가 곧 전투 세션 하나다.**                                      │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * 새 표를 만들지 않는다 — 판을 나누는 짜임은 이미 `battles`가 들고 있고
 * (2026-08-08), 여기서 하는 일은 **그것을 여는 문을 앞에 내는 것**이다. 지금까지는
 * 행낭 안쪽에서만 열 수 있었다.
 *
 * 목록에 무엇이 오는지는 **RLS가 정한다**(`0007`) — 내가 든 파티의 것만 보인다.
 * 화면에서 거르지 않는다.
 */

export interface Adventure {
  readonly battleId: string
  readonly partyId: string
  readonly partyName: string
  readonly openedAt: number
  readonly level: number
  /** 어느 시나리오인가(`0048`). 안 골랐으면 `null`. */
  readonly scenarioNo: number | null
}

interface RawRow {
  id: string
  party_id: string
  opened_at: string
  level: number | null
  scenario_no: number | null
  party: { name?: string } | null
}

/**
 * 지금 열려 있는 모험 전부.
 *
 * **접는 것이 곧 지우는 것이므로**(구현 결정 67) 행이 있으면 열려 있는 것이다 —
 * 따로 걸러 낼 조건이 없다.
 */
export async function listOpenAdventures(): Promise<Adventure[]> {
  const { data, error } = await supabase()
    .from('battles')
    .select(
      'id, party_id, opened_at, level, scenario_no, party:parties!battles_party_id_fkey (name)',
    )
    .order('opened_at', { ascending: false })
  if (error) throw error

  return ((data ?? []) as unknown as RawRow[]).map((row) => ({
    battleId: row.id,
    partyId: row.party_id,
    partyName: row.party?.name ?? '이름 없는 파티',
    openedAt: Date.parse(row.opened_at) || 0,
    level: typeof row.level === 'number' ? row.level : 1,
    scenarioNo: typeof row.scenario_no === 'number' ? Math.trunc(row.scenario_no) : null,
  }))
}

/**
 * 모험을 어떻게 마쳤는가. `null`은 아무것도 남기지 않고 접기만 하는 것이다.
 *
 * 실패도 행적에는 남는다 — 그 자리에 갔던 것은 사실이다. 닫혀 있던 시나리오면
 * 열림이 되고, 이미 다른 상태면 그대로 둔다(`0048`).
 */
export type Outcome = 'done' | 'failed' | null

/**
 * 모험을 마친다 — **행적 한 줄 · 시나리오 상태 · 판 지우기를 서버가 한 번에 한다**
 * (`finish_adventure`).
 *
 * 나눠 보내면 사이에 끊겼을 때 판은 사라졌는데 행적이 없는 꼴이 남는다.
 * 날짜는 이 기기의 오늘을 넘긴다 — 서버의 오늘은 UTC다.
 *
 * 돌려주는 것은 행적을 적은 기록지 id다. 안 적었으면 `null`.
 */
export async function finishAdventure(
  battleId: string,
  outcome: Outcome,
  at: string,
): Promise<string | null> {
  const { data, error } = await supabase().rpc('finish_adventure', {
    p_battle: battleId,
    p_outcome: outcome,
    p_at: at,
  })
  if (error) throw error
  return typeof data === 'string' ? data : null
}
