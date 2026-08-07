import { AuthError, type AuthAdapter } from './adapter'
import { expiryFrom, type Session } from './session'
import { isSupabaseConfigured, supabase } from './supabase'

/**
 * 진짜 백엔드에 붙는 인증.
 *
 * **`AuthAdapter` 경계 안쪽만 갈아끼운다.** 화면과 스토어는 백엔드가 무엇인지
 * 모른다 — N1이 이 경계를 좁게 둔 것이 그러라고 한 일이다.
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ **진짜 이메일 주소로 로그인한다** (SPEC 4.2, 12장 9).                     │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * 지어낸 주소로 계정을 만들면 지금은 같아 보여도 나중에 비밀번호 재설정 메일을
 * 보낼 수 없다. 진짜 주소를 받아두면 그 길이 열린 채로 남고 오늘 드는 비용은 없다.
 *
 * **확인 메일은 쓰지 않는다.** 켜면 초대 링크를 받은 사람이 가입 도중 메일함까지
 * 다녀와야 한다. 파티원 넷이 쓰는 도구에서 남의 주소로 가입하는 위협은 사실상
 * 없다. 끄는 것은 Supabase 대시보드 설정이며 코드가 강제하지 않는다.
 */

/**
 * 실패를 사용자에게 보여줄 말로 옮긴다.
 *
 * **아이디가 있는지 없는지 가르지 않는다.** "그런 계정 없음"과 "비밀번호 틀림"을
 * 나누어 말하면 어떤 주소가 가입돼 있는지 새어 나간다.
 */
function toMessage(raw: unknown): string {
  const message = raw instanceof Error ? raw.message : String(raw ?? '')

  // 신호가 없는 것과 쫓겨난 것은 다르다. 사용자가 할 일이 다르므로 갈라 말한다.
  if (/fetch|network|Failed to fetch/i.test(message)) {
    return '서버에 닿지 못했다. 연결을 확인하라.'
  }
  if (/Email not confirmed/i.test(message)) {
    return '메일 확인이 필요한 계정이다. 관리자에게 알려라.'
  }
  if (/rate limit|too many/i.test(message)) {
    return '너무 자주 시도했다. 잠시 뒤에 다시 하라.'
  }
  return '이메일 또는 비밀번호가 올바르지 않습니다.'
}

/**
 * Supabase 세션을 우리 세션으로 옮긴다.
 *
 * **만료는 우리 것을 쓴다.** Supabase의 액세스 토큰은 한 시간짜리이고 스스로
 * 갱신되지만, 우리 게이트가 보는 것은 "이 기기에 유효한 세션이 있는가"다
 * (SPEC 6.1). 토큰 수명을 그대로 옮기면 한 시간마다 로그인 화면으로 쫓겨난다 —
 * 신호 없는 자리에서는 갱신도 못 하므로 판이 통째로 멈춘다.
 */
function toSession(userId: string, email: string, now: number): Session {
  return {
    userId,
    // 표시 이름은 아직 없다. `profiles`가 생기면 거기서 온다 — 그전까지는
    // 이메일의 앞부분을 쓴다. **주소 전체를 화면에 내보내지 않는다**(SPEC 4.2).
    displayName: email.split('@')[0] || email,
    expiresAt: expiryFrom(now),
  }
}

export const supabaseAdapter: AuthAdapter = {
  async signIn(id, password, now) {
    if (!isSupabaseConfigured()) {
      throw new AuthError('서버 설정이 없다. 이 빌드로는 로그인할 수 없다.')
    }

    const email = id.trim()
    if (email === '' || password === '') {
      throw new AuthError('이메일 또는 비밀번호가 올바르지 않습니다.')
    }

    let data
    try {
      const result = await supabase().auth.signInWithPassword({ email, password })
      if (result.error) throw result.error
      data = result.data
    } catch (cause) {
      throw new AuthError(toMessage(cause))
    }

    const user = data.user
    if (!user) throw new AuthError('이메일 또는 비밀번호가 올바르지 않습니다.')
    return toSession(user.id, user.email ?? email, now)
  },

  async signOut() {
    if (!isSupabaseConfigured()) return
    try {
      /**
       * 이 기기에서만 나간다.
       *
       * 기본값(`global`)은 그 계정의 **모든 기기**를 로그아웃시킨다. 폰에서 나갔다고
       * 상 위의 태블릿까지 튕기면 판이 멈춘다.
       */
      await supabase().auth.signOut({ scope: 'local' })
    } catch (cause) {
      // 나가는 것은 실패해도 막지 않는다. 우리 세션은 부르는 쪽이 이미 지운다.
      console.error('[auth] signOut', cause)
    }
  },
}
