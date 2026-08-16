import { supabase } from '../auth/supabase'

/**
 * 상점 — **우리가 적어 두는 아이템 목록**(`0023`).
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ **남의 데이터베이스를 들이지 않는다.**                                    │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * 아이템 데이터를 모아 둔 저장소를 훑어 봤지만(2026-08-14) 하나는 재사용을 명시적
 * 으로 막고 나머지도 라이선스가 없다 — 형님이 보류했고, 쓰는 사람이 직접 적는
 * 길로 간다. 실물을 손에 들고 노는 자리라 이름과 값을 옮겨 적는 것이 어렵지 않다.
 *
 * 지금 다루는 것은 **이름과 가격 둘뿐이다.** 슬롯·소모·해금은 자리를 두지 않는다 —
 * 필요해지면 늘리면 되고, 비어 있는 칸은 무엇이 확인된 것인지만 흐린다.
 *
 * 이름은 게임 콘텐츠라 **DB에만 있다** — 레포에는 표와 정책뿐이다(구현 결정 111).
 */

export interface ShopItem {
  readonly id: string
  readonly name: string
  readonly cost: number
  /**
   * 실물 카드에 박힌 번호. **아직 안 적었으면 −1**(`0029`).
   *
   * 캠페인 시트의 번영도 표가 번호의 범위로 말하므로(`rules/prosperity.ts`)
   * 이름만으로는 그 표와 이을 수가 없다.
   */
  readonly no: number
}

interface Row {
  id: string
  name: string | null
  cost: number | null
  no: number | null
}

const COLUMNS = 'id, name, cost, no'

function toItem(row: Row): ShopItem {
  return {
    id: row.id,
    name: typeof row.name === 'string' ? row.name : '',
    cost: typeof row.cost === 'number' ? row.cost : 0,
    no: typeof row.no === 'number' ? Math.trunc(row.no) : -1,
  }
}

/**
 * 적어 둔 것 전부 — **번호 차례로.**
 *
 * 실물 카드가 번호로 정렬돼 있고 번영도 표도 번호로 말한다(`prosperity.ts`).
 * 아직 번호를 안 적은 것(−1)은 맨 앞에 모인다 — **적을 것이 남았다는 표가 된다.**
 */
export async function listShopItems(): Promise<ShopItem[]> {
  const { data, error } = await supabase()
    .from('shop_items')
    .select(COLUMNS)
    .order('no', { ascending: true })
    .order('name', { ascending: true })
  if (error) throw error
  return ((data ?? []) as unknown as Row[]).map(toItem)
}

/**
 * 한 줄 적는다.
 *
 * **적은 사람을 함께 남긴다** — 지우는 것은 적은 사람과 관리자뿐이다(`0023`).
 * 남이 적어 둔 것을 아무나 지우면 옆 사람이 사려던 것이 사라진다.
 */
export async function addShopItem(
  name: string,
  cost: number,
  no: number,
  userId: string,
): Promise<ShopItem> {
  const { data, error } = await supabase()
    .from('shop_items')
    .insert({ name: name.trim(), cost, no, created_by: userId })
    .select(COLUMNS)
    .single()
  if (error) throw error
  return toItem(data as unknown as Row)
}

/** 지운다. 서버가 자격을 본다 — 화면에서 단추를 감추는 것은 헛손질을 줄이는 것뿐이다. */
export async function removeShopItem(id: string): Promise<void> {
  const { error } = await supabase().from('shop_items').delete().eq('id', id)
  if (error) throw error
}
