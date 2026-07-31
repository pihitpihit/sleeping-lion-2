import './Switch.css'

interface Props {
  checked: boolean
  disabled?: boolean
  label: string
  /**
   * 이름 왼쪽에 놓을 그림의 URL.
   *
   * 노드가 아니라 URL로 받는다 — 안쪽에 span을 하나 더 두면 `background-size`가
   * 걸린 요소와 그림이 놓인 요소가 갈려, 고유 크기가 큰 SVG는 좌상단 귀퉁이만
   * 보인다. 실제로 그렇게 났다.
   */
  iconUrl?: string
  onChange: (next: boolean) => void
}

/**
 * 슬라이드 토글.
 *
 * `button`에 `role="switch"`를 준다. 체크박스를 숨기고 그림만 얹는 방식보다
 * 상태를 다루기 쉽고, 스크린리더에도 켜짐/꺼짐이 그대로 전달된다.
 */
export function Switch({ checked, disabled = false, label, iconUrl, onChange }: Props) {
  return (
    <button
      type="button"
      role="switch"
      className="sw"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
    >
      {iconUrl && (
        <span
          className="sw__icon"
          style={{ backgroundImage: `url(${iconUrl})` }}
          aria-hidden="true"
        />
      )}
      <span className="sw__label">{label}</span>
      <span className="sw__track" aria-hidden="true">
        <span className="sw__knob" />
      </span>
    </button>
  )
}
