/**
 * 축 ① 캠페인 기록지의 데이터 모델.
 *
 * SPEC 7장이 정본이다. 여기서는 **파티 기록지에 필요한 것까지만** 옮긴다 —
 * 캐릭터·시나리오 정산은 그 화면을 만들 때 더한다. 미리 다 적어두면 쓰이지 않는
 * 필드가 쌓이고, 무엇이 살아 있는지 알 수 없게 된다.
 *
 * **저작권 경계.** 콘텐츠는 식별자·수치·**사용자가 직접 친 글자**로만 채운다
 * (SPEC 3장). 업적 이름을 우리가 담지 않고 사용자가 적는 것이 그래서다 —
 * 구현 결정 2가 이미 "사용자가 입력한 라벨"을 열어 두었다.
 */

/**
 * 파티 기록지 한 벌.
 *
 * 실물에서 파티 시트는 캠페인마다 하나다. 그래서 이 레코드가 곧 캠페인이다.
 */
export interface Campaign {
  id: string
  /** 파티 이름. 사용자가 짓는다. */
  name: string
  /** 지금 머무는 곳. 자유 입력이다 — 우리가 지명 목록을 갖고 있지 않다. */
  location: string
  /** 파티 메모. 여러 줄. */
  notes: string
  /**
   * 파티 업적.
   *
   * **사용자가 적는다.** 업적 이름은 시나리오·카드에 인쇄된 게임 콘텐츠이므로
   * 우리가 목록을 담지 않는다(SPEC 3장).
   */
  achievements: string[]
  /** −20 ~ +20. 상점 가격 보정이 여기서 나온다(`reputation.ts`). */
  reputation: number

  /**
   * 동기화용 자리.
   *
   * 로컬 전용 단계에서는 쓰이지 않지만 Phase 2 마이그레이션 비용을 줄이려고
   * 처음부터 둔다(구현 결정 3). `ownerUserId`는 로그인 전이라 비어 있을 수 있다.
   */
  ownerUserId: string | null
  createdAt: number
  updatedAt: number
  version: number
}

/** 새 기록지에 채워 넣을 값. id와 시각은 만드는 쪽이 준다. */
export type NewCampaign = Pick<Campaign, 'name'> & Partial<Omit<Campaign, 'id' | 'name'>>

/** 기록지에서 사람이 고치는 부분. 나머지는 저장 계층이 관리한다. */
export type CampaignEdits = Partial<
  Pick<Campaign, 'name' | 'location' | 'notes' | 'achievements' | 'reputation'>
>
