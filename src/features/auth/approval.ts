import { create } from 'zustand'
import { AUTH_MODE } from './mode'
import { isSupabaseConfigured, supabase } from './supabase'

/**
 * 승인 상태.
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ **가입은 열려 있고, 쓰는 것은 승인받은 사람만 한다.**                     │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * 승인 전에는 로그아웃과 비밀번호 바꾸기 말고 아무것도 못 한다.
 *
 * **화면이 막는 것은 UX일 뿐이다.** 번들이 공개이므로 승인 안 된 사람이 API를
 * 직접 두드릴 수 있다 — 진짜로 막는 것은 서버다(`0004_approval.sql`이 파티
 * 세우기와 초대 수락을 잠근다). 여기서는 보여주지 않을 뿐이다.
 *
 * **승인과 파티 가입은 다르다.** 승인은 "앱을 쓸 수 있다"이고, 남의 기록지가
 * 보이는 것은 파티에 들었을 때다. 벽이 두 겹이라 승인이 뚫려도 기록은 안 샌다.
 */

export type ApprovalPhase =
  /** 아직 안 물어봤다. **"승인되지 않았다"고 말하면 안 되는 시간이다.** */
  | 'unknown'
  | 'checking'
  | 'approved'
  | 'pending'
  /** 서버에 못 닿았다. 승인 여부를 알 수 없다. */
  | 'unreachable'

interface ApprovalState {
  phase: ApprovalPhase
  isAdmin: boolean
  /** 이번에 막 승인된 것을 보았는가 — 한 번 알리고 내린다. */
  justApproved: boolean
  /**
   * 문 앞에서 기다리는 사람 수. **관리자에게만 뜻이 있다.**
   *
   * 주소를 외워 `#/gate`로 들어가게 두면 새 요청이 온 것을 알 길이 없다. 계정
   * 띠에 뱃지로 띄우려고 여기 둔다.
   */
  pendingCount: number
  check: () => Promise<void>
  refreshPending: () => Promise<void>
  acknowledge: () => void
  reset: () => void
}

export const useApprovalStore = create<ApprovalState>((set, get) => ({
  phase: 'unknown',
  isAdmin: false,
  justApproved: false,
  pendingCount: 0,

  check: async () => {
    /**
     * `live`가 아니면 물을 곳이 없다.
     *
     * `mock`은 승인이라는 개념 자체가 없으므로 통과시킨다 — 가짜 백엔드로
     * 흐름을 만져보는 자리에 벽을 세우면 아무것도 못 본다.
     */
    if (AUTH_MODE !== 'live' || !isSupabaseConfigured()) {
      set({ phase: 'approved', isAdmin: false })
      return
    }

    set({ phase: get().phase === 'unknown' ? 'checking' : get().phase })
    try {
      const { data, error } = await supabase().rpc('my_status')
      if (error) throw error
      // 한 행짜리 표로 온다.
      const row = Array.isArray(data) ? data[0] : data
      const approved = Boolean(row?.approved)
      const isAdmin = Boolean(row?.is_admin)

      const wasPending = get().phase === 'pending'
      set({
        phase: approved ? 'approved' : 'pending',
        isAdmin,
        // 기다리다 방금 열린 것만 알린다. 처음부터 승인된 사람에게는 알릴 것이 없다.
        justApproved: approved && wasPending,
      })
      if (isAdmin) void get().refreshPending()
    } catch (cause) {
      console.error('[approval]', cause)
      set({ phase: 'unreachable' })
    }
  },

  refreshPending: async () => {
    if (!get().isAdmin) return
    try {
      set({ pendingCount: (await listPendingUsers()).length })
    } catch (cause) {
      // 세지 못해도 판이 멈추지 않는다. 뱃지가 잠깐 안 보일 뿐이다.
      console.error('[approval] 대기자를 세지 못했다', cause)
    }
  },

  acknowledge: () => set({ justApproved: false }),

  reset: () => set({ phase: 'unknown', isAdmin: false, justApproved: false, pendingCount: 0 }),
}))

/* --------------------------------------------------------------------------
   관리자
   -------------------------------------------------------------------------- */

export interface PendingUser {
  id: string
  email: string
  createdAt: number
}

/** 대기자 목록. **관리자가 아니면 서버가 거절한다.** */
export async function listPendingUsers(): Promise<PendingUser[]> {
  const { data, error } = await supabase().rpc('list_pending_users')
  if (error) throw error
  return (data ?? []).map(
    (row: { id: string; email: string; created_at: string }): PendingUser => ({
      id: row.id,
      email: row.email,
      createdAt: Date.parse(row.created_at),
    }),
  )
}

export async function approveUser(id: string): Promise<void> {
  const { error } = await supabase().rpc('approve_user', { target: id })
  if (error) throw error
}
