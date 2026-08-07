import { isSupabaseConfigured, supabase } from '../../auth/supabase'
import { isEmptySettings, sanitizeSettings, type SatchelSettings } from '../layout'

/**
 * 행낭 설정의 서버 쪽.
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ **서버는 백업이자 다리다. 정본은 아니다.**                                │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * 기록지(축 ①)와 다르다. 기록지는 서버가 정본이고 못 닿으면 고칠 수 없지만,
 * 행낭은 **서버가 없어도 완전히 돈다**(절대 원칙 3, SPEC 5.2). 여기서 나는
 * 오류는 전부 삼키고 로컬로 계속 간다 — 신호 없는 자리에서 위젯을 못 옮기면
 * 도구가 아니다.
 *
 * **도구 런타임 상태는 오지 않는다.** 뽑은 카드·원소·라운드는 메모리 전용이며
 * 여기 담기는 것은 배치와 화면 설정뿐이다.
 *
 * 막는 것은 RLS다(`0006_satchel.sql`) — 제 줄만 읽고 쓴다.
 */

interface Row {
  settings: unknown
  updated_at: string
}

/** 서버에서 읽은 것. 줄이 없으면 `null`. */
export interface RemoteSettings {
  settings: SatchelSettings
  /** 서버가 찍은 시각. 늦게 고친 쪽을 가리는 심판이다. */
  updatedAt: number
}

/** 서버에 물어볼 수 있는 상태인가. `mock`·`demo` 빌드와 로그인 전에는 아니다. */
function reachable(accountId: string | null): accountId is string {
  return accountId !== null && isSupabaseConfigured()
}

/**
 * 서버에 둔 것을 읽는다.
 *
 * 못 닿으면 `null`이다 — **오류를 던지지 않는다.** 부르는 쪽은 로컬로 계속
 * 가면 되고, 못 읽었다는 사실로 할 일이 없다.
 */
export async function fetchSettings(accountId: string | null): Promise<RemoteSettings | null> {
  if (!reachable(accountId)) return null
  try {
    const { data, error } = await supabase()
      .from('satchel_settings')
      .select('settings, updated_at')
      .eq('user_id', accountId)
      .maybeSingle()
    if (error || !data) return null

    const row = data as Row
    return {
      // 서버가 준 것도 거른다. 다른 판에서 쓴 값이거나 손으로 고쳐진 것일 수 있다.
      settings: sanitizeSettings(row.settings),
      updatedAt: Date.parse(row.updated_at) || 0,
    }
  } catch {
    return null
  }
}

/**
 * 서버에 얹는다.
 *
 * **빈 것은 올리지 않는다.** 새 기기에서 처음 열면 빈 설정이 만들어지는데,
 * 그것이 올라가면 다른 기기에 있던 배치가 늦게 올라왔다는 이유로 밀린다.
 * 지울 것이 있으면 위젯을 치우는 것이지 통째로 비우는 것이 아니다.
 */
export async function pushSettings(
  accountId: string | null,
  settings: SatchelSettings,
): Promise<boolean> {
  if (!reachable(accountId)) return false
  if (isEmptySettings(settings)) return false
  try {
    const { error } = await supabase()
      .from('satchel_settings')
      // `updated_at`은 보내지 않는다. 서버가 찍는다 — 시계가 어긋난 기기 하나가
      // 영영 이기는 것을 막는다.
      .upsert({ user_id: accountId, settings }, { onConflict: 'user_id' })
    return !error
  } catch {
    return false
  }
}

/* --------------------------------------------------------------------------
   어느 쪽이 이기는가
   -------------------------------------------------------------------------- */

/** 맞춘 결과. */
export interface Reconciled {
  /** 화면에 쓸 것. 로컬 그대로면 `null`이다 — 바꿀 것이 없다는 뜻. */
  adopt: SatchelSettings | null
  /** 서버에 올려야 하는가. */
  push: boolean
}

/**
 * 견줄 시각을 고른다.
 *
 * **뭉치 안에 적힌 것을 쓴다.** 뭉치의 `updatedAt`은 고친 기기가 찍은 값이고
 * 로컬 것도 같은 종류라, 둘을 견주면 "누가 나중에 고쳤나"를 묻는 것이 된다.
 * 서버의 `updated_at`은 기기 시계가 아니라 **도착 시각**이라 로컬 값과 종류가
 * 달라 그냥 견줄 수 없다 — 서버가 로컬보다 늘 늦으므로 로컬이 영영 진다.
 *
 * 뭉치에 시각이 없는 것(옛 저장물이 올라간 경우)만 도착 시각으로 갈음한다.
 * 그때는 그것 말고 아는 것이 없다.
 */
function stampOf(remote: RemoteSettings): number {
  return remote.settings.updatedAt > 0 ? remote.settings.updatedAt : remote.updatedAt
}

/**
 * 로컬과 서버를 맞춘다.
 *
 * **늦게 고친 쪽이 이긴다**(SPEC 5.3). 칸별로 합치지 않는다 — 배치는 통짜로
 * 하나의 그림이라 반쪽씩 섞으면 위젯이 겹치거나 사라진 자리가 남는다.
 *
 * 판정은 셋뿐이다:
 * 1. **서버에 알맹이가 없다** → 로컬을 올린다. 로컬도 비었으면 올릴 것이 없다.
 * 2. **로컬이 비었다** → 서버 것을 가져온다. 새 기기이거나 저장소가 지워진
 *    자리다 — 애초에 이걸 하려고 서버에 둔다.
 * 3. **둘 다 알맹이가 있다** → 고친 시각을 견준다. 로컬이 0이면(옛 저장물)
 *    서버가 이긴다.
 */
export function reconcile(local: SatchelSettings, remote: RemoteSettings | null): Reconciled {
  const localEmpty = isEmptySettings(local)

  if (remote === null || isEmptySettings(remote.settings)) {
    return { adopt: null, push: !localEmpty }
  }
  if (localEmpty) return { adopt: remote.settings, push: false }

  const theirs = stampOf(remote)
  if (local.updatedAt > theirs) return { adopt: null, push: true }
  // 같으면 가만둔다. 같은 것을 다시 올릴 이유가 없다.
  if (local.updatedAt === theirs) return { adopt: null, push: false }
  return { adopt: remote.settings, push: false }
}
