/**
 * 되돌릴 수 없는 일을 묻기 전에 두는 뜸.
 *
 * 손가락이 이미 그 자리에 있다. '처음으로'는 잘린 귀퉁이에 있고 확인 팝업은
 * 화면 가운데에 뜨지만, 두 번째 탭이 첫 번째 탭의 관성으로 나가는 일은 흔하다.
 * **잠깐 눌리지 않는 시간을 두면 그 관성이 끊긴다.**
 *
 * 시간 계산을 여기 떼어 둔 이유는 렌더에서 `Date.now()`를 부를 수 없기
 * 때문이다(`react-hooks/purity`). 화면은 마지막으로 잰 값만 들고 있고, 그 값을
 * 뜻으로 옮기는 일은 전부 이 파일의 순수 함수가 한다.
 */

/**
 * 뜸의 길이.
 *
 * 5초다. 처음에는 3초로 두었다 — 관성을 끊을 만큼만 있으면 된다고 봤다. 형님이
 * 5초로 정했고, 그편이 이 조작의 무게에 맞다. 판을 새로 시작하는 것은 되돌릴 수
 * 없고 몇 시간짜리 판이 걸려 있으므로, 잠깐 손이 멎는 값이 조금 비싸도 괜찮다.
 */
export const CONFIRM_DELAY_MS = 5000

/**
 * 다시 재는 간격.
 *
 * 초를 세는 데는 1초면 되지만 채워지는 띠가 계단으로 뛴다. 숫자와 띠를 **한
 * 값에서** 뽑아야 어긋나지 않으므로, 띠에 맞춰 촘촘히 재고 숫자는 올림한다.
 */
export const CONFIRM_TICK_MS = 50

/** 남은 시간(ms). 지났으면 0에서 멎는다 — 음수가 나가면 띠가 거꾸로 찬다. */
export function remainingMs(deadline: number, now: number): number {
  if (!Number.isFinite(deadline) || !Number.isFinite(now)) return 0
  return Math.max(0, deadline - now)
}

/**
 * 단추에 적을 남은 초.
 *
 * **올림이다.** 2999ms를 '2초'로 적으면 1초가 통째로 사라져 보이고, 0.4초
 * 남았을 때 '0'이 적히면 눌러도 안 먹는 고장으로 읽힌다.
 */
export function secondsLeft(remaining: number): number {
  return Math.ceil(Math.max(0, remaining) / 1000)
}

/** 채워지는 띠의 진행도 0..1. 총 길이가 0이면 이미 다 찬 것으로 본다. */
export function armProgress(remaining: number, total = CONFIRM_DELAY_MS): number {
  if (!(total > 0)) return 1
  const done = 1 - Math.max(0, remaining) / total
  return Math.min(1, Math.max(0, done))
}

/** 눌러도 되는가. */
export function isArmed(remaining: number): boolean {
  return remaining <= 0
}

/**
 * 받아 적어야 하는 팝업에서, 친 것이 맞는가.
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ **뜸은 손가락을 막고, 받아 적기는 마음을 묻는다.**                        │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * 5초 뜸은 관성 탭을 막는 값이라(구현 결정 36) 「잘못 눌렀다」는 막지만
 * 「잘못 골랐다」는 못 막는다 — 지우려던 것이 이 파티가 맞는지는 **이름을 손으로
 * 옮겨 적는 동안** 확인된다.
 *
 * 앞뒤 공백은 턴다. **눈에 안 보이는 차이로 막히면 고장으로 읽힌다**(구현 결정
 * 168과 같은 결). 대소문자는 가리지 않는다 — 이름을 그대로 읽어 적는 자리다.
 */
export function matchesChallenge(typed: string, answer: string): boolean {
  const want = answer.trim().toLocaleLowerCase()
  if (want === '') return true
  return typed.trim().toLocaleLowerCase() === want
}
