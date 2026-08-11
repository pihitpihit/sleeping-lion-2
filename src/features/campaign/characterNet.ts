import { supabase } from '../auth/supabase'
import {
  clampCheckmarks,
  clampGold,
  clampLevel,
  clampXp,
  hasClassIcon,
  normalizePerks,
} from './character'
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
  campaignId: string,
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

/** 고친 것을 얹는다. 서버가 `version`을 올리고 `updated_at`을 찍는다. */
export async function pushCharacterEdits(id: string, edits: CharacterEdits): Promise<Character> {
  const patch: Record<string, unknown> = {}
  if (edits.name !== undefined) patch.name = edits.name
  if (edits.classIcon !== undefined) {
    patch.class_icon = hasClassIcon(edits.classIcon) ? edits.classIcon : 0
  }
  if (edits.classId !== undefined) patch.class_id = edits.classId
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
