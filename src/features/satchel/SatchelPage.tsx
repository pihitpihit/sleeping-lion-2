import { useEffect } from 'react'
import { useBoardSize } from './useBoardSize'
import { useViewportSize } from './useViewportSize'
import { useSatchelStore } from './store/satchelStore'
import { resolveToolbarPosition } from './toolbar/position'
import { SatchelToolbar } from './toolbar/SatchelToolbar'
import { WidgetBoard } from './board/WidgetBoard'
import './SatchelPage.css'

/**
 * 행낭 — 위젯 보드.
 *
 * 보드는 스크롤되지 않는다. 격자가 화면에 꽉 차고 위젯이 그 안에 들어가는 구조라
 * 넘칠 곳이 없어야 한다.
 */
export function SatchelPage() {
  const { ref: boardRef, size } = useBoardSize<HTMLDivElement>()
  const viewport = useViewportSize()

  const metrics = useSatchelStore((s) => s.metrics)
  const settings = useSatchelStore((s) => s.settings)
  const mode = useSatchelStore((s) => s.mode)
  const notice = useSatchelStore((s) => s.notice)
  const past = useSatchelStore((s) => s.past)
  const setBoardSize = useSatchelStore((s) => s.setBoardSize)
  const setMode = useSatchelStore((s) => s.setMode)
  const setToolbarPreference = useSatchelStore((s) => s.setToolbarPreference)
  const addWidgetOfType = useSatchelStore((s) => s.addWidgetOfType)
  const removeWidgetInstance = useSatchelStore((s) => s.removeWidgetInstance)
  const moveOrResize = useSatchelStore((s) => s.moveOrResize)
  const resetLayout = useSatchelStore((s) => s.resetLayout)
  const clearNotice = useSatchelStore((s) => s.clearNotice)
  const undo = useSatchelStore((s) => s.undo)
  const currentLayout = useSatchelStore((s) => s.currentLayout)
  const countOf = useSatchelStore((s) => s.countOf)

  useEffect(() => {
    if (size.width > 0 && size.height > 0) setBoardSize(size)
  }, [size, setBoardSize])

  // 편집 중 되돌리기 단축키. 관용대로 Ctrl/Cmd+Z.
  useEffect(() => {
    if (mode !== 'edit') return
    function onKey(event: globalThis.KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z') {
        event.preventDefault()
        undo()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [mode, undo])

  const position = resolveToolbarPosition(settings.toolbarPosition, viewport)
  const layout = currentLayout()
  const empty = layout.widgets.length === 0

  return (
    <div className={`satchel satchel--${position} satchel--${mode}`}>
      <SatchelToolbar
        position={position}
        preference={settings.toolbarPosition}
        mode={mode}
        canUndo={past.length > 0}
        countOf={countOf}
        onToggleMode={() => setMode(mode === 'edit' ? 'play' : 'edit')}
        onAdd={addWidgetOfType}
        onSetPreference={setToolbarPreference}
        onUndo={undo}
        onReset={resetLayout}
      />

      <div
        className="satchel__board"
        ref={boardRef}
        data-board-width={Math.round(size.width)}
        data-board-height={Math.round(size.height)}
        data-columns={metrics.columns}
        data-rows={metrics.rows}
      >
        <WidgetBoard
          layout={layout}
          metrics={metrics}
          mode={mode}
          onCommit={moveOrResize}
          onRemove={removeWidgetInstance}
        />

        {empty && (
          <p className="satchel__empty">
            {mode === 'edit' ? '도구 띠에서 골라 놓아라.' : '행낭이 비었다. 고쳐 놓기로 채워라.'}
          </p>
        )}
      </div>

      {notice && (
        <div className="satchel__notice" role="status">
          <span>{notice}</span>
          <button type="button" onClick={clearNotice} aria-label="알림 닫기">
            <span aria-hidden="true">×</span>
          </button>
        </div>
      )}
    </div>
  )
}
