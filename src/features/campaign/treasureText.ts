/**
 * 붙여넣은 글을 보물 색인 줄로 읽는다 — 관리자 화면이 쓴다.
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ **번호가 앞에 오고 그 뒤가 글이다.**                                      │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * 책자를 보고 옮겨 적는 자리라 손으로 치기 쉬운 편이 낫다(구현 결정 372와 같은
 * 결). 개봉 조건은 줄 차례가 곧 순서라 번호가 없었지만 **보물은 타일에 번호가
 * 박혀 있으므로 그것을 적는다** — 차례가 뒤섞여도, 한 줄만 고쳐 넣어도 맞는다.
 *
 *   01 무작위 아이템 도안
 *   02 '대형 방패'(032번 아이템) 획득
 *   75 룬 문자 — 아직 해독 전
 *
 * 순수 함수라 표로 못박는다. 여기가 틀리면 **책자와 다른 표가 들어간다.**
 */

export interface TreasureLine {
  no: number
  text: string
}

export interface TreasureParse {
  rows: TreasureLine[]
  /** 사람에게 짚어 줄 것. **조용히 버리지 않는다**(구현 결정 139). */
  problems: string[]
}

/** 번호는 1~999. 앞의 0은 책자 표기라 그대로 받아 준다(`01`·`075`). */
const LINE = /^(\d{1,3})[.:)\s]\s*(.+)$/

export function parseTreasureText(raw: string): TreasureParse {
  const rows: TreasureLine[] = []
  const problems: string[] = []
  const seen = new Set<number>()

  for (const line of raw.split('\n')) {
    const trimmed = line.trim()
    if (trimmed === '') continue

    const m = LINE.exec(trimmed)
    if (m === null) {
      problems.push(`번호로 시작하지 않는다: ${trimmed.slice(0, 30)}`)
      continue
    }

    const no = Number.parseInt(m[1], 10)
    if (!(no >= 1 && no <= 999)) {
      problems.push(`번호가 1~999가 아니다: ${trimmed.slice(0, 30)}`)
      continue
    }

    const text = m[2].trim()
    if (text === '') {
      problems.push(`${no}번에 글이 없다`)
      continue
    }
    if (text.length > 400) {
      problems.push(`${no}번이 400자를 넘는다`)
      continue
    }

    /*
      같은 번호가 두 번 오면 **뒤엣것이 이긴다.** 고쳐 붙여넣는 흐름이라 그것이
      사람이 뜻한 바인데, 그래도 **짚어는 준다** — 옮겨 적다 번호를 잘못 친 것일
      수도 있고 그때는 앞줄이 조용히 사라진다.
    */
    if (seen.has(no)) problems.push(`${no}번이 두 번 나온다 — 뒤엣것을 쓴다`)
    seen.add(no)

    const at = rows.findIndex((r) => r.no === no)
    if (at >= 0) rows[at] = { no, text }
    else rows.push({ no, text })
  }

  rows.sort((a, b) => a.no - b.no)
  return { rows, problems }
}
