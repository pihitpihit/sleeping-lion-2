import { AuthError, type AuthAdapter } from './adapter'
import { expiryFrom, type Session } from './session'

/**
 * 가짜 백엔드.
 *
 * 서버가 없는 동안 로그인 흐름 전체를 만져보기 위한 것이다. **인증 시늉조차
 * 하지 않는다** — 아이디와 4자 이상의 비밀번호면 누구나 들어온다.
 *
 * **비밀번호를 저장하지 않는다.** 가짜라 해도 평문 비밀번호를 어딘가 적어두는
 * 코드를 남기면 다음 사람이 그 모양을 따라 쓴다. 어차피 공개 URL에 올라가는
 * 시험판이므로 지킬 것도 없다.
 *
 * 실패 화면도 봐야 하므로 **`잠김`으로 시작하는 아이디는 거절한다.** 화면에
 * 그렇게 적어 둔다.
 */

/** 실패를 시험하기 위한 아이디 앞머리. */
export const LOCKED_PREFIX = '잠김'

/** 사람이 기다린다고 느낄 만큼만. 없으면 눌린 것 같지가 않다. */
const FAKE_DELAY_MS = 400

export const mockAdapter: AuthAdapter = {
  async signIn(id: string, password: string, now: number): Promise<Session> {
    await new Promise((resolve) => setTimeout(resolve, FAKE_DELAY_MS))

    const name = id.trim()
    if (name === '' || password.length < 4) {
      // 무엇이 틀렸는지 가르지 않는다. 아이디 존재 여부가 새어 나간다.
      throw new AuthError('아이디 또는 비밀번호가 올바르지 않습니다.')
    }
    if (name.startsWith(LOCKED_PREFIX)) {
      throw new AuthError('아이디 또는 비밀번호가 올바르지 않습니다.')
    }

    return { userId: `mock:${name}`, displayName: name, expiresAt: expiryFrom(now) }
  },

  async signOut() {},

  // 가짜에는 승인이라는 개념이 없다. 로그인과 같이 굴어 흐름만 만져보게 둔다.
  async signUp(email: string, password: string, now: number): Promise<Session> {
    return mockAdapter.signIn(email, password, now)
  },

  async changePassword() {},
}
