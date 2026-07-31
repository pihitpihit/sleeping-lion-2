/**
 * 도구 띠 아이콘.
 *
 * 전부 직접 그린다 — 기하 도형뿐이라 외부 에셋이 필요 없고, Creator Pack의
 * 격리 규칙(SPEC 13.1)에 얽히지 않는다.
 *
 * 획은 `currentColor`를 따르므로 버튼 상태에 따라 색이 함께 움직인다.
 */

const BASE = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.7,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
  focusable: false,
} as const

/** 햄버거 — 메뉴 */
export function MenuIcon() {
  return (
    <svg {...BASE} width="20" height="20">
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  )
}

/** 연필 — 고쳐 놓기 */
export function EditIcon() {
  return (
    <svg {...BASE} width="20" height="20">
      <path d="M4 20h4L19.5 8.5a2.1 2.1 0 0 0-3-3L5 17v3Z" />
      <path d="M14.5 6.5l3 3" />
    </svg>
  )
}

/** 디스켓 — 다 됐다(저장) */
export function SaveIcon() {
  return (
    <svg {...BASE} width="20" height="20">
      <path d="M5 4h11l3 3v13H5V4Z" />
      <path d="M9 4v5h6V4" />
      <path d="M8 13h8v7H8v-7Z" />
    </svg>
  )
}

/** 되감는 화살 — 되돌리기 */
export function UndoIcon() {
  return (
    <svg {...BASE} width="20" height="20">
      <path d="M4 9h9a5.5 5.5 0 1 1 0 11H8" />
      <path d="M8 4.5 3.5 9 8 13.5" />
    </svg>
  )
}
