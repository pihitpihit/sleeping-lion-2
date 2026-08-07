import Dexie, { type EntityTable } from 'dexie'
import { clampReputation } from './reputation'
import type { Campaign, CampaignEdits, NewCampaign } from './types'

/**
 * 축 ①의 1차 저장소 — IndexedDB.
 *
 * **offline-first가 절대 원칙이다**(SPEC 5.1). 서버 없이 이것만으로 완전히
 * 동작해야 하며, 서버는 나중에 얹는 백업·공유 계층일 뿐이다.
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ **축 ②(행낭)는 여기 들어오지 않는다.**                                    │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * 위젯 배치는 `localStorage`, 도구 런타임 상태는 메모리다(SPEC 5.2). 저장 위치를
 * 일부러 다르게 두는 것 자체가 성격이 다르다는 신호이며, 나중에 실수로 동기화
 * 대상에 섞이는 것을 막는다.
 */

/**
 * 스키마 판.
 *
 * **올릴 때는 `version(n).stores(...)`를 새로 더한다.** 기존 판을 고치면 이미
 * 깔린 기기에서 마이그레이션이 돌지 않는다.
 */
const SCHEMA_VERSION = 1

class SleepingLionDb extends Dexie {
  /**
   * 파티 기록지.
   *
   * 색인은 `id`(주 키)와 `updatedAt`뿐이다. 목록을 최근 순으로 늘어놓는 데 쓴다 —
   * 이름으로 찾는 일은 아직 없고, 색인은 실제로 쓸 때 더한다.
   */
  campaigns!: EntityTable<Campaign, 'id'>

  constructor() {
    super('sl2')
    this.version(SCHEMA_VERSION).stores({ campaigns: 'id, updatedAt' })
  }
}

export const db = new SleepingLionDb()

/** 새 기록지의 빈 값. 이름만 받고 나머지는 비워 시작한다. */
export function emptyCampaign(name: string, id: string, now: number): Campaign {
  return {
    id,
    name,
    location: '',
    notes: '',
    achievements: [],
    reputation: 0,
    ownerUserId: null,
    createdAt: now,
    updatedAt: now,
    version: 1,
  }
}

/**
 * 저장소에서 읽은 값을 쓸 수 있는 기록지로 다듬는다.
 *
 * 스키마를 올린 뒤이거나 사람이 손댔을 수 있으므로 **한 자락도 믿지 않는다.**
 * 행낭의 설정 로더와 같은 태도다 — 반쯤 맞는 값으로 화면을 그리는 것보다 빈
 * 자리를 채워 넣는 편이 낫다.
 */
export function sanitizeCampaign(raw: Partial<Campaign> & { id: string }): Campaign {
  const now = Date.now()
  return {
    id: raw.id,
    name: typeof raw.name === 'string' ? raw.name : '',
    location: typeof raw.location === 'string' ? raw.location : '',
    notes: typeof raw.notes === 'string' ? raw.notes : '',
    achievements: Array.isArray(raw.achievements)
      ? raw.achievements.filter((item): item is string => typeof item === 'string')
      : [],
    reputation: clampReputation(typeof raw.reputation === 'number' ? raw.reputation : 0),
    ownerUserId: typeof raw.ownerUserId === 'string' ? raw.ownerUserId : null,
    createdAt: typeof raw.createdAt === 'number' ? raw.createdAt : now,
    updatedAt: typeof raw.updatedAt === 'number' ? raw.updatedAt : now,
    version: typeof raw.version === 'number' ? raw.version : 1,
  }
}

/* --------------------------------------------------------------------------
   읽고 쓰기
   -------------------------------------------------------------------------- */

/** 최근에 손댄 것부터. */
export async function listCampaigns(): Promise<Campaign[]> {
  const rows = await db.campaigns.orderBy('updatedAt').reverse().toArray()
  return rows.map(sanitizeCampaign)
}

export async function getCampaign(id: string): Promise<Campaign | null> {
  const row = await db.campaigns.get(id)
  return row ? sanitizeCampaign(row) : null
}

export async function createCampaign(input: NewCampaign, now = Date.now()): Promise<Campaign> {
  const campaign = { ...emptyCampaign(input.name, crypto.randomUUID(), now), ...input }
  const clean = sanitizeCampaign(campaign)
  await db.campaigns.add(clean)
  return clean
}

/**
 * 고친 것을 얹는다.
 *
 * **`version`을 올리고 `updatedAt`을 찍는 자리를 여기 하나로 모은다.** 화면마다
 * 따로 올리면 빠뜨리는 곳이 생기고, Phase 2의 낙관적 잠금이 그 순간 무너진다
 * (SPEC 5.3).
 */
export async function updateCampaign(
  id: string,
  edits: CampaignEdits,
  now = Date.now(),
): Promise<Campaign | null> {
  const current = await getCampaign(id)
  if (!current) return null

  const next = sanitizeCampaign({
    ...current,
    ...edits,
    updatedAt: now,
    version: current.version + 1,
  })
  await db.campaigns.put(next)
  return next
}

export async function deleteCampaign(id: string): Promise<void> {
  await db.campaigns.delete(id)
}
