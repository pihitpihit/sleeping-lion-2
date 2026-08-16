import { useEffect, useState } from 'react'
import { ConfirmDialog } from '../satchel/board/ConfirmDialog'
import { partyAdapter, useNetRevision } from '../net'
import { NetError } from '../net/adapter'
import type { Identity, Member } from '../net/types'

interface Props {
  partyId: string
  partyName: string
  /** 이 파티를 세운 사람. **해산은 그 사람만 한다**(`0039`). */
  createdBy: string
  me: Identity
  onLeave: () => void
  /** 해산이 끝나면 알린다 — 이 기록지는 이제 없다. */
  onDisbanded: () => void
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
export function Crew({ partyId, partyName, createdBy, me, onLeave, onDisbanded }: Props) {
  /** 무엇을 물으려고 팝업을 띄웠는가. */
  const [asking, setAsking] = useState<'leave' | 'disband' | null>(null)

  function disband() {
    partyAdapter
      .disbandParty(partyId)
      .then(() => onDisbanded())
      .catch((cause: unknown) => {
        setError(cause instanceof NetError ? cause.message : '해산하지 못했다.')
      })
  }
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
        {/*
          **되돌릴 수 없는 일은 `window.confirm`으로 묻지 않는다**(구현 결정 36).
          나가는 것은 다시 들면 그만이라 뜸이 짧고, 해산은 기록지가 함께 가므로
          기본 5초를 그대로 쓴다.
        */}
        <button type="button" className="crew__leave" onClick={() => setAsking('leave')}>
          동행을 그만둔다
        </button>
        {/*
          ┌──────────────────────────────────────────────────────────────────┐
          │ **해산은 만든 사람만 한다**(형님이 정했다, `0039`).               │
          └──────────────────────────────────────────────────────────────────┘

          나가는 것은 제 줄 하나라 누구나 언제든 하지만, 해산은 **남는 모두의
          것을 없앤다.** 남이면 단추를 안 내되 **까닭은 적는다** — 그냥 없으면
          어디에 있는지 찾아다닌다(구현 결정 172).
        */}
        {createdBy === me.userId ? (
          <button type="button" className="crew__disband" onClick={() => setAsking('disband')}>
            파티 해산
          </button>
        ) : (
          <p className="crew__note">해산은 이 파티를 세운 사람만 한다.</p>
        )}
      </div>

      {asking === 'leave' && (
        <ConfirmDialog
          title={`'${partyName}'에서 나갑니까?`}
          description="파티는 남는다 — 다시 들 수 있다."
          confirmLabel="나간다"
          delayMs={1500}
          onConfirm={() => {
            setAsking(null)
            onLeave()
          }}
          onCancel={() => setAsking(null)}
        />
      )}

      {asking === 'disband' && (
        <ConfirmDialog
          title={`'${partyName}'을 해산합니까?`}
          /*
            **캐릭터는 남는다**(`0037`) — 파티에 들기 전 상태로 돌아갈 뿐이다.
            사라지는 것은 기록지(평판·업적·개봉 조건·떡갈나무)와 파티 그 자체다.
          */
          description="기록지가 함께 사라진다 — 평판·업적·개봉 조건·떡갈나무. 캐릭터는 남는다. 남의 캐릭터가 들어 있으면 서버가 거절한다."
          /*
            **뜸만으로는 「잘못 골랐다」를 못 막는다.** 5초는 관성 탭을 막는
            값이라(구현 결정 36) 손가락이 미끄러지는 것은 막지만, 지우려던 것이
            이 파티가 맞는지는 **이름을 손으로 옮겨 적는 동안** 확인된다.
          */
          challenge={{
            label: `해산하려면 파티 이름 '${partyName}'을 그대로 적는다.`,
            answer: partyName,
          }}
          confirmLabel="해산한다"
          onConfirm={() => {
            setAsking(null)
            disband()
          }}
          onCancel={() => setAsking(null)}
        />
      )}
    </section>
  )
}
