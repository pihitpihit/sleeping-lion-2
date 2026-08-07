import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useAuthStore } from './authStore'
import { takePendingRoute } from './pendingRoute'
import { AUTH_MODE, isTrial } from './mode'
import { LOCKED_PREFIX } from './mockAdapter'
import './LoginPage.css'

/**
 * 로그인 화면.
 *
 * 실패 메시지는 **무엇이 틀렸는지 알려주지 않는다.** "그런 아이디가 없다"와
 * "비밀번호가 틀렸다"를 가르면 계정이 있는지 없는지가 새어 나간다. 스토어가
 * 이미 하나의 문구로 합쳐서 준다.
 */
export function LoginPage() {
  const [id, setId] = useState('')
  const [password, setPassword] = useState('')
  const signIn = useAuthStore((s) => s.signIn)
  const signUp = useAuthStore((s) => s.signUp)
  /**
   * 로그인과 가입을 한 화면에서 가른다.
   *
   * **가입은 열려 있다.** 벽은 승인이지 가입이 아니다(0004) — 들어와도 주인장이
   * 문을 열기 전에는 아무것도 못 한다. `mock`에는 승인이 없으므로 가입 칸을
   * 내지 않는다.
   */
  const [mode, setMode] = useState<'in' | 'up'>('in')
  const signingIn = useAuthStore((s) => s.signingIn)
  const error = useAuthStore((s) => s.error)
  const clearError = useAuthStore((s) => s.clearError)
  const idRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    idRef.current?.focus()
  }, [])

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    const ok = mode === 'up' ? await signUp(id, password) : await signIn(id, password)
    if (!ok) return
    // 가려던 곳이 있으면 그리로. 없으면 첫 화면.
    window.location.hash = '#' + (takePendingRoute() ?? '/')
  }

  return (
    <main className="login">
      <div className="login__panel">
        <h1 className="login__mark">Sleeping Lion II</h1>
        <p className="login__sign">잠자는 사자 2호점</p>

        {isTrial(AUTH_MODE) && (
          <p className="login__trial">
            <strong>시험판입니다.</strong> 계정과 기록은 이 브라우저에만 있고 서버로 가지 않습니다.
            아무 이름과 <strong>네 자 이상</strong>의 비밀번호로 들어옵니다. 실패 화면을 보시려면
            이름을 <code>{LOCKED_PREFIX}</code>으로 시작하십시오.
          </p>
        )}

        {!isTrial(AUTH_MODE) && (
          <div className="login__tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'in'}
              className={mode === 'in' ? 'login__tab login__tab--on' : 'login__tab'}
              onClick={() => {
                setMode('in')
                clearError()
              }}
            >
              들어가기
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'up'}
              className={mode === 'up' ? 'login__tab login__tab--on' : 'login__tab'}
              onClick={() => {
                setMode('up')
                clearError()
              }}
            >
              문 두드리기
            </button>
          </div>
        )}

        {mode === 'up' && (
          <p className="login__note">
            가입하면 자리는 잡힙니다. 다만 <strong>주인장이 문을 열어야</strong> 쓸 수 있습니다.
          </p>
        )}

        <form className="login__form" onSubmit={onSubmit}>
          {/*
            `live`는 **진짜 이메일 주소**로 로그인한다(SPEC 4.2). 지어낸 주소로
            계정을 만들면 나중에 비밀번호 재설정 메일을 보낼 길이 막힌다.
            `mock`은 여전히 아무 이름이나 받으므로 라벨을 갈라 적는다.
          */}
          <label className="login__field">
            <span>{isTrial(AUTH_MODE) ? '이름' : '이메일'}</span>
            <input
              ref={idRef}
              type={isTrial(AUTH_MODE) ? 'text' : 'email'}
              inputMode={isTrial(AUTH_MODE) ? undefined : 'email'}
              value={id}
              onChange={(e) => {
                setId(e.target.value)
                if (error) clearError()
              }}
              autoComplete={isTrial(AUTH_MODE) ? 'username' : 'email'}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              required
            />
          </label>

          <label className="login__field">
            <span>비밀번호</span>
            <input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                if (error) clearError()
              }}
              autoComplete={mode === 'up' ? 'new-password' : 'current-password'}
              minLength={mode === 'up' ? 8 : undefined}
              required
            />
          </label>

          {/* 실패는 읽어주기도 해야 한다. 색만으로 알리면 화면을 못 보는 사람에게 안 닿는다. */}
          <p className="login__error" role="alert">
            {error ?? ''}
          </p>

          <button className="login__submit" type="submit" disabled={signingIn}>
            {signingIn ? '여는 중…' : '문을 연다'}
          </button>
        </form>

        {/* "연결이 없어도 열린다"고 적었다가 뺐다. 세션은 기기에 남으므로 인증에는
            네트워크가 필요 없지만, 화면 자체를 받아오려면 아직 연결이 있어야 한다.
            PWA 캐싱(Phase 3)이 붙기 전까지는 지킬 수 없는 약속이다. */}
        <p className="login__note">한 번 들어오면 이 기기에서는 다시 묻지 않는다.</p>

        <a className="login__notice-link" href="#/notice">
          출처와 라이선스
        </a>
      </div>
    </main>
  )
}
