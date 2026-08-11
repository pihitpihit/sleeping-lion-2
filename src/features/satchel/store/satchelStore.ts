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
import { EchoGuard, watchRow, type Subscription } from '../changes'
import { sanitizeSettings } from '../layout'
import { fetchSettings, pushSettings, reconcile } from './satchelNet'

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
  /**
   * 지금 배치를 보고 있는 계정.
   *
   * **행낭 배치는 사람의 것이지 기기의 것이 아니다.** 열쇠가 하나였을 때는 한
   * 기기에서 계정을 바꿔 들어가면 앞 사람의 배치가 그대로 보였다.
   */
  accountId: string | null
  settings: SatchelSettings
  metrics: GridMetrics
  mode: SatchelMode
  /** 자리를 못 찾았을 때처럼 사용자에게 알려야 하는 한마디. */
  notice: string | null
  /** 되돌리기 이력. 영속하지 않는다 — 지금 편집 중인 것에 대한 상태다. */
  past: Layout[]

  /** 로그인한 사람이 바뀌면 그 사람의 배치를 다시 읽는다. */
  setAccount: (accountId: string | null) => void
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
   * 격자에 빈칸이 하나라도 있는가 — 도구 띠가 단추를 잠글지 정한다.
   *
   * ┌──────────────────────────────────────────────────────────────────────────┐
   * │ **잠글 때는 다 함께 잠근다.** 위젯별로 가려 잠그지 않는다.                 │
   * └──────────────────────────────────────────────────────────────────────────┘
   *
   * 한때 "이 위젯이 지금 들어갈 수 있는가"로 하나씩 잠갔다. 그러면 띠에 켜진
   * 단추와 꺼진 단추가 섞여 왜 이건 되고 저건 안 되는지 알 수 없다. 게다가
   * 자리가 모자란 위젯은 이제 설정을 줄여 놓을 수 있으므로(`pendingAdd`)
   * 잠그는 것이 사실과도 어긋난다.
   *
   * **빈칸이 아예 없을 때만 일괄로 잠근다.** 그때는 어떤 위젯도 못 들어간다 —
   * 크기를 아무리 줄여도 1×1은 되어야 하기 때문이다.
   */
  hasRoom: () => boolean

  /**
   * 자리가 모자라 **놓기 전에 설정을 묻고 있는** 위젯.
   *
   * 아직 격자에 없다. 사용자가 설정을 줄여 들어갈 만해지면 그때 놓는다.
   */
  pendingAdd: { definitionId: string; settings: unknown } | null
  setPendingSettings: (next: unknown) => void
  /** 지금 설정으로 놓을 수 있는가 — '놓기' 단추를 살릴지 정한다. */
  canPlacePending: () => boolean
  confirmPendingAdd: () => void
  cancelPendingAdd: () => void
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

/**
 * 기본 크기에서 최소 크기까지 훑어 놓아 본다. 못 놓으면 `null`.
 *
 * **놓는 자리와 놓을 수 있는지 묻는 자리가 이 함수 하나를 본다.** 갈리면
 * "눌리는데 안 되는" 또는 "안 눌리는데 될 뻔한" 자리가 생긴다.
 *
 * 눕힌 것도 후보에 들어간다(`sizeCandidates`). 원소 트래커는 긴 쪽이 6칸이어야
 * 하는데 폰은 4열뿐이라, 돌려보지 않으면 폰에서 아예 못 쓴다.
 */
function placeWidget(
  layout: Layout,
  definition: { id: string; defaultSize: Size2; minSize: Size2 },
  widgetSettings: unknown,
  metrics: GridMetrics,
  instanceId: string,
): Layout | null {
  for (const size of sizeCandidates(definition.defaultSize, definition.minSize, metrics)) {
    if (!isSizeAllowedFor(definition.id, size, widgetSettings)) continue
    const next = addWidget(layout, definition.id, size, metrics, instanceId)
    if (next) return next
  }
  return null
}

/** 이력에 한 장 쌓는다. 오래된 것부터 버려 길이를 묶어 둔다. */
function pushHistory(past: Layout[], snapshot: Layout): Layout[] {
  const next = [...past, snapshot]
  return next.length > HISTORY_LIMIT ? next.slice(next.length - HISTORY_LIMIT) : next
}

/* --------------------------------------------------------------------------
   저장 — 로컬이 먼저, 서버는 뒤따라
   --------------------------------------------------------------------------
   **로컬 저장은 곧바로 한다.** 손을 뗀 순간 남아야 하고, 신호가 없어도 그래야
   한다(절대 원칙 3).

   **서버는 늦춰서 한 번만 보낸다.** 위젯 하나를 옮기면 여러 조작이 잇달아
   들어오는데(놓기 → 크기 → 회전) 그때마다 요청을 띄우면 마지막 것이 먼저
   도착하는 일이 생긴다. 잠잠해질 때까지 기다렸다가 **가장 최근 것 하나만** 보낸다.
   -------------------------------------------------------------------------- */

