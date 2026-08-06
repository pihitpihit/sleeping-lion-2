import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import type { Rotation } from '../../layout'
import {
  CARD_FACE_URL,
  FACE_RATIO,
  REVEAL_FLY_MS,
  REVEAL_HOLD_MS,
  REVEAL_TICK_MS,
  revealRemainingRatio,
} from './deck'
import './RevealFlash.css'

interface Props {
  /** 방금 공개한 카드를 그리는 것. `AttackDeck`의 `CardFace`가 그대로 들어온다. */
  children: ReactNode
  /** 위젯이 돌아간 각도. 카드를 누른 사람이 바로 보게 맞춘다. */
  rotation: Rotation
  /** 카드가 날아가 앉을 자리. 부를 때마다 새로 잰다 — 그동안 창이 바뀌었을 수 있다. */
  landOn: () => DOMRect | null
  /** 다 끝나 지워도 될 때. */
  onDone: () => void
  /** 시험에서만 줄인다. */
  holdMs?: number
}

/**
 * 방금 공개한 카드를 화면 가운데에 크게 한 번 보여준다.
 *
 * 폰을 상 가운데 놓고 넷이 둘러앉으면 위젯 안의 카드는 작다. 뽑는 순간만
 * 크게 띄웠다가 **스스로 물러난다** — 닫는 일을 사람에게 시키면 판이 그만큼
 * 멈춘다. 급하면 아무 데나 탭해서 바로 걷는다.
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ **`document.body`에 그린다.**                                             │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * 위젯 틀은 회전 때문에 늘 `transform`을 걸고 있고, **`transform`이 걸린 조상은
 * `position: fixed`의 기준이 된다.** 그냥 두면 팝업이 위젯 안에 갇힌다
 * (구현 결정 37).
 *
 * 대신 **회전은 우리가 다시 건다.** 위젯을 180도 돌려 마주 앉은 사람이 눌렀다면
 * 그 사람에게 바로 보여야 한다(구현 결정 24).
 *
 * 닫힐 때 카드는 **버린 덱 자리로 날아간다.** 어디로 갔는지 보이지 않으면 다음에
 * 그 자리를 볼 이유를 알 수 없다.
 */
export function RevealFlash({
  children,
  rotation,
  landOn,
  onDone,
  holdMs = REVEAL_HOLD_MS,
}: Props) {
  const cardRef = useRef<HTMLDivElement | null>(null)
  const [leaving, setLeaving] = useState(false)
  const [remaining, setRemaining] = useState(holdMs)

  const leave = useCallback(() => setLeaving(true), [])

  /**
   * 뜸을 재고, 다하면 스스로 물러난다.
   *
   * **띠와 닫는 시각이 같은 값에서 나온다.** 띠를 CSS 애니메이션으로 돌리고 닫기만
   * JS에 맡기면 둘이 따로 흘러, 탭이 뒤로 갔다 올 때 어긋난다(구현 결정 38).
   *
   * 렌더 안에서 `Date.now()`를 볼 수 없으므로(`react-hooks/purity`) 시각 판정은
   * 전부 여기서 하고 화면에는 마지막으로 잰 값만 넘긴다.
   */
  useEffect(() => {
    if (leaving) return
    const deadline = Date.now() + holdMs
    const id = setInterval(() => {
      const left = Math.max(0, deadline - Date.now())
      setRemaining(left)
      if (left <= 0) leave()
    }, REVEAL_TICK_MS)
    return () => clearInterval(id)
  }, [leaving, holdMs, leave])

  /** Escape로도 걷는다. 탭이 어려운 자리에서 쓰인다. */
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') leave()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [leave])

  /**
   * 물러나기 — 버린 덱 자리로 날린다.
   *
   * 지금 있는 자리와 앉을 자리를 재서 그 차이만큼 옮긴다. 크기도 함께 줄여
   * 카드가 그 칸에 들어가 앉는 것처럼 보이게 한다.
   *
   * 잴 곳이 없으면(버린 덱을 접었고 더미도 못 찾으면) 날리지 않고 그냥 흐려진다.
   */
  useEffect(() => {
    if (!leaving) return

    const element = cardRef.current
    const target = landOn()
    if (element && target && target.width > 0) {
      const from = element.getBoundingClientRect()
      const dx = target.left + target.width / 2 - (from.left + from.width / 2)
      const dy = target.top + target.height / 2 - (from.top + from.height / 2)
      // 회전한 카드는 화면에서 재면 가로세로가 바뀌어 있다. 긴 쪽끼리 견준다.
      const fromSize = Math.max(from.width, from.height)
      const toSize = Math.max(target.width, target.height)
      const scale = fromSize > 0 ? Math.max(0.06, toSize / fromSize) : 0.2

      element.style.transition = `transform ${REVEAL_FLY_MS}ms cubic-bezier(0.4, 0, 0.9, 0.6), opacity ${REVEAL_FLY_MS}ms ease-in`
      element.style.transform = `translate(${dx}px, ${dy}px) rotate(${rotation}deg) scale(${scale})`
      element.style.opacity = '0'
    }

    const timer = setTimeout(onDone, REVEAL_FLY_MS)
    return () => clearTimeout(timer)
  }, [leaving, landOn, onDone, rotation])

  return createPortal(
    /*
      읽어주는 쪽에는 아무것도 보내지 않는다. 공개된 카드는 이미 버린 덱 자리가
      `role="status"`로 말하고 있고, 여기서 또 말하면 한 번 뽑을 때마다 두 번
      읽힌다.
    */
    <div
      className={`reveal${leaving ? ' reveal--leaving' : ''}`}
      aria-hidden="true"
      onPointerDown={leave}
    >
      {/*
        회전은 **CSS 변수로만** 넘긴다.

        인라인 `transform`으로 걸면 등장 애니메이션과 부딪힌다 — CSS 애니메이션은
        인라인 스타일을 덮으므로, 190ms 동안 회전이 사라졌다가 돌아온다. 180도로
        돌려 둔 위젯에서는 카드가 반 바퀴 돌며 나타난다.

        **카드 그림도 여기서 다시 건다.** 위젯 뿌리에 걸어 둔 `--deck-front`는
        상속으로 내려가는데 이 팝업은 `document.body`에 그려져 위젯의 자손이
        아니다. 그냥 두면 변수를 못 찾아 앞면이 통째로 비고 테두리만 남는다.
      */}
      <div
        ref={cardRef}
        className="reveal__card"
        style={
          {
            '--reveal-rot': `${rotation}deg`,
            '--deck-front': `url("${CARD_FACE_URL}")`,
            '--deck-face-ratio': FACE_RATIO,
          } as React.CSSProperties
        }
      >
        {children}

        {/*
          언제 닫히는지 알리는 가느다란 띠.

          **줄어든다.** 차오르는 띠는 "무언가 준비되고 있다"로 읽히는데 여기서는
          반대다 — 남은 시간이 없어지는 것이다. 확인 팝업의 띠가 차오르는 것과
          방향이 반대인 이유이기도 하다(저쪽은 단추가 살아나기를 기다린다).

          카드 아래 귀퉁이가 둥글어 양옆을 조금 들여 앉힌다.
        */}
        {!leaving && (
          <span className="reveal__bar" aria-hidden="true">
            <span
              className="reveal__bar-fill"
              style={
                { '--reveal-left': revealRemainingRatio(remaining, holdMs) } as React.CSSProperties
              }
            />
          </span>
        )}
      </div>
    </div>,
    document.body,
  )
}
