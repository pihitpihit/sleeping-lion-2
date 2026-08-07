import { supabase } from '../auth/supabase'
import { sanitizeCampaign } from './db'
import type { Campaign, CampaignEdits } from './types'

/**
 * 기록지의 서버 쪽.
 *
 * **막는 것은 RLS다.** 파티원만 읽고 쓴다는 보장을 여기서 만들지 않는다 —
 * 레포와 번들이 공개라 이 파일을 읽고 API를 직접 두드릴 수 있다
 * (`0003_campaigns.sql`).
 *
 * `updated_at`·`version`·`party_id`는 **보내지 않는다.** 서버 트리거가 찍고
 * 되돌린다 — 화면이 보내는 값을 믿게 두면 낙관적 잠금이 무의미해지고, 남의
 * 파티로 기록지를 밀어 넣는 길이 열린다.
 */

/** 서버가 준 행을 우리 모양으로. */
interface Row {
  id: string
  party_id: string
  name: string
  location: string
  notes: string
  achievements: string[] | null
  reputation: number
  created_at: string
  updated_at: string
  version: number
}

const COLUMNS =
  'id, party_id, name, location, notes, achievements, reputation, created_at, updated_at, version'

function toCampaign(row: Row): Campaign {
  return sanitizeCampaign({
    id: row.id,
    partyId: row.party_id,
    name: row.name,
    location: row.location,
    notes: row.notes,
    achievements: row.achievements ?? [],
    reputation: row.reputation,
    createdAt: Date.parse(row.created_at),
    updatedAt: Date.parse(row.updated_at),
    version: row.version,
  })
}

/** 내가 속한 파티들의 기록지 전부. RLS가 걸러 준다. */
export async function fetchCampaigns(): Promise<Campaign[]> {
  const { data, error } = await supabase()
    .from('campaigns')
    .select(COLUMNS)
    .order('updated_at', { ascending: false })
  if (error) throw error
  return (data as Row[]).map(toCampaign)
}

/**
 * 그 파티의 기록지. **없으면 만들어서 돌려준다.**
 *
 * 파티를 세우는 것과 기록지를 만드는 것을 한 번에 묶지 않았다. 나눠 두고 여기서
 * 메우면 **중간에 끊겨도 스스로 낫는다** — 파티만 생기고 기록지가 없는 상태로
 * 남아도 다음에 열 때 채워진다. 마이그레이션을 하나 더 만들지 않아도 된다.
 */
export async function fetchOrCreateFor(partyId: string, name: string): Promise<Campaign> {
  const { data, error } = await supabase()
    .from('campaigns')
    .select(COLUMNS)
    .eq('party_id', partyId)
    .order('created_at', { ascending: true })
    .limit(1)
  if (error) throw error

  const found = (data as Row[])[0]
  if (found) return toCampaign(found)

  const { data: made, error: madeError } = await supabase()
    .from('campaigns')
    .insert({ party_id: partyId, name })
    .select(COLUMNS)
    .single()
  if (madeError) throw madeError
  return toCampaign(made as Row)
}

/** 고친 것을 얹는다. 서버가 `version`을 올리고 `updated_at`을 찍는다. */
export async function pushEdits(id: string, edits: CampaignEdits): Promise<Campaign> {
  const patch: Record<string, unknown> = {}
  if (edits.name !== undefined) patch.name = edits.name
  if (edits.location !== undefined) patch.location = edits.location
  if (edits.notes !== undefined) patch.notes = edits.notes
  if (edits.achievements !== undefined) patch.achievements = edits.achievements
  if (edits.reputation !== undefined) patch.reputation = edits.reputation

  const { data, error } = await supabase()
    .from('campaigns')
    .update(patch)
    .eq('id', id)
    .select(COLUMNS)
    .single()
  if (error) throw error
  return toCampaign(data as Row)
}
