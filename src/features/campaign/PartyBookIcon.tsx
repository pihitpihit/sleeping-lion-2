/**
 * 파티 기록지 아이콘 — 펼친 기록지. 캐릭터 화면 머리와 일지의 캐릭터 줄이 함께 쓴다.
 *
 * 직접 그린 도형이라 `.tsx`에 인라인으로 두어도 된다(구현 결정 405).
 */
export function PartyBookIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M12 6.6C10.1 5.3 7.7 4.7 4.6 4.7v12.6c3.1 0 5.5.6 7.4 1.9 1.9-1.3 4.3-1.9 7.4-1.9V4.7c-3.1 0-5.5.6-7.4 1.9Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M12 6.6v12.6" fill="none" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  )
}
