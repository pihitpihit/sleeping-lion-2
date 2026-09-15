import { useEffect } from 'react'
import { classIconUrl } from '../../campaign/character'
import { useRosterStore } from '../roster'
import './CharacterPicker.css'

interface Props {
  value: string | null
  onChange: (characterId: string | null) => void
  /**
   * 줄 오른쪽에 곁들일 값. 위젯마다 다르므로 **부르는 쪽이 정한다.**
   *
   * HP/XP 트래커는 최대 체력을 적고, 덱과 골드는 아무것도 안 적는다 — 여기다
   * 다 그리면 쓰지도 않는 위젯에 글자만 는다.
   */
  detailOf?: (characterId: string) => React.ReactNode
  /**
   * **고른 줄에만** 붙는 단추.
   *
   * ┌────────────────────────────────────────────────────────────────────────┐
   * │ **고르지 않은 줄에는 안 낸다**(형님이 정했다).                          │
   * └────────────────────────────────────────────────────────────────────────┘
   *
   * 줄마다 단추를 달면 스무 명이 늘어섰을 때 누를 것이 마흔 개가 된다 — 탭해서
   * 고른 다음 그 줄에서만 낸다. 고르는 것과 값을 앉히는 것은 다른 일이므로
   * 두 번 눌러야 하는 것이 맞다: **누르자마자 체력이 갈리면 잘못 눌렀을 때
   * 되돌릴 수가 없다.**
   */
  /** 줄 끝의 곁단추. **고른 줄인지도 함께 넘긴다** — 잠글지 말지는 부르는 쪽이 정한다. */
  actionOf?: (characterId: string, on: boolean) => React.ReactNode
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
export function CharacterPicker({ value, onChange, detailOf, actionOf }: Props) {
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
          <li className={`charpick__item${value === null ? ' charpick__item--on' : ''}`}>
            <button
              type="button"
              className="charpick__row"
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
            const detail = detailOf?.(entry.id)
            /*
              **단추를 단추 안에 넣을 수 없다**(HTML이 허락하지 않는다). 줄을
              `<li>`가 감싸고 그 안에 고르는 단추와 곁단추가 나란히 선다 —
              테두리는 `<li>`가 두르므로 여전히 한 줄로 읽힌다.
            */
            /*
              **줄마다 늘 낸다.** 고른 줄에만 내면 단추가 떴다 사라지며 줄의
              모양이 바뀐다 — 잠글지 말지는 부르는 쪽이 `on`을 보고 정한다.
            */
            const action = actionOf?.(entry.id, on)
            return (
              <li key={entry.id} className={`charpick__item${on ? ' charpick__item--on' : ''}`}>
                <button
                  type="button"
                  className="charpick__row"
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
                  {/*
                    **계정명을 이름 밑에 둔다**(형님이 정했다). 한 줄에 넷(표식·
                    이름·곁값·계정명)이 늘어서면 서로 밀어내 이름이 잘린다 —
                    이름이 먼저고 계정명은 그것을 받치는 말이다.
                  */}
                  <span className="charpick__who">
                    <span className="charpick__name">{entry.name || '이름 없음'}</span>
                    <span className="charpick__owner sl-numeral">{entry.ownerName}</span>
                  </span>
                  {detail !== undefined && detail !== null && (
                    <span className="charpick__detail">{detail}</span>
                  )}
                </button>
                {action}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
