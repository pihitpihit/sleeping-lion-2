import { useEffect, useState, type RefObject } from 'react'

/**
 * 이 칸이 띠 밑으로 들어갔는가 — **가려지는가**.
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ **띠 높이를 짐작하지 않고 잰다.**                                         │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * 처음에는 56px이라 적어 두었는데 아이폰에서는 안전영역이 얹혀 띠가 100px 가까이
 * 된다 — 그래서 값이 **한참 가려진 뒤에야** 띠에 떴다(형님이 「흡수되는 시점이
 * 조금 늦다」고 짚었다). 띠를 직접 재면 기기마다 알아서 맞고, 굴린 정도에 따라
 * 띠가 줄어드는 것까지 따라간다(`useScrolled`).
 *
 * **조금 일찍 튼다**(`LEAD`). 완전히 사라진 다음에 뜨면 그 사이가 비어 「없어졌다
 * 나타났다」로 읽힌다 — 칸의 끝자락이 띠에 물리기 시작할 때 이미 서 있어야 한다.
 *
 * `IntersectionObserver`를 쓰지 않는 것도 같은 까닭이다. 띠 높이가 변하므로
 * `rootMargin`을 한 번 정해 둘 수가 없다.
 *
 * 매 프레임에 한 번만 센다(`requestAnimationFrame`) — 스크롤 이벤트마다 상태를
 * 바꾸면 굴릴 때 버벅인다(구현 결정 338과 같은 손질).
 *
 * @param ref 재려는 칸
 * @param bar 위에 붙박인 띠. 없으면 어림값으로 셈한다.
 */

/** 띠에 물리기 시작하는 자리보다 이만큼 먼저 튼다. */
const LEAD = 44

/** 띠를 못 찾았을 때의 어림 높이. 안전영역이 없는 기기의 값이다. */
const FALLBACK_BAR = 56

export function useHiddenAbove(
  ref: RefObject<HTMLElement | null>,
  bar: HTMLElement | null = null,
): boolean {
  const [hidden, setHidden] = useState(false)

  useEffect(() => {
    let frame = 0
    const measure = () => {
      frame = 0
      const el = ref.current
      if (el === null) return
      const line = (bar?.getBoundingClientRect().bottom ?? FALLBACK_BAR) + LEAD
      setHidden(el.getBoundingClientRect().bottom < line)
    }
    const onScroll = () => {
      if (frame !== 0) return
      frame = requestAnimationFrame(measure)
    }

    measure()
    window.addEventListener('scroll', onScroll, { passive: true })
    // 화면이 돌면 칸의 자리도 띠의 키도 달라진다.
    window.addEventListener('resize', onScroll)
    return () => {
      if (frame !== 0) cancelAnimationFrame(frame)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [ref, bar])

  return hidden
}
