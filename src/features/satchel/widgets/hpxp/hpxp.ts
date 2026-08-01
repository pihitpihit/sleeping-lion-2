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
  /** 물방울·별 표식을 낼 자리가 있는가. 좁으면 숫자가 먼저다. */
  showMarks: boolean
  /** 숫자 글자 크기(px). */
  numberSize: number
  /** ±단추 지름(px). */
  knobSize: number
  /** 육각 창의 너비(px). */
  windowWidth: number
  /** 조각 사이 틈(px). */
  gap: number
  /** 바깥쪽 여백(px) — 알약의 둥근 끝과 빛나는 테를 피한다. */
  padOuter: number
  /** 안쪽 여백(px) — 두 반쪽이 가운데서 부딪히지 않게 한다. */
  padInner: number
}

/* 숫자 크기에 대한 비율. 한 줄에 늘어설 것들의 폭을 이걸로 잡는다. */
const WINDOW_RATIO = 2.6
const KNOB_RATIO = 0.95
/** 이보다 작아지면 표식을 빼고 숫자에 자리를 준다. */
const MIN_COMFORTABLE_NUMBER = 14
const MIN_NUMBER = 9
const MAX_NUMBER = 40

/**
 * 안쪽 배치.
 *
 * **자리를 계산해서 나눠 준다.** 처음에는 flex에 맡겼더니 창이 눌려 숫자가
 * 잘렸고, 창을 고정하자 이번엔 손잡이가 눌려 타원이 됐다. 한 줄에 늘어설 것이
 * 넷(표식·손잡이·창·손잡이)이라 서로 밀어낼 뿐이다. 그래서 **긴 변에 무엇이
 * 몇 개 들어가는지 먼저 셈하고** 그 결과를 픽셀로 내려보낸다.
 */
export function computeHpXpLayout(box: { width: number; height: number }): HpXpLayout {
  const width = Number.isFinite(box.width) ? box.width : 0
  const height = Number.isFinite(box.height) ? box.height : 0
  const empty: HpXpLayout = {
    orientation: 'side-by-side',
    showMarks: false,
    numberSize: 0,
    knobSize: 0,
    windowWidth: 0,
    gap: 0,
    padOuter: 0,
    padInner: 0,
  }
  if (width <= 0 || height <= 0) return empty

  // 사진처럼 붉은 쪽이 왼쪽, 푸른 쪽이 오른쪽인 것이 기본이다.
  // 세로로 길 때만 위아래로 쌓는다.
  const orientation: HpXpOrientation = width >= height ? 'side-by-side' : 'stacked'

  // 반쪽 하나가 차지하는 상자.
  const halfWidth = orientation === 'side-by-side' ? width / 2 : width
  const halfHeight = orientation === 'side-by-side' ? height : height / 2
  const along = Math.max(halfWidth, halfHeight)
  const across = Math.min(halfWidth, halfHeight)

  const gap = Math.max(2, along * 0.022)
  /*
    여백을 여기서 정한다.

    처음에는 CSS가 padding을, 여기가 usable을 따로 정했더니 둘이 어긋나 내용이
    반쪽 밖으로 넘쳤다 — 가운데서 두 `+` 단추가 겹쳐 한쪽이 눌리지 않았다.
    **한 곳에서 정하고 픽셀로 내려보낸다.**
  */
  const padOuter = along * 0.11
  const padInner = along * 0.05
  const usable = Math.max(0, along - padOuter - padInner)

  /** 표식을 낼 때·안 낼 때 각각 숫자를 얼마까지 키울 수 있는가. */
  const fit = (marks: boolean) => {
    const pieces = WINDOW_RATIO + KNOB_RATIO * 2 + (marks ? KNOB_RATIO : 0)
    const gaps = gap * (marks ? 3 : 2)
    return (usable - gaps) / pieces
  }

  // 숫자는 짧은 변에도 맞아야 한다. 어느 방향에서도 넘치지 않게.
  let showMarks = true
  let numberSize = Math.min(MAX_NUMBER, across * 0.42, fit(true))
  if (numberSize < MIN_COMFORTABLE_NUMBER) {
    // 표식을 뺀 자리를 숫자에 준다. 물방울보다 숫자가 먼저다.
    showMarks = false
    numberSize = Math.min(MAX_NUMBER, across * 0.42, fit(false))
  }
  numberSize = Math.max(MIN_NUMBER, numberSize)

  return {
    orientation,
    showMarks,
    numberSize,
    knobSize: numberSize * KNOB_RATIO,
    windowWidth: numberSize * WINDOW_RATIO,
    gap,
    padOuter,
    padInner,
  }
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
