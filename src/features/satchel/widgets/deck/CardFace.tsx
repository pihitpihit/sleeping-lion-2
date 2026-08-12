import {
  FACE_SLOTS,
  SHUFFLE_ICON_URL,
  SOCKET_URL,
  cardLabel,
  ROLLING_ICON_URL,
  markArt,
  medallionUrl,
  type Card,
  type CardMark,
} from './deck'

/**
 * 마름모 배지의 바탕색.
 *
 * **원소는 여기 오지 않는다** — 원소 아이콘은 그 자체로 색 있는 둥근 배지라
 * 바탕을 깔 것이 없다. 여기 오는 것은 상태이상과 수치뿐이고, 색은 표식 자신이
 * 들고 있다(`MARKS`).
 */
/**
 * 카드가 누구 덱의 것인가 — **왼쪽 아래 홈에 앉는 것.**
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ **카드는 스스로 알아내지 않고 받아서 그린다.**                            │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * 실물에서는 1·2·3·4·M이나 **그 카드를 넣어 준 클래스의 표식**이 들어간다 — 판이
 * 끝나고 덱을 도로 가를 때 쓰는 자리다. 우리는 클래스 표식을 쓴다.
 *
 * 그림과 글자를 여기서 찾지 않고 **부르는 쪽이 건네준다.** 카드가 캐릭터·클래스
 * 스토어를 직접 부르면 축 ②가 축 ①에 닿는 자리가 흩어진다 — 그 자리는
 * `perkSource.ts` 하나여야 한다(구현 결정 142).
 */
export interface CardOwner {
  /** 클래스 표식 그림. 팩에 없는 클래스면 `null`. */
  iconUrl: string | null
  /** 그림이 없을 때 홈에 적을 한 글자. 비면 홈을 비워 둔다. */
  letter: string
  /** 읽어주는 쪽에 갈 이름. */
  name: string
}

function markBadgeColor(mark: CardMark): string {
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
export function CardStack({ chain, owner }: { chain: readonly Card[]; owner?: CardOwner | null }) {
  if (chain.length <= 1) {
    const only = chain[0]
    return only ? <CardFace card={only} owner={owner} /> : null
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
          <CardFace card={card} owner={owner} />
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
export function CardFace({ card, owner }: { card: Card; owner?: CardOwner | null }) {
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
        덱 주인 — **왼쪽 아래 홈.**

        홈은 카드 그림에 이미 박혀 있으므로 그 위에 표식만 앉힌다. 클래스 표식은
        거의 검정이라 어두운 홈에 묻힌다 — **물들이지 않고 양피지 원반을 깐다**
        (구현 결정 41). 시트·일지의 클래스 배지와 같은 결이다.
      */}
      {owner && (owner.iconUrl || owner.letter) && (
        <span
          className="deck__owner"
          /* 홈 **테 안쪽**에 딱 맞춘다. 바깥 지름을 쓰면 테를 덮어 홈이 사라진다. */
          style={{
            left: `${FACE_SLOTS.ownerInner.cx}%`,
            top: `${FACE_SLOTS.ownerInner.cy}%`,
            width: `${FACE_SLOTS.ownerInner.size}%`,
          }}
        >
          {owner.iconUrl ? (
            <img className="deck__owner-icon" src={owner.iconUrl} alt="" />
          ) : (
            <span className="deck__owner-letter">{owner.letter}</span>
          )}
        </span>
      )}

      {/*
        상태이상·원소 배지 — **왼쪽 가운데에서 아래로 쌓인다.**

        실물이 그 자리에 둔다. 메달을 가리지 않으면서 값과 나란히 읽히는
        자리다.
      */}
      {spec.marks.map((mark, index) => {
        const slot = FACE_SLOTS.effect
        /*
          쌓는 것은 CSS `translate`가 한다 — 그 %는 **제 크기**를 기준으로 하므로
          카드 비(437:296)와 무관하다. `top`으로 쌓았더니 가로 %와 세로 %가 섞여
          배지가 겹쳤다.

          가운데를 0으로 두고 위아래로 벌린다. 하나면 0이라 제자리다.
        */
        const place = {
          left: `${slot.cx}%`,
          top: `${slot.cy}%`,
          width: `${slot.size}%`,
          '--deck-badge-i': index - (spec.marks.length - 1) / 2,
        } as React.CSSProperties

        /*
          ┌──────────────────────────────────────────────────────────────────┐
          │ **완성된 배지는 그대로 얹고, 실루엣만 마름모를 깔아 준다.**        │
          └──────────────────────────────────────────────────────────────────┘

          팩의 상태이상 열넷과 원소 여섯은 **색까지 다 그려진 통짜 배지**다. 그것을
          마름모에 넣고 흰빛으로 물들였더니 문양이 사라지고 흰 원반만 남았다 —
          형님이 짚은 자리다. 있는 그대로 얹는다(구현 결정 15).

          치료·방어는 검정 실루엣이라 우리가 마름모를 깔고 흰빛으로 얹는다.
          당기기·특수는 그림이 아예 없어 글자로 간다.
        */
        const art = markArt(mark)
        const amount =
          mark.amount === null ? null : (
            <span className="deck__badge-amount sl-numeral">{mark.amount}</span>
          )

        if (art?.kind === 'badge') {
          return (
            <span key={mark.def.id} className="deck__mark" style={place}>
              <img className="deck__mark-art" src={art.url} alt="" />
              {amount}
            </span>
          )
        }

        return (
          <span
            key={mark.def.id}
            className="deck__badge"
            style={{ ...place, background: markBadgeColor(mark) }}
          >
            {art ? (
              <img className="deck__badge-glyph" src={art.url} alt="" />
            ) : (
              <span className="deck__badge-text">
                {mark.def.short ?? mark.def.name.slice(0, 1)}
              </span>
            )}
            {amount}
          </span>
        )
      })}

      {/*
        굴림 표식 — **오른쪽 가운데, 초록 마름모.**

        **팩에서 온 그림이다.** 처음에는 직접 그린 화살을 썼는데, 팩의 상태이상
        열넷 가운데 하나가 바로 이것이었다 — 실물 카드의 초록 마름모와 같다.
      */}
      {spec.rolling && (
        <img
          className="deck__roll"
          src={ROLLING_ICON_URL}
          alt=""
          style={{
            left: `${FACE_SLOTS.rolling.cx}%`,
            top: `${FACE_SLOTS.rolling.cy}%`,
            width: `${FACE_SLOTS.rolling.size}%`,
          }}
        />
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
