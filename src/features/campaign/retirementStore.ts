import { create } from 'zustand'
import { move } from './itineraryOrder'
import {
  addRetirement,
  editRetirement,
  listRetirements,
  removeRetirement,
  saveRetirementOrder,
  type Retirement,
  type RetirementEdits,
} from './retirementNet'

/**
 * 은퇴한 캐릭터 — 기록지가 본다.
 *
 * 행적과 같은 짜임이다(`itineraryStore`): **초안에 담지 않고 곧바로 쓴다.**
 * 한 줄을 적거나 고치는 일이고 여럿이 함께 쓰는 목록이라 늦게 올릴 까닭이 없다
 * (구현 결정 511).
 *
 * 대부분의 줄은 **서버가 베껴 둔다**(`0043`의 트리거) — 시트에서 은퇴를 켜고
 * 저장하면 그 갱신 하나로 기록까지 남는다. 여기서 하는 일은 그것을 보여 주고,
 * 종이에만 있던 줄을 손으로 더하고, 틀린 값을 바로잡는 것이다.
 */
interface RetirementState {
  campaignId: string | null
  rows: Retirement[]
  loaded: boolean
  busy: boolean
  error: string | null

  load: (campaignId: string, force?: boolean) => Promise<void>
  add: (edits: RetirementEdits) => Promise<void>
  edit: (id: string, edits: RetirementEdits) => Promise<void>
  remove: (id: string) => Promise<void>
  shift: (id: string, delta: number) => Promise<void>
}

function messageOf(cause: unknown): string {
  const raw = cause instanceof Error ? cause.message : String(cause ?? '')
  if (/fetch|network|Failed to fetch/i.test(raw)) return '서버에 닿지 못했다.'
  return '뜻대로 되지 않았습니다.'
}

export const useRetirementStore = create<RetirementState>((set, get) => ({
  campaignId: null,
  rows: [],
  loaded: false,
  busy: false,
  error: null,

  load: async (campaignId, force = false) => {
    if (get().campaignId === campaignId && get().loaded && !force) return
    set({ campaignId, loaded: false })
    try {
      const rows = await listRetirements(campaignId)
      // 그 사이에 다른 기록지로 옮겨 갔으면 버린다.
      if (get().campaignId !== campaignId) return
      set({ rows, loaded: true, error: null })
    } catch (cause) {
      console.error('[retirements]', cause)
      set({ rows: [], loaded: true })
    }
  },

  add: async (edits) => {
    const campaignId = get().campaignId
    if (campaignId === null) return
    set({ busy: true, error: null })
    try {
      // 실물 표처럼 **아래에 붙는다** — 은퇴한 차례가 곧 적히는 차례다.
      const fresh = await addRetirement(campaignId, edits, get().rows.length)
      set({ rows: [...get().rows, fresh] })
    } catch (cause) {
      set({ error: messageOf(cause) })
      await get().load(campaignId, true)
    } finally {
      set({ busy: false })
    }
  },

  edit: async (id, edits) => {
    const campaignId = get().campaignId
    if (campaignId === null) return
    set({ busy: true, error: null })
    try {
      await editRetirement(id, edits)
      set({
        rows: get().rows.map((row) => (row.id === id ? { ...row, ...edits } : row)),
      })
    } catch (cause) {
      set({ error: messageOf(cause) })
      await get().load(campaignId, true)
    } finally {
      set({ busy: false })
    }
  },

  remove: async (id) => {
    const campaignId = get().campaignId
    if (campaignId === null) return
    set({ busy: true, error: null })
    try {
      await removeRetirement(id)
      const order = get().rows.filter((row) => row.id !== id)
      set({ rows: order })
      await saveRetirementOrder(campaignId, order)
    } catch (cause) {
      set({ error: messageOf(cause) })
      await get().load(campaignId, true)
    } finally {
      set({ busy: false })
    }
  },

  shift: async (id, delta) => {
    const campaignId = get().campaignId
    if (campaignId === null) return
    /* 차례를 옮기는 규칙은 행적과 같다 — 두 벌로 두면 언젠가 어긋난다. */
    const order = move(get().rows, id, delta)
    if (order.every((row, i) => row.id === get().rows[i].id)) return
    set({ rows: order, error: null })
    try {
      await saveRetirementOrder(campaignId, order)
    } catch (cause) {
      set({ error: messageOf(cause) })
      await get().load(campaignId, true)
    }
  },
}))
