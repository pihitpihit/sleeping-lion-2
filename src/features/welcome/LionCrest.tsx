/**
 * 잠자는 사자 문장(紋章).
 *
 * 여관 간판에 새겨진 각인이라는 컨셉. 눈을 감은 사자 얼굴을 갈기가 둘러싸고,
 * 바깥을 두 겹 놋쇠 테가 감싼다.
 *
 * 기하 프리미티브로만 그린다 — 외부 아트를 쓰지 않으므로 에셋 라이선스
 * (SPEC 13장 🟡 항목) 문제가 원천적으로 없고, 어떤 해상도에서도 선명하다.
 *
 * 갈기는 뾰족한 삼각형이 아니라 둥근 물결(scallop)로 그린다. 삼각형으로 하면
 * 사자가 아니라 태양 문양으로 읽힌다. 여기에 삼각 코·주둥이·수염 같은
 * 고양잇과 단서를 더해야 비로소 사자로 보인다.
 */

/** 갈기 물결의 개수. */
const MANE_LOBES = 12
/** 갈기 물결의 골이 놓이는 반지름. */
const MANE_RADIUS = 26
/** 각 물결의 부풀림 반지름. 현의 절반(약 6.7)보다 커야 바깥으로 볼록해진다. */
const MANE_BULGE = 7.4

/** 중심 (50,50) 기준, 정수리에서 시계방향으로 k번째 골의 좌표. */
function lobePoint(k: number): [number, number] {
  const theta = (2 * Math.PI * k) / MANE_LOBES
  const x = 50 + MANE_RADIUS * Math.sin(theta)
  const y = 50 - MANE_RADIUS * Math.cos(theta)
  return [Number(x.toFixed(2)), Number(y.toFixed(2))]
}

/** 12개의 볼록한 호를 이어붙인 갈기 테두리. */
const MANE_PATH = (() => {
  const [x0, y0] = lobePoint(0)
  let d = `M ${x0} ${y0}`
  for (let k = 1; k <= MANE_LOBES; k += 1) {
    const [x, y] = lobePoint(k % MANE_LOBES)
    // sweep-flag=1 → 시계방향 진행에서 바깥으로 부푼다
    d += ` A ${MANE_BULGE} ${MANE_BULGE} 0 0 1 ${x} ${y}`
  }
  return `${d} Z`
})()

export function LionCrest({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 100 100"
      role="img"
      aria-label="눈을 감은 사자가 새겨진 여관 문장"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="sl-crest-brass" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--sl-gold-bright)" />
          <stop offset="55%" stopColor="var(--sl-gold)" />
          <stop offset="100%" stopColor="var(--sl-gold-dim)" />
        </linearGradient>
      </defs>

      <g stroke="url(#sl-crest-brass)" strokeLinecap="round" strokeLinejoin="round">
        {/* 바깥 두 겹 테 */}
        <circle cx="50" cy="50" r="47" strokeWidth="1.6" />
        <circle cx="50" cy="50" r="43.5" strokeWidth="0.7" opacity="0.75" />

        {/* 테 위 네 방위의 못 자국 */}
        {[0, 90, 180, 270].map((deg) => (
          <circle
            key={deg}
            cx="50"
            cy="5.2"
            r="1.5"
            fill="url(#sl-crest-brass)"
            stroke="none"
            transform={`rotate(${deg} 50 50)`}
          />
        ))}

        {/* 갈기 — 바깥 물결과, 안쪽에 한 겹 더 겹쳐 숱을 준다 */}
        <path d={MANE_PATH} strokeWidth="1.3" />
        <path
          d={MANE_PATH}
          strokeWidth="0.85"
          opacity="0.55"
          transform="rotate(15 50 50) scale(0.82) translate(11 11)"
        />

        {/* 얼굴 윤곽 */}
        <circle cx="50" cy="50" r="19" strokeWidth="1.3" />

        {/* 귀 */}
        <path d="M 36.4 36.4 Q 33.4 33.4 36.2 31.4 Q 39 33.6 40.6 35.2" strokeWidth="1.2" />
        <path d="M 63.6 36.4 Q 66.6 33.4 63.8 31.4 Q 61 33.6 59.4 35.2" strokeWidth="1.2" />

        {/* 감은 눈 — 아래로 휜 호가 '잠들었음'을 읽히게 한다 */}
        <path d="M 37.8 44.2 Q 42.4 49 47 44.2" strokeWidth="1.9" />
        <path d="M 53 44.2 Q 57.6 49 62.2 44.2" strokeWidth="1.9" />

        {/* 코 — 아래로 뾰족한 고양잇과 삼각 */}
        <path d="M 46.3 53 L 53.7 53 L 50 58.2 Z" strokeWidth="1.3" />

        {/* 주둥이 두 갈래 */}
        <path d="M 50 58.2 Q 50 64.2 45.2 64.2 Q 41.6 64.2 41.6 60.4" strokeWidth="1.3" />
        <path d="M 50 58.2 Q 50 64.2 54.8 64.2 Q 58.4 64.2 58.4 60.4" strokeWidth="1.3" />

        {/* 수염 */}
        <g strokeWidth="0.9" opacity="0.85">
          <path d="M 40.2 57.8 L 31.6 55.6" />
          <path d="M 39.6 60.6 L 30.8 60.4" />
          <path d="M 40.4 63.2 L 32.4 65.4" />
          <path d="M 59.8 57.8 L 68.4 55.6" />
          <path d="M 60.4 60.6 L 69.2 60.4" />
          <path d="M 59.6 63.2 L 67.6 65.4" />
        </g>
      </g>
    </svg>
  )
}
