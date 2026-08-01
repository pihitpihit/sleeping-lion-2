import { useEffect, useState } from 'react'
import { AUTH_MODE } from '../auth/mode'
import { notReadyPartyAdapter, type PartyAdapter } from './adapter'
import { mockPartyAdapter } from './mockNet'

/**
 * 이 빌드가 쓰는 백엔드.
 *
 * 고르는 곳은 여기 한 군데다. 화면은 어느 쪽인지 몰라야 하고, N2에서는 이 줄만
 * 바뀐다.
 */
export const partyAdapter: PartyAdapter =
  AUTH_MODE === 'mock' ? mockPartyAdapter : notReadyPartyAdapter

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
