import { CLASS_ICON_COUNT } from './character'
import type { ClassInfo } from './classNet'

/**
 * 캐릭터를 세울 때 고르는 것 하나.
 *
 * 클래스 표에서 온 것일 수도 있고(이름·핸드·체력을 안다), 그림뿐일 수도 있다
 * (표가 비었을 때).
 *
 * 화면에서 뗀 까닭은 `journalRoute.ts`와 같다(구현 결정 158) — 순수 함수라
 * Vitest로 못박을 수 있고, `react-refresh/only-export-components`도 막는다.
 */
export interface Choice {
  key: string
  classId: string | null
  icon: number
  /** 화면에 적을 이름. 그림뿐이면 번호로 부른다 — 이름을 지어내지 않는다. */
  title: string
  handSize: number
  /** 레벨 1~9의 최대 체력. 아홉 칸이 아니면 비어 있다(구현 결정 116). */
  hp: number[]
  /** 그림이 없으면 첫 글자로 대신한다(사자의 턱 넷이 그렇다, `0012`). */
  letter: string
}

/**
 * 무엇을 늘어놓을 것인가.
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ **넣어 둔 클래스가 있으면 그중에서, 없으면 그림에서 고른다.**             │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * 클래스 수치는 레포에 없고 DB에만 있다(절대 원칙 1). 아무것도 안 넣었으면 이름도
 * 체력도 없으므로 **Creator Pack 아이콘 21개**를 늘어놓는다 — 봉투 겉면에 인쇄된
 * 그림이라 사람이 제 것과 같은 것을 찾으면 된다(구현 결정 40).
 *
 * **「나중에 정한다」는 두지 않는다**(2026-08-13). 서버는 클래스 없는 캐릭터를
 * 여전히 받지만(구현 결정 183 — 옛 캐릭터가 갇히지 않게), 세우는 자리에서 고르지
 * 않을 까닭이 없다 — 봉투를 뜯고 나서 만드는 것이라 무엇인지 이미 안다.
 *
 * **반쯤 채워진 체력표는 없는 것으로 친다**(구현 결정 116) — 잘못 읽히기만 한다.
 */
export function choicesOf(list: readonly ClassInfo[]): Choice[] {
  if (list.length > 0) {
    return list.map((info) => ({
      key: info.id,
      classId: info.id,
      icon: info.icon ?? 0,
      title: info.name,
      handSize: info.handSize,
      hp: info.hp.length === 9 ? info.hp : [],
      letter: info.name.slice(0, 1),
    }))
  }

  return Array.from({ length: CLASS_ICON_COUNT }, (_, i) => i + 1).map((n) => ({
    key: `icon-${n}`,
    classId: null,
    icon: n,
    title: `표식 ${n}번`,
    handSize: 0,
    hp: [],
    letter: '?',
  }))
}
