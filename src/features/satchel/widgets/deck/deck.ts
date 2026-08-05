/**
 * 공격 보정 덱의 규칙.
 *
 * 순수 함수로 떼어 둔다(SPEC 4.1). 화면도 스토어도 여기 산술을 다시 하지 않는다.
 *
 * **저작권 경계.** 표준 덱은 수치와 기호의 구성일 뿐이다(+0 여럿, ±1, ±2, ×0, ×2).
 * SPEC 3장이 "게임 메커닉의 수치 표현이지 저작물 원문이 아니다"라고 못박았다.
 * 카드 그림과 문구는 담지 않고, 화면에 그리는 것도 직접 그린 도형이다(구현 결정 31).
 *
 * **클래스별 퍽 목록은 담지 않는다.** 그것은 게임 콘텐츠다. 우리가 아는 것은
 * "이 종류를 몇 장 넣는가"까지이며, 어느 퍽이 무엇을 시키는지는 **사용자가 설정에
 * 입력한다**(SPEC 3장의 '사용자 직접 입력' 경로). 데이터팩이 생기면 그때 표를
 * 불러오는 길이 열린다.
 *
 * **확률을 계산하지 않는다.** 남은 장수는 세어 보여주되 "다음에 무엇이 나올
 * 확률"은 내지 않는다 — SPEC 1장이 축 ②에서 확률 계산을 범위 밖에 두었다.
 */

/* --------------------------------------------------------------------------
   카드
   -------------------------------------------------------------------------- */

/** 카드가 공격에 하는 일. 곱하기와 더하기는 셈이 다르므로 갈라 둔다. */
export type CardEffect =
  | { readonly kind: 'add'; readonly value: number }
  | { readonly kind: 'multiply'; readonly value: number }

/**
 * 덱에 넣을 수 있는 카드 종류.
 *
 * `id`는 **저장되는 값이다**(위젯 설정에 장수와 함께 남는다). 이름을 바꾸면
 * 기존 설정이 알 수 없는 종류가 되어 버려진다 — 위젯 정의 id와 같은 성질이다.
 */
export interface CardKind {
  readonly id: string
  readonly effect: CardEffect
  /** 뽑으면 이번 라운드가 끝날 때 섞어야 한다. */
  readonly shuffleAfter: boolean
}

/**
 * 다룰 수 있는 종류 전부.
 *
 * 표준 덱에 없는 것(+3·+4)도 있다. **퍽으로 넣게 되는 것들**이며, 종류를 미리
 * 열어 두어야 설정에서 고를 수 있다. 장수 0이면 없는 것과 같으므로 여기 있다고
 * 해서 덱에 들어가지는 않는다.
 */
export const CARD_KINDS: readonly CardKind[] = [
  { id: 'x0', effect: { kind: 'multiply', value: 0 }, shuffleAfter: true },
  { id: 'm2', effect: { kind: 'add', value: -2 }, shuffleAfter: false },
  { id: 'm1', effect: { kind: 'add', value: -1 }, shuffleAfter: false },
  { id: 'p0', effect: { kind: 'add', value: 0 }, shuffleAfter: false },
  { id: 'p1', effect: { kind: 'add', value: 1 }, shuffleAfter: false },
  { id: 'p2', effect: { kind: 'add', value: 2 }, shuffleAfter: false },
  { id: 'p3', effect: { kind: 'add', value: 3 }, shuffleAfter: false },
  { id: 'p4', effect: { kind: 'add', value: 4 }, shuffleAfter: false },
  { id: 'x2', effect: { kind: 'multiply', value: 2 }, shuffleAfter: true },
]

const KIND_BY_ID = new Map(CARD_KINDS.map((kind) => [kind.id, kind]))

export function cardKind(id: string): CardKind | undefined {
  return KIND_BY_ID.get(id)
}

