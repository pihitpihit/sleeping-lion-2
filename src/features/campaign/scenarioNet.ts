import { supabase } from '../auth/supabase'
import { isStoredState, type StoredState } from './scenarioState'
import { buildGraph, isLinkKind, type LinkKind, type ScenarioGraph } from './scenarioLinks'

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
  /**
   * 세계 지도에서 스티커가 붙는 자리(`0051`). 지도 그림의 픽셀이며 왼쪽 위가
   * (0, 0)이다. 모르면 `null` — 그 시나리오는 지도에 안 나온다.
   */
  readonly map?: MapSpot | null
}

export interface MapSpot {
  readonly x: number
  readonly y: number
  readonly w: number
  readonly h: number
}

interface Row {
  no: number | null
  grid: string | null
  name: string | null
  map_x: number | null
  map_y: number | null
  map_w: number | null
  map_h: number | null
}

function spotOf(row: Row): MapSpot | null {
  const { map_x: x, map_y: y, map_w: w, map_h: h } = row
  if (![x, y, w, h].every((v) => typeof v === 'number' && Number.isFinite(v))) return null
  if ((w as number) <= 0 || (h as number) <= 0) return null
  return { x: x as number, y: y as number, w: w as number, h: h as number }
}

export async function listScenarios(): Promise<Scenario[]> {
  const { data, error } = await supabase()
    .from('scenarios')
    .select('no, grid, name, map_x, map_y, map_w, map_h')
    .order('no', { ascending: true })
  if (error) throw error
  return ((data ?? []) as unknown as Row[])
    .filter((row): row is Row & { no: number } => typeof row.no === 'number')
    .map((row) => ({
      no: Math.trunc(row.no),
      grid: typeof row.grid === 'string' ? row.grid : '',
      name: typeof row.name === 'string' ? row.name : '',
      map: spotOf(row),
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

/**
 * 시나리오끼리의 연결과 선행(`0049`). **못 읽으면 `null`** — 비어 있는 그래프로 두면
 * 「깨도 아무것도 안 열린다」로 읽힌다. 모르는 것과 없는 것은 다르다(구현 결정 141).
 */
export async function listScenarioGraph(): Promise<ScenarioGraph | null> {
  const client = supabase()
  const [links, requires] = await Promise.all([
    client.from('scenario_links').select('from_no, to_no, kind'),
    client.from('scenario_requires').select('no, grp, req'),
  ])
  if (links.error || requires.error) return null
  const linkRows = (
    (links.data ?? []) as unknown as { from_no: number; to_no: number; kind: string }[]
  )
    .filter(
      (r) => typeof r.from_no === 'number' && typeof r.to_no === 'number' && isLinkKind(r.kind),
    )
    .map((r) => ({ from: r.from_no, to: r.to_no, kind: r.kind as LinkKind }))
  // 표가 비었으면 아직 안 넣은 것이다 — 없는 것으로 친다.
  if (linkRows.length === 0) return null
  const reqRows = (
    (requires.data ?? []) as unknown as { no: number; grp: number; req: number }[]
  ).filter(
    (r) => typeof r.no === 'number' && typeof r.grp === 'number' && typeof r.req === 'number',
  )
  return buildGraph(linkRows, reqRows)
}

/** 여러 상태를 한 번에 적는다. 권한 것을 적용할 때 쓴다 — 닫힘으로 되돌리는 일은 없다. */
export async function setScenarioStates(
  campaignId: string,
  entries: readonly { no: number; state: StoredState }[],
): Promise<void> {
  if (entries.length === 0) return
  const at = new Date().toISOString()
  const { error } = await supabase()
    .from('campaign_scenarios')
    .upsert(
      entries.map(({ no, state }) => ({ campaign_id: campaignId, no, state, updated_at: at })),
    )
  if (error) throw error
}
