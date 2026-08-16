/**
 * 붙여넣은 글을 개봉 조건 줄로 읽는다 — 관리자 화면이 쓴다.
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ **시트를 보고 옮겨 적기 쉬운 꼴이어야 한다.**                             │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * JSON을 손으로 치는 것보다 한 줄에 하나씩 적는 편이 낫다. 체크상자가 여럿인
 * 줄만 앞에 `[10]`처럼 수를 적는다 — 대부분은 한 칸이라 아무것도 안 적는다.
 *
 * 순수 함수라 표로 못박는다. 여기가 틀리면 **시트와 다른 표가 들어간다.**
 */
export function parseUnlockText(raw: string): { text: string; boxes: number }[] {
  const out: { text: string; boxes: number }[] = []
  for (const line of raw.split('\n')) {
    const trimmed = line.trim()
    if (trimmed === '') continue
    const m = /^\[(\d{1,2})\]\s*(.+)$/.exec(trimmed)
    if (m) {
      const boxes = Math.max(1, Math.min(20, Number.parseInt(m[1], 10)))
      out.push({ text: m[2].trim(), boxes })
    } else {
      // 상자 수를 안 적었으면 한 칸이다 — 시트에서 그 줄이 그렇다.
      out.push({ text: trimmed, boxes: 1 })
    }
  }
  return out
}
