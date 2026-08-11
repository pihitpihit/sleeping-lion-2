/**
 * 보드 크기를 격자로 나눈다.
 *
 * React도 DOM도 모르는 순수 함수다. 화면에 아무것도 그리지 않으며 검증은
 * Vitest로만 한다 — 격자 계산은 눈으로 확인하기 어렵고 회귀가 조용히 생긴다.
 */

/** 보드 영역의 픽셀 크기. `useBoardSize`가 관측한 값이 그대로 들어온다. */
export interface Size {
  width: number
  height: number
}

export interface GridMetrics {
  columns: number
  rows: number
  /**
   * 셀의 가로·세로(px).
   *
   * ┌──────────────────────────────────────────────────────────────────────┐
   * │ **정사각형이 아니다. 두 축을 따로 채운다.**                           │
   * └──────────────────────────────────────────────────────────────────────┘
   *
   * 한 변으로 두었더니 **한쪽을 채우면 다른 쪽이 남았다.** 아이폰 15 Pro에서
   * 여덟 줄에 맞춰 높이를 74px로 줄이자 폭에도 같은 값이 쓰여 45px가 남았고,
   * 그것이 좌우로 갈려 빈 띠가 되었다 — 형님이 짚은 자리다.
   *
   * 가로는 폭을, 세로는 높이를 각자 채운다. 대신 아래 `MAX_ASPECT`로 한쪽이
   * 지나치게 길어지는 것은 막는다.
   */
  cellWidth: number
  cellHeight: number
  /** 셀 사이 간격(px). */
  gap: number
  /** 격자를 가운데 두기 위한 좌우·상하 여백(px). */
  paddingX: number
  paddingY: number
}

/**
 * 셀 한 칸이 목표로 하는 크기(px). 앱 아이콘 정도.
 *
 * 열 수를 구간표로 정하지 않고 이 값에서 역산한다. 구간표를 쓰면 넓은 화면에서
 * 셀이 100px을 넘어 위젯이 휑해지고, 경계마다 손으로 값을 맞춰야 한다.
 * 목표 크기 하나를 두면 어느 폭에서든 셀이 비슷하게 나온다 — 실측표는
 * `milestone/M2-격자-시스템.md`에 있다.
 */
const TARGET_CELL = 84

/** 셀 사이 간격(px). 고정값이다. */
export const GRID_GAP = 12

/** 격자 바깥 최소 여백(px). */
const MIN_PADDING = 8

/**
 * 셀 하한(px). **이보다 작아지면서까지 행을 늘리지는 않는다.**
 *
 * 세로를 채우려고 셀을 무한정 줄이면 위젯 속 글자와 아이콘이 뭉갠다. 기존
 * 실측에서 어느 기기에서든 셀이 72~96px에 들어왔으므로 그 아래를 하한으로 둔다.
 */
const MIN_CELL = 72

/**
 * 셀이 정사각형에서 벗어날 수 있는 한도.
 *
 * 두 축을 따로 채우면 셀이 조금 길쭉해진다 — 아이폰 15 Pro에서 85×74(0.87)
 * 정도다. 그만큼은 눈에 띄지 않지만, 가로로 누운 폰처럼 높이가 크게 남는 자리에서
 * 그냥 두면 셀이 82×140처럼 어긋난다. **한도를 넘는 만큼은 여백으로 돌린다.**
 *
 * 아래쪽 한도는 줄을 하나 더 넣을지 정할 때도 본다. 15 Pro Max에서 아홉 줄까지
 * 가면 셀이 94×76으로 납작해지는데, 여덟 줄이면 94×87로 반듯하다 — **줄 하나보다
 * 반듯한 칸이 낫다.**
 */
const MIN_ASPECT = 0.85
const MAX_ASPECT = 1.25

/** 열 수 하한. 이보다 적으면 위젯을 나란히 둘 수가 없다. */
const MIN_COLUMNS = 4
/** 열 수 상한. 아주 넓은 화면에서 셀이 잘게 부서지는 것을 막는다. */
const MAX_COLUMNS = 16

/**
 * 격자가 차지하는 최대 폭(px). 이보다 넓은 보드에서는 격자를 가운데 둔다.
 *
 * 상한이 없으면 2560px 모니터에서 열 수가 상한에 걸려 셀이 147px까지 부푼다.
 * 게다가 그 폭을 가로지르며 위젯을 끄는 것은 실제로 쓸 수 없다. 손이 닿는
 * 범위로 묶어두는 편이 낫다.
 */
const MAX_GRID_WIDTH = 1600

