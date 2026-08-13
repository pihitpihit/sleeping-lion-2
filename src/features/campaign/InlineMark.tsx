import type { CardMark } from '../satchel/widgets/deck/cardSpec'
import { markArt, markSpeech } from '../satchel/widgets/deck/deck'

/**
 * 글줄에 얹히는 표식 하나 — **덱 알약과 특혜 글이 함께 쓴다.**
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ **같은 표식이 화면 두 곳에서 다르게 그려지면 같은 것으로 안 읽힌다.**     │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * 그림에는 세 갈래가 있다(구현 결정 220). 완성된 배지(상태이상·원소)는 **그대로**
 * 얹고, 검정 실루엣(치료·방어)은 물들여 얹고, 아무것도 없으면 글자다.
 *
 * 수는 팩 그림에 없으므로 옆에 따로 적는다(구현 결정 221).
 */
export function InlineMark({ mark }: { mark: CardMark }) {
  const art = markArt(mark)

  if (art === null) {
    return (
      <span className="imark__tag" aria-hidden="true">
        {markSpeech(mark)}
      </span>
    )
  }

  return (
    <span className="imark" aria-hidden="true">
      <img
        className={[
          art.kind === 'badge' ? 'imark__badge' : 'imark__glyph',
          art.turned ? 'imark__badge--turned' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        src={art.url}
        alt=""
      />
      {mark.amount !== null && <span className="imark__n sl-numeral">{mark.amount}</span>}
    </span>
  )
}
