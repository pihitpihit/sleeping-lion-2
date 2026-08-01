/**
 * 세션.
 *
 * **게이트의 기준은 "서버에 닿는가"가 아니라 "이 기기에 유효한 세션이 있는가"다**
 * (SPEC 6.1). 매 실행마다 서버에 물으면 절대 원칙 3(offline-first)이 죽는다 —
 * 신호 없는 자리에서 판을 벌이면 앱이 통째로 멈춘다.
 *
 * 그래서 첫 로그인만 네트워크를 요구하고, 이후에는 여기 저장된 것으로 연다.
 *
 * 보관은 `localStorage`다. IndexedDB는 축 ①의 것이고(SPEC 5.2), 저장 위치를
 * 일부러 다르게 두는 것 자체가 성격이 다르다는 신호다.
 */

export interface Session {
  userId: string
  /** 화면에 보이는 이름. 지금은 로그인 아이디와 같다. */
  displayName: string
  /** 만료 시각(epoch ms). 지나면 없는 것으로 친다. */
  expiresAt: number
}

/** 세션 수명. 여행 중 막히지 않을 만큼 길고, 잃어버린 기기가 영영 열리지는 않을 만큼. */
export const SESSION_DAYS = 60

export const SESSION_KEY = 'sl2.session'

/**
 * 아직 살아 있는가.
 *
 * `now`를 받는다 — 렌더 도중 `Date.now()`를 부르면 같은 입력에 같은 결과가
 * 나오지 않아 React가 렌더를 되돌릴 수 없다(react-hooks/purity).
 */
export function isSessionValid(session: Session | null, now: number): boolean {
  return session !== null && session.expiresAt > now
}

/**
 * 저장된 값을 세션으로 읽는다.
 *
 * 사람이 손댔거나 옛 형식일 수 있으므로 **한 자락도 믿지 않는다.** 모양이
 * 어긋나면 없는 것으로 친다 — 반쯤 맞는 세션으로 여는 것보다 다시 로그인하는
 * 편이 낫다.
 */
export function parseSession(raw: unknown): Session | null {
  if (typeof raw !== 'string') return null

  let value: unknown
  try {
    value = JSON.parse(raw)
  } catch {
    return null
  }

  if (typeof value !== 'object' || value === null) return null
  const { userId, displayName, expiresAt } = value as Record<string, unknown>

  if (typeof userId !== 'string' || userId === '') return null
  if (typeof displayName !== 'string' || displayName === '') return null
  if (typeof expiresAt !== 'number' || !Number.isFinite(expiresAt)) return null

  return { userId, displayName, expiresAt }
}

/** 지금부터 세는 만료 시각. */
export function expiryFrom(now: number, days = SESSION_DAYS): number {
  return now + days * 24 * 60 * 60 * 1000
}

/**
 * 저장소에서 읽는다. 만료됐으면 지우고 없는 것으로 돌려준다.
 *
 * 사파리의 사생활 보호 모드처럼 `localStorage`가 막힌 곳이 있으므로 감싼다.
 * 저장이 안 되는 것은 곤란하지만 앱이 뜨지 않는 것보다는 낫다.
 */
export function loadSession(now: number): Session | null {
  let raw: string | null
  try {
    raw = localStorage.getItem(SESSION_KEY)
  } catch {
    return null
  }

  const session = parseSession(raw)
  if (session === null) return null
  if (!isSessionValid(session, now)) {
    clearSession()
    return null
  }
  return session
}

export function saveSession(session: Session): void {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session))
  } catch {
    // 저장은 못 해도 이번 실행 동안은 로그인 상태로 쓴다.
  }
}

export function clearSession(): void {
  try {
    localStorage.removeItem(SESSION_KEY)
  } catch {
    // 지울 수 없으면 메모리에서만 지운다.
  }
}
