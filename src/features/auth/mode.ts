/**
 * 배포 모드.
 *
 * 같은 코드에서 셋이 나온다(SPEC 3.1).
 *
 * | 모드 | 로그인 | 백엔드 | 어디에 |
 * |---|---|---|---|
 * | `demo` | 없음 | 없음 | 정식 서비스 후의 GitHub Pages |
 * | `mock` | 있음 | 가짜(브라우저 안) | 지금의 GitHub Pages |
 * | `live` | 있음 | 진짜 | 정식 |
 *
 * **모르는 값이면 `live`로 친다.** 이 방향이 중요하다 — 반대로 두면 플래그를
 * 빠뜨렸을 때 정식 배포가 조용히 열린다. 잠기는 쪽으로 틀리는 편이 낫다.
 * `VITE_BASE`로 두 번 덴 자리이며, 그때는 화면이 하얘져서 바로 알았지만
 * 이번엔 아무 일도 없는 것처럼 보인다.
 */

export type AuthMode = 'demo' | 'mock' | 'live'

/**
 * 환경변수 값을 모드로 읽는다.
 *
 * 앞뒤 공백과 대소문자는 봐준다 — YAML에서 딸려 온 공백 하나로 배포가 잠기면
 * 원인을 찾기 어렵다. 그 밖의 모든 값은 `live`다.
 */
export function resolveAuthMode(raw: unknown): AuthMode {
  const value = typeof raw === 'string' ? raw.trim().toLowerCase() : ''
  if (value === 'demo') return 'demo'
  if (value === 'mock') return 'mock'
  return 'live'
}

/** 이 빌드의 모드. 환경변수를 읽는 곳은 여기 한 군데뿐이다. */
export const AUTH_MODE: AuthMode = resolveAuthMode(import.meta.env.VITE_AUTH_MODE)

/** 로그인을 요구하는가. `demo`만 요구하지 않는다. */
export function requiresLogin(mode: AuthMode): boolean {
  return mode !== 'demo'
}

/** 가짜 백엔드로 도는가 — 화면에 시험판임을 알려야 한다. */
export function isTrial(mode: AuthMode): boolean {
  return mode === 'mock'
}
