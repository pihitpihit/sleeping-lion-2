import { useEffect } from 'react'
import { classIconUrl } from '../campaign/character'
import { classInfoOf, useClassStore } from '../campaign/classStore'
import { perkDeckChanges } from '../campaign/perks'
import type { CardOwner } from './widgets/deck/CardFace'
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
