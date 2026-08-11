/**
 * 카드 한 종류를 적는 법.
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ **카드는 값 하나가 아니다. 값·굴림·표식 셋이 모여 한 장이 된다.**         │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * 처음에는 종류를 아홉 개로 못박아 두었다(`x0`…`x2`). 실물 특혜 시트를 아홉 장
 * 펼쳐 보고 그것으로는 모자란 것을 알았다 — 시트에 적힌 것은 이런 것들이다.
 *
 * | 시트에 적힌 것 | 아홉 종류로 적으면 |
 * |---|---|
 * | `+1 부상 카드 1장 추가` | `+1`과 구별이 안 된다 |
 * | `굴림 불 카드 2장 추가` | 굴림을 적을 자리가 없다 |
 * | `+1 불·얼음 카드 1장 추가` | 표식이 둘인 카드가 없다 |
 *
 * **굴림은 그림이 아니라 규칙이다.** 굴림 카드를 뽑으면 뽑기가 끝나지 않고 한 장
 * 더 뽑는다. 덱이 이것을 모르면 남은 장수와 뽑기 결과가 실물과 어긋난다. 아홉
 * 클래스 중 다섯이 굴림 카드를 넣으므로 미룰 수 있는 것이 아니다.
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ **명세는 한 줄의 글자로 적힌다. 그 글자가 정본이다.**                     │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * 구성표의 열쇠(`Record<명세, 장수>`)로도, 저장된 판의 카드 id로도 쓰인다. 객체로
 * 두면 열쇠가 될 수 없고 견주기도 어렵다. 글자 하나면 **저장된 값을 믿지 않고
 * 여기서 다시 뽑을 수 있다**(구현 결정 65) — 종류표가 닫혀 있지 않게 되었어도
 * 그 성질은 그대로 지킨다.
 *
 * 문법: `[r.]<값>[.<표식>]*`
 *
 * ```
 * p1              +1
 * x0              ×0
 * p1.wound        +1 부상
 * p2.fire         +2 불
 * p1.fire.ice     +1 불·얼음
 * r.p1            굴림 +1
 * r.p0.muddle     굴림 혼란
 * r.p0.push2      굴림 밀기2
 * p0.targets      +0 대상 추가
 * ```
 *
 * **표식은 붙는 순서와 상관없이 한 가지로 적힌다** — 사전 순으로 세운다. 그러지
 * 않으면 `p1.fire.ice`와 `p1.ice.fire`가 다른 종류가 되어 구성표에 같은 카드가
 * 두 줄로 앉는다.
 *
 * **옛 열쇠는 그대로 읽힌다.** 아홉 종류의 id(`x0`·`m1`·`p0`…)가 곧 값 낱말이므로
 * 이미 저장된 구성표와 판이 아무 손질 없이 그대로 통과한다.
 *
 * **저작권 경계.** 여기 있는 것은 값과 표식의 **낱말**이다 — 원소 이름이 이미
 * 레포에 있는 것과 같은 등급이며(`elements.ts`), 카드에 인쇄된 문장이 아니다.
 * **어느 클래스가 어느 카드를 몇 장 넣는지는 여기 담지 않는다** — 그것이 특혜
 * 시트의 내용이고 SPEC 3장에 걸린다. 그 표는 DB에만 둔다(클래스 수치와 같은 선,
 * 절대 원칙 1의 2026-08-11 개정).
 */

/* --------------------------------------------------------------------------
   값
   -------------------------------------------------------------------------- */

/** 카드가 공격에 하는 일. 곱하기와 더하기는 셈이 다르므로 갈라 둔다. */
export type CardEffect =
  | { readonly kind: 'add'; readonly value: number }
  | { readonly kind: 'multiply'; readonly value: number }

/**
 * 값 낱말 → 효과.
 *
 * **낱말은 저장되는 값이다.** 고치면 이미 저장된 구성표와 판이 알 수 없는 것이
 * 되어 버려진다.
 *
 * `p3`·`p4`는 표준 덱에 없다. **특혜로 넣게 되는 것들**이라 미리 열어 둔다.
 */
const VALUES: Readonly<Record<string, CardEffect>> = {
  x0: { kind: 'multiply', value: 0 },
  m2: { kind: 'add', value: -2 },
  m1: { kind: 'add', value: -1 },
  p0: { kind: 'add', value: 0 },
  p1: { kind: 'add', value: 1 },
  p2: { kind: 'add', value: 2 },
  p3: { kind: 'add', value: 3 },
  p4: { kind: 'add', value: 4 },
  x2: { kind: 'multiply', value: 2 },
}

/** 값 낱말을 늘어놓는 순서. 설정 화면과 `buildDeck`이 이 차례를 따른다. */
export const VALUE_IDS: readonly string[] = ['x0', 'm2', 'm1', 'p0', 'p1', 'p2', 'p3', 'p4', 'x2']

/**
 * Creator Pack에 값 메달이 있는 낱말.
 *
 * 실물 표준 덱에 있는 일곱뿐이다. `p3`·`p4`는 특혜로만 나오므로 팩에 그림이 없어
 * 숫자를 직접 그린다.
 */
