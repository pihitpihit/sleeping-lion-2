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
export function Price({ cost, was }: { cost: number; was?: number | null }) {
  /*
    ┌──────────────────────────────────────────────────────────────────────┐
    │ **깎인 만큼이 보여야 깎였다는 것을 안다.**                            │
    └──────────────────────────────────────────────────────────────────────┘

    낸 값만 적으면 그것이 제값인지 깎인 값인지 알 수 없다 — 평판이 오르내리면
    같은 물건이 다른 값이 되므로 **원래 값을 곁에 두고 줄을 긋는다.**
    같거나 모르면 아무것도 덧붙이지 않는다(구현 결정 115).
  */
  const cut = typeof was === 'number' && was !== cost ? was - cost : null

  return (
    <span
      className="price"
      role="img"
      aria-label={
        cut === null
          ? `${cost} 골드`
          : `${cost} 골드, 원래 ${was} 골드에서 ${Math.abs(cut)} ${cut > 0 ? '깎임' : '얹힘'}`
      }
    >
      {cut !== null && (
        <s className="price__was sl-numeral" aria-hidden="true">
          {was}
        </s>
      )}
      <Coin />
      <b
        className={`price__n sl-numeral${cut !== null ? ' price__n--cut' : ''}`}
        aria-hidden="true"
      >
        {cost}
      </b>
    </span>
  )
}
