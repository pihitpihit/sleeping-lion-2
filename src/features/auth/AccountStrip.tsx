import { useApprovalStore } from './approval'
import { useAuthStore } from './authStore'
import { AUTH_MODE, isTrial, requiresLogin } from './mode'
import './AccountStrip.css'

/**
 * 누구로 들어와 있는지와 나가는 문.
 *
 * 웰컴 화면(허브)에 둔다. 행낭의 도구 띠에 묻어두면 판 도중에 잘못 눌리기
 * 쉽고, 나가는 일은 드물다.
 *
 * **나가기는 세션만 지운다.** 로컬 기록은 그대로 둔다 — 아직 서버에 올라가지
 * 않은 것이 있을 수 있고, 지우는 것은 따로 눌러야 하는 일이다.
 *
 * 관리자에게는 **문지기로 가는 문**이 하나 더 열린다. 주소(`#/gate`)를 외워
 * 치게 두면 새 요청이 온 것을 알 길이 없다 — 기다리는 사람이 있으면 수를 함께
 * 띄운다.
 */
export function AccountStrip() {
  const session = useAuthStore((s) => s.session)
  const signOut = useAuthStore((s) => s.signOut)
  const isAdmin = useApprovalStore((s) => s.isAdmin)
  const pendingCount = useApprovalStore((s) => s.pendingCount)

  // `demo` 배포에는 계정이라는 것이 없다.
  if (!requiresLogin(AUTH_MODE) || session === null) return null

  return (
    <div className="account">
      {isTrial(AUTH_MODE) && <span className="account__trial">시험판</span>}
      <span className="account__who">
        <strong>{session.displayName}</strong>으로 머무는 중
      </span>
      {isAdmin && (
        <a className="account__gate" href="#/gate">
          문지기
          {pendingCount > 0 && (
            <span className="account__badge sl-numeral" aria-hidden="true">
              {pendingCount}
            </span>
          )}
          {pendingCount > 0 && (
            <span className="account__badge-speech">{`, 기다리는 사람 ${pendingCount}명`}</span>
          )}
        </a>
      )}
      <button
        type="button"
        className="account__out"
        onClick={() => {
          signOut()
          window.location.hash = '#/login'
        }}
      >
        나가기
      </button>
    </div>
  )
}
