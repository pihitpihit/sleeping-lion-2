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
}

interface RawRow {
  id: string
  party_id: string
  opened_at: string
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
    .select('id, party_id, opened_at, party:parties!battles_party_id_fkey (name)')
    .order('opened_at', { ascending: false })
  if (error) throw error

  return ((data ?? []) as unknown as RawRow[]).map((row) => ({
    battleId: row.id,
    partyId: row.party_id,
    partyName: row.party?.name ?? '이름 없는 파티',
    openedAt: Date.parse(row.opened_at) || 0,
  }))
}
