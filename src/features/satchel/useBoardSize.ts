import { useEffect, useRef, useState } from 'react'

export interface BoardSize {
  width: number
  height: number
}

const ZERO: BoardSize = { width: 0, height: 0 }

/**
 * 보드 영역의 실제 픽셀 크기를 관측한다. M2의 격자 계산이 이 값을 받는다.
 *
 * `window.resize`만으로는 부족하다 — 툴바 위치가 바뀌면(M5) 창 크기는 그대로인데
 * 보드 영역만 달라진다. 그래서 요소를 직접 관측한다.
 *
 * 회전 중에는 콜백이 연속으로 쏟아지므로 프레임 단위로 묶는다. 격자 계산과 위젯
 * 재배치가 딸려 오기 때문에 그대로 흘리면 값이 비싸진다.
 */
export function useBoardSize<T extends HTMLElement>() {
  const ref = useRef<T | null>(null)
  const [size, setSize] = useState<BoardSize>(ZERO)

  useEffect(() => {
    const element = ref.current
    if (!element) return

    let frame = 0
    let pending: BoardSize | null = null

    const flush = () => {
      frame = 0
      if (!pending) return
      const next = pending
      pending = null
      // 같은 값이면 렌더를 만들지 않는다.
      setSize((prev) => (prev.width === next.width && prev.height === next.height ? prev : next))
    }

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (!entry) return

      // contentRect 대신 contentBoxSize를 쓰면 소수 픽셀까지 온다. 격자 계산이
      // 소수를 다루므로(M2) 반올림하지 않고 그대로 넘긴다.
      const box = entry.contentBoxSize?.[0]
      pending = box
        ? { width: box.inlineSize, height: box.blockSize }
        : { width: entry.contentRect.width, height: entry.contentRect.height }

      if (!frame) frame = requestAnimationFrame(flush)
    })

    observer.observe(element)
    return () => {
      observer.disconnect()
      if (frame) cancelAnimationFrame(frame)
    }
  }, [])

  return { ref, size }
}
