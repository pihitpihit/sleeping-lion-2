import { NetError, type PartyAdapter } from './adapter'
import {
  INVITE_STATE_MESSAGE,
  inviteExpiry,
  inviteState,
  looksLikeToken,
  makeToken,
} from './invite'
import type { Invite, Member, Party } from './types'

/**
 * 가짜 백엔드.
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ **이 브라우저 안에서만 통한다.** 기기끼리는 이어지지 않는다.               │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * `localStorage`가 서버 노릇을 하고, `BroadcastChannel`이 같은 브라우저의 다른
 * 탭에게 "바뀌었다"고 알린다. 탭 둘을 띄우면 파티에 들어오고 나가는 것이 서로
 * 보이므로, 화면과 상태 전이를 전부 확인할 수 있다.
 *
 * 확인할 수 **없는** 것은 진짜 지연·끊김·재연결이다. 그건 N2에서 진짜 백엔드가
 * 붙어야 한다.
 */

const DB_KEY = 'sl2.mockNet'
const CHANNEL = 'sl2.mockNet'

/** 사람이 기다린다고 느낄 만큼만. 없으면 눌린 것 같지가 않다. */
const FAKE_DELAY_MS = 220

interface MockDb {
  parties: Party[]
  members: Member[]
  invites: Invite[]
}

const EMPTY: MockDb = { parties: [], members: [], invites: [] }

function read(): MockDb {
  try {
    const raw = localStorage.getItem(DB_KEY)
    if (raw === null) return EMPTY
    const value: unknown = JSON.parse(raw)
    if (typeof value !== 'object' || value === null) return EMPTY
    const { parties, members, invites } = value as Record<string, unknown>
    return {
      parties: Array.isArray(parties) ? (parties as Party[]) : [],
      members: Array.isArray(members) ? (members as Member[]) : [],
      invites: Array.isArray(invites) ? (invites as Invite[]) : [],
    }
  } catch {
    // 망가진 값은 없는 것으로 친다. 가짜 데이터라 되살릴 것이 없다.
    return EMPTY
  }
}

/** 채널은 지원되지 않는 곳이 있으므로(구형 사파리) 없으면 그냥 안 알린다. */
const channel: BroadcastChannel | null =
  typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel(CHANNEL)

function write(db: MockDb): void {
  try {
    localStorage.setItem(DB_KEY, JSON.stringify(db))
  } catch {
    // 저장 못 하면 이번 실행 동안만 산다.
  }
  channel?.postMessage('changed')
}

const wait = () => new Promise((resolve) => setTimeout(resolve, FAKE_DELAY_MS))

function newId(prefix: string): string {
  return `${prefix}_${makeToken().slice(0, 12)}`
}

export const mockPartyAdapter: PartyAdapter = {
  async listParties(userId) {
    await wait()
    const db = read()
    const mine = new Set(db.members.filter((m) => m.userId === userId).map((m) => m.partyId))
    // 한 사람이 여러 파티에 속한다(SPEC 6.2). 최근에 만든 것을 위로.
    return db.parties.filter((p) => mine.has(p.id)).sort((a, b) => b.createdAt - a.createdAt)
  },

  async createParty(name, by, now) {
    await wait()
    const trimmed = name.trim()
    if (trimmed === '') throw new NetError('파티 이름을 적어 주십시오.')

    const db = read()
    const party: Party = { id: newId('party'), name: trimmed, createdBy: by.userId, createdAt: now }
    // 만든 사람은 곧바로 파티원이 된다.
    db.parties.push(party)
    db.members.push({ ...by, partyId: party.id, joinedAt: now })
    write(db)
    return party
  },

  async listMembers(partyId) {
    await wait()
    return read()
      .members.filter((m) => m.partyId === partyId)
      .sort((a, b) => a.joinedAt - b.joinedAt)
  },

  async leaveParty(partyId, userId) {
    await wait()
    const db = read()
    db.members = db.members.filter((m) => !(m.partyId === partyId && m.userId === userId))

    // 아무도 남지 않으면 파티와 초대장을 함께 거둔다. 빈 파티가 쌓일 이유가 없다.
    if (!db.members.some((m) => m.partyId === partyId)) {
      db.parties = db.parties.filter((p) => p.id !== partyId)
      db.invites = db.invites.filter((i) => i.partyId !== partyId)
    }
    write(db)
  },

  async listInvites(partyId) {
    await wait()
    return read()
      .invites.filter((i) => i.partyId === partyId && !i.revoked)
      .sort((a, b) => b.createdAt - a.createdAt)
  },

  async createInvite(partyId, by, now) {
    await wait()
    const db = read()
    if (!db.members.some((m) => m.partyId === partyId && m.userId === by.userId)) {
      throw new NetError('이 파티의 사람만 초대할 수 있습니다.')
    }
    const invite: Invite = {
      token: makeToken(),
      partyId,
      createdBy: by.userId,
      createdAt: now,
      expiresAt: inviteExpiry(now),
      revoked: false,
    }
    db.invites.push(invite)
    write(db)
    return invite
  },

  async revokeInvite(token) {
    await wait()
    const db = read()
    const invite = db.invites.find((i) => i.token === token)
    if (invite) invite.revoked = true
    write(db)
  },

  async findInvite(token) {
    await wait()
    if (!looksLikeToken(token)) return null
    return read().invites.find((i) => i.token === token) ?? null
  },

  async acceptInvite(token, who, now) {
    await wait()
    const db = read()
    const invite = looksLikeToken(token) ? db.invites.find((i) => i.token === token) : undefined

    const state = inviteState(invite ?? null, now)
    if (state !== 'ok') throw new NetError(INVITE_STATE_MESSAGE[state])

    const party = db.parties.find((p) => p.id === invite!.partyId)
    // 초대장은 살아 있는데 파티가 사라진 경우. 있는 그대로 말한다.
    if (!party) throw new NetError('그 파티는 이미 흩어졌습니다.')

    const already = db.members.some((m) => m.partyId === party.id && m.userId === who.userId)
    if (!already) {
      db.members.push({ ...who, partyId: party.id, joinedAt: now })
      write(db)
    }
    return party
  },

  subscribe(listener) {
    if (channel === null) return () => {}
    const onMessage = () => listener()
    channel.addEventListener('message', onMessage)
    return () => channel.removeEventListener('message', onMessage)
  },
}

/** 시험판을 처음부터 다시 보고 싶을 때. 화면 어딘가에서 부른다. */
export function resetMockNet(): void {
  try {
    localStorage.removeItem(DB_KEY)
  } catch {
    // 못 지워도 할 수 있는 게 없다.
  }
  channel?.postMessage('changed')
}

/** 모으는 것이 하나뿐인 `Member` 목록을 다른 파티 것과 섞지 않기 위한 도우미. */
export function membersOf(members: readonly Member[], partyId: string): Member[] {
  return members.filter((m) => m.partyId === partyId)
}
