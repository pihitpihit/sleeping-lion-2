import { useEffect, useState, type CSSProperties } from 'react'
import { useAuthStore } from '../auth/authStore'
import type { Identity } from '../net/types'
import { useJournalStore } from './campaignStore'
import { NAME_MAX, checkName, nameProblemText, tidyName } from './nameRules'
import { useScrolled } from './useScrolled'
import './JournalPage.css'
import './NewCharacterPage.css'

/**
 * 파티 생성 — `#/journal/new`.
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ **캐릭터와 같은 자리에서 같은 모양으로 만든다.**                          │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * 일지에 캐릭터는 「생성」 단추가 있고 파티는 입력란이 놓여 있었다 — **같은 일인데
 * 생김새가 달라** 무엇을 눌러야 할지 한 번 생각하게 된다. 형님이 짚었다.
 *
 * 파티는 이름 하나뿐이라 화면이 단출하다. 그래도 **문을 맞추는 편이 낫다**:
 * 목록 화면은 보는 자리이고 만드는 것은 들어가서 하는 일이다.
 *
 * 이름 규칙도 캐릭터와 같은 것을 쓴다(`nameRules.ts`). 파티 이름은 나중에 기록지
 * 에서 고칠 수 있지만 **거르는 규칙까지 둘로 둘 까닭이 없다.**
 */
export function NewPartyPage() {
  const session = useAuthStore((s) => s.session)
  const scrolled = useScrolled()

  const entries = useJournalStore((s) => s.entries)
  const refresh = useJournalStore((s) => s.refresh)
  const addParty = useJournalStore((s) => s.addParty)
  const busy = useJournalStore((s) => s.busy)
  const error = useJournalStore((s) => s.error)

  const [name, setName] = useState('')

  const userId = session?.userId ?? null
  const displayName = session?.displayName ?? ''

  /** 겹치는 이름을 막으려면 내가 든 파티를 알아야 한다. */
  useEffect(() => {
    if (userId === null) return
    void refresh({ userId, displayName })
  }, [userId, displayName, refresh])

  const taken = entries.map((e) => e.campaign?.name || e.party.name)
  const problem = checkName(name, taken)
  /* 아직 아무것도 안 친 것은 잘못이 아니다 — 단추는 그대로 잠긴다. */
  const warn = name === '' ? null : problem

  async function make() {
    if (session === null || problem !== null) return
    const me: Identity = { userId: session.userId, displayName: session.displayName }
    const id = await addParty(tidyName(name), me)
    if (!id) return
    window.location.hash = `#/journal/${id}`
  }

  if (session === null) return null

  return (
    <div className="journal">
      <header className="topbar" style={{ '--tb': scrolled } as CSSProperties}>
        <div className="topbar__inner">
          <a className="journal__back" href="#/journal" aria-label="일지로">
            ←
          </a>
          <span className="topbar__names">
            <h1 className="topbar__name">파티 생성</h1>
            <span className="topbar__sub">함께 놀 사람들의 묶음이다</span>
          </span>
        </div>
      </header>

      <div className="newchar">
        <p className="newparty__hint">
          이름을 짓고 나면 기록지가 함께 만들어진다. <strong>파티원은 초대 링크로 들인다</strong> —
          만든 다음 기록지에서 보낸다.
        </p>

        {/* 이름과 두 단추는 한 덩어리로 따라다닌다 — 캐릭터 생성과 같은 틀이다. */}
        <div className="newchar__foot">
          <div className="newchar__name">
            {/* 칸에 「파티 이름 입력」이라 적혀 있으므로 제목을 또 두지 않는다. */}
            <input
              id="newparty-name"
              className="sheet__input newchar__input"
              aria-label="파티 이름"
              value={name}
              placeholder="파티 이름 입력"
              /* 다듬으면 줄어들 수 있으므로 칸 자체는 조금 넉넉하게 받는다. */
              maxLength={NAME_MAX * 2}
              disabled={busy}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && problem === null) {
                  e.preventDefault()
                  void make()
                }
              }}
            />
            <p className={`newchar__warn${warn === null ? ' newchar__warn--ok' : ''}`} role="alert">
              {warn === null ? ' ' : nameProblemText(warn, '파티')}
            </p>
          </div>

          {error !== null && (
            <p className="journal__error" role="alert">
              {error}
            </p>
          )}

          <div className="sheet__bar">
            <a className="sheet__cancel" href="#/journal">
              취소
            </a>
            <button
              type="button"
              className="sheet__save"
              disabled={busy || problem !== null}
              onClick={() => void make()}
            >
              생성
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
