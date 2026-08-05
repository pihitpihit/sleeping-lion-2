/**
 * 보정 덱에 쓰는 표식.
 *
 * **직접 그린 도형이다.** 실물 카드의 문양을 베끼지 않는다(구현 결정 31).
 * Creator Pack 에셋도 아니므로 격리 규칙(SPEC 13.1)에 걸리지 않는다.
 */

/**
 * 섞기 표식 — 두 개의 호가 서로를 좇는 고리.
 *
 * 뽑으면 이번 라운드가 끝날 때 섞어야 한다는 뜻이다. 카드 귀퉁이에 작게 앉으므로
 * 획을 굵게 두고 안쪽을 비운다 — 작아졌을 때 뭉치지 않는다.
 */
export function ShuffleMark({ size }: { size: number }) {
  return (
    <svg
      className="deck__mark"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {/* 위쪽 호 — 오른쪽으로 돌아 나간다. */}
      <path d="M4.5 9.5A7.5 7.5 0 0 1 18.6 7.4" />
      <path d="M19.5 3.4v4.2h-4.2" />
      {/* 아래쪽 호 — 왼쪽으로 되돌아온다. */}
      <path d="M19.5 14.5A7.5 7.5 0 0 1 5.4 16.6" />
      <path d="M4.5 20.6v-4.2h4.2" />
    </svg>
  )
}
