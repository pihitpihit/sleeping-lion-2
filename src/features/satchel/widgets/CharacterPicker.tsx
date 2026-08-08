import { useEffect } from 'react'
import { classIconUrl } from '../../campaign/character'
import { useRosterStore } from '../roster'
import './CharacterPicker.css'

interface Props {
  value: string | null
  onChange: (characterId: string | null) => void
}

/**
 * 이 위젯이 누구 것인지 고른다.
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ **고르면 파티원과 값이 한 자리에 모인다. 안 골라도 도구는 돈다.**         │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * 위젯 인스턴스 id는 기기마다 다르므로, 그것을 열쇠로 쓰면 넷이 앉아도 아무것도
 * 겹치지 않는다. 캐릭터를 고르면 모두가 같은 열쇠를 본다.
 *
 * **이름 대신 아이콘도 함께 보인다.** 클래스 이름은 담지 않으므로(구현 결정 40)
 * 그림으로 알아본다. 이름은 사람이 지은 것이라 그대로 쓴다.
 */
export function CharacterPicker({ value, onChange }: Props) {
  const entries = useRosterStore((s) => s.entries)
  const loaded = useRosterStore((s) => s.loaded)
  const load = useRosterStore((s) => s.load)

  useEffect(() => {
    void load()
  }, [load])

  return (
    <div className="charpick">
      <p className="charpick__lead">
        캐릭터를 고르면 <strong>전투에 앉았을 때 파티원과 값이 이어진다.</strong> 안 골라도 쓸 수
        있다 — 그때는 이 기기 안에서만 센다.
      </p>

      {loaded && entries.length === 0 && (
        <p className="charpick__empty">
          고를 캐릭터가 없다. <a href="#/journal">일지</a>에서 만들 수 있다.
        </p>
      )}

      {entries.length > 0 && (
        <ul className="charpick__list">
          <li>
            <button
              type="button"
              className={`charpick__row${value === null ? ' charpick__row--on' : ''}`}
              aria-pressed={value === null}
              onClick={() => onChange(null)}
            >
              <span className="charpick__badge charpick__badge--none" aria-hidden="true">
                —
              </span>
              <span className="charpick__name">고르지 않음</span>
            </button>
          </li>

          {entries.map((entry) => {
            const on = entry.id === value
            const iconUrl = classIconUrl(entry.classIcon)
            return (
              <li key={entry.id}>
                <button
                  type="button"
                  className={`charpick__row${on ? ' charpick__row--on' : ''}`}
                  aria-pressed={on}
                  onClick={() => onChange(on ? null : entry.id)}
                >
                  <span className="charpick__badge">
                    {iconUrl ? (
                      <img src={iconUrl} alt="" draggable={false} />
                    ) : (
                      <span aria-hidden="true">?</span>
                    )}
                  </span>
                  <span className="charpick__name">{entry.name || '이름 없음'}</span>
                  <span className="charpick__owner">{entry.ownerName}</span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
