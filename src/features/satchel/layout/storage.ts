import {
  emptySettings,
  isRotation,
  SETTINGS_VERSION,
  type Layout,
  type Rotation,
  type SatchelSettings,
} from './types'

/**
 * `localStorage` 읽고 쓰기.
 *
 * **읽기는 절대 던지지 않는다.** JSON 파싱 실패, 스키마 불일치, 저장소 접근 거부
 * (사파리 프라이빗 모드)를 전부 흡수하고 기본값을 낸다. 도구 화면이 저장소 문제로
 * 안 뜨면 안 된다.
 *
 * 저장 위치를 IndexedDB가 아니라 `localStorage`로 둔 것은 용량 때문이 아니다.
 * 캠페인 데이터(축 ①)와 물리적으로 다른 곳에 두어, 나중에 동기화 대상 목록에
 * 섞여 들어가는 것을 막는다. SPEC 5.2 참조.
 */

/**
 * 계정마다 따로 둔다.
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ **행낭 배치는 사람의 것이지 기기의 것이 아니다.**                         │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * 처음에는 열쇠가 하나였다. 그러니 한 기기에서 계정을 바꿔 들어가면 **앞 사람의
 * 배치가 그대로 보였다** — 형님이 짚었다.
 *
 * **2026-08-08 — 서버에도 둔다**(SPEC 5.2 개정, `satchelNet.ts`). 열쇠만 갈라
 * 놓으면 저장소 자체가 지워질 때 다 같이 날아간다 — iOS 홈화면 아이콘을 지웠을
 * 때 실제로 그렇게 났다.
 *
 * **여기가 먼저 열린다는 것은 그대로다.** 서버는 백업이자 기기 사이를 잇는
 * 다리이며, 못 닿아도 행낭은 이것만으로 완전히 돈다(절대 원칙 3).
 */
const KEY_PREFIX = 'sl2.satchel'

/** 열쇠가 하나였던 시절의 것. 한 번 물려받고 지운다. */
export const LEGACY_STORAGE_KEY = KEY_PREFIX

export function storageKeyFor(accountId: string | null): string {
  // 로그인 전(그리고 `demo` 배포)에는 계정이 없다. 옛 열쇠와 겹치지 않게 둔다.
  return accountId ? `${KEY_PREFIX}.${accountId}` : `${KEY_PREFIX}.guest`
}

/** `localStorage`와 같은 모양이면 무엇이든 받는다. 테스트가 가짜를 넣는다. */
export interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  /** 옛 열쇠를 거둘 때만 쓴다. 가짜 저장소는 없어도 된다. */
  removeItem?(key: string): void
}

function defaultStorage(): StorageLike | null {
  try {
    return globalThis.localStorage ?? null
  } catch {
    // 사파리 프라이빗 모드 등에서 접근 자체가 던진다.
    return null
  }
}

function isLayout(value: unknown): value is Layout {
  if (typeof value !== 'object' || value === null) return false
  const layout = value as Partial<Layout>
  if (typeof layout.columns !== 'number' || !Array.isArray(layout.widgets)) return false
  return layout.widgets.every(
    (w) =>
      typeof w === 'object' &&
      w !== null &&
      typeof w.instanceId === 'string' &&
      typeof w.definitionId === 'string' &&
      Number.isFinite(w.x) &&
      Number.isFinite(w.y) &&
      Number.isFinite(w.w) &&
      Number.isFinite(w.h),
  )
}

/**
 * 알아볼 수 있는 부분만 건져낸다. 한 군데가 망가져도 나머지는 살린다.
 *
 * **서버가 준 것도 이걸 통과시킨다.** 저장하는 곳이 둘(로컬·서버)이 되었으므로
 * 걸러내는 자리도 하나여야 한다 — 서버 쪽에만 따로 두면 언젠가 두 벌이 어긋난다.
 */
