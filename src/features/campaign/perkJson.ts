import { parseCardSpec } from '../satchel/widgets/deck/deck'
import { MAX_PERK_BOXES, type ClassPerkDraft } from './perkNet'

/**
 * 붙여넣은 글자를 특혜 표로.
 *
 * 화면(`ClassPerkEditor`)에서 갈라 둔다 — 순수 함수라 Vitest로 확인할 수 있고,
 * 컴포넌트 파일에 섞으면 화면을 고칠 때마다 다시 태워야 한다. 클래스 수치의
 * `classJson.ts`와 같은 짜임이다.
 */

/** 붙여넣을 모양을 보여주는 본. **실제 내용은 담지 않는다** — 그것이 이 화면의 요점이다. */
export const PERK_JSON_TEMPLATE = `[
  { "count": 2, "text": "", "changes": { "m1": -2 } },
  { "count": 1, "text": "", "changes": { "m2": -1, "p0": 1 } },
  { "count": 1, "text": "", "changes": { "r.p0.fire": 2 } }
]`

export interface ParsedPerks {
  perks: ClassPerkDraft[]
  problems: string[]
  /** 상자를 다 세면 몇 개인가. 실물 시트는 열다섯이다. */
  boxes: number
}

/**
 * 실물 시트 한 장의 체크상자 수.
 *
 * 아홉 장을 세어 보니 클래스마다 정확히 열다섯이었다 — 글룸헤이븐도 사자의 턱도
 * 같다. **막지는 않는다.** 우리가 안 본 클래스가 다를 수 있고, 규칙을 판정하지
 * 않는다는 선과 같은 결이다. 다르면 짚어만 준다.
 */
export const EXPECTED_PERK_BOXES = 15

/**
 * 붙여넣은 글자를 특혜 표로.
 *
 * **한 줄이라도 틀리면 아무것도 넣지 않는다.** 반쯤 들어가면 상자 번호가 밀려
 * 켜 둔 것이 다른 특혜를 가리킨다 — 그 어긋남은 눈에 안 보인다.
 */
export function parsePerkJson(text: string, classId: string): ParsedPerks {
  const problems: string[] = []
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    return { perks: [], problems: ['JSON이 아닙니다. 대괄호와 쉼표를 살펴보십시오.'], boxes: 0 }
  }

  if (!Array.isArray(raw)) {
    return { perks: [], problems: ['맨 바깥이 배열이어야 합니다 — `[ … ]`'], boxes: 0 }
  }

  const perks: ClassPerkDraft[] = []

  raw.forEach((item, index) => {
    const at = `${index + 1}번째 줄`
    if (typeof item !== 'object' || item === null || Array.isArray(item)) {
      problems.push(`${at}: 객체가 아닙니다.`)
      return
    }
    const { count, text: line, changes } = item as Record<string, unknown>

    if (
      typeof count !== 'number' ||
      !Number.isInteger(count) ||
      count < 1 ||
      count > MAX_PERK_BOXES
    ) {
      problems.push(`${at}: count는 1~${MAX_PERK_BOXES}의 정수여야 합니다.`)
      return
    }

    if (typeof line !== 'string' || line.trim() === '') {
      problems.push(`${at}: text가 비었습니다.`)
      return
    }

    if (typeof changes !== 'object' || changes === null || Array.isArray(changes)) {
      problems.push(`${at}: changes는 객체여야 합니다 — \`{ "m1": -2 }\``)
      return
    }

    /*
      **알아볼 수 없는 종류는 조용히 넘기지 않는다.** 이 화면은 손으로 적어
      붙여넣는 자리라 오타가 나기 쉽고, 걸러 버리면 켠 상자가 아무 일도 안 하는
      채로 남는다 — 그것이 화면에는 정상으로 보인다.
    */
    const cleaned: Record<string, number> = {}
    let broken = false
    for (const [key, value] of Object.entries(changes as Record<string, unknown>)) {
      const spec = parseCardSpec(key)
      if (!spec) {
        problems.push(`${at}: '${key}'는 알 수 없는 카드입니다.`)
        broken = true
        continue
      }
      if (typeof value !== 'number' || !Number.isInteger(value) || value === 0) {
        problems.push(`${at}: '${key}'의 값은 0이 아닌 정수여야 합니다.`)
        broken = true
        continue
      }
      // 낱말을 한 가지 꼴로 세워 담는다. `p1.ice.fire`로 적어도 `p1.fire.ice`로
      // 앉아야 덱 구성에서 같은 카드가 두 줄로 갈리지 않는다.
      cleaned[spec.id] = (cleaned[spec.id] ?? 0) + value
    }
    if (broken) return

    // 아무것도 안 바꾸는 줄도 있다 — "부정적 시나리오 효과 무시"가 그렇다.
    // 덱과 무관하지만 시트에서는 켜야 하므로 담는다.
    perks.push({ classId, sort: index, count, text: line.trim(), changes: cleaned })
  })

  const boxes = perks.reduce((total, perk) => total + perk.count, 0)

  return { perks, problems, boxes }
}
