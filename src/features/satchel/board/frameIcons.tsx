/**
 * 위젯 위에 얹히는 버튼의 아이콘.
 *
 * 이 버튼들은 **원형 테두리를 두르지 않는다.** 32px 원 안에 16px 아이콘을 넣으면
 * 절반이 여백이라 정작 그림이 작아진다. 테를 걷고 아이콘을 키우되, 누르는 영역은
 * 그대로 두어 손가락으로 짚을 수 있게 한다.
 *
 * 대신 보드 바탕이나 위젯 내용 위에 그대로 놓이므로 **그림자로 윤곽을 만든다.**
 * 툴바는 이와 달리 원형 테를 유지한다 — 거기서는 테가 장치의 일부다.
 */

const BASE = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
  focusable: false,
} as const

/** 톱니바퀴 — 위젯 설정. */
export function GearIcon({ size = 22 }: { size?: number }) {
  const teeth = [0, 45, 90, 135, 180, 225, 270, 315]
  return (
    <svg {...BASE} width={size} height={size} strokeLinecap="butt">
      {teeth.map((deg) => (
        <line
          key={deg}
          x1="12"
          y1="2.6"
          x2="12"
          y2="6"
          strokeWidth={3.6}
          transform={`rotate(${deg} 12 12)`}
        />
      ))}
      <circle cx="12" cy="12" r="6.6" strokeWidth={2.8} />
      <circle cx="12" cy="12" r="2.6" strokeWidth={2} />
    </svg>
  )
}

/**
 * 굽은 화살 — 돌리기.
 *
 * 원을 온전히 닫지 않는다. 트인 자리와 화살촉이 함께 **어느 쪽으로 도는지**를
 * 말해준다 — 닫힌 원에 촉만 붙이면 방향이 잘 안 읽힌다.
 */
export function RotateIcon({ size = 22 }: { size?: number }) {
  return (
    <svg {...BASE} width={size} height={size} strokeWidth={2.4}>
      {/* 12시에서 시작해 시계 방향으로 3/4바퀴 */}
      <path d="M12 4.2a7.8 7.8 0 1 0 7.8 7.8" />
      <path d="M12 1.2 15.2 4.2 12 7.2" strokeWidth={2.2} />
    </svg>
  )
}

/** 가위표 — 치우기·닫기. */
export function CloseIcon({ size = 22 }: { size?: number }) {
  return (
    <svg {...BASE} width={size} height={size} strokeWidth={2.6}>
      <path d="M5.5 5.5l13 13M18.5 5.5l-13 13" />
    </svg>
  )
}
