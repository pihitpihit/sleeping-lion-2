import { create } from 'zustand'
import { fetchMyCharacters, type MyCharacter } from './mineNet'

/**
 * 내 캐릭터 목록 스토어 — 일지 첫 화면의 것.
 *
 * **기록지 스토어·캐릭터 스토어와 따로 둔다.** 되살아나는 주기가 셋 다 다르다
 * (구현 결정 46과 같은 근거) — 이것은 일지 **목록**에서만 필요하고, 기록지를
 * 펼치면 그때부터는 `characterStore`가 그 기록지의 것을 들고 있다.
 *
 * **못 읽어도 화면은 선다.** 캐릭터 목록이 비고 파티 목록만 보인다 — 서버에 못
 * 닿는 자리에서 일지가 통째로 막히면 안 된다(절대 원칙 3).
 */

interface MineState {
  characters: MyCharacter[]
  loaded: boolean
  load: (userId: string) => Promise<void>
  reset: () => void
}

export const useMineStore = create<MineState>((set) => ({
  characters: [],
  loaded: false,

  load: async (userId) => {
    try {
      set({ characters: await fetchMyCharacters(userId), loaded: true })
    } catch {
      // 조용히 접는다. 목록이 비는 것과 앱이 서지 않는 것은 다르다.
      set({ loaded: true })
    }
  },

  reset: () => set({ characters: [], loaded: false }),
}))
