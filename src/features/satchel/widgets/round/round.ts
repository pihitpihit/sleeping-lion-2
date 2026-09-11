/**
 * 라운드 트래커의 안쪽 배치.
 *
 * 크기가 자유롭다 — 한 칸짜리 작은 표식으로 둘 수도, 넓게 펴서 멀리서 보이게
 * 할 수도 있다. 그래서 **글자 크기를 상자에서 역산**한다.
 */

export interface RoundLayout {
  /** 숫자 글자 크기(px). */
  numberSize: number
  /** 'ROUND' 글자 크기(px). */
  labelSize: number
  /**
   * 이름표를 낼 자리가 있는가. 좁으면 숫자가 먼저다.
   *
   * **이름표가 빠지면 숫자 앞에 `R`을 붙인다.** 한 칸짜리로 두면 숫자만 덩그러니
   * 남아 그것이 라운드인지 체력인지 골드인지 알 수 없다 — 형님이 짚었다.
   */
  showLabel: boolean
  /** 왼쪽 위를 사선으로 자른 길이(px). 그 삼각형이 곧 '처음으로' 단추다. */
  cutSize: number
  /** 삼각형 안에 놓을 아이콘 한 변(px). */
  cutIconSize: number
  /**
   * 경과 시간을 낼 자리가 있는가.
   *
   * **좁으면 숫자가 먼저다.** 한 칸짜리에 `R3`과 `12:04`를 함께 밀어 넣으면 둘 다
   * 점처럼 남는다 — 이름표를 빼는 것과 같은 판단이다.
   */
  showTimer: boolean
  /** 경과 시간 글자 크기(px). */
  timerSize: number
}

/** 이보다 작아지면 이름표를 뺀다. 숫자가 먼저다. */
const LABEL_THRESHOLD = 88
const MIN_NUMBER = 12
const MAX_NUMBER = 96

export function computeRoundLayout(box: { width: number; height: number }): RoundLayout {
  const width = Number.isFinite(box.width) ? box.width : 0
  const height = Number.isFinite(box.height) ? box.height : 0
  if (width <= 0 || height <= 0) {
    return {
      numberSize: 0,
      labelSize: 0,
      showLabel: false,
      cutSize: 0,
      cutIconSize: 0,
      showTimer: false,
      timerSize: 0,
    }
  }

  const showLabel = Math.min(width, height) >= LABEL_THRESHOLD
  /*
    시계는 이름표보다 먼저 빠진다. `mm:ss`는 다섯 글자라 `ROUND`보다 자리를 더
    먹는데, 없어도 판을 굴리는 데는 지장이 없다 — 없으면 캠페인 상태 위젯에서 본다.
  */
  const showTimer = height >= TIMER_THRESHOLD && width >= TIMER_THRESHOLD

  // 이름표와 시계가 있으면 그만큼 세로를 내준다. 띠 창은 글자 크기와 같다.
  const rows = 1 + (showLabel ? 1 : 0) + (showTimer ? 1 : 0)
  const forNumber = height * (rows === 3 ? 0.5 : rows === 2 ? 0.62 : 0.96)
  /*
    이름표가 빠진 자리에는 `R`이 숫자 앞에 붙으므로 **가로를 그만큼 더 나눠 준다.**
    `R`은 숫자의 0.85배이고 사이가 조금 뜨므로 숫자 몫은 절반이 조금 넘는다.
    **인색하게 잡으면 한 칸짜리에서 글자가 점처럼 남는다** — 형님이 세 번 짚었다.
    Pirata의 숫자는 진폭이 좁아(0.24~0.43em) 글자 크기를 넉넉히 줘도 두 자리가
    넘치지 않는다 — 그래서 몫을 크게 잡을 수 있다.
  */
  const widthShare = showLabel ? 0.52 : 0.5
  const numberSize = Math.max(MIN_NUMBER, Math.min(MAX_NUMBER, forNumber, width * widthShare))

  /*
    잘린 귀퉁이의 크기.

    손끝으로 짚을 만해야 하므로 아래로는 34px에서 멈추고, 위로는 판을 잡아먹지
    않게 56px에서 멈춘다.
  */
  const cutSize = Math.max(34, Math.min(56, Math.min(width, height) * 0.3))

  return {
    numberSize,
    labelSize: Math.max(9, numberSize * 0.22),
    showLabel,
    cutSize,
    cutIconSize: cutSize * ICON_IN_CUT,
    showTimer,
    /*
      `mm:ss`는 다섯 글자다. 가로로 넘치지 않게 폭에서도 한 번 잡는다 — Pirata의
      숫자는 좁지만 콜론까지 다섯 자리면 넉넉히 두어야 한다.
    */
    timerSize: Math.max(9, Math.min(numberSize * 0.34, width * 0.17)),
  }
}

