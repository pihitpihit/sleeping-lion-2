import { useBoardSize } from '../../useBoardSize'
import type { WidgetProps } from '../types'
import {
  cardLabel,
  cardSpeech,
  computeDeckLayout,
  discardCount,
  freshDeck,
  needsShuffle,
  remainingCount,
  revealedCard,
  totalCount,
  type Card,
} from './deck'
import { useAttackDeckStore } from './deckStore'
import { resolveComposition } from './perks'
import { sanitizeAttackDeckSettings } from './settings'
import { ShuffleMark } from './deckIcons'
import './AttackDeck.css'

/**
 * 공격 보정 덱.
 *
 * 더미를 누르면 맨 위 한 장이 공개된다. 덱이 비면 저절로 섞고 나서 뽑는다 —
 * 실물에서 손으로 하던 일이다.
 *
 * **셔플 표시가 뜬 카드를 뽑아도 그 자리에서 섞지 않는다.** 라운드 트래커로
 * 라운드를 넘길 때 섞인다(`roundStore`). 실물에서도 표시는 라운드가 끝날 때
 * 처리하며, 두 스토어를 잇는 자리를 한 곳으로 모으는 것이 구현 결정 34다.
 *
 * **확률을 말하지 않는다.** 남은 장수는 보여주되 다음에 무엇이 나올지는 계산하지
 * 않는다(SPEC 1장).
 */
export function AttackDeck({ instanceId, mode, settings }: WidgetProps) {
  const { ref, size } = useBoardSize<HTMLDivElement>()
  const layout = computeDeckLayout(size)

  const stored = useAttackDeckStore((s) => s.byInstance[instanceId])
  const reveal = useAttackDeckStore((s) => s.reveal)

  /**
   * 이 덱의 구성.
   *
   * 퍽을 읽을 수 있으면 그것이 이긴다. 축 ①이 아직 없어 지금은 늘 `null`이고
   * 설정값이 쓰인다 — `perks.ts` 참조.
   */
  const composition = resolveComposition(sanitizeAttackDeckSettings(settings).composition, null)

  /**
   * 아직 한 번도 안 뽑았으면 구성대로 편 덱을 보여준다.
   *
   * 스토어의 기본값(표준 20장)을 쓰면 퍽으로 장수를 고쳐 둔 덱이 뽑기 전까지
   * 20장으로 보인다. `freshDeck`은 섞지 않으므로 렌더마다 같은 결과다
   * (구현 결정 12).
   */
  const deck = stored ?? freshDeck(composition)

  const revealed = revealedCard(deck)
  const remaining = remainingCount(deck)
  const discarded = discardCount(deck)
  const total = totalCount(deck)
  const mustShuffle = needsShuffle(deck)
  const playable = mode === 'play'

  const pileSpeech =
    total === 0
      ? '덱이 비어 있다.'
      : `${total}장 중 ${remaining}장 남았다. 누르면 한 장을 공개한다.` +
        (remaining === 0 ? ' 덱이 다 떨어져 섞은 뒤 뽑는다.' : '')

  return (
    <div
      ref={ref}
      className={`deck deck--${layout.arrangement}${mustShuffle ? ' deck--marked' : ''}`}
      style={
        {
          '--deck-card-w': `${layout.cardWidth}px`,
          '--deck-card-h': `${layout.cardHeight}px`,
          '--deck-gap': `${layout.gap}px`,
          '--deck-face': `${layout.faceSize}px`,
          '--deck-count': `${layout.countSize}px`,
        } as React.CSSProperties
      }
    >
      {/*
        더미 — 누르는 자리.

        좁아서 버린 덱을 따로 못 내놓을 때는(`single`) 공개된 카드를 이 자리에
        겹쳐 보여준다. 그러지 않으면 뽑고도 무엇이 나왔는지 볼 수 없다.
      */}
      <button
        type="button"
        className="deck__pile"
        aria-label={pileSpeech}
        disabled={!playable || total === 0}
        onClick={() => reveal(instanceId, composition)}
      >
        <span className="deck__back" aria-hidden="true" />
        {!layout.showDiscard && revealed ? (
          <CardFace card={revealed} markSize={layout.markSize} />
        ) : (
          <span className="deck__crest" aria-hidden="true" />
        )}
        <span className="deck__count sl-numeral" aria-hidden="true">
          {remaining} / {total}
        </span>
      </button>

      {/* 버린 덱 — 자리가 넉넉할 때만 낸다. */}
      {layout.showDiscard && (
        <div
          className="deck__discard"
          role="status"
          aria-live="polite"
          aria-label={
            revealed ? `공개된 카드: ${cardSpeech(revealed)}` : '아직 공개한 카드가 없다.'
          }
        >
          {revealed ? (
            <CardFace card={revealed} markSize={layout.markSize} />
          ) : (
            <span className="deck__empty" aria-hidden="true" />
          )}
          <span className="deck__count sl-numeral" aria-hidden="true">
            {discarded}
          </span>
        </div>
      )}

      {/*
        섞기 대기 — **두 겹 원형 화살표 하나로 말한다.**

        처음에는 "라운드를 넘기면 섞는다"를 글자로 띄웠다. 좁은 자리에서 카드를
        가리고, 위젯이 90도 돌면 글자가 눕고, 무엇보다 한 번 읽고 나면 그 뒤로는
        표식만으로 충분하다. 라운드 트래커의 이름표를 `ROUND`로 둔 것과 같은
        판단이다(구현 결정 39).

        **읽어주는 쪽에는 우리말이 그대로 간다** — 화면에서 걷은 것은 글자이지
        뜻이 아니다.
      */}
      {mustShuffle && (
        <span
          className="deck__pending"
          role="status"
          aria-label="섞기 표시가 떴다. 라운드를 넘기면 이 덱을 섞는다."
        >
          <ShuffleMark size={layout.pendingSize} />
        </span>
      )}
    </div>
  )
}

/** 카드 앞면. 숫자와 기호뿐이라 Pirata One으로 그린다(구현 결정 39). */
function CardFace({ card, markSize }: { card: Card; markSize: number }) {
  return (
    <span className="deck__face" aria-hidden="true">
      <span className="deck__value sl-numeral">{cardLabel(card.effect)}</span>
      {card.shuffleAfter && (
        <span className="deck__face-mark">
          <ShuffleMark size={markSize} />
        </span>
      )}
    </span>
  )
}
