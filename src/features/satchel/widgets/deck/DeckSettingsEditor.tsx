import { CharacterPicker } from '../CharacterPicker'
import type { WidgetSettingsEditorProps } from '../types'
import {
  MAX_PER_KIND,
  STANDARD_COMPOSITION,
  STANDARD_KINDS,
  cardLabel,
  compositionKinds,
  compositionSize,
  countOf,
  markSpeech,
  medallionUrl,
  specSpeech,
  type CardSpec,
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
/** 늘 나오는 아홉 줄. 0장이어도 걷지 않는다 — 다시 넣을 자리가 필요하다. */
const STANDARD_KIND_IDS = new Set(STANDARD_KINDS.map((spec) => spec.id))

export function DeckSettingsEditor({ value, onChange }: WidgetSettingsEditorProps) {
  const settings = sanitizeAttackDeckSettings(value)
  const { composition } = settings
  const total = compositionSize(composition)

  function setCount(kindId: string, next: number) {
    const clamped = Math.max(0, Math.min(MAX_PER_KIND, next))
    const updated: Record<string, number> = { ...composition, [kindId]: clamped }
    // 0장이 된 것은 열쇠째 걷는다. 남겨두면 표식 붙은 종류가 0인 채로 줄만
    // 차지한다 — 아홉 값은 늘 나오지만 그 밖의 것은 있을 때만 나온다.
    if (clamped === 0 && !STANDARD_KIND_IDS.has(kindId)) delete updated[kindId]
    // 한 장도 없는 덱은 만들지 못하게 막는다. 뽑을 것이 없으면 고장으로 보인다.
    if (compositionSize(updated) === 0) return
    onChange({ ...settings, composition: updated })
  }

  /**
   * 늘어놓을 종류.
   *
   * **아홉 값은 늘 나오고, 표식 붙은 것은 실제로 들어 있을 때만 나온다.** 표식의
   * 조합은 끝이 없어서 다 늘어놓을 수가 없다 — 퍽에서 들어온 것만 손질할 수 있게
   * 낸다.
   */
  const rows: CardSpec[] = [
    ...STANDARD_KINDS,
    ...compositionKinds(composition).filter((spec) => !STANDARD_KIND_IDS.has(spec.id)),
  ]

  return (
    <div className="deck-settings">
      {/*
        누구의 덱인지 먼저 고른다. 구성을 정하는 퍽이 그 캐릭터의 것이고,
        전투에서 뽑은 카드가 모일 열쇠도 그 id다.
      */}
      <CharacterPicker
        value={settings.characterId}
        onChange={(characterId) => onChange({ ...settings, characterId })}
      />

      <hr className="deck-settings__rule" />

      <p className="deck-settings__hint">
        퍽으로 바뀐 덱을 여기에 옮겨 적는다. 표준 덱은 20장이다.
      </p>

      <ul className="deck-settings__list">
        {rows.map((spec) => {
          const count = countOf(composition, spec.id)
          const standard = countOf(STANDARD_COMPOSITION, spec.id)
          const speech = specSpeech(spec)
          const medallion = medallionUrl(spec.valueId)
          return (
            <li key={spec.id} className={count === 0 ? 'deck-settings__row--off' : undefined}>
              {/* 값 메달을 그대로 보여준다. 화면에서 뽑을 카드와 같은 그림이라
                  무엇을 세고 있는지 헷갈릴 일이 없다. */}
              {medallion ? (
                <img
                  className="deck-settings__medallion"
                  src={medallion}
                  alt=""
                  aria-hidden="true"
                />
              ) : (
                <span className="deck-settings__card sl-numeral" aria-hidden="true">
                  {cardLabel(spec.effect)}
                </span>
              )}

              <span className="deck-settings__name">
                {/* 굴림과 표식은 값 옆에 작게 붙는다. 퍽에서 들어온 줄이 아홉
                    값 사이에 섞여도 한눈에 갈린다. */}
                {spec.rolling && <em className="deck-settings__tag">굴림</em>}
                {cardLabel(spec.effect)}
                {spec.marks.map((mark) => (
                  <em key={mark.def.id} className="deck-settings__tag">
                    {markSpeech(mark)}
                  </em>
                ))}
                {count !== standard && (
                  <em className="deck-settings__delta sl-numeral">
                    {count > standard ? `+${count - standard}` : `−${standard - count}`}
                  </em>
                )}
              </span>

              <span className="deck-settings__stepper">
                <button
                  type="button"
                  aria-label={`${speech} 한 장 빼기`}
                  disabled={count <= 0}
                  onClick={() => setCount(spec.id, count - 1)}
                >
                  −
                </button>
                <output className="sl-numeral" aria-label={`${speech} ${count}장`}>
                  {count}
                </output>
                <button
                  type="button"
                  aria-label={`${speech} 한 장 넣기`}
                  disabled={count >= MAX_PER_KIND}
                  onClick={() => setCount(spec.id, count + 1)}
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
