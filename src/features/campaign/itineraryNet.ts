import { supabase } from '../auth/supabase'
import { isDate, type Stop } from './itineraryOrder'

/**
 * 파티의 행적 — 서버 쪽(`0042`).
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ **차례는 `sort`가 들고 있고, 0이 맨 위다.**                               │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * 화면이 정한 차례를 그대로 번호 매겨 올린다(`saveOrder`). 조각 번호(fractional
 * index)를 쓰지 않는 것은 **줄이 몇십 개뿐**이라서다 — 통째로 다시 매기는 것이
 * 한 번의 요청이고, 그 편이 사이값이 바닥나는 일을 아예 없앤다.
 *
 * 글은 사람이 적은 라벨이라 DB에만 있다(구현 결정 2와 같은 등급).
 */

interface Row {
  id: string
  at: string | null
  sort: number | null
  scenario: string | null
  code: string | null
  place: string | null
}

const COLUMNS = 'id, at, sort, scenario, code, place'

function toStop(row: Row): Stop {
  return {
    id: row.id,
    // 모양이 아닌 날짜는 없는 것으로 본다 — 짐작해서 고치지 않는다.
    at: isDate(row.at) ? row.at : null,
    scenario: typeof row.scenario === 'string' ? row.scenario : '',
    code: typeof row.code === 'string' ? row.code : '',
    place: typeof row.place === 'string' ? row.place : '',
  }
}

/** 차례대로 읽어 온다. `sort`가 같으면 먼저 적은 것이 위다. */
export async function listStops(campaignId: string): Promise<Stop[]> {
  const { data, error } = await supabase()
    .from('itinerary')
    .select(COLUMNS)
    .eq('campaign_id', campaignId)
    .order('sort', { ascending: true })
    .order('created_at', { ascending: true })
  if (error) throw error
  return ((data ?? []) as unknown as Row[]).map(toStop)
}

/** 한 줄 적는다. 차례는 부르는 쪽이 곧바로 다시 매긴다. */
export async function addStop(
  campaignId: string,
  stop: Omit<Stop, 'id'>,
  sort: number,
): Promise<Stop> {
  const { data, error } = await supabase()
    .from('itinerary')
    .insert({
      campaign_id: campaignId,
      at: stop.at,
      sort,
      scenario: stop.scenario,
      code: stop.code,
      place: stop.place,
    })
    .select(COLUMNS)
    .single()
  if (error) throw error
  return toStop(data as unknown as Row)
}

/** 한 줄 고친다. 차례는 건드리지 않는다 — 그것은 `saveOrder`의 일이다. */
export async function editStop(stop: Stop): Promise<void> {
  const { error } = await supabase()
    .from('itinerary')
    .update({
      at: stop.at,
      scenario: stop.scenario,
      code: stop.code,
      place: stop.place,
    })
    .eq('id', stop.id)
  if (error) throw error
}

export async function removeStop(id: string): Promise<void> {
  const { error } = await supabase().from('itinerary').delete().eq('id', id)
  if (error) throw error
}

/**
 * 차례를 통째로 다시 매긴다.
 *
 * **하나만 옮겨도 전부 다시 매긴다.** 옮긴 줄만 고치면 사이값을 셈해야 하고,
 * 정수로는 언젠가 바닥난다. 줄이 몇십 개뿐이라 통째로 보내는 편이 싸다.
 */
export async function saveOrder(campaignId: string, order: readonly Stop[]): Promise<void> {
  if (order.length === 0) return
  const { error } = await supabase()
    .from('itinerary')
    .upsert(
      order.map((stop, i) => ({
        id: stop.id,
        campaign_id: campaignId,
        at: stop.at,
        sort: i,
        scenario: stop.scenario,
        code: stop.code,
        place: stop.place,
      })),
    )
  if (error) throw error
}
