/**
 * 캐릭터 시트의 규칙.
 *
 * 순수 함수로 떼어 둔다(SPEC 4.1). 화면도 스토어도 여기 산술을 다시 하지 않는다.
 *
 * **저작권 경계.** 여기 있는 것은 수치와 인덱스뿐이다. 클래스는 아이콘 번호이고
 * 퍽은 슬롯 번호이며, 아이템 이름은 **사용자가 친 글자**다(구현 결정 2). 카드
 * 원문·클래스 이름·퍽 문구는 어디에도 담지 않는다(SPEC 3장).
 *
 * **규칙을 판정하지 않는다.** 레벨을 대신 올려주지 않고 퍽을 자동으로 켜지도
 * 않는다. 실물 시트에 인쇄된 눈금을 대신 읽어줄 뿐이다 — 축 ②의 도구들과 같은 선이다.
 */

/* --------------------------------------------------------------------------
   클래스 — 이름 대신 아이콘
   -------------------------------------------------------------------------- */

/**
 * Creator Pack `Icon Pack/Class Icons and Augments.pdf`의 쪽 번호.
 *
 * **이름을 담지 않는다.** 클래스 이름은 게임 콘텐츠이고, 잠긴 클래스는 이름
 * 자체가 스포일러다. 아이콘은 봉투 겉면에 인쇄돼 있어 열기 전에도 보이는 것이라
 * 가릴 것이 없다. SPEC 12장 1을 이렇게 닫는다.
 *
 * 0은 **아직 안 고름**이다.
 */
export const CLASS_ICON_COUNT = 21

/** 1~21이면 아이콘이 있다. */
export function hasClassIcon(index: number): boolean {
  return Number.isInteger(index) && index >= 1 && index <= CLASS_ICON_COUNT
}

const ASSET_ROOT = `${import.meta.env.BASE_URL}assets/creator-pack/`

/** 클래스 아이콘 주소. 안 골랐으면 `null`. */
export function classIconUrl(index: number): string | null {
  if (!hasClassIcon(index)) return null
  return `${ASSET_ROOT}classes/class-${String(index).padStart(2, '0')}.svg`
}

/* --------------------------------------------------------------------------
   레벨과 경험
   -------------------------------------------------------------------------- */

/** 실물 시트의 눈금이 9까지다. */
export const MIN_LEVEL = 1
export const MAX_LEVEL = 9

/**
 * 레벨이 오르는 경험치.
 *
 * 실물 캐릭터 시트에 인쇄된 눈금 그대로다(Creator Pack의 `Character Sheet.pdf`
 * 에서 읽었다). 수치의 나열이라 SPEC 3장의 경계 안이다 — 보정 덱 구성이나 평판
 * 구간표와 같은 성격이다.
 *
 * 0번 자리가 1레벨이다.
 */
export const XP_THRESHOLDS: readonly number[] = [0, 45, 95, 150, 210, 275, 345, 420, 500]

export function clampLevel(value: number): number {
  if (!Number.isFinite(value)) return MIN_LEVEL
  return Math.min(MAX_LEVEL, Math.max(MIN_LEVEL, Math.trunc(value)))
}

/**
 * 이 경험치의 레벨 — **레벨의 정본이다.**
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ **레벨은 사람이 고르는 값이 아니라 경험치에서 나오는 값이다.**            │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * 2026-08-12까지는 사람이 눈금을 눌러 레벨을 정했고, 경험이 다음 눈금에 닿으면
 * "올릴 때가 되었다"고 알리기만 했다(구현 결정 43). 형님이 뒤집었다 — **눈금은
 * 표에 적힌 사실이지 사람이 정할 것이 아니다.** 레벨업에 딸린 일(퍽 고르기·능력
 * 카드 바꾸기)은 여전히 사람이 하지만, 그것은 시트 밖의 일이다.
 */
export function levelForXp(xp: number): number {
  const value = Number.isFinite(xp) ? Math.max(0, Math.trunc(xp)) : 0
  let level = MIN_LEVEL
  for (let i = 0; i < XP_THRESHOLDS.length; i += 1) {
    if (value >= XP_THRESHOLDS[i]) level = i + 1
  }
  return level
}

/** 다음 눈금까지 남은 경험치. 끝에 닿았으면 `null`. */
export function xpToNextLevel(xp: number): number | null {
  const value = Number.isFinite(xp) ? Math.max(0, Math.trunc(xp)) : 0
  const next = XP_THRESHOLDS.find((threshold) => threshold > value)
  return next === undefined ? null : next - value
}

/* --------------------------------------------------------------------------
   체크마크와 퍽
   -------------------------------------------------------------------------- */

/** 체크마크 몇 개가 퍽 하나가 되는가. */
export const CHECKMARKS_PER_PERK = 3

/**
 * 전투 목표 체크마크로 얻은 퍽 수.
 *
 * 실물 시트의 상자가 열여덟 개(세 개씩 여섯 묶음)다. 그 위로는 세어도 퍽이
 * 늘지 않으므로 눈금도 거기서 멎는다.
 */
export const MAX_CHECKMARKS = 18

export function clampCheckmarks(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.min(MAX_CHECKMARKS, Math.max(0, Math.trunc(value)))
}

export function perksFromCheckmarks(checkmarks: number): number {
  return Math.floor(clampCheckmarks(checkmarks) / CHECKMARKS_PER_PERK)
}

/**
 * 지금까지 얻었을 퍽의 수.
 *
 * 레벨이 오를 때마다 하나(2레벨부터), 체크마크 셋마다 하나. **가질 수 있는 수를
 * 셈할 뿐 어느 퍽인지는 모른다** — 클래스별 퍽 시트는 게임 콘텐츠다(SPEC 3장).
 */
export function perksEarned(level: number, checkmarks: number): number {
  return clampLevel(level) - MIN_LEVEL + perksFromCheckmarks(checkmarks)
}

/**
 * 퍽 슬롯이 몇 칸인가.
 *
 * 클래스마다 다르고 우리는 그 표를 갖고 있지 않다. **얻은 수보다 넉넉히** 두어
 * 사람이 자기 시트를 보고 켜면 되게 한다.
 */
export function perkSlotCount(level: number, checkmarks: number): number {
  return Math.max(15, perksEarned(level, checkmarks) + 3)
}

/** 켜진 슬롯 번호만 남긴다. 중복과 음수를 걸러 오름차순으로 준다. */
export function normalizePerks(perks: readonly number[]): number[] {
  const seen = new Set<number>()
  for (const raw of perks) {
    if (!Number.isFinite(raw)) continue
    const slot = Math.trunc(raw)
    if (slot >= 0) seen.add(slot)
  }
  return [...seen].sort((a, b) => a - b)
}

/** 슬롯을 켜고 끈다. */
export function togglePerk(perks: readonly number[], slot: number): number[] {
  const set = new Set(normalizePerks(perks))
  if (set.has(slot)) set.delete(slot)
  else set.add(slot)
  return [...set].sort((a, b) => a - b)
}

/* --------------------------------------------------------------------------
   골드
   -------------------------------------------------------------------------- */

/** 화면에 담을 수 있는 자릿수에서 온 한계다. 게임 규칙이 아니다. */
export const MAX_GOLD = 9999
export const MAX_XP = 999

export function clampGold(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.min(MAX_GOLD, Math.max(0, Math.trunc(value)))
}

export function clampXp(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.min(MAX_XP, Math.max(0, Math.trunc(value)))
}
