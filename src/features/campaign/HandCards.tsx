import { useId } from 'react'

import './HandCards.css'

/**
 * 손에 드는 카드 장수 — **그림 안에 수를 적는다.**
 *
 * 캐릭터 생성 화면과 시트가 함께 쓴다. 같은 값이 화면 두 곳에서 다르게 보이면
 * 같은 것으로 안 읽힌다(구현 결정 319와 같은 손질).
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ **이 그림은 우리가 그린 것이다. 팩 것이 아니다.**                         │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * 실물 시트에도 핸드 사이즈는 그림과 수로 적혀 있다. **팩에는 이 표식이 없다** —
 * 형님이 뒤져 확인했다. 그러니 이것이 임시가 아니라 정본이다.
 *
 * 형님이 실물 시트를 찍어 보내 주어 **얼개만 맞췄다** — 두 장이 어긋나게 겹치고
 * **뒷장은 1시, 앞장은 11시로 기운다.** 도형 둘이라 베낄 것이 없다(금화와 같은
 * 선, 구현 결정 106).
 *
 * **앞장에만 그림자를 드리운다.** 그림 전체에 걸면 두 장을 한 덩어리로 보고
 * 바깥 윤곽에만 드리워 사이가 안 갈린다 — 두 장이 거의 붙어 보였다(형님이
 * 짚었다). 앞장에만 걸어야 **뒷장 위로** 그늘이 진다.
 *
 * **테를 두르지 않고 속을 채운다.** 실물이 그렇다 — 선으로 그린 표식이 아니라
 * 밝은 카드 두 장이다. 앞장은 양피지색이고 뒷장은 한 톤 어둡다: 색이 갈리면
 * 어느 것이 앞인지 선 없이도 읽힌다.
 *
 * 수는 SVG 안에 넣지 않고 **위에 얹는다** — 그래야 `sl-numeral`(Pirata One)이
 * 그대로 먹고 색도 CSS가 정한다.
 */
export function HandCards({ count, bare = false }: { count: number; bare?: boolean }) {
  // 한 화면에 여럿 설 수 있다(생성 화면의 캐러셀) — 열쇠를 가른다. 콜론은 뺀다.
  const lift = `hand-lift-${useId().replace(/:/g, '')}`

  return (
    <span className="hand" role="img" aria-label={`손에 드는 카드 ${count}장`}>
      {/* 그림에 딱 맞게 자른 viewBox다 — 남는 여백이 있으면 상자만 커진다. */}
      <svg className="hand__art" viewBox="8 8 25 30" aria-hidden="true" focusable="false">
        <defs>
          <filter id={lift} x="-40%" y="-40%" width="180%" height="180%">
            <feDropShadow
              dx="1.1"
              dy="1.6"
              stdDeviation="1.3"
              floodColor="#000"
              floodOpacity="0.65"
            />
          </filter>
        </defs>
        {/* 뒷장 — 오른쪽 아래로 비켜 서고 1시로 기운다. 한 톤 어둡다. */}
        <rect
          x="13"
          y="11.1"
          width="18"
          height="25"
          rx="2.2"
          fill="#a8987a"
          transform="rotate(3 22 23.6)"
        />
        {/* 앞장 — 11시로 기운다. 양피지색이라 수가 어두운 잉크로 앉는다. */}
        <g filter={`url(#${lift})`}>
          <rect
            x="10"
            y="9"
            width="18"
            height="25"
            rx="2.2"
            fill="#d8cbaa"
            transform="rotate(-3 19 21.5)"
          />
        </g>
      </svg>
      {/* 작게 설 때는 수를 밖에 적는다 — `LevelBadge`와 같은 손질. */}
      {!bare && (
        <span className="hand__n sl-numeral" aria-hidden="true">
          {count}
        </span>
      )}
    </span>
  )
}
