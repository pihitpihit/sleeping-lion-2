import { create } from 'zustand'
import {
  computeGridMetrics,
  EMPTY_METRICS,
  type GridMetrics,
  type Placement,
  type Size,
} from '../grid'
import {
  addWidget,
  dropUnknownWidgets,
  layoutForColumns,
  loadSettings,
  removeWidget,
  saveSettings,
  updatePlacement,
  type Layout,
  type SatchelSettings,
  type ToolbarPreference,
} from '../layout'
import {
  getWidgetDefinition,
  isKnownWidget,
  isSizeAllowedFor,
  minSizeOf,
  sanitizeSettingsFor,
} from '../widgets/registry'
import type { SatchelMode } from '../widgets/types'

/**
 * 행낭 스토어.
 *
 * **저장 규칙은 SPEC 5.2와 `src/stores/README.md`가 정본이다.**
 * 여기 있는 것은 전부 사용자 설정이라 `localStorage`에 남는다. 도구 런타임 상태
 * (뽑은 카드·원소 상태)는 각 위젯이 자기 메모리 스토어를 갖는다 — 이 스토어에
 * 넣지 않는다.
 *
 * `persist` 미들웨어 대신 직접 저장한다. 열 수별 레이아웃을 부분 갱신해야 하고,
 * 드래그 중에는 저장하지 않다가 조작이 끝날 때만 저장해야 하기 때문이다.
 */

/**
 * 되돌리기 이력의 최대 길이.
 *
 * 편집 중 실수를 무르는 용도지 작업 기록이 아니다. 깊게 쌓아둘 이유가 없고,
 * 메모리에만 있으므로 새로고침하면 사라진다.
 */
const HISTORY_LIMIT = 20

interface SatchelState {
  settings: SatchelSettings
  metrics: GridMetrics
  mode: SatchelMode
  /** 자리를 못 찾았을 때처럼 사용자에게 알려야 하는 한마디. */
  notice: string | null
  /** 되돌리기 이력. 영속하지 않는다 — 지금 편집 중인 것에 대한 상태다. */
  past: Layout[]

  setBoardSize: (size: Size) => void
  setMode: (mode: SatchelMode) => void
  setToolbarPreference: (preference: ToolbarPreference) => void
  toggleWidgetTitles: () => void
  setWidgetSettings: (instanceId: string, next: unknown) => void
  addWidgetOfType: (definitionId: string) => void
  removeWidgetInstance: (instanceId: string) => void
  moveOrResize: (instanceId: string, next: Placement) => boolean
  resetLayout: () => void
  clearNotice: () => void
  undo: () => void

  currentLayout: () => Layout
  countOf: (definitionId: string) => number
  /** 늘 sanitize를 거친 값. 위젯이 안심하고 자기 타입으로 받는다. */
  settingsFor: (instanceId: string, definitionId: string) => unknown
}

/**
 * 현재 열 수의 레이아웃. 없으면 가장 가까운 것에서 파생하고 알 수 없는 위젯을 버린다.
 *
 * 크기 제약이 **인스턴스 설정에 딸리므로**(원소를 둘만 고르면 2칸이면 된다)
 * 파생에도 설정을 함께 넘긴다.
 */
function resolveLayout(settings: SatchelSettings, metrics: GridMetrics): Layout {
  const allowed = (widget: { instanceId: string; definitionId: string }, size: Size2) =>
    isSizeAllowedFor(
      widget.definitionId,
      size,
      sanitizeSettingsFor(widget.definitionId, settings.widgetSettings[widget.instanceId]),
    )
  const layout = layoutForColumns(settings.layouts, metrics, minSizeOf, allowed)
  return dropUnknownWidgets(layout, isKnownWidget)
}

type Size2 = { w: number; h: number }

/** 이력에 한 장 쌓는다. 오래된 것부터 버려 길이를 묶어 둔다. */
function pushHistory(past: Layout[], snapshot: Layout): Layout[] {
  const next = [...past, snapshot]
  return next.length > HISTORY_LIMIT ? next.slice(next.length - HISTORY_LIMIT) : next
}

function persist(settings: SatchelSettings, layout: Layout): SatchelSettings {
  if (layout.columns <= 0) return settings
  const next: SatchelSettings = {
    ...settings,
    layouts: { ...settings.layouts, [layout.columns]: layout },
  }
  saveSettings(next)
  return next
}

