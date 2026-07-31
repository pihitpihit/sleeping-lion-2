import type { ToolbarPosition, ToolbarPreference } from '../layout'

/**
 * 기기 유형에 따른 툴바 기본 위치.
 *
 * **User-Agent로 판단하지 않는다.** UA 판별은 틀리고 낡는다 — 아이패드가 데스크톱
 * UA를 보내는 문제도 있다. 뷰포트 크기와 방향으로만 정한다.
 *
 * M2 실측에서 드러난 것: 폰 가로에서 툴바 위치는 **행 수를 바꾸지 않는다**
 * (상단 9×3, 좌측 8×3). 좌측은 열을 하나 줄이는 대신 셀을 키우는 맞바꿈일 뿐이다.
 * 따라서 이 판정은 격자 칸 수가 아니라 **손이 닿는 위치**의 문제다.
 *
 * - 폰 세로 → 상단. 폭이 귀하고, 좌측 툴바는 격자 열을 통째로 잡아먹는다.
 * - 폰 가로 → 좌측. 폰을 가로로 들면 엄지가 좌우 가장자리에 놓이고 상단은 멀다.
 * - 그 외 → 좌측. 세로가 넉넉하고, 위젯이 늘면 툴바 항목도 늘어 세로로 쌓는 편이 낫다.
 */
export function defaultToolbarPosition(viewport: {
  width: number
  height: number
}): ToolbarPosition {
  const isPortrait = viewport.height >= viewport.width
  const isNarrow = viewport.width < 768
  return isPortrait && isNarrow ? 'top' : 'left'
}

/**
 * 선호를 실제 위치로 옮긴다.
 *
 * 고정값을 고르면 그것이 이긴다 — 기본값이 계속 덮어쓰면 설정이 무의미해진다.
 * `auto`는 매번 기기·방향으로 다시 정하므로 회전하면 따라 바뀐다.
 */
export function resolveToolbarPosition(
  preference: ToolbarPreference,
  viewport: { width: number; height: number },
): ToolbarPosition {
  return preference === 'auto' ? defaultToolbarPosition(viewport) : preference
}

/** 메뉴에서 한 번 누를 때마다 자동 → 위 → 왼쪽 → 자동 으로 돈다. */
export function nextToolbarPreference(current: ToolbarPreference): ToolbarPreference {
  return current === 'auto' ? 'top' : current === 'top' ? 'left' : 'auto'
}

export const TOOLBAR_PREFERENCE_LABEL: Record<ToolbarPreference, string> = {
  auto: '자동',
  top: '위',
  left: '왼쪽',
}
