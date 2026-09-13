import { supabase } from '../auth/supabase'
import { isStoredState, type StoredState } from './scenarioState'

/**
 * 시나리오 목록과 캠페인별 상태(`0044`·`0045`).
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ **목록은 모두가 함께 보는 표, 상태는 기록지마다 따로.**                   │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * 목록의 글은 책자에 인쇄된 것이라 DB에만 있다(구현 결정 111·135·462). 못 읽어도
 * 행적은 그대로 돈다 — 그때는 손으로 적는다(절대 원칙 3).
 */

export interface Scenario {
  readonly no: number
  /** 세계 지도의 칸. */
  readonly grid: string
  readonly name: string
}

interface Row {
  no: number | null
  grid: string | null
  name: string | null
}

export async function listScenarios(): Promise<Scenario[]> {
  const { data, error } = await supabase()
    .from('scenarios')
    .select('no, grid, name')
    .order('no', { ascending: true })
  if (error) throw error
  return ((data ?? []) as unknown as Row[])
    .filter((row): row is Row & { no: number } => typeof row.no === 'number')
    .map((row) => ({
      no: Math.trunc(row.no),
      grid: typeof row.grid === 'string' ? row.grid : '',
      name: typeof row.name === 'string' ? row.name : '',
    }))
}

/** 이 기록지가 시나리오를 어떻게 보고 있는가. **없는 번호는 닫힘이다.** */
export async function listScenarioStates(campaignId: string): Promise<Record<number, StoredState>> {
  const { data, error } = await supabase()
    .from('campaign_scenarios')
    .select('no, state')
    .eq('campaign_id', campaignId)
  if (error) throw error

  const out: Record<number, StoredState> = {}
  for (const row of (data ?? []) as unknown as { no: number; state: string }[]) {
    if (typeof row.no === 'number' && isStoredState(row.state)) out[Math.trunc(row.no)] = row.state
  }
  return out
}

/**
 * 상태를 적는다. **닫힘으로 되돌리면 줄을 지운다.**
 *
 * 닫힘은 「아무것도 안 적은 것」이므로 값으로 담지 않는다 — 담으면 같은 뜻이 두
 * 모양(줄 없음 / `closed`)으로 남는다(구현 결정 512와 같은 결).
 */
export async function setScenarioState(
  campaignId: string,
  no: number,
  state: StoredState | null,
): Promise<void> {
  const client = supabase()
  if (state === null) {
    const { error } = await client
      .from('campaign_scenarios')
      .delete()
      .eq('campaign_id', campaignId)
      .eq('no', no)
    if (error) throw error
    return
  }

  const { error } = await client
    .from('campaign_scenarios')
    .upsert({ campaign_id: campaignId, no, state, updated_at: new Date().toISOString() })
  if (error) throw error
}
