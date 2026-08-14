import { useId, useState } from 'react'
import { adapter } from './authStore'
import { AuthError } from './adapter'

/**
 * 비밀번호 바꾸기.
 *
 * **승인 전에도 된다.** 잠긴 계정도 제 열쇠는 갈 수 있어야 한다 — 남의 것을
 * 건드리는 일이 아니라 자기 것을 지키는 일이다.
 *
 * 지금 비밀번호를 다시 묻지 않는다. 이미 로그인한 세션으로 바꾸는 것이라
 * Supabase가 그것을 요구하지 않으며, 한 번 더 묻는다고 더 안전해지지도 않는다 —
 * 세션을 쥔 사람은 이미 들어와 있다.
 */
export function PasswordChange() {
  const fieldId = useId()
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await adapter.changePassword(value)
      setValue('')
      setDone(true)
      setOpen(false)
      setTimeout(() => setDone(false), 4000)
    } catch (cause) {
      setError(cause instanceof AuthError ? cause.message : '바꾸지 못했습니다.')
    } finally {
      setBusy(false)
    }
  }

  if (!open) {
    return (
      <p className="pwc">
        <button type="button" className="pwc__open" onClick={() => setOpen(true)}>
          비밀번호 바꾸기
        </button>
        {done && (
          <span className="pwc__done" role="status">
            바꾸었습니다.
          </span>
        )}
      </p>
    )
  }

  return (
    <form className="pwc pwc--open" onSubmit={submit}>
      <label className="pwc__label" htmlFor={fieldId}>
        새 비밀번호
      </label>
      <input
        id={fieldId}
        className="pwc__input"
        type="password"
        value={value}
        autoComplete="new-password"
        minLength={8}
        required
        onChange={(e) => {
          setValue(e.target.value)
          if (error) setError(null)
        }}
      />
      <p className="pwc__hint">여덟 자 이상.</p>

      {error !== null && (
        <p className="pwc__error" role="alert">
          {error}
        </p>
      )}

      <div className="pwc__actions">
        <button type="submit" className="pwc__save" disabled={busy || value.length < 8}>
          바꾸기
        </button>
        <button
          type="button"
          className="pwc__cancel"
          onClick={() => {
            setOpen(false)
            setValue('')
            setError(null)
          }}
        >
          취소
        </button>
      </div>
    </form>
  )
}
