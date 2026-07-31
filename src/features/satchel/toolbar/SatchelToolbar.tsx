import { useEffect, useRef, useState } from 'react'
import type { ToolbarPosition } from '../layout'
import { widgetDefinitions } from '../widgets/registry'
import type { SatchelMode } from '../widgets/types'

interface Props {
  position: ToolbarPosition
  mode: SatchelMode
  countOf: (definitionId: string) => number
  onToggleMode: () => void
  onAdd: (definitionId: string) => void
  onSetPosition: (position: ToolbarPosition) => void
  onReset: () => void
}

/**
 * 툴바.
 *
 * 플레이 모드에서는 햄버거와 편집 전환만 둔다 — 플레이 중에는 화면이 조용해야 한다.
 * 편집 모드에서만 위젯 목록이 펼쳐진다.
 *
 * 상단·좌측을 같은 마크업으로 그리고 방향은 CSS가 처리한다.
 */
export function SatchelToolbar({
  position,
  mode,
  countOf,
  onToggleMode,
  onAdd,
  onSetPosition,
  onReset,
}: Props) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!menuOpen) return
    function onKey(event: globalThis.KeyboardEvent) {
      if (event.key === 'Escape') setMenuOpen(false)
    }
    function onPointerDown(event: globalThis.PointerEvent) {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onPointerDown)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onPointerDown)
    }
  }, [menuOpen])

  return (
    <div className={`satchel-bar satchel-bar--${position}`} ref={menuRef}>
      <button
        type="button"
        className="satchel-bar__button satchel-bar__hamburger"
        aria-label="메뉴"
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen((open) => !open)}
      >
        <span aria-hidden="true">☰</span>
      </button>

      <button
        type="button"
        className="satchel-bar__button satchel-bar__mode"
        aria-pressed={mode === 'edit'}
        onClick={onToggleMode}
      >
        {mode === 'edit' ? '다 됐다' : '고쳐 놓기'}
      </button>

      {mode === 'edit' && (
        <ul className="satchel-bar__widgets">
          {widgetDefinitions.map((definition) => {
            const count = countOf(definition.id)
            const isToggle = definition.maxInstances === 1
            const full = definition.maxInstances != null && count >= definition.maxInstances
            return (
              <li key={definition.id}>
                <button
                  type="button"
                  className="satchel-bar__button satchel-bar__widget"
                  aria-pressed={isToggle ? count > 0 : undefined}
                  disabled={full}
                  onClick={() => onAdd(definition.id)}
                >
                  {definition.name}
                  {/* 토글이 아닌 위젯은 여러 개 놓을 수 있다. 몇 개 놓였는지
                      보여야 '추가'라는 것이 드러난다. */}
                  {!isToggle && count > 0 && (
                    <span className="satchel-bar__count" aria-label={`${count}개 놓임`}>
                      {count}
                    </span>
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      )}

      {menuOpen && (
        <div className="satchel-menu" role="menu">
          <a className="satchel-menu__item" href="#/" role="menuitem">
            나가기
          </a>
          <button
            type="button"
            className="satchel-menu__item"
            role="menuitem"
            onClick={() => {
              onSetPosition(position === 'top' ? 'left' : 'top')
              setMenuOpen(false)
            }}
          >
            도구 띠 {position === 'top' ? '왼쪽으로' : '위로'}
          </button>
          <button
            type="button"
            className="satchel-menu__item satchel-menu__item--danger"
            role="menuitem"
            onClick={() => {
              // 되돌릴 수 없다. 반드시 확인을 받는다.
              if (window.confirm('행낭을 비운다. 되돌릴 수 없다.')) onReset()
              setMenuOpen(false)
            }}
          >
            행낭 비우기
          </button>
        </div>
      )}
    </div>
  )
}
