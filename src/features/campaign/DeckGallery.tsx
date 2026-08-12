import { useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import { CardFace } from '../satchel/widgets/deck/CardFace'
import {
  CARD_FACE_URL,
  buildDeck,
  cardSpeech,
  compositionSize,
  type DeckComposition,
} from '../satchel/widgets/deck/deck'
import './DeckGallery.css'

/**
 * 덱에 든 카드를 **한 장씩 다 늘어놓는** 팝업.
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ **알약은 몇 장인지 말하고, 여기는 어떤 카드인지 보여준다.**               │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * 시트의 알약(`DeckPreview`)은 종류와 장수까지다. 특혜를 여럿 켜고 나면 "그래서
 * 내 덱이 실제로 어떻게 생겼나"가 궁금해지는데, 그것은 **세는 것이 아니라 보는
 * 것**이다. 상 위에 덱을 펼쳐 놓고 훑는 것과 같다.
 *
 * **덱 위젯이 쓰는 `CardFace`를 그대로 쓴다.** 여기서 본 그림과 상 위에서 뽑는
 * 그림이 다르면 같은 덱이라는 것을 알 수 없다(구현 결정 162와 같은 결).
 *
 * **판은 여전히 읽지 않는다.** 구성에서 편 카드일 뿐이고 무엇이 뽑혔는지·몇 장
 * 남았는지는 여기 없다 — 그것은 축 ②의 휘발성 런타임이다(구현 결정 160).
 *
 * `document.body`에 그린다(구현 결정 37). 시트가 `position: sticky`인 띠를 달고
 * 있어 쌓임 맥락이 이미 하나 생겼다.
 */

interface Props {
  composition: DeckComposition
  onClose: () => void
}

/**
 * 자리 잡기 — `document.body`에 그리고 배경막을 깐다.
 *
 * **알맹이(`DeckGalleryPanel`)와 갈라 둔다.** `createPortal`은 `document.body`를
 * 요구해서 서버 렌더로 확인할 수가 없는데, 확인하고 싶은 것은 자리가 아니라
 * **무엇이 늘어서는가**다. 갈라 두면 그쪽만 통째로 덮인다.
 */
export function DeckGallery({ composition, onClose }: Props) {
  return createPortal(
    <div
      className="deckgallery"
      /* 바깥을 눌러도 닫힌다. 훑어보기만 하는 팝업이라 나가는 길이 넓어야 한다. */
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <DeckGalleryPanel composition={composition} onClose={onClose} />
    </div>,
    document.body,
  )
}

/** 팝업의 알맹이. 배경막과 갈라 두어 서버 렌더로 확인할 수 있다. */
export function DeckGalleryPanel({ composition, onClose }: Props) {
  const closeRef = useRef<HTMLButtonElement | null>(null)
  const titleId = useId()

  // 카드는 **섞지 않는다.** 종류 차례대로 늘어놓아야 무엇이 몇 장인지 훑어진다 —
  // 섞으면 실물 덱과 같아지지만 그것은 이 화면이 하려는 일이 아니다.
  const cards = buildDeck(composition)
  const total = compositionSize(composition)

  useEffect(() => {
    closeRef.current?.focus()
  }, [])

  useEffect(() => {
    function onKey(event: globalThis.KeyboardEvent) {
      if (event.key !== 'Escape') return
      // 뒤쪽 화면이 같은 키를 듣고 있을 수 있다. 여기서 멈춘다.
      event.stopPropagation()
      onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    /* 초점을 가둘 것이 없다 — 눌리는 것은 × 하나뿐이라 Tab이 갈 곳이 없다. */
    <div className="deckgallery__panel" role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <header className="deckgallery__head">
        <h2 className="deckgallery__title" id={titleId}>
          공격 보정 덱<span className="deckgallery__count sl-numeral"> {total}</span>장
        </h2>
        <button
          ref={closeRef}
          type="button"
          className="deckgallery__close"
          aria-label="닫기"
          onClick={onClose}
        >
          ×
        </button>
      </header>

      {/*
          위아래로만 구른다. 한 줄에 두 장이면 폰에서도 메달의 숫자가 읽히고,
          가로로 구르게 두면 몇 장을 지나쳤는지 알 수 없다.
        */}
      <ul
        className="deckgallery__grid"
        /*
            카드 그림과 크기를 여기서 내려보낸다. `CardFace`는 위젯 안에서 쓰이도록
            만들어져 이 변수들을 **물려받기로** 기대하는데, 이 팝업은 `document.body`
            에 그려져 위젯의 자손이 아니다(`RevealFlash`가 같은 자리를 짚었다).
          */
        style={
          {
            '--deck-front': `url("${CARD_FACE_URL}")`,
            '--deck-card-w': 'min(40vw, 12rem)',
            '--deck-face': 'calc(min(40vw, 12rem) * 0.26)',
          } as React.CSSProperties
        }
      >
        {cards.map((card) => (
          <li key={card.id} className="deckgallery__cell" aria-label={cardSpeech(card)}>
            <CardFace card={card} />
          </li>
        ))}
      </ul>
    </div>
  )
}
