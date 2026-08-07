import { useId, useState } from 'react'
import {
  MAX_CHECKMARKS,
  XP_THRESHOLDS,
  clampGold,
  clampLevel,
  clampXp,
  classIconUrl,
  levelForXp,
  levelUpReady,
  perkSlotCount,
  perksEarned,
  togglePerk,
  xpToNextLevel,
} from './character'
import { ClassPicker } from './ClassPicker'
import type { Character, CharacterEdits } from './types'

interface Props {
  character: Character
  /** 내 것인가. 남의 것은 읽기 전용이다(SPEC 6장). */
  mine: boolean
  /** 서버에 못 닿는 중. 내 것이어도 잠근다. */
  offline?: boolean
  onEdit: (edits: CharacterEdits) => void
  onRemove: () => void
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
 * 글자 칸은 **손을 뗄 때 저장한다**(`onBlur`). 한 자 칠 때마다 보내면 `version`이
 * 타이핑 수만큼 오르고 낙관적 잠금이 그 순간 무의미해진다.
 *
 * **부르는 쪽이 `key`로 다시 태운다.** 초안을 이펙트로 맞추면 남이 고친 값이
 * 치고 있는 글자를 덮어쓴다.
 */
export function CharacterSheet({ character, mine, offline = false, onEdit, onRemove }: Props) {
  const nameId = useId()
  const noteId = useId()

  const locked = !mine || offline

  const [draft, setDraft] = useState({ name: character.name, notes: character.notes })
  const [newItem, setNewItem] = useState('')

  const reached = levelForXp(character.xp)
  const toNext = xpToNextLevel(character.xp)
  const ready = levelUpReady(character.level, character.xp)
  const slots = perkSlotCount(character.level, character.checkmarks)
  const earned = perksEarned(character.level, character.checkmarks)
  const iconUrl = classIconUrl(character.classIcon)

  function commit(field: 'name' | 'notes') {
    if (draft[field] === character[field]) return
    onEdit({ [field]: draft[field] })
  }

  function addItem() {
    const value = newItem.trim()
    if (value === '') return
    onEdit({ items: [...character.items, value] })
    setNewItem('')
  }

  return (
    <div className={`char${character.retired ? ' char--retired' : ''}`}>
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
            value={draft.name}
            placeholder="이름을 짓는다"
            disabled={locked}
            onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
            onBlur={() => commit('name')}
          />
          <p className="char__owner">{character.ownerName || '이름 없음'}의 캐릭터</p>
        </div>
      </div>

      {mine && (
        <section className="sheet__block">
          <h3 className="sheet__label">클래스 표식</h3>
          <ClassPicker
            value={character.classIcon}
            disabled={locked}
            onChange={(index) => onEdit({ classIcon: index })}
          />
        </section>
      )}

      {/* ------------------------------------------------------------------
          레벨 — 실물 시트의 1~9 눈금
          ------------------------------------------------------------------ */}
      <section className="sheet__block">
        <h3 className="sheet__label">레벨</h3>
        <div className="char__levels" role="radiogroup" aria-label="레벨">
          {XP_THRESHOLDS.map((threshold, index) => {
            const level = index + 1
            const on = level === character.level
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
                disabled={locked}
                onClick={() => onEdit({ level: clampLevel(level) })}
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
          value={character.xp}
          disabled={locked}
          steps={[1, 5]}
          onChange={(next) => onEdit({ xp: clampXp(next) })}
          foot={toNext === null ? '끝' : `다음까지 ${toNext}`}
        />
        <Dial
          label="골드"
          value={character.gold}
          disabled={locked}
          steps={[1, 10]}
          onChange={(next) => onEdit({ gold: clampGold(next) })}
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
              aria-pressed={n <= character.checkmarks}
              className={[
                'char__check',
                n <= character.checkmarks ? 'char__check--on' : '',
                // 세 칸마다 사이를 벌려 실물의 묶음이 그대로 보이게 한다.
                n % 3 === 0 ? 'char__check--last' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              disabled={locked}
              /* 켜진 마지막 칸을 다시 누르면 하나 줄인다 — 잘못 짚었을 때의 길이다. */
              onClick={() => onEdit({ checkmarks: n === character.checkmarks ? n - 1 : n })}
            >
              <span aria-hidden="true">✓</span>
            </button>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------------------------
          퍽 — 번호만 켠다
          ------------------------------------------------------------------ */}
      <section className="sheet__block">
        <h3 className="sheet__label">
          퍽
          <span className="char__hint">
            {' '}
            — 얻은 것 <span className="sl-numeral">{earned}</span>, 켠 것{' '}
            <span className="sl-numeral">{character.perks.length}</span>
          </span>
        </h3>
        <p className="char__note">
          퍽 표는 클래스마다 다르고 우리가 갖고 있지 않다. 제 시트에서 몇 번째 줄인지 보고 그 번호를
          켠다.
        </p>
        <div className="char__perks">
          {Array.from({ length: slots }, (_, i) => i + 1).map((slot) => {
            const on = character.perks.includes(slot)
            return (
              <button
                key={slot}
                type="button"
                aria-label={`퍽 ${slot}번`}
                aria-pressed={on}
                className={`char__perk${on ? ' char__perk--on' : ''}`}
                disabled={locked}
                onClick={() => onEdit({ perks: togglePerk(character.perks, slot) })}
              >
                <span className="sl-numeral" aria-hidden="true">
                  {slot}
                </span>
              </button>
            )
          })}
        </div>
      </section>

      {/* ------------------------------------------------------------------
          아이템 — 사용자가 적는다(구현 결정 2)
          ------------------------------------------------------------------ */}
      <section className="sheet__block">
        <h3 className="sheet__label">아이템</h3>

        {character.items.length > 0 && (
          <ul className="sheet__achievements">
            {character.items.map((item, index) => (
              <li key={`${index}-${item}`}>
                <span>{item}</span>
                <button
                  type="button"
                  className="sheet__remove"
                  aria-label={`아이템 '${item}' 지우기`}
                  disabled={locked}
                  onClick={() => onEdit({ items: character.items.filter((_, i) => i !== index) })}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}

        {!locked && (
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
          value={draft.notes}
          placeholder="적어둘 것"
          disabled={locked}
          onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))}
          onBlur={() => commit('notes')}
        />
      </section>

      {/*
        은퇴와 거두기를 나란히 둔다. **은퇴는 접어두는 것이고 거두기는 없애는
        것이다** — 은퇴한 캐릭터도 파티 기록의 일부라 기본은 접어두는 쪽이다.
      */}
      {mine && !offline && (
        <div className="char__actions">
          <button
            type="button"
            className="char__retire"
            onClick={() => onEdit({ retired: !character.retired })}
          >
            {character.retired ? '다시 나선다' : '은퇴시킨다'}
          </button>
          <button
            type="button"
            className="char__remove"
            onClick={() => {
              if (!window.confirm(`'${character.name || '이름 없음'}'을 거두시겠습니까?`)) return
              onRemove()
            }}
          >
            거둔다
          </button>
        </div>
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
