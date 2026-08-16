import { useState } from 'react'
import { MiniDialog } from './MiniDialog'
import { Coin } from '../satchel/widgets/gold/Coin'
import { donateToOak } from './campaignNet'
import { useCharacterStore } from './characterStore'
import {
  OAK_CELLS,
  OAK_LAST,
  OAK_UNLOCK_BONUS,
  checkGifts,
  isMark,
  prosperityFrom,
  toNextMark,
} from '../rules/greatOak'
import './GreatOak.css'

/**
 * 위대한 떡갈나무 — **기부한 금화가 쌓이는 판.**
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ **판은 실물 그대로 늘어놓는다.**                                          │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * 형님이 찍어 보낸 판이 110부터 1000까지 열씩이고 오십마다 번영도 표식이 박혀
 * 있다. 수만 적어 두면 「얼마나 왔나」가 안 보이므로 **칸을 그대로 그린다** —
 * 실물을 보던 눈이 그대로 읽는다.
 *
 * 담기는 것은 쌓인 수 하나뿐이고 번영도·다음 표식은 셈해서 낸다
 * (`rules/greatOak.ts`).
 */
export function GreatOak({
  campaignId,
  total: saved,
  canDonate,
}: {
  campaignId: string
  /** 서버에 담긴 값. 기부하면 그 자리에서 올라간다. */
  total: number
  canDonate: boolean
}) {
  const [open, setOpen] = useState(false)
  /*
    **기부한 결과를 그 자리에서 든다.** 기록지 스토어를 다시 읽어 오게 하면
    파티 목록까지 딸려 오는데, 여기서 바뀌는 것은 이 수 하나다.
  */
  const [added, setAdded] = useState<number | null>(null)
  const total = added ?? saved

  /* 낼 사람과 가진 골드. **무리 목록이 이미 읽어 둔 것을 본다** — 두 번 읽지 않는다. */
  const members = useCharacterStore((s) => s.characters)
  const reloadCrew = useCharacterStore((s) => s.load)

  /*
    **판이 열리는 것만으로 번영도 하나를 받는다**(형님이 정했다) — 금화 100개를
    낸 삯이며 판에 오르기 전의 몫이라 표식과 따로 센다.
  */
  const prosperity = OAK_UNLOCK_BONUS + prosperityFrom(total)
  const left = toNextMark(total)

  return (
    <div className="oak">
      <div className="oak__facts">
        <span className="oak__fact">
          <Coin />
          <b className="sl-numeral">{total}</b>
        </span>
        <span className="oak__fact oak__fact--pros">
          번영도 <b className="sl-numeral">+{prosperity}</b>
          <span className="oak__why">
            (개봉 <b className="sl-numeral">1</b> + 표식{' '}
            <b className="sl-numeral">{prosperityFrom(total)}</b>)
          </span>
        </span>
        {left !== null && (
          <span className="oak__fact oak__fact--left">
            다음 표식까지 <b className="sl-numeral">{left}</b>
          </span>
        )}
      </div>

      {/*
        판. 사진처럼 열씩 늘어서고 **표식이 박힌 칸은 도드라진다** — 채워진 칸은
        금빛이다.
      */}
      <ol className="oak__track" aria-label={`떡갈나무에 ${total} 쌓임`}>
        {OAK_CELLS.map((cell) => (
          <li
            key={cell}
            className={[
              'oak__cell',
              cell <= total ? 'oak__cell--on' : '',
              isMark(cell) ? 'oak__cell--mark' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            aria-hidden="true"
          >
            <span className="oak__no sl-numeral">{cell}</span>
          </li>
        ))}
      </ol>

      {canDonate && total < OAK_LAST && (
        <div className="char__shoprow">
          <button type="button" className="char__shopopen" onClick={() => setOpen(true)}>
            기부하기
          </button>
        </div>
      )}

      {open && (
        <DonateDialog
          campaignId={campaignId}
          members={members.filter((c) => !c.retired && c.deletedAt === null)}
          onClose={() => setOpen(false)}
          onDone={(next) => {
            setAdded(next)
            /* 골드가 깎였다 — 무리 목록도 새것으로 읽는다. */
            void reloadCrew(campaignId)
            setOpen(false)
          }}
        />
      )}
    </div>
  )
}

/**
 * 누가 얼마씩 낼지 정한다.
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ **합산이 열 단위여야 한다 — 각자는 아니어도 된다.**                       │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * 형님이 정했다. 판의 칸이 열씩이라 그 사이에 멈출 자리가 없다 — 넷이 5씩 둘,
 * 10 하나로 내도 합이 20이면 된다.
 */
function DonateDialog({
  campaignId,
  members,
  onDone,
  onClose,
}: {
  campaignId: string
  members: readonly { id: string; name: string; gold: number }[]
  onDone: (next: number) => void
  onClose: () => void
}) {
  const [gifts, setGifts] = useState<Record<string, number>>({})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const rows = members.map((m) => ({ ...m, amount: gifts[m.id] ?? 0 }))
  const total = rows.reduce((sum, r) => sum + r.amount, 0)
  const problem = checkGifts(rows)

  function set(id: string, next: number, gold: number) {
    setGifts((g) => ({ ...g, [id]: Math.max(0, Math.min(gold, next)) }))
  }

  async function give() {
    if (problem !== null || busy) return
    setBusy(true)
    setError(null)
    try {
      const next = await donateToOak(campaignId, gifts)
      onDone(next)
    } catch (cause) {
      console.error('[oak]', cause)
      setError('기부하지 못했다. 가진 골드와 합산 단위를 보라.')
      setBusy(false)
    }
  }

  return (
    <MiniDialog label="떡갈나무에 기부" title="떡갈나무에 기부">
      <p className="mini__body">
        파티원이 나눠 낸다. <strong>합산이 10 단위</strong>여야 하고, 각자 가진 것보다 많이 낼 수는
        없다.
      </p>

      <ul className="oak__gifts">
        {rows.map((row) => (
          <li key={row.id} className="oak__gift">
            <span className="oak__who">
              <b>{row.name}</b>
              <span className="oak__have sl-numeral" aria-label={`가진 골드 ${row.gold}`}>
                <Coin />
                {row.gold}
              </span>
            </span>

            <span className="oak__amount">
              {/*
                **한 단위로 오르내린다**(형님이 짚었다). 열 단위여야 하는 것은
                **이번에 내는 합산**이지 각자의 몫이 아니다 — 합이 안 맞으면
                아래 단추가 잠긴다.
              */}
              <button
                type="button"
                className="tally__caret"
                aria-label={`${row.name} 1 줄이기`}
                disabled={row.amount <= 0}
                onClick={() => set(row.id, row.amount - 1, row.gold)}
              >
                ‹
              </button>
              <b className="sl-numeral">{row.amount}</b>
              <button
                type="button"
                className="tally__caret"
                aria-label={`${row.name} 1 늘리기`}
                disabled={row.amount + 1 > row.gold}
                onClick={() => set(row.id, row.amount + 1, row.gold)}
              >
                ›
              </button>
            </span>
          </li>
        ))}
      </ul>

      <p className={`oak__sum${problem === null ? ' oak__sum--ok' : ''}`}>
        합산 <b className="sl-numeral">{total}</b>
        {problem === 'step' && ' — 10 단위로 맞춰야 한다'}
        {problem === 'short' && ' — 가진 것보다 많다'}
      </p>

      {error !== null && (
        <p className="shop__error" role="alert">
          {error}
        </p>
      )}

      <div className="mini__acts">
        <button
          type="button"
          className="mini__go"
          disabled={problem !== null || busy}
          onClick={() => void give()}
        >
          기부한다
        </button>
        <button type="button" className="mini__cancel" onClick={onClose}>
          취소
        </button>
      </div>
    </MiniDialog>
  )
}
