import { useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { useBoardSize } from '../../useBoardSize'
import { DRAG_THRESHOLD, toLocalDelta } from '../../interaction/gestureMath'
import type { WidgetProps } from '../types'
import { useElementStore } from './elementStore'
import { computeElementLayout } from './layout'
import { ELEMENT_STATE_LABEL, glowOf, nearestSlotState, slotOf, type ElementDef } from './elements'
import { sanitizeElementSettings, visibleElements } from './settings'
import { ElementEffect } from './effects'
import { hasElementEffect } from './effects/registry'
import './ElementTracker.css'

/**
 * 원소 트래커.
 *
 * 홈에 끼워진 석판이 트랙 위를 미끄러진다. 홈에 걸림 자국 셋이 있어 건드리기
 * 전에도 상태가 셋이라는 것이 보인다. 폭이 좁아 미끄러질 수 없으면 홈이 사라지고
 * 석판만 남아 제자리에서 상태만 바뀐다.
 *
 * **규칙을 돌리지 않는다.** 라운드 종료 감쇠는 자동으로 처리하지 않는다(SPEC 1장).
 * 손으로 옮기는 것을 거들 뿐이다.
 */
export function ElementTracker({ mode, rotation, settings }: WidgetProps) {
  const { ref, size } = useBoardSize<HTMLDivElement>()
  const shownElements = visibleElements(sanitizeElementSettings(settings))
  const layout = computeElementLayout(size, shownElements.length)
  const vertical = layout.orientation === 'vertical'

  return (
    <div
      ref={ref}
      className={[
        'elements',
        vertical ? 'elements--vertical' : 'elements--horizontal',
        layout.canSlide && 'elements--sliding',
      ]
        .filter(Boolean)
        .join(' ')}
      role="group"
      aria-label="원소"
    >
      {layout.iconSize > 0 &&
        shownElements.map((element) => (
          <ElementLane
            key={element.id}
            element={element}
            mode={mode}
            rotation={rotation}
            iconSize={layout.iconSize}
            canSlide={layout.canSlide}
            slotOffsets={layout.slotOffsets}
            vertical={vertical}
          />
        ))}
    </div>
  )
}

interface LaneProps {
  element: ElementDef
  mode: WidgetProps['mode']
  rotation: number
  iconSize: number
  canSlide: boolean
  slotOffsets: readonly [number, number, number]
  vertical: boolean
}

function ElementLane({
  element,
  mode,
  rotation,
  iconSize,
  canSlide,
  slotOffsets,
  vertical,
}: LaneProps) {
  const state = useElementStore((s) => s.stateOf(element.id))
  const advance = useElementStore((s) => s.advance)
  const setState = useElementStore((s) => s.setState)
  const laneRef = useRef<HTMLButtonElement | null>(null)

  /**
   * 끄는 동안의 **연속** 위치(px). 칸에 붙이지 않고 손가락을 그대로 따라간다.
   * 끄는 중에 칸마다 튀면 조작감이 나쁘다 — 붙는 것은 손을 뗀 뒤다.
   */
  const [dragOffset, setDragOffset] = useState<number | null>(null)
  const drag = useRef<{
    pointerId: number
    originX: number
    originY: number
    start: number
    moved: boolean
  } | null>(null)
  /** 방금 끌어서 놓았으면 뒤따라오는 click을 삼킨다. 안 그러면 상태가 두 번 바뀐다. */
  const swallowClick = useRef(false)

  // 끄는 중에는 놓일 자리의 모습을 미리 보여준다. 위치는 손가락을 따라간다.
  const shown = dragOffset === null ? state : nearestSlotState(dragOffset, slotOffsets)
  const offset = dragOffset ?? slotOffsets[slotOf(state)]

  /**
   * 칸 전체가 탭 대상이다 — 홈을 눌러도, 석판을 눌러도 다음 상태로 넘어간다.
   * 좁은 화면에서 석판만 눌러야 하면 잘 안 맞는다.
   */
  function onLaneClick() {
    if (mode !== 'play') return
    if (swallowClick.current) {
      swallowClick.current = false
      return
    }
    advance(element.id)
  }

  /** 끄는 것은 석판에서만 시작한다. 홈을 끄는 것은 탭으로 친다. */
  function begin(event: ReactPointerEvent<HTMLSpanElement>) {
    if (mode !== 'play' || !canSlide) return
    event.currentTarget.setPointerCapture(event.pointerId)
    drag.current = {
      pointerId: event.pointerId,
      originX: event.clientX,
      originY: event.clientY,
      start: slotOffsets[slotOf(state)],
      moved: false,
    }
  }

  function move(event: ReactPointerEvent<HTMLSpanElement>) {
    const d = drag.current
    if (!d || d.pointerId !== event.pointerId) return

    /*
      **화면 좌표를 위젯 안쪽으로 돌린 뒤에 축을 고른다.**

      홈은 CSS로 함께 돌아가는데 포인터는 화면 기준으로 온다. 90도로 세우면 홈이
      가로로 보이는데 손은 위아래로 끌어야 움직였다 — 눈과 손이 어긋났다.

      슬라이딩 축은 배치 방향과 수직이다. 가로 배치면 안쪽 세로로, 세로 배치면
      안쪽 가로로 민다.
    */
    const local = toLocalDelta(event.clientX - d.originX, event.clientY - d.originY, rotation)
    const delta = vertical ? local.dx : local.dy
    if (!d.moved && Math.abs(delta) < DRAG_THRESHOLD) return
    d.moved = true

    // 양 끝 슬롯 밖으로는 나가지 않는다. 트랙에 끼워진 판이므로 홈을 벗어날 수 없다.
    const min = slotOffsets[0]
    const max = slotOffsets[slotOffsets.length - 1]
    setDragOffset(Math.min(Math.max(d.start + delta, min), max))
  }

  function end(event: ReactPointerEvent<HTMLSpanElement>) {
    const d = drag.current
    if (!d || d.pointerId !== event.pointerId) return
    drag.current = null

    if (d.moved) {
      // 여기서 처음으로 칸에 붙는다.
      if (dragOffset !== null) {
        setState(element.id, nearestSlotState(dragOffset, slotOffsets))
      }
      // 끌어서 놓은 것은 탭이 아니다. 뒤따라오는 click을 삼킨다.
      swallowClick.current = true
    }
    setDragOffset(null)
  }

  function cancel() {
    if (drag.current?.moved) swallowClick.current = true
    drag.current = null
    setDragOffset(null)
  }

  const customEffect = hasElementEffect(element.id)
  const blazing = shown === 'strong'

  // 빛무리 색은 아이콘 색과 따로 간다. 어둠은 아이콘이 거의 검정이라 그대로
  // 쓰면 어두운 바탕에 묻혀 타오르는지 알 수 없다.
  const glow = glowOf(element)

  const style = {
    '--element-color': element.color,
    '--element-glow': glow.inner,
    '--element-glow-outer': glow.outer,
    '--element-icon': `${iconSize}px`,
    '--element-offset': `${offset}px`,
  } as React.CSSProperties

  return (
    <button
      type="button"
      ref={laneRef}
      className="elements__lane"
      style={style}
      aria-label={`${element.name} — ${ELEMENT_STATE_LABEL[shown]}`}
      tabIndex={mode === 'play' ? 0 : -1}
      onClick={onLaneClick}
    >
      {/* 홈과 걸림 자국은 석판과 **같은 slotOffsets에서** 그린다.
          CSS에서 비율(1/6·3/6·5/6)로 따로 그리면 석판 위치와 어긋난다 —
          실제로 어긋났다. 한 값에서 나와야 맞을 수밖에 없다. */}
      {canSlide && (
        <>
          <span
            className="elements__groove"
            style={
              {
                '--groove-start': `${slotOffsets[0]}px`,
                '--groove-length': `${slotOffsets[2] - slotOffsets[0]}px`,
              } as React.CSSProperties
            }
            aria-hidden="true"
          />
          {slotOffsets.map((slot, i) => (
            <span
              key={i}
              className="elements__detent"
              style={{ '--detent-at': `${slot}px` } as React.CSSProperties}
              aria-hidden="true"
            />
          ))}
        </>
      )}

      {/* 고유 효과는 아이콘 뒤에 깔린다. 타오를 때만 나오고, 석판과 같은 자리를
          따라간다 — 칸 한가운데 고정해 두면 미끄러진 석판과 떨어진다. */}
      {customEffect && blazing && (
        <span className="elements__effect">
          <ElementEffect elementId={element.id} iconSize={iconSize} />
        </span>
      )}

      <span
        className={[
          'elements__stone',
          `elements__stone--${shown}`,
          dragOffset === null ? '' : 'elements__stone--dragging',
          // 고유 효과가 있으면 공통 빛무리를 끈다. 겹치면 효과가 묻힌다.
          customEffect ? 'elements__stone--custom-effect' : '',
          // 타오르는 동안 석판 자체가 달아오른다. 효과는 뒤에 깔릴 뿐이라
          // 원판을 뜨겁게 만들려면 석판에 직접 걸어야 한다.
          customEffect && blazing ? 'elements__stone--heated' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        style={{
          backgroundImage: `url(${import.meta.env.BASE_URL}assets/creator-pack/elements/${element.file}.svg)`,
        }}
        onPointerDown={begin}
        onPointerMove={move}
        onPointerUp={end}
        onPointerCancel={cancel}
      />
    </button>
  )
}
