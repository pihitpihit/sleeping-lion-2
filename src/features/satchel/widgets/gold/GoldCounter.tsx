import { useRef, type KeyboardEvent, type PointerEvent as ReactPointerEvent } from 'react'
import { slotKeyFor } from '../../roster'
import { stepsFromDrag, TAP_SLOP_PX, toLocalDelta } from '../hpxp/hpxp'
import type { WidgetProps } from '../types'
import { Coin } from './Coin'
import { MAX_GOLD, MIN_GOLD } from './gold'
import { useGoldStore } from './goldStore'
import { sanitizeGoldSettings } from './settings'
import './GoldCounter.css'

/**
 * 골드 카운터 — 주운 금화를 센다.
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ **한 칸에서 크지 않는다.**                                                │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * 담는 것이 숫자 하나뿐이라 넓혀도 빈 자리만 생긴다. 대신 한 칸이므로 격자가
 * 꽉 차 가도 끼워 넣을 틈이 있다.
 *
 * **금화는 직접 그렸다.** Creator Pack이 아니므로 격리 규칙(SPEC 13.1)에 걸리지
 * 않고, 인라인 SVG로 두어도 된다. 어느 크기에서도 선명하다.
 *
 * 숫자는 Pirata One이다 — 숫자만 들어가는 자리이므로 한글이 대체 서체로 떨어질
 * 일이 없다(구현 결정 39). **CSS에서 직접 건다** — `.sl-numeral`을 붙여 두었더니
 * 이 위젯의 `font-family: inherit` 한 줄에 덮였다.
 *
 * **조작은 HP/XP와 같다**(`hpxp/hpxp.ts`의 함수를 그대로 쓴다).
 * - **위아래로 끌기** — 한 칸에 1
 * - **탭** — 위 절반이 +1, 아래 절반이 −1
 * - **방향키** — 포인터가 없는 환경을 위해
 *
 * 회전을 함께 본다. 돌려 앉은 사람에게 값이 거꾸로 움직이면 안 된다.
 *
 * **캐릭터의 골드를 고치지 않는다.** 여기 센 것은 판이 끝나면 사람이 정산해
 * 시트에 옮긴다 — 축 ②는 캠페인을 고치지 않는다(SPEC 1장).
 */
export function GoldCounter({ instanceId, mode, rotation, settings }: WidgetProps) {
  /**
   * 값이 담기는 열쇠.
   *
   * 캐릭터를 골랐으면 그 id다 — 전투에서 파티원 모두가 같은 자리를 본다.
   * 안 골랐으면 인스턴스 id이며 이 기기 안에서만 센다.
   */
  const slot = slotKeyFor(sanitizeGoldSettings(settings).characterId, instanceId)
  const value = useGoldStore((s) => s.amountOf(slot))
  const adjust = useGoldStore((s) => s.adjust)
  const disabled = mode !== 'play'

  /**
   * 끄는 동안의 상태.
   *
   * 이미 반영한 칸 수를 들고 있다가 **넘은 만큼만** 더 반영한다. 매번 처음부터
   * 다시 세면 같은 칸을 여러 번 더한다.
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
      adjust(slot, delta)
    }
  }

  function end(event: ReactPointerEvent<HTMLButtonElement>) {
    const d = drag.current
    if (!d || d.pointerId !== event.pointerId) return
    drag.current = null
    if (d.moved) return

    /*
      끌지 않았으면 누른 것이다. 금화의 어느 쪽을 눌렀는지로 부호를 정한다.

      **화면의 축이 아니라 위젯 안쪽의 축으로 본다.** 회전은 가운데를 축으로
      하므로 바깥 상자의 가운데가 곧 돌아간 금화의 가운데다.
    */
    const rect = event.currentTarget.getBoundingClientRect()
    const fromCenter = toLocalDelta(
      event.clientX - (rect.x + rect.width / 2),
      event.clientY - (rect.y + rect.height / 2),
      rotation,
    )
    adjust(slot, fromCenter.dy < 0 ? 1 : -1)
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
    adjust(slot, delta)
  }

  return (
    <button
      type="button"
      className="gold"
      // 값을 읽어주는 것이 먼저다. 조작 방법은 설명으로 붙인다.
      role="spinbutton"
      aria-label="주운 금화"
      aria-valuenow={value}
      aria-valuemin={MIN_GOLD}
      aria-valuemax={MAX_GOLD}
      aria-valuetext={`주운 금화 ${value}`}
      disabled={disabled}
      onPointerDown={begin}
      onPointerMove={move}
      onPointerUp={end}
      onPointerCancel={cancel}
      onKeyDown={onKeyDown}
    >
      <Coin />
      <span className="gold__value">{value}</span>
    </button>
  )
}
