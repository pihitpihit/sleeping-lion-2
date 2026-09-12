import { create } from 'zustand'
import { move, placeByDate, type Stop } from './itineraryOrder'
import { addStop, editStop, listStops, removeStop, saveOrder } from './itineraryNet'

/**
 * 행적 — 기록지와 배너가 함께 본다.
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ **초안에 담지 않고 곧바로 쓴다.**                                         │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * 기록지의 다른 칸은 편집 모드에서 초안에 담고 저장을 눌러야 나간다(구현 결정
 * 236) — 평판처럼 **다이얼로 옮기면 그 사이 수십 번이 나가기** 때문이다. 행적은
 * 그런 값이 아니다: 한 줄을 적거나 고치는 일이고, 상점 목록·업적 목록과 같은
 * 결이다(구현 결정 330·344). **여럿이 함께 쓰는 목록이라 늦게 올릴 까닭도 없다.**
 *
 * 못 읽어도 기록지는 선다(절대 원칙 3) — 그때는 행적이 비어 보인다.
 */
interface ItineraryState {
  /** 어느 기록지의 것인가. 다른 기록지를 열면 갈아 끼운다. */
  campaignId: string | null
  stops: Stop[]
  loaded: boolean
  busy: boolean
  error: string | null

  load: (campaignId: string, force?: boolean) => Promise<void>
  add: (stop: Omit<Stop, 'id'>) => Promise<void>
  edit: (stop: Stop) => Promise<void>
  remove: (id: string) => Promise<void>
  /** 한 칸 올리거나 내린다. */
  shift: (id: string, delta: number) => Promise<void>
}

function messageOf(cause: unknown): string {
  const raw = cause instanceof Error ? cause.message : String(cause ?? '')
  if (/fetch|network|Failed to fetch/i.test(raw)) return '서버에 닿지 못했다.'
  return '뜻대로 되지 않았습니다.'
}

export const useItineraryStore = create<ItineraryState>((set, get) => ({
  campaignId: null,
  stops: [],
  loaded: false,
  busy: false,
  error: null,

  load: async (campaignId, force = false) => {
    if (get().campaignId === campaignId && get().loaded && !force) return
    set({ campaignId, loaded: false })
    try {
      const stops = await listStops(campaignId)
      // 그 사이에 다른 기록지로 옮겨 갔으면 버린다.
      if (get().campaignId !== campaignId) return
      set({ stops, loaded: true, error: null })
    } catch (cause) {
      console.error('[itinerary]', cause)
      set({ stops: [], loaded: true })
    }
  },

  add: async (stop) => {
    const campaignId = get().campaignId
    if (campaignId === null) return
    set({ busy: true, error: null })
    try {
      /*
        맨 위에 놓고 나서 날짜가 있으면 제 자리로 옮긴다 — **날짜를 적었으면
        그것이 차례를 정한다.** 날짜가 없으면 맨 위가 곧 지금 머무는 곳이다.
      */
      const fresh = await addStop(campaignId, stop, -1)
      const order = placeByDate([fresh, ...get().stops], fresh.id)
      set({ stops: order })
      await saveOrder(campaignId, order)
    } catch (cause) {
      set({ error: messageOf(cause) })
      await get().load(campaignId, true)
    } finally {
      set({ busy: false })
    }
  },

  edit: async (stop) => {
    const campaignId = get().campaignId
    if (campaignId === null) return
    set({ busy: true, error: null })
    try {
      await editStop(stop)
      const merged = get().stops.map((s) => (s.id === stop.id ? stop : s))
      // 날짜를 고쳤으면 그 줄만 제 자리로 옮긴다.
      const order = placeByDate(merged, stop.id)
      set({ stops: order })
      await saveOrder(campaignId, order)
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
      await removeStop(id)
      const order = get().stops.filter((s) => s.id !== id)
      set({ stops: order })
      await saveOrder(campaignId, order)
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
    const order = move(get().stops, id, delta)
    // 끝에서 더 갈 곳이 없으면 아무것도 안 한다 — 괜히 요청을 띄우지 않는다.
    if (order.every((s, i) => s.id === get().stops[i].id)) return
    set({ stops: order, error: null })
    try {
      await saveOrder(campaignId, order)
    } catch (cause) {
      set({ error: messageOf(cause) })
      await get().load(campaignId, true)
    }
  },
}))
