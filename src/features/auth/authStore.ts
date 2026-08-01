import { create } from 'zustand'
import { AUTH_MODE } from './mode'
import { AuthError, notReadyAdapter, type AuthAdapter } from './adapter'
import { mockAdapter } from './mockAdapter'
import { clearSession, loadSession, saveSession, type Session } from './session'

/**
 * 로그인 상태.
 *
 * **축 ②의 스토어와 섞지 않는다.** 저장 위치도 성격도 다르다.
 *
 * 만료 판정을 렌더 안에서 하지 않는다 — 렌더 도중 `Date.now()`를 부를 수 없기
 * 때문이다(react-hooks/purity). 대신 **띄울 때 한 번** 걸러내고, 앱이 열려 있는
 * 동안은 타이머로 그때가 오면 내보낸다. 그래서 화면은 `session !== null`만 보면
 * 된다.
 */

const adapter: AuthAdapter = AUTH_MODE === 'mock' ? mockAdapter : notReadyAdapter

interface AuthState {
  session: Session | null
  signingIn: boolean
  error: string | null

  signIn(id: string, password: string): Promise<boolean>
  signOut(): void
  /** 만료가 지났으면 내보낸다. 타이머가 부른다. */
  pruneExpired(now: number): void
  clearError(): void
}

export const useAuthStore = create<AuthState>((set, get) => ({
  // 띄울 때 한 번 읽는다. 만료된 것은 여기서 걸러진다.
  session: loadSession(Date.now()),
  signingIn: false,
  error: null,

  async signIn(id, password) {
    if (get().signingIn) return false
    set({ signingIn: true, error: null })

    try {
      const session = await adapter.signIn(id, password, Date.now())
      saveSession(session)
      set({ session, signingIn: false, error: null })
      return true
    } catch (cause) {
      // 사용자에게 보여줄 수 있는 실패와 그 밖의 사고를 가른다.
      const message =
        cause instanceof AuthError
          ? cause.message
          : navigator.onLine === false
            ? '네트워크에 연결되어 있지 않습니다. 첫 로그인은 연결이 필요합니다.'
            : '로그인하지 못했습니다. 잠시 뒤 다시 시도해 주십시오.'
      set({ signingIn: false, error: message })
      return false
    }
  },

  signOut() {
    // 세션만 지운다. **로컬 기록은 건드리지 않는다** — 아직 서버에 올라가지
    // 않은 것이 있을 수 있고, 지우는 것은 따로 눌러야 하는 일이다.
    void adapter.signOut()
    clearSession()
    set({ session: null, error: null })
  },

  pruneExpired(now) {
    const { session } = get()
    if (session !== null && session.expiresAt <= now) {
      clearSession()
      set({ session: null })
    }
  },

  clearError() {
    set({ error: null })
  },
}))
