import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useScrollLock } from './useScrollLock'
import type { Treasure } from './treasureNet'
import './logview.css'

/**
 * 보물 색인 자세히 보기 — **화면을 통째로 덮는 팝업.**
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ **기록지에는 번호만 두고, 내용은 여기서 본다.**                           │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * 기록지의 보물 칸은 번호 버튼만 늘어놓는다 — 일흔다섯 줄의 글을 시트에 다 펴면
 * 시트가 그만큼 길어진다. 훑어보는 것은 **보는 일**이라 따로 자리를 준다
 * (덱 펼쳐 보기·로그 보기와 같은 짜임, 구현 결정 188).
 *
 * **편집 중이면 여기서도 켜고 끈다.** 초안을 그대로 고치므로 팝업을 닫으면 시트에
 * 그대로 비친다 — 값이 두 곳에 따로 쌓이면 어느 쪽이 맞는지 알 수 없다.
 *
 * 자리 잡기와 알맹이를 가른다(`TreasurePanel`) — `createPortal`은 `document.body`
 * 를 요구해 서버 렌더로 확인할 수 없다(구현 결정 194).
 */
export function TreasureView({
  items,
  found,
  count,
  editing,
  onToggle,
  onClose,
}: {
  items: readonly Treasure[]
  found: ReadonlySet<number>
  /** 표가 비어 있을 때도 늘어놓을 줄 수. */
  count: number
  editing: boolean
  onToggle: (no: number) => void
  onClose: () => void
}) {
  useScrollLock()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return createPortal(
    <div className="logview">
      <TreasurePanel
        items={items}
        found={found}
        count={count}
        editing={editing}
        onToggle={onToggle}
        onClose={onClose}
      />
    </div>,
    document.body,
  )
}

/**
 * 목록 그 자체.
 *
 * **내용을 모두 보여 준다**(2026-09-07, 형님이 정했다).
 *
 * 한동안 획득한 것만 폈다 — 책자가 「이 정보를 알지 마십시오」라고 적어 두었기
 * 때문이다. 그러나 **가리는 쪽이 더 불편했다**: 어느 번호가 무엇인지 확인하려면
 * 먼저 체크해야 했고, 색인이 제대로 들어갔는지 볼 방법도 없었다. 읽을지 말지는
 * 보는 사람이 정할 일이라 판단을 넘겼다.
 *
 * 획득 여부는 왼쪽 체크 표시가 말한다.
 */
export function TreasurePanel({
  items,
  found,
  count,
  editing,
  onToggle,
  onClose,
}: {
  items: readonly Treasure[]
  found: ReadonlySet<number>
  count: number
  editing: boolean
  onToggle: (no: number) => void
  onClose: () => void
}) {
  const text = new Map(items.map((t) => [t.no, t.text]))
  const last = Math.max(count, ...items.map((t) => t.no), ...found)
  const numbers = Array.from({ length: last }, (_, i) => i + 1)

  return (
    <section className="logview__panel" role="dialog" aria-modal="true" aria-label="보물 색인">
      <header className="logview__head">
        <h2 className="logview__title">보물 색인</h2>
        <button type="button" className="logview__close" aria-label="닫기" onClick={onClose}>
          ×
        </button>
      </header>

      <p className="tre__lead">
        {editing
          ? `줄을 눌러 획득을 표시한다. 지금 ${found.size}개.`
          : `획득한 것에 표시가 붙는다. 지금 ${found.size}개.`}
      </p>

      <ol className="tre__rows">
        {numbers.map((no) => {
          const on = found.has(no)
          const body = text.get(no)
          return (
            <li key={no} className={`tre__row${on ? ' tre__row--on' : ''}`}>
              <button
                type="button"
                className="tre__rowbtn"
                disabled={!editing}
                aria-pressed={on}
                aria-label={`보물 ${no}번${on ? ' — 획득함' : ''}`}
                onClick={() => onToggle(no)}
              >
                <span className={`tre__check${on ? ' tre__check--on' : ''}`} aria-hidden="true" />
                <b className="tre__no sl-numeral">{no}</b>
                {/* 획득 여부와 상관없이 내용을 보여 준다 — 가릴지는 보는 사람이 정한다. */}
                <span className={`tre__text${on ? '' : ' tre__text--off'}`}>
                  {body ?? <i className="tre__unknown">색인에 이 번호가 없다</i>}
                </span>
              </button>
            </li>
          )
        })}
      </ol>
    </section>
  )
}
