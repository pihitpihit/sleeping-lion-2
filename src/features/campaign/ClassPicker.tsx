import { CLASS_ICON_COUNT, classIconUrl } from './character'

interface Props {
  value: number
  onChange: (index: number) => void
  disabled?: boolean
}

/**
 * 클래스 고르기 — **그림만 늘어놓는다.**
 *
 * 이름을 붙이지 않는다. 클래스 이름은 게임 콘텐츠이고 잠긴 클래스는 이름 자체가
 * 스포일러다(SPEC 3장). 아이콘은 봉투 겉면에 인쇄돼 있어 열기 전에도 보이는
 * 것이라 가릴 것이 없다 — 사람은 손에 든 봉투와 같은 그림을 찾으면 된다.
 *
 * 그래서 **읽어주는 쪽에 줄 이름도 없다.** 번호로 부른다. 이름을 지어내면 그것이
 * 곧 우리가 담지 않기로 한 콘텐츠가 된다.
 *
 * **아이콘 색을 건드리지 않고 바탕을 깐다.** 글룸헤이븐 열일곱은 거의 검정이라
 * 어두운 바탕에서 묻히는데, 흰빛으로 물들이면 사자의 턱 넷(색 있는 원반)까지
 * 함께 표백된다. 양피지 색 원반을 깔면 검정은 검정대로, 색은 색대로 보인다 —
 * 손에 든 봉투와 같은 그림을 찾는 것이 전부이므로 원본 색이 그대로인 편이 낫다.
 */
export function ClassPicker({ value, onChange, disabled = false }: Props) {
  const indexes = Array.from({ length: CLASS_ICON_COUNT }, (_, i) => i + 1)

  return (
    <div className="classpick" role="radiogroup" aria-label="클래스 표식">
      {indexes.map((index) => {
        const chosen = index === value
        return (
          <button
            key={index}
            type="button"
            role="radio"
            aria-checked={chosen}
            aria-label={`클래스 표식 ${index}번`}
            className={`classpick__cell${chosen ? ' classpick__cell--on' : ''}`}
            disabled={disabled}
            /* 고른 것을 다시 누르면 물린다 — 잘못 짚었을 때 되돌리는 길이다. */
            onClick={() => onChange(chosen ? 0 : index)}
          >
            <img src={classIconUrl(index) ?? ''} alt="" draggable={false} />
          </button>
        )
      })}
    </div>
  )
}
