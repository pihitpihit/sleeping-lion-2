import { create } from 'zustand'
import { NetError } from '../net/adapter'
import { partyAdapter } from '../net'
import type { Identity, Party } from '../net/types'
import { fetchCampaigns, fetchOrCreateFor, pushEdits } from './campaignNet'
import { forgetMirror, mirror, mirroredAll, mirroredFor } from './db'
import type { Campaign, CampaignEdits } from './types'

/**
 * 일지 스토어.
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ **일지 항목 하나 = 파티 하나 = 기록지 하나.**                             │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * '동행'과 '일지'를 따로 두었더니 화면에 파티가 둘이 되어 어느 쪽을 만들라는
 * 것인지 알 수 없었다. 실물에서는 하나다 — 파티 시트가 곧 그 파티다.
 *
 * **정본은 서버이고 Dexie는 거울이다.** `persist`를 붙이지 않는다 — 붙이면 같은
 * 것이 `localStorage`에도 쌓여 세 벌이 어긋난다.
 *
 * **읽기는 오프라인에서도 된다.** 서버에 못 닿으면 거울을 보여주고 그 사실을
 * 알린다. **쓰기는 막는다** — 오프라인 큐와 충돌 병합은 딸려 오는 덩어리가 커서
 * 따로 둔다(SPEC 5.3). 조용히 받아 두었다가 잃는 것보다 못 쓴다고 말하는 편이 낫다.
 */

/** 일지 목록의 한 줄. 파티와 그 기록지를 함께 들고 있다. */
export interface JournalEntry {
  party: Party
  /** 아직 서버에서 안 읽었거나 만들어지지 않았으면 `null`. */
  campaign: Campaign | null
}

interface JournalState {
  entries: JournalEntry[]
  /** 지금 펼쳐 둔 것. 목록 화면에서는 `null`. */
  current: JournalEntry | null
  loaded: boolean
  /** 서버에 못 닿아 거울을 보여주는 중인가. 쓰기가 막힌다. */
  offline: boolean
  busy: boolean
  error: string | null

  refresh: (me: Identity) => Promise<void>
  open: (partyId: string, me: Identity) => Promise<void>
  close: () => void
  /** 파티를 세우면 기록지도 함께 생긴다. 만든 파티의 id를 돌려준다. */
  addParty: (name: string, me: Identity) => Promise<string | null>
  edit: (edits: CampaignEdits) => Promise<void>
  leave: (partyId: string, me: Identity) => Promise<void>
  clearError: () => void
}

function messageOf(cause: unknown): string {
  if (cause instanceof NetError) return cause.message
  const raw = cause instanceof Error ? cause.message : String(cause ?? '')
  if (/fetch|network|Failed to fetch/i.test(raw)) return '서버에 닿지 못했다.'
  return '뜻대로 되지 않았습니다.'
}

/** 서버에 못 닿아서 실패한 것인가 — 거울로 물러날지 정한다. */
function looksOffline(cause: unknown): boolean {
  const raw = cause instanceof Error ? cause.message : String(cause ?? '')
  return /fetch|network|Failed to fetch|닿지 못/i.test(raw)
}

