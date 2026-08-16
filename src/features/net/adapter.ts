import type { Identity, Member, Party } from './types'

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
  /**
   * 파티를 해산한다 — **기록지도 함께 간다.**
   *
   * 캐릭터는 남는다(`0037`) — 파티에 들기 전 상태로 돌아갈 뿐이다. **남의
   * 캐릭터가 든 파티는 서버가 거절한다**: 남의 기록을 날리는 일은 그 사람이
   * 할 일이다.
   */
  disbandParty(partyId: string): Promise<void>

  /**
   * 파티에 든다 — **초대 없이 제 발로.**
   *
   * 승인된 사람만 들어오는 앱이므로(`0004`) 그 안에서 또 한 번 문지기를 두지
   * 않는다(형님이 정했다, `0036`). **제 이름으로만 든다** — 남을 끌어들이지는
   * 못한다.
   */
  joinParty(partyId: string, who: Identity): Promise<void>

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
  disbandParty: notReady,
  joinParty: notReady,
  subscribe: () => () => {},
}