/** 덱에 실제로 놓인 한 장. `id`는 이 덱 안에서만 고유하다(렌더 키·셔플용). */
export interface Card {
  readonly id: string
  readonly kindId: string
  readonly effect: CardEffect
  readonly shuffleAfter: boolean
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
export function cardSpeech(card: Pick<Card, 'effect' | 'shuffleAfter'>): string {
  const { effect } = card
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
  return card.shuffleAfter ? `${base}, 섞기 표시` : base
}

/* --------------------------------------------------------------------------
   덱 구성 — 퍽이 손대는 자리
   -------------------------------------------------------------------------- */

/**
 * 종류별 장수.
 *
 * **퍽은 이 표를 고치는 것으로 표현된다.** "−1 두 장을 빼고 +1 한 장을 넣는다"
 * 같은 것이 곧 이 수치의 증감이다. 어느 퍽이 무엇을 시키는지는 우리가 알지
 * 못하고 알 필요도 없다 — 사용자가 설정에서 장수를 맞춘다.
 */
export type DeckComposition = Readonly<Record<string, number>>

/** 기본 덱 20장. 어느 캐릭터든 여기서 시작한다. */
export const STANDARD_COMPOSITION: DeckComposition = {
  x0: 1,
  m2: 1,
  m1: 5,
  p0: 6,
  p1: 5,
  p2: 1,
  x2: 1,
}

/** 한 종류가 가질 수 있는 최대 장수. 규칙이 아니라 입력 실수를 막는 울타리다. */
export const MAX_PER_KIND = 20

export function countOf(composition: DeckComposition, kindId: string): number {
  return composition[kindId] ?? 0
}

export function compositionSize(composition: DeckComposition): number {
  let total = 0
  for (const kind of CARD_KINDS) total += countOf(composition, kind.id)
  return total
}

/**
 * 구성표를 실제 카드 목록으로 편다. **섞지 않는다** — 섞는 것은 따로다.
 *
 * 종류 순서대로 늘어놓으므로 결과가 늘 같다. 렌더 중에 불려도 안전하다
 * (구현 결정 12 — 같은 입력에 같은 결과).
 */
export function buildDeck(composition: DeckComposition = STANDARD_COMPOSITION): Card[] {
  const cards: Card[] = []
  for (const kind of CARD_KINDS) {
    const count = Math.max(0, Math.min(MAX_PER_KIND, Math.trunc(countOf(composition, kind.id))))
    for (let n = 0; n < count; n += 1) {
      cards.push({
        id: `${kind.id}#${n}`,
        kindId: kind.id,
        effect: kind.effect,
        shuffleAfter: kind.shuffleAfter,
      })
    }
  }
  return cards
}

/* --------------------------------------------------------------------------
   덱 상태
   -------------------------------------------------------------------------- */

export interface DeckState {
  /** 아직 안 뽑은 것. 0번이 맨 위다. */
  readonly draw: readonly Card[]
  /** 공개해서 버린 것. **0번이 가장 최근에 공개한 것**이다. */
  readonly discard: readonly Card[]
}

/** 0 이상 1 미만을 내는 것. 테스트가 씨앗을 심을 수 있도록 주입받는다. */
export type Rng = () => number

/** 피셔–예이츠. 원본을 건드리지 않는다. */
export function shuffle<T>(items: readonly T[], rng: Rng): T[] {
  const out = items.slice()
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1))
    const a = out[i]
    const b = out[j]
    out[i] = b
    out[j] = a
  }
  return out
}

/** 새 덱. 구성표대로 펴서 섞는다. */
export function createDeck(
  rng: Rng,
  composition: DeckComposition = STANDARD_COMPOSITION,
): DeckState {
  return { draw: shuffle(buildDeck(composition), rng), discard: [] }
}

/** 섞지 않은 새 덱. 아직 아무것도 뽑지 않았을 때의 표기용 기본값이다. */
export function freshDeck(composition: DeckComposition = STANDARD_COMPOSITION): DeckState {
  return { draw: buildDeck(composition), discard: [] }
}

/** 버린 것을 되돌려 전부 섞는다. 공개된 카드는 사라진다 — 실물과 같다. */
export function reshuffle(state: DeckState, rng: Rng): DeckState {
  return { draw: shuffle([...state.draw, ...state.discard], rng), discard: [] }
}

export interface DrawResult {
  readonly state: DeckState
  /** 공개된 카드. 덱이 통째로 비어 있으면(장수 0) `null`이다. */
  readonly card: Card | null
  /** 뽑기 전에 저절로 섞였는가. */
  readonly reshuffled: boolean
}

/**
 * 맨 위 한 장을 공개한다.
 *
 * **덱이 비었으면 버린 것을 되돌려 섞고 나서 뽑는다.** 실물에서도 그렇게 한다.
 * 규칙을 판정하는 것이 아니라 손으로 하던 일을 대신하는 것이다.
 */
export function drawOne(state: DeckState, rng: Rng): DrawResult {
  let working = state
  let reshuffled = false

  if (working.draw.length === 0) {
    if (working.discard.length === 0) {
      // 덱에 카드가 한 장도 없다. 구성을 0으로 만들어 둔 경우다.
      return { state: working, card: null, reshuffled: false }
    }
    working = reshuffle(working, rng)
    reshuffled = true
  }

  const [top, ...rest] = working.draw
  if (!top) return { state: working, card: null, reshuffled }

  return {
    state: { draw: rest, discard: [top, ...working.discard] },
    card: top,
    reshuffled,
  }
}

/** 가장 최근에 공개한 카드. 없으면 `null`. */
export function revealedCard(state: DeckState): Card | null {
  return state.discard[0] ?? null
}

export function remainingCount(state: DeckState): number {
  return state.draw.length
}

export function discardCount(state: DeckState): number {
  return state.discard.length
}

export function totalCount(state: DeckState): number {
  return state.draw.length + state.discard.length
}

