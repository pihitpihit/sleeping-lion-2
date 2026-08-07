import { create } from 'zustand'
import { NetError } from '../net/adapter'
import {
  createCharacter,
  deleteCharacter,
  fetchCharacters,
  pushCharacterEdits,
} from './characterNet'
import { mirrorCharacters, mirroredCharacters } from './db'
import type { Character, CharacterEdits } from './types'

/**
 * 캐릭터 스토어. 펼쳐 둔 기록지 하나의 것만 들고 있다.
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ **파티원 것을 다 들고 있되, 고치는 것은 제 것만.**                        │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * 남의 캐릭터도 목록에 온다 — 누가 몇 레벨이고 무엇을 들었는지 보이지 않으면
 * 같이 놀 수 없다. **막는 것은 RLS다**(`0005_characters.sql`). 화면에서 잠그는
 * 것은 헛손질을 줄이는 것일 뿐이다.
 *
 * 기록지 스토어와 나눠 둔 이유는 **되살아나는 주기가 다르기 때문**이다. 기록지는
 * 목록 화면에서도 필요하고, 캐릭터는 기록지를 펼친 뒤에야 필요하다. 한 스토어에
 * 묶으면 목록을 새로 읽을 때마다 캐릭터도 함께 읽는다.
 */

interface CharacterState {
  /** 지금 들고 있는 것이 어느 기록지의 것인가. */
  campaignId: string | null
  characters: Character[]
  loaded: boolean
  /** 서버에 못 닿아 거울을 보여주는 중인가. 쓰기가 막힌다. */
  offline: boolean
  busy: boolean
  error: string | null

  load: (campaignId: string) => Promise<void>
  add: (campaignId: string, ownerId: string, name: string, classIcon: number) => Promise<void>
  edit: (id: string, edits: CharacterEdits) => Promise<void>
  remove: (id: string) => Promise<void>
  clearError: () => void
  reset: () => void
}

function messageOf(cause: unknown): string {
  if (cause instanceof NetError) return cause.message
  const raw = cause instanceof Error ? cause.message : String(cause ?? '')
  if (/fetch|network|Failed to fetch/i.test(raw)) return '서버에 닿지 못했다.'
  return '뜻대로 되지 않았습니다.'
}

function looksOffline(cause: unknown): boolean {
  const raw = cause instanceof Error ? cause.message : String(cause ?? '')
  return /fetch|network|Failed to fetch|닿지 못/i.test(raw)
}

export const useCharacterStore = create<CharacterState>((set, get) => ({
  campaignId: null,
  characters: [],
  loaded: false,
  offline: false,
  busy: false,
  error: null,

  load: async (campaignId) => {
    // 다른 기록지를 펼쳤으면 앞의 것을 먼저 치운다. 남겨두면 잠깐 남의 파티
    // 캐릭터가 뜬다.
    if (get().campaignId !== campaignId) {
      set({ campaignId, characters: [], loaded: false, offline: false, error: null })
    }

    try {
      const characters = await fetchCharacters(campaignId)
      await mirrorCharacters(campaignId, characters)
      set({ campaignId, characters, loaded: true, offline: false, error: null })
    } catch (cause) {
      if (!looksOffline(cause)) {
        set({ campaignId, loaded: true, error: messageOf(cause) })
        return
      }
      const kept = await mirroredCharacters(campaignId)
      set({ campaignId, characters: kept, loaded: true, offline: true, error: null })
    }
  },

  add: async (campaignId, ownerId, name, classIcon) => {
    const trimmed = name.trim()
    if (trimmed === '') return
    if (get().offline) {
      set({ error: '서버에 닿지 못해 지금은 세울 수 없다. 연결되면 다시 하라.' })
      return
    }

    set({ busy: true, error: null })
    try {
      const made = await createCharacter(campaignId, ownerId, trimmed, classIcon)
      const next = [...get().characters, made]
      await mirrorCharacters(campaignId, next)
      set({ characters: next })
    } catch (cause) {
      set({ error: messageOf(cause), offline: looksOffline(cause) })
    } finally {
      set({ busy: false })
    }
  },

  edit: async (id, edits) => {
    const before = get().characters
    const target = before.find((c) => c.id === id)
    if (!target) return

    if (get().offline) {
      set({ error: '서버에 닿지 못해 지금은 고칠 수 없다. 연결되면 다시 하라.' })
      return
    }

    // 손이 먼저 움직인 것처럼 보이게 화면부터 바꾼다. 서버가 돌려준 값이 뒤따라
    // 덮는다 — 다이얼을 연달아 누르는 자리라 왕복을 기다리면 손가락이 미끄러진다.
    set({
      characters: before.map((c) => (c.id === id ? { ...c, ...edits } : c)),
      error: null,
    })

    try {
      const saved = await pushCharacterEdits(id, edits)
      const next = get().characters.map((c) => (c.id === id ? saved : c))
      const campaignId = get().campaignId
      if (campaignId) await mirrorCharacters(campaignId, next)
      set({ characters: next })
    } catch (cause) {
      // 되돌린다. 적었는데 안 남은 채로 남아 있는 것이 제일 나쁘다.
      set({
        characters: get().characters.map((c) => (c.id === id ? target : c)),
        error: messageOf(cause),
        offline: looksOffline(cause),
      })
    }
  },

  remove: async (id) => {
    if (get().offline) {
      set({ error: '서버에 닿지 못해 지금은 거둘 수 없다. 연결되면 다시 하라.' })
      return
    }
    set({ busy: true, error: null })
    try {
      await deleteCharacter(id)
      const next = get().characters.filter((c) => c.id !== id)
      const campaignId = get().campaignId
      if (campaignId) await mirrorCharacters(campaignId, next)
      set({ characters: next })
    } catch (cause) {
      set({ error: messageOf(cause), offline: looksOffline(cause) })
    } finally {
      set({ busy: false })
    }
  },

  clearError: () => set({ error: null }),

  reset: () =>
    set({ campaignId: null, characters: [], loaded: false, offline: false, error: null }),
}))
