import { useEffect, useState } from 'react'
import { BattlePanel } from './battle/BattlePanel'
import { useBattleStore } from './battle/battleStore'
import { useBoardSize } from './useBoardSize'
import { useViewportSize } from './useViewportSize'
import { useAuthStore } from '../auth/authStore'
import { useSatchelStore } from './store/satchelStore'
import { resolveToolbarPosition } from './toolbar/position'
import { SatchelToolbar } from './toolbar/SatchelToolbar'
import { WidgetBoard } from './board/WidgetBoard'
import { WidgetSettingsDialog } from './board/WidgetSettingsDialog'
import { CloseIcon } from './board/frameIcons'
import { getWidgetDefinition } from './widgets/registry'
import './SatchelPage.css'

/**
 * 행낭 — 위젯 보드.
 *
 * 보드는 스크롤되지 않는다. 격자가 화면에 꽉 차고 위젯이 그 안에 들어가는 구조라
 * 넘칠 곳이 없어야 한다.
 */
export function SatchelPage() {
  const { ref: boardRef, size } = useBoardSize<HTMLDivElement>()
  const viewport = useViewportSize()

  const metrics = useSatchelStore((s) => s.metrics)
  const settings = useSatchelStore((s) => s.settings)
  const mode = useSatchelStore((s) => s.mode)
  const notice = useSatchelStore((s) => s.notice)
  const past = useSatchelStore((s) => s.past)
  const setBoardSize = useSatchelStore((s) => s.setBoardSize)
  const setAccount = useSatchelStore((s) => s.setAccount)
  const setMode = useSatchelStore((s) => s.setMode)
  const setToolbarPreference = useSatchelStore((s) => s.setToolbarPreference)
  const toggleWidgetTitles = useSatchelStore((s) => s.toggleWidgetTitles)
  const addWidgetOfType = useSatchelStore((s) => s.addWidgetOfType)
  const removeWidgetInstance = useSatchelStore((s) => s.removeWidgetInstance)
  const moveOrResize = useSatchelStore((s) => s.moveOrResize)
  const clearNotice = useSatchelStore((s) => s.clearNotice)
  const undo = useSatchelStore((s) => s.undo)
  const currentLayout = useSatchelStore((s) => s.currentLayout)
  const countOf = useSatchelStore((s) => s.countOf)
  const hasRoom = useSatchelStore((s) => s.hasRoom)
  const pendingAdd = useSatchelStore((s) => s.pendingAdd)
  const setPendingSettings = useSatchelStore((s) => s.setPendingSettings)
  const canPlacePending = useSatchelStore((s) => s.canPlacePending)
  const confirmPendingAdd = useSatchelStore((s) => s.confirmPendingAdd)
  const cancelPendingAdd = useSatchelStore((s) => s.cancelPendingAdd)
  const settingsFor = useSatchelStore((s) => s.settingsFor)
  const rotationOf = useSatchelStore((s) => s.rotationOf)
  const rotateWidget = useSatchelStore((s) => s.rotateWidget)
  const setWidgetSettings = useSatchelStore((s) => s.setWidgetSettings)

  /** 설정 팝업을 연 위젯. 편집 모드 전용이다. */
  const [settingsTarget, setSettingsTarget] = useState<string | null>(null)

  /**
   * 전투 팝업.
   *
   * **편집 모드와 무관하다.** 판에 앉는 것은 배치를 고치는 일이 아니라 놀이를
   * 시작하는 일이다 — 플레이 중에 열려야 한다.
   */
  const [battleOpen, setBattleOpen] = useState(false)
  const inBattle = useBattleStore((s) => s.battle !== null)
  const resumeBattle = useBattleStore((s) => s.resume)
  const enterSolo = useBattleStore((s) => s.enterSolo)

  /**
   * 누구의 행낭인지 먼저 정한다.
   *
   * **배치는 사람의 것이지 기기의 것이 아니다.** 열쇠가 하나였을 때는 한 기기에서
   * 계정을 바꿔 들어가면 앞 사람의 배치가 그대로 보였다.
   *
   * 크기를 재기 전에 둔다 — 순서가 뒤바뀌면 남의 배치로 격자를 계산했다가
   * 곧바로 갈아치우게 되고, 그 사이에 화면이 한 번 깜빡인다.
   */
  const accountId = useAuthStore((s) => s.session?.userId ?? null)
  useEffect(() => {
    setAccount(accountId)
  }, [accountId, setAccount])

  /**
   * 앉아 있던 판으로 되돌아간다.
   *
   * 새로고침하면 화면은 전투를 잊지만 서버에는 앉아 있다고 남아 있다. 그대로
   * 두면 **본인은 공유 중인 줄 아는데 조작이 아무에게도 안 가는** 상태가 된다.
   */
  useEffect(() => {
    if (accountId === null) return
    /**
     * **앉아 있던 전투를 먼저 살피고, 없으면 내 계정 방으로 들어간다.**
     *
     * 순서가 중요하다. 내 방에 먼저 들어갔다가 전투로 옮기면 그 사이에 내
     * 판이 계정 방에 올라가는데, 전투 값을 물려받은 뒤라면 **남들이 굴린 판이
     * 내 계정 방에 새어 든다.**
     */
    void (async () => {
      await resumeBattle(accountId)
      await enterSolo(accountId)
    })()
  }, [accountId, resumeBattle, enterSolo])

  useEffect(() => {
    if (size.width > 0 && size.height > 0) setBoardSize(size)
  }, [size, setBoardSize])

  // 편집 중 되돌리기 단축키. 관용대로 Ctrl/Cmd+Z.
  useEffect(() => {
    if (mode !== 'edit') return
    function onKey(event: globalThis.KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z') {
        event.preventDefault()
        undo()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [mode, undo])

  const position = resolveToolbarPosition(settings.toolbarPosition, viewport)
  const layout = currentLayout()
  const empty = layout.widgets.length === 0

  // 편집을 벗어나거나 그 위젯이 사라지면 팝업도 닫힌다.
  const target = layout.widgets.find((w) => w.instanceId === settingsTarget)
  const targetDefinition =
    target && mode === 'edit' ? getWidgetDefinition(target.definitionId) : undefined

  // 놓기 전 설정도 편집 모드의 것이다. 플레이로 돌아가면 함께 접는다.
  const pendingDefinition =
    pendingAdd && mode === 'edit' ? getWidgetDefinition(pendingAdd.definitionId) : undefined

  return (
    <div className={`satchel satchel--${position} satchel--${mode}`}>
      <SatchelToolbar
        position={position}
        preference={settings.toolbarPosition}
        mode={mode}
        canUndo={past.length > 0}
        showWidgetTitles={settings.showWidgetTitles}
        countOf={countOf}
        hasRoom={hasRoom()}
        onToggleMode={() => setMode(mode === 'edit' ? 'play' : 'edit')}
        onAdd={addWidgetOfType}
        onSetPreference={setToolbarPreference}
        onToggleWidgetTitles={toggleWidgetTitles}
        onUndo={undo}
        onOpenBattle={() => setBattleOpen(true)}
        inBattle={inBattle}
        /* 기기에서 실제로 잡힌 값. 손으로 셈해 맞히려다 두 번 빗나갔다. */
        gridInfo={`격자 ${metrics.columns}×${metrics.rows} · 칸 ${metrics.cellSize}px · 보드 ${Math.round(size.width)}×${Math.round(size.height)}`}
      />

      <div
        className="satchel__board"
        ref={boardRef}
        data-board-width={Math.round(size.width)}
        data-board-height={Math.round(size.height)}
        data-columns={metrics.columns}
        data-rows={metrics.rows}
      >
        <WidgetBoard
          layout={layout}
          metrics={metrics}
          mode={mode}
          showWidgetTitles={settings.showWidgetTitles}
          settingsOf={settingsFor}
          rotationOf={rotationOf}
          onCommit={moveOrResize}
          onRemove={removeWidgetInstance}
          onOpenSettings={setSettingsTarget}
          onRotate={rotateWidget}
        />

        {empty && (
          <p className="satchel__empty">
            {mode === 'edit' ? '도구 띠에서 골라 놓아라.' : '행낭이 비었다. 고쳐 놓기로 채워라.'}
          </p>
        )}
      </div>

      {target && targetDefinition && (
        <WidgetSettingsDialog
          definition={targetDefinition}
          value={settingsFor(target.instanceId, target.definitionId)}
          onChange={(next) => setWidgetSettings(target.instanceId, next)}
          onClose={() => setSettingsTarget(null)}
        />
      )}

      {/*
        자리가 모자라 **놓기 전에 설정을 묻는** 팝업.

        아직 격자에 없는 위젯이므로 '놓기'를 눌러야 들어간다 — 이미 놓인 위젯의
        설정 팝업이 확인 없이 바로 반영되는 것과 다르다.
      */}
      {pendingAdd && pendingDefinition && (
        <WidgetSettingsDialog
          definition={pendingDefinition}
          value={pendingAdd.settings}
          onChange={setPendingSettings}
          onClose={cancelPendingAdd}
          placing={{ canPlace: canPlacePending(), onPlace: confirmPendingAdd }}
        />
      )}

      {battleOpen && <BattlePanel onClose={() => setBattleOpen(false)} />}

      {notice && (
        <div className="satchel__notice" role="status">
          <span>{notice}</span>
          <button type="button" onClick={clearNotice} aria-label="알림 닫기">
            <CloseIcon size={18} />
          </button>
        </div>
      )}
    </div>
  )
}
