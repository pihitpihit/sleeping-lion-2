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
  type ToolbarPosition,
} from '../layout'
import { getWidgetDefinition, isKnownWidget, minSizeOf } from '../widgets/registry'
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

interface SatchelState {
  settings: SatchelSettings
  metrics: GridMetrics
  mode: SatchelMode
  /** 자리를 못 찾았을 때처럼 사용자에게 알려야 하는 한마디. */
  notice: string | null

  setBoardSize: (size: Size) => void
  setMode: (mode: SatchelMode) => void
  setToolbarPosition: (position: ToolbarPosition) => void
  addWidgetOfType: (definitionId: string) => void
  removeWidgetInstance: (instanceId: string) => void
  moveOrResize: (instanceId: string, next: Placement) => boolean
  resetLayout: () => void
  clearNotice: () => void

  currentLayout: () => Layout
  countOf: (definitionId: string) => number
}

/** 현재 열 수의 레이아웃. 없으면 가장 가까운 것에서 파생하고 알 수 없는 위젯을 버린다. */
function resolveLayout(settings: SatchelSettings, metrics: GridMetrics): Layout {
  const layout = layoutForColumns(settings.layouts, metrics, minSizeOf)
  return dropUnknownWidgets(layout, isKnownWidget)
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
    const settings = get().settings
    const layout = resolveLayout(settings, metrics)
    set({ metrics, settings: persist(settings, layout) })
  },

  setMode: (mode) => set({ mode, notice: null }),

  setToolbarPosition: (toolbarPosition) => {
    const settings = { ...get().settings, toolbarPosition }
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

    const next = addWidget(
      layout,
      definitionId,
      definition.defaultSize,
      metrics,
      crypto.randomUUID(),
    )
    if (!next) {
      // 조용히 실패하면 버튼이 고장난 것으로 보인다.
      set({ notice: '자리가 없다. 다른 연장을 치우거나 크기를 줄여라.' })
      return
    }
    set({ settings: persist(settings, next), notice: null })
  },

  removeWidgetInstance: (instanceId) => {
    const { settings, metrics } = get()
    const next = removeWidget(resolveLayout(settings, metrics), instanceId)
    set({ settings: persist(settings, next), notice: null })
  },

  moveOrResize: (instanceId, next) => {
    const { settings, metrics } = get()
    const updated = updatePlacement(resolveLayout(settings, metrics), instanceId, next, metrics)
    if (!updated) return false
    set({ settings: persist(settings, updated) })
    return true
  },

  resetLayout: () => {
    const { settings, metrics } = get()
    set({ settings: persist(settings, { columns: metrics.columns, widgets: [] }), notice: null })
  },

  clearNotice: () => set({ notice: null }),

  currentLayout: () => resolveLayout(get().settings, get().metrics),

  countOf: (definitionId) =>
    resolveLayout(get().settings, get().metrics).widgets.filter(
      (w) => w.definitionId === definitionId,
    ).length,
}))
