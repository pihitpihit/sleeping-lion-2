/**
 * 시나리오 레벨 표 — **한 곳에서 나와 화면과 셈이 함께 쓴다.**
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ **보여 주는 표와 셈하는 값을 두 벌 두지 않는다.**                         │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * 참조 화면이 이 표를 그리고, 나중에 전투를 펴거나 시나리오를 정산할 때도 여기서
 * 값을 꺼낸다 — 두 벌이면 언젠가 어긋나고, **어긋난 참조는 없느니만 못하다.**
 *
 * ── 저작권
 *
 * 수치의 나열이라 SPEC 3장의 경계 안이다(구현 결정 42 — 레벨 눈금·보정 덱 구성과
 * 같은 성격). 규칙 문장은 옮기지 않는다: 무엇을 뜻하는지는 화면이 우리 말로 한
 * 줄 적을 뿐이고, 규칙서의 글은 여기 오지 않는다.
 *
 * ── 어디서 왔나
 *
 * 글룸헤이븐 규칙서 15쪽과 사자의 턱 규칙서 29쪽 표를 **양쪽 다 펼쳐 대조했다**
 * (2026-08-14). 칸 하나까지 같아서 표는 하나면 된다.
 *
 * ── 표와 식
 *
 * 함정 피해와 보너스 경험은 규칙서가 **식으로도 적어 둔다**(`2+L`, `4+2L`).
 * 그래서 그 둘은 셈해서 낸다 — 값을 또 적어 두면 표와 어긋날 자리가 하나 는다
 * (구현 결정 65와 같은 결). **금화만 식이 없다**(2·2·3·3·4·4·5·6 — 마지막이 두
 * 칸 뛴다). 인쇄된 표와 맞는지는 시험이 지킨다.
 */

/** 시나리오 레벨은 0에서 7까지다. 판이 시작되면 바꾸지 않는다. */
export const MIN_LEVEL = 0
export const MAX_LEVEL = 7

/**
 * 금화 환산 — **식이 없어 표에서 그대로 온다.**
 *
 * 2·2·3·3·4·4·5·**6**. 앞은 두 칸마다 하나씩 오르는데 마지막만 두 칸 뛴다.
 */
const GOLD_PER_COIN: readonly number[] = [2, 2, 3, 3, 4, 4, 5, 6]

export interface ScenarioLevelRow {
  readonly level: number
  /** 몬스터 스탯 묶음. **언제나 시나리오 레벨과 같다.** */
  readonly monsterLevel: number
  /** 돈 표식 하나가 몇 금화인가. */
  readonly goldPerCoin: number
  /** 함정 피해 = 2 + 레벨. */
  readonly trapDamage: number
  /** 시나리오를 마치면 얻는 경험 = 4 + 2 × 레벨. */
  readonly bonusXp: number
  /**
   * 위험 지형 피해 = 함정 피해의 절반, 내림.
   *
   * **표에는 없는 값이다** — 규칙서 본문이 그렇게 적는다. 사자의 턱 쪽은 규칙
   * 용어집을 아직 못 봐서 같은 셈인지 확인하지 못했다.
   */
  readonly hazardDamage: number
}

export function clampLevel(level: number): number {
  return Math.max(MIN_LEVEL, Math.min(MAX_LEVEL, Math.round(level)))
}

/** 레벨 하나의 줄. 표 밖의 수를 넣으면 0~7 안으로 당겨 준다. */
export function rowFor(level: number): ScenarioLevelRow {
  const l = clampLevel(level)
  const trapDamage = 2 + l
  return {
    level: l,
    monsterLevel: l,
    goldPerCoin: GOLD_PER_COIN[l] ?? 2,
    trapDamage,
    bonusXp: 4 + 2 * l,
    hazardDamage: Math.floor(trapDamage / 2),
  }
}

/** 표 전체. 화면이 그대로 늘어놓는다. */
export const SCENARIO_LEVELS: readonly ScenarioLevelRow[] = Array.from(
  { length: MAX_LEVEL + 1 },
  (_, l) => rowFor(l),
)

/* --------------------------------------------------------------------------
   난이도
   -------------------------------------------------------------------------- */

export type Difficulty = 'easy' | 'normal' | 'hard' | 'veryHard'

/** 화면에 적는 말. 규칙서의 네 갈래를 그대로 쓴다. */
export const DIFFICULTY_NAME: Readonly<Record<Difficulty, string>> = {
  easy: '쉬움',
  normal: '보통',
  hard: '어려움',
  veryHard: '매우 어려움',
}

/** 권장 레벨에서 얼마를 더하는가. */
export const DIFFICULTY_MOD: Readonly<Record<Difficulty, number>> = {
  easy: -1,
  normal: 0,
  hard: 1,
  veryHard: 2,
}

export const DIFFICULTIES: readonly Difficulty[] = ['easy', 'normal', 'hard', 'veryHard']

/**
 * 권장(보통) 레벨 = **파티 평균 레벨 ÷ 2, 올림.**
 *
 * 넷이 다 2레벨이면 1이고, 누군가 3레벨이 되어야 2로 오른다.
 *
 * **아무도 없으면 모른다고 한다** — 0을 내면 「가장 쉬운 판」으로 읽혀 사람이
 * 그것을 믿는다(구현 결정 115와 같은 결).
 */
export function recommendedLevel(characterLevels: readonly number[]): number | null {
  if (characterLevels.length === 0) return null
  const sum = characterLevels.reduce((a, b) => a + b, 0)
  return clampLevel(Math.ceil(sum / characterLevels.length / 2))
}

/** 권장 레벨에 난이도를 얹은 값. 0~7 밖으로는 안 나간다. */
export function scenarioLevelFor(
  characterLevels: readonly number[],
  difficulty: Difficulty,
): number | null {
  const base = recommendedLevel(characterLevels)
  if (base === null) return null
  return clampLevel(base + DIFFICULTY_MOD[difficulty])
}

/**
 * 혼자 놀기(공개 정보) 변형 — **글룸헤이븐에만 있다**(규칙서 15쪽).
 *
 * 한 사람이 캐릭터 둘 이상을 굴리면 남의 패까지 알고 짜므로 그만큼 어렵게 한다:
 * **몬스터 레벨과 함정 피해만 1씩 올리고 금화와 경험은 그대로 둔다.** 보상까지
 * 올려 주면 벌충이 무의미해진다.
 *
 * 몬스터 레벨은 7이 끝이라 그 위로는 올리지 않는다.
 */
export function soloVariant(row: ScenarioLevelRow): ScenarioLevelRow {
  const trapDamage = row.trapDamage + 1
  return {
    ...row,
    monsterLevel: Math.min(MAX_LEVEL, row.monsterLevel + 1),
    trapDamage,
    hazardDamage: Math.floor(trapDamage / 2),
  }
}
