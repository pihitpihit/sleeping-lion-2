import { Coin } from '../satchel/widgets/gold/Coin'
import './Price.css'

/**
 * 값 — **금화 그림에 수를 붙여 적는다.**
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ **수만 있으면 그것이 값인 줄 모른다.**                                    │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * 상점의 값과 시트의 아이템 값이 같은 그림으로 서야 같은 것으로 읽힌다 — 골드
 * 카운터·시트의 골드와도 같은 조각이다(구현 결정 334와 같은 결).
 *
 * 그림은 눈에만 보이는 것이므로 읽어주는 쪽에는 우리말로 간다.
 */
export function Price({ cost }: { cost: number }) {
  return (
    <span className="price" role="img" aria-label={`${cost} 골드`}>
      <Coin />
      <b className="price__n sl-numeral" aria-hidden="true">
        {cost}
      </b>
    </span>
  )
}
