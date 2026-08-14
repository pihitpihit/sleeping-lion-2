import { useId, useState } from 'react'
import { ConfirmDialog } from '../satchel/board/ConfirmDialog'
import { PencilIcon } from './PencilIcon'
import { draftOf, isDirty, partyDiff, type PartyDraft } from './partyDraft'
import {
  MAX_REPUTATION,
  MIN_REPUTATION,
  priceModifierLabel,
  priceModifierSpeech,
  shopPriceModifier,
} from './reputation'
import type { Campaign, CampaignEdits } from './types'

interface Props {
  campaign: Campaign
  onEdit: (edits: CampaignEdits) => void
  /**
   * 서버에 못 닿아 **거울을 보여주는 중**인가.
   *
   * 그때는 고칠 수 없다. 받아 두었다가 잃는 것보다 못 쓴다고 말하는 편이 낫다 —
   * 오프라인 큐는 딸려 오는 덩어리가 커서 따로 둔다(SPEC 5.3).
   */
  readOnly?: boolean
}

/**
 * 파티 기록지.
 *
 * 실물 파티 시트에서 **이름·장소·메모·업적·평판** 다섯만 옮겼다. 시트 그림을
 * 깔지 않고 우리 결로 다시 그린다 — 종이 비율에 갇히면 폰에서 못 쓰고, 시트에
 * 박힌 영문 라벨이 한국어 화면과 겉돈다(SPEC 13장의 🟢 '컨셉·레이아웃은 자유
 * 참고, 우리 식으로 재구현').
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ **열람이 기본이고, 고치려면 편집으로 들어간다.**                          │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * 캐릭터 시트와 같은 짜임이며 까닭도 같다 — 평판을 −5에서 +8로 옮기면 그 사이
 * 열세 번이 나가고 `version`이 손가락 수만큼 오른다. 그냥 들여다보는 동안에도
 * 칸이 열려 있어 **스치기만 해도 값이 바뀌었다.** 이제 초안(`partyDraft.ts`)을
 * 고치고 **저장을 누를 때 한 번** 보낸다.
 *
 * **파티는 파티원이면 누구나 고친다**(구현 결정 44). 캐릭터가 "제 것만"인 것과
 * 다르다 — 파티 상태는 함께 쓰는 것이다. 그래서 **바뀐 칸만 보내는 것이 여기서
 * 더 중요하다**: 통째로 덮으면 그 사이 옆 사람이 고친 것을 되돌린다.
 *
 * **가격 보정은 입력받지 않는다.** 평판에서 나오는 값이라 사람이 적으면 두 곳이
 * 어긋난다. 실물에서도 눈금 옆에 인쇄돼 있어 읽기만 하던 숫자다.
 *
 * **다른 기록지를 펼치면 부르는 쪽이 `key`로 다시 태운다**(`JournalPage`). 초안을
 * 이펙트로 맞추면 렌더가 꼬리를 물고, 무엇보다 남이 고친 값이 **치고 있는 글자를
 * 덮어쓴다.**
 */
