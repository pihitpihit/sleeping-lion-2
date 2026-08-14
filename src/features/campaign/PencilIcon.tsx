/**
 * 고치기 단추의 연필.
 *
 * **직접 그린 도형이라** `.tsx`에 인라인으로 두어도 된다(Creator Pack 격리 규칙
 * 1-1은 팩 에셋에 대한 것이다). 캐릭터 시트와 파티 기록지가 나눠 쓴다 — 같은
 * 일을 하는 단추를 두 벌 그리면 반드시 어긋난다.
 */
export function PencilIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M4 20h4L19.2 8.8a2.1 2.1 0 0 0 0-3L18.2 4.8a2.1 2.1 0 0 0-3 0L4 16v4Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinejoin="round"
      />
      <path d="M14.4 5.6 18.4 9.6" fill="none" stroke="currentColor" strokeWidth="1.9" />
    </svg>
  )
}
