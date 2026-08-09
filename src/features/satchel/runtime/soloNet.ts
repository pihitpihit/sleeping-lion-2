import { isSupabaseConfigured, supabase } from '../../auth/supabase'
import { accountWire, STATE_EVENT } from '../accountChannel'
import type { RoomBackend } from './room'
import { isEmptyRuntime, sanitizeRuntime, type RuntimeSnapshot } from './snapshot'

/**
 * 혼자 쓸 때의 방 — 내 계정.
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ **같은 계정이면 기기가 달라도 같은 판을 본다.**                           │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * 전투는 **다른 사람과** 나누라고 있는 것이다. 같은 사람의 기기 둘 사이에는
 * 협상할 것이 없으므로 전투를 열 필요가 없어야 한다.
 *
 * **제 것만 읽고 쓴다**(`0009_solo_runtime.sql`). 남의 판을 들여다볼 일이 없다.
 *
 * 통로 이름에 계정 id가 들어가지만 **거기 오가는 것은 나 자신뿐**이다. 남이
 * 그 이름을 알아도 표에는 RLS가 걸려 있고, 통로에 실리는 것은 수치와 식별자뿐이라
 * 3장의 서버 경계를 넘지 않는다.
 *
 * **판이 끝나면 남지 않는다는 선은 하루 규칙으로 지킨다.** 서버에는 "탭을 닫았다"는
 * 신호가 오지 않으므로 탭 단위로 지울 수 없다. 전투 방과 같은 규칙이다 —
 * 한 판이 하루를 넘길 일은 없다.
 */

async function fetchSolo(userId: string): Promise<RuntimeSnapshot | null> {
  if (!isSupabaseConfigured()) return null
  try {
    const { data, error } = await supabase()
      .from('satchel_runtime')
      .select('state')
      .eq('user_id', userId)
      .maybeSingle()
    if (error || !data) return null
    return sanitizeRuntime((data as { state: unknown }).state)
  } catch {
    return null
  }
}

async function pushSolo(userId: string, snapshot: RuntimeSnapshot): Promise<boolean> {
  if (!isSupabaseConfigured()) return false
  // 빈 판은 올리지 않는다. 새 기기에서 처음 열면 빈 것이 만들어지는데, 그것이
  // 올라가면 다른 기기에서 돌리던 게임이 지워진다.
  if (isEmptyRuntime(snapshot)) return false
  try {
    // `updated_at`은 보내지 않는다. 하루 규칙의 기준이므로 서버가 찍는다.
    const { error } = await supabase()
      .from('satchel_runtime')
      .upsert({ user_id: userId, state: snapshot }, { onConflict: 'user_id' })
    return !error
  } catch {
    return false
  }
}

/**
 * 내 계정 방.
 *
 * **통로는 계정 통로에 얹혀 간다.** 배치와 같은 길을 쓰므로 새로 열지 않고,
 * 방에서 나올 때도 닫지 않는다 — 닫으면 배치가 오갈 길까지 끊긴다. 손잡이만
 * 빈 것으로 갈아 끼운다.
 */
export function soloRoom(userId: string): RoomBackend {
  return {
    key: `solo:${userId}`,
    fetch: () => fetchSolo(userId),
    push: (snapshot) => pushSolo(userId, snapshot),
    connect: (onChanged) => {
      const wire = accountWire(userId)
      wire.on(STATE_EVENT, onChanged)
      return {
        ping: () => wire.ping(STATE_EVENT),
        close: () => wire.on(STATE_EVENT, () => {}),
      }
    },
  }
}