const VALUES_WITH_ART = new Set(['x0', 'm2', 'm1', 'p0', 'p1', 'p2', 'x2'])

export function valueHasArt(valueId: string): boolean {
  return VALUES_WITH_ART.has(valueId)
}

/* --------------------------------------------------------------------------
   표식
   -------------------------------------------------------------------------- */

/**
 * 표식의 종류.
 *
 * `element`는 아이콘이 이미 있다(`elements.ts`). 나머지는 지금 글자로 그린다 —
 * 팩에서 상태이상 아이콘을 더 뽑아 오는 것은 ATTRIBUTION을 함께 고쳐야 하는
 * 별개의 일이라 여기 섞지 않는다.
 */
export type MarkKind = 'condition' | 'amount' | 'element' | 'other'

export interface MarkDef {
  readonly id: string
  readonly name: string
  readonly kind: MarkKind
  /** 수를 달고 다니는가(`push2`·`heal1`). */
  readonly numeric?: true
}

/**
 * 적을 수 있는 표식 전부.
 *
 * 아홉 장의 특혜 시트에 실제로 나온 것들이다. **없는 것을 미리 지어내지
 * 않는다** — 필요해지면 한 줄 늘리면 되고, 그때까지 목록이 짧을수록 무엇이
 * 확인된 것인지 분명하다.
 *
 * `special`은 낱말로 못 적는 한 장짜리 카드의 자리다(어느 클래스에는 "인접한 모든
 * 적에게 피해 1점" 같은 것이 있다). **그 문장은 여기 적지 않는다** — 값과 굴림은
 * 제대로 셈하고 화면에는 '특수'라고만 낸다. 무엇인지는 그 카드를 가진 사람이 안다.
 */
export const MARKS: readonly MarkDef[] = [
  { id: 'wound', name: '부상', kind: 'condition' },
  { id: 'immobilize', name: '이동불가', kind: 'condition' },
  { id: 'poison', name: '중독', kind: 'condition' },
  { id: 'muddle', name: '혼란', kind: 'condition' },
  { id: 'stun', name: '기절', kind: 'condition' },
  { id: 'curse', name: '저주', kind: 'condition' },
  { id: 'disarm', name: '무장해제', kind: 'condition' },
  { id: 'invisible', name: '투명', kind: 'condition' },

  { id: 'push', name: '밀기', kind: 'amount', numeric: true },
  { id: 'pull', name: '당기기', kind: 'amount', numeric: true },
  { id: 'pierce', name: '관통', kind: 'amount', numeric: true },
  { id: 'heal', name: '치료', kind: 'amount', numeric: true },
  { id: 'shield', name: '방어', kind: 'amount', numeric: true },

  { id: 'fire', name: '불', kind: 'element' },
  { id: 'ice', name: '얼음', kind: 'element' },
  { id: 'air', name: '바람', kind: 'element' },
  { id: 'earth', name: '풀', kind: 'element' },
  { id: 'light', name: '빛', kind: 'element' },
  { id: 'dark', name: '어둠', kind: 'element' },

  { id: 'targets', name: '대상 추가', kind: 'other' },
  { id: 'special', name: '특수', kind: 'other' },
]

const MARK_BY_ID = new Map(MARKS.map((mark) => [mark.id, mark]))

/** 카드에 실제로 붙은 표식 하나. `amount`는 수를 다는 종류에만 있다. */
export interface CardMark {
  readonly def: MarkDef
  readonly amount: number | null
}

/** 표식 하나가 낱말로 어떻게 적히는가. `push` + 2 → `push2`. */
function markToken(mark: CardMark): string {
  return mark.amount === null ? mark.def.id : `${mark.def.id}${mark.amount}`
}

/** 표식 낱말 하나를 읽는다. 모르는 것이면 `null`. */
function parseMark(token: string): CardMark | null {
  const match = /^([a-z]+)(\d{0,2})$/.exec(token)
  if (!match) return null
  const [, id, digits] = match
  const def = MARK_BY_ID.get(id ?? '')
  if (!def) return null

  if (def.numeric) {
    // 수를 다는 종류인데 수가 없으면 못 알아본 것으로 친다. `push`만으로는
    // 몇 칸 미는지 알 수 없고, 짐작해서 1을 넣으면 사람이 그것을 믿는다.
    if (!digits) return null
    return { def, amount: Number(digits) }
  }

  if (digits) return null
  return { def, amount: null }
}

/** 읽어주는 쪽에 가는 말. `밀기2`, `불`, `대상 추가`. */
export function markSpeech(mark: CardMark): string {
  return mark.amount === null ? mark.def.name : `${mark.def.name}${mark.amount}`
}

/* --------------------------------------------------------------------------
   명세
   -------------------------------------------------------------------------- */

/**
 * 카드 한 종류.
 *
 * `id`가 정본이고 나머지는 전부 거기서 나온다. **어디서 읽은 것이든 `id`만 들고
 * `parseCardSpec`을 다시 부른다** — 저장물에 함께 든 값은 사본이라 표와 어긋날 수
 * 있다(구현 결정 65).
 */
