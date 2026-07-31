/**
 * 톱니바퀴 — 위젯 설정. 직접 그린다.
 *
 * 테두리에서 뻗은 선만으로는 **해처럼** 읽힌다. 톱니를 테두리와 같은 굵기로
 * 짧게 붙여 바퀴에서 돋아난 것으로 보이게 한다.
 */
export function GearIcon() {
  const teeth = [0, 45, 90, 135, 180, 225, 270, 315]
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeLinecap="butt"
      aria-hidden="true"
      focusable="false"
    >
      {teeth.map((deg) => (
        <line
          key={deg}
          x1="12"
          y1="4.2"
          x2="12"
          y2="6.6"
          strokeWidth={3.4}
          transform={`rotate(${deg} 12 12)`}
        />
      ))}
      <circle cx="12" cy="12" r="6.4" strokeWidth={2.6} />
      <circle cx="12" cy="12" r="2.4" strokeWidth={1.8} />
    </svg>
  )
}
