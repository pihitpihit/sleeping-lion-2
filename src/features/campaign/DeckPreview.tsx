import { useState } from 'react'
import {
  STANDARD_COMPOSITION,
  cardLabel,
  compositionKinds,
  compositionSize,
  countOf,
  ROLLING_ICON_URL,
  medallionUrl,
  specSpeech,
} from '../satchel/widgets/deck/deck'
import { resolveComposition } from '../satchel/widgets/deck/perks'
import type { CardOwner } from '../satchel/widgets/deck/CardFace'
import { DeckGallery } from './DeckGallery'
import { InlineMark } from './InlineMark'
import type { ClassPerk } from './perkNet'
import { perkDeckChanges } from './perks'

/**
 * 이 캐릭터의 공격 보정 덱 — **구성만.**
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ **켠 특혜대로 어떤 카드가 몇 장인지까지다. 판은 읽지 않는다.**            │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * 지금 몇 장 남았는지, 무엇이 뽑혔는지는 **여기 내지 않는다.** 그것은 축 ②의
 * 휘발성 런타임이고 판이 끝나면 사라지는 것이라(SPEC 5.2) 영속 기록지가 비출
 * 것이 아니다. 여기 있는 것은 특혜에서 순수하게 계산되는 값뿐이며, 스토어를
 * 하나도 건드리지 않는다.
 *
 * **특혜 표가 있을 때만 낸다.** 표가 없으면 덱 구성의 정본은 위젯 설정이고
 * (`resolveComposition`이 그렇게 갈린다) 시트는 그것을 알지 못한다 —
 * **모르면 모른다고 한다**(구현 결정 115·141과 같은 결). 사람이 위젯에서 손으로
 * 맞춰 둔 덱을 "표준 20장"이라고 적으면 그것이 곧 틀린 말이 된다.
 *
 * 그림은 덱 위젯이 쓰는 것과 **같은 것**을 쓴다. 시트에서 본 것과 상 위에서 뽑는
 * 것이 달라 보이면 같은 덱이라는 것을 알 수 없다.
 */

interface Props {
  /** 이 캐릭터가 속한 클래스의 특혜 줄. 비었으면 아무것도 그리지 않는다. */
  perks: readonly ClassPerk[]
  /** 켜 둔 상자 번호. */
  checked: readonly number[]
  /** 펼쳐 본 카드의 왼쪽 아래 홈에 앉을 표식. */
  owner?: CardOwner | null
}

export function DeckPreview({ perks, checked, owner }: Props) {
  const [showing, setShowing] = useState(false)

  const composition = resolveComposition({}, perkDeckChanges(perks, checked))
  const kinds = compositionKinds(composition)
  const total = compositionSize(composition)

  // 훅을 부른 뒤에 접는다 — 호출 차례가 렌더마다 같아야 한다.
  if (perks.length === 0) return null

  return (
    <section className="sheet__block">
      <h3 className="sheet__label">
        공격 보정 덱
        <span className="char__hint">
          {' '}
          — 모두 <span className="sl-numeral">{total}</span>장
        </span>
      </h3>
      <p className="char__note">
        켠 특혜대로 짜인 구성이다. 상 위에서 몇 장 남았는지는 행낭의 덱 위젯이 센다.
      </p>

      <ul className="deckview">
        {kinds.map((spec) => {
          const count = countOf(composition, spec.id)
          const standard = countOf(STANDARD_COMPOSITION, spec.id)
          const medallion = medallionUrl(spec.valueId)
          return (
            <li
              key={spec.id}
              className="deckview__chip"
              /* 읽어주는 쪽에는 우리말이 통째로 간다 — 그림과 숫자만으로는
                 무엇인지 알 수 없다. */
              aria-label={`${specSpeech(spec)} ${count}장`}
            >
              {medallion ? (
                <img className="deckview__medallion" src={medallion} alt="" aria-hidden="true" />
              ) : (
                /* 그림이 없는 값(+3·+4)은 숫자를 직접 그린다 — 팩이 실물 표준 덱에
                   있는 일곱만 담고 있다. */
                <span className="deckview__numeral sl-numeral" aria-hidden="true">
                  {cardLabel(spec.effect)}
                </span>
              )}

              <span className="deckview__count sl-numeral" aria-hidden="true">
                ×{count}
              </span>

              {/*
                굴림과 표식. 표준 아홉과 갈리는 것이 이것뿐이라 반드시 보여야 한다.

                **굴림도 그림이다.** 글자로 두었더니 카드·특혜 글에서는 초록
                마름모인 것이 여기서만 낱말이었다 — 같은 것으로 안 읽힌다.
                읽어주는 쪽에는 알약 전체의 `aria-label`이 우리말로 간다.
              */}
              {spec.rolling && (
                <img className="imark__badge" src={ROLLING_ICON_URL} alt="" aria-hidden="true" />
              )}
              {spec.marks.map((mark) => {
                /* 그리는 일은 `InlineMark` 한 곳이 한다 — 특혜 글도 같은 것을 쓴다. */
                return <InlineMark key={mark.def.id} mark={mark} />
              })}

              {/* 표준에서 얼마나 달라졌는가. 특혜가 실제로 먹었는지 여기서 보인다. */}
              {count !== standard && (
                <span className="deckview__delta sl-numeral" aria-hidden="true">
                  {count > standard ? `+${count - standard}` : `−${standard - count}`}
                </span>
              )}
            </li>
          )
        })}
      </ul>

      {/*
        알약은 **몇 장인지** 말한다. 어떤 카드인지 보려면 펼쳐야 한다 — 그것은
        세는 일이 아니라 보는 일이라 늘어놓을 자리가 따로 필요하다.
      */}
      <button type="button" className="deckview__open" onClick={() => setShowing(true)}>
        카드 펼쳐 보기
      </button>

      {showing && (
        <DeckGallery composition={composition} owner={owner} onClose={() => setShowing(false)} />
      )}
    </section>
  )
}
