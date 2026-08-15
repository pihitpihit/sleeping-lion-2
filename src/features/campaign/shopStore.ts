import { create } from 'zustand'
import { addShopItem, listShopItems, removeShopItem, type ShopItem } from './shopNet'

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
 * **다듬어 견준다** — 목록의 이름과 시트에 담긴 이름은 같은 자리에서 온 것이지만,
 * 예전에 손으로 적어 둔 것이 섞여 있을 수 있다(그 길은 걷었다). 모르면 `null`이며
 * 그때는 값을 안 적는다(구현 결정 115).
 */
export function costOf(items: readonly ShopItem[], name: string): number | null {
  const folded = name.trim().toLocaleLowerCase()
  const found = items.find((i) => i.name.trim().toLocaleLowerCase() === folded)
  return found ? found.cost : null
}
