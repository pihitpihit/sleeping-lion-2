import { isSupabaseConfigured, supabase } from '../auth/supabase'
import { hasClassIcon, MAX_LEVEL } from './character'

/**
 * 클래스별 게임 수치 — 서버 쪽.
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ **레포에는 없다. 값은 DB에만 있다.**                                      │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * 클래스 이름·핸드 사이즈·레벨별 체력은 실물 카드에 인쇄된 게임 콘텐츠다. 레포와
 * 배포 사이트가 공개이므로 거기 넣으면 우리가 공개 배포하는 것이 된다(절대 원칙 1).
 * 표에는 **승인된 사람만** 닿고 쓰는 것은 관리자뿐이다(`0011_character_classes.sql`).
 *
 * **없어도 앱은 돈다.** 아무것도 안 넣었으면 화면이 이름 없이 아이콘만 보여주던
 * 종전 모습 그대로다 — 지금까지 그렇게 돌아왔다.
 */

/** 한 클래스의 수치. */
export interface ClassInfo {
  /** 클래스 자신의 열쇠. 캐릭터가 이것을 가리킨다. */
  id: string
  /**
   * Creator Pack 클래스 아이콘의 쪽 번호(1~21). **없을 수 있다.**
   *
   * 팩의 21쪽은 글룸헤이븐 것이고 사자의 턱 넷은 거기 없다. 그림이 없다고 클래스를
   * 못 담을 이유가 없으므로 이름만으로도 선다(`0012`).
   */
  icon: number | null
  name: string
  /** 손에 드는 능력 카드 수. */
  handSize: number
  /** 레벨 1~9의 최대 체력. 아홉 칸이거나 비어 있다. */
  hp: number[]
  /** 몇 번째로 보여줄지. 같으면 이름 순. */
  sort: number
}

interface Row {
  id: string
  icon: number | null
  name: string | null
  hand_size: number | null
  hp: number[] | null
  sort: number | null
}

/** 어디서 온 값이든 쓸 수 있는 모양으로. 서버가 준 것도 거른다. */
export function sanitizeClassInfo(raw: Partial<Row> & { id: string }): ClassInfo | null {
  if (typeof raw.id !== 'string' || raw.id === '') return null
  if (typeof raw.name !== 'string' || raw.name.trim() === '') return null

  const hp = Array.isArray(raw.hp)
    ? raw.hp.filter((n): n is number => typeof n === 'number' && Number.isFinite(n))
    : []

  return {
    id: raw.id,
    // 팩에 없는 클래스는 그림이 없다. 화면이 이름만으로 그린다.
    icon: hasClassIcon(raw.icon ?? 0) ? (raw.icon as number) : null,
    name: raw.name.trim(),
    handSize:
      typeof raw.hand_size === 'number' && Number.isFinite(raw.hand_size)
        ? Math.max(0, Math.trunc(raw.hand_size))
        : 0,
    // 아홉 칸이 아니면 없는 것으로 친다. 반쯤 채워진 표는 잘못 읽히기만 한다.
    hp: hp.length === MAX_LEVEL ? hp.map((n) => Math.max(0, Math.trunc(n))) : [],
    sort: typeof raw.sort === 'number' && Number.isFinite(raw.sort) ? Math.trunc(raw.sort) : 0,
  }
}

/** 넣어 둔 클래스 전부. 못 읽으면 빈 목록 — 없어도 앱은 돈다. */
export async function fetchClasses(): Promise<ClassInfo[]> {
  if (!isSupabaseConfigured()) return []
  try {
    const { data, error } = await supabase()
      .from('character_classes')
      .select('id, icon, name, hand_size, hp, sort')
      .order('sort', { ascending: true })
      .order('name', { ascending: true })
    if (error || !data) return []
    return (data as Row[])
      .map((row) => sanitizeClassInfo(row))
      .filter((info): info is ClassInfo => info !== null)
  } catch {
    return []
  }
}

/** 넣을 때 쓰는 모양. `id`는 서버가 만든다. */
export type ClassDraft = Omit<ClassInfo, 'id'>

/**
 * 관리자가 넣는다. **이름이 겹치면 덮어쓴다.**
 *
 * 붙여넣기로 넣고 고치는 흐름이라, 같은 이름을 다시 올리면 새로 생기는 것이 아니라
 * 고쳐져야 한다. 사람이 손으로 id를 적을 일은 없으므로 이름이 그 몫을 한다.
 */
export async function pushClasses(classes: readonly ClassDraft[]): Promise<void> {
  const { error } = await supabase()
    .from('character_classes')
    .upsert(
      classes.map((c, index) => ({
        icon: c.icon,
        name: c.name,
        hand_size: c.handSize,
        // 빈 표는 빈 채로 올린다. 아홉 칸이 아니면 서버의 check가 막는다.
        hp: c.hp.length === MAX_LEVEL ? c.hp : [],
        // 붙여넣은 차례를 그대로 보여주는 차례로 쓴다.
        sort: c.sort || index,
      })),
      { onConflict: 'name' },
    )
  if (error) throw error
}

/** 지운다. 잘못 넣었을 때 되돌리는 길이다. */
export async function deleteClass(id: string): Promise<void> {
  const { error } = await supabase().from('character_classes').delete().eq('id', id)
  if (error) throw error
}
