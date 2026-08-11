import { create } from 'zustand'
import { fetchClasses, type ClassInfo } from './classNet'
import { fetchClassPerks, type ClassPerk } from './perkNet'
import { MAX_LEVEL, clampLevel } from './character'

/**
 * 클래스 수치 스토어.
 *
 * **한 번 읽으면 그만이다.** 클래스 수치는 판 도중에 바뀌지 않는다 — 관리자가
 * 넣거나 고칠 때만 달라지고, 그때는 화면을 다시 열면 된다.
 *
 * **없어도 앱은 돈다.** 아직 아무것도 안 넣었으면 빈 목록이고, 화면은 이름 없이
 * 아이콘만 보여주던 종전 모습으로 간다(절대 원칙 3과 같은 결).
 *
 * **특혜 표를 함께 읽는다.** 클래스 수치와 같은 주기로 바뀌고 같은 때에 필요하다 —
 * 캐릭터 시트가 이름과 특혜를 나란히 그리고, 덱 위젯이 클래스를 알아야 그 표를
 * 찾는다. 따로 두면 왕복만 둘로 는다.
 */

interface ClassState {
  /** 넣어 둔 클래스. 보여줄 차례대로다. */
  list: ClassInfo[]
  /** 클래스 id → 그 클래스의 특혜 줄들. `sort` 차례다. */
  perks: Record<string, ClassPerk[]>
  loaded: boolean
  load: (force?: boolean) => Promise<void>
}

function groupPerks(perks: readonly ClassPerk[]): Record<string, ClassPerk[]> {
  const out: Record<string, ClassPerk[]> = {}
  for (const perk of perks) {
    ;(out[perk.classId] ??= []).push(perk)
  }
  for (const list of Object.values(out)) list.sort((a, b) => a.sort - b.sort)
  return out
}

export const useClassStore = create<ClassState>((set, get) => ({
  list: [],
  perks: {},
  loaded: false,

  load: async (force = false) => {
    if (get().loaded && !force) return
    const [list, perks] = await Promise.all([fetchClasses(), fetchClassPerks()])
    set({ list, perks: groupPerks(perks), loaded: true })
  },
}))

/**
 * 캐릭터가 가리키는 클래스.
 *
 * **id로 먼저 찾고, 없으면 아이콘 번호로 찾는다.** 클래스 표가 생기기 전에 만든
 * 캐릭터는 아이콘만 들고 있다 — 그 사람들도 이름과 최대 체력을 보게 한다.
 */
export function classInfoOf(
  list: readonly ClassInfo[],
  classId: string | null,
  icon: number,
): ClassInfo | null {
  if (classId) {
    const byId = list.find((c) => c.id === classId)
    if (byId) return byId
  }
  if (icon > 0) return list.find((c) => c.icon === icon) ?? null
  return null
}

/**
 * 그 레벨의 최대 체력. 모르면 `null`.
 *
 * **모르면 모른다고 한다.** 짐작해서 숫자를 내면 사람이 그것을 믿는데, 틀린 최대
 * 체력은 판을 어긋나게 한다 — 규칙을 판정하지 않는다는 선과 같은 결이다.
 */
export function maxHpFor(info: ClassInfo | null, level: number): number | null {
  if (!info || info.hp.length !== MAX_LEVEL) return null
  return info.hp[clampLevel(level) - 1] ?? null
}
