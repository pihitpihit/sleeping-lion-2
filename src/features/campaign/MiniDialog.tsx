import { createPortal } from 'react-dom'
import './MiniDialog.css'

/**
 * 작은 팝업의 껍데기 — **묻고 두어 갈래를 내미는 자리.**
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ **같은 일을 하는 팝업을 두 벌 그리지 않는다.**                            │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * `ConfirmDialog`(축 ②)는 되돌릴 수 없는 일에 뜸을 들이는 팝업이라 갈래가 둘로
 * 못박혀 있다. 여기 것들은 **갈래가 셋이거나 칸을 받는다** — 아이템을 뺄 때
 * (되돌림·그냥·취소), 새 아이템의 값을 적을 때.
 *
 * 뜸은 없다. 이 팝업들이 고치는 것은 초안이거나 곧바로 되돌릴 수 있는 것이다.
 *
 * `document.body`에 그린다(구현 결정 37) — 상점이 이미 `position: fixed`로 떠
 * 있으므로 그 안에 두면 쌓임 맥락이 엉킨다.
 */
export function MiniDialog({
  title,
  label,
  children,
}: {
  title: React.ReactNode
  /** 읽어주는 쪽에 무엇을 묻는 팝업인지. */
  label: string
  children: React.ReactNode
}) {
  return createPortal(
    <div className="mini" role="presentation">
      <section className="mini__panel" role="dialog" aria-modal="true" aria-label={label}>
        <h2 className="mini__title">{title}</h2>
        {children}
      </section>
    </div>,
    document.body,
  )
}
