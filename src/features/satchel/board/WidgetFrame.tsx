import { useRef, useState, type PointerEvent as ReactPointerEvent, type KeyboardEvent } from 'react'
import { canPlaceAt, cellsToPixels, type GridMetrics, type Placement } from '../grid'
import type { WidgetInstance } from '../layout'
import {
  exceedsThreshold,
  previewMove,
  previewResize,
  type Delta,
} from '../interaction/gestureMath'
import type { WidgetDefinition, SatchelMode } from '../widgets/types'
import { CloseIcon, GearIcon } from './frameIcons'

interface Props {
  widget: WidgetInstance
  definition: WidgetDefinition
  metrics: GridMetrics
  mode: SatchelMode
  /** 자기 자신을 뺀 나머지 배치. 겹침 판정에 쓴다. */
  others: Placement[]
  /** 제목 띠를 보일지. 끄면 그 공간이 위젯 내용으로 돌아간다. */
  showTitle: boolean
  /** 이 인스턴스의 설정. 이미 sanitize를 거친 값이다. */
  settings: unknown
  onCommit: (next: Placement) => boolean
  onRemove: () => void
  onOpenSettings: () => void
}

type GestureKind = 'move' | 'resize'

interface Gesture {
  kind: GestureKind
  pointerId: number
  originX: number
  originY: number
  start: Placement
}

/**
 * 위젯 하나의 껍데기. 편집 모드에서 제스처를 받는다.
 *
 * 드래그 중에는 스토어를 갱신하지 않는다. 매 프레임 갱신하면 렌더가 폭주하고
 * `localStorage` 쓰기가 쏟아진다. 임시 미리보기만 들고 있다가 **손을 떼는 순간**
 * 확정한다.
 */
export function WidgetFrame({
  widget,
  definition,
  metrics,
  mode,
  others,
  showTitle,
  settings,
  onCommit,
  onRemove,
  onOpenSettings,
}: Props) {
  const gesture = useRef<Gesture | null>(null)
  const [preview, setPreview] = useState<Placement | null>(null)

  const current: Placement = preview ?? widget
  const rect = cellsToPixels(current, metrics)
  const valid = preview === null || canPlaceAt(preview, others, metrics)
  const dragging = preview !== null

  function begin(kind: GestureKind, event: ReactPointerEvent<HTMLElement>) {
    if (mode !== 'edit') return
    event.preventDefault()
    event.stopPropagation()
    event.currentTarget.setPointerCapture(event.pointerId)
    gesture.current = {
      kind,
      pointerId: event.pointerId,
      originX: event.clientX,
      originY: event.clientY,
      start: { x: widget.x, y: widget.y, w: widget.w, h: widget.h },
    }
  }

  function move(event: ReactPointerEvent<HTMLElement>) {
    const g = gesture.current
    if (!g || g.pointerId !== event.pointerId) return

    const delta: Delta = { dx: event.clientX - g.originX, dy: event.clientY - g.originY }
    // 손가락은 미세하게 흔들린다. 임계값 이전에는 드래그로 보지 않아야 탭과 구분된다.
    if (preview === null && !exceedsThreshold(delta)) return

    setPreview(
      g.kind === 'move'
        ? previewMove(g.start, delta, metrics)
        : previewResize(g.start, delta, metrics, definition.minSize, definition.maxSize),
    )
  }

  function end(event: ReactPointerEvent<HTMLElement>) {
    const g = gesture.current
    if (!g || g.pointerId !== event.pointerId) return
    gesture.current = null

    // 유효할 때만 확정한다. 아니면 원위치.
    if (preview && canPlaceAt(preview, others, metrics)) onCommit(preview)
    setPreview(null)
  }

  function cancel() {
    gesture.current = null
    setPreview(null)
  }

  /**
   * 키보드 배치. 포인터가 없는 환경에서도 쓸 수 있고 자동 검증도 쉬워진다.
   * 판정은 포인터와 같은 함수를 쓴다.
   */
  function onKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (mode !== 'edit') return
    const base: Placement = { x: widget.x, y: widget.y, w: widget.w, h: widget.h }
    const resizing = event.shiftKey
    let next: Placement

    switch (event.key) {
      case 'ArrowLeft':
        next = resizing ? { ...base, w: base.w - 1 } : { ...base, x: base.x - 1 }
        break
      case 'ArrowRight':
        next = resizing ? { ...base, w: base.w + 1 } : { ...base, x: base.x + 1 }
        break
      case 'ArrowUp':
        next = resizing ? { ...base, h: base.h - 1 } : { ...base, y: base.y - 1 }
        break
      case 'ArrowDown':
        next = resizing ? { ...base, h: base.h + 1 } : { ...base, y: base.y + 1 }
        break
      case 'Delete':
      case 'Backspace':
        event.preventDefault()
        onRemove()
        return
      default:
        return
    }

    if (resizing) {
      next.w = Math.max(definition.minSize.w, next.w)
      next.h = Math.max(definition.minSize.h, next.h)
    }
    event.preventDefault()
    // 유효하지 않은 이동은 조용히 무시한다 — 포인터와 같은 판정이다.
    onCommit(next)
  }

  const Widget = definition.Component

  return (
    <div
      className={[
        'widget-frame',
        mode === 'edit' && 'widget-frame--editable',
        dragging && 'widget-frame--dragging',
        dragging && !valid && 'widget-frame--invalid',
      ]
        .filter(Boolean)
        .join(' ')}
      style={{
        left: `${rect.left}px`,
        top: `${rect.top}px`,
        width: `${rect.width}px`,
        height: `${rect.height}px`,
      }}
      role={mode === 'edit' ? 'button' : undefined}
      tabIndex={mode === 'edit' ? 0 : undefined}
      aria-label={
        mode === 'edit'
          ? `${definition.name} 연장. 방향키로 옮기고, 쉬프트와 방향키로 크기를 바꾼다.`
          : undefined
      }
      onPointerDown={(e) => begin('move', e)}
      onPointerMove={move}
      onPointerUp={end}
      onPointerCancel={cancel}
      onKeyDown={onKeyDown}
    >
      {/* 제목 띠. 끄면 이 자리가 통째로 위젯 내용에 돌아가고, 위젯은 자기 영역을
          관측해 스스로 다시 배치한다. */}
      {showTitle && <div className="widget-frame__title">{definition.name}</div>}

      {/* 편집 중에는 위젯 내용이 포인터를 받지 않는다. 드래그하려다 위젯이
          동작하면 곤란하다. */}
      <div className="widget-frame__content" aria-hidden={mode === 'edit'}>
        <Widget
          instanceId={widget.instanceId}
          size={{ w: widget.w, h: widget.h }}
          mode={mode}
          settings={settings}
        />
      </div>

      {mode === 'edit' && (
        <>
          {/* 설정을 지원하는 위젯에만 낸다. 제거 버튼 바로 왼쪽. */}
          {definition.settings && (
            <button
              type="button"
              className="widget-frame__gear"
              aria-label={`${definition.name} 설정`}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={onOpenSettings}
            >
              <GearIcon />
            </button>
          )}
          <button
            type="button"
            className="widget-frame__remove"
            aria-label={`${definition.name} 치우기`}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={onRemove}
          >
            <CloseIcon />
          </button>
          <span
            className="widget-frame__resize"
            role="presentation"
            onPointerDown={(e) => begin('resize', e)}
            onPointerMove={move}
            onPointerUp={end}
            onPointerCancel={cancel}
          />
        </>
      )}
    </div>
  )
}