export const useJournalStore = create<JournalState>((set, get) => ({
  entries: [],
  current: null,
  loaded: false,
  offline: false,
  busy: false,
  error: null,

  refresh: async (me) => {
    try {
      const [parties, campaigns] = await Promise.all([
        partyAdapter.listParties(me.userId),
        fetchCampaigns(),
      ])
      await mirror(campaigns)
      const byParty = new Map(campaigns.map((c) => [c.partyId, c]))
      set({
        entries: parties.map((party) => ({ party, campaign: byParty.get(party.id) ?? null })),
        loaded: true,
        offline: false,
        error: null,
      })
    } catch (cause) {
      if (!looksOffline(cause)) {
        set({ loaded: true, error: messageOf(cause) })
        return
      }
      /**
       * 서버가 멀다. **거울로 물러난다.**
       *
       * 파티 목록은 서버에만 있으므로 기록지에서 되짚는다 — 마지막으로 본
       * 기록지가 곧 그때 속해 있던 파티다.
       */
      const kept = await mirroredAll()
      set({
        entries: kept.map((campaign) => ({
          party: {
            id: campaign.partyId,
            name: campaign.name,
            createdBy: '',
            createdAt: campaign.createdAt,
          },
          campaign,
        })),
        loaded: true,
        offline: true,
        error: null,
      })
    }
  },

  open: async (partyId, me) => {
    const known = get().entries.find((e) => e.party.id === partyId) ?? null
    set({ current: known, loaded: get().entries.length > 0 })

    try {
      const parties = await partyAdapter.listParties(me.userId)
      const party = parties.find((p) => p.id === partyId)
      if (!party) {
        set({ current: null, loaded: true, offline: false })
        return
      }
      const campaign = await fetchOrCreateFor(partyId, party.name)
      await mirror([campaign])
      const entry = { party, campaign }
      set((s) => ({
        current: entry,
        entries: s.entries.some((e) => e.party.id === partyId)
          ? s.entries.map((e) => (e.party.id === partyId ? entry : e))
          : [entry, ...s.entries],
        loaded: true,
        offline: false,
        error: null,
      }))
    } catch (cause) {
      if (!looksOffline(cause)) {
        set({ loaded: true, error: messageOf(cause) })
        return
      }
      const campaign = await mirroredFor(partyId)
      set({
        current: campaign
          ? {
              party: known?.party ?? {
                id: partyId,
                name: campaign.name,
                createdBy: '',
                createdAt: campaign.createdAt,
              },
              campaign,
            }
          : null,
        loaded: true,
        offline: true,
      })
    }
  },

  close: () => set({ current: null }),

  addParty: async (name, me) => {
    const trimmed = name.trim()
    if (trimmed === '') return null
    set({ busy: true, error: null })
    try {
      const party = await partyAdapter.createParty(trimmed, me, Date.now())
      // 기록지는 여기서 만들지 않는다. 여는 순간 `fetchOrCreateFor`가 메운다 —
      // 중간에 끊겨도 스스로 낫는 길이다.
      await get().refresh(me)
      return party.id
    } catch (cause) {
      set({ error: messageOf(cause) })
      return null
    } finally {
      set({ busy: false })
    }
  },

  edit: async (edits) => {
    const current = get().current
    if (!current?.campaign) return

    if (get().offline) {
      set({ error: '서버에 닿지 못해 지금은 고칠 수 없다. 연결되면 다시 하라.' })
      return
    }

    // 손이 먼저 움직인 것처럼 보이게 화면부터 바꾼다. 서버가 돌려준 값이 뒤따라 덮는다.
    const optimistic = { ...current.campaign, ...edits }
    set((s) => ({
      current: s.current ? { ...s.current, campaign: optimistic } : null,
      error: null,
    }))

    try {
      const saved = await pushEdits(current.campaign.id, edits)
      await mirror([saved])
      set((s) => ({
        current: s.current ? { ...s.current, campaign: saved } : null,
        entries: s.entries.map((e) =>
          e.party.id === saved.partyId ? { ...e, campaign: saved } : e,
        ),
      }))
    } catch (cause) {
      // 되돌린다. 적었는데 안 남은 채로 남아 있는 것이 제일 나쁘다.
      set((s) => ({
        current: s.current ? { ...s.current, campaign: current.campaign } : null,
        error: messageOf(cause),
        offline: looksOffline(cause),
      }))
    }
  },

  leave: async (partyId, me) => {
    set({ busy: true, error: null })
    try {
      await partyAdapter.leaveParty(partyId, me.userId)
      await forgetMirror(partyId)
      set((s) => ({
        entries: s.entries.filter((e) => e.party.id !== partyId),
        current: s.current?.party.id === partyId ? null : s.current,
      }))
    } catch (cause) {
      set({ error: messageOf(cause) })
    } finally {
      set({ busy: false })
    }
  },

  clearError: () => set({ error: null }),
}))
