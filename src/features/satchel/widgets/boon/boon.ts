import { markArt } from '../deck/deck'
import { parseCardSpec } from '../deck/cardSpec'

/**
 * 축복과 저주 — **덱에 섞여 드는 카드 한 장.**
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ **주는 쪽이 아니라 받는 덱이 정해져야 한다.**                             │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * 규칙서가 그렇게 적는다: *"If a figure is cursed, it must shuffle a CURSE card
 * into its **remaining** attack modifier deck."* 그래서 위젯을 누르면 먼저
 * **누구에게** 줄지 고른다 — 상에 놓인 덱 가운데 하나다.
 *
 * 카드는 ×2·×0 값에 표식이 붙은 것이다(`x2.bless`·`x0.curse`) — 종류를 새로
 * 만들지 않고 이미 있는 명세를 그대로 쓴다(`cardSpec.ts`).
 */

export type BoonKind = 'bless' | 'curse'

export interface BoonLook {
  /** 덱에 들어갈 카드 명세. */
  readonly cardId: string
  /** 화면에 적는 말. */
  readonly name: string
  /** 표식 그림. 팩의 상태이상 배지를 그대로 쓴다. */
  readonly artUrl: string | null
}

const CARD_ID: Record<BoonKind, string> = { bless: 'x2.bless', curse: 'x0.curse' }
const NAME: Record<BoonKind, string> = { bless: '축복', curse: '저주' }

/**
 * 실물에서 축복·저주 덱은 각각 열 장이다.
 *
 * *"a maximum of only 10 curse cards can be placed into any one deck"* — 한 덱에
 * 들어갈 수 있는 수도 그만큼이다. **규칙을 판정하는 것이 아니라 고를 수 있는
 * 수를 그 범위로 두는 것뿐**이다.
 */
export const MAX_AT_ONCE = 10

export function boonLook(kind: BoonKind): BoonLook {
  const spec = parseCardSpec(CARD_ID[kind])
  const mark = spec?.marks[0] ?? null
  return {
    cardId: CARD_ID[kind],
    name: NAME[kind],
    artUrl: mark ? (markArt(mark)?.url ?? null) : null,
  }
}
