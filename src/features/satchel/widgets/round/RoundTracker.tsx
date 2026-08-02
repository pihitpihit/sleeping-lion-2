import { useBoardSize } from '../../useBoardSize'
import { NumberReel } from '../reel/NumberReel'
import type { WidgetProps } from '../types'
import { computeRoundLayout } from './round'
import { FIRST_ROUND, MAX_ROUND, useRoundStore } from './roundStore'
import './RoundTracker.css'

/**
 * 라운드 트래커.
 *
 * 누르면 다음 라운드로 넘어가고, **원소가 한 단계씩 내려간다** — 강한 것은
 * 약해지고 약한 것은 꺼진다. 꺼진 것은 그대로다.
 *
 * SPEC 12장 열린 질문 7이 "라운드 종료 버튼 하나로 일괄 하강시킬지, 원소별
 * 개별 조작만 둘지"를 물었다. 여기서 앞쪽으로 닫는다 — 매 라운드 여섯 번씩
 * 누르는 것은 도구가 아니라 일이다.
 *
 * **규칙을 판정하지는 않는다.** 언제 라운드가 끝나는지는 사람이 정하고, 우리는
 * 실물에서 손으로 하던 것(표식을 한 칸씩 되돌리는 일)을 대신할 뿐이다.
 */
export function RoundTracker({ mode }: WidgetProps) {
  const { ref, size } = useBoardSize<HTMLDivElement>()
  const layout = computeRoundLayout(size)
  const round = useRoundStore((s) => s.round)
  const advance = useRoundStore((s) => s.advance)

  return (
    <div
      ref={ref}
      className="round"
      style={
        {
          '--round-number': `${layout.numberSize}px`,
          '--round-label': `${layout.labelSize}px`,
        } as React.CSSProperties
      }
    >
      <button
        type="button"
        className="round__plate"
        // 값을 먼저 말한다. 누르면 무슨 일이 일어나는지는 설명으로 붙인다.
        aria-label={`${round}라운드. 누르면 다음 라운드로 넘어가고 원소가 한 단계 내려간다.`}
        aria-live="polite"
        disabled={mode !== 'play'}
        onClick={advance}
      >
        <NumberReel value={round} max={MAX_ROUND} />
        {layout.showLabel && (
          <span className="round__label" aria-hidden="true">
            라운드
          </span>
        )}
      </button>

      {/* 마지막 칸에 닿으면 더 갈 곳이 없다는 것을 알린다. 조용히 안 먹히면
          고장으로 보인다. */}
      {round >= MAX_ROUND && (
        <span className="round__end" aria-hidden="true">
          끝
        </span>
      )}

      {round === FIRST_ROUND && layout.showLabel && (
        <span className="round__hint" aria-hidden="true">
          누르면 원소가 내려간다
        </span>
      )}
    </div>
  )
}
