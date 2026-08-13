import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { describeChange, whenText, type LogEntry } from './characterLog'
import { fetchLog } from './characterNet'

/**
 * 캐릭터 기록 보기 — **화면을 통째로 덮는 팝업.**
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ **정산이 맞았는지는 나중에야 묻는다.**                                    │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * 시나리오가 끝나면 골드·경험·체크마크가 한꺼번에 움직이고, 다음 판에서 "이거
 * 지난번에 올린 거 맞나"를 묻게 된다. 캐릭터 필드는 현재값만 들고 있으므로
 * (구현 결정 1) 물어볼 데가 따로 있어야 한다.
 *
 * 덱 펼쳐 보기와 같은 짜임이다 — 자리 잡기와 알맹이를 갈라 두어(`LogPanel`)
 * 서버 렌더로 확인할 수 있다(구현 결정 194). 나가는 길은 × 단추와 Escape뿐이고,
 * **바깥 누르기는 두지 않는다**: 화면을 통째로 덮으면서 바깥이랄 것이 없어졌고
 * 남은 빈 자리는 손을 얹어 구르는 자리다(구현 결정 195).
 */
export function LogView({ characterId, onClose }: { characterId: string; onClose: () => void }) {
  const [entries, setEntries] = useState<LogEntry[] | null>(null)
  const [failed, setFailed] = useState(false)
  /*
    **지금 시각은 열 때 한 번만 잰다.** 렌더 중에 `Date.now()`를 부르면 같은
    입력에 다른 결과가 나와 렌더를 되돌릴 수 없다(`react-hooks/purity`,
    구현 결정 12와 같은 자리). 팝업이 떠 있는 동안 「3분 전」이 멎어 있어도
    되는 자리다 — 닫았다 열면 다시 잰다.
  */
  const [now] = useState(() => Date.now())

  useEffect(() => {
    let alive = true
    fetchLog(characterId)
      .then((rows) => {
        if (alive) setEntries(rows)
      })
      .catch((cause: unknown) => {
        console.error('[log]', cause)
        if (alive) setFailed(true)
      })
    return () => {
      alive = false
    }
  }, [characterId])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  /*
    **`document.body`에 그린다.** 시트가 `transform`을 걸고 있는 조상 밑에 있으면
    `position: fixed`의 기준이 그리로 옮겨 간다(구현 결정 37).
  */
  return createPortal(
    <div className="logview">
      <LogPanel entries={entries} failed={failed} now={now} onClose={onClose} />
    </div>,
    document.body,
  )
}

/**
 * 기록 목록 그 자체.
 *
 * **시각은 사람의 말로 적는다**(`whenText`) — 「방금」·「3시간 전」·「7월 2일 오후
 * 2시 30분」. 변화도 값이 아니라 우리말로 옮긴다(`describeChange`): 서버에는
 * 값만 담기므로 문구를 고쳐도 옛 기록이 함께 새 말로 읽힌다.
 */
export function LogPanel({
  entries,
  failed,
  now,
  onClose,
}: {
  entries: readonly LogEntry[] | null
  failed: boolean
  now: number
  onClose: () => void
}) {
  return (
    <section className="logview__panel" role="dialog" aria-modal="true" aria-label="고친 기록">
      <header className="logview__head">
        <h2 className="logview__title">고친 기록</h2>
        <button type="button" className="logview__close" aria-label="닫기" onClick={onClose}>
          ×
        </button>
      </header>

      {failed ? (
        <p className="logview__empty">기록을 불러오지 못했다.</p>
      ) : entries === null ? (
        <p className="logview__empty">읽는 중…</p>
      ) : entries.length === 0 ? (
        <p className="logview__empty">아직 고친 것이 없다.</p>
      ) : (
        <ol className="logview__list">
          {entries.map((entry) => (
            <li key={entry.id} className="logview__entry">
              <span className="logview__when">{whenText(entry.at, now)}</span>
              <ul className="logview__changes">
                {entry.changes.map((change, i) => (
                  <li key={i}>{describeChange(change)}</li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
