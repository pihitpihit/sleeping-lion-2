import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useScrollLock } from '../../campaign/useScrollLock'
import { useTreasureStore } from '../../campaign/treasureStore'
import { TreasureList } from '../../reference/TreasureReference'
import { CloseIcon } from '../board/frameIcons'

// **껍데기 스타일을 스스로 들여온다**(구현 결정 189·356). 행낭에서는 일지의
// 스타일시트가 안 실리므로, 안 들여오면 팝업이 스타일 없이 떠 안 보인다(구현 결정 565).
import '../../campaign/logview.css'

/**
 * 행낭의 보물상자 — **판 도중에 보물 색인을 찾아본다.**
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ **일지까지 나갔다 오지 않게 한다**(형님이 정했다).                        │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * 타일을 열면 그 자리에서 번호를 찾아본다. 그때마다 일지의 기록지나 참조로
 * 나가면 판이 멎는다 — 행낭 띠에서 곧바로 띄운다.
 *
 * **참조의 목록을 그대로 쓴다**(`TreasureList`). 같은 표를 두 벌로 그리면 언젠가
 * 어긋난다. 그래서 여기에도 「찾았는가」가 없다 — 행낭은 어느 파티의 것인지
 * 모를 때가 있고, 찾은 것을 켜는 일은 기록지가 한다.
 *
 * 글은 DB에서 온다(`0041`) — 레포에는 없다(절대 원칙 1).
 */
export function TreasurePopup({ onClose }: { onClose: () => void }) {
  const items = useTreasureStore((s) => s.items)
  const load = useTreasureStore((s) => s.load)
  useScrollLock()

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      // 행낭이 같은 키를 듣고 있다(편집 모드 나가기). 여기서 멈춘다.
      e.stopPropagation()
      onClose()
    }
    document.addEventListener('keydown', onKey, true)
    return () => document.removeEventListener('keydown', onKey, true)
  }, [onClose])

  return createPortal(
    <div className="logview">
      <section className="logview__panel" role="dialog" aria-modal="true" aria-label="보물 색인">
        <header className="logview__head">
          <h2 className="logview__title">보물 색인</h2>
          <button type="button" className="logview__close" aria-label="닫기" onClick={onClose}>
            <CloseIcon size={20} />
          </button>
        </header>
        <TreasureList items={items} />
      </section>
    </div>,
    document.body,
  )
}
