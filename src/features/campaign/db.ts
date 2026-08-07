import Dexie, { type EntityTable } from 'dexie'
import { clampReputation } from './reputation'
import type { Campaign, Character } from './types'

/**
 * 기록지의 **로컬 거울** — IndexedDB.
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ **정본은 서버다. 여기 있는 것은 마지막으로 본 모습이다.**                 │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * 처음에는 이것이 정본이었다. 그런데 홈화면 아이콘을 지우자 기록이 통째로
 * 날아갔다 — iOS는 홈화면 앱과 사파리의 저장소를 따로 두고, 아이콘을 지우면 그
 * 칸을 함께 지운다. 기록지는 파티원끼리 나누는 것이기도 하므로 서버로 옮겼다.
 *
 * 그래도 거울은 남긴다. **절대 원칙 3(offline-first)** 때문이다 — 상에 앉아
 * 있다가 신호가 끊겨도 적어둔 것은 보여야 한다. 지하에서 세 시간씩 하는 게임이다.
 *
 * **쓰기는 거울에 하지 않는다.** 지금은 서버에 못 닿으면 고치는 것을 막고
 * 알린다. 오프라인 큐와 충돌 병합은 딸려 오는 덩어리가 커서 따로 둔다(SPEC 5.3).
 * 조용히 받아 두었다가 잃는 것보다 못 쓴다고 말하는 편이 낫다.
 *
 * **축 ②(행낭)는 여기 오지 않는다.** 위젯 배치는 `localStorage`, 도구 런타임은
 * 메모리다(SPEC 5.2).
 */

/**
 * 스키마 판.
 *
 * 2에서 1의 것을 비웠다. 1은 파티에 묶이지 않은 기록지를 담고 있었고, 그것들은
 * 서버로 옮길 방법이 없다 — 어느 파티의 것인지 알 수 없기 때문이다.
 *
 * 3에서 캐릭터 거울을 더한다. **비우지 않는다** — 기존 기록지 거울은 그대로
 * 쓸 수 있고, 새 표는 비어서 시작해 다음에 서버를 볼 때 채워진다.
 */
const SCHEMA_VERSION = 3

class SleepingLionDb extends Dexie {
  campaigns!: EntityTable<Campaign, 'id'>
  characters!: EntityTable<Character, 'id'>

  constructor() {
    super('sl2')
    this.version(1).stores({ campaigns: 'id, updatedAt' })
    this.version(2)
      .stores({ campaigns: 'id, partyId, updatedAt' })
      .upgrade(async (tx) => {
        // 파티가 없던 시절의 것은 옮길 곳이 없다. 남겨두면 목록에 유령으로 뜬다.
        await tx.table('campaigns').clear()
      })
    this.version(SCHEMA_VERSION).stores({ characters: 'id, campaignId, updatedAt' })
  }
}

export const db = new SleepingLionDb()

/**
 * 어디서 온 값이든 쓸 수 있는 기록지로 다듬는다.
 *
 * 서버가 준 것도 거른다 — 스키마를 올린 뒤이거나 남이 다른 판으로 쓴 값일 수
 * 있다. **한 자락도 믿지 않는다.**
 */
export function sanitizeCampaign(raw: Partial<Campaign> & { id: string }): Campaign {
  const now = Date.now()
  return {
    id: raw.id,
    partyId: typeof raw.partyId === 'string' ? raw.partyId : '',
    name: typeof raw.name === 'string' ? raw.name : '',
    location: typeof raw.location === 'string' ? raw.location : '',
    notes: typeof raw.notes === 'string' ? raw.notes : '',
    achievements: Array.isArray(raw.achievements)
      ? raw.achievements.filter((item): item is string => typeof item === 'string')
      : [],
    reputation: clampReputation(typeof raw.reputation === 'number' ? raw.reputation : 0),
    createdAt: typeof raw.createdAt === 'number' ? raw.createdAt : now,
    updatedAt: typeof raw.updatedAt === 'number' ? raw.updatedAt : now,
    version: typeof raw.version === 'number' ? raw.version : 1,
  }
}

/* --------------------------------------------------------------------------
   거울 읽고 쓰기
   --------------------------------------------------------------------------
   실패해도 던지지 않는다. 거울이 없다고 판이 멈추면 안 된다 — 사파리의 사생활
   보호 모드처럼 IndexedDB가 아예 막힌 자리가 있다.
   -------------------------------------------------------------------------- */

/** 서버에서 본 것을 그대로 비춰 둔다. */
export async function mirror(campaigns: readonly Campaign[]): Promise<void> {
  try {
    await db.campaigns.bulkPut(campaigns.map((c) => sanitizeCampaign(c)))
  } catch (cause) {
    console.error('[campaign] 거울에 쓰지 못했다', cause)
  }
}

/** 마지막으로 본 그 파티의 기록지. 없으면 `null`. */
export async function mirroredFor(partyId: string): Promise<Campaign | null> {
  try {
    const rows = await db.campaigns.where('partyId').equals(partyId).toArray()
    const first = rows[0]
    return first ? sanitizeCampaign(first) : null
  } catch (cause) {
    console.error('[campaign] 거울을 읽지 못했다', cause)
    return null
  }
}

/** 마지막으로 본 것 전부. 서버에 못 닿을 때 목록을 채운다. */
export async function mirroredAll(): Promise<Campaign[]> {
  try {
    const rows = await db.campaigns.toArray()
    return rows.map(sanitizeCampaign)
  } catch (cause) {
    console.error('[campaign] 거울을 읽지 못했다', cause)
    return []
  }
}

/** 파티에서 나갔거나 지워졌을 때 거울에서도 거둔다. */
export async function forgetMirror(partyId: string): Promise<void> {
  try {
    await db.campaigns.where('partyId').equals(partyId).delete()
  } catch (cause) {
    console.error('[campaign] 거울을 비우지 못했다', cause)
  }
}

/* --------------------------------------------------------------------------
   캐릭터 거울
   --------------------------------------------------------------------------
   기록지와 같은 규칙이다. **정본은 서버**이고 여기 있는 것은 마지막으로 본
   모습이다. 지하에서 세 시간씩 하는 게임이라 신호가 끊겨도 골드와 경험은
   보여야 한다. 쓰기는 여기 하지 않는다.
   -------------------------------------------------------------------------- */

/** 서버에서 본 캐릭터를 비춰 둔다. 그 기록지의 것을 통째로 갈아 끼운다. */
export async function mirrorCharacters(
  campaignId: string,
  characters: readonly Character[],
): Promise<void> {
  try {
    // 지워진 캐릭터가 거울에 유령으로 남지 않게 먼저 비운다.
    await db.characters.where('campaignId').equals(campaignId).delete()
    await db.characters.bulkPut(characters.map((c) => ({ ...c })))
  } catch (cause) {
    console.error('[character] 거울에 쓰지 못했다', cause)
  }
}

/** 마지막으로 본 그 기록지의 캐릭터들. */
export async function mirroredCharacters(campaignId: string): Promise<Character[]> {
  try {
    const rows = await db.characters.where('campaignId').equals(campaignId).toArray()
    return rows.sort((a, b) => a.createdAt - b.createdAt)
  } catch (cause) {
    console.error('[character] 거울을 읽지 못했다', cause)
    return []
  }
}
