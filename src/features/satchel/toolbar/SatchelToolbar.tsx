import { useEffect, useRef, useState } from 'react'
import type { ToolbarPosition, ToolbarPreference } from '../layout'
import { nextToolbarPreference, TOOLBAR_PREFERENCE_LABEL } from './position'
import { widgetDefinitions } from '../widgets/registry'
import type { SatchelMode } from '../widgets/types'
import { EditIcon, MenuIcon, PlusIcon, SaveIcon, SeatedIcon, UndoIcon } from './icons'

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
  /** 전투 팝업을 연다. */
  onOpenBattle: () => void
  /** 지금 판에 앉아 있는가 — 띠에 표를 낸다. */
  inBattle: boolean
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
  onOpenBattle,
  inBattle,
}: Props) {
  /**
   * 열려 있는 메뉴. 한 번에 하나만 연다.
   *
   * 둘을 따로 두면 **둘 다 열린 채 겹치는** 자리가 생긴다. 하나로 두면 다른
   * 것을 누르는 순간 앞의 것이 닫힌다.
   */
  const [openMenu, setOpenMenu] = useState<'main' | 'add' | null>(null)
  const menuRef = useRef<HTMLDivElement | null>(null)
  const editing = mode === 'edit'

  // 플레이로 돌아가면 연장 메뉴는 닫는다 — 편집 중에만 쓰는 것이다.
  const addOpen = openMenu === 'add' && editing

  useEffect(() => {
    if (openMenu === null) return
    function onKey(event: globalThis.KeyboardEvent) {
      if (event.key === 'Escape') setOpenMenu(null)
    }
    function onPointerDown(event: globalThis.PointerEvent) {
      if (!menuRef.current?.contains(event.target as Node)) setOpenMenu(null)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onPointerDown)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onPointerDown)
    }
  }, [openMenu])

  /*
    두 메뉴는 **제어 묶음 안에** 그린다. 그래야 누른 단추 바로 아래(왼쪽 띠에서는
    바로 오른쪽)에 붙는다 — 띠 전체를 기준으로 삼으면 단추와 떨어진 자리에 뜬다.
  */
  return (
    <div className={`satchel-bar satchel-bar--${position}`} ref={menuRef}>
      <div className="satchel-bar__controls">
        <button
          type="button"
          className="satchel-bar__control"
          aria-label="메뉴"
          aria-expanded={openMenu === 'main'}
          onClick={() => setOpenMenu((open) => (open === 'main' ? null : 'main'))}
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

        {/*
          연장을 꺼내는 자리 — **저장 단추 바로 옆이다.**

          목록을 띠에 늘어놓지 않고 메뉴로 접었다. 위젯이 늘수록 띠가 길어져
          좁은 화면에서 옆으로 밀려났고, 무엇이 있는지 보려면 띠를 문질러야 했다.

          **금색은 주지 않는다.** 그 자리는 모드 단추가 이미 쓰고 있어, 나란히
          두면 어느 것이 지금 할 일인지 흐려진다.
        */}
        {editing && (
          <button
            type="button"
            className="satchel-bar__control"
            aria-label="연장 꺼내기"
            title="연장 꺼내기"
            aria-expanded={addOpen}
            aria-haspopup="menu"
            onClick={() => setOpenMenu((open) => (open === 'add' ? null : 'add'))}
          >
            <PlusIcon />
          </button>
        )}

        {/*
          앉아 있다는 것은 **플레이 중에도 보여야 한다.** 남들과 판을 나누고
          있는지 모른 채 만지면, 내 화면만 고치는 줄 알고 남의 판을 굴린다.
        */}
        {inBattle && (
          <button
            type="button"
            className="satchel-bar__control satchel-bar__control--seated"
            aria-label="전투에 앉아 있다"
            title="전투에 앉아 있다"
            onClick={onOpenBattle}
          >
            <SeatedIcon />
          </button>
        )}

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

        {openMenu === 'main' && (
          <div className="satchel-menu" role="menu">
            <a className="satchel-menu__item" href="#/" role="menuitem">
              나가기
            </a>
            <button
              type="button"
              className="satchel-menu__item"
              role="menuitem"
              onClick={() => {
                setOpenMenu(null)
                onOpenBattle()
              }}
            >
              전투{inBattle && <span className="satchel-menu__hint"> (앉아 있음)</span>}
            </button>
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

        {addOpen && (
          <div className="satchel-menu satchel-menu--widgets" role="menu">
            {/* 빈칸이 아예 없으면 어떤 위젯도 못 들어간다. 왜 다 잠겼는지
                한 줄로 말해 준다 — 잠긴 단추만 있으면 고장으로 읽힌다. */}
            {!hasRoom && <p className="satchel-menu__note">격자가 꽉 찼다.</p>}

            {widgetDefinitions.map((definition) => {
              const count = countOf(definition.id)
              const isToggle = definition.maxInstances === 1
              const full = definition.maxInstances != null && count >= definition.maxInstances
              const roomless = !full && !hasRoom
              return (
                <button
                  key={definition.id}
                  type="button"
                  className="satchel-menu__item satchel-menu__item--widget"
                  role={isToggle ? 'menuitemcheckbox' : 'menuitem'}
                  aria-checked={isToggle ? count > 0 : undefined}
                  disabled={full || roomless}
                  onClick={() => {
                    onAdd(definition.id)
                    // 메뉴는 닫는다. 여럿을 잇달아 놓는 일보다 놓고 자리를
                    // 잡는 일이 흔하다.
                    setOpenMenu(null)
                  }}
                >
                  <span className="satchel-menu__label">{definition.name}</span>
                  {/* 토글이 아닌 위젯은 여러 개 놓을 수 있다. 몇 개 놓였는지
                      보여야 '추가'라는 것이 드러난다. */}
                  {!isToggle && count > 0 && (
                    <span className="satchel-bar__count" aria-label={`${count}개 놓임`}>
                      {count}
                    </span>
                  )}
                  {isToggle && count > 0 && (
                    <span className="satchel-menu__hint" aria-hidden="true">
                      놓임
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
