/**
 * 파티와 전투.
 *
 * **파티는 지속되고 전투는 일시적이다**(SPEC 5.4·6.2). 파티는 같이 노는 사람들의
 * 묶음이고, 전투는 이번 판에 모인 사람들이다. 공유 단위를 파티로 두면 한 파티가
 * 여러 판을 동시에 돌릴 때 엉키고, 캠페인으로 두면 축 ②가 캠페인을 읽게 되어 두
 * 축의 경계가 무너진다. 전투는 둘 다 피한다.
 */

export interface Party {
  id: string
  name: string
  createdBy: string
  createdAt: number
}

export interface Member {
  partyId: string
  userId: string
  displayName: string
  joinedAt: number
}

/** 나를 파티에 넣어주는 사람의 최소 정보. */
export interface Identity {
  userId: string
  displayName: string
}
