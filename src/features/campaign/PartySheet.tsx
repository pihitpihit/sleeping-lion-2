import { useEffect, useId, useState } from 'react'
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
import { useAuthStore } from '../auth/authStore'
import { campaignChangesOf } from './characterLog'
import { writeCampaignLog } from './campaignNet'
import { LogView } from './LogView'
import { AchievementPicker } from './AchievementPicker'
import { useUnlockStore } from './unlockStore'
import { ConditionText } from './ConditionText'
import { markClass, moveOf } from './sheetDraft'

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
/** 눈금 밖으로 안 나간다 — 캐럿이 다섯 칸씩 움직이므로 여기서 한 번 더 본다. */
function clampRep(next: number): number {
  return Math.max(MIN_REPUTATION, Math.min(MAX_REPUTATION, next))
}

export function PartySheet({ campaign, onEdit, readOnly = false }: Props) {
  /** 로그 팝업이 열려 있는가. 읽기·편집 어느 쪽에서나 연다. */
  const [logOpen, setLogOpen] = useState(false)
  /** 업적을 고르는 중인가. **편집 중에만 연다** — 담는 것은 값을 고치는 일이다. */
  const [picking, setPicking] = useState<'party' | 'global' | null>(null)

  /*
    개봉 조건 표. **글은 DB에만 있다**(`0027`) — 아무것도 안 넣었으면 이 칸이
    통째로 안 보이고 나머지는 그대로 돈다(절대 원칙 3).
  */
  const conditions = useUnlockStore((s) => s.items)
  const loadConditions = useUnlockStore((s) => s.load)
  useEffect(() => {
    void loadConditions()
  }, [loadConditions])
  /** 누가 고쳤는지 남기려면 내가 누구인지 알아야 한다. */
  const userId = useAuthStore((s) => s.session?.userId ?? null)
  const nameId = useId()
  const placeId = useId()
  const noteId = useId()

  const [wantsEdit, setWantsEdit] = useState(false)
  const [draft, setDraft] = useState<PartyDraft>(() => draftOf(campaign))
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
    setWantsEdit(true)
  }

  function stopEditing() {
    setWantsEdit(false)
    setAsking(false)
  }

  function save() {
    const edits = partyDiff(campaign, draft)
    // 바뀐 것이 없으면 보내지 않는다. 빈 갱신도 `version`을 올린다.
    if (Object.keys(edits).length > 0) {
      onEdit(edits)
      /*
        **값이 들어간 다음에 남기고 실패해도 삼킨다**(구현 결정 372). 파티는
        여럿이 고치므로 「평판이 언제 −3이 됐지」를 물을 데가 있어야 한다.
      */
      if (userId !== null) {
        void writeCampaignLog(
          campaign.id,
          userId,
          'manual',
          campaignChangesOf(
            campaign as unknown as Record<string, unknown>,
            edits as unknown as Record<string, unknown>,
          ),
        )
      }
    }
    stopEditing()
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
          평판과 물건값 — **캐릭터 시트의 경험·골드와 같은 짜임**
          --------------------------------------------------------------------
          ┌──────────────────────────────────────────────────────────────────┐
          │ **읽을 때는 수만, 고칠 때 캐럿이 돋는다.**                        │
          └──────────────────────────────────────────────────────────────────┘

          들여다보는 동안에는 손잡이가 자리만 차지한다(구현 결정 333·364와 같은
          자리). 두 값을 한 줄에 나란히 두면 **평판이 물건값을 정한다**는 것이
          그림으로 읽힌다.

          **물건값은 입력받지 않는다.** 평판에서 나오는 값이라 사람이 적으면 두
          곳이 어긋난다 — 실물에서도 눈금 옆에 인쇄돼 있어 읽기만 하던 수다.
          -------------------------------------------------------------------- */}
        <section className="sheet__block">
          <h2 className="sheet__label">평판과 물건값</h2>

          <div className="tally">
            <div className="tally__item tally__item--rep">
              {editing && (
                <span className="tally__carets tally__carets--left">
                  <button
                    type="button"
                    className="tally__caret"
                    aria-label="평판 5 내리기"
                    disabled={shown.reputation <= MIN_REPUTATION}
                    onClick={() => set('reputation', clampRep(shown.reputation - 5))}
                  >
                    «
                  </button>
                  <button
                    type="button"
                    className="tally__caret"
                    aria-label="평판 1 내리기"
                    disabled={shown.reputation <= MIN_REPUTATION}
                    onClick={() => set('reputation', clampRep(shown.reputation - 1))}
                  >
                    ‹
                  </button>
                </span>
              )}

              <span className="tally__art" role="img" aria-label={`평판 ${shown.reputation}`}>
                <span
                  className={`tally__n tally__n--solo sl-numeral${markClass(
                    editing ? moveOf(campaign.reputation, shown.reputation) : null,
                  )}`}
                  aria-hidden="true"
                >
                  {shown.reputation > 0 ? `+${shown.reputation}` : shown.reputation}
                </span>
              </span>

              {editing && (
                <span className="tally__carets tally__carets--right">
                  <button
                    type="button"
                    className="tally__caret"
                    aria-label="평판 1 올리기"
                    disabled={shown.reputation >= MAX_REPUTATION}
                    onClick={() => set('reputation', clampRep(shown.reputation + 1))}
                  >
                    ›
                  </button>
                  <button
                    type="button"
                    className="tally__caret"
                    aria-label="평판 5 올리기"
                    disabled={shown.reputation >= MAX_REPUTATION}
                    onClick={() => set('reputation', clampRep(shown.reputation + 5))}
                  >
                    »
                  </button>
                </span>
              )}

              <span className="tally__label">평판</span>
            </div>

            {/*
              읽어주는 값이다 — 평판이 바뀌면 함께 읽히도록 `aria-live`를 건다.
            */}
            <div
              className={`tally__item tally__item--${modifier > 0 ? 'up' : modifier < 0 ? 'down' : 'flat'}`}
              aria-live="polite"
            >
              <span className="tally__art">
                <span className="tally__n tally__n--solo sl-numeral" aria-hidden="true">
                  {priceModifierLabel(modifier)}
                </span>
              </span>
              <span className="tally__label">물건값</span>
              <span className="sheet__hidden">{priceModifierSpeech(modifier)}</span>
            </div>
          </div>
        </section>

        {/* --------------------------------------------------------------------
          업적 — 사용자가 적는다. 우리는 목록을 갖고 있지 않다(SPEC 3장)
          -------------------------------------------------------------------- */}
        <section className="sheet__block">
          <h2 className="sheet__label">파티 업적</h2>

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

          {/*
            업적 목록 — **들어오는 길은 여기 하나뿐이다.**

            손으로 적는 칸이 있었는데 걷었다(형님이 정했다). 같은 것을 사람마다
            다르게 적어 두면 나중에 무엇이 무엇인지 알 수 없다 — 아이템을 상점
            하나로 모은 것과 같은 결이다(구현 결정 334·345).
          */}
          {editing && (
            <div className="char__shoprow">
              <button type="button" className="char__shopopen" onClick={() => setPicking('party')}>
                업적 고르기
              </button>
            </div>
          )}
        </section>

        {/* ------------------------------------------------------------------
          전역 업적 — **되풀이해 이룬다**
          ------------------------------------------------------------------
          ┌──────────────────────────────────────────────────────────────────┐
          │ **파티 업적과 다른 표다.**                                        │
          └──────────────────────────────────────────────────────────────────┘

          실물 시트가 둘로 갈라 적는다(형님이 짚었다). 개봉 조건에 「전역 업적 …
          n회 달성」이 있는 것으로 보아 **여러 번 이룰 수 있다** — 그래서 켰다/껐다가
          아니라 횟수다(`0028`).
          ------------------------------------------------------------------ */}
        <section className="sheet__block">
          <h2 className="sheet__label">전역 업적</h2>

          {Object.keys(shown.globalAchievements).length > 0 ? (
            <ul className="sheet__achievements">
              {Object.entries(shown.globalAchievements).map(([name, count]) => (
                <li key={name}>
                  <span>{name}</span>
                  <span className="global__count sl-numeral" aria-label={`${count}회`}>
                    ×{count}
                  </span>
                  {editing && (
                    <button
                      type="button"
                      className="sheet__remove"
                      aria-label={`전역 업적 '${name}' 한 번 빼기`}
                      /* 한 번씩 되돌린다 — 0이 되면 줄째 걷힌다(`partyDiff`). */
                      onClick={() =>
                        set('globalAchievements', {
                          ...draft.globalAchievements,
                          [name]: Math.max(0, (draft.globalAchievements[name] ?? 0) - 1),
                        })
                      }
                    >
                      −
                    </button>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            !editing && <p className="sheet__empty">아직 없다.</p>
          )}

          {editing && (
            <div className="char__shoprow">
              <button type="button" className="char__shopopen" onClick={() => setPicking('global')}>
                전역 업적 고르기
              </button>
            </div>
          )}
        </section>

        {/* ------------------------------------------------------------------
          봉투·상자 개봉 조건
          ------------------------------------------------------------------
          ┌──────────────────────────────────────────────────────────────────┐
          │ **인쇄된 캠페인 시트의 그 칸이다.**                               │
          └──────────────────────────────────────────────────────────────────┘

          형님이 실물을 찍어 보내 주었다 — 조건이 줄로 늘어서고 줄마다 체크상자가
          붙는데 하나는 상자가 열 개다(금화 기부).

          **켠 것은 줄 번호가 아니라 조건 id로 센다**(`0027`). 특혜 상자는 번호를
          이어 붙여 셌지만(구현 결정 136) 그 짜임은 표를 다시 넣을 때 번호가 밀리면
          켠 것이 딴 줄을 가리킨다.

          글은 게임 콘텐츠라 레포에 없다 — **표가 비어 있으면 왜 없는지 적는다.**
          아예 안 내면 「UI가 안 보인다」가 된다(형님이 짚었다): 없어도 앱이 도는
          것과 왜 없는지 안 보이는 것은 다르다(구현 결정 172와 같은 결).
          ------------------------------------------------------------------ */}
        <section className="sheet__block">
          <h2 className="sheet__label">봉투·상자 개봉 조건</h2>

          {conditions.length === 0 ? (
            <p className="sheet__empty">
              아직 표가 없다. 시트에 인쇄된 글이라 레포에 담지 않으므로{' '}
              <a href="#/admin">주인장 화면</a>에서 한 줄씩 넣는다.
            </p>
          ) : (
            <>
              <p className="sheet__empty">시트의 줄 그대로다. 이룬 만큼 상자를 켠다.</p>

              <ul className="unlock__rows">
                {conditions.map((cond) => {
                  const on = shown.unlocks[cond.id] ?? 0
                  return (
                    <li key={cond.id} className="unlock__row">
                      <span className="unlock__boxes">
                        {Array.from({ length: cond.boxes }, (_, i) => i + 1).map((n) => (
                          <button
                            key={n}
                            type="button"
                            aria-label={`${cond.text} — ${n}번째 상자`}
                            aria-pressed={n <= on}
                            className={`unlock__box${n <= on ? ' unlock__box--on' : ''}`}
                            disabled={!editing}
                            /*
                            **켠 칸은 앞에서부터 찬다.** 몇 번째를 눌렀느냐가 곧
                            몇 칸 켰느냐다 — 같은 칸을 다시 누르면 그 앞까지만
                            남는다. 열 칸짜리를 하나씩 되돌릴 수 있어야 한다.
                          */
                            onClick={() =>
                              set('unlocks', {
                                ...draft.unlocks,
                                [cond.id]: on === n ? n - 1 : n,
                              })
                            }
                          />
                        ))}
                      </span>
                      <span className="unlock__text">
                        <ConditionText text={cond.text} />
                      </span>
                    </li>
                  )
                })}
              </ul>
            </>
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
              취소
            </button>
            <button type="button" className="sheet__save" disabled={!dirty} onClick={save}>
              {dirty ? '저장' : '고친 것 없음'}
            </button>
          </>
        )}
      </div>

      {/*
        **파티 로그는 파티원이 다 본다**(`0021`) — 캐릭터 이력이 주인만 보이는
        것과 갈린다. 공용 장부라 서로의 손질이 보여야 뜻이 있다.
      */}
      <div className="char__logrow">
        <button type="button" className="char__logopen" onClick={() => setLogOpen(true)}>
          로그 보기
        </button>
      </div>

      {logOpen && <LogView source="campaign" id={campaign.id} onClose={() => setLogOpen(false)} />}

      {/* 담은 것은 **초안에 담긴다** — 저장을 눌러야 남는다(구현 결정 165). */}
      {picking !== null && (
        <AchievementPicker
          scope={picking}
          owned={picking === 'global' ? Object.keys(shown.globalAchievements) : shown.achievements}
          userId={userId}
          onPick={(name) => {
            if (picking === 'global') {
              /* **전역 업적은 되풀이해 이룬다** — 담을 때마다 한 번 더 센다. */
              set('globalAchievements', {
                ...draft.globalAchievements,
                [name]: (draft.globalAchievements[name] ?? 0) + 1,
              })
            } else {
              set('achievements', [...draft.achievements, name])
            }
          }}
          onClose={() => setPicking(null)}
        />
      )}

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
