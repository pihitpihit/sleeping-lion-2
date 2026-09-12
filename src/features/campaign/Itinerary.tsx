import { useState } from 'react'
import { ConfirmDialog } from '../satchel/board/ConfirmDialog'
import { isDate, stopLabel, type Stop } from './itineraryOrder'

/**
 * 파티의 행적 — **「머무는 곳」 한 칸을 대신한다**(형님이 정했다).
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ **맨 위가 지금 머무는 곳이다.**                                           │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * 자유 입력 한 칸으로 두면 다음 곳으로 옮길 때 앞의 것이 지워진다 — **지나온
 * 자리가 남지 않는다.** 한 줄씩 쌓아 두면 그것이 곧 행적이다.
 *
 * 자리 잡기와 알맹이를 가르지 않았다 — 여기에는 `createPortal`이 없고 스토어도
 * 안 부른다. **값과 손잡이를 다 받으므로 서버 렌더로 끝까지 확인된다**(구현 결정 164).
 */
export function Itinerary({
  stops,
  editing,
  busy,
  today,
  onAdd,
  onEdit,
  onRemove,
  onShift,
}: {
  stops: readonly Stop[]
  editing: boolean
  busy: boolean
  /** 새 줄에 미리 넣을 날짜(`YYYY-MM-DD`). **렌더 중에 시각을 읽지 않는다**(구현 결정 12). */
  today: string
  onAdd: (stop: Omit<Stop, 'id'>) => void
  onEdit: (stop: Stop) => void
  onRemove: (id: string) => void
  onShift: (id: string, delta: number) => void
}) {
  /** 지금 펼쳐 고치고 있는 줄. 한 번에 하나만 — 스무 줄이 다 열리면 읽을 수가 없다. */
  const [openId, setOpenId] = useState<string | null>(null)
  const [asking, setAsking] = useState<Stop | null>(null)
  const [adding, setAdding] = useState(false)

  return (
    <div className="itin">
      {stops.length === 0 ? (
        <p className="sheet__empty">
          아직 적은 곳이 없다. {editing ? '아래에서 한 줄 적는다.' : '편집으로 들어가 적는다.'}
        </p>
      ) : (
        <ol className={`itin__rows${editing ? ' itin__rows--editing' : ''}`}>
          {stops.map((stop, i) => {
            const label = stopLabel(stop)
            const open = editing && openId === stop.id
            /*
              ┌────────────────────────────────────────────────────────────┐
              │ **줄을 격자로 못박는다 — 흘려 넣지 않는다.**                │
              └────────────────────────────────────────────────────────────┘

              흘려 넣었더니 첫 줄만 「지금」 배지 폭만큼 밀려 날짜 열이 어긋나고,
              같은 줄에서 손잡이가 다음 줄로 넘어가 높이가 두 배가 되었다
              (형님이 짚었다). 열을 고정하면 어떤 폭에서도 날짜가 한 줄에 선다
              (구현 결정 186과 같은 손질).

              **고치기는 줄 자체를 누르는 것이다.** 단추를 셋 두면 좁은 화면에서
              라벨 자리가 죽는다 — 누르는 자리와 읽는 자리를 겹친다.
            */
            const cells = (
              <>
                <span className="itin__mark">
                  {i === 0 && <span className="itin__now">지금</span>}
                </span>
                <span className="itin__at sl-numeral">{stop.at ?? '—'}</span>
                <span className="itin__label">{label === '' ? '적은 것 없음' : label}</span>
              </>
            )

            return (
              <li key={stop.id} className={`itin__row${i === 0 ? ' itin__row--now' : ''}`}>
                {editing ? (
                  <div className="itin__line">
                    <button
                      type="button"
                      className="itin__pick"
                      aria-expanded={open}
                      aria-label={`${label || '이 줄'} 고치기`}
                      onClick={() => setOpenId(open ? null : stop.id)}
                    >
                      {cells}
                    </button>
                    <span className="itin__tools">
                      <button
                        type="button"
                        className="itin__tool"
                        aria-label={`${label || '이 줄'} 한 칸 위로`}
                        disabled={busy || i === 0}
                        onClick={() => onShift(stop.id, -1)}
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        className="itin__tool"
                        aria-label={`${label || '이 줄'} 한 칸 아래로`}
                        disabled={busy || i === stops.length - 1}
                        onClick={() => onShift(stop.id, 1)}
                      >
                        ↓
                      </button>
                    </span>
                  </div>
                ) : (
                  <div className="itin__line">{cells}</div>
                )}

                {open && (
                  <StopForm
                    value={stop}
                    busy={busy}
                    submitLabel="고친 것 저장"
                    onSubmit={(next) => {
                      onEdit({ ...next, id: stop.id })
                      setOpenId(null)
                    }}
                    onCancel={() => setOpenId(null)}
                    onRemove={() => setAsking(stop)}
                  />
                )}
              </li>
            )
          })}
        </ol>
      )}

      {editing &&
        (adding ? (
          <StopForm
            value={{ id: '', at: today, scenario: '', code: '', place: '' }}
            busy={busy}
            submitLabel="행적에 더하기"
            onSubmit={(next) => {
              onAdd(next)
              setAdding(false)
            }}
            onCancel={() => setAdding(false)}
          />
        ) : (
          <button
            type="button"
            className="itin__add"
            disabled={busy}
            onClick={() => setAdding(true)}
          >
            + 간 곳 적기
          </button>
        ))}

      {asking !== null && (
        <ConfirmDialog
          title="이 줄을 지웁니까?"
          description={`'${stopLabel(asking) || '적은 것 없음'}'을 행적에서 지운다. 되돌릴 수 없다.`}
          confirmLabel="지운다"
          /* 한 줄이라 잃는 것이 작다 — 뜸은 짧게(구현 결정 174). */
          delayMs={1500}
          onCancel={() => setAsking(null)}
          onConfirm={() => {
            onRemove(asking.id)
            setAsking(null)
            setOpenId(null)
          }}
        />
      )}
    </div>
  )
}

