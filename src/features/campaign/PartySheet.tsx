import { useId, useState } from 'react'
import {
  MAX_REPUTATION,
  MIN_REPUTATION,
  clampReputation,
  priceModifierLabel,
  priceModifierSpeech,
  shopPriceModifier,
} from './reputation'
import type { Campaign } from './types'

interface Props {
  campaign: Campaign
  onEdit: (edits: Partial<Campaign>) => void
}

/**
 * 파티 기록지.
 *
 * 실물 파티 시트에서 **이름·장소·메모·업적·평판** 다섯만 옮겼다. 시트 그림을
 * 깔지 않고 우리 결로 다시 그린다 — 종이 비율에 갇히면 폰에서 못 쓰고, 시트에
 * 박힌 영문 라벨이 한국어 화면과 겉돈다(SPEC 13장의 🟢 '컨셉·레이아웃은 자유
 * 참고, 우리 식으로 재구현').
 *
 * **가격 보정은 입력받지 않는다.** 평판에서 나오는 값이라 사람이 적으면 두 곳이
 * 어긋난다. 실물에서도 눈금 옆에 인쇄돼 있어 읽기만 하던 숫자다.
 *
 * 글자 칸은 **손을 뗄 때 저장한다**(`onBlur`). 한 자 칠 때마다 IndexedDB에 쓰면
 * `version`이 타이핑 수만큼 오르고, Phase 2의 낙관적 잠금이 그 순간 무의미해진다.
 *
 * **다른 기록지를 펼치면 부르는 쪽이 `key`로 다시 태운다**(`JournalPage`). 초안을
 * 이펙트로 맞추면 렌더가 꼬리를 물고, 무엇보다 남이 고친 값이 **치고 있는 글자를
 * 덮어쓴다.** 초안은 이 인스턴스가 사는 동안 사람의 것이다.
 */
export function PartySheet({ campaign, onEdit }: Props) {
  const nameId = useId()
  const placeId = useId()
  const noteId = useId()
  const repId = useId()

  // 치는 동안에는 여기 담아두고, 손을 뗄 때 저장한다.
  const [draft, setDraft] = useState({
    name: campaign.name,
    location: campaign.location,
    notes: campaign.notes,
  })
  const [newAchievement, setNewAchievement] = useState('')

  const modifier = shopPriceModifier(campaign.reputation)

  function commit(field: 'name' | 'location' | 'notes') {
    const value = draft[field]
    if (value === campaign[field]) return
    onEdit({ [field]: value })
  }

  function addAchievement() {
    const value = newAchievement.trim()
    if (value === '') return
    onEdit({ achievements: [...campaign.achievements, value] })
    setNewAchievement('')
  }

  return (
    <div className="sheet">
      <section className="sheet__block">
        <label className="sheet__label" htmlFor={nameId}>
          파티 이름
        </label>
        <input
          id={nameId}
          className="sheet__input"
          value={draft.name}
          placeholder="이름을 짓는다"
          onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
          onBlur={() => commit('name')}
        />
      </section>

      <section className="sheet__block">
        <label className="sheet__label" htmlFor={placeId}>
          머무는 곳
        </label>
        <input
          id={placeId}
          className="sheet__input"
          value={draft.location}
          placeholder="어디에 있는가"
          onChange={(e) => setDraft((d) => ({ ...d, location: e.target.value }))}
          onBlur={() => commit('location')}
        />
      </section>

      {/* --------------------------------------------------------------------
          평판 — 가격 보정이 여기서 나온다
          -------------------------------------------------------------------- */}
      <section className="sheet__block sheet__block--rep">
        <label className="sheet__label" htmlFor={repId}>
          평판
        </label>

        <div className="sheet__rep">
          <button
            type="button"
            className="sheet__step"
            aria-label="평판 1 내리기"
            disabled={campaign.reputation <= MIN_REPUTATION}
            onClick={() => onEdit({ reputation: clampReputation(campaign.reputation - 1) })}
          >
            −
          </button>

          <input
            id={repId}
            className="sheet__rep-value sl-numeral"
            type="number"
            inputMode="numeric"
            min={MIN_REPUTATION}
            max={MAX_REPUTATION}
            value={campaign.reputation}
            onChange={(e) => onEdit({ reputation: clampReputation(Number(e.target.value)) })}
          />

          <button
            type="button"
            className="sheet__step"
            aria-label="평판 1 올리기"
            disabled={campaign.reputation >= MAX_REPUTATION}
            onClick={() => onEdit({ reputation: clampReputation(campaign.reputation + 1) })}
          >
            +
          </button>
        </div>

        {/*
          입력이 아니라 **읽어주는 값**이다. `output`으로 두어 읽는 쪽에도 그렇게
          전해진다. 평판이 바뀌면 함께 읽히도록 `aria-live`를 건다.
        */}
        <output
          className={`sheet__price sheet__price--${modifier > 0 ? 'up' : modifier < 0 ? 'down' : 'flat'}`}
          htmlFor={repId}
          aria-live="polite"
        >
          <span className="sheet__price-label">물건값</span>
          <span className="sheet__price-value sl-numeral" aria-hidden="true">
            {priceModifierLabel(modifier)}
          </span>
          <span className="sheet__hidden">{priceModifierSpeech(modifier)}</span>
        </output>
      </section>

      {/* --------------------------------------------------------------------
          업적 — 사용자가 적는다. 우리는 목록을 갖고 있지 않다(SPEC 3장)
          -------------------------------------------------------------------- */}
      <section className="sheet__block">
        <h2 className="sheet__label">업적</h2>

        {campaign.achievements.length > 0 && (
          <ul className="sheet__achievements">
            {campaign.achievements.map((item, index) => (
              <li key={`${index}-${item}`}>
                <span>{item}</span>
                <button
                  type="button"
                  className="sheet__remove"
                  aria-label={`업적 '${item}' 지우기`}
                  onClick={() =>
                    onEdit({ achievements: campaign.achievements.filter((_, i) => i !== index) })
                  }
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="sheet__add">
          <input
            className="sheet__input"
            value={newAchievement}
            placeholder="업적을 적는다"
            aria-label="새 업적"
            onChange={(e) => setNewAchievement(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                addAchievement()
              }
            }}
          />
          <button
            type="button"
            className="sheet__add-button"
            disabled={newAchievement.trim() === ''}
            onClick={addAchievement}
          >
            더하기
          </button>
        </div>
      </section>

      <section className="sheet__block">
        <label className="sheet__label" htmlFor={noteId}>
          메모
        </label>
        <textarea
          id={noteId}
          className="sheet__notes"
          rows={5}
          value={draft.notes}
          placeholder="적어둘 것"
          onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))}
          onBlur={() => commit('notes')}
        />
      </section>
    </div>
  )
}
