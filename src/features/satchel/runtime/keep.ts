import { useAttackDeckStore } from '../widgets/deck/deckStore'
import { useElementStore } from '../widgets/elements/elementStore'
import { useGoldStore } from '../widgets/gold/goldStore'
import { useHpXpStore } from '../widgets/hpxp/hpxpStore'
import { useRoundStore } from '../widgets/round/roundStore'
import {
  captureRuntime,
  isEmptyRuntime,
  restoreRuntime,
  sanitizeRuntime,
  type RuntimeSnapshot,
} from './snapshot'

/**
 * 판을 새로고침 너머로 잇는다.
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ **`sessionStorage`다. `localStorage`가 아니다.**                          │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * 이 둘의 차이가 곧 SPEC 5.2의 선이다. `sessionStorage`는 **탭을 닫으면
 * 사라진다** — 그래서 "판이 끝나면 어디에도 남지 않는다"를 깨지 않으면서
 * 새로고침만 견딘다. `localStorage`에 두면 다음 주에 앱을 열었을 때 지난 판의
 * 원소가 타오르고 있다.
 *
 * **왜 필요한가.** 지하에서 세 시간 하는 동안 태블릿은 잠기고 브라우저는 탭을
 * 버린다. 손이 미끄러져 당겨 새로고침되기도 한다. 그때마다 라운드와 원소가
 * 처음으로 돌아가면 실물 판과 어긋나고, 어긋난 것을 사람이 기억해서 되맞춰야
 * 한다.
 *
 * **메모리가 정본이라는 것은 그대로다.** 여기 있는 것은 떨어졌을 때 붙잡는
 * 그물이지 저장소가 아니다. 읽는 것은 앱을 켤 때 한 번뿐이다.
 *
 * 전투에 참여하면 판은 서버에서도 오간다(SPEC 5.4). 그때도 이 그물은 그대로
 * 있다 — 서버에 못 닿는 채로 새로고침한 자리를 메운다.
 */

const KEY = 'sl2.satchel.runtime'

/** 조작이 잇달아 들어올 때 잠잠해지기를 기다리는 시간. */
const SAVE_DELAY_MS = 400

interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

function defaultStorage(): StorageLike | null {
  try {
    return globalThis.sessionStorage ?? null
  } catch {
    // 사파리의 사생활 보호 모드 등에서 접근 자체가 던진다.
    return null
  }
}

export function readKept(storage: StorageLike | null = defaultStorage()): RuntimeSnapshot | null {
  if (!storage) return null
  try {
    const raw = storage.getItem(KEY)
    if (!raw) return null
    const snapshot = sanitizeRuntime(JSON.parse(raw))
    // 빈 판은 복원할 것이 없다. 앉히면 괜한 렌더만 한 번 돈다.
    return isEmptyRuntime(snapshot) ? null : snapshot
  } catch {
    return null
  }
}

export function writeKept(
  snapshot: RuntimeSnapshot,
  storage: StorageLike | null = defaultStorage(),
): void {
  if (!storage) return
  try {
    // 빈 판이 되었으면 지운다. 남겨두면 다음에 켤 때 빈 것을 읽어 앉히려 든다.
    if (isEmptyRuntime(snapshot)) storage.removeItem(KEY)
    else storage.setItem(KEY, JSON.stringify(snapshot))
  } catch {
    // 용량 초과나 접근 거부. 그물이 없다고 판이 멈추면 안 된다.
  }
}

/* --------------------------------------------------------------------------
   붙이기
   -------------------------------------------------------------------------- */

let stop: (() => void) | null = null

/**
 * 그물을 친다 — 저장된 판이 있으면 앉히고, 이후 바뀔 때마다 떠서 남긴다.
 *
 * **두 번 불러도 한 번만 붙는다.** 행낭 화면을 열고 닫고 다시 여는 동안 구독이
 * 겹치면 같은 것을 여러 번 쓴다.
 *
 * 앱이 사는 동안 계속 붙어 있어야 하므로 화면이 아니라 `main`에서 부른다 —
 * 행낭을 나갔다 들어오는 사이에 그물이 없으면 그 틈에 새로고침된 판을 잃는다.
 */
export function keepRuntime(): () => void {
  if (stop) return stop

  const kept = readKept()
  if (kept) restoreRuntime(kept)

  let timer: ReturnType<typeof setTimeout> | null = null
  const save = () => {
    if (timer !== null) clearTimeout(timer)
    timer = setTimeout(() => {
      timer = null
      writeKept(captureRuntime())
    }, SAVE_DELAY_MS)
  }

  const unsubscribes = [
    useElementStore.subscribe(save),
    useRoundStore.subscribe(save),
    useHpXpStore.subscribe(save),
    useAttackDeckStore.subscribe(save),
    useGoldStore.subscribe(save),
  ]

  stop = () => {
    if (timer !== null) clearTimeout(timer)
    for (const off of unsubscribes) off()
    stop = null
  }
  return stop
}
