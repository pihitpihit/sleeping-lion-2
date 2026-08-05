import { CARD_KINDS, MAX_PER_KIND, STANDARD_COMPOSITION, type DeckComposition } from './deck'

/**
 * 퍽 → 덱 구성.
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ **축 ①이 아직 없다. 여기가 나중에 캐릭터 레코드로 이어질 자리다.**        │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * SPEC 1장이 2026-08-05에 개정되어 **공격 보정 덱만은 캐릭터의 퍽을 읽는다.**
 * 덱 구성은 퍽이 정하므로, 퍽을 얻을 때마다 사람이 설정 화면에서 장수를 다시
 * 맞추게 하면 도구가 아니라 일이 된다.
 *
 * 다만 지금은 `Character` 레코드도 Dexie 스키마도 코드에 없다. 그래서 **모양만
 * 먼저 세우고 공급원은 비워 둔다** — `resolveComposition`이 퍽을 받으면 그것으로,
 * 못 받으면 위젯 설정의 값으로 덱을 만든다. 축 ①이 서면 퍽을 넘겨주는 쪽만
 * 채우면 되고 이 아래 계산은 그대로 쓴다.
 *
 * **읽기만 한다.** 도구가 캐릭터를 고치는 일은 없다.
 *
 * **퍽 표는 여기 담지 않는다.** "몇 번 퍽이 무엇을 시키는가"는 클래스별 퍽 시트의
 * 내용이므로 SPEC 3장의 저작권 경계에 걸린다. 우리가 다루는 것은 아래 `PerkDeckChange`
 * 처럼 **이미 수치로 풀린 변경**뿐이고, 그 표는 사용자 데이터팩(Phase 3)이나
 * 사용자 입력으로 채워진다.
 */

/** 퍽 하나가 덱에 가하는 변경. `delta`가 양수면 넣고 음수면 뺀다. */
export interface PerkDeckChange {
  readonly kindId: string
  readonly delta: number
}

/**
 * 기본 구성에 퍽 변경을 얹는다.
 *
 * 모르는 종류는 건너뛴다. 0 밑으로는 내려가지 않는다 — 퍽 표가 어긋나 있어도
 * 음수 장수 같은 것이 나오면 안 된다.
 */
export function applyPerkChanges(
  base: DeckComposition,
  changes: readonly PerkDeckChange[],
): DeckComposition {
  const out: Record<string, number> = {}
  for (const kind of CARD_KINDS) out[kind.id] = base[kind.id] ?? 0

  for (const change of changes) {
    if (!(change.kindId in out)) continue
    if (!Number.isFinite(change.delta)) continue
    const next = (out[change.kindId] ?? 0) + Math.trunc(change.delta)
    out[change.kindId] = Math.max(0, Math.min(MAX_PER_KIND, next))
  }

  return out
}

/**
 * 이 위젯이 쓸 덱 구성을 정한다.
 *
 * **퍽을 읽을 수 있으면 그것이 이긴다.** 사람이 설정에 적어 둔 값보다 캐릭터가
 * 실제로 가진 퍽이 사실에 가깝다.
 *
 * **읽을 수 없으면 설정값으로 간다.** 로그인 전이거나, 캐릭터를 고르지 않았거나,
 * 축 ①이 아직 서지 않은 지금이 그런 경우다. 절대 원칙 3(offline-first)에 따라
 * **덱이 비는 것이 아니라 기본값이 되는 것**이라야 한다.
 *
 * @param settingsComposition 위젯 설정에 저장된 구성
 * @param perkChanges 캐릭터의 퍽에서 나온 변경 목록. 모르면 `null`
 */
export function resolveComposition(
  settingsComposition: DeckComposition,
  perkChanges: readonly PerkDeckChange[] | null,
): DeckComposition {
  if (perkChanges === null) return settingsComposition
  return applyPerkChanges(STANDARD_COMPOSITION, perkChanges)
}
