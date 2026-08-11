import type { PerkDeckChange } from '../satchel/widgets/deck/perks'
import type { ClassPerk } from './perkNet'

/**
 * 특혜 표를 상자로 펴고, 켠 상자를 덱 변경으로 옮긴다.
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ **줄이 아니라 상자가 열쇠다.**                                            │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * 실물 시트는 줄마다 체크상자가 하나에서 셋까지 붙어 있고, 클래스마다 상자를 다
 * 세면 정확히 열다섯이다. 캐릭터가 켜 둔 것(`characters.perks`)은 **상자 번호**
 * 이므로, 줄을 차례로 펴서 `count`만큼 번호를 매기면 지금 있는 값과 그대로
 * 맞물린다 — 캐릭터 쪽 표를 고칠 일이 없다.
 *
 * 순수 함수로 떼어 둔다(SPEC 4.1). **표 자체는 여기 없다** — 어느 클래스가 어떤
 * 특혜를 갖는지는 게임 콘텐츠이며 DB에만 있다(`perkNet.ts`).
 */

/** 시트에서 상자 하나가 놓인 자리. */
export interface PerkBox {
  /** 1부터. 캐릭터가 켜 두는 번호이며 실물 시트의 상자 차례와 같다. */
  slot: number
  /** 이 상자가 속한 줄. */
  perk: ClassPerk
  /** 그 줄 안에서 몇 번째 상자인가. 0부터. */
  indexInPerk: number
}

/**
 * 표를 상자 하나하나로 편다.
 *
 * 줄의 `sort` 차례를 따르며, 번호는 **표에 적힌 차례로** 붙는다. `sort`에 틈이
 * 있어도 번호는 틈 없이 이어진다 — 상자 번호는 위치이지 이름이 아니다.
 */
export function perkBoxes(perks: readonly ClassPerk[]): PerkBox[] {
  const ordered = [...perks].sort((a, b) => a.sort - b.sort)
  const boxes: PerkBox[] = []
  let slot = 1
  for (const perk of ordered) {
    for (let i = 0; i < perk.count; i += 1) {
      boxes.push({ slot, perk, indexInPerk: i })
      slot += 1
    }
  }
  return boxes
}

/** 줄 하나와 그 줄의 첫 상자 번호. 화면이 줄 단위로 그릴 때 쓴다. */
export interface PerkRow {
  perk: ClassPerk
  /** 이 줄의 첫 상자 번호. 1부터. */
  first: number
}

export function perkRowsOf(perks: readonly ClassPerk[]): PerkRow[] {
  const ordered = [...perks].sort((a, b) => a.sort - b.sort)
  const rows: PerkRow[] = []
  let first = 1
  for (const perk of ordered) {
    rows.push({ perk, first })
    first += perk.count
  }
  return rows
}

/** 이 클래스의 상자가 모두 몇 개인가. 실물 시트에서는 열다섯이다. */
export function perkBoxCount(perks: readonly ClassPerk[]): number {
  return perks.reduce((total, perk) => total + perk.count, 0)
}

/**
 * 켠 상자를 덱 변경 목록으로.
 *
 * **상자 하나에 그 줄의 변경이 한 번씩 얹힌다.** "−1 카드 2장 제거"에 상자가 둘
 * 붙어 있으면 둘 다 켰을 때 −1이 넉 장 빠진다 — 실물에서도 그렇게 센다.
 *
 * 모르는 번호는 조용히 지나친다. 클래스를 바꾸거나 표를 고친 뒤에는 켜 둔 번호가
 * 표 밖을 가리킬 수 있고, **그때 던지면 덱이 통째로 서지 않는다**(절대 원칙 3).
 */
export function perkDeckChanges(
  perks: readonly ClassPerk[],
  checked: readonly number[],
): PerkDeckChange[] {
  const boxes = new Map(perkBoxes(perks).map((box) => [box.slot, box]))
  const changes: PerkDeckChange[] = []

  for (const slot of checked) {
    const box = boxes.get(slot)
    if (!box) continue
    for (const [kindId, delta] of Object.entries(box.perk.changes)) {
      changes.push({ kindId, delta })
    }
  }

  return changes
}
