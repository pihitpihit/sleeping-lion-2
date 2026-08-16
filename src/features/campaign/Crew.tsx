import { useEffect, useState } from 'react'
import { partyAdapter, useNetRevision } from '../net'
import { NetError } from '../net/adapter'
import type { Identity, Member } from '../net/types'

interface Props {
  partyId: string
  partyName: string
  me: Identity
  onLeave: () => void
}

/**
 * 함께하는 이들 — 기록지에 딸린 파티원과 초대장.
 *
 * '동행'이라는 별도 화면에 있던 것을 기록지 안으로 옮겼다. **파티가 둘로 보이던
 * 것을 하나로 합치면서** 이것도 따라온 것이다 — 실물에서 파티 시트 옆에 누가
 * 있는지 적어두는 것과 같다.
 *
 * **시각을 렌더 안에서 읽지 않는다.** 불러올 때 함께 찍어 두고 그것으로 남은
 * 시간을 셈한다(react-hooks/purity). 만료가 이틀이라 시간 단위로 보이면 그만이다.
 */
export function Crew({ partyId, partyName, me, onLeave }: Props) {
  const revision = useNetRevision()
  const [members, setMembers] = useState<Member[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    void (async () => {
      try {
        const m = await partyAdapter.listMembers(partyId)
        if (!alive) return
        setMembers(m)
        setError(null)
      } catch (cause) {
        // 파티원을 못 읽어도 기록지는 보여야 한다. 여기만 조용히 접는다.
        if (alive) setError(cause instanceof NetError ? cause.message : null)
      }
    })()
    return () => {
      alive = false
    }
  }, [partyId, revision])

  return (
    <section className="sheet__block crew">
      <h2 className="sheet__label">함께하는 이들</h2>

      <ul className="crew__members">
        {members.map((m) => (
          <li key={m.userId}>
            {m.displayName || '이름 없음'}
            {m.userId === me.userId && <span className="crew__me"> (나)</span>}
          </li>
        ))}
        {members.length === 0 && <li className="crew__alone">아직 혼자다.</li>}
      </ul>

      {error !== null && (
        <p className="crew__error" role="alert">
          {error}
        </p>
      )}

      {/*
        **초대 링크를 걷었다**(형님이 정했다, `0036`). 승인된 사람만 들어오는
        앱이라 그 안에서 또 문지기를 두면 링크를 주고받는 품만 는다 — 이제
        누구든 일지에서 파티를 골라 제 발로 든다.
      */}
      <p className="crew__hint">
        승인된 사람이면 누구나 이 파티에 들 수 있다 — <a href="#/journal">일지</a>에서 고른다.
      </p>

      <div className="crew__actions">
        <button
          type="button"
          className="crew__leave"
          onClick={() => {
            if (!window.confirm(`'${partyName}'에서 나가시겠습니까?`)) return
            onLeave()
          }}
        >
          동행을 그만둔다
        </button>
      </div>
    </section>
  )
}
