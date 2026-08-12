import { isSupabaseConfigured, supabase } from '../auth/supabase'
import { hasClassIcon, levelForXp } from './character'

/**
 * 내 캐릭터 — 파티를 가로지르는 목록.
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ **캐릭터가 먼저고 파티는 그 캐릭터가 속한 곳이다.**                       │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * 일지를 열면 파티가 먼저 보이고 그 안에 캐릭터가 있었다. 실제로 사람이 앱을
 * 여는 까닭은 **제 캐릭터를 보려는 것**이고, 파티는 그 캐릭터가 어디 속했는지를
 * 말하는 이름표에 가깝다. 2026-08-12에 그 순서를 뒤집었다.
 *
 * **모델은 그대로다.** 캐릭터는 여전히 기록지에 달려 있고 기록지는 파티에 달려
 * 있다. 파티 하나에 기록지 하나뿐이라(`fetchOrCreateFor`가 가장 오래된 하나만
 * 집는다) `campaign_id`가 사실상 "어느 파티"와 같으므로, 뒤집을 것은 화면이지
 * 표가 아니다.
 *
 * **읽는 것은 제 것뿐이다.** 남의 캐릭터는 그 파티 기록지 안에서 본다 — 첫 화면은
 * 내 것을 모아 두는 자리다.
 */

/** 첫 화면의 캐릭터 한 줄. 시트 전부가 아니라 **줄에 그릴 것만** 담는다. */
export interface MyCharacter {
  id: string
  name: string
  /** 경험치에서 뽑은 레벨. 표의 `level` 칸을 믿지 않는다. */
  level: number
  classIcon: number
  classId: string | null
  retired: boolean
  /** 어느 기록지의 것인가. **아직 파티에 안 들었으면 `null`.** */
  campaignId: string | null
  /** 어느 파티인가. 줄의 부제이자 기록지로 가는 열쇠다. 안 들었으면 `null`. */
  partyId: string | null
  partyName: string | null
}

interface Row {
  id: string
  name: string | null
  xp: number | null
  class_icon: number | null
  class_id: string | null
  retired: boolean | null
  campaign_id: string | null
  campaign: {
    id: string
    name: string | null
    party: { id: string; name: string | null } | null
  } | null
}

/**
 * 표를 두 단 건너뛴다.
 *
 * `characters → campaigns → parties`. PostgREST는 **자기가 보는 스키마 안의
 * 외래키만** 따라가는데 셋 다 `public`이라 한 번에 온다(구현 결정 45가 짚은
 * 것과 같은 성질이다 — 그래서 주인 이름은 `auth.users`가 아니라 `profiles`를
 * 가리킨다).
 */
const COLUMNS =
  'id, name, xp, class_icon, class_id, retired, campaign_id, campaign:campaigns(id, name, party:parties(id, name))'

function toMine(row: Row): MyCharacter {
  /*
    **파티가 없을 수 있다.** 캐릭터가 먼저 서고 파티에는 나중에 들기 때문이다
    (`0015`). 그때는 줄에 "아직 파티가 없다"고 적는다 — 걸러 버리면 방금 세운
    캐릭터가 목록에서 사라진다.
  */
  const party = row.campaign?.party ?? null

  return {
    id: row.id,
    name: typeof row.name === 'string' ? row.name : '',
    /*
      **레벨은 경험치에서 뽑는다.** 표의 `level` 칸도 함께 적히지만(`sheetDiff`),
      이 화면이 그 칸을 믿으면 옛 값이 남은 캐릭터에서 시트와 다른 수를 말한다.
    */
    level: levelForXp(typeof row.xp === 'number' ? row.xp : 0),
    classIcon: hasClassIcon(row.class_icon ?? 0) ? (row.class_icon as number) : 0,
    classId: typeof row.class_id === 'string' && row.class_id !== '' ? row.class_id : null,
    retired: row.retired === true,
    campaignId: row.campaign_id,
    partyId: party?.id ?? null,
    // 기록지 이름을 먼저 쓴다 — 파티 시트에서 고치는 이름이 그쪽이고, 목록에 뜨는
    // 것도 그것이다. 비면 파티 이름으로 물러난다.
    partyName: party ? row.campaign?.name || party.name || '이름 없는 파티' : null,
  }
}

/**
 * 내가 세운 캐릭터 전부. 못 읽으면 빈 목록 — 파티 목록은 그대로 보인다.
 *
 * RLS가 한 번 더 거른다(`0005_characters.sql`): 내가 속한 파티의 것만 온다.
 * 여기 `owner_id` 조건은 그 안에서 **내 것만** 고르는 것이다.
 */
export async function fetchMyCharacters(userId: string): Promise<MyCharacter[]> {
  if (!isSupabaseConfigured()) return []
  const { data, error } = await supabase()
    .from('characters')
    .select(COLUMNS)
    .eq('owner_id', userId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data as unknown as Row[]).map(toMine)
}
