import { isSupabaseConfigured, supabase } from '../auth/supabase'
import { parseCardSpec } from '../satchel/widgets/deck/deck'

/**
 * 클래스별 특혜 표 — 서버 쪽.
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ **레포에는 없다. 값은 DB에만 있다.**                                      │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * 특혜 한 줄에 적힌 글은 실물 시트에 인쇄된 게임 콘텐츠다 — 지금까지 담은 것 중
 * 가장 또렷하게 저작물성이 있다. 레포와 배포 사이트가 공개이므로 거기 넣으면
 * 우리가 공개 배포하는 것이 된다(절대 원칙 1). 표에는 **승인된 사람만** 닿고
 * 쓰는 것은 관리자뿐이다(`0013_class_perks.sql`).
 *
 * **없어도 앱은 돈다.** 아무것도 안 넣었으면 캐릭터 시트가 번호 상자만 늘어놓고
 * 덱은 위젯 설정의 구성을 쓴다 — 지금까지 그렇게 돌아왔다(절대 원칙 3).
 */

/** 상자 하나를 켤 때 덱에 가하는 변경. 열쇠는 명세 낱말, 값은 장수 증감. */
export type PerkChanges = Readonly<Record<string, number>>

/** 특혜 한 줄. */
export interface ClassPerk {
  id: string
  classId: string
  /** 시트에 적힌 차례. 상자 번호가 여기서 나온다. */
  sort: number
  /** 이 줄에 붙은 체크상자 수. */
  count: number
  /** 사람이 읽는 줄. */
  text: string
  changes: PerkChanges
}

interface Row {
  id: string
  class_id: string
  sort: number | null
  count: number | null
  text: string | null
  changes: unknown
}

/** 한 줄에 붙을 수 있는 상자 수. 서버의 `check`와 같은 값이다. */
export const MAX_PERK_BOXES = 5

/**
 * 변경표를 거른다.
 *
 * **알아볼 수 없는 종류는 버린다.** 열쇠는 `cardSpec.ts`가 읽을 수 있어야 하고,
 * 읽히면 **한 가지 꼴로 세워 담는다** — `p1.ice.fire`로 적혀 들어와도 `p1.fire.ice`로
 * 앉아야 덱 구성에서 같은 카드가 두 줄로 갈리지 않는다.
 */
export function sanitizePerkChanges(raw: unknown): PerkChanges {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return {}
  const out: Record<string, number> = {}
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    const spec = parseCardSpec(key)
    if (!spec) continue
    if (typeof value !== 'number' || !Number.isFinite(value)) continue
    const delta = Math.trunc(value)
    if (delta === 0) continue
    out[spec.id] = (out[spec.id] ?? 0) + delta
  }
  return out
}

function sanitizePerk(raw: Row): ClassPerk | null {
  if (typeof raw.id !== 'string' || raw.id === '') return null
  if (typeof raw.class_id !== 'string' || raw.class_id === '') return null
  const count =
    typeof raw.count === 'number' && Number.isFinite(raw.count)
      ? Math.min(MAX_PERK_BOXES, Math.max(1, Math.trunc(raw.count)))
      : 1
  return {
    id: raw.id,
    classId: raw.class_id,
    sort: typeof raw.sort === 'number' && Number.isFinite(raw.sort) ? Math.trunc(raw.sort) : 0,
    count,
    text: typeof raw.text === 'string' ? raw.text : '',
    changes: sanitizePerkChanges(raw.changes),
  }
}

/** 넣어 둔 특혜 전부. 못 읽으면 빈 목록 — 없어도 앱은 돈다. */
export async function fetchClassPerks(): Promise<ClassPerk[]> {
  if (!isSupabaseConfigured()) return []
  try {
    const { data, error } = await supabase()
      .from('class_perks')
      .select('id, class_id, sort, count, text, changes')
      .order('class_id', { ascending: true })
      .order('sort', { ascending: true })
    if (error || !data) return []
    return (data as Row[]).map(sanitizePerk).filter((p): p is ClassPerk => p !== null)
  } catch {
    return []
  }
}

/** 넣을 때 쓰는 모양. `id`는 서버가 만든다. */
export type ClassPerkDraft = Omit<ClassPerk, 'id'>

/**
 * 한 클래스의 특혜 표를 통째로 갈아 끼운다.
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ **덧붙이지 않고 갈아 끼운다.**                                            │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * 상자 번호가 `sort` 차례에서 나오므로 **줄이 하나 빠진 채 남아 있으면 그 아래
 * 번호가 통째로 밀린다** — 켜 둔 상자가 다른 퍽을 가리키게 된다. 지우고 넣는 편이
 * 안전하다. 관리자 혼자 쓰는 화면이라 두 번 오가는 값이 싸다.
 */
export async function pushClassPerks(
  classId: string,
  perks: readonly ClassPerkDraft[],
): Promise<void> {
  const client = supabase()

  const cleared = await client.from('class_perks').delete().eq('class_id', classId)
  if (cleared.error) throw cleared.error

  if (perks.length === 0) return

  const { error } = await client.from('class_perks').insert(
    perks.map((perk, index) => ({
      class_id: classId,
      // 붙여넣은 차례를 그대로 쓴다. **틈 없이 0부터** — 상자 번호가 여기서 나온다.
      sort: index,
      count: perk.count,
      text: perk.text,
      changes: perk.changes,
    })),
  )
  if (error) throw error
}