export const useSatchelStore = create<SatchelState>((set, get) => ({
  settings: loadSettings(),
  metrics: EMPTY_METRICS,
  // 행낭을 여는 이유는 쓰려는 것이지 꾸미려는 것이 아니다. 마지막 모드를 기억하면
  // 편집 중 나갔다가 다음 판에 편집 모드로 열린다.
  mode: 'play',
  notice: null,
  past: [],

  setBoardSize: (size) => {
    const metrics = computeGridMetrics(size)
    const previous = get().metrics
    if (
      metrics.columns === previous.columns &&
      metrics.rows === previous.rows &&
      metrics.cellSize === previous.cellSize
    ) {
      // 여백만 달라진 경우에도 그리기에는 반영돼야 한다.
      set({ metrics })
      return
    }

    // 격자가 바뀌었다. 파생 결과를 저장해 두면 이후로는 독립적으로 편집된다.
    // 이력은 버린다 — 다른 격자에서 만든 배치로 되돌리면 좌표가 맞지 않는다.
    const settings = get().settings
    const layout = resolveLayout(settings, metrics)
    set({ metrics, settings: persist(settings, layout), past: [] })
  },

  setMode: (mode) => set({ mode, notice: null }),

  setToolbarPreference: (toolbarPosition) => {
    const settings = { ...get().settings, toolbarPosition }
    saveSettings(settings)
    set({ settings })
  },

  toggleWidgetTitles: () => {
    const settings = { ...get().settings, showWidgetTitles: !get().settings.showWidgetTitles }
    saveSettings(settings)
    set({ settings })
  },

  setWidgetSettings: (instanceId, next) => {
    const settings = {
      ...get().settings,
      widgetSettings: { ...get().settings.widgetSettings, [instanceId]: next },
    }
    saveSettings(settings)
    set({ settings })
  },

  addWidgetOfType: (definitionId) => {
    const { settings, metrics } = get()
    const definition = getWidgetDefinition(definitionId)
    if (!definition) return

    const layout = resolveLayout(settings, metrics)
    const used = layout.widgets.filter((w) => w.definitionId === definitionId).length
    if (definition.maxInstances != null && used >= definition.maxInstances) {
      set({ notice: `${definition.name}은(는) 더 놓을 수 없다.` })
      return
    }

    /**
     * 기본 크기가 안 들어가면 **눕혀서** 시도한다.
     *
     * 원소 트래커는 긴 쪽이 6칸이어야 하는데 폰은 4열뿐이다. 가로로는 못 놓아도
     * 세로로는 놓을 수 있으므로, 돌려보지 않고 "자리가 없다"고 하면 폰에서
     * 아예 쓸 수 없는 위젯이 된다.
     */
    const { defaultSize } = definition
    const candidates = [defaultSize, { w: defaultSize.h, h: defaultSize.w }]
    const fresh = definition.settings?.sanitize(undefined)
    let next: Layout | null = null
    for (const size of candidates) {
      if (size.w > metrics.columns || size.h > metrics.rows) continue
      if (!isSizeAllowedFor(definitionId, size, fresh)) continue
      next = addWidget(layout, definitionId, size, metrics, crypto.randomUUID())
      if (next) break
    }

    if (!next) {
      // 조용히 실패하면 버튼이 고장난 것으로 보인다.
      set({ notice: '자리가 없다. 다른 연장을 치우거나 크기를 줄여라.' })
      return
    }
    set({ settings: persist(settings, next), notice: null, past: pushHistory(get().past, layout) })
  },

  removeWidgetInstance: (instanceId) => {
    const { settings, metrics } = get()
    const before = resolveLayout(settings, metrics)
    const next = removeWidget(before, instanceId)
    if (next === before) return
    // 설정도 함께 지운다. 안 지우면 저장소에 영원히 남는다.
    const { [instanceId]: _removed, ...widgetSettings } = settings.widgetSettings
    void _removed
    set({
      settings: persist({ ...settings, widgetSettings }, next),
      notice: null,
      past: pushHistory(get().past, before),
    })
  },

  moveOrResize: (instanceId, next) => {
    const { settings, metrics } = get()
    const before = resolveLayout(settings, metrics)
    // 위젯 고유 크기 제약. 이동만 하는 경우에도 한 번 더 보는 편이 안전하다.
    const target = before.widgets.find((w) => w.instanceId === instanceId)
    if (
      target &&
      !isSizeAllowedFor(
        target.definitionId,
        { w: next.w, h: next.h },
        sanitizeSettingsFor(target.definitionId, settings.widgetSettings[instanceId]),
      )
    ) {
      return false
    }
    const updated = updatePlacement(before, instanceId, next, metrics)
    if (!updated) return false
    set({ settings: persist(settings, updated), past: pushHistory(get().past, before) })
    return true
  },

  // 메뉴에서는 잠시 뺐다. 되돌리기가 붙은 뒤로 급하지 않고, 실수로 누르면
  // 잃는 것이 크다. 필요해지면 다시 노출한다.
  resetLayout: () => {
    const { settings, metrics } = get()
    const before = resolveLayout(settings, metrics)
    set({
      settings: persist(settings, { columns: metrics.columns, widgets: [] }),
      notice: null,
      past: pushHistory(get().past, before),
    })
  },

  clearNotice: () => set({ notice: null }),

  undo: () => {
    const { settings, past } = get()
    const previous = past.at(-1)
    if (!previous) return
    set({
      settings: persist(settings, previous),
      past: past.slice(0, -1),
      notice: null,
    })
  },

  currentLayout: () => resolveLayout(get().settings, get().metrics),

  settingsFor: (instanceId, definitionId) =>
    sanitizeSettingsFor(definitionId, get().settings.widgetSettings[instanceId]),

  countOf: (definitionId) =>
    resolveLayout(get().settings, get().metrics).widgets.filter(
      (w) => w.definitionId === definitionId,
    ).length,
}))