/** 이보다 작으면 시계를 뺀다. 이름표 문턱보다 높다 — 시계가 먼저 빠진다. */
const TIMER_THRESHOLD = 104

/**
 * 삼각형 안에서 아이콘이 차지하는 비율.
 *
 * 직각삼각형의 두 변이 `L`이면 빗변은 `x + y = L`이다. 아이콘을 `(0.3L, 0.3L)`에
 * 앉히면 오른쪽 아래 모서리가 `0.6L + s`이므로, `s`가 `0.4L`보다 작아야 빗변을
 * 넘지 않는다. 여유를 두어 0.36으로 잡았다 — 이 값과 아래 CSS의 위치(30%)는
 * 함께 움직여야 한다.
 */
const ICON_IN_CUT = 0.36

/* --------------------------------------------------------------------------
   라운드에 걸린 시간
   --------------------------------------------------------------------------
   ┌──────────────────────────────────────────────────────────────────────────┐
   │ **시각을 렌더 중에 읽지 않는다.**                                         │
   └──────────────────────────────────────────────────────────────────────────┘

   `Date.now()`를 렌더 안에서 부르면 같은 입력에 다른 결과가 나와 렌더를 되돌릴
   수 없다(`react-hooks/purity`, 구현 결정 12). 화면이 1초마다 지금 시각을 재어
   상태에 담고, 여기 함수들은 **받은 두 수로만** 셈한다.
   -------------------------------------------------------------------------- */

/** 한 시간을 넘어가면 분이 60을 넘는다. 판이 그만큼 갈 일은 없지만 막지는 않는다. */
const MAX_MINUTES = 999

/**
 * 밀리초를 `mm:ss`로.
 *
 * **내림이다.** 59.9초를 `01:00`으로 적으면 아직 안 지난 분이 지난 것으로 읽힌다 —
 * 남은 시간을 올려 세는 것(`secondsLeft`, 구현 결정 38)과 반대 방향인데, 그쪽은
 * "아직 남았다"를 말하고 이쪽은 "여기까지 왔다"를 말하기 때문이다.
 */
export function formatDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return '00:00'
  const total = Math.floor(ms / 1000)
  const minutes = Math.min(MAX_MINUTES, Math.floor(total / 60))
  const seconds = total % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

/**
 * 지금 라운드가 얼마나 흘렀는가.
 *
 * 아직 시작하지 않았으면(`startedAt`이 `null`) 0이다 — 시작 단추를 누르기 전에는
 * 셈할 것이 없다.
 *
 * **거꾸로 가는 것은 0으로 본다.** 전투를 나누면 시작 시각이 남의 기기에서 오는데
 * (`runtime/snapshot.ts`) 두 기계의 시계가 어긋나 있으면 음수가 나올 수 있다.
 */
export function elapsedMs(startedAt: number | null, now: number): number {
  if (startedAt === null || !Number.isFinite(startedAt) || !Number.isFinite(now)) return 0
  return Math.max(0, now - startedAt)
}

/** 기록된 라운드들의 평균. 하나도 없으면 `null`이다 — 모르면 모른다고 한다(구현 결정 115). */
export function averageLap(laps: readonly number[]): number | null {
  const usable = laps.filter((ms) => Number.isFinite(ms) && ms >= 0)
  if (usable.length === 0) return null
  return usable.reduce((sum, ms) => sum + ms, 0) / usable.length
}
