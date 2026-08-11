import { create } from 'zustand'
import { fetchClasses, type ClassInfo } from './classNet'
import { MAX_LEVEL, clampLevel } from './character'

/**
 * 클래스 수치 스토어.
 *
 * **한 번 읽으면 그만이다.** 클래스 수치는 판 도중에 바뀌지 않는다 — 관리자가
 * 넣거나 고칠 때만 달라지고, 그때는 화면을 다시 열면 된다.
 *
 * **없어도 앱은 돈다.** 아직 아무것도 안 넣었으면 빈 목록이고, 화면은 이름 없이
 * 아이콘만 보여주던 종전 모습으로 간다(절대 원칙 3과 같은 결).
 */

interface ClassState {
  byIcon: Record<number, ClassInfo>
  loaded: boolean
  load: (force?: boolean) => Promise<void>
}

export const useClassStore = create<ClassState>((set, get) => ({
  byIcon: {},
  loaded: false,

  load: async (force = false) => {
    if (get().loaded && !force) return
    const list = await fetchClasses()
    const byIcon: Record<number, ClassInfo> = {}
    for (const info of list) byIcon[info.icon] = info
    set({ byIcon, loaded: true })
  },
}))

/** 그 아이콘의 클래스 수치. 안 넣었으면 `null`. */
export function classInfoOf(byIcon: Record<number, ClassInfo>, icon: number): ClassInfo | null {
  return byIcon[icon] ?? null
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
