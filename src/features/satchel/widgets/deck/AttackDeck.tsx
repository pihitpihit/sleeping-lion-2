import { useCallback, useRef, useState } from 'react'
import { useBoardSize } from '../../useBoardSize'
import type { WidgetProps } from '../types'
import { CardStack } from './CardFace'
import { RevealFlash } from './RevealFlash'
import {
  CARD_BACK_URL,
  CARD_FACE_URL,
  SHUFFLE_ICON_URL,
  chainSpeech,
  computeDeckLayout,
  discardCount,
  freshDeck,
  needsShuffle,
  remainingCount,
  revealedCard,
  revealedChain,
  totalCount,
  type Card,
} from './deck'
import { useAttackDeckStore } from './deckStore'
import { resolveComposition } from './perks'
import { sanitizeAttackDeckSettings } from './settings'
import { slotKeyFor } from '../../roster'
import { usePerkChanges } from '../../perkSource'
import './AttackDeck.css'

/**
 * 공격 보정 덱.
 *
 * 더미를 누르면 맨 위 한 장이 공개된다. 덱이 비면 저절로 섞고 나서 뽑는다 —
 * 실물에서 손으로 하던 일이다.
 *
 * **카드 그림은 Creator Pack 것이다**(SPEC 13.1). 앞면 틀 위에 값 메달을 얹고
 * 섞기 표식을 왼쪽 아래 자리에 앉히는 것이 팩이 의도한 쓰임이다 — 실물 카드가
 * 그렇게 짜여 있다. 자리 값은 `deck.ts`의 `FACE_SLOTS`가 정본이다.
 *
 * **셔플 표시가 뜬 카드를 뽑아도 그 자리에서 섞지 않는다.** 라운드 트래커로
 * 라운드를 넘길 때 섞인다(`roundStore`). 실물에서도 표시는 라운드가 끝날 때
 * 처리하며, 두 스토어를 잇는 자리를 한 곳으로 모으는 것이 구현 결정 34다.
 *
 * **확률을 말하지 않는다.** 남은 장수는 보여주되 다음에 무엇이 나올지는 계산하지
 * 않는다(SPEC 1장).
 */
