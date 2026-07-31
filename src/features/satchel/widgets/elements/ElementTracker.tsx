import { useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { useBoardSize } from '../../useBoardSize'
import { DRAG_THRESHOLD } from '../../interaction/gestureMath'
import type { WidgetProps } from '../types'
import { useElementStore } from './elementStore'
import { computeElementLayout } from './layout'
import {
  ELEMENTS,
  ELEMENT_STATE_LABEL,
  slotOf,
  stateAtSlot,
  type ElementDef,
  type ElementState,
} from './elements'
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
export function ElementTracker({ instanceId, mode }: WidgetProps) {
  const { ref, size } = useBoardSize<HTMLDivElement>()
  const layout = computeElementLayout(size)
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
        ELEMENTS.map((element) => (
          <ElementLane
            key={element.id}
            element={element}
            instanceId={instanceId}
            mode={mode}
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
  instanceId: string
  mode: WidgetProps['mode']
  iconSize: number
  canSlide: boolean
  slotOffsets: readonly [number, number, number]
  vertical: boolean
}

function ElementLane({
  element,
  instanceId,
  mode,
  iconSize,
  canSlide,
  slotOffsets,
  vertical,
}: LaneProps) {
  const state = useElementStore((s) => s.stateOf(instanceId, element.id))
  const advance = useElementStore((s) => s.advance)
  const setState = useElementStore((s) => s.setState)

  /** 드래그 중 임시로 보여줄 상태. 손을 뗄 때 확정한다. */
  const [dragState, setDragState] = useState<ElementState | null>(null)
  const drag = useRef<{ pointerId: number; origin: number; moved: boolean } | null>(null)

  const shown = dragState ?? state
  const offset = slotOffsets[slotOf(shown)]

  function begin(event: ReactPointerEvent<HTMLButtonElement>) {
    if (mode !== 'play' || !canSlide) return
    event.currentTarget.setPointerCapture(event.pointerId)
    drag.current = {
      pointerId: event.pointerId,
      origin: vertical ? event.clientX : event.clientY,
      moved: false,
    }
  }

  function move(event: ReactPointerEvent<HTMLButtonElement>) {
    const d = drag.current
    if (!d || d.pointerId !== event.pointerId) return

    // 슬라이딩 축은 배치 방향과 수직이다. 가로 배치면 위아래로 민다.
    const now = vertical ? event.clientX : event.clientY
    const delta = now - d.origin
    if (!d.moved && Math.abs(delta) < DRAG_THRESHOLD) return
    d.moved = true

    // 손가락 위치를 트랙 좌표로 옮긴다. 슬롯 간격은 칸 폭의 1/3이다.
    const rect = event.currentTarget.parentElement?.getBoundingClientRect()
    if (!rect) return
    const crossSize = vertical ? rect.width : rect.height
    const step = crossSize / 3
    setDragState(stateAtSlot(slotOf(state) + delta / step))
  }

  function end(event: ReactPointerEvent<HTMLButtonElement>) {
    const d = drag.current
    if (!d || d.pointerId !== event.pointerId) return
    drag.current = null

    if (d.moved && dragState) setState(instanceId, element.id, dragState)
    else if (!d.moved) advance(instanceId, element.id)
    setDragState(null)
  }

  function cancel() {
    drag.current = null
    setDragState(null)
  }

  const style = {
    '--element-color': element.color,
    '--element-icon': `${iconSize}px`,
    '--element-offset': `${offset}px`,
  } as React.CSSProperties

  return (
    <div className="elements__lane" style={style}>
      {canSlide && <span className="elements__groove" aria-hidden="true" />}

      <button
        type="button"
        className={`elements__stone elements__stone--${shown}`}
        style={{
          backgroundImage: `url(${import.meta.env.BASE_URL}assets/creator-pack/elements/${element.file}.svg)`,
        }}
        aria-label={`${element.name} — ${ELEMENT_STATE_LABEL[shown]}`}
        tabIndex={mode === 'play' ? 0 : -1}
        onPointerDown={begin}
        onPointerMove={move}
        onPointerUp={end}
        onPointerCancel={cancel}
        onClick={(event) => {
          // 포인터 흐름에서 이미 처리했다. 키보드로 눌렀을 때만 여기서 넘긴다.
          if (event.detail === 0 && mode === 'play') advance(instanceId, element.id)
        }}
      />
    </div>
  )
}