/**
 * 한 줄을 적는 칸 넷.
 *
 * **날짜를 비워 둘 수 있다**(형님이 정했다) — 지난 판을 뒤늦게 적을 때 언제였는지
 * 기억 못 하는 일이 흔하다. 그때는 ↑↓로 자리를 잡는다.
 */
function StopForm({
  value,
  busy,
  submitLabel,
  onSubmit,
  onCancel,
  onRemove,
}: {
  value: Stop
  busy: boolean
  submitLabel: string
  onSubmit: (stop: Omit<Stop, 'id'>) => void
  onCancel: () => void
  onRemove?: () => void
}) {
  const [at, setAt] = useState(value.at ?? '')
  const [scenario, setScenario] = useState(value.scenario)
  const [code, setCode] = useState(value.code)
  const [place, setPlace] = useState(value.place)

  /** 셋 다 비면 적을 것이 없다. 날짜만으로는 어디인지 말해 주지 않는다. */
  const empty = scenario.trim() === '' && code.trim() === '' && place.trim() === ''
  /* 모양이 아닌 날짜는 없는 것으로 보낸다 — 짐작해서 고치지 않는다(구현 결정 115). */
  const badDate = at.trim() !== '' && !isDate(at.trim())

  return (
    <div className="itin__form">
      <div className="itin__fields">
        <label className="itin__field itin__field--wide">
          <span>날짜</span>
          <input type="date" value={at} onChange={(e) => setAt(e.target.value)} />
        </label>
        <label className="itin__field">
          <span>시나리오</span>
          <input
            type="text"
            inputMode="text"
            placeholder="7"
            maxLength={20}
            value={scenario}
            onChange={(e) => setScenario(e.target.value)}
          />
        </label>
        <label className="itin__field">
          <span>위치 코드</span>
          <input
            type="text"
            placeholder="G-12"
            maxLength={20}
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
        </label>
        <label className="itin__field itin__field--wide">
          <span>장소 이름</span>
          <input
            type="text"
            placeholder="장소 이름"
            maxLength={120}
            value={place}
            onChange={(e) => setPlace(e.target.value)}
          />
        </label>
      </div>

      {/* **날짜를 비우면 끼워 넣는다**는 것을 적어 둔다 — 빈 칸이 실수로 보이면 안 된다. */}
      <p className="itin__hint">
        {badDate
          ? '날짜는 연-월-일로 적는다.'
          : at.trim() === ''
            ? '날짜를 비우면 ↑↓로 자리를 잡는다.'
            : '날짜를 적으면 날짜 순으로 자리를 잡는다.'}
      </p>

      <div className="itin__formfoot">
        <button type="button" className="itin__cancel" onClick={onCancel}>
          취소
        </button>
        {onRemove !== undefined && (
          <button type="button" className="itin__remove" disabled={busy} onClick={onRemove}>
            지우기
          </button>
        )}
        <button
          type="button"
          className="itin__save"
          disabled={busy || empty || badDate}
          onClick={() =>
            onSubmit({
              at: isDate(at.trim()) ? at.trim() : null,
              scenario: scenario.trim(),
              code: code.trim(),
              place: place.trim(),
            })
          }
        >
          {submitLabel}
        </button>
      </div>
    </div>
  )
}
