import { useEffect, useState } from 'react'
import type { Identity } from '../net/types'
import { classIconUrl, levelForXp } from './character'
import { CharacterSheet } from './CharacterSheet'
import { ClassPicker } from './ClassPicker'
import { useCharacterStore } from './characterStore'

interface Props {
  campaignId: string
  me: Identity
  /** 서버에 못 닿는 중. 기록지와 같은 이유로 잠근다. */
  readOnly?: boolean
}

/**
 * 무리 — 이 기록지에 딸린 캐릭터들.
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ **다 보이되, 고치는 것은 제 것만**(SPEC 6장).                             │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * 줄만 늘어놓고 누르면 그 자리에서 펼친다. 화면을 따로 두지 않은 이유는 정산할
 * 때 **여럿을 번갈아 보기 때문**이다 — 넷이 앉아 골드를 나누는 자리에서 화면을
 * 오갈 일이 아니다.
 *
 * 한 번에 하나만 펼친다. 여럿을 펼치면 폰에서 스크롤이 길어져 어느 것을 보고
 * 있는지 알 수 없다.
 *
 * **은퇴한 캐릭터는 접어 둔다.** 지우지 않은 것은 파티 기록의 일부이기 때문이고,
 * 목록 맨 앞을 차지하지 않는 것은 지금 쓰는 것이 아니기 때문이다.
 */
export function Roster({ campaignId, me, readOnly = false }: Props) {
  const characters = useCharacterStore((s) => s.characters)
  const loaded = useCharacterStore((s) => s.loaded)
  const offline = useCharacterStore((s) => s.offline)
  const busy = useCharacterStore((s) => s.busy)
  const error = useCharacterStore((s) => s.error)
  const load = useCharacterStore((s) => s.load)
  const add = useCharacterStore((s) => s.add)
  const edit = useCharacterStore((s) => s.edit)
  const remove = useCharacterStore((s) => s.remove)

  const [openId, setOpenId] = useState<string | null>(null)
  const [making, setMaking] = useState(false)
  const [newName, setNewName] = useState('')
  const [newIcon, setNewIcon] = useState(0)
  const [newClassId, setNewClassId] = useState<string | null>(null)
  const [showRetired, setShowRetired] = useState(false)

  useEffect(() => {
    void load(campaignId)
  }, [campaignId, load])

  const locked = readOnly || offline

  const active = characters.filter((c) => !c.retired)
  const retired = characters.filter((c) => c.retired)
  const shown = showRetired ? [...active, ...retired] : active

  async function onCreate() {
    await add(campaignId, me.userId, newName, newIcon, newClassId)
    setNewName('')
    setNewIcon(0)
    setNewClassId(null)
    setMaking(false)
  }

  return (
    <section className="sheet__block roster">
      <h2 className="sheet__label">캐릭터</h2>

      {error !== null && (
        <p className="crew__error" role="alert">
          {error}
        </p>
      )}

      {loaded && characters.length === 0 && <p className="roster__empty">아직 아무도 없다.</p>}

      <ul className="roster__list">
        {shown.map((character) => {
          const open = character.id === openId
          const mine = character.ownerId === me.userId
          const iconUrl = classIconUrl(character.classIcon)
          return (
            <li key={character.id} className={character.retired ? 'roster__row--retired' : ''}>
              <button
                type="button"
                className={`roster__row${open ? ' roster__row--open' : ''}`}
                aria-expanded={open}
                onClick={() => setOpenId(open ? null : character.id)}
              >
                <span className="roster__badge">
                  {iconUrl ? (
                    <img src={iconUrl} alt="" draggable={false} />
                  ) : (
                    <span aria-hidden="true">?</span>
                  )}
                </span>

                <span className="roster__name">
                  {character.name || '이름 없음'}
                  {mine && <span className="crew__me"> (나)</span>}
                </span>

                <span className="roster__stats">
                  {/* 레벨은 경험치에서 나온다 — 표에 옛 값이 남아 있어도 여기서
                      다시 뽑으므로 시트와 같은 수를 말한다. */}
                  <span className="sl-numeral" aria-label={`레벨 ${levelForXp(character.xp)}`}>
                    L{levelForXp(character.xp)}
                  </span>
                  <span className="sl-numeral" aria-label={`경험 ${character.xp}`}>
                    {character.xp}xp
                  </span>
                  <span className="sl-numeral" aria-label={`골드 ${character.gold}`}>
                    {character.gold}g
                  </span>
                </span>
              </button>

              {open && (
                <CharacterSheet
                  /*
                    **`key`로 다시 태운다.** 초안을 이펙트로 맞추면 남이 고친 값이
                    치고 있는 글자를 덮어쓴다 — 파티 기록지와 같은 이유다.
                  */
                  key={character.id}
                  character={character}
                  mine={mine}
                  offline={locked}
                  onEdit={(edits) => void edit(character.id, edits)}
                  onRemove={() => {
                    void remove(character.id)
                    setOpenId(null)
                  }}
                />
              )}
            </li>
          )
        })}
      </ul>

      {retired.length > 0 && (
        <button type="button" className="roster__toggle" onClick={() => setShowRetired((v) => !v)}>
          은퇴한 <span className="sl-numeral">{retired.length}</span>명{' '}
          {showRetired ? '접기' : '펴기'}
        </button>
      )}

      {/*
        **세우는 자리에서 클래스를 먼저 고른다.** 나중에 고쳐도 되지만, 봉투를
        막 뜯은 자리라 그림이 손에 있다.
      */}
      {!locked &&
        (making ? (
          <div className="roster__new">
            <input
              className="sheet__input"
              value={newName}
              placeholder="캐릭터 이름"
              aria-label="새 캐릭터 이름"
              maxLength={40}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  void onCreate()
                }
              }}
            />
            <ClassPicker
              classId={newClassId}
              icon={newIcon}
              onChange={(next) => {
                setNewClassId(next.classId)
                setNewIcon(next.icon)
              }}
            />
            <div className="roster__new-actions">
              <button
                type="button"
                className="sheet__add-button"
                disabled={busy || newName.trim() === ''}
                onClick={() => void onCreate()}
              >
                세우기
              </button>
              <button
                type="button"
                className="roster__cancel"
                onClick={() => {
                  setMaking(false)
                  setNewName('')
                  setNewIcon(0)
                  setNewClassId(null)
                }}
              >
                그만
              </button>
            </div>
          </div>
        ) : (
          <button type="button" className="roster__add" onClick={() => setMaking(true)}>
            캐릭터를 세운다
          </button>
        ))}
    </section>
  )
}
