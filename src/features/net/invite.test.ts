import { describe, expect, it } from 'vitest'
import {
  canInvite,
  inviteExpiry,
  inviteRoute,
  inviteState,
  looksLikeToken,
  makeToken,
  parseInviteRoute,
  remainingLabel,
} from './invite'
import type { Invite, Member } from './types'

const invite = (over: Partial<Invite> = {}): Invite => ({
  token: 'a'.repeat(32),
  partyId: 'party_1',
  createdBy: 'u1',
  createdAt: 0,
  expiresAt: 1_000,
  revoked: false,
  ...over,
})

describe('inviteState', () => {
  it('살아 있으면 통과한다', () => {
    expect(inviteState(invite(), 999)).toBe('ok')
  })

  it('만료 시각에 닿는 순간 낡는다', () => {
    expect(inviteState(invite(), 1_000)).toBe('expired')
    expect(inviteState(invite(), 1_001)).toBe('expired')
  })

  it('거둔 것은 만료 전이라도 막는다', () => {
    expect(inviteState(invite({ revoked: true }), 0)).toBe('revoked')
  })

  /** 거둔 것이 만료보다 앞선다 — '낡았으니 새로 달라'고 하면 안 되는 경우다. */
  it('거두었고 낡기도 했으면 거둔 것으로 말한다', () => {
    expect(inviteState(invite({ revoked: true }), 9_999)).toBe('revoked')
  })

  it('없는 초대장은 unknown이다', () => {
    expect(inviteState(null, 0)).toBe('unknown')
    expect(inviteState(undefined, 0)).toBe('unknown')
  })
})

describe('토큰', () => {
  it('추측하기 어려운 길이로 만든다', () => {
    const token = makeToken()
    expect(looksLikeToken(token)).toBe(true)
    expect(token.length).toBeGreaterThanOrEqual(32)
  })

  it('부를 때마다 다르다', () => {
    const seen = new Set(Array.from({ length: 50 }, () => makeToken()))
    expect(seen.size).toBe(50)
  })

  it('토큰처럼 생기지 않은 것은 걸러낸다', () => {
    for (const bad of ['', 'abc', '../../etc', 'ZZZZZZZZ', 'a'.repeat(65), null, 42, {}]) {
      expect(looksLikeToken(bad)).toBe(false)
    }
  })
})

describe('초대 경로', () => {
  it('경로를 만들고 되읽는다', () => {
    const token = makeToken()
    expect(parseInviteRoute(inviteRoute(token))).toBe(token)
  })

  it('모양이 아니면 받지 않는다', () => {
    for (const bad of [
      '/join',
      '/join/',
      '/join/짧다',
      '/join/a/b',
      '/joinx/' + 'a'.repeat(32),
      '/satchel',
      '',
    ]) {
      expect(parseInviteRoute(bad)).toBeNull()
    }
  })
})

describe('초대할 수 있는 사람', () => {
  const members: Member[] = [
    { partyId: 'p1', userId: 'u1', displayName: '갑', joinedAt: 0 },
    { partyId: 'p1', userId: 'u2', displayName: '을', joinedAt: 1 },
    { partyId: 'p2', userId: 'u3', displayName: '병', joinedAt: 2 },
  ]

  /** 파티장만의 권한이 아니다(SPEC 6.2) — 먼저 든 사람도 나중에 든 사람도 같다. */
  it('파티원이면 누구나 초대한다', () => {
    expect(canInvite(members, 'p1', 'u1')).toBe(true)
    expect(canInvite(members, 'p1', 'u2')).toBe(true)
  })

  it('남의 파티에는 초대할 수 없다', () => {
    expect(canInvite(members, 'p1', 'u3')).toBe(false)
    expect(canInvite(members, 'p2', 'u1')).toBe(false)
    expect(canInvite(members, '없는파티', 'u1')).toBe(false)
  })
})

describe('남은 시간', () => {
  it('시간 단위로 줄여 말한다', () => {
    const H = 60 * 60 * 1000
    expect(remainingLabel(48 * H, 0)).toBe('48시간 남음')
    expect(remainingLabel(H, 0)).toBe('1시간 남음')
  })

  it('한 시간이 안 되면 분으로 말한다', () => {
    expect(remainingLabel(30 * 60 * 1000, 0)).toBe('30분 남음')
    // 1초가 남아도 '0분'이라고 하지 않는다.
    expect(remainingLabel(1_000, 0)).toBe('1분 남음')
  })

  it('지난 것은 지났다고 한다', () => {
    expect(remainingLabel(0, 0)).toBe('지남')
    expect(remainingLabel(-1, 0)).toBe('지남')
  })

  it('만료는 지금부터 센다', () => {
    expect(inviteExpiry(0, 48)).toBe(48 * 60 * 60 * 1000)
  })
})
