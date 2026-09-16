import { useEffect } from 'react'
import { classIconUrl } from '../campaign/character'
import { levelForXp } from '../campaign/character'
import { classInfoOf, maxHpFor, useClassStore } from '../campaign/classStore'
import { perkDeckChanges } from '../campaign/perks'
import type { PerkDeckChange } from './widgets/deck/perks'
import { useRosterStore } from './roster'

/**
 * 캐릭터의 퍽에서 덱 변경을 뽑아 온다 — **축 ②가 축 ①을 읽는 그 예외.**
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ **읽기만 한다. 잇는 자리는 여기 하나다.**                                 │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * SPEC 1장이 2026-08-05에 "공격 보정 덱이 퍽을 읽는다"는 예외를 열었다. 그 예외가
 * 실제로 쓰이는 자리가 여기다 — 덱 구성은 퍽이 정하므로, 못 읽으면 사람이 퍽을
 * 얻을 때마다 위젯 설정에서 장수를 다시 맞춰야 한다.
 *
 * **한 자리에 모아 둔다.** 위젯이 스토어 둘을 직접 부르면 축 ②가 어디서 축 ①에
 * 닿는지 흩어져 보이지 않게 된다. 넓히거나 좁힐 때 볼 곳이 하나여야 한다.
 *
 * **모르면 `null`을 낸다.** 로그인 전이거나, 캐릭터를 안 골랐거나, 클래스를 안
 * 골랐거나, 그 클래스의 특혜 표가 아직 안 들어왔을 때다. 그때는 위젯 설정의
 * 구성으로 간다 — **덱이 비는 것이 아니라 기본값이 되는 것**이라야 한다
 * (절대 원칙 3).
 */
export function usePerkChanges(characterId: string | null): PerkDeckChange[] | null {
  const entries = useRosterStore((s) => s.entries)
  const loadRoster = useRosterStore((s) => s.load)
  const classes = useClassStore((s) => s.list)
  const perkTable = useClassStore((s) => s.perks)
  const loadClasses = useClassStore((s) => s.load)

  useEffect(() => {
    // 고른 캐릭터가 없으면 읽을 것도 없다. 로그인 전에 괜히 서버를 두드리지 않는다.
    if (characterId === null) return
    void loadRoster()
    void loadClasses()
  }, [characterId, loadRoster, loadClasses])

  if (characterId === null) return null

  const entry = entries.find((e) => e.id === characterId)
  if (!entry) return null

  const info = classInfoOf(classes, entry.classId, entry.classIcon)
  if (!info) return null

  const perks = perkTable[info.id]
  // **표가 없으면 모르는 것이다.** 빈 목록을 내면 "퍽을 하나도 안 켰다"가 되어
  // 사람이 설정에 적어 둔 구성을 표준 덱으로 덮어 버린다.
  if (!perks || perks.length === 0) return null

  return perkDeckChanges(perks, entry.perks)
}

/** 한 캐릭터에 대해 축 ②가 읽는 수 둘. */
export interface CharacterStats {
  /** 경험치에서 뽑은 레벨(구현 결정 225) — 표에 적힌 것은 안 믿는다. */
  readonly level: number
  /** 그 레벨의 최대 체력. **모르면 `null`** — 클래스나 체력표가 없을 때다. */
  readonly maxHp: number | null
}

/**
 * 캐릭터마다의 레벨과 최대 체력 — **레벨은 경험치에서 뽑는다**(구현 결정 225).
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ **모르면 `null`이다. 짐작해서 숫자를 내지 않는다.**                       │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * 클래스를 안 골랐거나 그 클래스의 체력표가 아직 안 들어왔으면 모르는 것이다
 * (구현 결정 115) — **틀린 최대 체력은 판을 어긋나게 한다.**
 *
 * 축 ①에 닿는 자리를 여기 하나로 모아 둔다(구현 결정 142). 위젯이 스토어 둘을
 * 직접 부르면 어디서 닿는지 흩어져 보이지 않는다.
 */
