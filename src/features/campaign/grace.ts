/**
 * 지우기의 유예 — **언제 진짜로 사라지는가.**
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ **잘못 눌렀다는 것은 대개 한참 뒤에 안다.**                               │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * 팝업의 5초 뜸(구현 결정 36)은 손이 미끄러지는 것을 막는 값이다. 몇 시간짜리
 * 판을 여럿 거친 기록이 걸린 자리에는 얇으므로 **이틀을 둔다**(`0022`).
 *
 * 남은 시간을 적는 것은 순수 함수라 표로 못박는다 — 여기가 틀리면 「아직 있다」고
 * 적힌 캐릭터가 사라지거나 그 반대가 된다.
 */

/** 서버가 거두는 것과 같은 값이어야 한다(`sweep_deleted_characters`의 2일). */
export const GRACE_MS = 2 * 24 * 60 * 60 * 1000

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

/** 언제 사라지는가. */
export function dueAt(deletedAt: number): number {
  return deletedAt + GRACE_MS
}

/**
 * 얼마나 남았는가 — 사람의 말로.
 *
 * **올려 센다**(구현 결정 38과 같은 결). 1시간 59분이 「1시간」으로 적히면 있는
 * 시간보다 적게 말하는 것이고, **급한 자리에서 적게 말하는 쪽이 더 나쁘다** —
 * 아직 되돌릴 수 있는데 늦었다고 여긴다.
 *
 * 하루가 넘게 남았으면 시간까지 함께 적는다. 「2일 남음」만으로는 오늘 안에
 * 손을 써야 하는지 알 수 없다.
 */
export function graceText(deletedAt: number, now: number): string {
  const left = dueAt(deletedAt) - now
  if (left <= 0) return '곧 사라진다'

  if (left >= DAY) {
    const days = Math.floor(left / DAY)
    const hours = Math.ceil((left - days * DAY) / HOUR)
    // 올려 세다 24시간이 되면 하루로 올린다 — 「1일 24시간」은 말이 안 된다.
    if (hours === 24) return `${days + 1}일 뒤 사라진다`
    return hours === 0 ? `${days}일 뒤 사라진다` : `${days}일 ${hours}시간 뒤 사라진다`
  }

  if (left >= HOUR) return `${Math.ceil(left / HOUR)}시간 뒤 사라진다`
  return `${Math.ceil(left / MINUTE)}분 뒤 사라진다`
}

/** 목록에 다는 짧은 표. 줄이 좁아 「뒤 사라진다」까지 적을 자리가 없다. */
export function graceShort(deletedAt: number, now: number): string {
  const left = dueAt(deletedAt) - now
  if (left <= 0) return '곧 사라짐'
  if (left >= DAY) return `${Math.ceil(left / DAY)}일 남음`
  if (left >= HOUR) return `${Math.ceil(left / HOUR)}시간 남음`
  return `${Math.ceil(left / MINUTE)}분 남음`
}
