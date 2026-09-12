import { supabase } from '../auth/supabase'

/**
 * 은퇴한 캐릭터 — 서버 쪽(`0043`).
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ **은퇴한 그때의 값을 베껴 둔 것이다 — 캐릭터를 다시 읽지 않는다.**        │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * `characters`에서 뽑아 보여 주면 기록이 아니다: 은퇴한 뒤에 경험치를 고치면
 * 레벨이 바뀌고, 파티를 나가면 사라지고, 유예가 끝나 지워지면 함께 간다.
 * 실물 표는 **한 번 적으면 남는 종이**다.
 */

export interface Retirement {
  readonly id: string
  /** 앱 밖에서 은퇴한 줄은 비어 있다. 손으로 적은 줄이다. */
  readonly characterId: string | null
  readonly player: string
  readonly name: string
  readonly className: string
  /** Creator Pack 클래스 표식의 쪽 번호. 0이면 그림이 없다. */
  readonly classIcon: number
  /** 모르면 `null` — 손으로 적을 때 기억 못 할 수 있다(구현 결정 115). */
  readonly level: number | null
  readonly perks: number | null
}

/** 사람이 적거나 고치는 칸. 차례와 캐릭터 이음새는 여기 없다. */
export type RetirementEdits = Omit<Retirement, 'id' | 'characterId'>

interface Row {
  id: string
  character_id: string | null
  player: string | null
  name: string | null
  class_name: string | null
  class_icon: number | null
  level: number | null
  perks: number | null
}

const COLUMNS = 'id, character_id, player, name, class_name, class_icon, level, perks'

function toRetirement(row: Row): Retirement {
  return {
    id: row.id,
    characterId: typeof row.character_id === 'string' ? row.character_id : null,
    player: typeof row.player === 'string' ? row.player : '',
    name: typeof row.name === 'string' ? row.name : '',
    className: typeof row.class_name === 'string' ? row.class_name : '',
    classIcon: typeof row.class_icon === 'number' ? Math.trunc(row.class_icon) : 0,
    level: typeof row.level === 'number' ? Math.trunc(row.level) : null,
    perks: typeof row.perks === 'number' ? Math.trunc(row.perks) : null,
  }
}

/** 실물 표처럼 위에서 아래로. `sort`가 같으면 먼저 적은 것이 위다. */
export async function listRetirements(campaignId: string): Promise<Retirement[]> {
  const { data, error } = await supabase()
    .from('retirements')
    .select(COLUMNS)
    .eq('campaign_id', campaignId)
    .order('sort', { ascending: true })
    .order('created_at', { ascending: true })
  if (error) throw error
  return ((data ?? []) as unknown as Row[]).map(toRetirement)
}

/** 손으로 한 줄 적는다. 앱이 아는 캐릭터가 아니므로 `character_id`는 비운다. */
export async function addRetirement(
  campaignId: string,
  edits: RetirementEdits,
  sort: number,
): Promise<Retirement> {
  const { data, error } = await supabase()
    .from('retirements')
    .insert({
      campaign_id: campaignId,
      sort,
      player: edits.player,
      name: edits.name,
      class_name: edits.className,
      class_icon: edits.classIcon,
      level: edits.level,
      perks: edits.perks,
    })
    .select(COLUMNS)
    .single()
  if (error) throw error
  return toRetirement(data as unknown as Row)
}

/**
 * 한 줄 고친다.
 *
 * **서버가 베껴 둔 줄도 고칠 수 있다.** 트리거가 넣은 값이 틀렸을 수 있고
 * (클래스 표가 아직 안 들어왔으면 이름이 빈다) 종이처럼 손으로 바로잡는 것이
 * 맞다 — 캐릭터를 되짚어 다시 뽑지 않는다.
 */
export async function editRetirement(id: string, edits: RetirementEdits): Promise<void> {
  const { error } = await supabase()
    .from('retirements')
    .update({
      player: edits.player,
      name: edits.name,
      class_name: edits.className,
      class_icon: edits.classIcon,
      level: edits.level,
      perks: edits.perks,
    })
    .eq('id', id)
  if (error) throw error
}

export async function removeRetirement(id: string): Promise<void> {
  const { error } = await supabase().from('retirements').delete().eq('id', id)
  if (error) throw error
}

/** 차례를 통째로 다시 매긴다 — 행적과 같은 까닭이다(구현 결정 510). */
export async function saveRetirementOrder(
  campaignId: string,
  order: readonly Retirement[],
): Promise<void> {
  if (order.length === 0) return
  const { error } = await supabase()
    .from('retirements')
    .upsert(
      order.map((row, i) => ({
        id: row.id,
        campaign_id: campaignId,
        character_id: row.characterId,
        sort: i,
        player: row.player,
        name: row.name,
        class_name: row.className,
        class_icon: row.classIcon,
        level: row.level,
        perks: row.perks,
      })),
    )
  if (error) throw error
}
