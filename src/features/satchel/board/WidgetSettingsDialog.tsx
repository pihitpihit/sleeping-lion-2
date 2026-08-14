import { useEffect, useRef } from 'react'
import type { WidgetDefinition } from '../widgets/types'
import { CloseIcon } from './frameIcons'

interface Props {
  definition: WidgetDefinition
  value: unknown
  onChange: (next: unknown) => void
  onClose: () => void
  /** 어느 위젯의 설정인가. 놓기 전이면 `null`. */
  instanceId: string | null
  /**
   * **아직 놓이지 않은 위젯**의 설정일 때 준다.
   *
   * 자리가 모자라 놓기 전에 묻는 경우다(`pendingAdd`). 이때는 확인이 필요하다 —
   * 이미 놓인 위젯이야 바꾸는 즉시 반영해도 되돌리기가 받아주지만, 여기서는
   * 무엇을 되돌릴 대상 자체가 없다.
   */
  placing?: {
    /** 지금 설정으로 들어갈 자리가 있는가. */
    canPlace: boolean
    onPlace: () => void
  }
}

/**
 * 위젯 설정 팝업.
 *
 * 위젯에 붙이는 팝오버가 아니라 **가운데 띄우는 모달**이다. 폰에서는 위젯이
 * 화면 끝에 붙어 있을 수 있어 팝오버가 잘리거나 화면 밖으로 나간다.
 *
 * 확인 버튼은 두지 않는다. 바꾸는 즉시 반영·저장하며, 되돌리고 싶으면 다시
 * 끄면 된다 — 확인/취소를 두면 되돌리기와 의미가 겹친다.
 */
export function WidgetSettingsDialog({
  definition,
  value,
  onChange,
  onClose,
  instanceId,
  placing,
}: Props) {
  const panelRef = useRef<HTMLDivElement | null>(null)
  const Editor = definition.settings?.Editor

  useEffect(() => {
    // 열리면 패널 안으로 초점을 옮긴다. 안 그러면 탭이 뒤쪽 화면을 돌아다닌다.
    panelRef.current?.focus()

    function onKey(event: globalThis.KeyboardEvent) {
      if (event.key === 'Escape') {
        event.stopPropagation()
        onClose()
        return
      }
      if (event.key !== 'Tab') return

      // 초점 가두기 — 열려 있는 동안 탭이 패널 안에서 돈다.
      const focusable = panelRef.current?.querySelectorAll<HTMLElement>(
        'button:not(:disabled), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      )
      if (!focusable || focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKey, true)
    return () => document.removeEventListener('keydown', onKey, true)
  }, [onClose])

  if (!Editor) return null

  return (
    <div
      className="widget-settings"
      role="presentation"
      // 배경을 누르면 닫는다. 패널 안쪽 클릭은 여기까지 올라오지 않게 막는다.
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        className="widget-settings__panel"
        role="dialog"
        aria-modal="true"
        aria-label={`${definition.name} 설정`}
        tabIndex={-1}
        ref={panelRef}
      >
        <header className="widget-settings__head">
          <h2 className="widget-settings__title">
            {definition.name}
            {placing && <span className="widget-settings__tag">놓기 전 설정</span>}
          </h2>
          <button
            type="button"
            className="widget-settings__close"
            aria-label="닫기"
            onClick={onClose}
          >
            <CloseIcon size={20} />
          </button>
        </header>

        <div className="widget-settings__body">
          {placing && (
            <p className="widget-settings__lead">
              남은 자리가 좁아 지금 크기로는 못 놓는다. 줄여서 놓아라.
            </p>
          )}
          <Editor value={value} onChange={onChange} instanceId={instanceId} />
        </div>

        {placing && (
          <footer className="widget-settings__foot">
            <button type="button" className="widget-settings__cancel" onClick={onClose}>
              취소
            </button>
            <button
              type="button"
              className="widget-settings__place"
              disabled={!placing.canPlace}
              onClick={placing.onPlace}
            >
              {placing.canPlace ? '놓기' : '아직 자리가 모자라다'}
            </button>
          </footer>
        )}
      </div>
    </div>
  )
}
