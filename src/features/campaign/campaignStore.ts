import { create } from 'zustand'
import { createCampaign, deleteCampaign, getCampaign, listCampaigns, updateCampaign } from './db'
import type { Campaign, CampaignEdits } from './types'

/**
 * 캠페인 기록지 스토어.
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ **여기 있는 것은 IndexedDB의 거울이다. `persist`를 붙이지 않는다.**        │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * 정본은 Dexie이고 이 스토어는 화면이 읽기 좋게 들고 있는 사본일 뿐이다. `persist`를
 * 붙이면 같은 것이 `localStorage`에도 쌓여 두 벌이 어긋난다 — 행낭 스토어가
 * `localStorage`를 정본으로 삼는 것과 방향이 반대다(SPEC 5.2).
 *
 * **쓰기는 늘 Dexie를 먼저 거친다.** 스토어를 먼저 고치고 저장을 뒤따르게 하면,
 * 저장이 실패했을 때 화면만 바뀐 채로 남는다.
 */

interface CampaignState {
  /** 목록. 최근에 손댄 것부터. */
  list: Campaign[]
  /** 지금 펼쳐 둔 기록지. 목록 화면에서는 `null`. */
  current: Campaign | null
  /** 첫 읽기가 끝났는가. 끝나기 전에는 "없다"고 말하면 안 된다. */
  loaded: boolean
  /** 사용자에게 보여줄 실패. */
  error: string | null

  refresh: () => Promise<void>
  open: (id: string) => Promise<void>
  close: () => void
  add: (name: string) => Promise<Campaign | null>
  edit: (id: string, edits: CampaignEdits) => Promise<void>
  remove: (id: string) => Promise<void>
  clearError: () => void
}

/**
 * 저장소를 만지는 일을 한 겹으로 감싼다.
 *
 * IndexedDB는 사파리의 사생활 보호 모드처럼 아예 막힌 자리가 있다. 그때 화면이
 * 조용히 비면 무엇이 잘못됐는지 알 수 없으므로 **실패를 말로 남긴다.**
 */
async function guard<T>(set: (partial: Partial<CampaignState>) => void, run: () => Promise<T>) {
  try {
    const value = await run()
    set({ error: null })
    return value
  } catch (cause) {
    console.error('[campaign]', cause)
    set({ error: '기록지를 저장하지 못했다. 브라우저가 저장을 막고 있을 수 있다.' })
    return null
  }
}

export const useCampaignStore = create<CampaignState>((set, get) => ({
  list: [],
  current: null,
  loaded: false,
  error: null,

  refresh: async () => {
    const rows = await guard(set, listCampaigns)
    set({ list: rows ?? [], loaded: true })
  },

  open: async (id) => {
    const found = await guard(set, () => getCampaign(id))
    set({ current: found ?? null, loaded: true })
  },

  close: () => set({ current: null }),

  add: async (name) => {
    const trimmed = name.trim()
    if (trimmed === '') return null
    const made = await guard(set, () => createCampaign({ name: trimmed }))
    if (made) await get().refresh()
    return made
  },

  edit: async (id, edits) => {
    const next = await guard(set, () => updateCampaign(id, edits))
    if (!next) return
    set((s) => ({
      current: s.current?.id === id ? next : s.current,
      list: s.list.map((item) => (item.id === id ? next : item)),
    }))
  },

  remove: async (id) => {
    await guard(set, () => deleteCampaign(id))
    set((s) => ({
      list: s.list.filter((item) => item.id !== id),
      current: s.current?.id === id ? null : s.current,
    }))
  },

  clearError: () => set({ error: null }),
}))
