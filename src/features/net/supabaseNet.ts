import { supabase } from '../auth/supabase'
import { NetError, type PartyAdapter } from './adapter'
import { INVITE_HOURS, makeToken } from './invite'
import type { Invite, Member, Party } from './types'

/**
 * 진짜 백엔드에 붙는 파티.
 *
 * **`PartyAdapter` 경계 안쪽만 갈아끼운다.** 화면과 스토어는 백엔드가 무엇인지
 * 모른다 — N1·N3가 이 경계를 좁게 둔 것이 그러라고 한 일이다.
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ **막는 것은 RLS다. 여기 있는 것은 편의일 뿐이다.**                        │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * 레포와 번들이 공개이므로 이 파일을 읽고 API를 직접 두드릴 수 있다. 그래서
 * "남의 파티는 안 보인다" 같은 보장을 여기서 만들지 않는다 — 서버가 안 준다
 * (`0001_party_and_battle.sql`).
 */

/** 서버 실패를 사용자에게 보여줄 말로 옮긴다. */
function fail(cause: unknown, fallback: string): never {
  const message = cause instanceof Error ? cause.message : String(cause ?? '')
  if (/fetch|network|Failed to fetch/i.test(message)) {
    throw new NetError('서버에 닿지 못했다. 연결을 확인하라.')
  }
  // 서버가 우리말로 던진 것(`raise exception`)은 그대로 보여준다.
  if (/로그인|파티|초대/.test(message)) throw new NetError(message)
  console.error('[net]', cause)
  throw new NetError(fallback)
}

function toMillis(value: string | null | undefined): number {
  const time = value ? Date.parse(value) : Number.NaN
  return Number.isFinite(time) ? time : 0
}

/* --------------------------------------------------------------------------
   바뀜 알림
   -------------------------------------------------------------------------- */

/**
 * 무언가 바뀌면 화면에 알린다.
 *
 * 지금은 **우리가 쓴 것만** 알린다. 남이 파티에 들어오는 것을 실시간으로 보려면
 * Realtime 구독이 필요한데 그것은 N4의 일이다 — 여기서 미리 붙이면 전투 방과
 * 뒤섞여 무엇이 무엇을 알리는지 흐려진다.
 */
const listeners = new Set<() => void>()
function announce() {
  for (const listener of listeners) listener()
}

/* -------------------------------------------------------------------------- */

