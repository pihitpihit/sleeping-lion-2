import type { GridMetrics } from './gridMetrics'

/**
 * 새로 놓을 위젯의 크기 고르기.
 *
 * 순수 함수다(SPEC 4.1). 레지스트리도 스토어도 모른다 — 필요한 것은 전부 인자로
 * 받는다.
 *
 * **왜 필요한가.** 처음에는 기본 크기와 그것을 눕힌 것 딱 둘만 시도하고, 둘 다
 * 안 들어가면 "자리가 없다"며 거절했다. 그런데 격자에 빈칸이 남아 있는데도
 * 거절당하는 일이 잦았다 — 기본 크기가 6×2인 원소 트래커는 2×2 자리가 비어
 * 있어도 못 들어간다. **눈에 보이는 빈칸과 실제로 놓을 수 있는지가 어긋나면
 * 단추가 고장난 것으로 읽힌다.**
 */

export interface Size {
  w: number
  h: number
}

/**
 * 기본 크기에서 최소 크기까지, **기본에 가까운 순**으로 후보를 낸다.
 *
 * 눕힌 것도 함께 낸다. 원소 트래커의 기본은 6×2인데 폰은 4열뿐이라, 눕히지
 * 않으면 아예 놓을 수 없다.
 *
 * 고르는 순서:
 * 1. 넓은 것부터 — 기본 크기에 가까울수록 좋다.
 * 2. 넓이가 같으면 기본과 **모양이 덜 다른** 것. 6×2를 줄일 때 3×2가 2×3보다
 *    낫다는 뜻이다.
 * 3. 그래도 같으면 눕히지 않은 쪽.
 *
 * 격자 밖으로 나가는 것은 애초에 담지 않는다.
 */
export function sizeCandidates(
  defaultSize: Size,
  minSize: Size,
  metrics: GridMetrics,
): readonly Size[] {
  const { columns, rows } = metrics
  if (columns < 1 || rows < 1) return []

  const seen = new Set<string>()
  const out: { size: Size; area: number; shapeGap: number; flipped: number }[] = []

  /** 한 방향에 대해 기본~최소 사이를 모두 담는다. */
  const collect = (maxW: number, maxH: number, minW: number, minH: number, flipped: number) => {
    for (let w = maxW; w >= minW; w -= 1) {
      for (let h = maxH; h >= minH; h -= 1) {
        if (w > columns || h > rows) continue
        const key = `${w}x${h}`
        if (seen.has(key)) continue
        seen.add(key)
        out.push({
          size: { w, h },
          area: w * h,
          // 기본과 얼마나 다른 모양인가. 두 변의 차이를 더해 잰다.
          shapeGap: Math.abs(w - defaultSize.w) + Math.abs(h - defaultSize.h),
          flipped,
        })
      }
    }
  }

  collect(defaultSize.w, defaultSize.h, minSize.w, minSize.h, 0)
  collect(defaultSize.h, defaultSize.w, minSize.h, minSize.w, 1)

  out.sort((a, b) => b.area - a.area || a.shapeGap - b.shapeGap || a.flipped - b.flipped)
  return out.map((entry) => entry.size)
}

/**
 * 격자에 빈칸이 하나라도 있는가.
 *
 * 단추를 잠글지 정하는 데 쓴다. **빈칸이 없으면 어떤 위젯도 못 들어간다** —
 * 크기를 아무리 줄여도 1×1은 되어야 하기 때문이다. 이 경우에는 눌러봐야
 * 거절만 당하므로 아예 잠그는 편이 정직하다.
 */
export function hasFreeCell(
  occupied: readonly { x: number; y: number; w: number; h: number }[],
  metrics: GridMetrics,
): boolean {
  const { columns, rows } = metrics
  if (columns < 1 || rows < 1) return false

  let used = 0
  for (const item of occupied) {
    // 격자 밖으로 삐져나간 부분은 세지 않는다.
    const w = Math.max(0, Math.min(item.x + item.w, columns) - Math.max(item.x, 0))
    const h = Math.max(0, Math.min(item.y + item.h, rows) - Math.max(item.y, 0))
    used += w * h
  }
  return used < columns * rows
}
