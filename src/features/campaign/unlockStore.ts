import { create } from 'zustand'
import { listUnlockConditions, type UnlockCondition } from './unlockNet'

/**
 * 개봉 조건 표 — 기록지와 관리자 화면이 함께 본다.
 *
 * **못 읽어도 화면은 선다**(절대 원칙 3). 값이 없으면 기록지에 그 칸이 안 보이고
 * 나머지는 그대로 돈다.
 */
interface UnlockState {
  items: UnlockCondition[]
  loaded: boolean
  load: (force?: boolean) => Promise<void>
}

export const useUnlockStore = create<UnlockState>((set, get) => ({
  items: [],
  loaded: false,

  load: async (force = false) => {
    if (get().loaded && !force) return
    try {
      set({ items: await listUnlockConditions(), loaded: true })
    } catch (cause) {
      console.error('[unlock]', cause)
      set({ loaded: true })
    }
  },
}))
