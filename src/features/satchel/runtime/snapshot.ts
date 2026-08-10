import { cardKind, type Card, type DeckState } from '../widgets/deck/deck'
import { useAttackDeckStore } from '../widgets/deck/deckStore'
import type { ElementState } from '../widgets/elements/elements'
import { useElementStore } from '../widgets/elements/elementStore'
import { clampValue, type HpXp } from '../widgets/hpxp/hpxp'
import { useHpXpStore } from '../widgets/hpxp/hpxpStore'
import { clampGold } from '../widgets/gold/gold'
import { useGoldStore } from '../widgets/gold/goldStore'
import { FIRST_ROUND, MAX_ROUND, useRoundStore } from '../widgets/round/roundStore'

/**
 * 도구 런타임 상태를 한 뭉치로.
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ **판 위의 사실 전부를 한 장에 담는다.**                                   │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * 원소·라운드·HP/XP·보정 덱은 각자 스토어에 흩어져 있다. 흩어진 채로는 어디에도
 * 실어 나를 수 없다 — 새로고침을 견디려면 저장해야 하고, 파티원과 나누려면
 * 보내야 한다. 실어 나를 수 있는 모양이 이것이다.
 *
 * **여전히 메모리가 정본이다**(SPEC 5.2). 이 뭉치는 스토어를 대신하지 않고
 * 스토어에서 떠온 사본이다.
 *
 * **판이 끝나면 남지 않는다는 선은 그대로다.** 뭉치를 어디에 두느냐가 그것을
 * 정한다 — `sessionStorage`(탭을 닫으면 사라짐)와 전투 표(전투를 닫으면
 * 지워짐)뿐이며, `localStorage`나 IndexedDB에는 두지 않는다.
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ **모양이 바뀌면 `VERSION`을 올린다.**                                     │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * 알 수 없는 판은 통째로 버린다. 반쯤 알아본 판으로 복원하면 원소는 살아나고
 * 라운드는 1로 돌아가는 꼴이 나는데, **어긋난 판보다 빈 판이 낫다** — 사람이
 * 실물을 보고 다시 맞추면 되지만, 어긋난 줄 모르면 못 맞춘다.
 */
export const RUNTIME_VERSION = 1

export interface RuntimeSnapshot {
  v: number
  /**
   * 이 판을 마지막으로 건드린 시각. 기기가 찍는다.
   *
   * **방에 들어갈 때 어느 쪽을 쓸지 가리는 데만 쓴다.** 방 안에서 오가는 동안에는
   * 늦게 온 것이 그냥 이긴다 — 몇 초 단위로 여럿이 만지는 자리라 시각을 견주면
   * 손가락이 미끄러진다(구현 결정 22).
   *
   * 옛 저장물에는 없다. 그때는 0이고, **빈 판은 어차피 남의 것을 밀어내지
   * 못하므로** 0짜리가 알맹이 있는 것을 지우지 않는다.
   */
  at: number
  /** 원소 여섯. 꺼진 것은 담지 않는다 — 없는 것을 꺼짐으로 읽는다. */
  elements: Record<string, ElementState>
  round: number
  /** 지금은 위젯 인스턴스가 열쇠다. 전투 공유에서 캐릭터로 옮긴다. */
  hpxp: Record<string, HpXp>
  decks: Record<string, DeckState>
  /** 주운 금화. 열쇠는 HP/XP와 같다(캐릭터를 골랐으면 그 id). */
  gold: Record<string, number>
}

export function emptyRuntime(): RuntimeSnapshot {
  return {
    v: RUNTIME_VERSION,
    at: 0,
    elements: {},
    round: FIRST_ROUND,
    hpxp: {},
    decks: {},
    gold: {},
  }
}

/* --------------------------------------------------------------------------
   떠오기
   -------------------------------------------------------------------------- */

