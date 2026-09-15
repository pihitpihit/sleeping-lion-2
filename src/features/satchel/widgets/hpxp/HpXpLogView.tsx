import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useScrollLock } from '../../../campaign/useScrollLock'
import { CloseIcon } from '../../board/frameIcons'
import { hpFillOf, type HpFill, type HpXpLogRow, type HpXpTrack } from './hpxp'
import { TrackMark } from './TrackMark'

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
  rows,
  maxHp,
  onClose,
}: {
  /** 누구의 것인가. 캐릭터를 안 골랐으면 빈 글자다. */
  who: string
  rows: readonly HpXpLogRow[]
  /** 고른 캐릭터의 최대 체력. 모르면 `null`이며 그때는 아무것도 물들이지 않는다. */
  maxHp: number | null
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
      <HpXpLogPanel who={who} rows={rows} maxHp={maxHp} onClose={onClose} />
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
  rows,
  maxHp,
  onClose,
}: {
  who: string
  rows: readonly HpXpLogRow[]
  maxHp: number | null
  onClose: () => void
}) {
  return (
    <section className="logview__panel" role="dialog" aria-modal="true" aria-label="체력·경험 기록">
      <header className="logview__head">
        <h2 className="logview__title">{who === '' ? '체력·경험' : who}</h2>
        <button type="button" className="logview__close" aria-label="닫기" onClick={onClose}>
          <CloseIcon size={20} />
        </button>
      </header>

      {rows.length === 0 ? (
        <p className="logview__empty">아직 판이 열리지 않았다.</p>
      ) : (
        <ol className="hplog__rounds">
          {rows.map((row) => (
            <li key={row.round} className="hplog__round">
              <span className="hplog__no sl-numeral">R{row.round}</span>
              {/*
                ┌──────────────────────────────────────────────────────────┐
                │ **한 줄에 값과 증감을 함께 적는다**(형님이 정했다).       │
                └──────────────────────────────────────────────────────────┘

                라운드마다 두 줄이던 것을 접었다 — 찍어 둔 값이 연달아 있으면
                그 차이가 곧 증감이라 **같은 것을 두 번 말하고 있었다.**
              */}
              <span className="hplog__cells">
                <Cell
                  track="hp"
                  value={row.hp}
                  delta={row.hpDelta}
                  fill={hpFillOf(row.hp, maxHp)}
                />
                <Cell track="xp" value={row.xp} delta={row.xpDelta} fill="none" />
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}

/**
 * 한 칸 — 라운드가 열렸을 때의 값과, 그 라운드에 움직인 만큼.
 *
 * **괄호는 안 두른다**(형님이 정했다) — 색과 부호가 이미 「이것은 움직인 만큼」이라고
 * 말한다. 괄호까지 두르면 같은 말을 두 번 한다.
 *
 * **안 움직였으면 아예 안 적는다** — `+0`이 붙으면 무언가 있었던 것처럼 읽힌다
 * (`priceModifierLabel`이 0을 「그대로」라 적는 것과 같은 결).
 */
function Cell({
  track,
  value,
  delta,
  fill,
}: {
  track: HpXpTrack
  value: number
  delta: number
  /**
   * 그 라운드가 열렸을 때 최대 체력에 닿아 있었는가.
   *
   * **다이얼과 같은 눈으로 본다** — 판 위에서 녹색이던 것이 기록에서는 아무 색도
   * 아니면 같은 사실인 줄 모른다(구현 결정 255·319).
   */
  fill: HpFill
}) {
  return (
    <span
      className={`hplog__cell hplog__cell--${track}${fill === 'none' ? '' : ` hplog__cell--${fill}`}`}
    >
      {/*
        **글자 대신 그림이다**(형님이 정했다). 여기서는 수를 안 얹는다 — 값과
        증감이 옆에 서므로 그림 안에까지 넣으면 어느 것이 무엇인지 흐려진다.
      */}
      <TrackMark track={track} size={26} />
      <b className="sl-numeral">{value}</b>
      {delta !== 0 && (
        <span
          className="hplog__delta sl-numeral"
          aria-label={`${Math.abs(delta)} ${delta > 0 ? '오름' : '깎임'}`}
        >
          {/* U+2212(빼기표). 하이픈보다 획이 굵고 더하기표와 길이가 맞는다. */}
          {delta > 0 ? `+${delta}` : `−${Math.abs(delta)}`}
        </span>
      )}
    </span>
  )
}