export function AttackDeck({ instanceId, mode, rotation, settings }: WidgetProps) {
  const deckSettings = sanitizeAttackDeckSettings(settings)
  /**
   * 덱이 담기는 열쇠.
   *
   * 캐릭터를 골랐으면 그 id다 — 전투에서 넷이 앉았을 때 **누가 무엇을 뽑았는지**
   * 서로 보이려면 같은 열쇠여야 한다. 실물에서도 뽑은 카드는 상 위에 펼쳐져
   * 다 보인다. 안 골랐으면 종전대로 인스턴스 id다.
   */
  const slot = slotKeyFor(deckSettings.characterId, instanceId)
  const { ref, size } = useBoardSize<HTMLDivElement>()
  const layout = computeDeckLayout(size)

  const stored = useAttackDeckStore((s) => s.byInstance[slot])
  const reveal = useAttackDeckStore((s) => s.reveal)

  const pileRef = useRef<HTMLButtonElement | null>(null)
  const discardRef = useRef<HTMLDivElement | null>(null)

  /**
   * 방금 공개해 크게 띄운 카드.
   *
   * `nonce`를 함께 들고 있다. 같은 값이 잇달아 나오면(+0이 여섯 장이다) 상태가
   * 같아 보여 React가 다시 그리지 않고, 그러면 두 번째 탭에서 팝업이 뜨지 않는다.
   */
  const [flash, setFlash] = useState<{ chain: readonly Card[]; nonce: number } | null>(null)
  const nonce = useRef(0)

  /**
   * 이 덱의 구성.
   *
   * **퍽을 읽을 수 있으면 그것이 이긴다** — 사람이 설정에 적어 둔 값보다 캐릭터가
   * 실제로 켠 특혜가 사실에 가깝다(`perks.ts`). 캐릭터를 안 골랐거나 그 클래스의
   * 특혜 표가 아직 안 들어왔으면 `null`이고 설정값이 쓰인다.
   */
  const perkChanges = usePerkChanges(deckSettings.characterId)
  const composition = resolveComposition(deckSettings.composition, perkChanges)

  /**
   * 아직 한 번도 안 뽑았으면 구성대로 편 덱을 보여준다.
   *
   * 스토어의 기본값(표준 20장)을 쓰면 퍽으로 장수를 고쳐 둔 덱이 뽑기 전까지
   * 20장으로 보인다. `freshDeck`은 섞지 않으므로 렌더마다 같은 결과다
   * (구현 결정 12).
   */
  const deck = stored ?? freshDeck(composition)

  const revealed = revealedCard(deck)
  /** 마지막 뽑기에 딸린 것 전부. 굴림이 없으면 한 장이다. */
  const chain = revealedChain(deck)
  const remaining = remainingCount(deck)
  const discarded = discardCount(deck)
  const total = totalCount(deck)
  const mustShuffle = needsShuffle(deck)
  const playable = mode === 'play'

  /** 뽑을 것이 다 떨어졌다. 다음 탭은 섞고 나서 뽑는다. */
  const exhausted = remaining === 0 && total > 0

  function onReveal() {
    const drawn = reveal(slot, composition)
    if (drawn.length === 0) return
    nonce.current += 1
    setFlash({ chain: drawn, nonce: nonce.current })
  }

  /**
   * 크게 띄운 카드가 날아가 앉을 자리.
   *
   * 버린 덱을 접었으면 더미로 간다 — 접혔을 때는 공개된 카드가 거기 그려진다.
   * **부를 때마다 다시 잰다.** 3초 사이에 창이 돌아가거나 위젯이 옮겨졌을 수 있다.
   */
  const landOn = useCallback(
    () => (discardRef.current ?? pileRef.current)?.getBoundingClientRect() ?? null,
    [],
  )

  /**
   * 더미를 읽어주는 말.
   *
   * **버린 덱을 접었을 때는 공개된 카드까지 여기서 말한다.** 접히면 카드가 이
   * 더미 위에 겹쳐 그려지므로, 따로 말해주는 자리가 없어진다.
   */
  const pileSpeech =
    total === 0
      ? '덱이 비어 있다.'
      : [
          `${total}장 중 ${remaining}장 남았다.`,
          !layout.showDiscard && revealed ? `공개된 카드: ${chainSpeech(chain)}.` : '',
          '누르면 한 장을 공개한다.',
          remaining === 0 ? '덱이 다 떨어져 섞은 뒤 뽑는다.' : '',
        ]
          .filter(Boolean)
          .join(' ')

  return (
    <div
      ref={ref}
      className={`deck deck--${layout.arrangement}`}
      style={
        {
          '--deck-card-w': `${layout.cardWidth}px`,
          '--deck-card-h': `${layout.cardHeight}px`,
          '--deck-gap': `${layout.gap}px`,
          '--deck-face': `${layout.faceSize}px`,
          '--deck-count': `${layout.countSize}px`,
          '--deck-back': `url("${CARD_BACK_URL}")`,
          '--deck-front': `url("${CARD_FACE_URL}")`,
        } as React.CSSProperties
      }
    >
      {/*
        더미 — 누르는 자리.

        좁아서 버린 덱을 따로 못 내놓을 때는(`single`) 공개된 카드를 이 자리에
        겹쳐 보여준다. 그러지 않으면 뽑고도 무엇이 나왔는지 볼 수 없다.
      */}
      <button
        ref={pileRef}
        type="button"
        className={`deck__pile${exhausted ? ' deck__pile--exhausted' : ''}`}
        aria-label={pileSpeech}
        disabled={!playable || total === 0}
        onClick={onReveal}
      >
        {/*
          **다 떨어졌으면 뒷면을 그리지 않는다.**

          없는 카드를 그려두면 아직 남은 줄 안다. 대신 섞기 표식을 빈 자리에
          앉혀 다음 탭이 무슨 일을 할지 알린다. 겹쳐 둔 두 장도 함께 걷는다.
        */}
        {exhausted ? (
          <span className="deck__spent" aria-hidden="true">
            <img className="deck__spent-icon" src={SHUFFLE_ICON_URL} alt="" />
          </span>
        ) : !layout.showDiscard && revealed ? (
          <CardStack chain={chain} />
        ) : (
          <span className="deck__back" aria-hidden="true" />
        )}
        <span className="deck__count sl-numeral" aria-hidden="true">
          {remaining} / {total}
        </span>
      </button>

      {/* 버린 덱 — 자리가 넉넉할 때만 낸다. */}
      {layout.showDiscard && (
        <div
          ref={discardRef}
          className="deck__discard"
          role="status"
          aria-live="polite"
          aria-label={revealed ? `공개된 카드: ${chainSpeech(chain)}` : '아직 공개한 카드가 없다.'}
        >
          {revealed ? <CardStack chain={chain} /> : <span className="deck__empty" />}
          {discarded > 0 && (
            <span className="deck__count sl-numeral" aria-hidden="true">
              {discarded}
            </span>
          )}
        </div>
      )}

      {/*
        섞기가 걸렸다는 것은 **카드가 말한다** — 앞면 왼쪽 아래의 섞기 표식이다.
        위젯 쪽에 표식을 하나 더 두었다가 같은 것이 두 번 보여 걷었다.
      */}
      {mustShuffle && <span className="deck__marked" aria-hidden="true" />}

      {/*
        방금 공개한 카드를 크게 한 번 보여준다.

        `key`에 `nonce`를 준다 — 같은 값이 잇달아 나오면(+0이 여섯 장이다) React가
        같은 것으로 보고 그대로 두어, 두 번째 탭에서 뜸도 애니메이션도 다시 시작하지
        않는다.
      */}
      {flash && (
        <RevealFlash
          key={flash.nonce}
          rotation={rotation}
          landOn={landOn}
          onDone={() => setFlash(null)}
        >
          <CardStack chain={flash.chain} />
        </RevealFlash>
      )}
    </div>
  )
}
