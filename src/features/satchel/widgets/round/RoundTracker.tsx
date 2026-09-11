import { useEffect, useState } from 'react'
import { useBoardSize } from '../../useBoardSize'
import { ConfirmDialog } from '../../board/ConfirmDialog'
import { NumberReel } from '../reel/NumberReel'
import type { WidgetProps } from '../types'
import { computeRoundLayout, elapsedMs, formatDuration } from './round'
import { FIRST_ROUND, MAX_ROUND, useRoundStore } from './roundStore'
import { PlayIcon, RestartIcon } from './roundIcons'
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
  const startedAt = useRoundStore((s) => s.startedAt)
  const advance = useRoundStore((s) => s.advance)
  const restart = useRoundStore((s) => s.restart)
  const start = useRoundStore((s) => s.start)
  const [asking, setAsking] = useState(false)

  /*
    ┌────────────────────────────────────────────────────────────────────────┐
    │ **시각은 화면이 1초마다 재어 상태에 담는다.**                           │
    └────────────────────────────────────────────────────────────────────────┘

    렌더 중에 `Date.now()`를 부르면 같은 입력에 다른 결과가 나와 렌더를 되돌릴 수
    없다(`react-hooks/purity`, 구현 결정 12). 시작 전에는 아예 안 돈다 — 셈할 것이
    없는데 1초마다 다시 그릴 까닭이 없다.
  */
  const running = startedAt !== null
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!running) return
    /*
      **첫 값을 여기서 넣지 않는다.** 효과 안에서 곧바로 `setState`를 부르면
      렌더가 연달아 돌고 `react-hooks/set-state-in-effect`가 막는다. 넣지 않아도
      맞는다 — 막 시작한 순간에는 담아 둔 시각이 `startedAt`보다 앞서므로
      `elapsedMs`가 0으로 막고, 화면에는 `00:00`이 뜬다. 1초 뒤 첫 박이 온다.
    */
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [running])

  return (
    <div
      ref={ref}
      className="round"
      style={
        {
          '--round-number': `${layout.numberSize}px`,
          '--round-label': `${layout.labelSize}px`,
          '--round-cut': `${layout.cutSize}px`,
          '--round-timer': `${layout.timerSize}px`,
        } as React.CSSProperties
      }
    >
      <button
        type="button"
        className="round__plate sl-numeral"
        // 값을 먼저 말한다. 누르면 무슨 일이 일어나는지는 설명으로 붙인다.
        aria-label={
          running
            ? `${round}라운드. 누르면 다음 라운드로 넘어간다. 원소가 한 단계 내려가고, 섞기 표시가 뜬 공격 보정 덱이 섞인다.`
            : `${round}라운드. 아직 시작하지 않았다.`
        }
        aria-live="polite"
        /* **시작 전에는 안 눌린다.** 그때 눌러야 할 것은 시작 단추다. */
        disabled={mode !== 'play' || !running}
        onClick={() => advance(Date.now())}
      >
        {/*
          좁으면 `R3`, 넓으면 숫자 밑에 `ROUND`.

          **한 칸짜리로 두면 숫자만 덩그러니 남는다** — 상 위에 체력·골드 트래커가
          함께 놓이므로 그것이 라운드인 줄 알 길이 없다. 이름표를 넣을 자리가
          없을 때만 앞에 한 글자를 붙인다.
        */}
        <span className="round__value">
          {!layout.showLabel && (
            <span className="round__prefix" aria-hidden="true">
              R
            </span>
          )}
          <NumberReel value={round} max={MAX_ROUND} />
        </span>
        {layout.showLabel && (
          <span className="round__label" aria-hidden="true">
            ROUND
          </span>
        )}

        {/*
          경과 시간. **시작 전에는 자리만 잡아 두고 `--:--`을 적는다** — 켤 때만
          그리면 시작하는 순간 판 전체가 다시 배치되어 숫자가 흔들린다(구현 결정
          308과 같은 결).
        */}
        {layout.showTimer && (
          <span className="round__timer" aria-hidden="true">
            {running ? formatDuration(elapsedMs(startedAt, now)) : '--:--'}
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
        ┌──────────────────────────────────────────────────────────────────────┐
        │ **판은 저절로 시작하지 않는다 — 눌러야 시계가 돈다**(형님이 정했다). │
        └──────────────────────────────────────────────────────────────────────┘

        위젯을 놓자마자 시계가 돌면 상 위에 도구를 늘어놓는 동안에도 시간이 흘러
        첫 라운드가 실제보다 길게 기록된다. 그래서 시작 단추를 한가운데 얹는다 —
        **판을 덮으므로** 시작 전에 라운드를 넘길 길이 아예 없다.
      */}
      {mode === 'play' && !running && (
        <button
          type="button"
          className="round__start"
          aria-label="라운드를 시작한다. 경과 시간이 흐르기 시작한다."
          onClick={() => start(Date.now())}
        >
          <PlayIcon size={Math.max(20, layout.numberSize * 0.62)} />
        </button>
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
            /*
              **시계와 라운드 기록도 함께 간다.** 무엇을 잃는지 적지 않으면 5초를
              세어도 소용이 없다(구현 결정 425와 같은 결).
            */
            round === FIRST_ROUND
              ? '이미 첫 라운드다. 원소를 모두 끄고, 공격 보정 덱을 처음으로 되돌리고, 시계를 내린다. 되돌릴 수 없다.'
              : `지금 ${round}라운드다. 1라운드로 되돌리고, 원소를 모두 끄고, 공격 보정 덱을 처음으로 되돌리고, 시계와 라운드별 기록을 지운다. 되돌릴 수 없다.`
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
