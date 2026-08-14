import { useRef, type KeyboardEvent, type PointerEvent as ReactPointerEvent } from 'react'
import { useBoardSize } from '../../useBoardSize'
import type { WidgetProps } from '../types'
import {
  computeHpXpLayout,
  MAX_VALUE,
  MIN_VALUE,
  stepsFromDrag,
  TAP_SLOP_PX,
  toLocalDelta,
  TRACK_LABEL,
  type HpXpTrack,
} from './hpxp'
import { useHpXpStore } from './hpxpStore'
import { sanitizeHpXpSettings } from './settings'
import { slotKeyFor } from '../../roster'
import { NumberReel } from '../reel/NumberReel'
import './HpXpTracker.css'

/**
 * HP/XP 트래커.
 *
 * 실물 다이얼을 본떴다 — 붉은 쪽에 생명, 푸른 쪽에 경험, 표식 안에 숫자.
 *
 * **단추가 없다.** 실물은 손잡이를 돌리므로 화면에서도 **끄는 것**이 본래
 * 동작이다. ∓ 단추를 두면 다이얼이 아니라 계산기가 된다.
 *
 * - **끌기** — 위로 끌면 늘고 아래로 끌면 준다. 일정 거리마다 한 칸.
 * - **누르기** — 표식의 위쪽 절반은 +1, 아래쪽 절반은 −1. 끄는 방향과 같은 축이라
 *   한 번 해보면 안다.
 * - **방향키** — 포인터가 없는 환경을 위해. 위·오른쪽이 +1이다.
 *
 * **판의 아트는 베끼지 않았다.** 붉은 반쪽·푸른 반쪽·빛나는 테라는 얼개만 따른다.
 * 물방울과 별만은 Creator Pack의 원본이며 `public/assets/creator-pack/general/`에
 * 두고 배경 이미지로만 부른다(SPEC 13.1).
 *
 * **룰을 돌리지 않는다.** 최대 체력이 얼마인지, 레벨업에 몇이 필요한지 모른다.
 */
export function HpXpTracker({ instanceId, mode, rotation, settings }: WidgetProps) {
  /**
   * 값이 담기는 열쇠.
   *
   * 캐릭터를 골랐으면 그 id다 — **파티원 모두가 같은 열쇠를 보아야** 한 사람의
   * 체력이 한 자리에 모인다. 안 골랐으면 종전대로 인스턴스 id이며, 그때는 이
   * 기기 안에서만 센다(절대 원칙 3).
   */
  const slot = slotKeyFor(sanitizeHpXpSettings(settings).characterId, instanceId)
  const { ref, size } = useBoardSize<HTMLDivElement>()
  const layout = computeHpXpLayout(size)
  const values = useHpXpStore((s) => s.valuesOf(slot))
  const adjust = useHpXpStore((s) => s.adjust)

  return (
    /*
      **알약이 위젯 테를 물지 않게 한 겹 띄운다**(형님이 짚었다). 원소 트래커가
      제 안쪽에 여백을 두는 것과 같은 값이다 — 위젯마다 다르면 나란히 놓았을 때
      한쪽만 헐거워 보인다.

      재는 자리(`ref`)는 안쪽 알약이므로 배치는 좁아진 만큼 알아서 따라온다.
    */
    <div className="hpxp__pad">
      <div
        ref={ref}
        className={`hpxp hpxp--${layout.orientation}`}
        style={
          {
            '--hpxp-mark': `${layout.markSize}px`,
            '--hpxp-number': `${layout.numberSize}px`,
          } as React.CSSProperties
        }
      >
        {/* 테두리 문양. 내용 위에 얹히므로 포인터를 받지 않는다. */}
        <span className="hpxp__frame" aria-hidden="true" />

        {(['hp', 'xp'] as const).map((track) => (
          <Dial
            key={track}
            track={track}
            value={values[track]}
            rotation={rotation}
            disabled={mode !== 'play'}
            onAdjust={(delta) => adjust(slot, track, delta)}
          />
        ))}
      </div>
    </div>
  )
}

/**
 * 표식 그림. **Creator Pack 에셋이므로 `.tsx`에 인라인 SVG로 박지 않는다**
 * (SPEC 13.1) — 배경 이미지로 붙이고 파일은 `public/assets/creator-pack/`에 둔다.
 *
 * **두께감까지 구워 담은 그림을 쓴다**(`tools/bake_marks.py`, 2026-08-13). 전에는
 * 검정 실루엣을 오려 CSS 그라디언트로 도톰하게 만들었는데, 그것은 둥근 돔이라
 * 캐릭터 시트의 별(끌 베벨)과 나란히 놓으면 다른 물건으로 보였다.
 */
const MARK_FILE: Record<HpXpTrack, string> = { hp: 'hp-drop-lit', xp: 'xp-star-lit' }

