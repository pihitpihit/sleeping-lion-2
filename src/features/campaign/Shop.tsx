import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useScrollLock } from './useScrollLock'
import { useShopStore } from './shopStore'
import type { ShopItem } from './shopNet'
import { Coin } from '../satchel/widgets/gold/Coin'
import { Price } from './Price'
import './Shop.css'

/**
 * 상점 — **화면을 통째로 덮는 팝업.**
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ **사는 일은 고르는 일이라 늘어놓을 자리가 필요하다.**                     │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * 시트의 아이템 칸은 「무엇을 들었나」를 적는 자리다. 무엇을 살 수 있나는 그보다
 * 넓게 펴 놓고 값을 견주는 일이므로 덱 펼쳐 보기와 같은 짜임으로 둔다.
 *
 * **목록은 우리가 적는다**(`0023`) — 남의 데이터베이스를 들이지 않는다. 이름과
 * 가격 둘뿐이고, 그 자리에서 한 줄 더할 수 있다.
 *
 * 사면 **초안에 담긴다.** 저장을 눌러야 남는 것은 시트의 다른 칸과 같다
 * (구현 결정 165) — 상점에서 잘못 눌러도 취소하면 없던 일이 된다.
 *
 * 자리 잡기(`Shop`)와 알맹이(`ShopPanel`)를 가른다 — `createPortal`은
 * `document.body`를 요구해 서버 렌더로 확인할 수 없다(구현 결정 194).
 */
export function Shop({
  gold,
  owned,
  userId,
  onBuy,
  onClose,
}: {
  /** 지금 가진 금화. **초안의 값이다** — 방금 산 것이 곧바로 빠진다. */
  gold: number
  /** 지금 들고 있는 것들. **초안의 값이다** — 방금 산 것이 곧바로 표시된다. */
  owned: readonly string[]
  userId: string | null
  onBuy: (item: ShopItem) => void
  onClose: () => void
}) {
  const items = useShopStore((s) => s.items)
  const loaded = useShopStore((s) => s.loaded)
  const load = useShopStore((s) => s.load)
  const define = useShopStore((s) => s.add)
  const drop = useShopStore((s) => s.drop)

  useScrollLock()

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return createPortal(
    <div className="shop">
      <ShopPanel
        items={loaded ? items : null}
        gold={gold}
        owned={owned}
        canDefine={userId !== null}
        onDefine={(name, cost) => define(name, cost, userId ?? '')}
        onDrop={drop}
        onBuy={onBuy}
        onClose={onClose}
      />
    </div>,
    document.body,
  )
}

/**
 * 상점의 알맹이.
 *
 * **가진 금화가 머리에 붙어 있다** — 무엇을 살 수 있는지는 값만으로는 알 수 없고,
 * 사고 나면 그 자리에서 줄어야 얼마 남았는지 안다.
 */
export function ShopPanel({
  items,
  gold,
  owned,
  canDefine,
  onDefine,
  onDrop,
  onBuy,
  onClose,
}: {
  items: readonly ShopItem[] | null
  gold: number
  owned: readonly string[]
  canDefine: boolean
  onDefine: (name: string, cost: number) => void | Promise<void>
  onDrop: (id: string) => void | Promise<void>
  onBuy: (item: ShopItem) => void
  onClose: () => void
}) {
  const [name, setName] = useState('')
  const [cost, setCost] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const price = Number.parseInt(cost, 10)
  const priceOk = cost.trim() !== '' && Number.isFinite(price) && price >= 0
  const canAdd = canDefine && name.trim() !== '' && priceOk && !busy

  async function add() {
    if (!canAdd) return
    setBusy(true)
    setError(null)
    try {
      await onDefine(name.trim(), price)
      setName('')
      setCost('')
    } catch (cause) {
      console.error('[shop]', cause)
      /* 같은 이름을 두 번 적으면 서버가 막는다(`0023`의 유일 인덱스). */
      setError('적지 못했다. 같은 이름이 이미 있는지 보라.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="shop__panel" role="dialog" aria-modal="true" aria-label="상점">
      <header className="shop__head">
        <h2 className="shop__title">상점</h2>
        {/* 가진 금화. 시트가 쓰는 것과 같은 금화라 같은 값으로 읽힌다. */}
        <span className="shop__purse" role="img" aria-label={`가진 골드 ${gold}`}>
          <Coin />
          <b className="sl-numeral" aria-hidden="true">
            {gold}
          </b>
        </span>
        <button type="button" className="shop__close" aria-label="닫기" onClick={onClose}>
          ×
        </button>
      </header>

      <div className="shop__body">
        {/* ----------------------------------------------------------------
            새 아이템 — **우리가 적는다**
            ---------------------------------------------------------------- */}
        <form
          className="shop__define"
          onSubmit={(e) => {
            e.preventDefault()
            void add()
          }}
        >
          <input
            className="sheet__input shop__name"
            value={name}
            placeholder="아이템 이름"
            aria-label="새 아이템 이름"
            maxLength={60}
            disabled={!canDefine}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            className="sheet__input shop__cost sl-numeral"
            value={cost}
            placeholder="값"
            aria-label="새 아이템 가격"
            inputMode="numeric"
            maxLength={4}
            disabled={!canDefine}
            onChange={(e) => setCost(e.target.value.replace(/[^0-9]/g, ''))}
          />
          <button type="submit" className="sheet__save shop__add" disabled={!canAdd}>
            등록
          </button>
        </form>

        {error !== null && (
          <p className="shop__error" role="alert">
            {error}
          </p>
        )}

        {/* ----------------------------------------------------------------
            목록
            ---------------------------------------------------------------- */}
        {items === null ? (
          <p className="shop__empty">읽는 중…</p>
        ) : items.length === 0 ? (
          <p className="shop__empty">아직 적어 둔 것이 없다. 위에서 한 줄 적으면 된다.</p>
        ) : (
          <ul className="shop__list">
            {items.map((item) => {
              const short = item.cost > gold
              /*
                **들고 있는 것은 그렇다고 말한다.** 같은 것을 두 개 사는 일이
                없지는 않으므로 막지는 않고 몇 개인지만 적는다.
              */
              const have = owned.filter((n) => n.trim() === item.name.trim()).length
              return (
                <li key={item.id} className="shop__row">
                  <span className="shop__itemname">
                    {item.name}
                    {have > 0 && (
                      <span className="shop__have">
                        보유{have > 1 && <span className="sl-numeral"> {have}</span>}
                      </span>
                    )}
                  </span>
                  <Price cost={item.cost} />
                  {/*
                    **모자라면 못 산다.** 규칙을 판정하는 것이 아니라 셈이다 —
                    골드가 음수가 되는 자리는 뜻이 없다. 까닭을 글자로도 적는다.
                  */}
                  <button
                    type="button"
                    className="shop__buy"
                    disabled={short}
                    onClick={() => onBuy(item)}
                  >
                    {short ? '골드 부족' : '구매'}
                  </button>
                  {/* 지우는 것은 적은 사람과 관리자다 — 아니면 서버가 막는다. */}
                  <button
                    type="button"
                    className="shop__drop"
                    aria-label={`'${item.name}' 목록에서 지우기`}
                    onClick={() => void onDrop(item.id)}
                  >
                    ×
                  </button>
                </li>
              )
            })}
          </ul>
        )}

        <p className="shop__note">
          산 것은 <strong>초안에 담긴다</strong> — 시트에서 저장을 눌러야 남는다.
        </p>
      </div>
    </section>
  )
}