export function PartySheet({ campaign, onEdit, readOnly = false }: Props) {
  const nameId = useId()
  const placeId = useId()
  const noteId = useId()
  const repId = useId()

  const [wantsEdit, setWantsEdit] = useState(false)
  const [draft, setDraft] = useState<PartyDraft>(() => draftOf(campaign))
  const [newAchievement, setNewAchievement] = useState('')
  const [asking, setAsking] = useState(false)

  /**
   * 지금 편집 중인가.
   *
   * **고칠 수 없게 되면 그 자리에서 내려온다.** 편집 중에 서버가 끊기면 칸이
   * 열린 채로 남는데 저장은 어차피 안 나간다 — 열려 있는 것처럼 보이는 화면이
   * 잠긴 화면보다 나쁘다.
   */
  const editing = wantsEdit && !readOnly

  /**
   * 화면에 그리는 값.
   *
   * **편집 중이면 초안, 아니면 레코드다.** 열람 중에 초안을 그리면 남이 고친 값이
   * 들어와도 화면이 옛것을 붙들고 있다 — 파티는 여럿이 함께 쓰므로 더 잦다.
   */
  const shown: PartyDraft = editing ? draft : draftOf(campaign)
  const dirty = editing && isDirty(campaign, draft)
  const modifier = shopPriceModifier(shown.reputation)

  function set<K extends keyof PartyDraft>(key: K, value: PartyDraft[K]) {
    setDraft((d) => ({ ...d, [key]: value }))
  }

  function startEditing() {
    setDraft(draftOf(campaign))
    setNewAchievement('')
    setWantsEdit(true)
  }

  function stopEditing() {
    setWantsEdit(false)
    setNewAchievement('')
    setAsking(false)
  }

  function save() {
    const edits = partyDiff(campaign, draft)
    // 바뀐 것이 없으면 보내지 않는다. 빈 갱신도 `version`을 올린다.
    if (Object.keys(edits).length > 0) onEdit(edits)
    stopEditing()
  }

  function addAchievement() {
    const value = newAchievement.trim()
    if (value === '') return
    set('achievements', [...draft.achievements, value])
    setNewAchievement('')
  }

  return (
    <div className={`sheet${editing ? ' sheet--editing' : ''}`}>
      {/*
        칸들을 한 단으로 감싼다 — 캐릭터 시트와 같은 짜임이다. 장식선은
        `.paper__col`의 자식마다 붙으므로 **저장 띠는 이 밖에 둔다**: 띠 위에
        선이 그어지면 칸으로 읽힌다.
      */}
      <div className="paper__col">
        <section className="sheet__block">
          <label className="sheet__label" htmlFor={nameId}>
            파티 이름
          </label>
          <input
            id={nameId}
            className="sheet__input"
            value={shown.name}
            placeholder="이름을 짓는다"
            disabled={!editing}
            onChange={(e) => set('name', e.target.value)}
          />
        </section>

        <section className="sheet__block">
          <label className="sheet__label" htmlFor={placeId}>
            머무는 곳
          </label>
          <input
            id={placeId}
            className="sheet__input"
            value={shown.location}
            placeholder={editing ? '어디에 있는가' : ''}
            disabled={!editing}
            onChange={(e) => set('location', e.target.value)}
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
              disabled={!editing || shown.reputation <= MIN_REPUTATION}
              onClick={() => set('reputation', shown.reputation - 1)}
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
              value={shown.reputation}
              disabled={!editing}
              onChange={(e) => set('reputation', Number(e.target.value))}
            />

            <button
              type="button"
              className="sheet__step"
              aria-label="평판 1 올리기"
              disabled={!editing || shown.reputation >= MAX_REPUTATION}
              onClick={() => set('reputation', shown.reputation + 1)}
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

          {shown.achievements.length > 0 && (
            <ul className="sheet__achievements">
              {shown.achievements.map((item, index) => (
                <li key={`${index}-${item}`}>
                  <span>{item}</span>
                  {/* 지우는 단추는 편집 중에만 낸다. 열람 화면에 ×가 늘어서 있으면
                    누를 수 있는 줄 알고 손이 간다. */}
                  {editing && (
                    <button
                      type="button"
                      className="sheet__remove"
                      aria-label={`업적 '${item}' 지우기`}
                      onClick={() =>
                        set(
                          'achievements',
                          draft.achievements.filter((_, i) => i !== index),
                        )
                      }
                    >
                      ×
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}

          {shown.achievements.length === 0 && !editing && (
            <p className="sheet__empty">아직 없다.</p>
          )}

          {editing && (
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
          )}
        </section>

        <section className="sheet__block">
          <label className="sheet__label" htmlFor={noteId}>
            메모
          </label>
          <textarea
            id={noteId}
            className="sheet__notes"
            rows={5}
            value={shown.notes}
            placeholder={editing ? '적어둘 것' : ''}
            disabled={!editing}
            onChange={(e) => set('notes', e.target.value)}
          />
        </section>
      </div>

      {/*
        띠는 아래에 붙어 따라온다. 캐릭터 시트와 **같은 클래스를 쓴다** — 같은 일을
        하는 띠를 두 벌 그리면 반드시 어긋난다.
      */}
      <div className="sheet__bar">
        {!editing ? (
          readOnly ? (
            <p className="sheet__locked">서버에 닿지 못해 지금은 고칠 수 없다.</p>
          ) : (
            <button
              type="button"
              className="sheet__edit"
              aria-label="고치기"
              title="고치기"
              onClick={startEditing}
            >
              <PencilIcon />
            </button>
          )
        ) : (
          <>
            <button
              type="button"
              className="sheet__cancel"
              /* 고친 것이 있으면 한 번 묻는다. 없으면 버릴 것도 없다. */
              onClick={() => (dirty ? setAsking(true) : stopEditing())}
            >
              그만두기
            </button>
            <button type="button" className="sheet__save" disabled={!dirty} onClick={save}>
              {dirty ? '저장' : '고친 것 없음'}
            </button>
          </>
        )}
      </div>

      {asking && (
        <ConfirmDialog
          title="고치던 것을 버립니까?"
          description="저장하지 않은 것은 되돌아오지 않는다."
          confirmLabel="버린다"
          /* 뜸은 짧게. 잃는 것이 방금 고친 몇 칸이다(구현 결정 174). */
          delayMs={1500}
          onConfirm={stopEditing}
          onCancel={() => setAsking(false)}
        />
      )}
    </div>
  )
}
