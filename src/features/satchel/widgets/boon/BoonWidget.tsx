import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import type { WidgetProps } from '../types'
import { useRosterStore } from '../../roster'
import { usePerkChanges } from '../../perkSource'
import { useAttackDeckStore } from '../deck/deckStore'
import { resolveComposition } from '../deck/perks'
import { STANDARD_COMPOSITION } from '../deck/deck'
import { classIconUrl } from '../../../campaign/character'
import { MAX_AT_ONCE, boonLook, type BoonKind } from './boon'
import './BoonWidget.css'

/** 몬스터 덱의 열쇠 — 상에 하나뿐이라 못박혀 있다(`deckSlotKey`). */
const MONSTER_SLOT = 'monster'

/**
 * 축복·저주 위젯 — **한 칸짜리 단추 하나.**
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ **누구에게 줄지부터 고른다.**                                             │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * 규칙서: *"If a figure is cursed, it must shuffle a CURSE card into its
 * **remaining** attack modifier deck."* 축복도 같다. 그러니 이 위젯이 하는 일은
 * 카드를 만들어 **남의 덱에 섞어 넣는 것**이고, 받는 쪽이 정해져야 시작된다.
 *
 * 고를 수 있는 것은 **이름이 있는 덱**이다 — 캐릭터를 고른 덱과 몬스터 덱.
 * 캐릭터를 안 고른 덱은 열쇠가 기기마다 다르므로(구현 결정 75) 남에게 줄 수가
 * 없다.
 *
 * 뽑히면 그 카드는 **덱에서 빠진다**(`isOneShot`) — 버린 더미에 남아 있다가
 * 다음 섞기에 걸러진다. 곧바로 지우면 방금 무엇이 나왔는지 화면에서 사라진다.
 */
function Boon({ kind, mode }: { kind: BoonKind } & Pick<WidgetProps, 'mode'>) {
  const look = boonLook(kind)
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        className={`boon boon--${kind}`}
        aria-label={`${look.name} 주기`}
        disabled={mode !== 'play'}
        onClick={() => setOpen(true)}
      >
        {look.artUrl ? (
          <img className="boon__art" src={look.artUrl} alt="" draggable={false} />
        ) : (
          <span className="boon__letter">{look.name.slice(0, 1)}</span>
        )}
      </button>

      {open && <BoonDialog kind={kind} onClose={() => setOpen(false)} />}
    </>
  )
}

/*
  갈래를 팩토리로 만들지 않고 컴포넌트 둘로 둔다 — 그래야 화면 갱신(fast refresh)이
  이 파일을 알아본다. 하는 일은 `kind` 하나 넘기는 것뿐이다.
*/
export function BlessWidget(props: WidgetProps) {
  return <Boon kind="bless" mode={props.mode} />
}

export function CurseWidget(props: WidgetProps) {
  return <Boon kind="curse" mode={props.mode} />
}

function BoonDialog({ kind, onClose }: { kind: BoonKind; onClose: () => void }) {
  const look = boonLook(kind)

  const entries = useRosterStore((s) => s.entries)
  const loadRoster = useRosterStore((s) => s.load)
  const bestow = useAttackDeckStore((s) => s.bestow)

  /** 받는 덱. `null`이면 몬스터 덱이다 — 캐릭터가 아니라는 뜻으로 둔다. */
  const [target, setTarget] = useState<string | null>(MONSTER_SLOT)
  const [count, setCount] = useState(1)

  useEffect(() => {
    void loadRoster()
  }, [loadRoster])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  /*
    아직 한 번도 안 뽑은 덱이면 이 자리에서 만들어야 한다 — 그때 쓸 구성이다.
    **몬스터 덱은 표준 20장이고 캐릭터 덱은 켠 특혜를 따른다**(못 읽으면 표준).
    이미 뽑던 덱이면 쓰이지 않는다.
  */
  const perkChanges = usePerkChanges(target === MONSTER_SLOT ? null : target)
  const composition =
    target === MONSTER_SLOT
      ? STANDARD_COMPOSITION
      : resolveComposition(STANDARD_COMPOSITION, perkChanges)

  /* 로스터는 은퇴한 캐릭터를 이미 걸러 온다(`roster.ts`). */
  const alive = entries

  function give() {
    if (target === null) return
    bestow(target, look.cardId, count, composition)
    onClose()
  }

  return createPortal(
    <div className="boondlg">
      <section
        className="boondlg__panel"
        role="dialog"
        aria-modal="true"
        aria-label={`${look.name} 주기`}
      >
        <header className="boondlg__head">
          {look.artUrl && <img className="boondlg__art" src={look.artUrl} alt="" />}
          <h2 className="boondlg__title">{look.name}</h2>
          <button type="button" className="boondlg__close" aria-label="닫기" onClick={onClose}>
            ×
          </button>
        </header>

        <p className="boondlg__lead">
          고른 덱의 <strong>아직 안 뽑은 카드</strong>에 섞여 든다. 뽑히면 그 카드는 덱에서 빠진다.
        </p>

        <ul className="boondlg__targets">
          {/* 몬스터가 먼저다 — 상에 하나뿐이고 가장 자주 준다. */}
          <li>
            <button
              type="button"
              className={`boondlg__who${target === MONSTER_SLOT ? ' boondlg__who--on' : ''}`}
              onClick={() => setTarget(MONSTER_SLOT)}
            >
              <span className="boondlg__badge boondlg__badge--m sl-numeral">M</span>
              몬스터
            </button>
          </li>

          {alive.map((entry) => {
            const iconUrl = classIconUrl(entry.classIcon)
            return (
              <li key={entry.id}>
                <button
                  type="button"
                  className={`boondlg__who${target === entry.id ? ' boondlg__who--on' : ''}`}
                  onClick={() => setTarget(entry.id)}
                >
                  <span className="boondlg__badge">
                    {iconUrl ? <img src={iconUrl} alt="" /> : entry.name.slice(0, 1)}
                  </span>
                  {entry.name}
                </button>
              </li>
            )
          })}
        </ul>

        {/*
          몇 장인가. 실물의 축복·저주 덱이 각각 열 장이고 한 덱에 들어갈 수 있는
          수도 그만큼이다 — **규칙을 판정하는 것이 아니라 고를 수 있는 수를 그
          범위로 두는 것뿐이다.**
        */}
        <div className="boondlg__count">
          <button
            type="button"
            className="boondlg__step"
            aria-label="한 장 줄이기"
            disabled={count <= 1}
            onClick={() => setCount((n) => Math.max(1, n - 1))}
          >
            −
          </button>
          <span className="boondlg__n sl-numeral" aria-label={`${count}장`}>
            {count}
          </span>
          <button
            type="button"
            className="boondlg__step"
            aria-label="한 장 늘리기"
            disabled={count >= MAX_AT_ONCE}
            onClick={() => setCount((n) => Math.min(MAX_AT_ONCE, n + 1))}
          >
            +
          </button>
        </div>

        <div className="mini__acts">
          <button type="button" className="mini__go" onClick={give}>
            섞어 넣는다
          </button>
          <button type="button" className="mini__cancel" onClick={onClose}>
            취소
          </button>
        </div>
      </section>
    </div>,
    document.body,
  )
}
