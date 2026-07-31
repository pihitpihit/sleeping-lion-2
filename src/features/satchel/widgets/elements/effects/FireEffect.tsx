import { useId, useMemo } from 'react'
import './FireEffect.css'

/* ==========================================================================
   실험실에서 고른 값

   숫자를 바꾸려면 `lab/fire.html`을 브라우저로 열어 막대를 움직인 뒤
   '값 내보내기'로 뽑아 여기에 옮긴다. 배포도 빌드도 필요 없다.
   실험실의 `e-*` 값이 그대로 여기 상수가 된다.
   ========================================================================== */

/** 방울 수(e-count). 가장 비싼 값이다 — 폰에서 버거우면 여기부터 줄인다. */
const BLOB_COUNT = 200
/** 방울 크기(e-size). 아이콘 지름에 대한 비율. */
const BLOB_SIZE = 0.11
/** 붙박이 심지(e-core). 0이면 한가운데가 뚫려 도넛이 된다. */
const CORE = 0.6
/** 뻗는 거리(e-reach). */
const REACH = 0.79
/** 나아가며 틀어지는 각도(e-swirl). 0이면 별 모양 도형이 된다. */
const SWIRL = 12
/** 속도 배수(e-speed). */
const SPEED = 4.37
/** 뭉침(e-goo). 흐림 반지름 = 아이콘 × 이 값 × 0.004. */
const GOO = 17

/** 재 개수(e-ash). */
const ASH_COUNT = 29
/** 재 크기(e-ashsize). */
const ASH_SIZE = 0.03
/** 재가 날아가는 거리(e-ashfar). */
const ASH_FAR = 1.3
/** 재 속도 배수(e-ashspeed). */
const ASH_SPEED = 4

/** 뭉침 필터가 덮는 넓이. 필터 비용은 방울 수가 아니라 이 넓이에 비례한다. */
const FIELD = 2.4

/**
 * 씨앗에서 뽑는 난수기.
 *
 * `Math.random()`을 렌더 중에 부를 수 없다 — 같은 입력에 같은 결과가 나와야
 * React가 렌더를 안전하게 되돌리거나 다시 할 수 있다(react-hooks/purity).
 * 인스턴스 id를 씨앗으로 삼으면 위젯마다 다른 불이 붙으면서도 한 위젯의 불은
 * 몇 번을 다시 그려도 같은 모양으로 돌아온다.
 */