/** 지금 판 위의 사실을 한 장으로 뜬다. */
export function captureRuntime(): RuntimeSnapshot {
  return {
    v: RUNTIME_VERSION,
    at: Date.now(),
    elements: useElementStore.getState().elements,
    round: useRoundStore.getState().round,
    hpxp: useHpXpStore.getState().byInstance,
    decks: useAttackDeckStore.getState().byInstance,
    gold: useGoldStore.getState().bySlot,
  }
}

/** 아직 아무도 아무것도 안 건드린 판인가 — 저장할 것이 없다는 뜻이다. */
export function isEmptyRuntime(snapshot: RuntimeSnapshot): boolean {
  return (
    Object.keys(snapshot.elements).length === 0 &&
    snapshot.round === FIRST_ROUND &&
    Object.keys(snapshot.hpxp).length === 0 &&
    Object.keys(snapshot.decks).length === 0 &&
    Object.keys(snapshot.gold).length === 0
  )
}

/* --------------------------------------------------------------------------
   되돌려 놓기
   -------------------------------------------------------------------------- */

/**
 * 뜬 것을 스토어에 도로 앉힌다.
 *
 * **라운드를 마지막에 앉힌다.** `roundStore.advance`가 원소를 하강시키고 덱을
 * 섞으므로(구현 결정 34), 순서를 잘못 잡으면 복원하다가 판을 한 라운드 굴린다.
 * 여기서는 `advance`가 아니라 값을 직접 앉히는 `hydrate`를 쓰므로 그 일이
 * 일어나지 않지만, 순서를 지켜 두면 나중에 누가 고쳐도 안전하다.
 */
export function restoreRuntime(snapshot: RuntimeSnapshot): void {
  useElementStore.getState().hydrate(snapshot.elements)
  useHpXpStore.getState().hydrate(snapshot.hpxp)
  useAttackDeckStore.getState().hydrate(snapshot.decks)
  useGoldStore.getState().hydrate(snapshot.gold)
  useRoundStore.getState().hydrate(snapshot.round)
}

/* --------------------------------------------------------------------------
   거르기 — 저장소에서도 서버에서도 이걸 통과해야 들어온다
   -------------------------------------------------------------------------- */

function isElementState(value: unknown): value is ElementState {
  return value === 'strong' || value === 'waning' || value === 'inert'
}

/**
 * 카드 한 장.
 *
 * `effect`와 `shuffleAfter`는 **저장된 것을 믿지 않고 종류표에서 다시 읽는다.**
 * 둘은 `kindId`에서 나오는 값이라 저장물에 든 것은 사본일 뿐이고, 사본이 표와
 * 어긋나면 화면에 뜬 그림과 실제로 셈하는 값이 달라진다.
 */
function salvageCard(value: unknown): Card | null {
  if (typeof value !== 'object' || value === null) return null
  const raw = value as Partial<Card>
  if (typeof raw.id !== 'string' || typeof raw.kindId !== 'string') return null
  const kind = cardKind(raw.kindId)
  if (!kind) return null
  return { id: raw.id, kindId: kind.id, effect: kind.effect, shuffleAfter: kind.shuffleAfter }
}

function salvageDeck(value: unknown): DeckState | null {
  if (typeof value !== 'object' || value === null) return null
  const raw = value as Partial<DeckState>
  if (!Array.isArray(raw.draw) || !Array.isArray(raw.discard)) return null

  const draw = raw.draw.map(salvageCard).filter((c): c is Card => c !== null)
  const discard = raw.discard.map(salvageCard).filter((c): c is Card => c !== null)

  // 한 장도 못 알아봤으면 덱이 아니다. 빈 덱을 앉히면 뽑을 것이 없는 채로
  // 섞기도 안 뜨는 막힌 상태가 된다.
  if (draw.length === 0 && discard.length === 0) return null
  return { draw, discard }
}

/**
 * 어디서 온 것이든 쓸 수 있는 판으로 다듬는다.
 *
 * 저장소에서 읽은 것도, 서버가 준 것도, 파티원이 보낸 것도 여기를 지난다 —
 * **걸러내는 자리가 하나여야** 두 벌이 어긋나지 않는다.
 */
