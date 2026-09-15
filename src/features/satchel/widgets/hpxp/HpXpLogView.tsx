import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useScrollLock } from '../../../campaign/useScrollLock'
import { CloseIcon } from '../../board/frameIcons'
import { TRACK_LABEL, type HpXpLogEntry, type HpXpRoundMark } from './hpxp'

// **껍데기 스타일을 스스로 들여온다**(구현 결정 189·356). 행낭에서는 일지의
// 스타일시트가 안 실리므로, 안 들여오면 팝업이 스타일 없이 떠 안 보인다.
import '../../../campaign/logview.css'

/**
 * 체력·경험이 언제 얼마나 움직였나 — **화면을 통째로 덮는 팝업.**
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ **판이 끝나면 함께 사라진다 — 어디에도 남기지 않는다.**                   │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * 축 ②의 휘발성 런타임이다(SPEC 5.2). 라운드 트래커에서 판을 새로 시작하면 함께
 * 내려간다 — 지난 판의 「3라운드에 5 깎였다」가 남아 있으면 이번 판의 기록으로
 * 읽힌다.
 *
 * 자리 잡기와 알맹이를 가른다(`HpXpLogPanel`) — `createPortal`은 `document.body`를
 * 요구해 서버 렌더로 확인할 수 없다(구현 결정 194).
 */
export function HpXpLogView({
  who,
  entries,
  marks,
  onClose,
}: {
  /** 누구의 것인가. 캐릭터를 안 골랐으면 빈 글자다. */
  who: string
  entries: readonly HpXpLogEntry[]
  marks: readonly HpXpRoundMark[]
  onClose: () => void
}) {
  useScrollLock()

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
      <HpXpLogPanel who={who} entries={entries} marks={marks} onClose={onClose} />
    </div>,
    document.body,
  )
}

/**
 * 기록 그 자체.
 *
 * **라운드마다 한 줄이고 칸마다 한 마디다.** 한 라운드에 체력도 깎이고 경험도
 * 올랐으면 그 줄에 둘이 나란히 선다 — 라운드가 묶는 단위라야 「그때 무슨 일이
 * 있었나」로 읽힌다.
 */
export function HpXpLogPanel({
  who,
  entries,
  marks,
  onClose,
}: {
  who: string
  entries: readonly HpXpLogEntry[]
  marks: readonly HpXpRoundMark[]
  onClose: () => void
}) {
  /* 늦은 라운드가 위로. 방금 있었던 일을 가장 자주 묻는다(행적과 같은 결). */
  const rounds = [...new Set([...marks.map((m) => m.round), ...entries.map((e) => e.round)])].sort(
    (a, b) => b - a,
  )

  return (
    <section className="logview__panel" role="dialog" aria-modal="true" aria-label="체력·경험 기록">
      <header className="logview__head">
        <h2 className="logview__title">{who === '' ? '체력·경험' : who}</h2>
        <button type="button" className="logview__close" aria-label="닫기" onClick={onClose}>
          <CloseIcon size={20} />
        </button>
      </header>

      {rounds.length === 0 ? (
        <p className="logview__empty">아직 판이 열리지 않았다.</p>
      ) : (
        <ol className="hplog__rounds">
          {rounds.map((round) => (
            <li key={round} className="hplog__round">
              <span className="hplog__no sl-numeral">R{round}</span>
              <span className="hplog__body">
                {/*
                  **라운드가 열릴 때의 값.** 움직인 만큼만으로는 「그때 몇이었나」를
                  알 수 없다 — 이 줄만 보고도 판이 읽혀야 한다.
                */}
                {(() => {
                  const mark = marks.find((m) => m.round === round)
                  if (mark === undefined) return null
                  return (
                    <span className="hplog__mark">
                      {TRACK_LABEL.hp} <b className="sl-numeral">{mark.hp}</b>
                      <span className="hplog__dot" aria-hidden="true">
                        ·
                      </span>
                      {TRACK_LABEL.xp} <b className="sl-numeral">{mark.xp}</b>
                    </span>
                  )
                })()}

                <span className="hplog__deltas">
                  {entries
                    .filter((e) => e.round === round)
                    .map((e, i) => (
                      <span key={i} className={`hplog__delta hplog__delta--${e.track}`}>
                        {TRACK_LABEL[e.track]}{' '}
                        <b className="sl-numeral">
                          {/* U+2212(빼기표). 하이픈보다 획이 굵고 더하기표와 길이가 맞는다. */}
                          {e.delta > 0 ? `+${e.delta}` : `−${Math.abs(e.delta)}`}
                        </b>
                      </span>
                    ))}
                </span>
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
