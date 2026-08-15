import { supabase } from '../auth/supabase'

/**
 * 업적 목록 — **상점과 같은 짜임, 값만 없다**(`0026`).
 *
 * 이름은 게임 콘텐츠라 DB에만 있다(구현 결정 111). 읽고 적는 것은 승인된 사람,
 * 지우는 것은 적은 사람과 관리자다.
 */

export interface AchievementName {
  readonly id: string
  readonly name: string
}

interface Row {
  id: string
  name: string | null
}

const COLUMNS = 'id, name'

function toRow(row: Row): AchievementName {
  return { id: row.id, name: typeof row.name === 'string' ? row.name : '' }
}

/** 적어 둔 것 전부. 이름 차례로 — 값이 없으니 훑는 눈이 이름을 따라간다. */
export async function listAchievements(): Promise<AchievementName[]> {
  const { data, error } = await supabase()
    .from('achievements')
    .select(COLUMNS)
    .order('name', { ascending: true })
  if (error) throw error
  return ((data ?? []) as unknown as Row[]).map(toRow)
}

export async function addAchievement(name: string, userId: string): Promise<AchievementName> {
  const { data, error } = await supabase()
    .from('achievements')
    .insert({ name: name.trim(), created_by: userId })
    .select(COLUMNS)
    .single()
  if (error) throw error
  return toRow(data as unknown as Row)
}

export async function removeAchievement(id: string): Promise<void> {
  const { error } = await supabase().from('achievements').delete().eq('id', id)
  if (error) throw error
}
