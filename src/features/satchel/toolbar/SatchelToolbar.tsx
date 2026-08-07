import { useEffect, useRef, useState } from 'react'
import type { ToolbarPosition, ToolbarPreference } from '../layout'
import { nextToolbarPreference, TOOLBAR_PREFERENCE_LABEL } from './position'
import { widgetDefinitions } from '../widgets/registry'
import type { SatchelMode } from '../widgets/types'
import { EditIcon, MenuIcon, SaveIcon, UndoIcon } from './icons'

interface Props {
  position: ToolbarPosition
  preference: ToolbarPreference
  mode: SatchelMode
  canUndo: boolean
  showWidgetTitles: boolean
  countOf: (definitionId: string) => number
  /**
   * 격자에 빈칸이 하나라도 있는가.
   *
   * **잠글 때는 다 함께 잠근다.** 위젯별로 가려 잠그면 켜진 단추와 꺼진 단추가
   * 섞여 왜 이건 되고 저건 안 되는지 알 수 없다. 자리가 모자란 위젯은 설정을
   * 줄여 놓을 수 있으므로 개별로 잠그는 것은 사실과도 어긋난다.
   */
  hasRoom: boolean
  onToggleMode: () => void
  onAdd: (definitionId: string) => void
  onSetPreference: (preference: ToolbarPreference) => void
  onToggleWidgetTitles: () => void
  onUndo: () => void
}

/**
 * 도구 띠.
 *
 * 두 갈래를 눈으로 구분한다.
 * - **제어 버튼**(메뉴·모드·되돌리기) — 아이콘만. 놋쇠 테를 두른 장치처럼 보인다.
 * - **연장 버튼**(위젯 추가) — 이름을 쓴 판. 꺼내 놓는 물건이라 결이 달라야 한다.
 *
 * 플레이 모드에서는 제어만 남긴다 — 플레이 중에는 화면이 조용해야 한다.
 */
export function SatchelToolbar({
  position,
  preference,
  mode,
  canUndo,
  showWidgetTitles,
  countOf,
  hasRoom,
  onToggleMode,
  onAdd,
  onSetPreference,
  onToggleWidgetTitles,
  onUndo,
}: Props) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)
  const editing = mode === 'edit'

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
      <div className="satchel-bar__controls">
        <button
          type="button"
          className="satchel-bar__control"
          aria-label="메뉴"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <MenuIcon />
        </button>

        <button
          type="button"
          className="satchel-bar__control satchel-bar__control--accent"
          aria-label={editing ? '다 됐다' : '고쳐 놓기'}
          title={editing ? '다 됐다' : '고쳐 놓기'}
          aria-pressed={editing}
          onClick={onToggleMode}
        >
          {editing ? <SaveIcon /> : <EditIcon />}
        </button>

        {editing && (
          <button
            type="button"
            className="satchel-bar__control"
            aria-label="되돌리기"
            title="되돌리기"
            disabled={!canUndo}
            onClick={onUndo}
          >
            <UndoIcon />
          </button>
        )}
      </div>

      {editing && (
        <>
          <span className="satchel-bar__divider" aria-hidden="true" />
          <ul className="satchel-bar__widgets">
            {widgetDefinitions.map((definition) => {
              const count = countOf(definition.id)
              const isToggle = definition.maxInstances === 1
              const full = definition.maxInstances != null && count >= definition.maxInstances
              // 빈칸이 아예 없으면 어떤 위젯도 못 들어간다. 그때만 잠근다.
              const roomless = !full && !hasRoom
              return (
                <li key={definition.id}>
                  <button
                    type="button"
                    className="satchel-bar__widget"
                    aria-pressed={isToggle ? count > 0 : undefined}
                    disabled={full || roomless}
                    title={roomless ? '격자가 꽉 찼다' : undefined}
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
        </>
      )}

      {menuOpen && (
        <div className="satchel-menu" role="menu">
          <a className="satchel-menu__item" href="#/" role="menuitem">
            나가기
          </a>
          <button
            type="button"
            className="satchel-menu__item"
            role="menuitemcheckbox"
            aria-checked={showWidgetTitles}
            onClick={onToggleWidgetTitles}
          >
            연장 이름 {showWidgetTitles ? '숨기기' : '보이기'}
          </button>
          <button
            type="button"
            className="satchel-menu__item"
            role="menuitem"
            onClick={() => onSetPreference(nextToolbarPreference(preference))}
          >
            도구 띠 — {TOOLBAR_PREFERENCE_LABEL[preference]}
            {preference === 'auto' && <span className="satchel-menu__hint"> ({position})</span>}
          </button>
        </div>
      )}
    </div>
  )
}
