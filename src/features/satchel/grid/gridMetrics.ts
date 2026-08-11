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
  /** 셀 한 변(px). 정사각형이다. */
  cellSize: number
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
  cellSize: 0,
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

  // 셀 크기는 내림한다. 반올림하면 누적 오차로 마지막 열이 삐져나온다.
  // 남는 픽셀은 아래에서 여백으로 흡수된다.
  let cellSize = Math.max(1, Math.floor((usableWidth - (columns - 1) * GRID_GAP) / columns))

  let rows = Math.floor((usableHeight + GRID_GAP) / (cellSize + GRID_GAP))
  if (rows < 1) {
    // 높이가 정사각형 한 칸도 못 담는 극단(가로 폰에서 툴바가 상단일 때).
    // 최소 1행을 보장하되 셀을 줄여 보드 안에 들어오게 한다. 정사각형은 유지한다.
    rows = 1
    cellSize = Math.max(1, Math.floor(usableHeight))
  } else {
    /**
     * 남는 세로 공간을 되찾는다.
     *
     * 셀 크기를 **폭에서만** 뽑고 행 수를 내림하면, 남는 높이가 최대 한 칸에
     * 가깝게 버려진다. 그 구멍은 화면 아래에 통째로 남아 눈에 띈다 — 아이폰
     * 15 Pro에서 화면의 6분의 1이 그렇게 비었다.
     *
     * **셀을 조금 줄여 행을 하나 더 넣는다.** 셀이 8%쯤 작아지는 대신 격자
     * 한 줄이 통째로 생기므로 놓을 자리가 는다. 줄어든 셀이 폭에는 여유를
     * 남기지만 그것은 좌우로 갈려 여백처럼 보이고, 세로로 뭉쳐 있던 구멍과
     * 달리 거슬리지 않는다.
     *
     * **남는 띠가 간격 한 칸보다 얇으면 멈춘다.** 그보다 얇으면 칸과 칸 사이에
     * 원래 있는 틈과 구별되지 않아, 더 짜내 봐야 눈에 보이는 것이 없다.
     *
     * 한때 여기 "반 칸"을 두었는데 그것이 **아이폰 15 Pro에서 여덟째 줄을
     * 막고 있었다** — 남은 높이가 16px이라 반 칸(42px)에 못 미쳤다. 셀은 74px로
     * 하한을 넘겼는데도 그랬다. 형님이 짚었다.
     *
     * 조건을 아예 걷어내는 것은 지나쳤다. 15 Pro Max가 아홉 줄까지 가면서 셀이
     * 74px로 주저앉았는데, 그 화면은 여덟 줄에 84px로 딱 맞는다 — **목표 크기에
     * 가까운 쪽이 낫다.**
     *
     * 대가는 좌우 여백이다. 셀이 정사각형이라 세로에 맞춰 줄이면 가로도 함께
     * 줄고, 남는 폭이 양옆으로 갈린다. 세로로 뭉쳐 있던 구멍과 달리 좌우로
     * 갈린 여백은 격자를 가운데 둔 것처럼 보인다.
     *
     * 셀 하한(`MIN_CELL`)에 걸려도 멈춘다.
     *
     * 셀은 매번 반드시 줄어들므로(행이 늘면 한 칸에 돌아가는 높이가 준다) 이
     * 되풀이는 반드시 끝난다.
     */
    for (;;) {
      const leftover = usableHeight - spanOf(rows, cellSize, GRID_GAP)
      if (leftover <= GRID_GAP) break

      const denser = rows + 1
      const denserCell = Math.floor((usableHeight - (denser - 1) * GRID_GAP) / denser)
      if (denserCell < MIN_CELL) break

      rows = denser
      cellSize = denserCell
    }
  }

  const paddingX = (width - spanOf(columns, cellSize, GRID_GAP)) / 2
  const paddingY = (height - spanOf(rows, cellSize, GRID_GAP)) / 2

  return { columns, rows, cellSize, gap: GRID_GAP, paddingX, paddingY }
}
