import { create } from 'zustand'
import { addShopItem, listShopItems, removeShopItem, type ShopItem } from './shopNet'
import { fold } from './searchFold'

/**
 * 상점 목록 — **상점 팝업과 캐릭터 시트가 함께 본다.**
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ **값을 아는 곳이 하나여야 시트와 상점이 같은 수를 말한다.**               │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * 시트의 아이템 줄에 값을 적으려면 이름으로 값을 찾아야 한다(들고 있는 것은 이름
 * 뿐이다). 상점에서 한 줄 새로 적으면 시트도 그 값을 바로 알아야 하므로 **두
 * 곳에서 따로 읽지 않는다.**
 *
 * 못 읽어도 화면은 선다(절대 원칙 3) — 값이 안 붙을 뿐이다.
 */
interface ShopState {
  items: ShopItem[]
  loaded: boolean
  load: () => Promise<void>
  add: (name: string, cost: number, userId: string) => Promise<void>
  drop: (id: string) => Promise<void>
}

function byCost(a: ShopItem, b: ShopItem): number {
  return a.cost - b.cost || a.name.localeCompare(b.name)
}

export const useShopStore = create<ShopState>((set, get) => ({
  items: [],
  loaded: false,

  load: async () => {
    try {
      set({ items: (await listShopItems()).sort(byCost), loaded: true })
    } catch (cause) {
      console.error('[shop]', cause)
      set({ loaded: true })
    }
  },

  /** 적지 못하면 그대로 던진다 — 화면이 까닭을 적어야 한다(같은 이름 등). */
  add: async (name, cost, userId) => {
    const made = await addShopItem(name, cost, userId)
    set({ items: [...get().items, made].sort(byCost) })
  },

  drop: async (id) => {
    await removeShopItem(id)
    set({ items: get().items.filter((i) => i.id !== id) })
  },
}))

/**
 * 이름으로 값 찾기.
 *
 * **공백과 대소문자를 안 가리고 견준다**(`fold`) — 예전에 손으로 적어 둔 것이
 * 섞여 있을 수 있고(그 길은 걷었다) 띄어쓰기 하나로 값이 안 붙으면 사람은 그것을
 * 고장으로 읽는다. 모르면 `null`이며 그때는 값을 안 적는다(구현 결정 115).
 */
export function costOf(items: readonly ShopItem[], name: string): number | null {
  const folded = fold(name)
  const found = items.find((i) => fold(i.name) === folded)
  return found ? found.cost : null
}
