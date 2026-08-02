/**
 * 라운드 트래커의 아이콘.
 *
 * 직접 그린 기하 도형이라 Creator Pack 격리 규칙(SPEC 13.1)에 얽히지 않는다.
 */

/**
 * 처음으로 — 막대와 왼쪽을 가리키는 세모.
 *
 * 원형 화살표를 쓰려다 말았다. 귀퉁이에 들어가는 아이콘은 20px 남짓이라, 가는
 * 곡선은 그 크기에서 뭉개진다. **채운 도형이 작을수록 잘 읽힌다.**
 *
 * 위젯 테두리의 '돌리기'가 이미 원형 화살표라 헷갈릴 여지도 있었다.
 */
export function RestartIcon({ size = 24 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      <rect x="4" y="4.5" width="3.2" height="15" rx="1.2" />
      <path d="M20 5.2v13.6a1 1 0 0 1-1.55.83L9.2 13.03a1.2 1.2 0 0 1 0-2.06l9.25-6.6A1 1 0 0 1 20 5.2Z" />
    </svg>
  )
}
