import { create } from 'zustand'
import { listOpenAdventures, type Adventure } from './adventureNet'

/**
 * 열려 있는 모험 목록.
 *
 * **대문과 모험 화면이 함께 본다** — 대문은 배지 하나를 그리려고 세기만 하고,
 * 모험 화면은 그 목록을 늘어놓는다. 두 곳에서 따로 읽으면 대문의 수와 안의
 * 목록이 어긋난다.
 *
 * 서버에 못 닿아도 조용하다(절대 원칙 3) — 모험은 서버가 있어야 하는 일이지만
 * **대문이 그것 때문에 멎지는 않는다.**
 */
interface AdventureState {
  items: Adventure[]
  loaded: boolean
  load: () => Promise<void>
  reset: () => void
}

export const useAdventureStore = create<AdventureState>((set) => ({
  items: [],
  loaded: false,

  load: async () => {
    try {
      set({ items: await listOpenAdventures(), loaded: true })
    } catch (cause) {
      console.error('[adventure]', cause)
      set({ loaded: true })
    }
  },

  reset: () => set({ items: [], loaded: false }),
}))
