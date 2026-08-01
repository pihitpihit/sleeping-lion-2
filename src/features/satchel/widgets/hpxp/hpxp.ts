/**
 * HP/XP 트래커의 규칙.
 *
 * 순수 함수로 떼어 둔다(SPEC 4.1). 눈으로 세는 것을 대신 세어줄 뿐이며
 * **룰 엔진이 아니다** — 최대 체력이 얼마인지, 레벨업에 몇이 필요한지는 알지
 * 못하고 알 필요도 없다(SPEC 1장 축 ② 제약).
 */

/** 화면에 담을 수 있는 자릿수에서 온 한계다. 게임 규칙이 아니다. */
export const MIN_VALUE = 0
export const MAX_VALUE = 99

export interface HpXp {
  hp: number
  xp: number
}

export const INITIAL: HpXp = { hp: 0, xp: 0 }

export function clampValue(value: number): number {
  if (!Number.isFinite(value)) return MIN_VALUE
  return Math.min(MAX_VALUE, Math.max(MIN_VALUE, Math.round(value)))
}

/** 실물 다이얼은 끝에서 더 돌아가지 않는다. 넘어가지 않고 멈춘다. */
export function step(value: number, delta: number): number {
  return clampValue(value + delta)
}

export type HpXpTrack = 'hp' | 'xp'

export const TRACK_LABEL: Record<HpXpTrack, string> = { hp: '생명', xp: '경험' }

/* --------------------------------------------------------------------------
   배치
   -------------------------------------------------------------------------- */

/** 붉은 쪽과 푸른 쪽이 어떻게 놓이는가. */
export type HpXpOrientation = 'side-by-side' | 'stacked'

export interface HpXpLayout {
  orientation: HpXpOrientation
  /** 표식(물방울·별)의 한 변(px). 숫자가 그 안에 앉는다. */
  markSize: number
  /** 숫자 글자 크기(px). */
  numberSize: number
}

/** 표식 안에서 숫자가 차지하는 비율. 물방울의 불룩한 아래쪽에 들어갈 만큼. */
const NUMBER_IN_MARK = 0.4
const MIN_NUMBER = 9
const MAX_MARK = 132

/**
 * 안쪽 배치.
 *
 * 손잡이와 육각 창이 사라지고 **표식 하나가 그 자리를 다 쓴다.** 한 줄에 넷을
 * 늘어놓느라 서로 밀어내던 문제가 통째로 없어졌다.
 */
export function computeHpXpLayout(box: { width: number; height: number }): HpXpLayout {
  const width = Number.isFinite(box.width) ? box.width : 0
  const height = Number.isFinite(box.height) ? box.height : 0
  if (width <= 0 || height <= 0) {
    return { orientation: 'side-by-side', markSize: 0, numberSize: 0 }
  }

  // 사진처럼 붉은 쪽이 왼쪽, 푸른 쪽이 오른쪽인 것이 기본이다.
  const orientation: HpXpOrientation = width >= height ? 'side-by-side' : 'stacked'

  const halfWidth = orientation === 'side-by-side' ? width / 2 : width
  const halfHeight = orientation === 'side-by-side' ? height : height / 2

  // 알약의 둥근 끝과 빛나는 테를 피해 안쪽만 쓴다.
  const markSize = Math.max(0, Math.min(MAX_MARK, Math.min(halfWidth, halfHeight) * 0.82))
  const numberSize = markSize > 0 ? Math.max(MIN_NUMBER, markSize * NUMBER_IN_MARK) : 0

  return { orientation, markSize, numberSize }
}

/* --------------------------------------------------------------------------
   손가락 읽기
   -------------------------------------------------------------------------- */

/**
 * 한 칸 오르내리는 데 필요한 이동(px).
 *
 * 처음 22px은 너무 예민했다 — 조금만 스쳐도 숫자가 훌쩍 뛴다. ±1은 탭이 맡고
 * 끌기는 여러 칸을 한 번에 옮길 때 쓰는 것이므로, 손이 확실히 움직였을 때만
 * 반응하는 편이 낫다.
 */
export const DRAG_STEP_PX = 38

/** 이보다 덜 움직였으면 끈 것이 아니라 누른 것이다. */
export const TAP_SLOP_PX = 5

/**
 * 화면에서의 이동을 **위젯 안쪽 좌표**로 돌린다.
 *
 * 내용은 CSS `rotate`로 돌아가 있지만 포인터 좌표는 화면 기준으로 온다.
 * 180도로 돌려 마주 앉은 사람이 제 기준 '위로' 끄는 것은 화면에서는 '아래로'다.
 * 그대로 쓰면 값이 거꾸로 움직인다.
 *
 * 화면 = R(θ)·안쪽 이므로 안쪽 = R(−θ)·화면 이다.
 */
export function toLocalDelta(dx: number, dy: number, rotation: number): { dx: number; dy: number } {
  const rad = (-rotation * Math.PI) / 180
  // 90도 단위만 쓰므로 반올림하면 정확히 0과 ±1이 된다. 부동소수 찌꺼기를 없앤다.
  const cos = Math.round(Math.cos(rad))
  const sin = Math.round(Math.sin(rad))
  return { dx: unsign(dx * cos - dy * sin), dy: unsign(dx * sin + dy * cos) }
}

/** `-0`을 `0`으로 만든다. 값은 같지만 `Object.is`로 비교하면 갈리고, 밖으로
 *  내보낼 이유가 없다. */
function unsign(value: number): number {
  return value === 0 ? 0 : value
}

/**
 * 끈 거리에서 몇 칸인지.
 *
 * **위로 끌면 늘어난다.** 화면 좌표는 아래로 갈수록 커지므로 부호를 뒤집는다.
 */
export function stepsFromDrag(localDy: number, stepPx = DRAG_STEP_PX): number {
  if (!Number.isFinite(localDy) || stepPx <= 0) return 0
  // 반올림이 아니라 버림이다. 반올림하면 반 칸만 움직여도 한 칸이 되어
  // 손을 떼는 순간 값이 튄다. 또 0에서 위아래 문턱이 어긋난다.
  return unsign(Math.trunc(-localDy / stepPx))
}

/**
 * 이 크기로 놓아도 되는가 — **긴 쪽 4칸, 짧은 쪽 2칸까지.**
 *
 * `maxSize` 한 쌍으로는 못 적는다. `{4,2}`로 두면 세로로 세운 2×4가 막히고,
 * `{4,4}`로 두면 4×4가 열린다. 원소 트래커와 같은 이유로 훅을 쓴다.
 */
export function isHpXpSizeAllowed(size: { w: number; h: number }): boolean {
  const long = Math.max(size.w, size.h)
  const short = Math.min(size.w, size.h)
  // 1×1은 막는다 — 반쪽 둘에 숫자와 단추를 담을 수 없다.
  return long >= 2 && long <= 4 && short >= 1 && short <= 2
}