/**
 * 조작이 잇달아 들어올 때 잠잠해지기를 기다리는 시간.
 *
 * **표에 쓰는 것이 곧 다른 기기로 가는 것이다.** 여기서 오래 끌면 그만큼 늦게
 * 따라온다. 위젯 하나를 옮기면 조작이 잇달아 들어오므로(놓기 → 크기 → 회전)
 * 묶기는 해야 한다.
 */
const PUSH_DELAY_MS = 600

let pushTimer: ReturnType<typeof setTimeout> | null = null

function schedulePush(settings: SatchelSettings, accountId: string | null): void {
  if (accountId === null || applyingRemote) return
  if (pushTimer !== null) clearTimeout(pushTimer)
  pushTimer = setTimeout(() => {
    pushTimer = null
    void (async () => {
      // 올리기 **전에** 적어 둔다. 서버가 밀어주는 것이 응답보다 먼저 올 수 있다.
      echo.remember(settings.updatedAt)
      // 실패해도 아무 말 하지 않는다. 행낭은 서버 없이 완전히 돌고, 다음에 고칠 때
      // 뭉치째 다시 올라간다.
      await pushSettings(accountId, settings)
    })()
  }, PUSH_DELAY_MS)
}

/* --------------------------------------------------------------------------
   다른 기기 따라가기
   --------------------------------------------------------------------------
   **표에 얹는 것만으로는 옆에 켜 둔 기기가 모른다.** 다시 열기 전까지 표를 읽지
   않으므로, 한쪽에서 위젯을 옮겨도 계속 옛 배치를 보여준다.

   서버가 표 변경을 직접 밀어준다(`changes.ts`). 밀기 전에 RLS로 자격을 보므로
   **제 것만 온다.**
   -------------------------------------------------------------------------- */

/** 받아서 앉히는 중 — 되돌려 올리지 않는다. */
let applyingRemote = false
/** 내가 올린 것이 되돌아오는 것을 가려낸다. */
const echo = new EchoGuard()
let watching: Subscription | null = null

/**
 * 다른 기기가 구성을 고치면 받는다.
 *
 * **값이 함께 온다** — 서버가 밀기 전에 RLS로 자격을 보므로(`changes.ts`) 제
 * 것만 온다. 예전에는 "바뀌었다"는 신호만 받고 표를 다시 읽었는데, 그 왕복이
 * 사라졌다.
 */
function watchSettings(accountId: string | null): void {
  watching?.close()
  watching = null
  if (accountId === null) return

  watching = watchRow(
    `satchel-settings:${accountId}`,
    'satchel_settings',
    `user_id=eq.${accountId}`,
    (row) => sanitizeSettings(row.settings),
    (incoming) => {
      // 내가 올린 그것이 돌아온 것이면 버린다. 그대로 앉히면 그새 또 고친 것이
      // 옛 값으로 덮인다.
      if (echo.isEcho(incoming.updatedAt)) return

      /**
       * **시각을 견주지 않고 그냥 앉힌다.** 내 다른 기기가 방금 쓴 것이므로
       * 그것이 가장 최근이다. 견주면 이 기기의 시계가 앞서 있을 때 남의 것을
       * 영영 안 받는다.
       */
      applyingRemote = true
      try {
        // 로컬에도 남긴다. 다음에 이 기기를 열 때 서버를 못 읽어도 최신이다.
        saveSettings(incoming, accountId)
        useSatchelStore.setState({ settings: incoming, past: [] })
      } finally {
        applyingRemote = false
      }
    },
  )
}

/**
 * 사람이 고친 것을 확정한다 — 시각을 찍고, 로컬에 쓰고, 서버로 보낼 것을 예약한다.
 *
 * **시각을 여기 한 곳에서 찍는다.** 찍는 자리가 흩어지면 어떤 경로로 고쳤을 때만
 * 시각이 안 오르고, 그 기기는 다른 기기와 맞출 때 영영 진다.
 */
function commit(settings: SatchelSettings, accountId: string | null): SatchelSettings {
  const stamped: SatchelSettings = { ...settings, updatedAt: Date.now() }
  saveSettings(stamped, accountId)
  schedulePush(stamped, accountId)
  return stamped
}

