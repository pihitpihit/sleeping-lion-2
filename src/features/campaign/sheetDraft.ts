import { clampCheckmarks, clampGold, clampLevel, clampXp, normalizePerks } from './character'
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

/** 시트에서 사람이 고치는 칸 전부. */
export interface SheetDraft {
  name: string
  notes: string
  level: number
  xp: number
  gold: number
  checkmarks: number
  perks: number[]
  items: string[]
  retired: boolean
}

/*
  ┌──────────────────────────────────────────────────────────────────────────┐
  │ **클래스는 초안에 없다. 세울 때 정하고 그 뒤로는 못 바꾼다.**             │
  └──────────────────────────────────────────────────────────────────────────┘

  캐릭터가 곧 클래스다. 레벨·경험·퍽·아이템이 전부 그 클래스에 매인 값이라
  클래스만 갈아 끼우면 남은 값들이 통째로 거짓이 된다. 막는 것은 서버이며
  (`0014_lock_character_class.sql`) 여기서 빼 두는 것은 **보낼 수조차 없게**
  하는 것이다 — 화면이 안 내는 것만으로는 잠긴 것이 아니다.
*/

/** 지금 레코드를 초안으로 뜬다. 배열은 **사본으로** 뜬다 — 원본을 건드리면 안 된다. */
export function draftOf(character: Character): SheetDraft {
  return {
    name: character.name,
    notes: character.notes,
    level: character.level,
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

  // 이름은 앞뒤 공백을 턴다. 눈에 안 보이는 차이로 저장 단추가 살아나면 안 된다.
  const name = draft.name.trim()
  if (name !== character.name) edits.name = name

  if (draft.notes !== character.notes) edits.notes = draft.notes

  const level = clampLevel(draft.level)
  if (level !== character.level) edits.level = level

  const xp = clampXp(draft.xp)
  if (xp !== character.xp) edits.xp = xp

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
