import { useEffect } from 'react'
import { useTreasureStore } from '../campaign/treasureStore'
import type { Treasure } from '../campaign/treasureNet'

/**
 * 참조 화면의 보물 색인.
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ **글은 여기서도 DB에서 온다 — 레포에는 없다.**                            │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * 참조에 게임 원문을 두지 않는다고 적어 두었지만(옛 구현 결정 269) 그것이 막으려던
 * 것은 **레포와 배포물에 들어가는 것**이다(절대 원칙 1). 이 글은 `0041`의 표에만
 * 있고 화면이 읽어 올 뿐이라 그 선은 그대로다 — 파티 기록지가 이미 같은 것을
 * 읽고 있다.
 *
 * 기록지의 것과 갈리는 자리는 하나다: **여기에는 「찾았는가」가 없다.** 참조는
 * 어느 파티의 것도 아니므로 체크할 것이 없고, 번호와 글만 늘어선다.
 */
export function TreasureReference() {
  const items = useTreasureStore((s) => s.items)
  const load = useTreasureStore((s) => s.load)

  useEffect(() => {
    void load()
  }, [load])

  return <TreasureList items={items} />
}

/**
 * 늘어놓는 일 그 자체.
 *
 * 값만 받는 순수한 화면이라 서버 렌더로 끝까지 확인된다(구현 결정 164) —
 * 스토어에 매달린 껍데기는 위에 따로 뒀다.
 */
export function TreasureList({ items }: { items: readonly Treasure[] }) {
  if (items.length === 0) {
    return (
      <p className="ref__hint">
        아직 표가 없다. 책자에 인쇄된 글이라 레포에 담지 않으므로 <a href="#/admin">주인장 화면</a>
        에서 넣는다.
      </p>
    )
  }

  return (
    <ol className="tref__rows">
      {items.map((item) => (
        <li key={item.no} className="tref__row">
          <span className="tref__no sl-numeral">{item.no}</span>
          <span className="tref__text">{item.text}</span>
        </li>
      ))}
    </ol>
  )
}