export function sanitizeRuntime(parsed: unknown): RuntimeSnapshot {
  const fallback = emptyRuntime()
  if (typeof parsed !== 'object' || parsed === null) return fallback

  const raw = parsed as Partial<RuntimeSnapshot>
  // 모르는 판은 통째로 버린다. 어긋난 판보다 빈 판이 낫다.
  if (raw.v !== RUNTIME_VERSION) return fallback

  const elements: Record<string, ElementState> = {}
  if (typeof raw.elements === 'object' && raw.elements !== null) {
    for (const [id, state] of Object.entries(raw.elements)) {
      // 꺼진 것은 담지 않는다 — `stateOf`가 없는 것을 꺼짐으로 읽는다.
      if (isElementState(state) && state !== 'inert') elements[id] = state
    }
  }

  const round =
    typeof raw.round === 'number' && Number.isFinite(raw.round)
      ? Math.min(MAX_ROUND, Math.max(FIRST_ROUND, Math.trunc(raw.round)))
      : FIRST_ROUND

  const hpxp: Record<string, HpXp> = {}
  if (typeof raw.hpxp === 'object' && raw.hpxp !== null) {
    for (const [key, value] of Object.entries(raw.hpxp)) {
      if (typeof value !== 'object' || value === null) continue
      const { hp, xp } = value as Partial<HpXp>
      hpxp[key] = {
        hp: clampValue(typeof hp === 'number' ? hp : 0),
        xp: clampValue(typeof xp === 'number' ? xp : 0),
      }
    }
  }

  const decks: Record<string, DeckState> = {}
  if (typeof raw.decks === 'object' && raw.decks !== null) {
    for (const [key, value] of Object.entries(raw.decks)) {
      const deck = salvageDeck(value)
      if (deck) decks[key] = deck
    }
  }

  const gold: Record<string, number> = {}
  if (typeof raw.gold === 'object' && raw.gold !== null) {
    for (const [key, value] of Object.entries(raw.gold)) {
      // 0은 담지 않는다 — 없는 것을 0으로 읽으므로 결과는 같고 쌓이지 않는다.
      const amount = clampGold(typeof value === 'number' ? value : 0)
      if (amount > 0) gold[key] = amount
    }
  }

  const at = typeof raw.at === 'number' && Number.isFinite(raw.at) && raw.at > 0 ? raw.at : 0

  return { v: RUNTIME_VERSION, at, elements, round, hpxp, decks, gold }
}

/* --------------------------------------------------------------------------
   방에 들어갈 때 — 어느 쪽 판을 쓸 것인가
   -------------------------------------------------------------------------- */

/** 맞춘 결과. `adopt`가 있으면 그것을 앉히고, `push`면 내 것을 올린다. */
export interface RuntimeReconciled {
  adopt: RuntimeSnapshot | null
  push: boolean
}

/**
 * 방의 판과 내 판을 맞춘다.
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ **빈 것이 알맹이를 밀어내지 못한다.**                                     │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * 새 기기에서 처음 열면 빈 판이 만들어지는데, 그것이 올라가면 다른 기기에서
 * 돌리던 게임이 지워진다. **잃지 않으려고 서버에 두는 것인데 그 길로 잃는다** —
 * 행낭 설정에서 겪은 것과 같은 자리다.
 *
 * 그 뒤로는 늦게 건드린 쪽이 이긴다. 시각을 모르는 옛 저장물(0)은 진다.
 */
export function reconcileRuntime(
  local: RuntimeSnapshot,
  remote: RuntimeSnapshot | null,
): RuntimeReconciled {
  const localEmpty = isEmptyRuntime(local)

  if (remote === null || isEmptyRuntime(remote)) return { adopt: null, push: !localEmpty }
  if (localEmpty) return { adopt: remote, push: false }

  if (local.at > remote.at) return { adopt: null, push: true }
  if (local.at === remote.at) return { adopt: null, push: false }
  return { adopt: remote, push: false }
}
