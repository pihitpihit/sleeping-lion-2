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
import { useAttackDeckStore } from './deckStore'
import { resolveComposition } from './perks'
import { isStandardComposition, sanitizeAttackDeckSettings } from './settings'
import { usePerkChanges } from '../../perkSource'
import { slotKeyFor } from '../../roster'
import './DeckSettingsEditor.css'

/**
 * 덱 구성 편집.
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ **특혜 표가 있으면 그것이 이긴다. 이 화면은 없을 때의 손질 자리다.**      │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * SPEC 12장 열린 질문 6("보정 덱 구성 편집 UX")을 여기서 닫았다. 종류별로 장수를
 * 올리고 내린다 — 퍽이 시키는 것이 결국 그것이다.
 *
 * 2026-08-11에 캐릭터의 특혜를 실제로 읽게 되면서(`perkSource.ts`) **손잡이가
 * 먹히지 않는 때가 생겼다.** `resolveComposition`이 특혜를 이기게 두므로, 특혜가
 * 있는데도 손잡이를 내놓으면 눌러도 아무 일이 안 일어난다 — **먹히는 것처럼
 * 보이는 화면이 안 보이는 화면보다 나쁘다.** 그래서 그때는 나온 구성을 읽기만
 * 하게 보여주고 어디서 왔는지 적는다.
 *
 * **클래스별 특혜 목록은 여기 담지 않는다.** 게임 콘텐츠라 DB에만 있다(SPEC 3장).
 */
/** 늘 나오는 아홉 줄. 0장이어도 걷지 않는다 — 다시 넣을 자리가 필요하다. */
const STANDARD_KIND_IDS = new Set(STANDARD_KINDS.map((spec) => spec.id))

export function DeckSettingsEditor({ value, onChange, instanceId }: WidgetSettingsEditorProps) {
  const settings = sanitizeAttackDeckSettings(value)

  /** 캐릭터의 특혜에서 나온 변경. 읽을 수 없으면 `null`이고 설정값으로 간다. */
  const perkChanges = usePerkChanges(settings.characterId)
  const fromPerks = perkChanges !== null

  /** 실제로 덱이 될 구성. 화면에 뜨는 것도 이것이라야 한다. */
  const composition = resolveComposition(settings.composition, perkChanges)
  const total = compositionSize(composition)

  /**
   * 이 덱의 판이 담긴 열쇠. 놓기 전이면 담긴 판도 없다.
   *
   * 위젯이 쓰는 것과 **같은 함수로 뽑는다** — 두 곳에서 따로 지으면 언젠가
   * 어긋나서 다른 덱을 다시 짜게 된다.
   */
  const slot = instanceId === null ? null : slotKeyFor(settings.characterId, instanceId)
  const drawn = useAttackDeckStore((s) => (slot === null ? undefined : s.byInstance[slot]))
  const resetDeck = useAttackDeckStore((s) => s.reset)

  function setCount(kindId: string, next: number) {
    const { composition } = settings
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

      {/*
        **어디서 온 구성인지 먼저 말한다.** 손잡이가 있는 화면과 없는 화면이
        갈리므로, 왜 갈렸는지 모르면 고장으로 읽힌다.
      */}
      <p className="deck-settings__hint">
        {fromPerks
          ? '캐릭터 시트에서 켠 특혜대로 짜인 덱이다. 상자를 켜고 끄면 여기가 따라 바뀐다.'
          : '퍽으로 바뀐 덱을 여기에 옮겨 적는다. 표준 덱은 20장이다.'}
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

              {/*
                **특혜가 몰 때는 손잡이를 내지 않는다.** `resolveComposition`이
                특혜를 이기게 두므로 눌러도 아무 일이 안 일어난다 — 먹히는 것처럼
                보이는 손잡이가 없는 것보다 나쁘다.
              */}
              {fromPerks ? (
                <output
                  className="deck-settings__fixed sl-numeral"
                  aria-label={`${speech} ${count}장`}
                >
                  {count}
                </output>
              ) : (
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
              )}
            </li>
          )
        })}
      </ul>

      <p className="deck-settings__total">
        모두 <strong className="sl-numeral">{total}</strong>장
      </p>

      {/*
        ┌────────────────────────────────────────────────────────────────────┐
        │ **한 번 뽑은 덱은 저절로 다시 짜이지 않는다.**                      │
        └────────────────────────────────────────────────────────────────────┘

        덱은 첫 뽑기 때 만들어지고 그 뒤로는 섞을 뿐이다 — 실물에서도 판 도중에
        덱을 갈아 끼우지 않고, 퍽은 시나리오 사이에 얻는다. 그래서 **저절로**
        바꾸지 않고 사람이 누를 때만 다시 짠다.

        담긴 판을 지우면 위젯이 지금 구성으로 새 덱을 편다 — 그 구성은 화면이
        그릴 때마다 특혜에서 다시 나오므로 늘 최신이다.
      */}
      {drawn && (
        <button
          type="button"
          className="deck-settings__reset"
          onClick={() => slot && resetDeck(slot)}
        >
          덱 새로 짜기
        </button>
      )}

      {/* 특혜가 몰 때는 되돌릴 것이 없다 — 되돌려도 특혜가 다시 이긴다. */}
      {!fromPerks && !isStandardComposition(composition) && (
        <button
          type="button"
          className="deck-settings__reset"
          onClick={() => onChange({ ...settings, composition: { ...STANDARD_COMPOSITION } })}
        >
          표준 덱으로 되돌리기
        </button>
      )}
    </div>
  )
}