export function sanitizeSettings(parsed: unknown): SatchelSettings {
  const fallback = emptySettings()
  if (typeof parsed !== 'object' || parsed === null) return fallback

  const raw = parsed as Partial<SatchelSettings>

  // 알 수 없는(더 높은) 버전은 건드리지 않는다. 덮어쓰면 다른 기기에서 최신
  // 버전을 쓰던 사용자의 데이터가 깨진다.
  if (typeof raw.version === 'number' && raw.version > SETTINGS_VERSION) return fallback

  const layouts: Record<number, Layout> = {}
  if (typeof raw.layouts === 'object' && raw.layouts !== null) {
    for (const [key, value] of Object.entries(raw.layouts)) {
      const columns = Number(key)
      if (!Number.isFinite(columns) || columns <= 0) continue
      if (isLayout(value)) layouts[columns] = value
    }
  }

  const toolbarPosition =
    raw.toolbarPosition === 'top' ||
    raw.toolbarPosition === 'left' ||
    raw.toolbarPosition === 'auto'
      ? raw.toolbarPosition
      : 'auto'

  // 없거나 이상하면 기본값(보임)으로 둔다.
  const showWidgetTitles = typeof raw.showWidgetTitles === 'boolean' ? raw.showWidgetTitles : true

  // 모양은 위젯마다 다르므로 여기서는 '객체인가'만 본다. 실제 검증은 각 위젯의
  // sanitize가 한다.
  const widgetSettings: Record<string, unknown> = {}
  if (typeof raw.widgetSettings === 'object' && raw.widgetSettings !== null) {
    for (const [key, value] of Object.entries(raw.widgetSettings)) {
      if (typeof value === 'object' && value !== null) widgetSettings[key] = value
    }
  }

  // 90도 단위가 아닌 값은 버린다 — 임의 각도로 저장된 것은 우리 것이 아니다.
  const widgetRotations: Record<string, Rotation> = {}
  if (typeof raw.widgetRotations === 'object' && raw.widgetRotations !== null) {
    for (const [key, value] of Object.entries(raw.widgetRotations)) {
      if (isRotation(value)) widgetRotations[key] = value
    }
  }

  // 옛 저장물에는 없다. 0이면 "언제 고쳤는지 모른다"는 뜻이고, 빈 설정은
  // 어차피 올라가지 않으므로 알맹이 있는 것을 밀어내지 못한다.
  const updatedAt = typeof raw.updatedAt === 'number' && raw.updatedAt > 0 ? raw.updatedAt : 0

  return {
    version: SETTINGS_VERSION,
    updatedAt,
    layouts,
    toolbarPosition,
    showWidgetTitles,
    widgetSettings,
    widgetRotations,
  }
}

export function loadSettings(
  accountId: string | null = null,
  storage: StorageLike | null = defaultStorage(),
): SatchelSettings {
  if (!storage) return emptySettings()
  try {
    const raw = storage.getItem(storageKeyFor(accountId))
    if (raw) return sanitizeSettings(JSON.parse(raw))

    /**
     * 옛 열쇠를 **한 번만** 물려받는다.
     *
     * 계정을 가르기 전에 쌓아둔 배치가 있다. 그냥 두면 처음 들어온 사람이 빈
     * 격자를 보고 다시 짜야 한다.
     *
     * **물려받고 나면 지운다.** 남겨두면 계정을 바꿀 때마다 새 사람이 같은
     * 배치를 물려받아, 가르려던 것이 도로 섞인다.
     */
    if (accountId !== null) {
      const legacy = storage.getItem(LEGACY_STORAGE_KEY)
      if (legacy) {
        const salvaged = sanitizeSettings(JSON.parse(legacy))
        storage.setItem(storageKeyFor(accountId), JSON.stringify(salvaged))
        storage.removeItem?.(LEGACY_STORAGE_KEY)
        return salvaged
      }
    }
    return emptySettings()
  } catch {
    return emptySettings()
  }
}

/** 쓰기 실패도 흡수한다. 용량 초과나 접근 거부로 도구가 멈추면 안 된다. */
export function saveSettings(
  settings: SatchelSettings,
  accountId: string | null = null,
  storage: StorageLike | null = defaultStorage(),
): boolean {
  if (!storage) return false
  try {
    storage.setItem(storageKeyFor(accountId), JSON.stringify(settings))
    return true
  } catch {
    return false
  }
}
