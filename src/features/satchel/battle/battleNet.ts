import { isSupabaseConfigured, supabase } from '../../auth/supabase'
import { STATE_EVENT } from '../accountChannel'
import { openWire } from '../broadcast'
import { sanitizeRuntime, type RuntimeSnapshot } from '../runtime/snapshot'

/**
 * 전투의 서버 쪽.
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ **두 갈래로 오간다 — 즉시는 Broadcast, 따라잡기는 표.**                   │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * 원소판은 판이 도는 몇 초 단위로 여럿이 만진다. 표에 쓰고 그것이 돌아오기를
 * 기다려 그리면 손가락이 미끄러진다(구현 결정 22). 그래서 **탭은 로컬에서 즉시
 * 먹고 Broadcast로 곧장 퍼뜨린다.**
 *
 * 표는 뒤따라간다. **새로 들어오거나 새로고침한 사람이 따라잡는 자리**다 —
 * Broadcast는 지나가는 것이라 그때 아무도 만지지 않으면 빈 화면이 된다.
 *
 * **판이 끝나면 남지 않는다는 선은 그대로다.** 표의 수명이 전투와 같고, 전투를
 * 접으면 행이 지워진다(`0007_battle_state.sql`).
 *
 * 막는 것은 RLS다 — 참여자만 얹는다.
 */

export interface BattleRow {
  id: string
  partyId: string
  openedBy: string
  openedAt: number
}

export interface Participant {
  userId: string
  displayName: string
}

function ready(): boolean {
  return isSupabaseConfigured()
}

/* --------------------------------------------------------------------------
   방 — 열고 들고 나고 접고
   -------------------------------------------------------------------------- */

interface RawBattle {
  id: string
  party_id: string
  opened_by: string
  opened_at: string
}

function toBattle(row: RawBattle): BattleRow {
  return {
    id: row.id,
    partyId: row.party_id,
    openedBy: row.opened_by,
    openedAt: Date.parse(row.opened_at) || 0,
  }
}

const BATTLE_COLUMNS = 'id, party_id, opened_by, opened_at'

/**
 * 이 파티에 열려 있는 판. 없으면 `null`.
 *
 * 여럿이면 가장 최근 것을 준다. **막지는 않는다** — 한 파티가 두 판을 동시에
 * 돌릴 일은 없지만, 실수로 둘이 열렸을 때 앱이 멎는 것보다 최근 것으로 모이는
 * 편이 낫다.
 */
export async function findOpenBattle(partyId: string): Promise<BattleRow | null> {
  if (!ready()) return null
  const { data, error } = await supabase()
    .from('battles')
    .select(BATTLE_COLUMNS)
    .eq('party_id', partyId)
    .order('opened_at', { ascending: false })
    .limit(1)
  if (error || !data || data.length === 0) return null
  return toBattle(data[0] as RawBattle)
}

/**
 * 판을 편다. 연 사람은 곧바로 앉는다 — 열어 놓고 안 앉는 일은 없다.
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ **이미 열린 판이 있으면 새로 만들지 않고 거기 앉는다.**                   │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * 둘이 거의 동시에 '판을 편다'를 누르면 방이 두 개 생기고, 각자 다른 방에 앉아
 * **공유가 도는 것처럼 보이는데 아무것도 안 겹친다.** 화면이 "이미 열린 판이
 * 있다"를 미처 못 읽은 사이에 그렇게 된다.
 *
 * 완전히 막지는 못한다 — 두 삽입이 진짜 같은 순간에 들어오면 둘 다 통과한다.
 * 그 자리는 `findOpenBattle`이 가장 최근 것을 주므로 다음에 여는 사람부터
 * 한쪽으로 모인다. 흔한 쪽(몇 초 차이)을 여기서 막는다.
 */
export async function openBattle(partyId: string, userId: string): Promise<BattleRow> {
  const existing = await findOpenBattle(partyId)
  if (existing) {
    await joinBattle(existing.id, userId)
    return existing
  }

  const { data, error } = await supabase()
    .from('battles')
    .insert({ party_id: partyId, opened_by: userId })
    .select(BATTLE_COLUMNS)
    .single()
  if (error) throw error
  const battle = toBattle(data as RawBattle)
  await joinBattle(battle.id, userId)
  return battle
}

/**
 * 내가 이미 앉아 있는 판. 없으면 `null`.
 *
 * **새로고침하면 화면은 전투를 잊는다.** 스토어가 메모리에만 있기 때문이다.
 * 그런데 서버에는 내가 앉아 있다고 남아 있으므로, 그대로 두면 판에 앉은 채로
 * 조작하는데 아무에게도 안 가는 상태가 된다 — 본인은 공유 중인 줄 안다.
 *
 * 그래서 행낭을 열 때 이것으로 확인하고 자동으로 다시 잇는다.
 */
