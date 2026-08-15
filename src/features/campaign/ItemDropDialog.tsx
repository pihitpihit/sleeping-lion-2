import { MiniDialog } from './MiniDialog'
import { Price } from './Price'

/**
 * 아이템을 뺄 때 묻는다 — **그냥 뺄지, 값을 되돌려 받을지.**
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ **없어지는 길이 하나가 아니다.**                                          │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * 상점에 되팔면 금화가 돌아오고, 잃거나 써 없앤 것은 그냥 사라진다. 값이 같아도
 * **어느 쪽인지는 사람만 안다** — 그래서 묻는다(형님이 정했다).
 *
 * `ConfirmDialog`를 쓰지 않는 것은 **갈래가 셋이기 때문**이다(되돌림·그냥·취소).
 * 뜸도 두지 않는다: 여기서 하는 일은 초안을 고치는 것이라 저장 전이면 언제든
 * 물릴 수 있다(구현 결정 165).
 *
 * 값을 모르는 것(상점 목록에 없는 이름)은 되돌릴 수가 없다 — 그때는 갈래가 둘이다.
 */
export function ItemDropDialog({
  name,
  cost,
  onDrop,
  onRefund,
  onCancel,
}: {
  name: string
  /** 되돌려 받을 금화. 목록에 없는 이름이면 `null`. */
  cost: number | null
  onDrop: () => void
  onRefund: () => void
  onCancel: () => void
}) {
  return (
    <MiniDialog
      label={`'${name}' 빼기`}
      title={
        <>
          <b>{name}</b>을 뺍니까?
        </>
      }
    >
      <p className="mini__body">
        상점에 되판 것이면 값을 돌려받고, 잃거나 써 없앤 것이면 그냥 뺀다.
      </p>

      <div className="mini__acts">
        {cost !== null && (
          <button type="button" className="mini__go" onClick={onRefund}>
            값을 돌려받는다 <Price cost={cost} />
          </button>
        )}
        <button type="button" className="mini__alt" onClick={onDrop}>
          그냥 뺀다
        </button>
        <button type="button" className="mini__cancel" onClick={onCancel}>
          취소
        </button>
      </div>
    </MiniDialog>
  )
}
