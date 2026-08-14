import { useEffect, useState } from 'react'
import type { Identity } from '../net/types'
import { classIconUrl, levelForXp } from './character'
import { useCharacterStore } from './characterStore'
import { LevelBadge } from './LevelBadge'

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
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ **여기서는 펼치지도 고치지도 않는다 — 줄을 누르면 그 캐릭터로 간다.**     │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * 처음에는 줄을 누르면 그 자리에서 시트가 펼쳐지고 제 것이면 고칠 수도 있었다.
 * 형님이 걷었다 — 캐릭터에는 **제 주소가 있고**(`#/character/<id>`) 시트는 거기
 * 한 장이면 된다. 같은 시트를 두 자리에서 열면 어느 쪽에서 고쳤는지 흐려지고,
 * 무엇보다 **파티 기록지가 캐릭터 편집기까지 겸하게 된다.**
 *
 * 여기 남는 것은 **누가 몇 레벨인지** 한눈에 보는 몫이다. 무엇까지 보일지는
 * 다시 이야기하기로 했다.
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
          const mine = character.ownerId === me.userId
          const iconUrl = classIconUrl(character.classIcon)
          return (
            <li key={character.id} className={character.retired ? 'roster__row--retired' : ''}>
              {/* 줄은 그 캐릭터로 가는 문이다 — 시트는 제 주소에 한 장뿐이다. */}
              <a className="roster__row" href={`#/character/${character.id}`}>
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

                {/* 레벨은 경험치에서 나온다 — 표에 옛 값이 남아 있어도 여기서
                    다시 뽑으므로 시트와 같은 수를 말한다. */}
                <span className="roster__level">
                  <LevelBadge level={levelForXp(character.xp)} />
                </span>
              </a>
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
          캐릭터는 <a href="#/journal">일지</a>에서 생성하고, 그 캐릭터 화면에서 이 파티에 넣는다.
        </p>
      )}
    </section>
  )
}