export async function findMyBattle(userId: string): Promise<BattleRow | null> {
  if (!ready()) return null
  try {
    const { data, error } = await supabase()
      .from('battle_participants')
      .select(
        'battle:battles!battle_participants_battle_id_fkey(id, party_id, opened_by, opened_at)',
      )
      .eq('user_id', userId)
      .limit(1)
    if (error || !data || data.length === 0) return null
    const row = (data as unknown as { battle: RawBattle | null }[])[0]
    return row.battle ? toBattle(row.battle) : null
  } catch {
    return null
  }
}

/** 앉는다. **참여는 고르는 것이다**(SPEC 6.2) — 남을 끌어들이지 못한다. */
export async function joinBattle(battleId: string, userId: string): Promise<void> {
  const { error } = await supabase()
    .from('battle_participants')
    .upsert({ battle_id: battleId, user_id: userId }, { onConflict: 'battle_id,user_id' })
  if (error) throw error
}

/** 자리에서 일어난다. 판은 남는다 — 나머지가 계속 돈다. */
export async function leaveBattle(battleId: string, userId: string): Promise<void> {
  await supabase()
    .from('battle_participants')
    .delete()
    .eq('battle_id', battleId)
    .eq('user_id', userId)
}

/**
 * 판을 접는다 — **행을 지운다.**
 *
 * `closed_at`을 찍고 남겨 두면 "어디에도 남지 않는다"가 아니게 된다. 참여자를
 * 함께 지우는 것은 외래키의 `on delete cascade`가 한다.
 */
export async function closeBattle(battleId: string): Promise<void> {
  const { error } = await supabase().from('battles').delete().eq('id', battleId)
  if (error) throw error
}

/** 이 판에 앉은 사람들. */
export async function listParticipants(battleId: string): Promise<Participant[]> {
  if (!ready()) return []
  const { data, error } = await supabase()
    .from('battle_participants')
    .select('user_id, profile:profiles!battle_participants_user_id_fkey(display_name)')
    .eq('battle_id', battleId)
  if (error || !data) return []
  return (data as unknown as { user_id: string; profile: { display_name: string | null } | null }[])
    .map((row) => ({ userId: row.user_id, displayName: row.profile?.display_name ?? '' }))
    .sort((a, b) => a.displayName.localeCompare(b.displayName))
}

/**
 * 잊힌 판을 거둔다.
 *
 * 사람은 판을 접지 않고 그냥 앱을 닫는다. 하루 지난 것은 서버가 지운다 —
 * 한 판이 하루를 넘길 일은 없다. 실패해도 삼킨다: 청소가 안 됐다고 판을 못
 * 펴면 곤란하다.
 */
export async function sweepStaleBattles(): Promise<void> {
  if (!ready()) return
  try {
    await supabase().rpc('sweep_stale_battles')
  } catch {
    // 조용히 넘긴다.
  }
}

/* --------------------------------------------------------------------------
   판 위의 값 — 표
   -------------------------------------------------------------------------- */

/** 표에 남아 있는 판. 없거나 못 읽으면 `null`. */
export async function fetchBattleState(battleId: string): Promise<RuntimeSnapshot | null> {
  if (!ready()) return null
  try {
    const { data, error } = await supabase()
      .from('battles')
      .select('state')
      .eq('id', battleId)
      .maybeSingle()
    if (error || !data) return null
    return sanitizeRuntime((data as { state: unknown }).state)
  } catch {
    return null
  }
}

/**
 * 표에 얹는다.
 *
 * **실패해도 아무 말 하지 않는다.** Broadcast로 이미 상대에게 갔고, 다음에 누가
 * 만질 때 뭉치째 다시 올라간다. 신호가 흔들린다고 판이 멎으면 안 된다.
 */
export async function pushBattleState(
  battleId: string,
  snapshot: RuntimeSnapshot,
): Promise<boolean> {
  if (!ready()) return false
  try {
    const { error } = await supabase()
      .from('battles')
      .update({ state: snapshot, state_at: new Date().toISOString() })
      .eq('id', battleId)
    return !error
  } catch {
    return false
  }
}

/* --------------------------------------------------------------------------
   판 위의 값 — Broadcast
   --------------------------------------------------------------------------
   통로 자체는 `satchel/broadcast.ts`가 연다. 행낭 구성도 같은 방식을 쓰므로
   한 곳에 두었다.
   -------------------------------------------------------------------------- */

/**
 * 전투 통로.
 *
 * **계정 통로와 달리 판마다 따로 연다.** 자격을 정하는 근거가 다르기 때문이다 —
 * 계정 통로는 "내 것"이고 이쪽은 "그 판에 앉았는가"다. 전투에서 일어나면 닫는다.
 */
export function openBattleWire(battleId: string, onState: (s: RuntimeSnapshot) => void) {
  const wire = openWire(`battle:${battleId}`, [STATE_EVENT])
  wire.on(STATE_EVENT, (raw) => onState(sanitizeRuntime(raw)))
  return wire
}
