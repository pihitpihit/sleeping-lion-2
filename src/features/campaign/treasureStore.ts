import { create } from 'zustand'
import { listTreasures, type Treasure } from './treasureNet'

/**
 * 보물 색인 — 기록지와 관리자 화면이 함께 본다.
 *
 * **못 읽어도 화면은 선다**(절대 원칙 3). 값이 없으면 기록지에 번호만 늘어서고
 * 찾은 것을 켜는 일은 그대로 된다 — 글이 없을 뿐이다.
 */
interface TreasureState {
  items: Treasure[]
  loaded: boolean
  load: (force?: boolean) => Promise<void>
}

export const useTreasureStore = create<TreasureState>((set, get) => ({
  items: [],
  loaded: false,

  load: async (force = false) => {
    if (get().loaded && !force) return
    try {
      set({ items: await listTreasures(), loaded: true })
    } catch (cause) {
      console.error('[treasure]', cause)
      set({ loaded: true })
    }
  },
}))
