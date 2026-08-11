import { create } from 'zustand'
import { isSupabaseConfigured, supabase } from '../auth/supabase'
import { hasClassIcon, normalizePerks } from '../campaign/character'

/**
 * 캐릭터 이름표 — 축 ②가 축 ①에서 읽는 **딱 그만큼**.
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ **읽기만 한다. 식별자·이름·클래스 표식까지다.**                           │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * SPEC 1장이 2026-08-05에 "공격 보정 덱이 퍽을 읽는다"는 예외 하나를 열었다.
 * 그 예외를 쓰려면 **어느 캐릭터인지 먼저 고를 수 있어야 한다** — 고를 것이
 * 없는데 퍽만 읽을 수는 없다. 2026-08-08에 그 몫만큼 넓혔다(SPEC 1장).
 *
 * **왜 필요한가.** HP/XP와 보정 덱은 위젯 인스턴스에 묶여 있었다. 인스턴스 id는
 * 기기마다 다르므로 판을 나눠도 서로 다른 열쇠를 보고, 넷이 앉아도 아무것도
 * 겹치지 않는다. **파티원 모두가 알아보는 이름표**가 있어야 한 사람의 체력이
 * 한 자리에 모인다.
 *
 * **2026-08-11에 퍽과 클래스를 더 읽는다.** 이것이 2026-08-05에 열어 둔 그 예외
 * 자체다 — 공격 보정 덱의 구성은 캐릭터가 켠 특혜가 정하므로, 그것을 못 읽으면
 * 사람이 퍽을 얻을 때마다 위젯 설정에서 장수를 다시 맞춰야 한다. 특혜 표는
 * 클래스에 딸려 있으므로 어느 클래스인지도 함께 읽는다.
 *
 * **골드·경험·아이템·메모는 안 읽는다.** 여기 담긴 것은 고르는 데 필요한 것과
 * 덱 구성에 필요한 것뿐이다. 캐릭터를 고치는 일은 어느 경우에도 없다.
 *
 * 기록지 스토어(`campaignStore`)를 쓰지 않는 것도 뜻이 있다 — 그쪽을 부르면
 * 축 ②가 캠페인·파티 상태까지 끌고 들어온다. 필요한 세 칸만 따로 읽는다.
 */

export interface RosterEntry {
  id: string
  name: string
  /** Creator Pack 클래스 아이콘의 쪽 번호. 0이면 안 골랐다. */
  classIcon: number
  /** 어느 클래스인가. 특혜 표를 찾는 열쇠다. 안 골랐으면 `null`. */
  classId: string | null
  /** 켜 둔 특혜 상자 번호. 1부터이며 실물 시트의 상자 차례와 같다. */
  perks: number[]
  ownerId: string
  ownerName: string
}

interface RosterState {
  entries: RosterEntry[]
  loaded: boolean
  load: () => Promise<void>
}

interface Row {
  id: string
  name: string
  class_icon: number
  class_id: string | null
  perks: number[] | null
  owner_id: string
  retired: boolean
  owner: { display_name: string | null } | null
}

export const useRosterStore = create<RosterState>((set, get) => ({
  entries: [],
  loaded: false,

  load: async () => {
    // 한 번 읽으면 그만이다. 캐릭터가 늘어나는 일은 판 도중에 없다.
    if (get().loaded) return
    if (!isSupabaseConfigured()) {
      set({ loaded: true })
      return
    }
    try {
      const { data, error } = await supabase()
        .from('characters')
        .select(
          'id, name, class_icon, class_id, perks, owner_id, retired, owner:profiles!characters_owner_id_fkey(display_name)',
        )
        .order('created_at', { ascending: true })
      if (error || !data) {
        set({ loaded: true })
        return
      }
      const entries = (data as unknown as Row[])
        // 은퇴한 캐릭터는 상에 없다. 고를 목록에 두면 자리만 어지럽다.
        .filter((row) => row.retired !== true)
        .map((row) => ({
          id: row.id,
          name: typeof row.name === 'string' ? row.name : '',
          classIcon: hasClassIcon(row.class_icon) ? row.class_icon : 0,
          classId: typeof row.class_id === 'string' && row.class_id !== '' ? row.class_id : null,
          perks: normalizePerks(Array.isArray(row.perks) ? row.perks : []),
          ownerId: row.owner_id,
          ownerName: row.owner?.display_name ?? '',
        }))
      set({ entries, loaded: true })
    } catch {
      // 못 읽어도 도구는 돌아야 한다(절대 원칙 3). 고를 것이 없을 뿐이다.
      set({ loaded: true })
    }
  },
}))

/**
 * 이 위젯이 값을 담을 열쇠.
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ **캐릭터를 골랐으면 그 id, 아니면 위젯 인스턴스 id.**                     │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * 캐릭터를 고르면 파티원 모두가 같은 열쇠를 보므로 한 사람의 값이 한 자리에
 * 모인다. **안 골랐어도 도구는 그대로 돈다** — 로그인 전이거나 캐릭터를 아직
 * 안 만들었을 때 위젯이 죽으면 안 된다(절대 원칙 3). 그때는 종전대로 제 기기
 * 안에서만 센다.
 */
export function slotKeyFor(characterId: string | null, instanceId: string): string {
  return characterId ?? instanceId
}

/** 저장된 값에서 캐릭터 id를 건져낸다. 모양이 아니면 안 고른 것으로 친다. */
export function sanitizeCharacterId(raw: unknown): string | null {
  return typeof raw === 'string' && raw !== '' ? raw : null
}
