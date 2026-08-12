import { useEffect, useId, useState } from 'react'
import { ConfirmDialog } from '../satchel/board/ConfirmDialog'
import {
  MAX_CHECKMARKS,
  XP_THRESHOLDS,
  classIconUrl,
  levelForXp,
  levelUpReady,
  perkSlotCount,
  perksEarned,
  togglePerk,
  xpToNextLevel,
} from './character'
import { DeckPreview } from './DeckPreview'
import { classInfoOf, maxHpFor, useClassStore } from './classStore'
import { perkRowsOf } from './perks'
import { draftOf, isDirty, sheetDiff, type SheetDraft } from './sheetDraft'
import type { Character, CharacterEdits } from './types'

interface Props {
  character: Character
  /** 내 것인가. 남의 것은 읽기 전용이다(SPEC 6장). */
  mine: boolean
  /** 서버에 못 닿는 중. 내 것이어도 잠근다. */
  offline?: boolean
  onEdit: (edits: CharacterEdits) => void
  onRemove: () => void
  /**
   * 혼자 서는 시트인가.
   *
   * `Roster`에서는 **줄 밑에 매달린다** — 위 테두리를 지우고 위쪽 모서리를 각지게
   * 두어 눌린 줄과 한 덩어리로 보이게 한 것이다. 캐릭터 한 장짜리 화면
   * (`#/journal/<파티>/<캐릭터>`)에서는 매달릴 줄이 없으므로 **제 테두리를 갖고
   * 폭을 스스로 잡아야 한다.** 그러지 않으면 위가 뚫린 채 화면 끝까지 펼쳐진다.
   */
  standalone?: boolean
}

/**
 * 캐릭터 시트.
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ **내 것만 고친다. 남의 것은 보기만 한다**(SPEC 6장).                      │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * 실물 시트에서 **이름·클래스·레벨·경험·골드·아이템·퍽·체크마크·메모**를 옮겼다.
 * 파티 기록지와 마찬가지로 시트 그림을 깔지 않고 우리 결로 다시 그린다 — 종이
 * 비율에 갇히면 폰에서 못 쓰고, 시트에 박힌 영문 라벨이 한국어 화면과 겉돈다.
 *
 * **규칙을 판정하지 않는다.** 레벨을 대신 올려주지 않고 퍽을 자동으로 켜지도
 * 않는다. 경험이 다음 눈금에 닿으면 "올릴 때가 되었다"고 말할 뿐이고 누르는 것은
 * 사람이다 — 레벨업은 퍽을 고르고 능력 카드를 바꾸는 일이라 실물에서도 멈춰서
 * 한다.
 *
 * **퍽은 번호만 켠다.** 클래스별 퍽 표는 게임 콘텐츠라 우리가 갖고 있지 않다
 * (SPEC 3장). 사람이 제 시트를 보고 몇 번째 줄인지 짚는다.
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ **클래스는 여기서 못 바꾼다. 캐릭터를 세울 때 정하는 것이다.**             │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * 캐릭터가 곧 클래스다 — 바위심장이 도끼투척수로 바뀌는 일은 없고, 그러고 싶으면
 * 거두고 새로 세운다. 레벨·경험·퍽·아이템이 전부 그 클래스에 매인 값이라 클래스만
 * 갈아 끼우면 **남은 값들이 통째로 거짓이 된다.**
 *
 * **막는 것은 서버다**(`0014_lock_character_class.sql`). 화면에서 칸을 안 내는
 * 것은 헛손질을 줄이는 것일 뿐이다(구현 결정 44와 같은 결).
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ **열람이 기본이고, 고치려면 편집으로 들어간다.**                          │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * 2026-08-12까지는 칸을 건드리는 즉시 서버로 갔다. 다이얼로 골드를 120에서
 * 340으로 옮기면 그 사이 스물두 번이 나가고 `version`이 스물두 번 오른다 —
 * **낙관적 잠금이 손가락 수만큼 무의미해진다.** 게다가 시트를 그냥 들여다보는
 * 동안에도 모든 칸이 눌려 있어 **스치기만 해도 값이 바뀌었다.**
 *
 * 이제 편집 모드에서 초안(`sheetDraft.ts`)을 고치고 **저장을 누를 때 한 번**
 * 보낸다. 저장 단추는 실제로 바뀐 것이 있을 때만 살아난다. 정산은 여러 칸을
 * 함께 고치는 일이라(골드·경험·체크마크·아이템이 한꺼번에 움직인다) 실물에서도
 * 지우개로 다 고친 다음 덮는다.
 *
 * **바뀐 칸만 보낸다.** 통째로 보내면 안 건드린 칸까지 덮어 그 사이 남이 고친
 * 것을 되돌린다.
 *
 * **부르는 쪽이 `key`로 다시 태운다.** 초안을 이펙트로 맞추면 남이 고친 값이
 * 치고 있는 글자를 덮어쓴다.
 */
