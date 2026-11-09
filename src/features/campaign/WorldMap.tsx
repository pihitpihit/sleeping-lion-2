import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useScrollLock } from './useScrollLock'
import type { MapSpot, Scenario } from './scenarioNet'
import { arrowsOf, type ScenarioGraph } from './scenarioLinks'
import { STATE_LABEL, type StoredState } from './scenarioState'
import {
  MAP_FILE,
  arrowPath,
  clampZoom,
  fitZoom,
  placement,
  stepZoom,
  stickerFile,
  stickersFor,
  type Sticker,
} from './worldMapSpots'
import { mapUrls } from './worldMapNet'
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
  graph,
  focus = null,
  onClose,
}: {
  list: readonly Scenario[]
  states: Record<number, StoredState>
  /** 시나리오끼리의 연결. 못 읽었으면 `null` — 그때는 화살표가 없다. */
  graph: ScenarioGraph | null
  /** 이 시나리오의 스티커를 고른 채 그 자리를 가운데에 두고 연다. */
  focus?: number | null
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
    <WorldMapPanel
      stickers={stickers}
      urls={urls}
      failed={failed}
      onClose={onClose}
      spots={spotsOf(list)}
      states={states}
      graph={graph}
      initialPicked={focus}
    />,
    document.body,
  )
}

type ArrowDir = 'out' | 'will' | 'block' | 'in'
const ARROW_DIRS: readonly ArrowDir[] = ['out', 'will', 'block', 'in']

const NO_SPOTS: ReadonlyMap<number, MapSpot> = new Map()
const NO_STATES: Record<number, StoredState> = {}

/** 번호 → 지도 자리. **닫힌 것도 든다** — 화살표는 스티커가 없는 동그라미로도 간다. */
function spotsOf(list: readonly Scenario[]): ReadonlyMap<number, MapSpot> {
  const out = new Map<number, MapSpot>()
  for (const s of list) if (s.map) out.set(s.no, s.map)
  return out
}

/** 이 이상 움직였으면 누른 것이 아니라 끈 것이다. */
const TAP_SLOP_PX = 6
/** 두 번 누름으로 치는 사이. */
const DOUBLE_TAP_MS = 300

/**
 * 지도 그 자체 — 값만 받는다.
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ **틀 없이 화면을 가득 채운다. 떠 있는 것은 우상단의 닫기 단추뿐이다.**    │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * 머리·범례·배율 단추를 두었다가 걷었다(형님이 정했다) — 지도가 화면의 주인이어야
 * 한다. 처음에는 **화면을 덮는 크기**(cover)로 펴고 가운데를 보여 준다: 세로 폰이면
 * 위아래가 꽉 차고 옆으로 끌어 본다. 스티커를 누르면 그때만 아래에 이름이 뜬다.
 *
 * **끌기와 벌리기를 직접 받는다**(`touch-action: none`). 브라우저에 끌기를 맡기면
 * 둘째 손가락이 닿기 전에 브라우저가 첫째를 가져가 벌리기가 안 잡힌다. 단추가 없으니
 * **두 번 누르면 한 단계 키우고**(끝에서는 처음 크기로), 트랙패드 벌리기(ctrl+휠)도
 * 받는다. 키울 때는 그 자리를 붙든 채 키운다 — 보던 곳이 달아나지 않는다.
 */
