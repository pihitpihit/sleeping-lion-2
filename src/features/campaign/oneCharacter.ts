import { create } from 'zustand'
import { NetError } from '../net/adapter'
import { deleteCharacter, fetchCharacter, joinParty, pushCharacterEdits } from './characterNet'
import type { Character, CharacterEdits } from './types'

/**
 * 캐릭터 한 장 — **캐릭터 화면(`#/character/<id>`)의 것.**
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ **파티를 모른 채 열 수 있어야 한다.**                                     │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * `characterStore`는 **기록지 하나의 캐릭터 전부**를 들고 있다(파티 화면의 무리
 * 목록이 그것을 쓴다). 파티에 안 든 캐릭터는 기록지가 없어 그 길로는 닿을 수
 * 없으므로 따로 둔다 — 되살아나는 주기도 다르다(구현 결정 46과 같은 근거).
 *
 * **못 읽어도 화면은 선다.** 없는 캐릭터를 열면 "그런 캐릭터가 없다"고 말한다.
 */

interface OneCharacterState {
  character: Character | null
  loaded: boolean
  busy: boolean
  error: string | null

  load: (id: string) => Promise<void>
  edit: (edits: CharacterEdits) => Promise<void>
  /** 파티에 들거나 나온다. 시트에서 고치는 칸이 아니라 따로 하는 일이다. */
  join: (campaignId: string | null) => Promise<void>
  remove: () => Promise<void>
  reset: () => void
}

function messageOf(cause: unknown): string {
  if (cause instanceof NetError) return cause.message
  const raw = cause instanceof Error ? cause.message : String(cause ?? '')
  if (/fetch|network|Failed to fetch/i.test(raw)) return '서버에 닿지 못했다.'
  // 서버가 거절한 자리 — 제가 든 파티가 아니면 RLS가 막는다(`0015`).
  if (/row-level security|violates/i.test(raw)) return '그 파티에는 넣을 수 없다.'
  return '뜻대로 되지 않았습니다.'
}

export const useOneCharacterStore = create<OneCharacterState>((set, get) => ({
  character: null,
  loaded: false,
  busy: false,
  error: null,

  load: async (id) => {
    // 다른 캐릭터를 열면 앞의 것을 먼저 치운다. 남겨두면 잠깐 남의 시트가 뜬다.
    if (get().character?.id !== id) set({ character: null, loaded: false, error: null })
    try {
      set({ character: await fetchCharacter(id), loaded: true, error: null })
    } catch (cause) {
      set({ loaded: true, error: messageOf(cause) })
    }
  },

  edit: async (edits) => {
    const before = get().character
    if (!before) return
    // 손이 먼저 움직인 것처럼 보이게 화면부터 바꾼다. 서버가 돌려준 값이 뒤따라 덮는다.
    set({ character: { ...before, ...edits }, error: null })
    try {
      set({ character: await pushCharacterEdits(before.id, edits) })
    } catch (cause) {
      // 되돌린다. 적었는데 안 남은 채로 남아 있는 것이 제일 나쁘다.
      set({ character: before, error: messageOf(cause) })
    }
  },

  join: async (campaignId) => {
    const before = get().character
    if (!before) return
    set({ busy: true, error: null })
    try {
      set({ character: await joinParty(before.id, campaignId) })
    } catch (cause) {
      set({ error: messageOf(cause) })
    } finally {
      set({ busy: false })
    }
  },

  remove: async () => {
    const before = get().character
    if (!before) return
    set({ busy: true, error: null })
    try {
      await deleteCharacter(before.id)
      set({ character: null })
    } catch (cause) {
      set({ error: messageOf(cause) })
    } finally {
      set({ busy: false })
    }
  },

  reset: () => set({ character: null, loaded: false, error: null }),
}))