export function CharacterSheet({
  character,
  mine,
  offline = false,
  standalone = false,
  onEdit,
  onRemove,
}: Props) {
  const nameId = useId()
  const noteId = useId()

  /** 고칠 수 있는 사람인가. 남의 것과 오프라인은 편집으로 들어갈 수조차 없다. */
  const canEdit = mine && !offline

  const [wantsEdit, setWantsEdit] = useState(false)
  const [draft, setDraft] = useState<SheetDraft>(() => draftOf(character))
  const [newItem, setNewItem] = useState('')
  /** 무엇을 물으려고 팝업을 띄웠는가. */
  const [asking, setAsking] = useState<'discard' | 'remove' | null>(null)

  /**
   * 화면에 그리는 값.
   *
   * **편집 중이면 초안, 아니면 레코드다.** 열람 중에 초안을 그리면 남이 고친 값이
   * 들어와도 화면이 옛것을 붙들고 있다 — 초안은 편집으로 들어갈 때 새로 뜬다.
   */
  /**
   * 지금 편집 중인가.
   *
   * **고칠 수 없게 되면 그 자리에서 내려온다.** 편집 중에 서버가 끊기면 칸이
   * 열린 채로 남는데, 저장은 어차피 안 나간다 — 열려 있는 것처럼 보이는 화면이
   * 잠긴 화면보다 나쁘다.
   */
  const editing = wantsEdit && canEdit

  const shown: SheetDraft = editing ? draft : draftOf(character)
  const dirty = editing && isDirty(character, draft)

  function set<K extends keyof SheetDraft>(key: K, value: SheetDraft[K]) {
    setDraft((d) => ({ ...d, [key]: value }))
  }

  function startEditing() {
    setDraft(draftOf(character))
    setNewItem('')
    setWantsEdit(true)
  }

  function stopEditing() {
    setWantsEdit(false)
    setNewItem('')
    setAsking(null)
  }

  function save() {
    const edits = sheetDiff(character, draft)
    // 바뀐 것이 없으면 보내지 않는다. 빈 갱신도 `version`을 올린다.
    if (Object.keys(edits).length > 0) onEdit(edits)
    stopEditing()
  }

  const reached = levelForXp(shown.xp)
  const toNext = xpToNextLevel(shown.xp)
  const ready = levelUpReady(shown.level, shown.xp)
  const slots = perkSlotCount(shown.level, shown.checkmarks)
  const earned = perksEarned(shown.level, shown.checkmarks)
  // 클래스는 초안에 없다 — 바뀔 수 없으므로 레코드에서 그대로 읽는다.
  const iconUrl = classIconUrl(character.classIcon)

  /**
   * 클래스 수치. 관리자가 넣어 두었으면 이름·핸드 사이즈·최대 체력이 온다.
   *
   * **없어도 화면은 그대로 돈다** — 넣기 전에는 아이콘만 보이던 종전 모습이다.
   * 값이 레포에 없고 DB에만 있으므로(절대 원칙 1) 이쪽이 기본 상태다.
   */
  const classes = useClassStore((s) => s.list)
  const loadClasses = useClassStore((s) => s.load)
  useEffect(() => {
    void loadClasses()
  }, [loadClasses])
  const info = classInfoOf(classes, character.classId, character.classIcon)
  const maxHp = maxHpFor(info, shown.level)

  /**
   * 이 클래스의 특혜 줄과 각 줄이 시작하는 상자 번호.
   *
   * **번호는 줄의 차례에서 나온다**(`perkBoxes`) — 캐릭터가 켜 둔 값은 지금까지도
   * 상자 번호였으므로 표가 들어와도 그대로 맞물린다.
   */
  const perkTable = useClassStore((s) => s.perks)
  const rows = perkRowsOf(info === null ? [] : (perkTable[info.id] ?? []))

  function addItem() {
    const value = newItem.trim()
    if (value === '') return
    set('items', [...draft.items, value])
    setNewItem('')
  }

  return (
    <div
      className={[
        'char',
        standalone ? 'char--solo' : '',
        // 은퇴는 초안이 아니라 **저장된 사실**로 흐린다 — 편집 중에 껐다 켰다 할
        // 때마다 시트 전체가 흐려졌다 밝아지면 눈이 어지럽다.
        character.retired ? 'char--retired' : '',
        editing ? 'char--editing' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {/* ------------------------------------------------------------------
          이름과 클래스 표식
          ------------------------------------------------------------------ */}
      <div className="char__head">
        <div className="char__badge" aria-hidden={iconUrl === null}>
          {iconUrl ? (
            <img src={iconUrl} alt={`클래스 표식 ${character.classIcon}번`} draggable={false} />
          ) : (
            <span className="char__badge-empty" aria-hidden="true">
              ?
            </span>
          )}
        </div>

        <div className="char__names">
          <label className="sheet__label" htmlFor={nameId}>
            이름
          </label>
          <input
            id={nameId}
            className="sheet__input"
            value={shown.name}
            placeholder="이름을 짓는다"
            disabled={!editing}
            onChange={(e) => set('name', e.target.value)}
          />
          <p className="char__owner">
            {character.ownerName || '이름 없음'}의 캐릭터
            {info && (
              <>
                {' · '}
                <span className="char__class">{info.name}</span>
                {info.handSize > 0 && (
                  <>
                    {' · '}손 <span className="sl-numeral">{info.handSize}</span>장
                  </>
                )}
              </>
            )}
          </p>
        </div>
      </div>

      {/* ------------------------------------------------------------------
          레벨 — 실물 시트의 1~9 눈금
          ------------------------------------------------------------------ */}
      <section className="sheet__block">
        <h3 className="sheet__label">레벨</h3>
        <div className="char__levels" role="radiogroup" aria-label="레벨">
          {XP_THRESHOLDS.map((threshold, index) => {
            const level = index + 1
            const on = level === shown.level
            return (
              <button
                key={level}
                type="button"
                role="radio"
                aria-checked={on}
                aria-label={`레벨 ${level} — 경험 ${threshold}`}
                className={[
                  'char__level',
                  on ? 'char__level--on' : '',
                  // 경험이 닿았는데 아직 안 고른 눈금은 표를 내 둔다.
                  !on && level <= reached ? 'char__level--reached' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                disabled={!editing}
                onClick={() => set('level', level)}
              >
                <span className="char__level-n sl-numeral" aria-hidden="true">
                  {level}
                </span>
                <span className="char__level-xp sl-numeral" aria-hidden="true">
                  {threshold}
                </span>
              </button>
            )
          })}
        </div>

        {/*
          **올려주지 않고 알리기만 한다.** 레벨업은 퍽을 고르고 능력 카드를 바꾸는
          일이라 실물에서도 사람이 멈춰서 한다.
        */}
        {/*
          최대 체력은 **읽어주기만 한다.** 규칙을 판정하지 않는다는 선은 그대로다 —
          피해를 깎지도, 상한을 강제하지도 않는다.

          클래스 수치를 안 넣었으면 아예 뜨지 않는다. **모르면 모른다고 한다** —
          짐작해서 숫자를 내면 사람이 그것을 믿는다.
        */}
        {maxHp !== null && (
          <p className="char__maxhp">
            이 레벨의 최대 체력 <strong className="sl-numeral">{maxHp}</strong>
          </p>
        )}

        {ready && mine && (
          <p className="char__ready" role="status">
            경험이 <strong className="sl-numeral">{reached}</strong> 레벨에 닿았다. 올릴 때가
            되었다.
          </p>
        )}
      </section>

      {/* ------------------------------------------------------------------
          경험과 골드 — 다이얼
          ------------------------------------------------------------------ */}
      <div className="char__dials">
        <Dial
          label="경험"
          value={shown.xp}
          disabled={!editing}
          steps={[1, 5]}
          onChange={(next) => set('xp', next)}
          foot={toNext === null ? '끝' : `다음까지 ${toNext}`}
        />
        <Dial
          label="골드"
          value={shown.gold}
          disabled={!editing}
          steps={[1, 10]}
          onChange={(next) => set('gold', next)}
        />
      </div>

      {/* ------------------------------------------------------------------
          체크마크 — 셋마다 퍽 하나
          ------------------------------------------------------------------ */}
      <section className="sheet__block">
        <h3 className="sheet__label">
          전투 목표
          <span className="char__hint"> — 셋마다 퍽 하나</span>
        </h3>
        <div className="char__checks">
          {Array.from({ length: MAX_CHECKMARKS }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              type="button"
              aria-label={`체크마크 ${n}개까지`}
              aria-pressed={n <= shown.checkmarks}
              /* 묶음은 격자가 낸다 — 한 줄에 셋이므로 줄 하나가 곧 한 묶음이다. */
              className={`char__check${n <= shown.checkmarks ? ' char__check--on' : ''}`}
              disabled={!editing}
              /* 켜진 마지막 칸을 다시 누르면 하나 줄인다 — 잘못 짚었을 때의 길이다. */
              onClick={() => set('checkmarks', n === shown.checkmarks ? n - 1 : n)}
            >
              <span aria-hidden="true">✓</span>
            </button>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------------------------
          퍽 — 표가 있으면 줄로, 없으면 번호로
          ------------------------------------------------------------------ */}
      <section className="sheet__block">
        <h3 className="sheet__label">
          퍽
          <span className="char__hint">
            {' '}
            — 얻은 것 <span className="sl-numeral">{earned}</span>, 켠 것{' '}
            <span className="sl-numeral">{shown.perks.length}</span>
          </span>
        </h3>

        {/*
          **표가 있으면 줄을 보여주고, 없으면 번호만 늘어놓는다.**

          특혜 글은 게임 콘텐츠라 레포에 없고 DB에만 있다(절대 원칙 1). 아무것도
          안 넣었으면 지금까지 그랬듯 번호를 켠다 — 없어도 앱은 완전히 돈다
          (절대 원칙 3). 어느 쪽이든 켜지는 값은 **같은 상자 번호**다.
        */}
        {rows.length > 0 ? (
          <>
            <p className="char__note">
              시트의 줄 그대로다. 상자를 켜면 공격 보정 덱이 그만큼 맞춰진다.
            </p>
            <ul className="char__perkrows">
              {rows.map(({ perk, first }) => (
                <li key={perk.id} className="char__perkrow">
                  <span className="char__perkboxes">
                    {Array.from({ length: perk.count }, (_, i) => first + i).map((slot) => {
                      const on = shown.perks.includes(slot)
                      return (
                        <button
                          key={slot}
                          type="button"
                          aria-label={`${perk.text} — ${slot}번 상자`}
                          aria-pressed={on}
                          className={`char__perkbox${on ? ' char__perkbox--on' : ''}`}
                          disabled={!editing}
                          onClick={() => set('perks', togglePerk(shown.perks, slot))}
                        />
                      )
                    })}
                  </span>
                  <span className="char__perktext">{perk.text}</span>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <>
            <p className="char__note">
              퍽 표는 클래스마다 다르고 우리가 갖고 있지 않다. 제 시트에서 몇 번째 줄인지 보고 그
              번호를 켠다.
            </p>
            <div className="char__perks">
              {Array.from({ length: slots }, (_, i) => i + 1).map((slot) => {
                const on = shown.perks.includes(slot)
                return (
                  <button
                    key={slot}
                    type="button"
                    aria-label={`퍽 ${slot}번`}
                    aria-pressed={on}
                    className={`char__perk${on ? ' char__perk--on' : ''}`}
                    disabled={!editing}
                    onClick={() => set('perks', togglePerk(shown.perks, slot))}
                  >
                    <span className="sl-numeral" aria-hidden="true">
                      {slot}
                    </span>
                  </button>
                )
              })}
            </div>
          </>
        )}
      </section>

      {/* ------------------------------------------------------------------
          공격 보정 덱 — 켠 특혜에서 나온 구성
          ------------------------------------------------------------------
          **판은 읽지 않는다.** 남은 장수·뽑힌 카드는 축 ②의 휘발성 런타임이라
          영속 기록지가 비출 것이 아니다(SPEC 5.2). 특혜 표가 없으면 아예 안
          나온다 — 그때는 구성의 정본이 위젯 설정이고 시트는 그것을 모른다.
          ------------------------------------------------------------------ */}
      <DeckPreview perks={rows.map((r) => r.perk)} checked={shown.perks} />

      {/* ------------------------------------------------------------------
          아이템 — 사용자가 적는다(구현 결정 2)
          ------------------------------------------------------------------ */}
      <section className="sheet__block">
        <h3 className="sheet__label">아이템</h3>

        {shown.items.length > 0 && (
          <ul className="sheet__achievements">
            {shown.items.map((item, index) => (
              <li key={`${index}-${item}`}>
                <span>{item}</span>
                {/* 지우는 단추는 편집 중에만 낸다. 열람 화면에 ×가 늘어서 있으면
                    누를 수 있는 줄 알고 손이 간다. */}
                {editing && (
                  <button
                    type="button"
                    className="sheet__remove"
                    aria-label={`아이템 '${item}' 지우기`}
                    onClick={() =>
                      set(
                        'items',
                        draft.items.filter((_, i) => i !== index),
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

        {shown.items.length === 0 && !editing && <p className="char__note">아직 없다.</p>}

        {editing && (
          <div className="sheet__add">
            <input
              className="sheet__input"
              value={newItem}
              placeholder="아이템을 적는다"
              aria-label="새 아이템"
              onChange={(e) => setNewItem(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addItem()
                }
              }}
            />
            <button
              type="button"
              className="sheet__add-button"
              disabled={newItem.trim() === ''}
              onClick={addItem}
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
          rows={4}
          value={shown.notes}
          placeholder={editing ? '적어둘 것' : ''}
          disabled={!editing}
          onChange={(e) => set('notes', e.target.value)}
        />
      </section>

      {/*
        은퇴와 거두기.

        **은퇴는 접어두는 것이고 거두기는 없애는 것이다** — 은퇴한 캐릭터도 파티
        기록의 일부라 기본은 접어두는 쪽이다. 은퇴는 칸 하나이므로 초안에 담겨
        저장을 눌러야 남고, **거두기는 되돌릴 수 없어 그 자리에서 나간다.**
      */}
      {editing && (
        <div className="char__actions">
          <button
            type="button"
            className="char__retire"
            aria-pressed={shown.retired}
            onClick={() => set('retired', !shown.retired)}
          >
            {shown.retired ? '다시 나선다' : '은퇴시킨다'}
          </button>
          <button type="button" className="char__remove" onClick={() => setAsking('remove')}>
            거둔다
          </button>
        </div>
      )}

      {/*
        ┌────────────────────────────────────────────────────────────────────┐
        │ **띠는 아래에 붙어 따라온다.** 시트가 길어 끝까지 내려야 하면        │
        │ 저장을 잊는다.                                                      │
        └────────────────────────────────────────────────────────────────────┘

        열람 중에는 편집으로 들어가는 문 하나뿐이다. 남의 시트이거나 서버에
        못 닿는 중이면 그 문도 없다 — **왜 없는지 대신 적는다.**
      */}
      <div className="char__bar">
        {!editing ? (
          canEdit ? (
            <button type="button" className="char__edit" onClick={startEditing}>
              고치기
            </button>
          ) : (
            <p className="char__locked">
              {!mine ? '남의 시트라 보기만 한다.' : '서버에 닿지 못해 지금은 고칠 수 없다.'}
            </p>
          )
        ) : (
          <>
            <button
              type="button"
              className="char__cancel"
              /* 고친 것이 있으면 한 번 묻는다. 없으면 버릴 것도 없다. */
              onClick={() => (dirty ? setAsking('discard') : stopEditing())}
            >
              그만두기
            </button>
            <button type="button" className="char__save" disabled={!dirty} onClick={save}>
              {dirty ? '저장' : '고친 것 없음'}
            </button>
          </>
        )}
      </div>

      {asking === 'discard' && (
        <ConfirmDialog
          title="고치던 것을 버립니까?"
          description="저장하지 않은 것은 되돌아오지 않는다."
          confirmLabel="버린다"
          /*
            **뜸을 짧게 잡는다.** 기본 5초는 몇 시간짜리 판이 날아가는 자리에
            맞춘 값이다(구현 결정 36). 여기서 잃는 것은 방금 고친 몇 칸이므로
            손이 멎을 만큼만 두면 된다 — 5초를 그대로 쓰면 그만두는 일이 벌처럼
            느껴진다.
          */
          delayMs={1500}
          onConfirm={stopEditing}
          onCancel={() => setAsking(null)}
        />
      )}

      {asking === 'remove' && (
        <ConfirmDialog
          title={`'${character.name || '이름 없음'}'을 거둡니까?`}
          description="레벨·경험·골드·아이템·특혜가 모두 사라진다. 되돌릴 수 없다."
          confirmLabel="거둔다"
          onConfirm={() => {
            setAsking(null)
            onRemove()
          }}
          onCancel={() => setAsking(null)}
        />
      )}
    </div>
  )
}

/* --------------------------------------------------------------------------
   다이얼 — 경험과 골드
   --------------------------------------------------------------------------
   실물에서 지우개로 고치던 자리다. 정산 뒤에 큰 폭으로 움직이므로 **단위를 둘
   두었다** — 골드는 열씩, 경험은 다섯씩. 하나씩만 있으면 백 단위를 옮기는 데
   손가락이 스무 번 간다.
   -------------------------------------------------------------------------- */

interface DialProps {
  label: string
  value: number
  steps: [number, number]
  disabled: boolean
  onChange: (next: number) => void
  foot?: string
}

function Dial({ label, value, steps, disabled, onChange, foot }: DialProps) {
  const id = useId()
  const [big, small] = [steps[1], steps[0]]

  return (
    <section className="dial">
      <label className="sheet__label" htmlFor={id}>
        {label}
      </label>

      <div className="dial__row">
        <button
          type="button"
          className="dial__step dial__step--big"
          aria-label={`${label} ${big} 내리기`}
          disabled={disabled}
          onClick={() => onChange(value - big)}
        >
          <span className="sl-numeral" aria-hidden="true">
            −{big}
          </span>
        </button>
        <button
          type="button"
          className="dial__step"
          aria-label={`${label} ${small} 내리기`}
          disabled={disabled}
          onClick={() => onChange(value - small)}
        >
          <span aria-hidden="true">−</span>
        </button>

        <input
          id={id}
          className="dial__value sl-numeral"
          type="number"
          inputMode="numeric"
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(Number(e.target.value))}
        />

        <button
          type="button"
          className="dial__step"
          aria-label={`${label} ${small} 올리기`}
          disabled={disabled}
          onClick={() => onChange(value + small)}
        >
          <span aria-hidden="true">+</span>
        </button>
        <button
          type="button"
          className="dial__step dial__step--big"
          aria-label={`${label} ${big} 올리기`}
          disabled={disabled}
          onClick={() => onChange(value + big)}
        >
          <span className="sl-numeral" aria-hidden="true">
            +{big}
          </span>
        </button>
      </div>

      {foot && <p className="dial__foot sl-numeral">{foot}</p>}
    </section>
  )
}
