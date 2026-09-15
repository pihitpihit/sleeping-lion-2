import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useScrollLock } from '../../../campaign/useScrollLock'
import { CloseIcon } from '../../board/frameIcons'
import { HpXpSettingsEditor } from './HpXpSettingsEditor'

// **껍데기 스타일을 스스로 들여온다**(구현 결정 189·356). 행낭에서는 일지의
// 스타일시트가 안 실리므로, 안 들여오면 팝업이 스타일 없이 떠 안 보인다.
import '../../../campaign/logview.css'

/**
 * 누구의 다이얼인지 고르는 팝업 — **플레이 중에 연다**(형님이 정했다).
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ **편집 모드에 가둘 일이 아니다.**                                         │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * 전에는 톱니가 편집 모드에만 있었다. 그런데 **누가 어느 다이얼을 쓸지는 판을
 * 펴면서 정하는 일**이고, 체력을 최대로 채우는 것도 그 자리에서 한다 — 배치를
 * 고치러 편집 모드에 들어갔다 나오는 것은 그 흐름과 맞지 않는다.
 *
 * 알맹이는 톱니가 열던 것과 **같은 화면**이다(`HpXpSettingsEditor`) — 두 벌로
 * 그리면 언젠가 어긋난다.
 */
export function HpXpSettingsView({
  instanceId,
  value,
  onChange,
  onClose,
}: {
  instanceId: string
  value: unknown
  onChange: (next: unknown) => void
  onClose: () => void
}) {
  useScrollLock()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.stopPropagation()
      onClose()
    }
    document.addEventListener('keydown', onKey, true)
    return () => document.removeEventListener('keydown', onKey, true)
  }, [onClose])

  return createPortal(
    <div className="logview">
      <section
        className="logview__panel"
        role="dialog"
        aria-modal="true"
        aria-label="누구의 다이얼인가"
      >
        <header className="logview__head">
          <h2 className="logview__title">누구의 다이얼인가</h2>
          <button type="button" className="logview__close" aria-label="닫기" onClick={onClose}>
            <CloseIcon size={20} />
          </button>
        </header>
        <HpXpSettingsEditor instanceId={instanceId} value={value} onChange={onChange} />
      </section>
    </div>,
    document.body,
  )
}
