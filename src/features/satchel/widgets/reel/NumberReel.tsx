import './NumberReel.css'

/**
 * 도는 숫자 띠 — 실물 다이얼의 드럼.
 *
 * 0부터 `max`까지를 세로로 늘어놓고 **띠 전체를 밀어** 해당 숫자를 창에 맞춘다.
 * 값이 바뀌면 CSS 전환이 그 사이를 메우므로 드럼이 도는 것처럼 보인다.
 *
 * 낱낱을 갈아끼우지 않고 띠를 미는 이유: **몇 칸을 건너뛰어도 그대로 통한다.**
 * 끌기로 한 번에 여섯 칸이 오르면 여섯 칸만큼 미끄러진다. 들고 나는 것을 따로
 * 그리는 방식은 한 칸씩만 자연스럽고, 도중에 방향이 바뀌면 엉킨다.
 *
 * **읽어주지 않는다.** 값은 감싸는 쪽이 `aria-valuetext` 같은 것으로 말해야
 * 한다 — 여기까지 읽으면 0부터 끝까지를 죄다 읽는다.
 *
 * 글꼴·크기·색은 **감싸는 쪽에서 정한다.** 띠는 물려받기만 하므로 위젯마다 다른
 * 결로 쓸 수 있다.
 */
export function NumberReel({ value, max }: { value: number; max: number }) {
  return (
    <span className="reel" aria-hidden="true">
      <span className="reel__strip" style={{ '--reel-n': value } as React.CSSProperties}>
        {Array.from({ length: max + 1 }, (_, n) => (
          <span key={n} className="reel__digit">
            {n}
          </span>
        ))}
      </span>
    </span>
  )
}
