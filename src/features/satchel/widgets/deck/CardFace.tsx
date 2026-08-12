import { ELEMENTS } from '../elements/elements'
import {
  FACE_SLOTS,
  SHUFFLE_ICON_URL,
  SOCKET_URL,
  cardLabel,
  markIconUrl,
  medallionUrl,
  type Card,
  type CardMark,
} from './deck'

/**
 * 배지 바탕색.
 *
 * **원소는 `elements.ts`가 정본이다** — 원소 트래커와 같은 색이라야 상 위에서
 * 같은 것으로 읽힌다. 나머지는 표식 자신이 들고 있는 색(`MARKS`)이며 실물
 * 상태이상 표식을 따랐다.
 */
function markBadgeColor(mark: CardMark): string {
  if (mark.def.kind === 'element') {
    return ELEMENTS.find((e) => e.id === mark.def.id)?.color ?? '#5A4830'
  }
  return mark.def.color ?? '#5A4830'
}
/*
  카드 앞면의 결은 위젯 스타일시트에 있다. **여기서 함께 들여온다** — 시트의 덱
  펼쳐 보기(`campaign/DeckGallery`)처럼 위젯 바깥에서 쓰이는 자리가 생겼고,
  그쪽이 스타일을 따로 챙겨야 하면 언젠가 빠뜨린다.
*/
import './AttackDeck.css'

/**
 * 한 번의 뽑기 — **굴림이 이어졌으면 겹쳐 늘어놓는다.**
 *
 * 굴림 카드는 뒤로 물러나며 조금씩 어긋나게 쌓이고, 마지막에 나온 굴림 아닌
 * 카드가 맨 앞에 온다. **합을 내지 않는다** — 실물에서도 뽑힌 카드를 상 위에
 * 늘어놓고 사람이 셈한다(SPEC 1장).
 *
 * 한 장뿐이면 겹칠 것이 없어 그냥 그 카드다.
 */
export function CardStack({ chain }: { chain: readonly Card[] }) {
  if (chain.length <= 1) {
    const only = chain[0]
    return only ? <CardFace card={only} /> : null
  }

  return (
    <span className="deck__stack" aria-hidden="true">
      {chain.map((card, index) => (
        <span
          key={card.id}
          className="deck__stack-item"
          /*
            `back`은 맨 앞에서 몇 번째 뒤인가다 — 마지막 카드가 0이라 칸을 정확히
            채우고, 먼저 뽑힌 것들이 그 뒤로 물러난다. 앞에서부터 세면 굴림이
            이어질 때마다 결과 카드가 자리를 옮겨 다닌다.
          */
          style={
            {
              '--deck-stack-i': index,
              '--deck-stack-back': chain.length - 1 - index,
            } as React.CSSProperties
          }
        >
          <CardFace card={card} />
        </span>
      ))}
    </span>
  )
}

/**
 * 카드 앞면 — 틀 위에 값 메달을 얹고 표식을 붙인다.
 *
 * 그림이 없는 값(+3·+4)은 메달 자리에 숫자를 직접 그린다. 팩이 실물에 있는
 * 일곱만 담고 있어 퍽으로 넣는 카드는 그림이 없다.
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ **표식은 실물 카드가 두는 자리에 둔다**(`FACE_SLOTS`).                     │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * 상태이상·원소는 **왼쪽 가운데에 마름모 배지**로 붙고 여럿이면 아래로 쌓인다.
 * 굴림은 **오른쪽 가운데에 초록 마름모**다. 섞기는 **오른쪽 아래**이며, 왼쪽 아래
 * 홈은 건드리지 않는다 — 거기는 덱 주인 자리다.
 *
 * 색은 실물 상태이상 표식을 따른다(`MARKS`의 `color`). 작은 배지에서는 색이
 * 갈리는 것이 글자보다 먼저 읽힌다.
 *
 * **원소만 그림이 있다.** 나머지는 배지 안에 한 글자를 적는다 — 실물은 그림을
 * 넣지만 그 그림들이 든 Creator Pack 원본이 이 기계에 없다(SPEC 13.1을 지키려면
 * 팩에서 뽑아야 하고, 우리가 흉내 내 그리는 것은 구현 결정 31이 막는 자리와
 * 다르다 — 저쪽은 우리 도형이고 이쪽은 그들의 그림이다).
 */