interface DialProps {
  track: HpXpTrack
  value: number
  rotation: number
  disabled: boolean
  onAdjust: (delta: number) => void
}

function Dial({ track, value, rotation, disabled, onAdjust }: DialProps) {
  const label = TRACK_LABEL[track]

  /**
   * 끄는 동안의 상태.
   *
   * 이미 반영한 칸 수를 들고 있다가 **넘은 만큼만** 더 반영한다. 매번 처음부터
   * 다시 세면 같은 칸을 여러 번 더하게 된다.
   */
  const drag = useRef<{
    pointerId: number
    originX: number
    originY: number
    applied: number
    moved: boolean
  } | null>(null)

  function begin(event: ReactPointerEvent<HTMLButtonElement>) {
    if (disabled) return
    event.currentTarget.setPointerCapture(event.pointerId)
    drag.current = {
      pointerId: event.pointerId,
      originX: event.clientX,
      originY: event.clientY,
      applied: 0,
      moved: false,
    }
  }

  function move(event: ReactPointerEvent<HTMLButtonElement>) {
    const d = drag.current
    if (!d || d.pointerId !== event.pointerId) return

    const dx = event.clientX - d.originX
    const dy = event.clientY - d.originY
    // 손가락은 미세하게 흔들린다. 이 안쪽이면 아직 누른 것으로 본다.
    if (!d.moved && Math.hypot(dx, dy) < TAP_SLOP_PX) return
    d.moved = true

    // 화면 이동을 위젯 안쪽 좌표로 돌린다. 이게 없으면 돌려 앉은 사람에게
    // 값이 거꾸로 움직인다.
    const local = toLocalDelta(dx, dy, rotation)
    const steps = stepsFromDrag(local.dy)
    const delta = steps - d.applied
    if (delta !== 0) {
      d.applied = steps
      onAdjust(delta)
    }
  }

  function end(event: ReactPointerEvent<HTMLButtonElement>) {
    const d = drag.current
    if (!d || d.pointerId !== event.pointerId) return
    drag.current = null
    if (d.moved) return

    /*
      끌지 않았으면 누른 것이다. 표식의 어느 쪽을 눌렀는지로 부호를 정한다.

      **화면의 축이 아니라 위젯 안쪽의 축으로 본다.** 회전은 가운데를 축으로
      하므로 바깥 상자의 가운데가 곧 돌아간 표식의 가운데다 — 거기서의 거리를
      돌려주면 안쪽 좌표가 된다.
    */
    const rect = event.currentTarget.getBoundingClientRect()
    const fromCenter = toLocalDelta(
      event.clientX - (rect.x + rect.width / 2),
      event.clientY - (rect.y + rect.height / 2),
      rotation,
    )
    onAdjust(fromCenter.dy < 0 ? 1 : -1)
  }

  function cancel() {
    drag.current = null
  }

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (disabled) return
    const delta =
      event.key === 'ArrowUp' || event.key === 'ArrowRight'
        ? 1
        : event.key === 'ArrowDown' || event.key === 'ArrowLeft'
          ? -1
          : 0
    if (delta === 0) return
    event.preventDefault()
    onAdjust(delta)
  }

  return (
    <div className={`hpxp__half hpxp__half--${track}`}>
      <button
        type="button"
        className="hpxp__dial sl-numeral"
        // 값을 읽어주는 것이 먼저다. 조작 방법은 설명으로 붙인다.
        role="spinbutton"
        aria-label={label}
        aria-valuenow={value}
        aria-valuemin={MIN_VALUE}
        aria-valuemax={MAX_VALUE}
        aria-valuetext={`${label} ${value}`}
        disabled={disabled}
        onPointerDown={begin}
        onPointerMove={move}
        onPointerUp={end}
        onPointerCancel={cancel}
        onKeyDown={onKeyDown}
      >
        {/* 그림과 숫자를 갈라 둔다. **부모에 filter를 걸면 자식까지 걸린다** —
            숫자를 흰 표식과 같이 하얗게 만들어 안 보이게 했던 자리다. 자식에서
            되돌리려 해도 통하지 않는다(자식이 먼저 그려지고 부모가 덮는다). */}
        <span
          className="hpxp__mark"
          aria-hidden="true"
          style={
            {
              '--hpxp-mark-src': `url(${import.meta.env.BASE_URL}assets/creator-pack/general/${MARK_FILE[track]}.webp)`,
            } as React.CSSProperties
          }
        >
          {/* 겹을 나눠야 그림자가 산다. 바깥이 그림자를, 안쪽이 모양과 색을 맡는다.
              한 겹에 다 걸면 그림자가 오려내기 전의 네모를 따라 생긴다. */}
          <span className="hpxp__mark-fill" />
        </span>
        <NumberReel value={value} max={MAX_VALUE} />
      </button>
    </div>
  )
}
