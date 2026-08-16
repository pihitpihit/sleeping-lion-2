import { classIconUrl } from './character'
import { splitConditionText } from './conditionParts'

/**
 * 개봉 조건 한 줄 — **그림으로 인쇄된 것은 그림으로.**
 *
 * 해·월식 표식은 잠긴 클래스 봉투의 것이라 팩 아이콘으로 낸다. **물들이지 않고
 * 양피지 원반을 깐다**(구현 결정 41) — 표식이 거의 검정이라 어두운 바탕에서
 * 묻힌다.
 *
 * 읽어주는 쪽에는 **원문이 통째로 간다**(구현 결정 318) — 조각조각 읽히면
 * 「해 상자 개봉」이 「그림 상자 개봉」이 된다.
 */
export function ConditionText({ text }: { text: string }) {
  return (
    <span aria-label={text}>
      {splitConditionText(text).map((piece, i) => {
        if (piece.kind === 'text')
          return (
            <span key={i} aria-hidden="true">
              {piece.text}
            </span>
          )
        if (piece.kind === 'latin')
          return (
            <span key={i} className="sl-numeral unlock__latin" aria-hidden="true">
              {piece.text}
            </span>
          )
        const url = classIconUrl(piece.icon)
        if (url === null)
          return (
            <span key={i} aria-hidden="true">
              {piece.glyph}
            </span>
          )
        return (
          <span key={i} className="unlock__icon" aria-hidden="true">
            <img src={url} alt="" draggable={false} />
          </span>
        )
      })}
    </span>
  )
}
