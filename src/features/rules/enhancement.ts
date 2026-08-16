/**
 * 카드 향상 가격표 — **수치의 나열이다.**
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ **값이 늘어선 표일 뿐 카드의 글이 아니다.**                               │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * 그래서 레포에 둘 수 있다(구현 결정 42·284와 같은 선). 형님이 실물 표를 찍어
 * 보내 주었다(2026-08-16).
 *
 * 값은 셋이 겹쳐 정해진다: **무엇을 붙이는가**(기본 비용) → **곱**(복수 대상은
 * 두 배) → **더함**(카드 레벨과 이미 붙은 스티커 수).
 */

export interface EnhanceCost {
  readonly name: string
  readonly gold: number
}

/** 능력치에 붙이는 것. */
export const ENHANCE_STATS: readonly EnhanceCost[] = [
  { name: '이동', gold: 30 },
  { name: '공격', gold: 50 },
  { name: '사정거리', gold: 30 },
  { name: '방어', gold: 100 },
  { name: '밀기', gold: 30 },
  { name: '당기기', gold: 30 },
  { name: '관통', gold: 30 },
  { name: '반격', gold: 100 },
  { name: '치료', gold: 30 },
  { name: '대상', gold: 50 },
]

/** 소환물의 능력치. 같은 이름이지만 값이 다르다. */
export const ENHANCE_SUMMON: readonly EnhanceCost[] = [
  { name: '이동', gold: 100 },
  { name: '공격', gold: 100 },
  { name: '사정거리', gold: 50 },
  { name: '체력', gold: 50 },
]

/** 효과를 새로 붙이는 것. */
export const ENHANCE_EFFECTS: readonly EnhanceCost[] = [
  { name: '중독', gold: 75 },
  { name: '부상', gold: 75 },
  { name: '혼란', gold: 50 },
  { name: '이동불가', gold: 100 },
  { name: '무장해제', gold: 150 },
  { name: '저주', gold: 75 },
  { name: '강화', gold: 50 },
  { name: '축복', gold: 50 },
  { name: '도약', gold: 50 },
  { name: '특정 원소', gold: 100 },
  { name: '아무 원소', gold: 150 },
]

/** 카드 레벨이 올릴 때마다 더해지는 값. */
export const LEVEL_STEP = 25

/** 이미 붙어 있는 스티커 하나마다 더해지는 값. */
export const STICKER_STEP = 75

/** 복수 대상이면 기본 비용이 두 배다. */
export const MULTI_TARGET_FACTOR = 2

/** 공격 칸(육각)에 붙일 때 — 200을 칸 수로 나눈 만큼, 내림. */
export function hexCost(hexes: number): number {
  const n = Math.max(1, Math.trunc(hexes))
  return Math.floor(200 / n)
}

/** 카드 레벨이 더하는 값. 1레벨은 0이다. */
export function levelExtra(level: number): number {
  return Math.max(0, Math.trunc(level) - 1) * LEVEL_STEP
}

/** 이미 붙은 스티커가 더하는 값. */
export function stickerExtra(count: number): number {
  return Math.max(0, Math.trunc(count)) * STICKER_STEP
}

/**
 * 다 합친 값.
 *
 * **곱이 먼저고 더함이 나중이다** — 복수 대상은 기본 비용만 두 배가 되고, 레벨과
 * 스티커는 그 뒤에 더해진다.
 */
export function enhanceCost(input: {
  base: number
  multiTarget?: boolean
  level?: number
  stickers?: number
}): number {
  const base = input.multiTarget === true ? input.base * MULTI_TARGET_FACTOR : input.base
  return base + levelExtra(input.level ?? 1) + stickerExtra(input.stickers ?? 0)
}
