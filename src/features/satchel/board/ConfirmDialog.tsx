import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { CloseIcon } from './frameIcons'
import {
  CONFIRM_DELAY_MS,
  CONFIRM_TICK_MS,
  armProgress,
  isArmed,
  matchesChallenge,
  remainingMs,
  secondsLeft,
} from './confirm'
import './ConfirmDialog.css'

interface Props {
  /** 무엇을 하려는가. 한 줄. */
  title: string
  /** 무엇이 사라지는가. 구체적으로 — "정말입니까"는 아무것도 알려주지 않는다. */
  description: string
  /** 실행 단추에 적을 말. 동사로 — '확인'은 무슨 일이 나는지 숨긴다. */
  confirmLabel: string
  onConfirm: () => void
  onCancel: () => void
  /** 뜸의 길이. 시험에서만 줄인다. */
  delayMs?: number
  /**
   * 그대로 옮겨 적어야 실행 단추가 살아나는 글. **없으면 뜸만으로 산다.**
   *
   * 뜸은 손가락이 미끄러지는 것을 막고, 이것은 **엉뚱한 것을 고른 것**을 막는다.
   */
  challenge?: { readonly label: string; readonly answer: string }
}

/**
 * 되돌릴 수 없는 일을 묻는 팝업.
 *
 * `window.confirm`을 걷어낸 자리다. OS 팝업은 ① 테마 밖이라 앱이 잠깐 남의 것이
 * 되고 ② **기본 초점이 '확인'에 가 있어** 엔터 한 번에 판이 날아가며 ③ 뜸을
 * 들일 수가 없다.
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ **처음에는 무르는 쪽만 눌린다.**                                          │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * 실행 단추는 뜸이 끝나야 살아난다. 그동안 눌리는 것은 닫기와 취소뿐이라, 팝업이
 * 뜨는 순간의 관성 탭은 **아무 일도 일으키지 못하거나 무르는 쪽으로 떨어진다.**
 *
 * 초점도 취소에서 시작하고 **뜸이 끝나도 옮기지 않는다** — 살아나는 순간 실행
 * 단추로 초점이 뛰면 엔터를 누르고 있던 손이 그대로 밀어버린다.
 *
 * `document.body`로 옮겨 그린다. 위젯 틀은 회전 때문에 늘 `transform`을 걸고
 * 있고, `transform`이 걸린 조상은 `position: fixed`의 기준이 된다 — 그냥 두면
 * 팝업이 위젯 안에 갇히고 위젯과 함께 거꾸로 선다.
 */
export function ConfirmDialog({
  title,
  description,
  confirmLabel,
  onConfirm,
  onCancel,
  delayMs = CONFIRM_DELAY_MS,
  challenge,
}: Props) {
  const [typed, setTyped] = useState('')
  const panelRef = useRef<HTMLDivElement | null>(null)
  const cancelRef = useRef<HTMLButtonElement | null>(null)
  const [remaining, setRemaining] = useState(delayMs)
  const titleId = useId()
  const bodyId = useId()

  useEffect(() => {
    // 무르는 쪽에서 시작한다. 손이 아직 어디로 갈지 정하지 않았을 때 놓이는
    // 자리이므로, 그 자리는 아무것도 망가뜨리지 않는 쪽이어야 한다.
    cancelRef.current?.focus()
  }, [])

  useEffect(() => {
    const deadline = Date.now() + delayMs
    const id = setInterval(() => {
      const left = remainingMs(deadline, Date.now())
      setRemaining(left)
      if (left <= 0) clearInterval(id)
    }, CONFIRM_TICK_MS)
    return () => clearInterval(id)
  }, [delayMs])

  useEffect(() => {
    function onKey(event: globalThis.KeyboardEvent) {
      if (event.key === 'Escape') {
        // 뒤쪽 화면(위젯 편집·행낭)이 같은 키를 듣고 있다. 여기서 멈춘다.
        event.stopPropagation()
        onCancel()
        return
      }
      if (event.key !== 'Tab') return

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
  }, [onCancel])

  const typedOk = challenge === undefined || matchesChallenge(typed, challenge.answer)
  const armed = isArmed(remaining) && typedOk
  const left = secondsLeft(remaining)

  return createPortal(
    <div
      className="confirm"
      role="presentation"
      // 배경을 눌러도 무른다. 잘못 눌렀을 때 빠져나갈 길은 넓을수록 좋다 —
      // 실행 쪽이 아니라 무르는 쪽이므로 넓혀도 위험하지 않다.
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) onCancel()
      }}
    >
      <div
        className="confirm__panel"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={bodyId}
        tabIndex={-1}
        ref={panelRef}
      >
        <header className="confirm__head">
          <h2 className="confirm__title" id={titleId}>
            {title}
          </h2>
          <button type="button" className="confirm__close" aria-label="닫기" onClick={onCancel}>
            <CloseIcon size={20} />
          </button>
        </header>

        <p className="confirm__body" id={bodyId}>
          {description}
        </p>

        {/*
          눈으로는 채워지는 띠가 알려주지만 화면을 못 보는 사람에게는 눌리지 않는
          단추만 남는다. **살아나는 순간 한 번만** 알린다 — 매 초 알리면 세 번
          떠들고, 그 사이 취소를 읽던 것을 끊는다.
        */}
        {challenge !== undefined && (
          <label className="confirm__challenge">
            <span className="confirm__challenge-label">{challenge.label}</span>
            <input
              type="text"
              className="confirm__challenge-input"
              value={typed}
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              onChange={(event) => setTyped(event.target.value)}
            />
          </label>
        )}

        <p className="confirm__status" role="status">
          {armed ? `이제 ${confirmLabel} 단추를 누를 수 있다.` : ''}
        </p>

        <footer className="confirm__foot">
          <button type="button" className="confirm__cancel" onClick={onCancel} ref={cancelRef}>
            취소
          </button>
          <button
            type="button"
            className="confirm__arm"
            style={{ '--confirm-progress': armProgress(remaining, delayMs) } as React.CSSProperties}
            disabled={!armed}
            aria-label={
              armed
                ? confirmLabel
                : typedOk
                  ? `${confirmLabel} — ${left}초 뒤에 눌 수 있다`
                  : `${confirmLabel} — ${challenge?.label ?? ''}`
            }
            onClick={() => {
              // 살아나기 전의 탭은 여기까지 오지 않지만, 한 겹 더 둔다.
              // `disabled`는 화면의 약속이고 이 줄은 코드의 약속이다.
              if (!armed) return
              onConfirm()
            }}
          >
            <span className="confirm__arm-label">{confirmLabel}</span>
            {!armed && typedOk && (
              <span className="confirm__arm-count sl-numeral" aria-hidden="true">
                {left}
              </span>
            )}
          </button>
        </footer>
      </div>
    </div>,
    document.body,
  )
}
