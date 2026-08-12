import { clampCheckmarks, clampGold, clampXp, levelForXp, normalizePerks } from './character'
import type { Character, CharacterEdits } from './types'

/**
 * 캐릭터 시트의 초안 — **편집 모드에서 손대는 사본.**
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ **고치는 즉시 보내지 않는다. 저장을 누를 때 한 번 보낸다.**               │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * 2026-08-12까지는 칸을 건드릴 때마다 서버로 갔다. 다이얼을 눌러 골드를 120에서
 * 340으로 옮기면 그 사이 스물두 번이 나가고 `version`이 스물두 번 오른다 —
 * **낙관적 잠금이 타이핑 수만큼 무의미해진다.** 글자 칸만 `onBlur`로 늦춰 두었던
 * 것은 그 문제를 반쯤만 막은 것이었다.
 *
 * 초안을 두면 그 자리에서 다 풀린다. 정산은 여러 칸을 함께 고치는 일이고
 * (골드·경험·체크마크·아이템이 한꺼번에 움직인다) 실물에서도 지우개로 다 고친
 * 다음 덮는다.
 *
 * 순수 함수로 떼어 둔다(SPEC 4.1) — 무엇이 바뀌었는지 세는 셈은 화면이 아니라
 * 여기 있어야 Vitest로 못박을 수 있다.
 */

/**
 * 시트에서 사람이 고치는 칸 전부.
 *
 * **레벨은 여기 없다** — 경험치에서 나오는 값이라 고를 것이 아니다(2026-08-12에
 * 구현 결정 43을 뒤집었다). `sheetDiff`가 경험치에서 뽑아 함께 보낸다.
 *
 * **이름과 클래스도 없다** — 생성할 때 정하고 그 뒤로는 못 바꾼다. 막는 것은
 * 서버이며(`0014`·`0017`) 여기서 빼 두는 것은 **보낼 수조차 없게** 하는 것이다.
 */
export interface SheetDraft {
  notes: string
  xp: number
  gold: number
  checkmarks: number
  perks: number[]
  items: string[]
  retired: boolean
}

/*
  ┌──────────────────────────────────────────────────────────────────────────┐
  │ **이름과 클래스는 초안에 없다. 생성할 때 정한다.**                        │
  └──────────────────────────────────────────────────────────────────────────┘

  캐릭터가 곧 클래스이고, 파티원은 이름으로 서로를 부른다 — 판 도중에 이름이
  바뀌면 옆 사람이 보던 것이 딴 사람이 된다. 막는 것은 서버이며(`0014`·`0017`)
  여기서 빼 두는 것은 **보낼 수조차 없게** 하는 것이다 — 화면이 안 내는 것만으로는
  잠긴 것이 아니다.
*/

/** 지금 레코드를 초안으로 뜬다. 배열은 **사본으로** 뜬다 — 원본을 건드리면 안 된다. */
export function draftOf(character: Character): SheetDraft {
  return {
    notes: character.notes,
    xp: character.xp,
    gold: character.gold,
    checkmarks: character.checkmarks,
    perks: [...character.perks],
    items: [...character.items],
    retired: character.retired,
  }
}

function sameNumbers(a: readonly number[], b: readonly number[]): boolean {
  return a.length === b.length && a.every((n, i) => n === b[i])
}

function sameStrings(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((s, i) => s === b[i])
}

/**
 * 초안에서 **실제로 바뀐 칸만** 뽑는다.
 *
 * 통째로 보내지 않는 까닭은 둘이다. ① 안 건드린 칸까지 덮으면 그 사이 남이 고친
 * 것을 되돌린다. ② 무엇이 바뀌었는지가 곧 저장 단추가 살아나는 조건이라, 그
 * 판정을 두 곳에서 따로 하면 언젠가 어긋난다 — **한 함수가 둘 다 낸다.**
 *
 * 값은 여기서 울타리 안으로 들인다. 화면이 숫자 칸에 아무거나 칠 수 있으므로
 * 마지막 관문이 필요하다.
 */
export function sheetDiff(character: Character, draft: SheetDraft): CharacterEdits {
  const edits: CharacterEdits = {}

  if (draft.notes !== character.notes) edits.notes = draft.notes

  const xp = clampXp(draft.xp)
  if (xp !== character.xp) edits.xp = xp

  /*
    ┌────────────────────────────────────────────────────────────────────────┐
    │ **레벨은 고르는 값이 아니라 경험치에서 나오는 값이다.**                 │
    └────────────────────────────────────────────────────────────────────────┘

    그래서 초안에 없다. 그래도 **함께 보내 표에 적어 둔다** — 목록 화면이 경험치
    없이 레벨만 읽는 자리가 있고, 표에 옛 값이 남아 있으면 시트와 목록이 다른
    수를 말한다.
  */
  const level = levelForXp(xp)
  if (level !== character.level) edits.level = level

  const gold = clampGold(draft.gold)
  if (gold !== character.gold) edits.gold = gold

  const checkmarks = clampCheckmarks(draft.checkmarks)
  if (checkmarks !== character.checkmarks) edits.checkmarks = checkmarks

  const perks = normalizePerks(draft.perks)
  if (!sameNumbers(perks, character.perks)) edits.perks = perks

  // 빈 줄은 아이템이 아니다. 걸러 내되 차례는 지킨다.
  const items = draft.items.map((s) => s.trim()).filter((s) => s !== '')
  if (!sameStrings(items, character.items)) edits.items = items

  if (draft.retired !== character.retired) edits.retired = draft.retired

  return edits
}

/**
 * 고친 것이 있는가 — **저장 단추가 살아나는 조건.**
 *
 * `sheetDiff`가 낸 것이 비었는지로 판정한다. 칸마다 따로 세면 새 칸이 늘 때마다
 * 두 곳을 고쳐야 하고, 한 곳을 빠뜨리면 **고쳤는데 저장이 안 눌리는** 꼴이 난다.
 */
export function isDirty(character: Character, draft: SheetDraft): boolean {
  return Object.keys(sheetDiff(character, draft)).length > 0
}
