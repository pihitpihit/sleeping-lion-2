import type { Session } from './session'

/**
 * 인증의 바깥 경계.
 *
 * **이 인터페이스를 좁게 두는 것이 N1의 요점이다.** 지금은 가짜 백엔드가
 * 들어가 있고, N2에서 Supabase가 이 자리에 들어온다. 화면과 스토어는 어느
 * 쪽인지 몰라야 한다 — 알게 되는 순간 갈아끼우기가 어려워진다.
 */
export interface AuthAdapter {
  /**
   * 로그인. 성공하면 세션을, 실패하면 `AuthError`를 던진다.
   *
   * @throws {AuthError}
   */
  signIn(id: string, password: string, now: number): Promise<Session>
  signOut(): Promise<void>
  /**
   * 가입.
   *
   * **가입은 열려 있고 쓰는 것은 승인받은 사람만 한다**(0004). 여기서 막지
   * 않는 이유가 그것이다 — 벽은 승인이지 가입이 아니다.
   *
   * 지원하지 않는 백엔드는 `AuthError`를 던진다.
   */
  signUp(email: string, password: string, now: number): Promise<Session>
  /** 비밀번호 바꾸기. 승인 전에도 된다 — 잠긴 계정도 제 열쇠는 갈 수 있어야 한다. */
  changePassword(next: string): Promise<void>
}

/** 사용자에게 그대로 보여줄 수 있는 실패. */
export class AuthError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AuthError'
  }
}

/**
 * 아직 붙지 않은 백엔드.
 *
 * `live` 빌드는 N2에서 Supabase가 붙기 전까지 이걸 만난다. 조용히 실패하는
 * 것보다 무엇이 없는지 말해주는 편이 낫다.
 */
export const notReadyAdapter: AuthAdapter = {
  async signIn() {
    throw new AuthError('아직 서버가 붙지 않았습니다.')
  },
  async signOut() {},
  async signUp() {
    throw new AuthError('아직 서버가 붙지 않았습니다.')
  },
  async changePassword() {
    throw new AuthError('아직 서버가 붙지 않았습니다.')
  },
}
