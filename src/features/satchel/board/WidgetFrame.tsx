import { useRef, useState, type PointerEvent as ReactPointerEvent, type KeyboardEvent } from 'react'
import { canPlaceAt, cellsToPixels, type GridMetrics, type Placement } from '../grid'
import { swapsAxes, type Rotation, type WidgetInstance } from '../layout'
import {
  exceedsThreshold,
  previewMove,
  previewResize,
  type Delta,
} from '../interaction/gestureMath'
import type { WidgetDefinition, SatchelMode } from '../widgets/types'
import { CloseIcon, GearIcon, RotateIcon } from './frameIcons'

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
  /** 이 위젯이 바라보는 방향. 상 둘레 어느 자리에서 보는가. */
  rotation: Rotation
  onCommit: (next: Placement) => boolean
  onRemove: () => void
  onOpenSettings: () => void
  onRotate: () => void
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
 * 위젯 틀의 테 두께(px).
 *
 * `SatchelPage.css`의 `.widget-frame { border: 1px … }`와 **같은 값이어야 한다.**
 * 속(회전자)의 크기를 여기서 셈하기 때문이다.
 */
const FRAME_BORDER = 1

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
  rotation,
  onCommit,
  onRemove,
  onOpenSettings,
  onRotate,
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

  /**
   * 90·270도에서는 가로세로를 바꿔 그린 뒤 돌린다. 0·180도도 같은 식으로 두어
   * 갈래를 하나로 유지한다 — 회전이 0일 때만 다른 길을 타면 그 길에서만 나는
   * 어긋남이 생긴다.
   */
  /**
   * 크기를 바꿀 수 있는가.
   *
   * 최소와 최대가 같으면 끌어도 갈 곳이 없다. 손잡이를 내면 **눌리는데 아무 일도
   * 안 일어나는** 자리가 되므로 아예 안 낸다.
   */
  const resizable =
    definition.maxSize === undefined ||
    definition.maxSize.w !== definition.minSize.w ||
    definition.maxSize.h !== definition.minSize.h

  /*
    ┌────────────────────────────────────────────────────────────────────────┐
    │ **속은 테 안쪽 크기다. 칸 크기를 그대로 주면 테 밑으로 넘친다.**        │
    └────────────────────────────────────────────────────────────────────────┘

    틀은 `box-sizing: border-box`라 `rect`가 **테를 포함한 바깥 크기**다. 그것을
    그대로 속에 주면 속이 사방 1px씩 테 밑으로 삐져나가고, 속의 둥근 모서리가
    틀의 것과 어긋나 **모서리에서 속이 각진 채로 비친다** — 라운드 트래커처럼
    칸을 가득 채우는 위젯에서 검은 이가 빠진 것처럼 보였다(형님이 짚었다).

    테 두께는 CSS와 여기 두 곳에 있다. 한 곳이 바뀌면 다른 곳도 바뀌어야 하므로
    이름을 붙여 둔다.
  */
  const inner = { w: rect.width - 2 * FRAME_BORDER, h: rect.height - 2 * FRAME_BORDER }
  const rotorStyle = {
    width: `${swapsAxes(rotation) ? inner.h : inner.w}px`,
    height: `${swapsAxes(rotation) ? inner.w : inner.h}px`,
    transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
  }

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
      {/*
        돌아가는 속. 제목과 내용이 함께 돈다 — 마주 앉은 사람에게는 제목도
        거꾸로면 곤란하다.

        90·270도에서는 **가로세로를 바꿔 그린 뒤 돌린다.** 그래야 돌린 결과가
        원래 칸을 정확히 채운다. 위젯은 자기 영역을 관측해 스스로 배치하므로,
        뒤바뀐 모양에 맞춰 알아서 다시 눕는다.
      */}
      <div className="widget-frame__rotor" style={rotorStyle}>
        {/* 제목 띠. 끄면 이 자리가 통째로 위젯 내용에 돌아간다. */}
        {showTitle && <div className="widget-frame__title">{definition.name}</div>}

        {/* 편집 중에는 위젯 내용이 포인터를 받지 않는다. 드래그하려다 위젯이
            동작하면 곤란하다. */}
        <div className="widget-frame__content" aria-hidden={mode === 'edit'}>
          <Widget
            instanceId={widget.instanceId}
            size={{ w: widget.w, h: widget.h }}
            mode={mode}
            rotation={rotation}
            settings={settings}
          />
        </div>
      </div>

      {mode === 'edit' && (
        <>
          {/* 편집 단추는 **돌지 않는다.** 함께 돌리면 크기 핸들의 방향까지
              뒤집혀 오른쪽으로 끌면 줄어드는 꼴이 된다. 조작하는 손은 화면을
              마주 보고 있으므로 화면 기준으로 둔다. */}
          <button
            type="button"
            className={
              definition.settings
                ? 'widget-frame__rotate'
                : 'widget-frame__rotate widget-frame__rotate--alone'
            }
            aria-label={`${definition.name} 돌리기 (지금 ${rotation}도)`}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={onRotate}
          >
            <RotateIcon />
          </button>
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
          {/*
            **크기가 하나뿐인 위젯에는 손잡이를 내지 않는다.** 골드 카운터가
            그렇다 — 끌 수 있게 보이는데 아무 일도 안 일어나면 고장으로 읽힌다.
          */}
          {resizable && (
            <span
              className="widget-frame__resize"
              role="presentation"
              onPointerDown={(e) => begin('resize', e)}
              onPointerMove={move}
              onPointerUp={end}
              onPointerCancel={cancel}
            />
          )}
        </>
      )}
    </div>
  )
}