export const supabasePartyAdapter: PartyAdapter = {
  async listParties() {
    try {
      // 내가 속한 것만 온다 — RLS가 그렇게 거른다. userId를 넘겨받지만 쓰지 않는
      // 이유가 이것이다. 클라이언트가 고른 것을 서버가 믿게 두지 않는다.
      const { data, error } = await supabase()
        .from('parties')
        .select('id, name, created_by, created_at')
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []).map((row): Party => ({
        id: row.id,
        name: row.name,
        createdBy: row.created_by,
        createdAt: toMillis(row.created_at),
      }))
    } catch (cause) {
      return fail(cause, '파티를 불러오지 못했다.')
    }
  },

  async createParty(name, _by, _now) {
    try {
      /**
       * 함수로 만든다.
       *
       * 표를 만들고 만든 사람을 넣는 두 가지가 한 트랜잭션에서 일어나야 한다.
       * 나눠 보내면 두 번째가 실패했을 때 **주인 없는 파티**가 남고, 아무도
       * 그것을 볼 수 없어 지우지도 못한다(RLS가 파티원에게만 보이므로).
       */
      const { data: id, error } = await supabase().rpc('create_party', { party_name: name })
      if (error) throw error

      const { data, error: readError } = await supabase()
        .from('parties')
        .select('id, name, created_by, created_at')
        .eq('id', id)
        .single()
      if (readError) throw readError

      announce()
      return {
        id: data.id,
        name: data.name,
        createdBy: data.created_by,
        createdAt: toMillis(data.created_at),
      }
    } catch (cause) {
      return fail(cause, '파티를 세우지 못했다.')
    }
  },

  async listMembers(partyId) {
    try {
      const { data, error } = await supabase()
        .from('party_members')
        .select('party_id, user_id, joined_at, profiles(display_name)')
        .eq('party_id', partyId)
        .order('joined_at', { ascending: true })
      if (error) throw error

      return (data ?? []).map((row): Member => {
        // 관계로 딸려오는 모양이 하나일 수도 배열일 수도 있다. 둘 다 받는다.
        const profile = row.profiles as
          { display_name?: string } | { display_name?: string }[] | null
        const one = Array.isArray(profile) ? profile[0] : profile
        return {
          partyId: row.party_id,
          userId: row.user_id,
          displayName: one?.display_name ?? '',
          joinedAt: toMillis(row.joined_at),
        }
      })
    } catch (cause) {
      return fail(cause, '파티원을 불러오지 못했다.')
    }
  },

  async leaveParty(partyId, _userId) {
    try {
      // **자기 자신만 나간다.** RLS가 그렇게 정해 두었으므로 여기서 userId로
      // 거르지 않는다 — 걸러 봐야 서버가 다시 본다.
      const { error } = await supabase().from('party_members').delete().eq('party_id', partyId)
      if (error) throw error
      announce()
    } catch (cause) {
      fail(cause, '파티를 떠나지 못했다.')
    }
  },

  async listInvites(partyId) {
    try {
      const { data, error } = await supabase()
        .from('invites')
        .select('token, party_id, created_by, created_at, expires_at, revoked')
        .eq('party_id', partyId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []).map((row): Invite => ({
        token: row.token,
        partyId: row.party_id,
        createdBy: row.created_by,
        createdAt: toMillis(row.created_at),
        expiresAt: toMillis(row.expires_at),
        revoked: row.revoked,
      }))
    } catch (cause) {
      return fail(cause, '초대장을 불러오지 못했다.')
    }
  },

  async createInvite(partyId, by, now) {
    try {
      const token = makeToken()
      const expiresAt = now + INVITE_HOURS * 60 * 60 * 1000
      const { data, error } = await supabase()
        .from('invites')
        .insert({
          token,
          party_id: partyId,
          created_by: by.userId,
          expires_at: new Date(expiresAt).toISOString(),
        })
        .select('token, party_id, created_by, created_at, expires_at, revoked')
        .single()
      if (error) throw error

      announce()
      return {
        token: data.token,
        partyId: data.party_id,
        createdBy: data.created_by,
        createdAt: toMillis(data.created_at),
        expiresAt: toMillis(data.expires_at),
        revoked: data.revoked,
      }
    } catch (cause) {
      return fail(cause, '초대장을 만들지 못했다.')
    }
  },

  async revokeInvite(token) {
    try {
      const { error } = await supabase()
        .from('invites')
        .update({ revoked: true })
        .eq('token', token)
      if (error) throw error
      announce()
    } catch (cause) {
      fail(cause, '초대장을 거두지 못했다.')
    }
  },

  /**
   * 토큰만으로 초대장을 들여다본다.
   *
   * **파티 이름도 id도 주지 않는다.** 아직 파티원이 아닌 사람이 여는 자리이므로
   * RLS는 초대장 자체를 감춘다. 대신 서버 함수가 **상태만** 돌려준다 — 그것이
   * 없으면 "낡았다"와 "거두어졌다"와 "그런 것 없다"가 전부 '없다'로 뭉친다.
   */
  async findInvite(token) {
    try {
      const { data, error } = await supabase().rpc('peek_invite', { invite_token: token })
      if (error) throw error

      const state = String(data)
      if (state === 'unknown') return null

      const now = Date.now()
      return {
        token,
        partyId: '',
        createdBy: '',
        createdAt: 0,
        // `inviteState`가 읽을 수 있게 상태를 시각·플래그로 옮긴다.
        expiresAt: state === 'expired' ? now - 1 : now + INVITE_HOURS * 60 * 60 * 1000,
        revoked: state === 'revoked',
      }
    } catch (cause) {
      return fail(cause, '초대장을 확인하지 못했다.')
    }
  },

  async acceptInvite(token, _who, _now) {
    try {
      const { data: partyId, error } = await supabase().rpc('accept_invite', {
        invite_token: token,
      })
      if (error) throw error

      const { data, error: readError } = await supabase()
        .from('parties')
        .select('id, name, created_by, created_at')
        .eq('id', partyId)
        .single()
      if (readError) throw readError

      announce()
      return {
        id: data.id,
        name: data.name,
        createdBy: data.created_by,
        createdAt: toMillis(data.created_at),
      }
    } catch (cause) {
      return fail(cause, '초대장을 받지 못했다.')
    }
  },

  subscribe(listener) {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },
}