export function useCharacterStats(): Map<string, CharacterStats> {
  const entries = useRosterStore((s) => s.entries)
  const loadRoster = useRosterStore((s) => s.load)
  const classes = useClassStore((s) => s.list)
  const loadClasses = useClassStore((s) => s.load)

  useEffect(() => {
    void loadRoster()
    void loadClasses()
  }, [loadRoster, loadClasses])

  const out = new Map<string, CharacterStats>()
  for (const entry of entries) {
    const level = levelForXp(entry.xp)
    const info = classInfoOf(classes, entry.classId, entry.classIcon)
    /*
      **레벨은 늘 안다**(경험치에서 나온다). 최대 체력만 모를 수 있다 — 클래스를
      안 골랐거나 그 클래스의 체력표가 아직 안 들어왔을 때다(구현 결정 115).
    */
    out.set(entry.id, { level, maxHp: maxHpFor(info, level) })
  }
  return out
}

/**
 * 이 덱이 누구 것인가 — 카드 왼쪽 아래 홈에 앉을 것.
 *
 * **여기서 낸다.** 축 ②가 축 ①에 닿는 자리를 하나로 모아 두었으므로
 * (구현 결정 142) 클래스 표식을 찾는 일도 여기 있어야 한다.
 *
 * 클래스 표가 비어 있어도 **아이콘 번호만으로 그림을 찾는다** — 표를 넣기 전에
 * 만든 캐릭터도 제 표식을 갖는다(절대 원칙 3과 같은 결).
 */
export function useCardOwner(characterId: string | null): CardOwner | null {
  const entries = useRosterStore((s) => s.entries)
  const classes = useClassStore((s) => s.list)

  if (characterId === null) return null
  const entry = entries.find((e) => e.id === characterId)
  if (!entry) return null

  const info = classInfoOf(classes, entry.classId, entry.classIcon)
  return ownerBadge(info?.icon ?? entry.classIcon, info?.name ?? '', entry.name)
}

/**
 * 카드가 누구 덱의 것인가 — **왼쪽 아래 홈에 앉는 것.**
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ **카드는 스스로 알아내지 않고 받아서 그린다.**                            │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * 실물에서는 1·2·3·4·M이나 **그 카드를 넣어 준 클래스의 표식**이 들어간다 — 판이
 * 끝나고 덱을 도로 가를 때 쓰는 자리다. 우리는 클래스 표식을 쓴다.
 *
 * 그림과 글자를 여기서 찾지 않고 **부르는 쪽이 건네준다.** 카드가 캐릭터·클래스
 * 스토어를 직접 부르면 축 ②가 축 ①에 닿는 자리가 흩어진다 — 그 자리는
 * `perkSource.ts` 하나여야 한다(구현 결정 142).
 */
export interface CardOwner {
  /** 클래스 표식 그림. 팩에 없는 클래스면 `null`. */
  iconUrl: string | null
  /** 그림이 없을 때 홈에 적을 한 글자. 비면 홈을 비워 둔다. */
  letter: string
  /** 읽어주는 쪽에 갈 이름. */
  name: string
}

/**
 * 라틴 한 글자인가 — **글룸헤이븐 서체를 붙일지 가른다.**
 *
 * 몬스터 덱의 `M`이 그것이며 실물 카드에도 그 서체로 박혀 있다. 한글에는 안
 * 붙인다 — Pirata One은 라틴 전용이라 대체 서체로 떨어진다(구현 결정 39·360).
 *
 * **표식을 짓는 자리에 함께 둔다**(구현 결정 212) — 카드와 HP/XP 트래커가 같은
 * 눈으로 갈라야 한 글자가 화면마다 다른 서체로 서지 않는다.
 */
export function isLatinLetter(letter: string): boolean {
  return /^[A-Za-z0-9]$/.test(letter)
}

/**
 * 표식 하나를 짓는다.
 *
 * **그림이 없으면 첫 글자로 대신한다** — 사자의 턱 넷처럼 팩에 그림이 없는
 * 클래스가 있다(구현 결정 119). 클래스 이름도 없으면 캐릭터 이름을 쓴다.
 */
export function ownerBadge(icon: number, className: string, characterName: string): CardOwner {
  const label = className || characterName
  return {
    iconUrl: classIconUrl(icon),
    letter: label.slice(0, 1),
    name: label,
  }
}
