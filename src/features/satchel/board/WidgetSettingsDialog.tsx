import { useEffect, useRef } from 'react'
import type { WidgetDefinition } from '../widgets/types'

interface Props {
  definition: WidgetDefinition
  value: unknown
  onChange: (next: unknown) => void
  onClose: () => void
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
export function WidgetSettingsDialog({ definition, value, onChange, onClose }: Props) {
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
          <h2 className="widget-settings__title">{definition.name}</h2>
          <button
            type="button"
            className="widget-settings__close"
            aria-label="닫기"
            onClick={onClose}
          >
            <span aria-hidden="true">×</span>
          </button>
        </header>

        <div className="widget-settings__body">
          <Editor value={value} onChange={onChange} />
        </div>
      </div>
    </div>
  )
}
