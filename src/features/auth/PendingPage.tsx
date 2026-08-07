import { useEffect, useState } from 'react'
import { useApprovalStore } from './approval'
import { useAuthStore } from './authStore'
import { PasswordChange } from './PasswordChange'
import './PendingPage.css'

/** 다시 물어보는 간격. 승인을 기다리는 동안만 돈다. */
const POLL_MS = 15_000

/**
 * 승인을 기다리는 화면.
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ **로그아웃과 비밀번호 바꾸기 말고는 아무것도 못 한다.**                   │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * 비밀번호를 여는 이유는 **잠긴 계정도 제 열쇠는 갈 수 있어야 하기** 때문이다.
 * 남의 것을 건드리는 일이 아니라 자기 것을 지키는 일이라 막을 이유가 없다.
 *
 * **스스로 다시 물어본다.** 승인은 남이 하는 일이라 언제 될지 알 수 없다 —
 * 새로고침하라고 시키면 기다리는 사람이 계속 눌러야 한다. 15초마다 조용히 묻고
 * 열리면 스스로 넘어간다.
 *
 * 화면이 막는 것은 UX일 뿐이다. 진짜로 막는 것은 서버다 — 승인 전에는 파티를
 * 세울 수도 초대를 받을 수도 없다(`0004_approval.sql`).
 */
export function PendingPage() {
  const session = useAuthStore((s) => s.session)
  const signOut = useAuthStore((s) => s.signOut)
  const phase = useApprovalStore((s) => s.phase)
  const check = useApprovalStore((s) => s.check)

  const [asked, setAsked] = useState(0)

  useEffect(() => {
    const id = setInterval(() => {
      void check()
      setAsked((n) => n + 1)
    }, POLL_MS)
    return () => clearInterval(id)
  }, [check])

  return (
    <main className="pending">
      <h1 className="pending__title">문 앞에서</h1>

      <p className="pending__body">
        <strong>{session?.displayName}</strong>님, 자리는 잡혔습니다. 다만 주인장이 아직 문을 열지
        않았습니다.
      </p>

      <p className="pending__hint">
        승인되면 이 화면이 스스로 넘어갑니다. 기다리는 동안 창을 닫으셔도 됩니다 — 다시 오시면 그때
        상태를 봅니다.
      </p>

      {phase === 'unreachable' && (
        <p className="pending__warn" role="status">
          서버에 닿지 못했습니다. 연결을 확인해 주십시오.
        </p>
      )}

      <div className="pending__actions">
        <button
          type="button"
          className="pending__recheck"
          onClick={() => {
            void check()
            setAsked((n) => n + 1)
          }}
        >
          지금 확인
        </button>
        <button type="button" className="pending__out" onClick={signOut}>
          나가기
        </button>
      </div>

      {/* 몇 번을 물었는지 보이면 무언가 돌고 있다는 것이 전해진다. */}
      {asked > 0 && (
        <p className="pending__ticks" aria-hidden="true">
          {asked}번 확인했습니다
        </p>
      )}

      <PasswordChange />
    </main>
  )
}
