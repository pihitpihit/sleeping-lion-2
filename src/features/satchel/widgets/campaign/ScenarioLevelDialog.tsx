import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { CloseIcon } from '../../board/frameIcons'
import { ScenarioLevelPanel } from './ScenarioLevelPanel'
import './ScenarioLevelDialog.css'

/**
 * 난이도 표를 펼쳐 놓고 고르는 팝업.
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ **위젯은 수를 말하고, 팝업은 그 수가 어디서 왔는지 보여 준다.**           │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * 상 위에서 「지금 몇 레벨이지」 다음에 오는 물음은 언제나 「그럼 함정이 몇이지」다.
 * 한 줄만 세워 둔 위젯으로는 **올리면 얼마가 되는지**를 알 수 없어, 고르는 자리와
 * 표를 한 화면에 둔다.
 *
 * `document.body`에 그린다 — 위젯 틀은 회전 때문에 늘 `transform`을 걸고 있고,
 * `transform`이 걸린 조상은 `position: fixed`의 기준이 된다(구현 결정 37).
 * 그냥 두면 팝업이 위젯 안에 갇히고 위젯과 함께 거꾸로 선다.
 *
 * 나가는 길은 × · Escape · 배경 누르기다. **되돌릴 것이 없으니 뜸도 없다**
 * (`ConfirmDialog`와 정반대다, 구현 결정 195).
 */
export function ScenarioLevelDialog({
  level,
  locked,
  onPick,
  onClose,
}: {
  level: number
  locked: string | null
  onPick: (level: number) => void
  onClose: () => void
}) {
  const closeRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    closeRef.current?.focus()
  }, [])

  useEffect(() => {
    function onKey(event: globalThis.KeyboardEvent) {
      if (event.key !== 'Escape') return
      // 행낭이 같은 키를 듣고 있다(편집 모드 나가기). 여기서 멈춘다.
      event.stopPropagation()
      onClose()
    }
    document.addEventListener('keydown', onKey, true)
    return () => document.removeEventListener('keydown', onKey, true)
  }, [onClose])

  return createPortal(
    <div
      className="lvldlg"
      role="presentation"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <section className="lvldlg__panel" role="dialog" aria-modal="true" aria-label="시나리오 레벨">
        <header className="lvldlg__head">
          <h2 className="lvldlg__title">시나리오 레벨</h2>
          <button
            type="button"
            className="lvldlg__close"
            aria-label="닫기"
            onClick={onClose}
            ref={closeRef}
          >
            <CloseIcon size={20} />
          </button>
        </header>
        <ScenarioLevelPanel level={level} locked={locked} onPick={onPick} />
      </section>
    </div>,
    document.body,
  )
}
