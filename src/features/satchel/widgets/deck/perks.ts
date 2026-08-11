import { MAX_PER_KIND, STANDARD_COMPOSITION, parseCardSpec, type DeckComposition } from './deck'

/**
 * 퍽 → 덱 구성.
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ **여기가 축 ①의 캐릭터 레코드로 이어질 자리다.**                          │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * SPEC 1장이 2026-08-05에 개정되어 **공격 보정 덱만은 캐릭터의 퍽을 읽는다.**
 * 덱 구성은 퍽이 정하므로, 퍽을 얻을 때마다 사람이 설정 화면에서 장수를 다시
 * 맞추게 하면 도구가 아니라 일이 된다.
 *
 * `resolveComposition`이 퍽을 받으면 그것으로, 못 받으면 위젯 설정의 값으로 덱을
 * 만든다. 퍽을 넘겨주는 쪽만 채우면 되고 이 아래 계산은 그대로 쓴다.
 *
 * **읽기만 한다.** 도구가 캐릭터를 고치는 일은 없다.
 *
 * **퍽 표는 여기 담지 않는다.** "몇 번 퍽이 무엇을 시키는가"는 클래스별 특혜
 * 시트의 내용이므로 SPEC 3장의 저작권 경계에 걸린다 — 클래스 이름·체력을 DB에만
 * 두기로 한 것과 같은 선이다(절대 원칙 1의 2026-08-11 개정). 우리가 다루는 것은
 * 아래 `PerkDeckChange`처럼 **이미 수치로 풀린 변경**뿐이다.
 */

/**
 * 퍽 하나가 덱에 가하는 변경. `delta`가 양수면 넣고 음수면 뺀다.
 *
 * `kindId`는 `cardSpec.ts`의 명세 낱말이다 — `p1`처럼 값만 있는 것도, `p1.wound`나
 * `r.p0.fire`처럼 표식과 굴림이 붙은 것도 그대로 적는다.
 *
 * **교체는 둘로 쪼갠다.** "−1 한 장을 +1 한 장으로 바꾼다"는 `{m1:-1}`과 `{p1:+1}`
 * 두 줄이다. 교체라는 갈래를 따로 두면 셈이 두 벌이 되고, 실제로 하는 일은 같다.
 */
export interface PerkDeckChange {
  readonly kindId: string
  readonly delta: number
}

/**
 * 기본 구성에 퍽 변경을 얹는다.
 *
 * **모르는 종류는 건너뛴다.** 0 밑으로는 내려가지 않는다 — 퍽 표가 어긋나 있어도
 * 음수 장수 같은 것이 나오면 안 된다.
 *
 * 기본 구성에 없던 종류는 여기서 새로 생긴다. 표식 붙은 카드는 전부 그 길로
 * 들어온다 — 표준 덱에는 하나도 없기 때문이다.
 */
export function applyPerkChanges(
  base: DeckComposition,
  changes: readonly PerkDeckChange[],
): DeckComposition {
  const out: Record<string, number> = { ...base }

  for (const change of changes) {
    const spec = parseCardSpec(change.kindId)
    if (!spec) continue
    if (!Number.isFinite(change.delta)) continue
    const next = (out[spec.id] ?? 0) + Math.trunc(change.delta)
    out[spec.id] = Math.max(0, Math.min(MAX_PER_KIND, next))
  }

  // 0장이 된 종류는 열쇠째 걷는다. 남겨두면 설정 화면에 빈 줄로 남는다.
  for (const [kindId, count] of Object.entries(out)) {
    if (count <= 0) delete out[kindId]
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
 * 클래스의 퍽 표가 아직 안 들어온 때가 그렇다. 절대 원칙 3(offline-first)에 따라
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
