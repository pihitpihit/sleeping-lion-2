import { supabase } from '../auth/supabase'
import {
  clampCheckmarks,
  clampGold,
  clampLevel,
  clampXp,
  hasClassIcon,
  normalizePerks,
} from './character'
import type { LogChange, LogEntry } from './characterLog'
import type { Character, CharacterEdits } from './types'

/**
 * 캐릭터의 서버 쪽.
 *
 * **막는 것은 RLS다**(`0005_characters.sql`). 파티원은 다 보고 고치는 것은 제
 * 것만이라는 보장을 여기서 만들지 않는다 — 레포와 번들이 공개라 이 파일을 읽고
 * API를 직접 두드릴 수 있다.
 *
 * `updated_at`·`version`·`campaign_id`·`owner_id`는 **보내지 않는다.** 서버
 * 트리거가 찍고 되돌린다.
 */

interface Row {
  id: string
  campaign_id: string
  owner_id: string
  name: string
  class_icon: number
  class_id: string | null
  level: number
  xp: number
  gold: number
  checkmarks: number
  perks: number[] | null
  items: string[] | null
  notes: string
  retired: boolean
  created_at: string
  updated_at: string
  version: number
  /** 주인의 표시 이름. 같은 파티 사람의 `profiles`는 읽을 수 있다(`0001`). */
  owner: { display_name: string | null } | null
}

const COLUMNS =
  'id, campaign_id, owner_id, name, class_icon, class_id, level, xp, gold, checkmarks, perks, items, notes, retired, created_at, updated_at, version, owner:profiles!characters_owner_id_fkey(display_name)'

/**
 * 어디서 온 값이든 쓸 수 있는 캐릭터로 다듬는다.
 *
 * 서버가 준 것도 거른다 — 스키마를 올린 뒤이거나 남이 다른 판으로 쓴 값일 수
 * 있다. 화면이 `undefined`를 만나 터지는 자리를 여기서 막는다.
 */
export function sanitizeCharacter(row: Row): Character {
  const now = Date.now()
  return {
    id: row.id,
    campaignId: row.campaign_id,
    ownerId: row.owner_id,
    ownerName: row.owner?.display_name ?? '',
    name: typeof row.name === 'string' ? row.name : '',
    classIcon: hasClassIcon(row.class_icon) ? row.class_icon : 0,
    classId: typeof row.class_id === 'string' && row.class_id !== '' ? row.class_id : null,
    level: clampLevel(row.level),
    xp: clampXp(row.xp),
    gold: clampGold(row.gold),
    checkmarks: clampCheckmarks(row.checkmarks),
    perks: normalizePerks(Array.isArray(row.perks) ? row.perks : []),
    items: Array.isArray(row.items) ? row.items.filter((i) => typeof i === 'string') : [],
    notes: typeof row.notes === 'string' ? row.notes : '',
    retired: row.retired === true,
    createdAt: Date.parse(row.created_at) || now,
    updatedAt: Date.parse(row.updated_at) || now,
    version: typeof row.version === 'number' ? row.version : 1,
  }
}

/** 그 기록지의 캐릭터 전부. 남의 것도 온다 — 읽기 전용으로 보여준다. */
export async function fetchCharacters(campaignId: string): Promise<Character[]> {
  const { data, error } = await supabase()
    .from('characters')
    .select(COLUMNS)
    .eq('campaign_id', campaignId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data as unknown as Row[]).map(sanitizeCharacter)
}

/**
 * 캐릭터를 하나 세운다.
 *
 * `owner_id`를 보내야 한다 — RLS의 `with check`가 `auth.uid()`와 견주므로 남의
 * 이름으로는 어차피 들어가지 않는다. 기본값으로 둘 수 없는 이유는 정책이
 * **넣는 값**을 보기 때문이다.
 */
export async function createCharacter(
  /** 어느 기록지에 세우는가. **파티 없이 세우면 `null`.** */
  campaignId: string | null,
  ownerId: string,
  name: string,
  classIcon: number,
  classId: string | null,
): Promise<Character> {
  const { data, error } = await supabase()
    .from('characters')
    .insert({
      campaign_id: campaignId,
      owner_id: ownerId,
      name,
      class_icon: hasClassIcon(classIcon) ? classIcon : 0,
      class_id: classId,
    })
    .select(COLUMNS)
    .single()
  if (error) throw error
  return sanitizeCharacter(data as unknown as Row)
}

