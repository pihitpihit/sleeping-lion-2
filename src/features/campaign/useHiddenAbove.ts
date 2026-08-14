import { useEffect, useState, type RefObject } from 'react'

/**
 * 이 칸이 붙박이 띠 위로 지나갔는가 — **가려졌는가**.
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ **가려진 것만 띠가 대신 말한다.**                                         │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * 아직 보이는 값을 띠에도 적으면 같은 말을 두 번 하는 것이고, 가려진 값을 아무도
 * 안 적으면 그것을 보려고 도로 올라가야 한다.
 *
 * `IntersectionObserver`를 쓰지 않는 것은 **띠 높이만큼을 빼고 재야 하기**
 * 때문이다 — `rootMargin`으로 흉내 낼 수는 있지만 띠는 굴린 정도에 따라 키가
 * 변한다(`useScrolled`). 자리를 직접 재면 그 변덕을 그대로 따라간다.
 *
 * 매 프레임에 한 번만 센다(`requestAnimationFrame`) — 스크롤 이벤트마다 상태를
 * 바꾸면 굴릴 때 버벅인다(구현 결정 338과 같은 손질).
 *
 * @param ref 재려는 칸
 * @param offset 띠가 덮는 높이. 그 밑으로 내려가야 「보인다」로 친다.
 */
export function useHiddenAbove(ref: RefObject<HTMLElement | null>, offset = 56): boolean {
  const [hidden, setHidden] = useState(false)

  useEffect(() => {
    let frame = 0
    const measure = () => {
      frame = 0
      const el = ref.current
      if (el === null) return
      const { bottom } = el.getBoundingClientRect()
      setHidden(bottom < offset)
    }
    const onScroll = () => {
      if (frame !== 0) return
      frame = requestAnimationFrame(measure)
    }

    measure()
    window.addEventListener('scroll', onScroll, { passive: true })
    // 화면이 돌면 칸의 자리도 달라진다.
    window.addEventListener('resize', onScroll)
    return () => {
      if (frame !== 0) cancelAnimationFrame(frame)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [ref, offset])

  return hidden
}
