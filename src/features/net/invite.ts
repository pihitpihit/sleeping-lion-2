import type { Invite, Member } from './types'

/**
 * 초대 링크의 규칙.
 *
 * 순수 함수로 떼어 둔다 — 링크가 언제 통하고 언제 막히는지는 눈으로 확인할 수
 * 없고, 표로 적어 시험해야 하는 종류다.
 */

/** 초대장 수명. 메신저에 남은 링크가 영원히 열려 있지 않게 한다. */
export const INVITE_HOURS = 48

/** 토큰 길이(문자). 짧으면 찍어볼 수 있고, 길면 링크가 흉해진다. */
const TOKEN_BYTES = 16

export type InviteState =
  | 'ok'
  /** 그런 초대장이 없다. 위조했거나 오타이거나 파티가 사라졌다. */
  | 'unknown'
  | 'expired'
  | 'revoked'

/**
 * 이 초대장이 지금 통하는가.
 *
 * **막힌 이유는 갈라서 알려준다.** 초대는 이미 받은 사람이 여는 것이라, 전부
 * "안 됩니다"로 뭉치면 무엇을 해야 할지 — 새 링크를 달라고 할지, 오타를
 * 고칠지 — 알 수 없다. 파티가 새어 나가는 것과는 다른 문제다.
 */
export function inviteState(invite: Invite | null | undefined, now: number): InviteState {
  if (!invite) return 'unknown'
  if (invite.revoked) return 'revoked'
  if (invite.expiresAt <= now) return 'expired'
  return 'ok'
}

export const INVITE_STATE_MESSAGE: Record<Exclude<InviteState, 'ok'>, string> = {
  unknown: '이 초대장은 이 여관의 것이 아닙니다. 링크가 온전한지 확인해 주십시오.',
  expired: '초대장이 낡았습니다. 파티원에게 새 링크를 청하십시오.',
  revoked: '거두어진 초대장입니다. 파티원에게 새 링크를 청하십시오.',
}

/** 추측할 수 없는 토큰. 파티 id를 그대로 쓰지 않는다 — 순번은 더더욱 아니다. */
export function makeToken(): string {
  const bytes = new Uint8Array(TOKEN_BYTES)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

/** 토큰처럼 생겼는가. 저장소를 뒤지기 전에 걸러낸다. */
export function looksLikeToken(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{8,64}$/.test(value)
}

export function inviteRoute(token: string): string {
  return `/join/${token}`
}

/** `/join/<토큰>`에서 토큰만 꺼낸다. 모양이 아니면 null. */
export function parseInviteRoute(route: string): string | null {
  const match = /^\/join\/([^/]+)$/.exec(route)
  const token = match?.[1]
  return looksLikeToken(token) ? token : null
}

/**
 * 이 사람이 이 파티에 초대장을 만들 수 있는가.
 *
 * **파티원이면 누구나 된다**(SPEC 6.2). 파티장만의 권한이 아니다 — 식탁에서
 * 누가 친구를 부를지에 파티장 허락을 받지는 않는다.
 */
export function canInvite(members: readonly Member[], partyId: string, userId: string): boolean {
  return members.some((m) => m.partyId === partyId && m.userId === userId)
}

export function isMember(members: readonly Member[], partyId: string, userId: string): boolean {
  return canInvite(members, partyId, userId)
}

/** 지금 만든 초대장의 만료 시각. */
export function inviteExpiry(now: number, hours = INVITE_HOURS): number {
  return now + hours * 60 * 60 * 1000
}

/** 사람에게 보여줄 남은 시간. 분 단위까지는 필요 없다. */
export function remainingLabel(expiresAt: number, now: number): string {
  const ms = expiresAt - now
  if (ms <= 0) return '지남'
  const hours = Math.floor(ms / (60 * 60 * 1000))
  if (hours >= 1) return `${hours}시간 남음`
  const minutes = Math.max(1, Math.floor(ms / (60 * 1000)))
  return `${minutes}분 남음`
}
