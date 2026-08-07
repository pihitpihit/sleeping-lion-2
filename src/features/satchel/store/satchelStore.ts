import { create } from 'zustand'
import {
  computeGridMetrics,
  EMPTY_METRICS,
  hasFreeCell,
  sizeCandidates,
  type GridMetrics,
  type Placement,
  type Size,
} from '../grid'
import {
  addWidget,
  dropUnknownWidgets,
  layoutForColumns,
  loadSettings,
  nextRotation,
  removeWidget,
  saveSettings,
  updatePlacement,
  type Layout,
  type Rotation,
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
  /** 시계 방향으로 한 칸 돌린다. */
  rotateWidget: (instanceId: string) => void
  addWidgetOfType: (definitionId: string) => void
  removeWidgetInstance: (instanceId: string) => void
  moveOrResize: (instanceId: string, next: Placement) => boolean
  resetLayout: () => void
  clearNotice: () => void
  undo: () => void

  currentLayout: () => Layout
  countOf: (definitionId: string) => number
  /**
   * 지금 이 위젯을 놓을 수 있는가 — 도구 띠가 단추를 잠글지 정한다.
   *
   * **눌러봐야 거절당할 단추는 잠가 두는 편이 정직하다.** 다만 잠그는 판정과
   * 실제로 놓는 판정이 같은 함수를 봐야 한다. 갈리면 "눌리는데 안 되는" 또는
   * "안 눌리는데 될 뻔한" 자리가 생긴다.
   */
  canAdd: (definitionId: string) => boolean
  /** 늘 sanitize를 거친 값. 위젯이 안심하고 자기 타입으로 받는다. */
  settingsFor: (instanceId: string, definitionId: string) => unknown
  rotationOf: (instanceId: string) => Rotation
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

  rotateWidget: (instanceId) => {
    const current = get().settings.widgetRotations[instanceId] ?? 0
    const settings = {
      ...get().settings,
      widgetRotations: { ...get().settings.widgetRotations, [instanceId]: nextRotation(current) },
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
     * **기본 크기에서 최소 크기까지 훑는다.**
     *
     * 처음에는 기본 크기와 그것을 눕힌 것 둘만 시도했다. 그러면 격자에 빈칸이
     * 보이는데도 거절당한다 — 기본이 6×2인 원소 트래커는 2×2 자리가 비어 있어도
     * 못 들어간다. 눈에 보이는 빈칸과 실제로 놓이는지가 어긋나면 단추가 고장난
     * 것으로 읽힌다.
     *
     * 눕힌 것을 함께 보는 이유는 그대로다 — 원소 트래커는 긴 쪽이 6칸이어야
     * 하는데 폰은 4열뿐이라, 돌려보지 않으면 폰에서 아예 못 쓴다.
     */
    const fresh = definition.settings?.sanitize(undefined)
    const candidates = sizeCandidates(definition.defaultSize, definition.minSize, metrics)
    let next: Layout | null = null
    for (const size of candidates) {
      if (!isSizeAllowedFor(definitionId, size, fresh)) continue
      next = addWidget(layout, definitionId, size, metrics, crypto.randomUUID())
      if (next) break
    }

    if (!next) {
      // 조용히 실패하면 버튼이 고장난 것으로 보인다. **왜 안 되는지 가려서
      // 말한다** — 자리가 없는 것과 이 위젯이 그만한 자리를 요구하는 것은
      // 사용자가 할 일이 다르다.
      const fits = candidates.some((size) => isSizeAllowedFor(definitionId, size, fresh))
      set({
        notice: fits
          ? '자리가 없다. 다른 연장을 치우거나 크기를 줄여라.'
          : `${definition.name}은(는) 남은 자리에 들어가기엔 크다.`,
      })
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
    // 회전도 함께 거둔다. 안 그러면 지운 위젯의 방향이 저장소에 쌓인다.
    const { [instanceId]: _removedRotation, ...widgetRotations } = settings.widgetRotations
    void _removed
    set({
      settings: persist({ ...settings, widgetSettings, widgetRotations }, next),
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

  rotationOf: (instanceId) => get().settings.widgetRotations[instanceId] ?? 0,

  countOf: (definitionId) =>
    resolveLayout(get().settings, get().metrics).widgets.filter(
      (w) => w.definitionId === definitionId,
    ).length,

  canAdd: (definitionId) => {
    const { settings, metrics } = get()
    const definition = getWidgetDefinition(definitionId)
    if (!definition) return false

    const layout = resolveLayout(settings, metrics)
    const used = layout.widgets.filter((w) => w.definitionId === definitionId).length
    if (definition.maxInstances != null && used >= definition.maxInstances) return false

    // 빈칸이 아예 없으면 어떤 크기로도 못 들어간다. 값싼 판정부터 한다.
    if (!hasFreeCell(layout.widgets, metrics)) return false

    const fresh = definition.settings?.sanitize(undefined)
    return sizeCandidates(definition.defaultSize, definition.minSize, metrics).some(
      (size) =>
        isSizeAllowedFor(definitionId, size, fresh) &&
        addWidget(layout, definitionId, size, metrics, 'probe') !== null,
    )
  },
}))
