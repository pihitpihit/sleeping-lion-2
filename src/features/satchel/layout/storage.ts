import { emptySettings, SETTINGS_VERSION, type Layout, type SatchelSettings } from './types'

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

export const STORAGE_KEY = 'sl2.satchel'

/** `localStorage`와 같은 모양이면 무엇이든 받는다. 테스트가 가짜를 넣는다. */
export interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
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

/** 알아볼 수 있는 부분만 건져낸다. 한 군데가 망가져도 나머지는 살린다. */
function salvage(parsed: unknown): SatchelSettings {
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

  return { version: SETTINGS_VERSION, layouts, toolbarPosition, showWidgetTitles, widgetSettings }
}

export function loadSettings(storage: StorageLike | null = defaultStorage()): SatchelSettings {
  if (!storage) return emptySettings()
  try {
    const raw = storage.getItem(STORAGE_KEY)
    if (!raw) return emptySettings()
    return salvage(JSON.parse(raw))
  } catch {
    return emptySettings()
  }
}

/** 쓰기 실패도 흡수한다. 용량 초과나 접근 거부로 도구가 멈추면 안 된다. */
export function saveSettings(
  settings: SatchelSettings,
  storage: StorageLike | null = defaultStorage(),
): boolean {
  if (!storage) return false
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(settings))
    return true
  } catch {
    return false
  }
}
