/**
 * 개봉 조건 한 줄을 조각으로 가른다.
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ **시트에 그림으로 인쇄된 것은 그림으로 낸다.**                            │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * 두 가지다(형님이 짚었다):
 *   · **해·월식 표식** — 실물에서는 잠긴 클래스 봉투에 찍힌 그림이다. 글자
 *     `☀`·`☾`로 적어 두고 화면에서 팩 아이콘으로 바꾼다.
 *   · **영문·숫자** — 「A봉투」의 A도, 「77번」의 77도 글룸헤이븐 서체로 적는다
 *     (형님이 정했다: 영문·숫자 표기는 웬만하면 그 서체다). 한글에는 안 붙인다 —
 *     Pirata One은 라틴 전용이라 대체 서체로 떨어진다(구현 결정 39).
 *
 * 특혜 글을 그림으로 바꾸는 것과 같은 결이다(구현 결정 313). **글은 DB에 그대로
 * 있고 바꾸는 것은 화면뿐이다** — 저장된 것을 고치면 나중에 표를 다시 넣을 때
 * 어긋난다.
 */

/** 잠긴 클래스 봉투의 표식 — 팩 `Class Icons` 쪽 번호다(구현 결정 40). */
export const BOX_ICONS: Readonly<Record<string, number>> = {
  '☀': 11,
  '☾': 7,
}

export type ConditionPiece =
  | { kind: 'text'; text: string }
  /** 영문·숫자 — 글룸헤이븐 서체로 적는다. */
  | { kind: 'latin'; text: string }
  /** 클래스 표식. `icon`은 팩 쪽 번호. */
  | { kind: 'icon'; icon: number; glyph: string }

const SPLIT = /([☀☾]|[A-Za-z0-9]+)/g

export function splitConditionText(text: string): ConditionPiece[] {
  const out: ConditionPiece[] = []
  let last = 0

  for (const match of text.matchAll(SPLIT)) {
    const at = match.index
    if (at > last) out.push({ kind: 'text', text: text.slice(last, at) })

    const token = match[0]
    const icon = BOX_ICONS[token]
    if (icon !== undefined) out.push({ kind: 'icon', icon, glyph: token })
    else out.push({ kind: 'latin', text: token })

    last = at + token.length
  }

  if (last < text.length) out.push({ kind: 'text', text: text.slice(last) })
  return out
}
