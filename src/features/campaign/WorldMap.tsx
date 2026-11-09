import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useScrollLock } from './useScrollLock'
import type { Scenario } from './scenarioNet'
import { STATE_LABEL, type StoredState } from './scenarioState'
import {
  MAP_FILE,
  clampZoom,
  placement,
  stepZoom,
  stickerFile,
  stickersFor,
  type Sticker,
} from './worldMapSpots'
import { mapUrls } from './worldMapNet'
import './logview.css'
import './WorldMap.css'

/**
 * 세계 지도 — **해금한 시나리오에 스티커가 붙은 실물 지도를 그대로 본다**(`0051`).
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ **그림은 비공개 버킷에서 받는다. 못 받아도 기록지는 그대로 선다.**        │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * 지도와 스티커는 Cephalofair의 그림이라 레포·배포물에 넣지 않았다 — 승인된
 * 사람의 세션으로만 잠깐 사는 주소를 받는다(`worldMapNet`). 서버에 못 닿으면 그
 * 사실만 적는다(절대 원칙 3: 지도는 있어도 그만인 화면이다).
 *
 * 자리 잡기(`WorldMap`)와 알맹이(`WorldMapPanel`)를 가른다 — `createPortal`은
 * `document.body`를 요구해 서버 렌더로 확인할 수 없다(구현 결정 194).
 */
export function WorldMap({
  list,
  states,
  onClose,
}: {
  list: readonly Scenario[]
  states: Record<number, StoredState>
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

  const stickers = stickersFor(list, states)
  const names = [MAP_FILE, ...stickers.map((s) => stickerFile(s.no))].join('|')

  const [urls, setUrls] = useState<Record<string, string> | null>(null)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    let alive = true
    mapUrls(names.split('|'))
      .then((got) => {
        if (alive) setUrls(got)
      })
      .catch((cause) => {
        console.error('[world-map]', cause)
        if (alive) setFailed(true)
      })
    return () => {
      alive = false
    }
  }, [names])

  return createPortal(
    <div className="logview">
      <WorldMapPanel stickers={stickers} urls={urls} failed={failed} onClose={onClose} />
    </div>,
    document.body,
  )
}

/** 이 이상 움직였으면 누른 것이 아니라 끈 것이다. */
const TAP_SLOP_PX = 6

/**
 * 지도 그 자체 — 값만 받는다.
 *
 * **끌기와 벌리기를 직접 받는다**(`touch-action: none`). 브라우저에 끌기를 맡기면
 * 둘째 손가락이 닿기 전에 브라우저가 첫째를 가져가 벌리기가 안 잡힌다 — 둘을 한
 * 곳에서 셈해야 엉키지 않는다. 마우스 휠은 그대로 굴린다.
 *
 * 키울 때는 **가운데(벌리면 두 손가락 사이)를 붙든 채** 키운다 — 보던 자리가
 * 화면 밖으로 달아나지 않는다.
 */
