import { ROLLING_ICON_URL, medallionUrl } from '../satchel/widgets/deck/deck'
import { InlineMark } from './InlineMark'
import { splitPerkText } from './perkWords'

/**
 * 특혜 한 줄 — **그림으로 바꿀 수 있는 낱말은 그림으로.**
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ **읽어주는 쪽에는 원문이 그대로 간다.**                                   │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * 그림은 눈에만 보이는 것이므로 소리로도 갈려야 한다(구현 결정 234와 같은 결).
 * 조각마다 `aria-hidden`을 걸고 줄 전체에 원문을 `aria-label`로 붙인다 —
 * 조각조각 읽히면 「굴림 바람 카드」가 「초록 마름모 파란 원 카드」가 된다.
 */
export function PerkText({ text }: { text: string }) {
  const pieces = splitPerkText(text)

  return (
    <span className="perktext" aria-label={text}>
      {pieces.map((piece, i) => {
        if (piece.kind === 'text')
          return (
            <span key={i} aria-hidden="true">
              {piece.text}
            </span>
          )
        if (piece.kind === 'rolling')
          return (
            <img
              key={i}
              className="imark__badge"
              src={ROLLING_ICON_URL}
              alt=""
              aria-hidden="true"
            />
          )
        if (piece.kind === 'value') {
          const medal = medallionUrl(piece.valueId)
          /*
            **그림이 없는 값(`+3`·`+4`)은 숫자를 직접 그린다.** 팩이 실물 표준
            덱에 있는 일곱만 담고 있어서인데, 글자로 흘려 두면 그 줄만 그림이
            빠져 어긋나 보인다 — 덱 알약이 이미 쓰는 손질이다.
          */
          return medal === null ? (
            <span key={i} className="imark__numeral sl-numeral" aria-hidden="true">
              {piece.text}
            </span>
          ) : (
            <img key={i} className="imark__medal" src={medal} alt="" aria-hidden="true" />
          )
        }
        return <InlineMark key={i} mark={{ def: piece.def, amount: piece.amount }} />
      })}
    </span>
  )
}
