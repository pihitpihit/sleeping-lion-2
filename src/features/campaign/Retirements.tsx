import { useState } from 'react'
import { ConfirmDialog } from '../satchel/board/ConfirmDialog'
import { classIconUrl } from './character'
import type { Retirement, RetirementEdits } from './retirementNet'

/**
 * 은퇴한 캐릭터 — 실물 캠페인 책자의 그 표(`0043`).
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ **대부분의 줄은 서버가 베껴 둔다. 여기서는 보고 바로잡는다.**             │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * 시트에서 은퇴를 켜고 저장하면 그 갱신 하나로 기록까지 남는다(`0043`의 트리거) —
 * 손으로 다시 적을 일이 없다. 손으로 적는 길을 함께 두는 까닭은 **앱을 쓰기 전에
 * 종이에 적어 둔 줄**과 앱 밖에서 놀던 사람의 캐릭터가 있기 때문이다.
 *
 * 값과 손잡이를 다 받으므로 서버 렌더로 끝까지 확인된다(구현 결정 164).
 */
export function Retirements({
  rows,
  editing,
  busy,
  onAdd,
  onEdit,
  onRemove,
  onShift,
}: {
  rows: readonly Retirement[]
  editing: boolean
  busy: boolean
  onAdd: (edits: RetirementEdits) => void
  onEdit: (id: string, edits: RetirementEdits) => void
  onRemove: (id: string) => void
  onShift: (id: string, delta: number) => void
}) {
  const [openId, setOpenId] = useState<string | null>(null)
  const [asking, setAsking] = useState<Retirement | null>(null)
  const [adding, setAdding] = useState(false)

  return (
    <div className="retire">
      {rows.length === 0 ? (
        <p className="sheet__empty">
          아직 은퇴한 캐릭터가 없다. 시트에서 은퇴에 표를 하면{' '}
          <strong>그때의 레벨과 특혜가 여기 남는다.</strong>
        </p>
      ) : (
        <>
          {/* 실물 표의 머리. 좁은 화면에서는 줄마다 이름표가 붙으므로 여기서는 감춘다. */}
          <div className="retire__head" aria-hidden="true">
            <span>플레이어</span>
            <span>캐릭터</span>
            <span>클래스</span>
            <span>레벨</span>
            <span>특혜</span>
          </div>

          <ol className="retire__rows">
            {rows.map((row, i) => {
              const open = editing && openId === row.id
              const iconUrl = classIconUrl(row.classIcon)
              return (
                <li key={row.id} className="retire__row">
                  <div className="retire__line">
                    <span className="retire__cell retire__cell--player">
                      <span className="retire__tag">플레이어</span>
                      {row.player || '—'}
                    </span>
                    <span className="retire__cell retire__cell--name">
                      <span className="retire__tag">캐릭터</span>
                      {row.name || '—'}
                    </span>
                    <span className="retire__cell retire__cell--class">
                      <span className="retire__tag">클래스</span>
                      {iconUrl !== null && (
                        <span className="retire__badge">
                          <img src={iconUrl} alt="" draggable={false} />
                        </span>
                      )}
                      {row.className || (iconUrl === null ? '—' : '')}
                    </span>
                    {/* **모르면 줄표다** — 0으로 적으면 그것이 값으로 읽힌다(구현 결정 115). */}
                    <span className="retire__cell retire__cell--level sl-numeral">
                      <span className="retire__tag">레벨</span>
                      {row.level ?? '—'}
                    </span>
                    <span className="retire__cell retire__cell--perks sl-numeral">
                      <span className="retire__tag">특혜</span>
                      {row.perks ?? '—'}
                    </span>

                    {editing && (
                      <span className="retire__tools">
                        <button
                          type="button"
                          className="itin__tool"
                          aria-label={`${row.name || '이 줄'} 한 칸 위로`}
                          disabled={busy || i === 0}
                          onClick={() => onShift(row.id, -1)}
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          className="itin__tool"
                          aria-label={`${row.name || '이 줄'} 한 칸 아래로`}
                          disabled={busy || i === rows.length - 1}
                          onClick={() => onShift(row.id, 1)}
                        >
                          ↓
                        </button>
                        <button
                          type="button"
                          className="itin__tool"
                          aria-label={`${row.name || '이 줄'} 고치기`}
                          aria-expanded={open}
                          onClick={() => setOpenId(open ? null : row.id)}
                        >
                          고치기
                        </button>
                      </span>
                    )}
                  </div>

                  {open && (
                    <RetirementForm
                      value={row}
                      busy={busy}
                      submitLabel="고친 것 저장"
                      onSubmit={(edits) => {
                        onEdit(row.id, edits)
                        setOpenId(null)
                      }}
                      onCancel={() => setOpenId(null)}
                      onRemove={() => setAsking(row)}
                    />
                  )}
                </li>
              )
            })}
          </ol>
        </>
      )}

      {editing &&
        (adding ? (
          <RetirementForm
            value={{ player: '', name: '', className: '', classIcon: 0, level: null, perks: null }}
            busy={busy}
            submitLabel="표에 더하기"
            onSubmit={(edits) => {
              onAdd(edits)
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
            + 손으로 한 줄 적기
          </button>
        ))}

      {asking !== null && (
        <ConfirmDialog
          title="이 줄을 지웁니까?"
          description={`'${asking.name || '이름 없음'}'을 은퇴한 캐릭터 표에서 지운다. 캐릭터 자체는 그대로다. 되돌릴 수 없다.`}
          confirmLabel="지운다"
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

/** 다섯 칸을 적는다. 레벨과 특혜는 **비워 둘 수 있다** — 종이에서 옮길 때 모를 수 있다. */
function RetirementForm({
  value,
  busy,
  submitLabel,
  onSubmit,
  onCancel,
  onRemove,
}: {
  value: RetirementEdits
  busy: boolean
  submitLabel: string
  onSubmit: (edits: RetirementEdits) => void
  onCancel: () => void
  onRemove?: () => void
}) {
  const [player, setPlayer] = useState(value.player)
  const [name, setName] = useState(value.name)
  const [className, setClassName] = useState(value.className)
  const [level, setLevel] = useState(value.level === null ? '' : String(value.level))
  const [perks, setPerks] = useState(value.perks === null ? '' : String(value.perks))

  /** 이름이 없으면 누구인지 말해 주지 않는다. 나머지는 비어도 된다. */
  const empty = name.trim() === ''
  const levelBad = level.trim() !== '' && !/^[1-9]$/.test(level.trim())
  const perksBad = perks.trim() !== '' && !/^\d{1,2}$/.test(perks.trim())

  return (
    <div className="itin__form">
      <div className="retire__fields">
        <label className="itin__field">
          <span>플레이어</span>
          <input
            type="text"
            maxLength={60}
            value={player}
            onChange={(e) => setPlayer(e.target.value)}
          />
        </label>
        <label className="itin__field">
          <span>캐릭터</span>
          <input
            type="text"
            maxLength={60}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <label className="itin__field">
          <span>클래스</span>
          <input
            type="text"
            maxLength={60}
            value={className}
            onChange={(e) => setClassName(e.target.value)}
          />
        </label>
        <label className="itin__field">
          <span>레벨</span>
          <input
            type="text"
            inputMode="numeric"
            placeholder="1~9"
            maxLength={1}
            value={level}
            onChange={(e) => setLevel(e.target.value)}
          />
        </label>
        <label className="itin__field">
          <span>특혜</span>
          <input
            type="text"
            inputMode="numeric"
            placeholder="상자 수"
            maxLength={2}
            value={perks}
            onChange={(e) => setPerks(e.target.value)}
          />
        </label>
      </div>

      <p className="itin__hint">
        {levelBad
          ? '레벨은 1에서 9 사이다.'
          : perksBad
            ? '특혜는 켜 둔 상자의 수다.'
            : '레벨과 특혜는 비워 둘 수 있다 — 모르면 줄표로 남는다.'}
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
          disabled={busy || empty || levelBad || perksBad}
          onClick={() =>
            onSubmit({
              player: player.trim(),
              name: name.trim(),
              className: className.trim(),
              classIcon: value.classIcon,
              level: /^[1-9]$/.test(level.trim()) ? Number(level.trim()) : null,
              perks: /^\d{1,2}$/.test(perks.trim()) ? Number(perks.trim()) : null,
            })
          }
        >
          {submitLabel}
        </button>
      </div>
    </div>
  )
}
