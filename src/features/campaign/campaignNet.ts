import { supabase } from '../auth/supabase'
import { sanitizeCampaign } from './db'
import type { LogChange, LogEntry, LogReason } from './characterLog'
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
  unlocks: Record<string, number> | null
  reputation: number
  created_at: string
  updated_at: string
  version: number
}

const COLUMNS =
  'id, party_id, name, location, notes, achievements, reputation, unlocks, created_at, updated_at, version'

function toCampaign(row: Row): Campaign {
  return sanitizeCampaign({
    id: row.id,
    partyId: row.party_id,
    name: row.name,
    location: row.location,
    notes: row.notes,
    achievements: row.achievements ?? [],
    unlocks: row.unlocks ?? {},
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
  if (edits.unlocks !== undefined) patch.unlocks = edits.unlocks
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

/* --------------------------------------------------------------------------
   로그 — 누가 언제 무엇을 고쳤나
   --------------------------------------------------------------------------
   ┌────────────────────────────────────────────────────────────────────────┐
   │ **파티는 여럿이 고치므로 캐릭터보다 되짚을 일이 잦다.**                  │
   └────────────────────────────────────────────────────────────────────────┘

   캐릭터 것과 같은 짜임이다(`characterNet`) — 값만 담고 우리말로 옮기는 것은
   화면이 한다. **캐릭터와 갈리는 것은 보는 사람이다**: 파티 기록은 파티원이
   다 본다(`0021`). 공용 장부라 서로의 손질이 보여야 뜻이 있다.
   -------------------------------------------------------------------------- */

/**
 * 한 줄 남긴다.
 *
 * **값이 들어간 다음에 부르고 실패해도 삼킨다** — 이것 때문에 저장이 되돌아가면
 * 안 된다(구현 결정 372).
 */
export async function writeCampaignLog(
  campaignId: string,
  actorId: string,
  reason: LogReason,
  changes: readonly LogChange[],
): Promise<void> {
  if (changes.length === 0) return
  try {
    const { error } = await supabase()
      .from('campaign_log')
      .insert({ campaign_id: campaignId, actor_id: actorId, reason, changes })
    if (error) throw error
  } catch (cause) {
    console.error('[log]', cause)
  }
}

/** 이 기록지의 로그. 새것이 먼저다. */
export async function fetchCampaignLog(campaignId: string, limit = 200): Promise<LogEntry[]> {
  const { data, error } = await supabase()
    .from('campaign_log')
    .select('id, at, reason, changes, actor:actor_id (display_name)')
    .eq('campaign_id', campaignId)
    .order('at', { ascending: false })
    .limit(limit)
  if (error) throw error

  return (data ?? []).map((row) => {
    const r = row as unknown as {
      id: string
      at: string
      reason: string
      changes: unknown
      actor: { display_name?: string } | null
    }
    return {
      id: r.id,
      at: Date.parse(r.at),
      actorName: r.actor?.display_name ?? '',
      reason: typeof r.reason === 'string' ? r.reason : 'other',
      // 서버 값을 믿지 않는다 — 모양이 어긋난 것은 버린다.
      changes: Array.isArray(r.changes)
        ? (r.changes as LogChange[]).filter(
            (c) => c !== null && typeof c === 'object' && typeof c.field === 'string',
          )
        : [],
    }
  })
}