/**
 * 한 장만 읽어 온다 — 캐릭터 화면이 파티를 모른 채 여는 자리다.
 *
 * 파티에 안 든 캐릭터는 기록지가 없어 `fetchCharacters(campaignId)`로는 닿을 수
 * 없다. RLS가 한 번 더 거른다 — 파티에 안 든 것은 주인만 본다(`0015`).
 */
export async function fetchCharacter(id: string): Promise<Character | null> {
  const { data, error } = await supabase()
    .from('characters')
    .select(COLUMNS)
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  return data ? sanitizeCharacter(data as unknown as Row) : null
}

/**
 * 파티에 들거나 나온다.
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ **시트에서 고치는 칸이 아니라 따로 하는 일이다.**                         │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * `CharacterEdits`에 넣지 않는 까닭은 클래스와 같다 — 시트가 통째로 보내는 것에
 * 섞이면 저장 한 번에 파티가 딸려 바뀔 수 있다. **드는 파티가 제가 든 파티인지는
 * 서버가 본다**(`0015`의 `with check`) — 화면이 목록을 좁히는 것은 헛손질을 줄이는
 * 것일 뿐이다.
 */
export async function joinParty(id: string, campaignId: string | null): Promise<Character> {
  const { data, error } = await supabase()
    .from('characters')
    .update({ campaign_id: campaignId })
    .eq('id', id)
    .select(COLUMNS)
    .single()
  if (error) throw error
  return sanitizeCharacter(data as unknown as Row)
}

/** 고친 것을 얹는다. 서버가 `version`을 올리고 `updated_at`을 찍는다. */
export async function pushCharacterEdits(id: string, edits: CharacterEdits): Promise<Character> {
  const patch: Record<string, unknown> = {}
  if (edits.level !== undefined) patch.level = clampLevel(edits.level)
  if (edits.xp !== undefined) patch.xp = clampXp(edits.xp)
  if (edits.gold !== undefined) patch.gold = clampGold(edits.gold)
  if (edits.checkmarks !== undefined) patch.checkmarks = clampCheckmarks(edits.checkmarks)
  if (edits.perks !== undefined) patch.perks = normalizePerks(edits.perks)
  if (edits.items !== undefined) patch.items = edits.items
  if (edits.notes !== undefined) patch.notes = edits.notes
  if (edits.retired !== undefined) patch.retired = edits.retired

  const { data, error } = await supabase()
    .from('characters')
    .update(patch)
    .eq('id', id)
    .select(COLUMNS)
    .single()
  if (error) throw error
  return sanitizeCharacter(data as unknown as Row)
}

/** 캐릭터를 거둔다. 은퇴와 다르다 — 은퇴는 접어두는 것이고 이것은 없애는 것이다. */
export async function deleteCharacter(id: string): Promise<void> {
  const { error } = await supabase().from('characters').delete().eq('id', id)
  if (error) throw error
}

/* --------------------------------------------------------------------------
   기록 — 무엇을 언제 고쳤는가(`0018`)
   -------------------------------------------------------------------------- */

/**
 * 고친 것을 기록에 남긴다.
 *
 * **실패해도 삼킨다.** 기록은 읽어 보는 것이지 정본이 아니므로(구현 결정 1),
 * 이것 때문에 저장이 되돌아가면 안 된다 — 값은 이미 `characters`에 들어갔다.
 */
export async function writeLog(
  characterId: string,
  actorId: string,
  changes: readonly LogChange[],
): Promise<void> {
  if (changes.length === 0) return
  try {
    const { error } = await supabase()
      .from('character_log')
      .insert({ character_id: characterId, actor_id: actorId, changes })
    if (error) throw error
  } catch (cause) {
    console.error('[log]', cause)
  }
}

/** 이 캐릭터의 기록. 새것이 먼저다. */
export async function fetchLog(characterId: string, limit = 200): Promise<LogEntry[]> {
  const { data, error } = await supabase()
    .from('character_log')
    .select('id, at, changes, actor:actor_id (display_name)')
    .eq('character_id', characterId)
    .order('at', { ascending: false })
    .limit(limit)
  if (error) throw error

  return (data ?? []).map((row) => {
    const r = row as unknown as {
      id: string
      at: string
      changes: unknown
      actor: { display_name?: string } | null
    }
    return {
      id: r.id,
      at: Date.parse(r.at),
      actorName: r.actor?.display_name ?? '',
      // 서버 값을 믿지 않는다 — 모양이 어긋난 것은 버린다.
      changes: Array.isArray(r.changes)
        ? (r.changes as LogChange[]).filter(
            (c) => c !== null && typeof c === 'object' && typeof c.field === 'string',
          )
        : [],
    }
  })
}
