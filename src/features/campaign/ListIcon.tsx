/**
 * 목록 아이콘 — 「자세히 보기」 버튼에 쓴다.
 *
 * 직접 그린 도형이라 `.tsx`에 인라인으로 두어도 된다(구현 결정 405) — 격리 규칙
 * 1-1은 Creator Pack 에셋에 대한 것이다.
 */
export function ListIcon({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="4.5" cy="6" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="4.5" cy="12" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="4.5" cy="18" r="1.4" fill="currentColor" stroke="none" />
      <path d="M9.5 6h10M9.5 12h10M9.5 18h10" />
    </svg>
  )
}