/**
 * 마지막으로 공개한 카드가 섞기를 지시하는가.
 *
 * 라운드가 넘어갈 때 이것이 참인 덱만 섞는다(`roundStore`). **뽑는 즉시 섞지
 * 않는다** — 실물에서도 표시는 라운드가 끝날 때 처리한다.
 */
export function needsShuffle(state: DeckState): boolean {
  return state.discard[0]?.shuffleAfter ?? false
}

/* --------------------------------------------------------------------------
   안쪽 배치
   -------------------------------------------------------------------------- */

/** 자리를 어떻게 잡는가. `single`은 버린 덱을 내놓을 자리가 없을 때다. */
export type DeckArrangement = 'single' | 'side-by-side' | 'stacked'

export interface DeckLayout {
  arrangement: DeckArrangement
  /** 버린 덱을 따로 내놓는가. */
  showDiscard: boolean
  cardWidth: number
  cardHeight: number
  gap: number
  /** 카드 면의 숫자 크기(px). */
  faceSize: number
  /** 장수 표기 글자 크기(px). */
  countSize: number
  /** 섞기 표시의 한 변(px). */
  markSize: number
}

/** 실물 미니 카드의 비. 세로가 조금 길다. */
const CARD_RATIO = 1.4
/** 칸을 꽉 채우지 않고 남기는 비율. */
const CARD_FILL = 0.9
/** 두 자리로 갈랐을 때 카드가 이보다 좁아지면 버린 덱을 접는다. */
const MIN_SPLIT_CARD_WIDTH = 44
const MAX_CARD_WIDTH = 180
const GAP_RATIO = 0.08
const MIN_GAP = 4
/** 카드 너비 대비 숫자 크기. */
const FACE_RATIO = 0.5
const MIN_FACE = 10
/** 카드 너비 대비 장수 표기 크기. */
const COUNT_RATIO = 0.26
const MIN_COUNT = 8
const MARK_RATIO = 0.24
const MIN_MARK = 7

const EMPTY_LAYOUT: DeckLayout = {
  arrangement: 'single',
  showDiscard: false,
  cardWidth: 0,
  cardHeight: 0,
  gap: 0,
  faceSize: 0,
  countSize: 0,
  markSize: 0,
}

interface CardFit {
  cardWidth: number
  cardHeight: number
}

/** 이 크기의 칸에 카드 한 장을 넣으면 얼마가 되는가. */
function fitCard(boxWidth: number, boxHeight: number): CardFit {
  if (!(boxWidth > 0) || !(boxHeight > 0)) return { cardWidth: 0, cardHeight: 0 }
  const byWidth = boxWidth * CARD_FILL
  const byHeight = (boxHeight * CARD_FILL) / CARD_RATIO
  const cardWidth = Math.min(MAX_CARD_WIDTH, Math.min(byWidth, byHeight))
  return { cardWidth, cardHeight: cardWidth * CARD_RATIO }
}

/**
 * 위젯이 차지한 픽셀 크기를 받아 안쪽 배치를 낸다.
 *
 * **버린 덱을 낼지는 카드가 얼마나 작아지는가로 정한다.** 위젯의 가로세로 비만
 * 보면 넓고 낮은 자리에서 어긋난다 — 넓으니 좌우로 가르는데, 가르고 나면 카드가
 * 손톱만 해져 숫자를 읽을 수 없다. 원소 트래커가 방향을 두 갈래 다 재 보고 고르는
 * 것과 같은 이유다(구현 결정 14-3).
 */
export function computeDeckLayout(box: { width: number; height: number }): DeckLayout {
  const width = Number.isFinite(box.width) ? box.width : 0
  const height = Number.isFinite(box.height) ? box.height : 0
  if (width <= 0 || height <= 0) return EMPTY_LAYOUT

  const gap = Math.max(MIN_GAP, Math.min(width, height) * GAP_RATIO)

  const single = fitCard(width, height)
  const sideBySide = fitCard((width - gap) / 2, height)
  const stacked = fitCard(width, (height - gap) / 2)

  // 두 자리로 가르는 두 갈래 중 카드가 큰 쪽.
  const split =
    sideBySide.cardWidth >= stacked.cardWidth
      ? { fit: sideBySide, arrangement: 'side-by-side' as const }
      : { fit: stacked, arrangement: 'stacked' as const }

  const showDiscard = split.fit.cardWidth >= MIN_SPLIT_CARD_WIDTH
  const chosen = showDiscard ? split : { fit: single, arrangement: 'single' as const }
  const { cardWidth, cardHeight } = chosen.fit

  return {
    arrangement: chosen.arrangement,
    showDiscard,
    cardWidth,
    cardHeight,
    gap,
    faceSize: cardWidth > 0 ? Math.max(MIN_FACE, cardWidth * FACE_RATIO) : 0,
    countSize: cardWidth > 0 ? Math.max(MIN_COUNT, cardWidth * COUNT_RATIO) : 0,
    markSize: cardWidth > 0 ? Math.max(MIN_MARK, cardWidth * MARK_RATIO) : 0,
  }
}
