import { averageLap, elapsedMs, formatDuration } from '../round/round'

/**
 * 라운드별로 얼마나 걸렸는가.
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ **판이 끝나면 함께 사라진다 — 어디에도 남기지 않는다.**                   │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * 축 ②의 휘발성 런타임이다(SPEC 5.2). 「지난 판이 라운드당 몇 분이었나」를 남기려면
 * 기록지 쪽 이야기가 되는데 그것은 다른 일이다 — 여기 있는 것은 **지금 도는 판**뿐.
 *
 * 값만 받는 순수한 화면이라 서버 렌더로 끝까지 확인된다(구현 결정 164).
 */
export function RoundLogPanel({
  round,
  startedAt,
  laps,
  now,
}: {
  round: number
  /** 지금 라운드가 시작된 시각. 아직 안 눌렀으면 `null`. */
  startedAt: number | null
  /** 끝난 라운드들이 걸린 시간(ms). 첫 칸이 1라운드다. */
  laps: readonly number[]
  /** 화면이 재어 넘긴 지금 시각. **여기서 `Date.now()`를 부르지 않는다**(구현 결정 12). */
  now: number
}) {
  const running = startedAt !== null
  const average = averageLap(laps)

  return (
    <section className="rlog">
      <div className="rlog__facts">
        <span className="rlog__fact">
          <span className="rlog__name">현재 라운드</span>
          <b className="sl-numeral">{round}</b>
        </span>
        <span className="rlog__fact">
          <span className="rlog__name">이번 라운드</span>
          <b className="sl-numeral">
            {running ? formatDuration(elapsedMs(startedAt, now)) : '--:--'}
          </b>
        </span>
        {/* **모르면 모른다고 한다**(구현 결정 115) — 끝난 라운드가 없으면 평균이 없다. */}
        <span className="rlog__fact">
          <span className="rlog__name">평균</span>
          <b className="sl-numeral">{average === null ? '--:--' : formatDuration(average)}</b>
        </span>
      </div>

      {laps.length === 0 ? (
        <p className="rlog__empty">
          {running ? '아직 넘긴 라운드가 없다.' : '라운드 트래커에서 시작 단추를 누른다.'}
        </p>
      ) : (
        <ol className="rlog__rows">
          {laps.map((ms, i) => (
            <li key={i} className="rlog__row">
              <span className="rlog__no sl-numeral">{i + 1}</span>
              <span className="rlog__bar" aria-hidden="true">
                {/*
                  가장 긴 라운드를 꽉 채운 막대로 두고 나머지를 그에 견준다 —
                  수만 늘어놓으면 어느 라운드가 길었는지 훑어지지 않는다.
                */}
                <span className="rlog__fill" style={{ width: `${barWidth(ms, laps)}%` }} />
              </span>
              <span className="rlog__time sl-numeral">{formatDuration(ms)}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}

/** 가장 긴 라운드가 100%다. 전부 0이면 막대를 그리지 않는다. */
function barWidth(ms: number, laps: readonly number[]): number {
  const longest = Math.max(...laps)
  if (!(longest > 0)) return 0
  return Math.max(2, (ms / longest) * 100)
}
