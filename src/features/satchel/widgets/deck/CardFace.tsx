import {
  FACE_SLOTS,
  SHUFFLE_ICON_URL,
  cardLabel,
  markIconUrl,
  markSpeech,
  medallionUrl,
  type Card,
} from './deck'

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
 * **표식은 메달 아래 한 줄로 붙는다.** 원소는 원소 트래커와 같은 아이콘을 쓰고
 * 나머지(부상·이동불가·밀기2…)는 글자로 적는다 — 팩에서 상태이상 아이콘을 더
 * 뽑아 오는 것은 ATTRIBUTION을 함께 고쳐야 하는 별개의 일이다(SPEC 13.1).
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
    <span className={`deck__face${spec.rolling ? ' deck__face--rolling' : ''}`} aria-hidden="true">
      {medallion ? (
        <img className="deck__medallion" src={medallion} alt="" style={slotStyle} />
      ) : (
        <span className="deck__numeral sl-numeral" style={slotStyle}>
          {cardLabel(spec.effect)}
        </span>
      )}

      {/*
        굴림 표식. **직접 그린 도형이다** — 실물 카드의 문양을 베끼지 않는다
        (구현 결정 31). 앞으로 흐르는 겹화살로 "여기서 끝나지 않는다"를 말한다.
      */}
      {spec.rolling && (
        <svg className="deck__rolling" viewBox="0 0 24 12" role="presentation">
          <path
            d="M2 6h9M9 2.5 12.5 6 9 9.5M13 2.5 16.5 6 13 9.5M17 2.5 20.5 6 17 9.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}

      {spec.marks.length > 0 && (
        <span className="deck__marks">
          {spec.marks.map((mark) => {
            const icon = markIconUrl(mark)
            return icon ? (
              <img key={mark.def.id} className="deck__mark-icon" src={icon} alt="" />
            ) : (
              <span key={mark.def.id} className="deck__mark-text">
                {markSpeech(mark)}
              </span>
            )
          })}
        </span>
      )}

      {spec.shuffleAfter && (
        <img
          className="deck__shuffle"
          src={SHUFFLE_ICON_URL}
          alt=""
          style={{ left: `${shuffle.cx}%`, top: `${shuffle.cy}%`, width: `${shuffle.size}%` }}
        />
      )}
    </span>
  )
}
