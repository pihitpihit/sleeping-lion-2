import { useBoardSize } from '../../useBoardSize'
import type { WidgetProps } from '../types'
import { computeHpXpLayout, MAX_VALUE, MIN_VALUE, TRACK_LABEL, type HpXpTrack } from './hpxp'
import { useHpXpStore } from './hpxpStore'
import './HpXpTracker.css'

/**
 * HP/XP 트래커.
 *
 * 실물 다이얼을 본떴다 — 붉은 쪽에 생명, 푸른 쪽에 경험, 가운데 육각 창에 숫자.
 * 실물은 검은 손잡이를 돌리지만 화면에서는 **손잡이 둘이 ∓ 단추가 된다.**
 * 돌리는 시늉을 만들면 손가락으로 정확히 맞추기 어렵다.
 *
 * **아트를 베끼지 않았다.** 붉은 반쪽·푸른 반쪽·육각 창·빛나는 테두리라는
 * 얼개만 따르고, 문양과 표식은 여기서 직접 그린 도형이다. 실물 카드의 그림은
 * Cephalofair의 저작물이므로 담지 않는다(SPEC 3장).
 *
 * **룰을 돌리지 않는다.** 최대 체력이 얼마인지, 레벨업에 몇이 필요한지 모른다.
 */
export function HpXpTracker({ instanceId, mode }: WidgetProps) {
  const { ref, size } = useBoardSize<HTMLDivElement>()
  const layout = computeHpXpLayout(size)
  const values = useHpXpStore((s) => s.valuesOf(instanceId))
  const adjust = useHpXpStore((s) => s.adjust)

  return (
    <div
      ref={ref}
      className={`hpxp hpxp--${layout.orientation}`}
      style={
        {
          '--hpxp-number': `${layout.numberSize}px`,
          '--hpxp-knob': `${layout.knobSize}px`,
          '--hpxp-window': `${layout.windowWidth}px`,
          '--hpxp-gap': `${layout.gap}px`,
          '--hpxp-pad-outer': `${layout.padOuter}px`,
          '--hpxp-pad-inner': `${layout.padInner}px`,
        } as React.CSSProperties
      }
    >
      {/* 테두리 문양. 내용 위에 얹히므로 포인터를 받지 않는다. */}
      <span className="hpxp__frame" aria-hidden="true" />

      {(['hp', 'xp'] as const).map((track) => (
        <Half
          key={track}
          track={track}
          value={values[track]}
          showMark={layout.showMarks}
          disabled={mode !== 'play'}
          onAdjust={(delta) => adjust(instanceId, track, delta)}
        />
      ))}
    </div>
  )
}

interface HalfProps {
  track: HpXpTrack
  value: number
  showMark: boolean
  disabled: boolean
  onAdjust: (delta: number) => void
}

function Half({ track, value, showMark, disabled, onAdjust }: HalfProps) {
  const label = TRACK_LABEL[track]

  return (
    <div
      className={`hpxp__half hpxp__half--${track}`}
      role="group"
      aria-label={`${label} ${value}`}
    >
      {/* 표식은 바깥쪽 끝에 선다 — 실물에서 물방울과 별이 그 자리에 있다. */}
      {showMark && (
        <span className="hpxp__mark" aria-hidden="true">
          {track === 'hp' ? <DropMark /> : <StarMark />}
        </span>
      )}

      <button
        type="button"
        className="hpxp__knob"
        aria-label={`${label} 하나 줄이기`}
        disabled={disabled || value <= MIN_VALUE}
        onClick={() => onAdjust(-1)}
      >
        <span className="hpxp__sign" aria-hidden="true">
          −
        </span>
      </button>

      {/* 육각 창. 실물의 숫자 구멍이다. */}
      <span className="hpxp__window">
        <span className="hpxp__value">{value}</span>
      </span>

      <button
        type="button"
        className="hpxp__knob"
        aria-label={`${label} 하나 늘리기`}
        disabled={disabled || value >= MAX_VALUE}
        onClick={() => onAdjust(1)}
      >
        <span className="hpxp__sign" aria-hidden="true">
          +
        </span>
      </button>
    </div>
  )
}

/** 핏방울. 직접 그린 도형이다 — Creator Pack 에셋이 아니다. */
function DropMark() {
  return (
    <svg viewBox="0 0 24 24" width="100%" height="100%" focusable="false">
      <path
        d="M12 2.5c4.4 5.6 7 9.3 7 12.4a7 7 0 1 1-14 0c0-3.1 2.6-6.8 7-12.4Z"
        fill="currentColor"
      />
    </svg>
  )
}

/** 여덟 갈래 별. 경험을 뜻한다. */
function StarMark() {
  const spikes = Array.from({ length: 8 }, (_, i) => i * 45)
  return (
    <svg viewBox="0 0 24 24" width="100%" height="100%" focusable="false">
      {spikes.map((deg) => (
        <path
          key={deg}
          d="M12 1.2 14.1 9.6 12 12 9.9 9.6Z"
          fill="currentColor"
          transform={`rotate(${deg} 12 12)`}
        />
      ))}
      <circle cx="12" cy="12" r="3.1" fill="currentColor" />
    </svg>
  )
}
