import { useState } from 'react'
import { useBoardSize } from '../../useBoardSize'
import { ConfirmDialog } from '../../board/ConfirmDialog'
import { NumberReel } from '../reel/NumberReel'
import type { WidgetProps } from '../types'
import { computeRoundLayout } from './round'
import { FIRST_ROUND, MAX_ROUND, useRoundStore } from './roundStore'
import { RestartIcon } from './roundIcons'
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
  const restart = useRoundStore((s) => s.restart)
  const [asking, setAsking] = useState(false)

  return (
    <div
      ref={ref}
      className="round"
      style={
        {
          '--round-number': `${layout.numberSize}px`,
          '--round-label': `${layout.labelSize}px`,
          '--round-cut': `${layout.cutSize}px`,
        } as React.CSSProperties
      }
    >
      <button
        type="button"
        className="round__plate sl-numeral"
        // 값을 먼저 말한다. 누르면 무슨 일이 일어나는지는 설명으로 붙인다.
        aria-label={`${round}라운드. 누르면 다음 라운드로 넘어간다. 원소가 한 단계 내려가고, 섞기 표시가 뜬 공격 보정 덱이 섞인다.`}
        aria-live="polite"
        disabled={mode !== 'play'}
        onClick={advance}
      >
        <NumberReel value={round} max={MAX_ROUND} />
        {layout.showLabel && (
          <span className="round__label" aria-hidden="true">
            ROUND
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

      {/*
        판을 새로 시작하는 문 — **왼쪽 위를 사선으로 자른 그 삼각형이 단추다.**

        첫 라운드에도 낸다. 라운드는 1이어도 원소가 타오르고 있을 수 있고, 그것을
        끄는 것도 '새로 시작'이다. 무엇보다 **판의 모양이 라운드에 따라 바뀌지
        않는다** — 2라운드가 되는 순간 귀퉁이가 잘려 나가면 눈에 거슬린다.

        되돌릴 수 없는 일이므로 한 번 더 묻는다 — 뜸을 들이는 팝업으로.
      */}
      {mode === 'play' && (
        <button
          type="button"
          className="round__restart"
          aria-label="판을 새로 시작한다. 첫 라운드로 가고, 원소가 모두 꺼지고, 공격 보정 덱이 처음으로 돌아간다."
          onClick={() => setAsking(true)}
        >
          <RestartIcon size={layout.cutIconSize} />
        </button>
      )}

      {/*
        지금 몇 라운드인지 함께 보여준다. "정말입니까"는 무엇을 잃는지 알려주지
        않는다 — 12라운드를 버리는 것과 2라운드를 버리는 것은 다른 일이다.

        이미 첫 라운드면 되돌릴 라운드가 없다. 그때도 할 일은 남아 있으므로
        (원소를 끈다) 묻기는 하되, "1라운드로 되돌린다"고 적지는 않는다.
      */}
      {asking && (
        <ConfirmDialog
          title="판을 새로 시작"
          description={
            round === FIRST_ROUND
              ? '이미 첫 라운드다. 원소를 모두 끄고 공격 보정 덱을 처음으로 되돌린다. 되돌릴 수 없다.'
              : `지금 ${round}라운드다. 1라운드로 되돌리고, 원소를 모두 끄고, 공격 보정 덱을 처음으로 되돌린다. 되돌릴 수 없다.`
          }
          confirmLabel="새로 시작"
          onCancel={() => setAsking(false)}
          onConfirm={() => {
            restart()
            setAsking(false)
          }}
        />
      )}
    </div>
  )
}
