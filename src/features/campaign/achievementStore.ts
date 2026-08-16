import { create } from 'zustand'
import {
  addAchievement,
  listAchievements,
  removeAchievement,
  type AchievementName,
  type AchievementScope,
} from './achievementNet'

/**
 * 업적 목록 — 상점 스토어와 같은 짜임이다(`shopStore`).
 *
 * 못 읽어도 화면은 선다(절대 원칙 3) — 고를 것이 없을 뿐이다.
 */
interface AchievementState {
  items: AchievementName[]
  loaded: boolean
  load: () => Promise<void>
  add: (name: string, scope: AchievementScope, userId: string) => Promise<void>
  drop: (id: string) => Promise<void>
}

export const useAchievementStore = create<AchievementState>((set, get) => ({
  items: [],
  loaded: false,

  load: async () => {
    try {
      set({ items: await listAchievements(), loaded: true })
    } catch (cause) {
      console.error('[achievement]', cause)
      set({ loaded: true })
    }
  },

  /** 적지 못하면 그대로 던진다 — 화면이 까닭을 적어야 한다(같은 이름 등). */
  add: async (name, scope, userId) => {
    const made = await addAchievement(name, scope, userId)
    set({ items: [...get().items, made].sort((a, b) => a.name.localeCompare(b.name)) })
  },

  drop: async (id) => {
    await removeAchievement(id)
    set({ items: get().items.filter((i) => i.id !== id) })
  },
}))