function seedOf(text: string): number {
  let h = 2166136261
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function randomizer(seed: number): () => number {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

interface Blob {
  angle: number
  radius: number
  reach: number
  swirl: number
  duration: number
  delay: number
}

interface Ash {
  angle: number
  drift: number
  size: number
  far: number
  spin: number
  duration: number
  delay: number
}

/**
 * 불 원소가 타오를 때의 효과 — 가운데에서 사방으로 퍼지는 화염과 흩날리는 재.
 *
 * **메타볼.** 흐린 방울을 알파 문턱으로 잘라내면, 서로 닿은 방울이 하나의
 * 덩어리로 이어지고 가장자리가 다시 또렷해진다. 불길이 갈라지고 합쳐지는 결이
 * 여기서 나온다. 방울을 각도별로 뿌려 바깥으로 밀면 해무리가 된다.
 *
 * 색은 나아가는 동안 흰빛 → 노랑 → 주황 → 붉은빛으로 식힌다. 불투명도는
 * 건드리지 않는다 — 알파를 낮추면 뭉침 문턱 아래로 떨어져 방울이 서서히
 * 스러지는 대신 툭 잘려 나간다. 대신 크기를 줄인다.
 *
 * 재는 뭉침 필터 **바깥**의 제 레이어에 담는다. 재까지 뭉치면 불덩이에
 * 달라붙어 재로 보이지 않는다.
 */
export function FireEffect({ iconSize }: { iconSize: number }) {
  // useId는 ':r0:'처럼 콜론을 낀 값을 준다. url(#...)에 그대로 못 쓴다.
  const id = useId().replace(/:/g, '')
  const filterId = 'fire-goo-' + id

  /**
   * 낱낱의 흩어짐은 한 번만 고른다. 렌더마다 다시 뽑으면 석판을 끌 때마다
   * 불이 통째로 새로 붙는다 — 끄는 동안 이 컴포넌트가 계속 다시 그려진다.
   */
  const blobs = useMemo<Blob[]>(() => {
    const next = randomizer(seedOf(id))
    return Array.from({ length: BLOB_COUNT }, (_, i) => ({
      // 황금각으로 돌려 뿌린다. 고르게 나누면 바퀴살처럼 각져 보이고,
      // 완전한 난수는 뭉치고 비는 자리가 생긴다. 그 사이가 황금각이다.
      angle: (i * 137.508 + next() * 14) % 360,
      radius: BLOB_SIZE * (0.55 + next() * 0.95),
      reach: REACH * (0.72 + next() * 0.56),
      swirl: SWIRL * (0.6 + next() * 0.8),
      duration: (1.3 + next()) / SPEED,
      // 지연은 음수로 흩는다. 양수면 처음 몇 초가 텅 빈 채로 지나간다.
      delay: -next() * 3,
    }))
  }, [id])

  const ashes = useMemo<Ash[]>(() => {
    // 씨앗을 어긋나게 준다. 같으면 재가 방울과 같은 각도로만 날아간다.
    const next = randomizer(seedOf(id + '-ash'))
    return Array.from({ length: ASH_COUNT }, () => ({
      angle: next() * 360,
      drift: (next() - 0.5) * 90,
      size: ASH_SIZE * (0.6 + next() * 0.9),
      far: ASH_FAR * (0.7 + next() * 0.6),
      // 회전 방향과 바퀴 수를 섞어야 우수수 흩날린다.
      spin: (next() < 0.5 ? -1 : 1) * (180 + next() * 720),
      duration: (2.2 + next() * 2.6) / ASH_SPEED,
      delay: -next() * 6,
    }))
  }, [id])

  return (
    <span className="fire" aria-hidden="true">
      {/* 필터를 인스턴스마다 따로 둔다. id를 나눠 쓰면 한 위젯의 아이콘 크기가
          다른 위젯의 뭉침까지 바꾼다 — 흐림 반지름이 아이콘에 비례하므로. */}
      <svg className="fire__defs" width="0" height="0">
        <filter id={filterId} x="-20%" y="-20%" width="140%" height="140%">
          {/* 흐린 뒤 알파를 급격히 세운다. 마지막 줄이 알파를 늘리고(×20)
              끌어내려(−8), 옅게 번진 가장자리는 잘리고 진한 가운데만 남는다. */}
          <feGaussianBlur in="SourceGraphic" stdDeviation={iconSize * GOO * 0.004} result="s" />
          <feColorMatrix
            in="s"
            mode="matrix"
            values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 20 -8"
          />
        </filter>
      </svg>

      <span
        className="fire__goo"
        style={{ filter: `url(#${filterId})`, '--fire-field': FIELD } as React.CSSProperties}
      >
        <span className="fire__core" style={{ '--fire-core': CORE } as React.CSSProperties} />
        {blobs.map((b, i) => (
          <span
            key={i}
            className="fire__blob"
            style={
              {
                '--fire-a': `${b.angle.toFixed(1)}deg`,
                '--fire-r': b.radius.toFixed(3),
                '--fire-reach': b.reach.toFixed(3),
                '--fire-swirl': `${b.swirl.toFixed(1)}deg`,
                animationDuration: `${b.duration.toFixed(2)}s`,
                animationDelay: `${b.delay.toFixed(2)}s`,
              } as React.CSSProperties
            }
          />
        ))}
      </span>

      <span className="fire__ashes">
        {ashes.map((a, i) => (
          <span
            key={i}
            className="fire__ash"
            style={
              {
                '--fire-a': `${a.angle.toFixed(1)}deg`,
                '--fire-drift': `${a.drift.toFixed(1)}deg`,
                '--fire-ar': a.size.toFixed(3),
                '--fire-afar': a.far.toFixed(2),
                '--fire-spin': `${a.spin.toFixed(0)}deg`,
                animationDuration: `${a.duration.toFixed(2)}s`,
                animationDelay: `${a.delay.toFixed(2)}s`,
              } as React.CSSProperties
            }
          />
        ))}
      </span>
    </span>
  )
}
