import type { WidgetSettingsEditorProps } from '../types'
import {
  CARD_KINDS,
  MAX_PER_KIND,
  STANDARD_COMPOSITION,
  cardLabel,
  cardSpeech,
  compositionSize,
  countOf,
} from './deck'
import { isStandardComposition, sanitizeAttackDeckSettings } from './settings'
import './DeckSettingsEditor.css'

/**
 * 덱 구성 편집 — **퍽을 옮겨 적는 자리다.**
 *
 * SPEC 12장 열린 질문 6("보정 덱 구성 편집 UX")을 여기서 닫는다. 종류별로
 * 장수를 올리고 내린다. 퍽이 시키는 것이 결국 그것이다 — "−1 두 장을 빼고
 * +1 한 장을 넣는다".
 *
 * **클래스별 퍽 목록은 내놓지 않는다.** 그것은 게임 콘텐츠라 SPEC 3장에 걸린다.
 * 사용자가 자기 퍽 시트를 보고 옮긴다.
 *
 * 축 ①이 서면 캐릭터의 퍽에서 구성이 나오고(`perks.ts`), 그때 이 화면은 퍽을
 * 읽을 수 없을 때의 손질 자리로 남는다.
 */
export function DeckSettingsEditor({ value, onChange }: WidgetSettingsEditorProps) {
  const settings = sanitizeAttackDeckSettings(value)
  const { composition } = settings
  const total = compositionSize(composition)

  function setCount(kindId: string, next: number) {
    const clamped = Math.max(0, Math.min(MAX_PER_KIND, next))
    const updated = { ...composition, [kindId]: clamped }
    // 한 장도 없는 덱은 만들지 못하게 막는다. 뽑을 것이 없으면 고장으로 보인다.
    if (compositionSize(updated) === 0) return
    onChange({ composition: updated })
  }

  return (
    <div className="deck-settings">
      <p className="deck-settings__hint">
        퍽으로 바뀐 덱을 여기에 옮겨 적는다. 표준 덱은 20장이다.
      </p>

      <ul className="deck-settings__list">
        {CARD_KINDS.map((kind) => {
          const count = countOf(composition, kind.id)
          const standard = countOf(STANDARD_COMPOSITION, kind.id)
          return (
            <li key={kind.id} className={count === 0 ? 'deck-settings__row--off' : undefined}>
              <span className="deck-settings__card sl-numeral" aria-hidden="true">
                {cardLabel(kind.effect)}
              </span>

              <span className="deck-settings__name">
                {cardSpeech(kind)}
                {count !== standard && (
                  <em className="deck-settings__delta sl-numeral">
                    {count > standard ? `+${count - standard}` : `−${standard - count}`}
                  </em>
                )}
              </span>

              <span className="deck-settings__stepper">
                <button
                  type="button"
                  aria-label={`${cardSpeech(kind)} 한 장 빼기`}
                  disabled={count <= 0}
                  onClick={() => setCount(kind.id, count - 1)}
                >
                  −
                </button>
                <output className="sl-numeral" aria-label={`${cardSpeech(kind)} ${count}장`}>
                  {count}
                </output>
                <button
                  type="button"
                  aria-label={`${cardSpeech(kind)} 한 장 넣기`}
                  disabled={count >= MAX_PER_KIND}
                  onClick={() => setCount(kind.id, count + 1)}
                >
                  +
                </button>
              </span>
            </li>
          )
        })}
      </ul>

      <p className="deck-settings__total">
        모두 <strong className="sl-numeral">{total}</strong>장
      </p>

      {!isStandardComposition(composition) && (
        <button
          type="button"
          className="deck-settings__reset"
          onClick={() => onChange({ composition: { ...STANDARD_COMPOSITION } })}
        >
          표준 덱으로 되돌리기
        </button>
      )}
    </div>
  )
}