/**
 * 격자가 바뀌어 새로 뽑아낸 배치를 남긴다.
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ **이것은 사람이 고친 것이 아니다. 시각을 찍지도 올려보내지도 않는다.**    │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * 행낭을 열면 화면 크기를 재는 순간 열 수가 정해지고, 그 열 수의 배치가 없으면
 * 가까운 것에서 뽑아낸다. **여는 것만으로 일어나는 일이다.**
 *
 * 이것을 편집으로 세었더니 브라우저 두 개가 각자 열자마자 제 시각을 찍고 서로
 * 밀어냈다 — 둘 다 "내가 방금 고쳤다"고 주장하니 어느 쪽도 남의 것을 받지
 * 않았다. 형님이 "행낭 구성은 브라우저마다 다르다"고 짚은 자리다.
 *
 * 뽑아낸 결과는 로컬에만 남긴다. **다른 기기도 같은 원본에서 같은 것을 뽑아내므로**
 * 굳이 나를 것이 없고, 화면 크기는 원래 기기마다 다르다.
 */
function derive(
  settings: SatchelSettings,
  layout: Layout,
  accountId: string | null,
): SatchelSettings {
  if (layout.columns <= 0) return settings
  const next: SatchelSettings = {
    ...settings,
    layouts: { ...settings.layouts, [layout.columns]: layout },
  }
  saveSettings(next, accountId)
  return next
}

function persist(
  settings: SatchelSettings,
  layout: Layout,
  accountId: string | null,
): SatchelSettings {
  if (layout.columns <= 0) return settings
  return commit(
    { ...settings, layouts: { ...settings.layouts, [layout.columns]: layout } },
    accountId,
  )
}

