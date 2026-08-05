/**
 * 보정 덱에 쓰는 표식.
 *
 * **직접 그린 도형이다.** 실물 카드의 문양을 베끼지 않는다(구현 결정 31).
 * Creator Pack 에셋도 아니므로 격리 규칙(SPEC 13.1)에 걸리지 않는다.
 */

/**
 * 섞기 표식 — **두 겹 원형 화살표.**
 *
 * 한 원을 두 토막으로 끊어 각각 화살촉을 물렸다. 서로를 좇는 고리라 "되돌려
 * 섞는다"가 글자 없이 읽힌다.
 *
 * 중심 (12,12), 반지름 8.5. 위쪽 토막은 왼쪽에서 시작해 꼭대기를 돌아 오른위로,
 * 아래쪽 토막은 오른쪽에서 시작해 바닥을 돌아 왼아래로 간다. 두 토막이 점대칭이라
 * 어느 각도로 돌려도 같아 보인다 — 위젯이 90도씩 도는 곳이라 이게 중요하다
 * (구현 결정 24).
 *
 * 획을 굵게 두고 안을 비운다. 카드 귀퉁이에서 작아졌을 때 뭉치지 않는다.
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
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {/* 위쪽 토막 — 왼쪽(3.5,12)에서 꼭대기를 돌아 오른위(18,6)로. */}
      <path d="M3.5 12A8.5 8.5 0 0 1 18 6" />
      <path d="M18 1.8V6h-4.2" />
      {/* 아래쪽 토막 — 오른쪽(20.5,12)에서 바닥을 돌아 왼아래(6,18)로. */}
      <path d="M20.5 12A8.5 8.5 0 0 1 6 18" />
      <path d="M6 22.2V18h4.2" />
    </svg>
  )
}
