import { useEffect, useState } from 'react'
import { CatalogPopup, type CatalogEntry } from './Catalog'
import { Coin } from '../satchel/widgets/gold/Coin'
import { MiniDialog } from './MiniDialog'
import { Price } from './Price'
import { useShopStore } from './shopStore'
import type { ShopItem } from './shopNet'
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
 * 가격 둘뿐이고, 찾다가 없으면 그 자리에서 한 줄 더한다.
 *
 * 늘어놓는 모양은 업적과 함께 쓴다(`CatalogPopup`) — **다른 것은 값이 있고 없고
 * 뿐이다.** 여기서 더하는 것은 가진 금화(머리)와 사는 단추(줄 끝), 그리고 새로
 * 적을 때 값을 묻는 팝업이다.
 *
 * 사면 **초안에 담긴다.** 저장을 눌러야 남는 것은 시트의 다른 칸과 같다
 * (구현 결정 165) — 상점에서 잘못 눌러도 취소하면 없던 일이 된다.
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

  /** 값을 물어보는 중인 이름. 새로 적는 것은 값을 받아야 하므로 한 번 더 묻는다. */
  const [asking, setAsking] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

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

  const byId = new Map(items.map((i) => [i.id, i]))

  return (
    <>
      <CatalogPopup
        title="상점"
        ownedWord="보유"
        entries={loaded ? items : null}
        owned={owned}
        canDefine={userId !== null}
        head={
          /* 가진 금화. 시트가 쓰는 것과 같은 금화라 같은 값으로 읽힌다. */
          <span className="shop__purse" role="img" aria-label={`가진 골드 ${gold}`}>
            <Coin />
            <b className="sl-numeral" aria-hidden="true">
              {gold}
            </b>
          </span>
        }
        tail={(entry) => {
          const item = byId.get(entry.id)
          if (item === undefined) return null
          const short = item.cost > gold
          return (
            <>
              <Price cost={item.cost} />
              {/*
                **모자라면 못 산다.** 규칙을 판정하는 것이 아니라 셈이다 — 골드가
                음수가 되는 자리는 뜻이 없다. 까닭을 글자로도 적는다.
              */}
              <button
                type="button"
                className="shop__buy"
                disabled={short}
                onClick={() => onBuy(item)}
              >
                {short ? '골드 부족' : '구매'}
              </button>
            </>
          )
        }}
        dropNote={
          <>
            <strong>목록은 함께 쓰는 것이다</strong> — 지우면 다른 사람의 상점에서도 사라진다. 이미
            들고 있는 것은 그대로 남는다.
          </>
        }
        onAdd={(name) => {
          setError(null)
          setAsking(name)
        }}
        onDrop={(entry) => void drop(entry.id)}
        onClose={onClose}
      />

      {error !== null && (
        <p className="shop__error" role="alert">
          {error}
        </p>
      )}

      {/* 새로 적는 것은 값을 받아야 한다 — 이름은 이미 쳤으므로 값만 묻는다. */}
      {asking !== null && (
        <PriceDialog
          name={asking}
          onCancel={() => setAsking(null)}
          onDone={async (cost) => {
            try {
              await define(asking, cost, userId ?? '')
              setAsking(null)
            } catch (cause) {
              console.error('[shop]', cause)
              setAsking(null)
              setError('적지 못했다. 같은 이름이 이미 있는지 보라.')
            }
          }}
        />
      )}
    </>
  )
}

/**
 * 새 아이템의 값을 묻는다.
 *
 * **이름은 이미 쳤으므로 값만 받는다.** 찾는 칸에서 그대로 이어지는 흐름이라
 * 이름을 다시 적게 하면 두 번 치는 꼴이 된다.
 */
function PriceDialog({
  name,
  onDone,
  onCancel,
}: {
  name: string
  onDone: (cost: number) => void | Promise<void>
  onCancel: () => void
}) {
  const [cost, setCost] = useState('')
  const [busy, setBusy] = useState(false)

  const price = Number.parseInt(cost, 10)
  const ok = cost.trim() !== '' && Number.isFinite(price) && price >= 0

  function done() {
    if (!ok || busy) return
    setBusy(true)
    void Promise.resolve(onDone(price)).finally(() => setBusy(false))
  }

  return (
    <MiniDialog
      label={`'${name}' 값 적기`}
      title={
        <>
          <b>{name}</b>의 값은?
        </>
      }
    >
      <form
        className="shop__ask"
        onSubmit={(e) => {
          e.preventDefault()
          done()
        }}
      >
        <input
          className="sheet__input shop__cost sl-numeral"
          value={cost}
          placeholder="값"
          aria-label="가격"
          inputMode="numeric"
          maxLength={4}
          autoFocus
          onChange={(e) => setCost(e.target.value.replace(/[^0-9]/g, ''))}
        />
        <Coin />
      </form>

      <div className="mini__acts">
        <button type="button" className="mini__go" disabled={!ok || busy} onClick={done}>
          등록
        </button>
        <button type="button" className="mini__cancel" onClick={onCancel}>
          취소
        </button>
      </div>
    </MiniDialog>
  )
}

/** 목록 한 줄이 곧 카탈로그의 한 줄이다 — 이름과 id만 쓴다. */
export type { CatalogEntry }