export const useSatchelStore = create<SatchelState>((set, get) => ({
  // 누구인지 알기 전에는 손님의 것을 본다. 세션이 붙으면 `setAccount`가 바꾼다.
  accountId: null,
  settings: loadSettings(null),
  metrics: EMPTY_METRICS,
  // 행낭을 여는 이유는 쓰려는 것이지 꾸미려는 것이 아니다. 마지막 모드를 기억하면
  // 편집 중 나갔다가 다음 판에 편집 모드로 열린다.
  mode: 'play',
  notice: null,
  past: [],
  pendingAdd: null,

  setAccount: (accountId) => {
    if (get().accountId === accountId) return
    // 이력도 버린다 — 남의 배치로 되돌리는 일이 있어서는 안 된다.
    const local = loadSettings(accountId)
    set({ accountId, settings: local, past: [], notice: null })
    watchSettings(accountId)

    /**
     * **로컬을 먼저 띄우고 서버는 뒤따라 맞춘다.**
     *
     * 서버를 기다렸다가 그리면 신호 없는 자리에서 행낭이 통째로 멎는다 —
     * 절대 원칙 3이 막는 바로 그 꼴이다. 지하에서 세 시간씩 하는 게임이다.
     *
     * 왕복이 끝난 뒤 계정이 또 바뀌었으면 결과를 버린다. 로그아웃하고 다른
     * 계정으로 들어간 사이에 앞 사람의 배치가 늦게 도착해 덮는 일을 막는다.
     */
    void (async () => {
      const remote = await fetchSettings(accountId)
      if (get().accountId !== accountId) return

      const { adopt, push } = reconcile(get().settings, remote)
      if (adopt) {
        // 서버 것을 그대로 앉힌다. 시각도 그쪽 것을 물려받아야 다음 판정이
        // 어긋나지 않는다 — `commit`으로 찍으면 이 기기가 고친 것이 되어버린다.
        saveSettings(adopt, accountId)
        set({ settings: adopt, past: [] })
      } else if (push) {
        // 여기서도 적어 둔다. 안 적으면 방금 올린 것이 되돌아와 `past`를 비운다.
        const mine = get().settings
        echo.remember(mine.updatedAt)
        void pushSettings(accountId, mine)
      }
    })()
  },

  setBoardSize: (size) => {
    const metrics = computeGridMetrics(size)
    const previous = get().metrics
    if (
      metrics.columns === previous.columns &&
      metrics.rows === previous.rows &&
      metrics.cellWidth === previous.cellWidth &&
      metrics.cellHeight === previous.cellHeight
    ) {
      // 여백만 달라진 경우에도 그리기에는 반영돼야 한다.
      set({ metrics })
      return
    }

    // 격자가 바뀌었다. 파생 결과를 저장해 두면 이후로는 독립적으로 편집된다.
    // 이력은 버린다 — 다른 격자에서 만든 배치로 되돌리면 좌표가 맞지 않는다.
    const settings = get().settings
    const layout = resolveLayout(settings, metrics)
    set({ metrics, settings: derive(settings, layout, get().accountId), past: [] })
  },

  setMode: (mode) => set({ mode, notice: null }),

  setToolbarPreference: (toolbarPosition) => {
    const settings = { ...get().settings, toolbarPosition }
    set({ settings: commit(settings, get().accountId) })
  },

  toggleWidgetTitles: () => {
    const settings = { ...get().settings, showWidgetTitles: !get().settings.showWidgetTitles }
    set({ settings: commit(settings, get().accountId) })
  },

  setWidgetSettings: (instanceId, next) => {
    const settings = {
      ...get().settings,
      widgetSettings: { ...get().settings.widgetSettings, [instanceId]: next },
    }
    set({ settings: commit(settings, get().accountId) })
  },

  rotateWidget: (instanceId) => {
    const current = get().settings.widgetRotations[instanceId] ?? 0
    const settings = {
      ...get().settings,
      widgetRotations: { ...get().settings.widgetRotations, [instanceId]: nextRotation(current) },
    }
    set({ settings: commit(settings, get().accountId) })
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

    const fresh = definition.settings?.sanitize(undefined)
    const next = placeWidget(layout, definition, fresh, metrics, crypto.randomUUID())

    if (!next) {
      /**
       * 기본 설정으로는 안 들어간다.
       *
       * **설정이 있는 위젯이면 놓기 전에 묻는다.** 원소 트래커의 최소 크기는
       * '보이는 원소 수'가 정하는데, 그 수는 인스턴스 설정이고 인스턴스는 놓아야
       * 생긴다 — 순환이다. 설정을 먼저 받아 그 고리를 끊는다.
       *
       * **자리가 모자랄 때만 이 길로 온다.** 평소에는 묻지 않고 그냥 놓는다.
       *
       * 설정이 없는 위젯은 사용자가 손볼 것이 없으므로 그냥 알린다.
       */
      if (definition.settings) {
        set({ pendingAdd: { definitionId, settings: fresh }, notice: null })
      } else {
        set({ notice: `${definition.name}을(를) 놓을 자리가 모자라다.` })
      }
      return
    }
    set({
      settings: persist(settings, next, get().accountId),
      notice: null,
      past: pushHistory(get().past, layout),
    })
  },

  setPendingSettings: (next) => {
    const pending = get().pendingAdd
    if (!pending) return
    set({ pendingAdd: { ...pending, settings: next } })
  },

  cancelPendingAdd: () => set({ pendingAdd: null }),

  canPlacePending: () => {
    const { pendingAdd, settings, metrics } = get()
    if (!pendingAdd) return false
    const definition = getWidgetDefinition(pendingAdd.definitionId)
    if (!definition) return false
    const layout = resolveLayout(settings, metrics)
    return placeWidget(layout, definition, pendingAdd.settings, metrics, 'probe') !== null
  },

  confirmPendingAdd: () => {
    const { pendingAdd, settings, metrics } = get()
    if (!pendingAdd) return
    const definition = getWidgetDefinition(pendingAdd.definitionId)
    if (!definition) {
      set({ pendingAdd: null })
      return
    }

    const layout = resolveLayout(settings, metrics)
    const instanceId = crypto.randomUUID()
    const next = placeWidget(layout, definition, pendingAdd.settings, metrics, instanceId)
    if (!next) {
      // 줄이는 중에도 아직 모자라다. 팝업은 열어 둔다 — 닫아버리면 방금 고친
      // 것이 날아간다.
      set({ notice: '아직 자리가 모자라다. 더 줄여라.' })
      return
    }

    // 고른 설정을 새 인스턴스에 함께 얹는다. 이것을 빠뜨리면 놓자마자 기본값으로
    // 돌아가 다시 크기 제약에 걸린다.
    const withSettings: SatchelSettings = {
      ...settings,
      widgetSettings: { ...settings.widgetSettings, [instanceId]: pendingAdd.settings },
    }
    set({
      settings: persist(withSettings, next, get().accountId),
      pendingAdd: null,
      notice: null,
      past: pushHistory(get().past, layout),
    })
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
      settings: persist({ ...settings, widgetSettings, widgetRotations }, next, get().accountId),
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
    set({
      settings: persist(settings, updated, get().accountId),
      past: pushHistory(get().past, before),
    })
    return true
  },

  // 메뉴에서는 잠시 뺐다. 되돌리기가 붙은 뒤로 급하지 않고, 실수로 누르면
  // 잃는 것이 크다. 필요해지면 다시 노출한다.
  resetLayout: () => {
    const { settings, metrics } = get()
    const before = resolveLayout(settings, metrics)
    set({
      settings: persist(settings, { columns: metrics.columns, widgets: [] }, get().accountId),
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
      settings: persist(settings, previous, get().accountId),
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

  hasRoom: () => {
    const { settings, metrics } = get()
    return hasFreeCell(resolveLayout(settings, metrics).widgets, metrics)
  },
}))
