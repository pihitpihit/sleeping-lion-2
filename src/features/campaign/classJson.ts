import { MAX_LEVEL } from './character'
import type { ClassInfo } from './classNet'

/**
 * 붙여넣은 글자를 클래스 목록으로.
 *
 * 화면(`ClassDataEditor`)에서 갈라 둔다 — 순수 함수라 Vitest로 확인할 수 있고,
 * 컴포넌트 파일에 섞으면 화면을 고칠 때마다 다시 태워야 한다.
 */

/** 붙여넣을 모양을 보여주는 본. 실제 수치는 담지 않는다 — 그것이 이 화면의 요점이다. */
export const CLASS_JSON_TEMPLATE = `[
  { "icon": 1, "name": "", "handSize": 10, "hp": [8, 9, 11, 12, 14, 15, 17, 18, 20] }
]`

interface Parsed {
  classes: ClassInfo[]
  problems: string[]
}

/**
 * 붙여넣은 글자를 클래스 목록으로.
 *
 * **한 줄이라도 틀리면 아무것도 넣지 않는다.** 반쯤 들어가면 무엇이 들어갔고
 * 무엇이 안 들어갔는지 사람이 다시 세야 한다.
 */
export function parseClassJson(text: string): Parsed {
  const problems: string[] = []
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    return { classes: [], problems: ['JSON이 아닙니다. 대괄호와 쉼표를 살펴보십시오.'] }
  }

  if (!Array.isArray(raw)) {
    return { classes: [], problems: ['맨 바깥이 배열이어야 합니다 — `[ … ]`'] }
  }

  const classes: ClassInfo[] = []
  const seen = new Set<number>()

  raw.forEach((item, index) => {
    const at = `${index + 1}번째`
    if (typeof item !== 'object' || item === null) {
      problems.push(`${at}: 객체가 아닙니다.`)
      return
    }
    const { icon, name, handSize, hp } = item as Record<string, unknown>

    if (typeof icon !== 'number' || !Number.isInteger(icon) || icon < 1 || icon > 21) {
      problems.push(`${at}: icon은 1~21의 정수여야 합니다.`)
      return
    }
    if (seen.has(icon)) {
      problems.push(`${at}: icon ${icon}이 앞에서 이미 나왔습니다.`)
      return
    }
    seen.add(icon)

    if (typeof name !== 'string' || name.trim() === '') {
      problems.push(`${at}(icon ${icon}): name이 비었습니다.`)
      return
    }
    if (typeof handSize !== 'number' || !Number.isInteger(handSize) || handSize < 0) {
      problems.push(`${at}(icon ${icon}): handSize는 0 이상의 정수여야 합니다.`)
      return
    }
    if (!Array.isArray(hp) || hp.length !== MAX_LEVEL) {
      problems.push(`${at}(icon ${icon}): hp는 레벨 1~9의 ${MAX_LEVEL}칸이어야 합니다.`)
      return
    }
    if (!hp.every((n) => typeof n === 'number' && Number.isInteger(n) && n > 0)) {
      problems.push(`${at}(icon ${icon}): hp에 정수가 아닌 값이 있습니다.`)
      return
    }

    classes.push({ icon, name: name.trim(), handSize, hp: hp as number[] })
  })

  return { classes, problems }
}