export function CardFace({ card }: { card: Card }) {
  const { spec } = card
  const medallion = medallionUrl(spec.valueId)
  const { medallion: slot, shuffle } = FACE_SLOTS

  const slotStyle = {
    left: `${slot.cx}%`,
    top: `${slot.cy}%`,
    width: `${slot.size}%`,
  } as React.CSSProperties

  return (
    <span className="deck__face" aria-hidden="true">
      {medallion ? (
        <img className="deck__medallion" src={medallion} alt="" style={slotStyle} />
      ) : (
        <span className="deck__numeral sl-numeral" style={slotStyle}>
          {cardLabel(spec.effect)}
        </span>
      )}

      {/*
        상태이상·원소 배지 — **왼쪽 가운데에서 아래로 쌓인다.**

        실물이 그 자리에 둔다. 메달을 가리지 않으면서 값과 나란히 읽히는
        자리다.
      */}
      {spec.marks.map((mark, index) => {
        const icon = markIconUrl(mark)
        const slot = FACE_SLOTS.effect
        const style = {
          left: `${slot.cx}%`,
          top: `${slot.cy + (index - (spec.marks.length - 1) / 2) * FACE_SLOTS.effectStep}%`,
          width: `${slot.size}%`,
          // 원소는 제 색을 쓴다(`elements.ts`가 정본). 나머지는 표식 색.
          background: markBadgeColor(mark),
        } as React.CSSProperties
        return (
          <span key={mark.def.id} className="deck__badge" style={style}>
            {icon ? (
              <img className="deck__badge-icon" src={icon} alt="" />
            ) : (
              <span className="deck__badge-text">
                {mark.def.short ?? mark.def.name.slice(0, 1)}
                {mark.amount !== null && (
                  <span className="deck__badge-amount sl-numeral">{mark.amount}</span>
                )}
              </span>
            )}
          </span>
        )
      })}

      {/*
        굴림 표식 — **오른쪽 가운데, 초록 마름모.**

        실물이 그 자리에 그 색으로 둔다. 안의 화살은 **직접 그린 도형이다** —
        실물 문양을 베끼지 않는다(구현 결정 31).
      */}
      {spec.rolling && (
        <span
          className="deck__badge deck__badge--rolling"
          style={{
            left: `${FACE_SLOTS.rolling.cx}%`,
            top: `${FACE_SLOTS.rolling.cy}%`,
            width: `${FACE_SLOTS.rolling.size}%`,
          }}
        >
          <svg className="deck__badge-arrow" viewBox="0 0 24 24" role="presentation">
            <path
              d="M7 18V10a5 5 0 0 1 10 0v8"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
            />
            <path d="M17 22l-4-5h8z" fill="currentColor" />
          </svg>
        </span>
      )}

      {/*
        섞기 — **홈을 먼저 깔고 그 위에 표식을 앉힌다.**

        표식만 얹으면 바탕 없이 떠 보인다. 실물 카드는 여기에도 홈이 파여 있고
        그 안에 표식이 들어간다.
      */}
      {spec.shuffleAfter && (
        <>
          <img
            className="deck__socket"
            src={SOCKET_URL}
            alt=""
            style={{ left: `${shuffle.cx}%`, top: `${shuffle.cy}%`, width: `${shuffle.size}%` }}
          />
          <img
            className="deck__shuffle"
            src={SHUFFLE_ICON_URL}
            alt=""
            style={{
              left: `${FACE_SLOTS.shuffleIcon.cx}%`,
              top: `${FACE_SLOTS.shuffleIcon.cy}%`,
              width: `${FACE_SLOTS.shuffleIcon.size}%`,
            }}
          />
        </>
      )}
    </span>
  )
}
