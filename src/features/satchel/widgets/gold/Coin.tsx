import { useId } from 'react'

/**
 * 금화 한 닢.
 *
 * **우리가 그린 것이다.** 실물 표식을 베끼지 않았다 — 테를 두른 원반에 빗금을
 * 둘러 두께를 냈을 뿐이고, 어느 게임에나 있는 모양이다(구현 결정 31과 같은 선).
 *
 * `viewBox`를 100×100으로 두고 부모가 크기를 정한다. 한 칸짜리라 셀 크기가
 * 기기마다 75~89px인데, 벡터라 어디서든 선명하다.
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ **그라디언트 열쇠를 인스턴스마다 가른다.**                                │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * 못박아 두면 한 화면에 금화가 둘 이상 설 때 열쇠가 겹친다 — 캐릭터 시트가
 * 이것을 빌려 쓰면서 실제로 그럴 수 있게 되었다. `useId()`로 가르되 **콜론을
 * 빼야** `url(#...)`에 쓸 수 있다(구현 결정 13과 같은 자리).
 */
export function Coin() {
  const uid = useId().replace(/:/g, '')
  const face = `gold-face-${uid}`
  const rim = `gold-rim-${uid}`

  // 테두리의 빗금. 금속을 깎아낸 결을 흉내 낸다 — 스물넷이면 촘촘하면서도
  // 작은 화면에서 뭉개지지 않는다.
  const nicks = Array.from({ length: 24 }, (_, i) => (i * 360) / 24)

  return (
    <svg className="gold__coin" viewBox="0 0 100 100" aria-hidden="true">
      <defs>
        <radialGradient id={face} cx="38%" cy="32%" r="72%">
          <stop offset="0%" stopColor="#f6e08a" />
          <stop offset="55%" stopColor="#d8a72b" />
          <stop offset="100%" stopColor="#8a6414" />
        </radialGradient>
        <linearGradient id={rim} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffe9a3" />
          <stop offset="100%" stopColor="#7a5410" />
        </linearGradient>
      </defs>

      {/* 바닥 그림자. 상 위에 놓인 것처럼 보이게 한다.

          **색과 투명도를 갈라 적는다.** `rgb(0 0 0 / 45%)`는 CSS Color 4 표기라
          SVG 속성에서 못 읽는 브라우저가 있다. `fill` + `fill-opacity`는 어디서나
          같게 읽힌다. */}
      <circle cx="50" cy="52" r="45" fill="#000000" fillOpacity="0.45" />

      <circle cx="50" cy="50" r="45" fill={`url(#${rim})`} />
      {nicks.map((angle) => (
        <rect
          key={angle}
          x="49"
          y="4"
          width="2"
          height="7"
          rx="1"
          fill="#000000"
          fillOpacity="0.22"
          transform={`rotate(${angle} 50 50)`}
        />
      ))}

      <circle cx="50" cy="50" r="38" fill={`url(#${face})`} />
      {/* 눌러 찍은 자국. 안쪽 면이 평평해 보이지 않게 한다. */}
      <circle cx="50" cy="50" r="38" fill="none" stroke="rgb(0 0 0 / 28%)" strokeWidth="2.5" />
      <circle
        cx="50"
        cy="50"
        r="31"
        fill="none"
        stroke="#fff0be"
        strokeOpacity="0.35"
        strokeWidth="1.5"
      />
    </svg>
  )
}
