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
 * **판의 아트는 베끼지 않았다.** 붉은 반쪽·푸른 반쪽·육각 창·빛나는 테두리라는
 * 얼개만 따르고, 그 밖의 문양은 직접 그린 도형이다. 실물 카드의 그림은
 * Cephalofair의 저작물이므로 담지 않는다(SPEC 3장).
 *
 * **물방울과 별만은 Creator Pack의 원본이다** — 저작자가 CC BY-NC-SA로 공개한
 * 것이라 쓸 수 있다(SPEC 13.1). 파일은 `public/assets/creator-pack/general/`에
 * 있고 여기서는 배경 이미지로만 부른다.
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
          '--hpxp-mark': `${layout.markSize}px`,
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

/**
 * 표식 그림. **Creator Pack 에셋이므로 `.tsx`에 인라인 SVG로 박지 않는다**
 * (SPEC 13.1) — 배경 이미지로 붙이고 파일은 `public/assets/creator-pack/`에 둔다.
 */
const MARK_FILE: Record<HpXpTrack, string> = { hp: 'hp-drop', xp: 'xp-star' }

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
        <span
          className="hpxp__mark"
          aria-hidden="true"
          style={{
            backgroundImage: `url(${import.meta.env.BASE_URL}assets/creator-pack/general/${MARK_FILE[track]}.svg)`,
          }}
        />
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