export interface CardSpec {
  readonly id: string
  /** 값 낱말. 메달 그림을 고르는 열쇠이기도 하다. */
  readonly valueId: string
  readonly effect: CardEffect
  /** 뽑아도 뽑기가 끝나지 않는다. 한 장 더 뽑는다. */
  readonly rolling: boolean
  /** 뽑으면 이번 라운드가 끝날 때 섞어야 한다. */
  readonly shuffleAfter: boolean
  readonly marks: readonly CardMark[]
}

/**
 * 섞기는 값에서 나온다 — **곱하기 카드 둘(×0·×2)만 섞기 표식을 달고 있다.**
 *
 * 따로 적어 두지 않는 이유는 적을 자리가 늘면 그만큼 어긋날 자리가 늘기
 * 때문이다. 굴림 카드에는 섞기가 붙지 않는데, 굴림은 값이 곱하기가 아니므로
 * 이 규칙 하나로 함께 걸러진다.
 */
function shufflesFor(effect: CardEffect): boolean {
  return effect.kind === 'multiply'
}

const specCache = new Map<string, CardSpec | null>()

/**
 * 명세 낱말을 읽는다. 알아볼 수 없으면 `null`.
 *
 * **알아볼 수 없는 것은 버린다.** 반쯤 알아본 카드를 덱에 넣으면 화면에 뜬 그림과
 * 실제로 셈하는 값이 달라진다(구현 결정 63과 같은 결).
 *
 * 결과를 쟁여 둔다 — 덱을 펴고 그릴 때마다 장마다 불린다.
 */
export function parseCardSpec(id: unknown): CardSpec | null {
  if (typeof id !== 'string') return null

  const cached = specCache.get(id)
  if (cached !== undefined) return cached

  const parsed = parseUncached(id)
  specCache.set(id, parsed)
  return parsed
}

function parseUncached(id: string): CardSpec | null {
  const tokens = id.split('.')
  if (tokens.length === 0) return null

  let index = 0
  const rolling = tokens[index] === 'r'
  if (rolling) index += 1

  const valueId = tokens[index]
  if (!valueId) return null
  const effect = VALUES[valueId]
  if (!effect) return null
  index += 1

  const marks: CardMark[] = []
  const seen = new Set<string>()
  for (; index < tokens.length; index += 1) {
    const mark = parseMark(tokens[index] ?? '')
    if (!mark) return null
    // 같은 표식이 두 번 붙은 것은 적은 사람이 실수한 것이다. 조용히 하나로
    // 접으면 `p1.fire.fire`와 `p1.fire`가 다른 열쇠인 채 같은 카드가 된다.
    if (seen.has(mark.def.id)) return null
    seen.add(mark.def.id)
    marks.push(mark)
  }

  // 사전 순으로 세운다 — 붙는 차례가 달라도 한 가지로 적힌다.
  marks.sort((a, b) => (markToken(a) < markToken(b) ? -1 : 1))

  const canonical = [rolling ? 'r' : '', valueId, ...marks.map(markToken)].filter(Boolean).join('.')

  return {
    id: canonical,
    valueId,
    effect,
    rolling,
    shuffleAfter: shufflesFor(effect),
    marks,
  }
}

/** 조각으로 명세를 짓는다. 낱말을 손으로 잇지 않게 하려는 것뿐이다. */
export function makeCardSpec(input: {
  valueId: string
  rolling?: boolean
  marks?: readonly string[]
}): CardSpec | null {
  const tokens = [input.rolling ? 'r' : '', input.valueId, ...(input.marks ?? [])]
    .filter(Boolean)
    .join('.')
  return parseCardSpec(tokens)
}

/** 카드 면에 적는 글자. 숫자와 기호뿐이라 Pirata One으로 그린다. */
export function cardLabel(effect: CardEffect): string {
  if (effect.kind === 'multiply') return `×${effect.value}`
  if (effect.value > 0) return `+${effect.value}`
  // U+2212(빼기표). 하이픈보다 획이 굵고 길이가 더하기표와 맞는다.
  if (effect.value < 0) return `−${Math.abs(effect.value)}`
  return '+0'
}

/** 읽어주는 쪽에 가는 한국어. 화면 글자는 라틴이지만 소리는 우리말이어야 한다. */
export function specSpeech(spec: CardSpec): string {
  const { effect } = spec
  let base: string
  if (effect.kind === 'multiply') {
    base = effect.value === 0 ? '빗나감' : `${effect.value}배`
  } else if (effect.value === 0) {
    base = '보정 없음'
  } else if (effect.value > 0) {
    base = `${effect.value} 더함`
  } else {
    base = `${Math.abs(effect.value)} 뺌`
  }

  const parts = [spec.rolling ? '굴림' : '', base, ...spec.marks.map(markSpeech)]
  if (spec.shuffleAfter) parts.push('섞기 표시')
  return parts.filter(Boolean).join(', ')
}
