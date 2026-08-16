import { isSupabaseConfigured, supabase } from '../../auth/supabase'
import { clampLevel } from '../../rules/scenarioLevel'
import { EchoGuard, watchRow } from '../changes'
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
  /** 이 모험의 시나리오 레벨(`0032`). 참가자들의 레벨에서 셈해 난이도로 보정한 값이다. */
  level: number
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
  level: number | null
}

function toBattle(row: RawBattle): BattleRow {
  return {
    id: row.id,
    partyId: row.party_id,
    openedBy: row.opened_by,
    openedAt: Date.parse(row.opened_at) || 0,
    level: typeof row.level === 'number' ? row.level : 1,
  }
}

const BATTLE_COLUMNS = 'id, party_id, opened_by, opened_at, level'

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

/**
 * 표에 남아 있는 판. 없거나 못 읽으면 `null`.
 *
 * **`battles`가 아니라 `battle_state`다.** `battles`를 읽는 정책은 파티원 전체라
 * 거기 값을 두면 앉지도 않은 파티원에게 판이 통째로 간다(`0010`).
 */
export async function fetchBattleState(battleId: string): Promise<RuntimeSnapshot | null> {
  if (!ready()) return null
  try {
    const { data, error } = await supabase()
      .from('battle_state')
      .select('state')
      .eq('battle_id', battleId)
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
    // 올리기 **전에** 적어 둔다. 서버가 밀어주는 것이 응답보다 먼저 올 수 있다.
    battleEcho.remember(snapshot.at)
    const { error } = await supabase()
      .from('battle_state')
      .upsert({ battle_id: battleId, state: snapshot }, { onConflict: 'battle_id' })
    return !error
  } catch {
    return false
  }
}

/** 내가 올린 것이 되돌아오는 것을 가려낸다. */
const battleEcho = new EchoGuard()

/* --------------------------------------------------------------------------
   판 위의 값 — 서버가 밀어준다
   -------------------------------------------------------------------------- */

/**
 * 이 판이 바뀔 때마다 받는다.
 *
 * **자격은 `battle_state`의 정책이 본다** — 앉은 사람만이다. 파티원이라도 앉지
 * 않았으면 밀려오지 않는다.
 */
export function watchBattleState(battleId: string, onState: (s: RuntimeSnapshot) => void) {
  return watchRow(
    `battle-state:${battleId}`,
    'battle_state',
    `battle_id=eq.${battleId}`,
    (row) => sanitizeRuntime(row.state),
    (snapshot) => {
      // 내가 올린 그것이 돌아온 것이면 버린다.
      if (battleEcho.isEcho(snapshot.at)) return
      onState(snapshot)
    },
  )
}

/**
 * 판의 난이도를 고친다.
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ **난이도는 상 위의 사실이지 사람의 것이 아니다.**                         │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * 원소·라운드와 같은 결이다(구현 결정 23·32) — 한 사람이 3레벨을 보는데 옆 사람이
 * 5레벨을 보면 어느 쪽이 판의 사실인지 알 수 없다. **앉은 사람이면 누구나** 고친다
 * (`battles`의 UPDATE 정책이 `is_battle_participant`를 본다).
 */
export async function setBattleLevel(battleId: string, level: number): Promise<void> {
  const { error } = await supabase()
    .from('battles')
    .update({ level: clampLevel(level) })
    .eq('id', battleId)
  if (error) throw error
}

/**
 * 이 판의 줄이 바뀌면 받는다 — 지금은 난이도뿐이다.
 *
 * `battle_state`와 달리 **메아리를 가려내지 않는다.** 난이도는 초 단위로 여럿이
 * 만지는 값이 아니라 한 판에 한두 번 정하는 값이고, 돌아온 것이 내가 쓴 것과
 * 같으면 앉히나 마나다(구현 결정 102가 막으려던 「쓰고 나서 돌아오기까지 사이에
 * 또 만진 것」이 여기서는 일어나지 않는다).
 */
export function watchBattleRow(battleId: string, onLevel: (level: number) => void) {
  return watchRow(
    `battle-row:${battleId}`,
    'battles',
    `id=eq.${battleId}`,
    (row) => (typeof row.level === 'number' ? clampLevel(row.level) : 1),
    onLevel,
  )
}

/**
 * 모험을 편다 — **참가자를 미리 정한다**(`0032`).
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ **아무 판에나 난입할 수 없다.**                                           │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * 지정된 캐릭터의 주인에게만 그 판이 보인다(형님이 정했다). 판을 만들고 참가자
 * 줄을 따로 넣는 동안에는 **방금 만든 판이 제 눈에도 안 보이므로** 서버 함수가
 * 한 번에 한다 — 그 사이에 끊기면 아무도 못 보는 판이 남는다.
 */
export async function openAdventure(
  partyId: string,
  characterIds: readonly string[],
  level: number,
): Promise<string> {
  const { data, error } = await supabase().rpc('open_adventure', {
    p_party: partyId,
    p_characters: characterIds,
    p_level: level,
  })
  if (error) throw error
  return typeof data === 'string' ? data : ''
}

/** 이 판에 참가자로 지정된 캐릭터들. 목록에 이름을 적으려면 알아야 한다. */
export async function listBattleCharacters(battleId: string): Promise<string[]> {
  const { data, error } = await supabase()
    .from('battle_characters')
    .select('character_id')
    .eq('battle_id', battleId)
  if (error) throw error
  return ((data ?? []) as { character_id: string }[]).map((r) => r.character_id)
}

/** 판 하나를 열쇠로 읽는다. RLS가 「내 캐릭터가 참가한 판」만 준다(`0032`). */
export async function findBattleById(battleId: string): Promise<BattleRow | null> {
  const { data, error } = await supabase()
    .from('battles')
    .select(BATTLE_COLUMNS)
    .eq('id', battleId)
    .limit(1)
  if (error || !data || data.length === 0) return null
  return toBattle(data[0] as RawBattle)
}
