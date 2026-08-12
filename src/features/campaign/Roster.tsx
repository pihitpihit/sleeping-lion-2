import { useEffect, useState } from 'react'
import type { Identity } from '../net/types'
import { classIconUrl, levelForXp } from './character'
import { CharacterSheet } from './CharacterSheet'
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
  const error = useCharacterStore((s) => s.error)
  const load = useCharacterStore((s) => s.load)
  const edit = useCharacterStore((s) => s.edit)
  const remove = useCharacterStore((s) => s.remove)

  const [openId, setOpenId] = useState<string | null>(null)
  const [showRetired, setShowRetired] = useState(false)

  useEffect(() => {
    void load(campaignId)
  }, [campaignId, load])

  const locked = readOnly || offline

  const active = characters.filter((c) => !c.retired)
  const retired = characters.filter((c) => c.retired)
  const shown = showRetired ? [...active, ...retired] : active

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
        ┌──────────────────────────────────────────────────────────────────┐
        │ **여기서는 캐릭터를 세우지 않는다.**                              │
        └──────────────────────────────────────────────────────────────────┘

        캐릭터가 먼저 서고 파티에는 나중에 든다(2026-08-12) — 세우는 자리는
        일지 하나뿐이고, 파티에 드는 것은 캐릭터 화면에서 한다. **창구를 둘로
        두면 어긋난다.**
      */}
      {!locked && (
        <p className="roster__hint">
          캐릭터는 <a href="#/journal">일지</a>에서 세우고, 그 캐릭터 화면에서 이 파티에 넣는다.
        </p>
      )}
    </section>
  )
}
