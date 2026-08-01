import type { Identity, Invite, Member, Party } from './types'

/**
 * 파티의 바깥 경계.
 *
 * `AuthAdapter`와 같은 뜻으로 둔다 — 화면과 스토어는 백엔드가 무엇인지 몰라야
 * 한다. 지금은 브라우저 안의 가짜가 들어가 있고, N2에서 이 자리에 진짜가 온다.
 *
 * 모든 메서드가 `Promise`다. 가짜는 즉시 돌려줄 수 있지만, 그렇게 만들면 화면이
 * 동기 응답을 전제로 짜여 나중에 전부 뒤집어야 한다.
 */
export interface PartyAdapter {
  listParties(userId: string): Promise<Party[]>
  createParty(name: string, by: Identity, now: number): Promise<Party>
  listMembers(partyId: string): Promise<Member[]>
  /** 파티를 떠난다. 마지막 한 명이 나가면 파티도 함께 사라진다. */
  leaveParty(partyId: string, userId: string): Promise<void>

  listInvites(partyId: string): Promise<Invite[]>
  createInvite(partyId: string, by: Identity, now: number): Promise<Invite>
  revokeInvite(token: string): Promise<void>

  /** 토큰만으로 초대장을 들여다본다. **파티 이름은 주지 않는다.** */
  findInvite(token: string): Promise<Invite | null>
  /**
   * 초대장을 받아 파티에 든다.
   *
   * 이미 그 파티에 있으면 조용히 성공으로 친다 — 오류가 아니다.
   */
  acceptInvite(token: string, who: Identity, now: number): Promise<Party>

  /** 무언가 바뀌면 부른다. 돌려주는 함수를 부르면 구독을 끊는다. */
  subscribe(listener: () => void): () => void
}

/** 사용자에게 그대로 보여줄 수 있는 실패. */
export class NetError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'NetError'
  }
}

/**
 * 아직 붙지 않은 백엔드.
 *
 * `live` 빌드는 N2 전까지 이걸 만난다. 조용히 빈 화면을 보여주는 것보다 무엇이
 * 없는지 말해주는 편이 낫다.
 */
const notReady = async (): Promise<never> => {
  throw new NetError('아직 서버가 붙지 않았습니다.')
}

export const notReadyPartyAdapter: PartyAdapter = {
  listParties: async () => [],
  createParty: notReady,
  listMembers: async () => [],
  leaveParty: notReady,
  listInvites: async () => [],
  createInvite: notReady,
  revokeInvite: notReady,
  findInvite: async () => null,
  acceptInvite: notReady,
  subscribe: () => () => {},
}
