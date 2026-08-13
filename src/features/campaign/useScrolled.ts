import { useEffect, useState } from 'react'

/**
 * 굴린 정도 — 0이면 맨 위, 1이면 다 굴린 것.
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ **맨 위에서는 붙박이 띠가 넉넉히 서고, 굴리면 서서히 좁아진다.**           │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * 처음 마주할 때는 표식과 이름이 크게 보이는 편이 낫고, 시트를 읽기 시작하면
 * 띠는 자리를 덜 차지할수록 낫다.
 *
 * **켜짐/꺼짐이 아니라 이어지는 값이다.** 문턱 하나로 갈랐더니 그 자리를 지날
 * 때마다 띠가 툭 튀었다 — 형님이 "서서히 좁아지게"라고 짚었다. 0~1을 CSS 변수로
 * 내려보내고 크기는 `calc`가 섞는다.
 *
 * **다 굴렸다고 보는 거리(`span`)를 짧게 둔다.** 길면 한참 내려가야 띠가 제
 * 크기가 되어, 읽는 내내 띠가 조금씩 움직인다.
 *
 * 스크롤 상자는 문서 자체다(`.journal`은 제 스크롤을 갖지 않는다) — `window`를
 * 듣는다. 요소에 걸면 아무 일도 안 일어난다.
 */
export function useScrolled(span = 72): number {
  const [t, setT] = useState(0)

  useEffect(() => {
    let raf = 0
    const read = () => {
      raf = 0
      setT(Math.min(1, Math.max(0, window.scrollY / span)))
    }
    const onScroll = () => {
      // 굴릴 때마다 불리므로 한 프레임에 한 번만 센다.
      if (raf === 0) raf = window.requestAnimationFrame(read)
    }
    read()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (raf !== 0) window.cancelAnimationFrame(raf)
    }
  }, [span])

  return t
}