/** 보드를 잴 수 없을 때. 렌더러는 `columns === 0`이면 아무것도 그리지 않는다. */
export const EMPTY_METRICS: GridMetrics = {
  columns: 0,
  rows: 0,
  cellWidth: 0,
  cellHeight: 0,
  gap: GRID_GAP,
  paddingX: 0,
  paddingY: 0,
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

/**
 * n개의 셀과 그 사이 간격이 차지하는 길이.
 * `n * cell + (n - 1) * gap` 을 한군데 모아 둔다.
 */
export function spanOf(count: number, cellSize: number, gap: number): number {
  return count <= 0 ? 0 : count * cellSize + (count - 1) * gap
}

/**
 * 보드 크기를 받아 격자를 계산한다.
 *
 * 순서가 중요하다 — **열 수를 먼저 정하고 셀 크기는 남은 폭을 나눠 갖는다.**
 * 셀 크기를 먼저 고정하면 기기마다 열 수가 어중간하게 떨어지고 가장자리에
 * 애매한 여백이 남는다. 홈화면이 그렇게 동작하지 않는 이유다.
 *
 * 행 수는 구간으로 정하지 않는다. 셀이 정사각형이므로 남은 높이에 몇 개가
 * 들어가는지로 결정한다 — 세로 공간은 기기 편차가 크고 툴바 위치(M5)에 따라서도
 * 달라지므로 계산으로 뽑는 편이 맞다.
 *
 * **그리고 남는 세로 공간을 되찾는다.** 폭에서 뽑은 셀로 행을 내림하면 최대 한
 * 칸에 가까운 높이가 버려지고, 그 구멍이 화면 아래에 통째로 남는다. 셀을 조금
 * 줄여 행을 하나 더 넣는 쪽이 낫다 — 아래 되풀이가 그 일을 한다.
 */
export function computeGridMetrics(board: Size): GridMetrics {
  const { width, height } = board
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return EMPTY_METRICS
  }

  // 열과 셀은 상한을 씌운 폭으로 계산하고, 여백은 아래에서 실제 폭으로 구한다.
  // 그러면 넓은 화면에서 격자가 저절로 가운데 놓인다.
  const usableWidth = Math.min(width, MAX_GRID_WIDTH) - MIN_PADDING * 2
  const usableHeight = height - MIN_PADDING * 2
  if (usableWidth <= 0 || usableHeight <= 0) return EMPTY_METRICS

  // n개의 셀이 차지하는 길이는 n*(cell+gap) - gap 이므로, 역산하면 이 꼴이 된다.
  const columns = clamp(
    Math.round((usableWidth + GRID_GAP) / (TARGET_CELL + GRID_GAP)),
    MIN_COLUMNS,
    MAX_COLUMNS,
  )

  // 가로는 폭을 그대로 채운다. 내림하는 것은 반올림하면 누적 오차로 마지막
  // 열이 삐져나오기 때문이며, 남는 몇 픽셀은 아래에서 여백으로 흡수된다.
  const cellWidth = Math.max(1, Math.floor((usableWidth - (columns - 1) * GRID_GAP) / columns))

  /** 이 줄 수로 나눴을 때의 셀 높이. 세로를 그대로 채운다. */
  const heightFor = (count: number) =>
    Math.max(1, Math.floor((usableHeight - (count - 1) * GRID_GAP) / count))

  // 정사각형에 가까운 줄 수에서 출발한다. 목표 크기에 가장 가까운 자리다.
  let rows = Math.floor((usableHeight + GRID_GAP) / (cellWidth + GRID_GAP))

  if (rows < 1) {
    // 높이가 한 칸도 못 담는 극단(가로 폰에서 툴바가 상단일 때). 최소 한 줄은 둔다.
    rows = 1
  } else {
    /**
     * 남는 세로를 되찾는다.
     *
     * ┌──────────────────────────────────────────────────────────────────┐
     * │ **멈추는 것은 셀 하한(`MIN_CELL`) 하나뿐이다.**                   │
     * └──────────────────────────────────────────────────────────────────┘
     *
     * "얼마나 남았는가"로 멈추는 조건을 두 번 두었다가 두 번 다 걷어냈다.
     * 처음에는 반 칸, 다음에는 간격 한 칸이었는데 **둘 다 아이폰 15 Pro의
     * 여덟째 줄을 막았다** — 셀이 하한을 넘기는데도 남는 높이가 모자라 멎었다.
     *
     * 남은 높이가 얼마인지는 **줄을 더 넣을 수 있는가와 아무 상관이 없다.**
     * 물어야 할 것은 "칸이 아직 쓸 만한가" 하나이고, 그 답이 `MIN_CELL`이다.
     *
     * 셀 높이는 줄이 늘 때마다 반드시 줄어들므로 이 되풀이는 반드시 끝난다.
     */
    /**
     * 칸이 얼마나 납작해져도 되는가.
     *
     * 셀 하한만 보면 넓은 폰에서 셀이 24%까지 납작해진다. 폭에 견준 한도를 함께
     * 두어 반듯한 쪽을 고른다.
     */
    const minCellHeight = Math.max(MIN_CELL, Math.round(cellWidth * MIN_ASPECT))
    while (heightFor(rows + 1) >= minCellHeight) rows += 1
  }

  /**
   * 세로를 채우되 지나치게 길쭉해지지는 않게 한다.
   *
   * 한도를 넘는 만큼은 위아래 여백으로 돌린다 — 가로로 누운 폰처럼 높이가 크게
   * 남는 자리에서 셀이 82×140으로 어긋나는 것을 막는다.
   */
  const cellHeight = clamp(
    heightFor(rows),
    // 한 줄밖에 못 넣는 극단(가로 폰에서 툴바가 상단)에서는 하한을 못 지킨다.
    // 그때는 있는 높이를 그대로 쓴다.
    Math.min(MIN_CELL, cellWidth, heightFor(rows)),
    Math.round(cellWidth * MAX_ASPECT),
  )

  const paddingX = (width - spanOf(columns, cellWidth, GRID_GAP)) / 2
  const paddingY = (height - spanOf(rows, cellHeight, GRID_GAP)) / 2

  return { columns, rows, cellWidth, cellHeight, gap: GRID_GAP, paddingX, paddingY }
}
