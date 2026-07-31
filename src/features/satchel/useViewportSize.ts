import { useEffect, useState } from 'react'

/**
 * 창 크기.
 *
 * 툴바 기본 위치(`auto`)는 **보드가 아니라 창**을 보고 정한다. 보드로 판단하면
 * 툴바가 보드를 줄이고 그 보드가 다시 툴바 위치를 정하는, 서로를 물고 도는
 * 계산이 된다.
 */
export function useViewportSize() {
  const [size, setSize] = useState(() => ({
    width: window.innerWidth,
    height: window.innerHeight,
  }))

  useEffect(() => {
    let frame = 0
    const onResize = () => {
      if (frame) return
      frame = requestAnimationFrame(() => {
        frame = 0
        setSize((prev) =>
          prev.width === window.innerWidth && prev.height === window.innerHeight
            ? prev
            : { width: window.innerWidth, height: window.innerHeight },
        )
      })
    }
    window.addEventListener('resize', onResize)
    window.addEventListener('orientationchange', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
      window.removeEventListener('orientationchange', onResize)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [])

  return size
}
