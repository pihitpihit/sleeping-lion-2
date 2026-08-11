import { useEffect } from 'react'
import { CLASS_ICON_COUNT, classIconUrl } from './character'
import { useClassStore } from './classStore'

interface Props {
  /** 고른 클래스. 표에 클래스가 없으면 쓰이지 않는다. */
  classId: string | null
  /** 고른 아이콘 번호. 표가 비었을 때는 이것만으로 고른다. */
  icon: number
  onChange: (next: { classId: string | null; icon: number }) => void
  disabled?: boolean
}

/**
 * 클래스 고르기.
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ **넣어 둔 클래스가 있으면 그중에서, 없으면 그림에서 고른다.**             │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * 클래스 수치(이름·핸드·체력)는 레포에 없고 DB에만 있다(절대 원칙 1). 아무것도
 * 안 넣었으면 이름이랄 것이 없으므로 **Creator Pack 아이콘 21개를 늘어놓는다** —
 * 봉투 겉면에 인쇄된 그림이라 사람이 제 것과 같은 것을 찾으면 된다.
 *
 * 넣어 두었으면 그쪽이 낫다. 이름이 보이고, **팩에 그림이 없는 클래스도 고를 수
 * 있다** — 사자의 턱 넷이 그렇다(`0012`).
 *
 * **이름을 지어내지 않는다.** 그림만 있을 때는 번호로 부른다 — 클래스 이름은
 * 게임 콘텐츠이고 잠긴 클래스는 이름 자체가 스포일러다(구현 결정 40).
 */
export function ClassPicker({ classId, icon, onChange, disabled = false }: Props) {
  const list = useClassStore((s) => s.list)
  const load = useClassStore((s) => s.load)

  useEffect(() => {
    void load()
  }, [load])

  if (list.length > 0) {
    return (
      <div className="classpick classpick--named" role="radiogroup" aria-label="클래스">
        {list.map((info) => {
          const chosen = info.id === classId
          const url = info.icon === null ? null : classIconUrl(info.icon)
          return (
            <button
              key={info.id}
              type="button"
              role="radio"
              aria-checked={chosen}
              className={`classpick__row${chosen ? ' classpick__row--on' : ''}`}
              disabled={disabled}
              /* 고른 것을 다시 누르면 물린다 — 잘못 짚었을 때 되돌리는 길이다. */
              onClick={() =>
                onChange(
                  chosen ? { classId: null, icon: 0 } : { classId: info.id, icon: info.icon ?? 0 },
                )
              }
            >
              <span className={`classpick__badge${url ? '' : ' classpick__badge--plain'}`}>
                {url ? (
                  <img src={url} alt="" draggable={false} />
                ) : (
                  <span aria-hidden="true">{info.name.slice(0, 1)}</span>
                )}
              </span>
              <span className="classpick__label">{info.name}</span>
              {info.handSize > 0 && (
                <span className="classpick__hand sl-numeral">{info.handSize}</span>
              )}
            </button>
          )
        })}
      </div>
    )
  }

  const indexes = Array.from({ length: CLASS_ICON_COUNT }, (_, i) => i + 1)

  return (
    <div className="classpick" role="radiogroup" aria-label="클래스 표식">
      {indexes.map((index) => {
        const chosen = index === icon
        return (
          <button
            key={index}
            type="button"
            role="radio"
            aria-checked={chosen}
            aria-label={`클래스 표식 ${index}번`}
            className={`classpick__cell${chosen ? ' classpick__cell--on' : ''}`}
            disabled={disabled}
            onClick={() => onChange({ classId: null, icon: chosen ? 0 : index })}
          >
            <img src={classIconUrl(index) ?? ''} alt="" draggable={false} />
          </button>
        )
      })}
    </div>
  )
}