export function WorldMapPanel({
  stickers,
  urls,
  failed,
  onClose,
  initialSize = null,
}: {
  stickers: readonly Sticker[]
  urls: Record<string, string> | null
  failed: boolean
  onClose: () => void
  /** 지도 그림의 크기. 보통은 그림이 불러진 뒤 스스로 알려 준다 — 시험에서만 넘긴다. */
  initialSize?: { w: number; h: number } | null
}) {
  const [size, setSize] = useState(initialSize)
  const [zoom, setZoom] = useState(1)
  const [picked, setPicked] = useState<number | null>(null)

  const viewport = useRef<HTMLDivElement>(null)
  /** 키운 뒤 붙들 자리 — 지도 위의 비율과 그 자리가 화면 어디에 있었나. */
  const anchor = useRef<{ fx: number; fy: number; vx: number; vy: number } | null>(null)
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const gesture = useRef<{
    startX: number
    startY: number
    moved: boolean
    pinchDist: number | null
    pinchZoom: number
    /** 손가락이 닿은 스티커. 지도가 포인터를 붙들므로 스티커는 클릭을 못 받는다. */
    on: number | null
  }>({ startX: 0, startY: 0, moved: false, pinchDist: null, pinchZoom: 1, on: null })

  /** 화면의 (vx, vy)를 붙든 채 배율을 바꾼다. */
  function zoomAt(next: number, vx: number, vy: number) {
    const el = viewport.current
    const z = clampZoom(next)
    if (!el || z === zoom) return
    anchor.current = {
      fx: (el.scrollLeft + vx) / el.scrollWidth,
      fy: (el.scrollTop + vy) / el.scrollHeight,
      vx,
      vy,
    }
    setZoom(z)
  }

  function zoomCenter(dir: 1 | -1) {
    const el = viewport.current
    if (!el) return
    zoomAt(stepZoom(zoom, dir), el.clientWidth / 2, el.clientHeight / 2)
  }

  // 배율이 바뀐 뒤 그려진 크기로 붙든 자리를 되돌린다 — 그리기 전에 맞춰야 튀지 않는다.
  useLayoutEffect(() => {
    const el = viewport.current
    const a = anchor.current
    if (!el || !a) return
    el.scrollLeft = a.fx * el.scrollWidth - a.vx
    el.scrollTop = a.fy * el.scrollHeight - a.vy
    anchor.current = null
  }, [zoom])

  function onDown(e: React.PointerEvent<HTMLDivElement>) {
    e.currentTarget.setPointerCapture(e.pointerId)
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    const g = gesture.current
    if (pointers.current.size === 1) {
      g.startX = e.clientX
      g.startY = e.clientY
      g.moved = false
      g.pinchDist = null
      const hit = (e.target as HTMLElement).closest<HTMLElement>('[data-no]')
      g.on = hit ? Number(hit.dataset.no) : null
    } else if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()]
      g.pinchDist = Math.hypot(a.x - b.x, a.y - b.y)
      g.pinchZoom = zoom
      g.moved = true
    }
  }

  function onMove(e: React.PointerEvent<HTMLDivElement>) {
    const prev = pointers.current.get(e.pointerId)
    const el = viewport.current
    if (!prev || !el) return
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    const g = gesture.current

    if (pointers.current.size >= 2 && g.pinchDist) {
      const [a, b] = [...pointers.current.values()]
      const dist = Math.hypot(a.x - b.x, a.y - b.y)
      const r = el.getBoundingClientRect()
      zoomAt(g.pinchZoom * (dist / g.pinchDist), (a.x + b.x) / 2 - r.left, (a.y + b.y) / 2 - r.top)
      return
    }

    if (Math.hypot(e.clientX - g.startX, e.clientY - g.startY) > TAP_SLOP_PX) g.moved = true
    el.scrollLeft -= e.clientX - prev.x
    el.scrollTop -= e.clientY - prev.y
  }

  function onUp(e: React.PointerEvent<HTMLDivElement>) {
    pointers.current.delete(e.pointerId)
    if (pointers.current.size > 0) return
    const g = gesture.current
    g.pinchDist = null
    /*
      **누름은 여기서 가린다.** 지도가 포인터를 붙들고 있어 클릭이 스티커가 아니라
      지도로 간다 — 끌지 않고 뗐으면 닿았던 스티커를 고른다. 빈 데를 누르면 내린다.
    */
    if (e.type === 'pointerup' && !g.moved) pick(g.on)
  }

  function pick(no: number | null) {
    setPicked((cur) => (no === null || cur === no ? null : no))
  }

  const mapUrl = urls?.[MAP_FILE]
  const chosen = stickers.find((s) => s.no === picked) ?? null

  return (
    <section className="logview__panel wmap" role="dialog" aria-modal="true" aria-label="세계 지도">
      <header className="logview__head">
        <h2 className="logview__title">세계 지도</h2>
        <span className="wmap__zoom">
          <button
            type="button"
            className="wmap__zbtn"
            aria-label="줄이기"
            disabled={zoom <= 1}
            onClick={() => zoomCenter(-1)}
          >
            −
          </button>
          <button
            type="button"
            className="wmap__zbtn"
            aria-label="키우기"
            disabled={zoom >= 4}
            onClick={() => zoomCenter(1)}
          >
            +
          </button>
        </span>
        <button type="button" className="logview__close" aria-label="닫기" onClick={onClose}>
          ×
        </button>
      </header>

      <p className="wmap__legend">
        <span className="wmap__key wmap__key--open">{STATE_LABEL.open}</span>
        <span className="wmap__key wmap__key--done">{STATE_LABEL.done}</span>
        <span className="wmap__key wmap__key--blocked">{STATE_LABEL.blocked}</span>
        <span className="wmap__hint">스티커를 누르면 이름이 나온다.</span>
      </p>

      {failed ? (
        <p className="logview__empty">지도를 받지 못했다. 서버에 닿는지 확인한다.</p>
      ) : urls === null ? (
        <p className="logview__empty">지도를 받는 중.</p>
      ) : !mapUrl ? (
        <p className="logview__empty">
          지도 그림이 아직 없다. 공개 레포에 담지 않으므로 <a href="#/admin">주인장 화면</a>에서
          올린다.
        </p>
      ) : (
        <div
          ref={viewport}
          className="wmap__viewport"
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
        >
          <div className="wmap__sheet" style={{ width: `${zoom * 100}%` }}>
            <img
              className="wmap__map"
              src={mapUrl}
              alt="글룸헤이븐 세계 지도"
              draggable={false}
              onLoad={(e) =>
                setSize({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })
              }
            />
            {size !== null &&
              stickers.map((s) => {
                const url = urls[stickerFile(s.no)]
                if (!url) return null
                return (
                  <button
                    key={s.no}
                    type="button"
                    className={`wmap__sticker wmap__sticker--${s.state}${picked === s.no ? ' wmap__sticker--picked' : ''}`}
                    style={placement(s.spot, size.w, size.h)}
                    data-no={s.no}
                    aria-label={`#${s.no} ${s.name} — ${STATE_LABEL[s.state]}`}
                    // 키보드로 누른 것만 여기서 받는다(`detail`이 0). 손가락은 `onUp`이 받는다.
                    onClick={(e) => {
                      if (e.detail === 0) pick(s.no)
                    }}
                  >
                    <img src={url} alt="" draggable={false} />
                  </button>
                )
              })}
          </div>
        </div>
      )}

      {/* 누른 스티커의 이름. 지도 위에 띄우면 손가락에 가린다 — 아래에 붙인다. */}
      <p className="wmap__caption" aria-live="polite">
        {chosen ? (
          <>
            <b className="sl-numeral">#{chosen.no}</b> {chosen.name}{' '}
            <span className={`wmap__key wmap__key--${chosen.state}`}>
              {STATE_LABEL[chosen.state]}
            </span>
          </>
        ) : (
          `붙은 스티커 ${stickers.length}장`
        )}
      </p>
    </section>
  )
}
