import { useEffect, useState } from 'react'

/**
 * 화면이 맨 위에 있는가.
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ **맨 위에서는 붙박이 띠가 넉넉히 서고, 굴리면 납작해진다.**                │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * 처음 마주할 때는 이름과 부제가 여유 있게 보이는 편이 낫고, 시트를 읽기
 * 시작하면 띠는 자리를 덜 차지할수록 낫다. 형님이 짚었다.
 *
 * **문턱을 0이 아니라 4px에 둔다.** 띠가 납작해지면 그만큼 문서가 짧아지는데,
 * 0에 붙여 두면 그 자리에서 다시 맨 위가 되어 **커졌다 작아졌다를 되풀이할**
 * 여지가 생긴다. 몇 픽셀 띄우면 그 진동이 닿지 않는다.
 *
 * 스크롤 상자는 문서 자체다(`.journal`은 제 스크롤을 갖지 않는다) — 그래서
 * `window`를 듣는다.
 */
export function useAtTop(threshold = 4): boolean {
  const [atTop, setAtTop] = useState(true)

  useEffect(() => {
    const read = () => setAtTop(window.scrollY <= threshold)
    read()
    // 굴릴 때마다 불리므로 `passive`로 둔다 — 막을 일이 없다.
    window.addEventListener('scroll', read, { passive: true })
    return () => window.removeEventListener('scroll', read)
  }, [threshold])

  return atTop
}
