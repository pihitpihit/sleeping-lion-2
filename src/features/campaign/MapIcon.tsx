/**
 * 지도 아이콘 — 세계 지도를 여는 단추에 쓴다. 세 쪽으로 접힌 종이.
 *
 * 직접 그린 도형이라 `.tsx`에 인라인으로 두어도 된다(구현 결정 405).
 */
export function MapIcon({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M3 6.5 9 4l6 2.5L21 4v13.5L15 20l-6-2.5L3 20z" />
      <path d="M9 4v13.5M15 6.5V20" />
    </svg>
  )
}
