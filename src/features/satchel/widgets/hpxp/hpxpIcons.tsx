/**
 * HP/XP 트래커 모퉁이의 아이콘 둘.
 *
 * 직접 그린 도형이라 `.tsx`에 인라인으로 두어도 된다(구현 결정 405) — 격리 규칙
 * 1-1은 Creator Pack 에셋에 대한 것이다.
 *
 * **작게 들어가는 그림이라 가는 선을 피한다**(구현 결정: 라운드 트래커의 아이콘과
 * 같은 자리) — 모퉁이에 22px 남짓으로 앉는다.
 */

/** 설정 — 누구의 다이얼인지 고른다. */
export function GearIcon({ size = 16 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" focusable="false">
      <path
        fill="currentColor"
        d="M12 8.6a3.4 3.4 0 1 0 0 6.8 3.4 3.4 0 0 0 0-6.8Zm0 5a1.6 1.6 0 1 1 0-3.2 1.6 1.6 0 0 1 0 3.2Z"
      />
      <path
        fill="currentColor"
        d="m20.3 13.6.1-1.6-.1-1.6 1.6-1.2-1.7-3-1.9.7a7.6 7.6 0 0 0-2.7-1.6L15.2 3H8.8l-.4 2.3a7.6 7.6 0 0 0-2.7 1.6l-1.9-.7-1.7 3 1.6 1.2-.1 1.6.1 1.6-1.6 1.2 1.7 3 1.9-.7a7.6 7.6 0 0 0 2.7 1.6l.4 2.3h6.4l.4-2.3a7.6 7.6 0 0 0 2.7-1.6l1.9.7 1.7-3-1.6-1.2ZM12 17.2a5.2 5.2 0 1 1 0-10.4 5.2 5.2 0 0 1 0 10.4Z"
      />
    </svg>
  )
}

/** 기록 — 무엇이 언제 얼마나 움직였나. */
export function ListIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="4.6" cy="6" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="4.6" cy="12" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="4.6" cy="18" r="1.5" fill="currentColor" stroke="none" />
      <path d="M9.6 6h9.8M9.6 12h9.8M9.6 18h9.8" />
    </svg>
  )
}

/**
 * 체력 채우기 — **천장까지 올린다.**
 *
 * 줄에 이미 물방울이 서 있으므로(최대 체력) **무엇을 올리는지는 문맥이 말한다** —
 * 아이콘 안에까지 물방울을 넣으면 19px에서 획이 뭉갠다. 후보 여섯을 실제 크기로
 * 그려 형님이 골랐다(구현 결정 213-2).
 */
export function FillIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M5 4.4h14M12 20V8.2m0 0-4 4m4-4 4 4" />
    </svg>
  )
}
