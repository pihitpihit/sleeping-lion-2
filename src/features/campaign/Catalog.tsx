import { useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { MiniDialog } from './MiniDialog'
import { fold } from './searchFold'
import { useScrollLock } from './useScrollLock'
import './Catalog.css'

/**
 * 함께 적어 두고 골라 담는 목록 — **상점과 업적이 같은 것을 쓴다.**
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ **적기 전에 먼저 찾는다 — 꼬리표를 다는 결이다.**                         │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * 목록이 길어지면 같은 것을 두 번 적게 된다(서버가 막지만 그때는 이미 헛손질을
 * 한 뒤다). 치는 대로 걸러 주고 **똑같은 이름이 없을 때만 「추가」가 나온다**
 * (형님이 정했다).
 *
 * 견주는 눈은 `fold`다 — 공백과 대소문자를 안 가린다. **약간의 차이로 없다고
 * 하면 같은 것이 두 벌 생긴다**(구현 결정 348).
 *
 * 상점과 업적은 **값이 있고 없고**만 다르다. 줄 끝에 무엇을 세울지(`tail`)와
 * 머리에 무엇을 얹을지(`head`)만 받아 두고 나머지는 여기서 한다 — 두 벌로
 * 그리면 언젠가 한쪽만 고치게 된다.
 */

export interface CatalogEntry {
  readonly id: string
  readonly name: string
}

export function CatalogPopup(props: CatalogProps) {
  /* 떠 있는 동안 뒤쪽 시트가 따라 구르지 않게 붙들어 둔다. */
  useScrollLock()
  return createPortal(
    <div className="cat">
      <CatalogPanel {...props} />
    </div>,
    document.body,
  )
}

interface CatalogProps {
  title: string
  /** 이미 가진 것에 붙일 말. 상점은 「보유」, 업적은 「달성」. */
  ownedWord: string
  /** 적어 둔 것 전부. 아직 못 읽었으면 `null`. */
  entries: readonly CatalogEntry[] | null
  /** 지금 들고 있는 이름들. **초안의 값이다** — 방금 담은 것이 곧바로 표시된다. */
  owned: readonly string[]
  canDefine: boolean
  /** 머리에 얹을 것(가진 금화 따위). */
  head?: ReactNode
  /** 줄 끝에 세울 것(구매·담기). */
  tail: (entry: CatalogEntry, ownedCount: number) => ReactNode
  /** 지울 때 함께 적을 말. 무엇이 함께 사라지는지는 목록마다 다르다. */
  dropNote: ReactNode
  onAdd: (name: string) => void
  onDrop: (entry: CatalogEntry) => void
  onClose: () => void
}

/**
 * 목록의 알맹이.
 *
 * 자리 잡기(`CatalogPopup`)와 갈라 둔다 — `createPortal`은 `document.body`를
 * 요구해 서버 렌더로 확인할 수 없다(구현 결정 194).
 */
export function CatalogPanel({
  title,
  ownedWord,
  entries,
  owned,
  canDefine,
  head,
  tail,
  dropNote,
  onAdd,
  onDrop,
  onClose,
}: CatalogProps) {
  const [query, setQuery] = useState('')
  const [dropping, setDropping] = useState<CatalogEntry | null>(null)

  const folded = fold(query)
  const shown = (entries ?? []).filter((e) => fold(e.name).includes(folded))
  /* 똑같은 이름이 이미 있으면 더할 것이 없다 — 부분만 맞는 것은 다른 것이다. */
  const exists = (entries ?? []).some((e) => fold(e.name) === folded)
  const canAdd = canDefine && folded !== '' && !exists

  return (
    <section className="cat__panel" role="dialog" aria-modal="true" aria-label={title}>
      <header className="cat__head">
        <h2 className="cat__title">{title}</h2>
        {head}
        <button type="button" className="cat__close" aria-label="닫기" onClick={onClose}>
          ×
        </button>
      </header>

      <div className="cat__body">
        <div className="cat__find">
          <input
            className="sheet__input cat__query"
            value={query}
            placeholder={`${title} 찾기`}
            aria-label={`${title} 찾기`}
            maxLength={80}
            onChange={(e) => setQuery(e.target.value)}
          />
          {canAdd && (
            <button
              type="button"
              className="sheet__save cat__add"
              onClick={() => onAdd(query.trim())}
            >
              추가
            </button>
          )}
        </div>

        {entries === null ? (
          <p className="cat__empty">읽는 중…</p>
        ) : entries.length === 0 ? (
          <p className="cat__empty">아직 적어 둔 것이 없다. 위에 이름을 치면 적을 수 있다.</p>
        ) : shown.length === 0 ? (
          <p className="cat__empty">찾는 것이 없다. 위의 「추가」로 적으면 된다.</p>
        ) : (
          <ul className="cat__list">
            {shown.map((entry) => {
              const have = owned.filter((n) => fold(n) === fold(entry.name)).length
              return (
                <li key={entry.id} className="cat__row">
                  <span className="cat__name">
                    {entry.name}
                    {have > 0 && (
                      <span className="cat__have">
                        {ownedWord}
                        {have > 1 && <span className="sl-numeral"> {have}</span>}
                      </span>
                    )}
                  </span>
                  {tail(entry, have)}
                  {/*
                      지우는 것은 적은 사람과 관리자다 — 아니면 서버가 막는다.
                      **한 번 묻는다**: 목록은 함께 쓰는 것이라 남이 쓰려던 것이
                      손가락 한 번에 사라지면 안 된다(형님이 짚었다).
                    */}
                  <button
                    type="button"
                    className="cat__drop"
                    aria-label={`'${entry.name}' 목록에서 지우기`}
                    onClick={() => setDropping(entry)}
                  >
                    ×
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {dropping !== null && (
        <MiniDialog
          label={`'${dropping.name}' 지우기`}
          title={
            <>
              <b>{dropping.name}</b>을 목록에서 지웁니까?
            </>
          }
        >
          <p className="mini__body">{dropNote}</p>
          <div className="mini__acts">
            <button
              type="button"
              className="mini__alt"
              onClick={() => {
                onDrop(dropping)
                setDropping(null)
              }}
            >
              지운다
            </button>
            <button type="button" className="mini__cancel" onClick={() => setDropping(null)}>
              취소
            </button>
          </div>
        </MiniDialog>
      )}
    </section>
  )
}
