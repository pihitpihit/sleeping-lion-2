import { useEffect } from 'react'

/**
 * 팝업이 떠 있는 동안 뒤쪽 화면을 붙들어 둔다.
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ **덮었다고 멈추는 것이 아니다.**                                          │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * 팝업이 화면을 통째로 덮어도 손가락은 문서를 굴린다 — 팝업 안에서 굴리다
 * 끝에 닿으면 그대로 뒤쪽 시트가 따라 움직였다(형님이 짚었다). `overscroll-
 * behavior: contain`은 그 넘김만 막을 뿐, 팝업 알맹이가 짧으면 애초에 굴릴
 * 것이 없어 통째로 뒤로 넘어간다.
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ **`overflow: hidden`만으로는 iOS에서 안 멈춘다.**                         │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * 그래서 몸통을 `position: fixed`로 못박고 **굴러 있던 만큼 위로 끌어올린다** —
 * 그러지 않으면 팝업을 여는 순간 뒤쪽이 맨 위로 튀어 오르고, 닫을 때 제자리로
 * 돌아가지 않는다.
 *
 * 닫으면 원래 값으로 되돌리고 굴린 자리도 되찾는다. **인라인 스타일을 지우는
 * 것이 아니라 있던 값을 돌려놓는다** — 다른 곳에서 걸어 둔 것이 있으면 그것까지
 * 지워 버린다.
 */
export function useScrollLock(): void {
  useEffect(() => {
    const y = window.scrollY
    const body = document.body
    const had = {
      position: body.style.position,
      top: body.style.top,
      width: body.style.width,
      overflow: body.style.overflow,
    }

    body.style.position = 'fixed'
    body.style.top = `-${y}px`
    body.style.width = '100%'
    body.style.overflow = 'hidden'

    return () => {
      body.style.position = had.position
      body.style.top = had.top
      body.style.width = had.width
      body.style.overflow = had.overflow
      window.scrollTo(0, y)
    }
  }, [])
}