export function WorldMapPanel({
  stickers,
  urls,
  failed,
  onClose,
  spots = NO_SPOTS,
  states = NO_STATES,
  graph = null,
  initialSize = null,
  initialPicked = null,
}: {
  stickers: readonly Sticker[]
  urls: Record<string, string> | null
  failed: boolean
  onClose: () => void
  /** 화살표의 끝을 찾을 자리 — 닫힌 시나리오까지 든다. */
  spots?: ReadonlyMap<number, MapSpot>
  states?: Record<number, StoredState>
  graph?: ScenarioGraph | null
  /** 지도 그림의 크기. 보통은 그림이 불러진 뒤 스스로 알려 준다 — 시험에서만 넘긴다. */
  initialSize?: { w: number; h: number } | null
  /** 처음부터 고른 스티커. 처음 펼 때 그 자리를 가운데에 둔다. */
  initialPicked?: number | null
}) {
  const [size, setSize] = useState(initialSize)
  const [zoom, setZoom] = useState(1)
  const [picked, setPicked] = useState<number | null>(initialPicked)
  /** 화면(지도 칸)의 크기. 덮는 크기를 셈하려면 알아야 한다. */
  const [view, setView] = useState<{ w: number; h: number } | null>(null)

  const viewport = useRef<HTMLDivElement>(null)
  /** 키운 뒤 붙들 자리 — 지도 위의 비율과 그 자리가 화면 어디에 있었나. */
  const anchor = useRef<{ fx: number; fy: number; vx: number; vy: number } | null>(null)
  const centered = useRef(false)
  const lastTap = useRef<{ at: number; x: number; y: number } | null>(null)
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

  /** 배율 1에서의 지도 폭(px) — 화면을 남김없이 덮는 크기다. */
  const base = size !== null && view !== null ? Math.max(view.w, (view.h * size.w) / size.h) : null

  /** 오므릴 수 있는 바닥 — 지도가 화면 안에 통째로 드는 배율. */
  const minZoom = size !== null && view !== null ? fitZoom(view, size) : 1

  /** 화면의 (vx, vy)를 붙든 채 배율을 바꾼다. */
  function zoomAt(next: number, vx: number, vy: number) {
    const el = viewport.current
    const z = clampZoom(next, minZoom)
    if (!el || z === zoom) return
    anchor.current = {
      fx: (el.scrollLeft + vx) / el.scrollWidth,
      fy: (el.scrollTop + vy) / el.scrollHeight,
      vx,
      vy,
    }
    setZoom(z)
  }

  /*
    휠 리스너는 한 번 붙이고 그대로 두므로 그때의 함수를 붙들면 옛 배율로 셈한다 —
    늘 지금 것을 보게 한 칸 건너 둔다.
  */
  const zoomAtRef = useRef(zoomAt)
  const zoomRef = useRef(zoom)
  useLayoutEffect(() => {
    zoomAtRef.current = zoomAt
    zoomRef.current = zoom
  })

  // 화면 크기를 따라간다 — 폰을 돌리면 덮는 크기가 바뀐다.
  useEffect(() => {
    const el = viewport.current
    if (!el) return
    const ro = new ResizeObserver(() => setView({ w: el.clientWidth, h: el.clientHeight }))
    ro.observe(el)
    return () => ro.disconnect()
  }, [urls])

  // 트랙패드 벌리기는 ctrl+휠로 온다. 막으려면 수동 리스너여야 한다(React의 휠은 passive).
  useEffect(() => {
    const el = viewport.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey) return
      e.preventDefault()
      const r = el.getBoundingClientRect()
      zoomAtRef.current(
        zoomRef.current * Math.exp(-e.deltaY / 200),
        e.clientX - r.left,
        e.clientY - r.top,
      )
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [urls])

  // 배율이 바뀐 뒤 그려진 크기로 붙든 자리를 되돌린다 — 그리기 전에 맞춰야 튀지 않는다.
  // 처음 크기가 정해지면 가운데를 보여 준다.
  useLayoutEffect(() => {
    const el = viewport.current
    if (!el || base === null) return
    const a = anchor.current
    if (a) {
      el.scrollLeft = a.fx * el.scrollWidth - a.vx
      el.scrollTop = a.fy * el.scrollHeight - a.vy
      anchor.current = null
    } else if (!centered.current) {
      // 고르고 연 스티커가 있으면 그 자리를, 없으면 지도 가운데를 보인다.
      const at = stickers.find((s) => s.no === initialPicked)?.spot
      const fx = at && size ? (at.x + at.w / 2) / size.w : 0.5
      const fy = at && size ? (at.y + at.h / 2) / size.h : 0.5
      el.scrollLeft = fx * el.scrollWidth - el.clientWidth / 2
      el.scrollTop = fy * el.scrollHeight - el.clientHeight / 2
      centered.current = true
    }
  }, [zoom, base, initialPicked, size, stickers])

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
    if (e.type !== 'pointerup' || g.moved) return

    /*
      **누름은 여기서 가린다.** 지도가 포인터를 붙들고 있어 클릭이 스티커가 아니라
      지도로 간다 — 끌지 않고 뗐으면 닿았던 스티커를 고른다. 빈 데를 누르면 내린다.
      잇달아 두 번 누르면 그 자리를 붙든 채 한 단계 키운다(끝이면 처음으로).
    */
    const now = e.timeStamp
    const prev = lastTap.current
    if (
      prev &&
      now - prev.at < DOUBLE_TAP_MS &&
      Math.hypot(e.clientX - prev.x, e.clientY - prev.y) < TAP_SLOP_PX * 4
    ) {
      lastTap.current = null
      const r = viewport.current!.getBoundingClientRect()
      zoomAt(zoom >= 4 ? 1 : stepZoom(zoom, 1), e.clientX - r.left, e.clientY - r.top)
      return
    }
    lastTap.current = { at: now, x: e.clientX, y: e.clientY }
    pick(g.on)
  }

  function pick(no: number | null) {
    setPicked((cur) => (no === null || cur === no ? null : no))
  }

  const mapUrl = urls?.[MAP_FILE]
  const chosen = stickers.find((s) => s.no === picked) ?? null

  /*
    누른 스티커의 화살표(형님이 정했다).
      * 완료면 깨서 연 곳으로 **나가는 파란 점선**
      * 안 깼으면 깨면 열릴 곳으로 **나가는 옅은 파란 점선**(촘촘한 점)
      * 막는 곳으로 **나가는 주황 점선, 촉 대신 막대**
      * 시작 시나리오가 아니면 열어 준 곳에서 **들어오는 빨간 점선**
    시작 시나리오는 들어올 곳이 없어 보랏빛으로 숨 쉰다(CSS). 자리를 모르는 끝은 안 긋는다.
  */
  const arrows = chosen ? arrowsOf(graph, chosen.no, states, chosen.initial) : null
  const lines: { key: string; d: string; dir: ArrowDir }[] = []
  if (chosen && arrows) {
    const push = (dir: ArrowDir, other: number, outward: boolean) => {
      const spot = spots.get(other)
      if (!spot) return
      const d = outward ? arrowPath(chosen.spot, spot) : arrowPath(spot, chosen.spot)
      if (d) lines.push({ key: `${dir}${other}`, d, dir })
    }
    for (const to of arrows.out) push('out', to, true)
    for (const to of arrows.will) push('will', to, true)
    for (const to of arrows.blocks) push('block', to, true)
    for (const from of arrows.in) push('in', from, false)
  }

  return (
    <section className="wmap" role="dialog" aria-modal="true" aria-label="세계 지도">
      {failed ? (
        <p className="wmap__note">지도를 받지 못했다. 서버에 닿는지 확인한다.</p>
      ) : urls === null ? (
        <p className="wmap__note">지도를 받는 중.</p>
      ) : !mapUrl ? (
        <p className="wmap__note">
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
          <div
            className="wmap__sheet"
            style={{ width: base === null ? `${zoom * 100}%` : `${base * zoom}px` }}
          >
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
                    className={`wmap__sticker wmap__sticker--${s.state}${picked === s.no ? ` wmap__sticker--picked${s.initial ? ' wmap__sticker--start' : ''}` : ''}`}
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
            {/*
              화살표 판 — 지도와 같은 `viewBox`라 지도 픽셀로 그린 길이 키우든 줄이든
              제자리에 선다. 스티커 위에 얹되 손가락은 안 받는다.
            */}
            {size !== null && lines.length > 0 && (
              <svg
                className="wmap__arrows"
                viewBox={`0 0 ${size.w} ${size.h}`}
                preserveAspectRatio="none"
                aria-hidden="true"
                focusable="false"
              >
                <defs>
                  {ARROW_DIRS.map((dir) => (
                    <marker
                      key={dir}
                      id={`wmap-head-${dir}`}
                      className={`wmap__head wmap__head--${dir}`}
                      viewBox="0 0 10 10"
                      refX="8"
                      refY="5"
                      markerUnits="userSpaceOnUse"
                      markerWidth="54"
                      markerHeight="54"
                      orient="auto"
                    >
                      {/* 막힘은 촉이 아니라 가로막는 막대다 — 「여기서 끊긴다」. */}
                      <path d={dir === 'block' ? 'M5 0H10V10H5z' : 'M0 0L10 5L0 10z'} />
                    </marker>
                  ))}
                </defs>
                {lines.map((l) => (
                  <g key={l.key} className={`wmap__arrow wmap__arrow--${l.dir}`}>
                    <path className="wmap__arrow-halo" d={l.d} />
                    <path
                      className="wmap__arrow-line"
                      d={l.d}
                      markerEnd={`url(#wmap-head-${l.dir})`}
                    />
                  </g>
                ))}
              </svg>
            )}
          </div>
        </div>
      )}

      <button type="button" className="wmap__close" aria-label="닫기" onClick={onClose}>
        ×
      </button>

      {/* 누른 스티커의 이름 — 누를 때만 뜬다. 지도 위 손가락 밑이 아니라 아래에 띄운다. */}
      {chosen && (
        <p className="wmap__caption" aria-live="polite">
          <b className="sl-numeral">#{chosen.no}</b> {chosen.name}{' '}
          <span className={`wmap__key wmap__key--${chosen.state}`}>
            {STATE_LABEL[chosen.state]}
          </span>
        </p>
      )}
    </section>
  )
}
