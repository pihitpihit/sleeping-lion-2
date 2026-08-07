import { useEffect, useState } from 'react'
import { AUTH_MODE } from '../auth/mode'
import { notReadyPartyAdapter, type PartyAdapter } from './adapter'
import { mockPartyAdapter } from './mockNet'
import { supabasePartyAdapter } from './supabaseNet'

/**
 * 이 빌드가 쓰는 백엔드.
 *
 * 고르는 곳은 여기 한 군데다. 화면은 어느 쪽인지 몰라야 한다 — N2에서 바뀐 것도
 * 이 줄뿐이다.
 *
 * `demo`는 로그인이 없으므로 어느 쪽도 부르지 않지만, 만에 하나 불렸을 때 조용히
 * 성공하지 않도록 `notReady`로 떨어뜨린다 — **잠기는 쪽으로 틀리는 편이 낫다**.
 */
export const partyAdapter: PartyAdapter =
  AUTH_MODE === 'mock'
    ? mockPartyAdapter
    : AUTH_MODE === 'live'
      ? supabasePartyAdapter
      : notReadyPartyAdapter

/**
 * 백엔드가 바뀔 때마다 오르는 수.
 *
 * 무엇이 바뀌었는지는 알려주지 않는다 — 다시 읽으면 그만이고, 데이터가 작다.
 * 화면은 이 수를 의존성에 넣어 두면 남이 파티에 들어오고 나가는 것이 보인다.
 */
export function useNetRevision(): number {
  const [revision, setRevision] = useState(0)
  useEffect(() => partyAdapter.subscribe(() => setRevision((n) => n + 1)), [])
  return revision
}
