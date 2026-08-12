/**
 * 공격 보정 덱의 규칙.
 *
 * 순수 함수로 떼어 둔다(SPEC 4.1). 화면도 스토어도 여기 산술을 다시 하지 않는다.
 *
 * 한 종류를 어떻게 적는지는 `cardSpec.ts`가 정본이다. 여기서는 그것을 **몇 장씩
 * 놓고 어떻게 뽑는가**만 다룬다.
 *
 * **저작권 경계.** 표준 덱은 수치와 기호의 구성일 뿐이다(+0 여럿, ±1, ±2, ×0, ×2).
 * SPEC 3장이 "게임 메커닉의 수치 표현이지 저작물 원문이 아니다"라고 못박았다.
 * 카드 그림과 문구는 담지 않고, 화면에 그리는 것도 직접 그린 도형이다(구현 결정 31).
 *
 * **클래스별 퍽 목록은 담지 않는다.** 그것은 게임 콘텐츠다. 우리가 아는 것은
 * "이 종류를 몇 장 넣는가"까지이며, 어느 퍽이 무엇을 시키는지는 **사용자가 설정에
 * 입력하거나 DB에서 온다**(SPEC 3장의 '사용자 직접 입력' 경로).
 *
 * **확률을 계산하지 않는다.** 남은 장수는 세어 보여주되 "다음에 무엇이 나올
 * 확률"은 내지 않는다 — SPEC 1장이 축 ②에서 확률 계산을 범위 밖에 두었다.
 * 굴림이 이어져도 **합을 내지 않는다** — 뽑힌 카드를 늘어놓을 뿐이다.
 */

import {
  VALUE_IDS,
  parseCardSpec,
  specSpeech,
  valueHasArt,
  type CardMark,
  type CardSpec,
} from './cardSpec'

export {
  MARKS,
  VALUE_IDS,
  cardLabel,
  makeCardSpec,
  markSpeech,
  parseCardSpec,
  specSpeech,
  valueHasArt,
} from './cardSpec'
export type { CardEffect, CardMark, CardSpec, MarkDef, MarkKind } from './cardSpec'

/* --------------------------------------------------------------------------
   카드
   -------------------------------------------------------------------------- */

/**
 * 덱에 실제로 놓인 한 장.
 *
 * `id`는 이 덱 안에서만 고유하다(렌더 키·셔플용). **`kindId`가 정본이고 `spec`은
 * 거기서 뽑은 것이다** — 저장·전송할 때는 앞의 둘만 싣고 `spec`은 앉힐 때 다시
 * 뽑는다(`runtime/snapshot.ts`).
 */
export interface Card {
  readonly id: string
  readonly kindId: string
  readonly spec: CardSpec
}

/** 표준 덱에서 고를 수 있는 아홉 값. 설정 화면이 늘어놓는 차례이기도 하다. */
export const STANDARD_KINDS: readonly CardSpec[] = VALUE_IDS.map((id) => {
  const spec = parseCardSpec(id)
  // 값 낱말 목록에서 온 것이라 반드시 읽힌다. 못 읽었다면 표가 어긋난 것이다.
  if (!spec) throw new Error(`값 낱말을 읽지 못했다: ${id}`)
  return spec
})

/** 카드 한 장을 짓는다. 알아볼 수 없는 종류면 `null`. */
export function makeCard(id: string, kindId: string): Card | null {
  const spec = parseCardSpec(kindId)
  if (!spec) return null
  return { id, kindId: spec.id, spec }
}

/* --------------------------------------------------------------------------
   에셋 — Creator Pack (SPEC 13.1)
   -------------------------------------------------------------------------- */

/**
 * 카드 그림이 놓인 곳.
 *
 * **여기 있는 것은 전부 Creator Pack 유래이며 CC BY-NC-SA 4.0이다.** 파일은
 * `public/assets/creator-pack/`에만 두고 `.tsx`에 인라인으로 박지 않는다 —
 * SA가 소스 파일까지 번질 소지를 막는 격리 규칙이다(SPEC 13.1).
 *
 * 경로는 `BASE_URL`을 앞에 붙인다. GitHub Pages가 하위 경로에 놓이므로
 * 절대 경로로 적으면 깨진다(SPEC 3.1).
 */
const ASSET_ROOT = `${import.meta.env.BASE_URL}assets/creator-pack/`

/** 카드 뒷면. 부채꼴 비늘 바탕에 엇갈린 두 검. */
export const CARD_BACK_URL = `${ASSET_ROOT}attack-modifiers/card-back.webp`

/** 카드 앞면 틀. 가운데 원형 홈과 왼쪽 아래 섞기 자리가 비어 있다. */
export const CARD_FACE_URL = `${ASSET_ROOT}attack-modifiers/card-face.webp`

/** 섞기 표식. `Icon Pack/General Icons.pdf` 21쪽에서 뽑은 벡터다. */
export const SHUFFLE_ICON_URL = `${ASSET_ROOT}general/shuffle.svg`

/**
 * 카드에 파인 둥근 홈.
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ **빈 카드 틀에 박힌 왼쪽 아래 홈을 오려낸 것이다.**                       │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * 실물 카드는 **양쪽 아래에 홈이 있고** 왼쪽에는 덱 주인이, 오른쪽에는 섞기
 * 표식이 앉는다. 그런데 팩의 빈 카드 그림(`card-face.webp`)에는 왼쪽 홈만 박혀
 * 있어, 오른쪽에 섞기 표식만 얹으면 **바탕 없이 아이콘만 떠 있었다** — 형님이
 * 짚었다.
 *
 * 왼쪽 홈을 오려 알파로 잘라 두면 어디에나 얹을 수 있다. 자르기와 알파뿐이고
 * 다시 그리지 않았다 — 값 메달을 여백만 잘라 뽑은 것과 같은 손질이다(SPEC 13.1).
 */
export const SOCKET_URL = `${ASSET_ROOT}attack-modifiers/socket.webp`

/**
 * 값 메달. 그림이 없는 값(+3·+4)은 `null`이며 숫자를 직접 그린다.
 *
 * **표식이 아니라 값으로 고른다.** `+1 부상` 카드도 메달은 그냥 `+1`이고 부상은
 * 그 옆에 따로 붙는다 — 실물 카드가 그렇게 짜여 있다.
 */
export function medallionUrl(valueId: string): string | null {
  return valueHasArt(valueId) ? `${ASSET_ROOT}attack-modifiers/${valueId}.webp` : null
}

/** 원소 표식의 아이콘. 원소 트래커와 같은 파일을 쓴다. */
export function markIconUrl(mark: CardMark): string | null {
  return mark.def.kind === 'element' ? `${ASSET_ROOT}elements/${mark.def.id}.svg` : null
}

/**
 * 카드 앞면에서 각 표식이 앉는 자리.
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ **실물 카드를 재서 얻은 값이다.**                                         │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * 2026-08-12에 형님이 실물 카드 석 장을 찍어 주었다(표준 ×2, 굴림 빛, +1 이동불가).
 * 눈금을 그어 재 보니 이랬다.
 *
 * | 무엇 | 자리 | 크기 |
 * |---|---|---|
 * | 값 메달 | 가운데 | 46.5% |
 * | **덱 주인 표식** | 왼쪽 아래 홈 (13.5, 79) | 11% |
 * | **섞기 표식** | **오른쪽 아래** (88, 79) | 11% |
 * | 상태이상·원소 배지 | 왼쪽 가운데 (11.5, 50)에서 위아래로 | 15% |
 * | 굴림 배지 | 오른쪽 가운데 (88, 50) | 15% |
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ **왼쪽 아래 홈은 섞기 자리가 아니다. 덱 주인 자리다.**                     │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * 실물에서는 거기에 1·2·3·4·M(몬스터)이나 **그 카드를 넣어 준 클래스의 표식**이
 * 들어간다 — 판이 끝나고 덱을 도로 가를 때 쓰는 자리다. 우리는 그 홈에 섞기
 * 표식을 앉혀 두었는데 형님이 짚었다. 섞기는 오른쪽 아래로 옮겼다.
 *
 * **메달 자리는 눈으로 맞춘 값이다.** 처음에 홈의 바깥 테를 재서 (196,134)로
 * 두었는데 미세하게 왼쪽 위로 치우쳐 보였다. 그림자와 하이라이트가 홈 안에서
 * 한쪽으로 쏠려 있어 기하학적 중심과 눈이 보는 중심이 어긋난다. 후보를 늘어놓고
 * 형님이 고른 것이 이 값이다 — **재는 것보다 보는 것이 맞는 자리다.**
 */
export const FACE_SLOTS = {
  medallion: { cx: 50.0, cy: 49.8, size: 46.5 },
  /**
   * 왼쪽 아래 홈. 덱 주인(1~4·M·클래스 표식)이 앉는다.
   *
   * **빈 카드 그림에 이미 박혀 있다** — 우리가 그리지 않는다. 크기는 그 홈의
   * 바깥 테를 재서 얻었다(400×271에서 중심 (54.8, 215.5), 지름 38).
   */
  owner: { cx: 13.75, cy: 79.6, size: 9.6 },
  /**
   * 홈의 **테 안쪽**. 여기 앉는 것이 홈에 딱 들어맞는다.
   *
   * 오려 둔 홈 그림(`socket.webp`)을 12배로 늘려 재니 바깥 37px, 안쪽 31px이었다
   * (원본 400px 카드와 1:1로 오렸으므로 그대로 카드 좌표다). 바깥 지름에 어림수를
   * 곱해 쓰다가 테를 덮었다 — **안쪽을 따로 재서 적어 둔다.**
   *
   * **자리는 잰 값에서 반 픽셀 옮긴 것이다.** 재기만 해서는 왼쪽 테가 두껍고
   * 아래 테가 얇아 보였다 — 홈이 정원이 아니고 빛도 위에서 든다. 카드를 여덟
   * 배로 늘려 0.5px씩 옮긴 아홉 칸을 늘어놓고 형님이 `x−0.5 y+0.5`를 골랐다
   * (54.5, 216.2). **재는 것보다 보는 것이 맞는 자리다** — 값 메달에서 겪은
   * 자리와 같다.
   */
  ownerInner: { cx: 13.625, cy: 79.78, size: 7.8 },
  /**
   * 오른쪽 아래. 홈을 먼저 얹고 그 위에 섞기 표식을 앉힌다.
   *
   * 실물의 오른쪽 홈은 왼쪽보다 테가 조금 두껍다. 우리에게는 왼쪽 홈을 오린
   * 것 하나뿐이라 같은 것을 쓰되 조금 크게 앉힌다.
   */
  shuffle: { cx: 88.0, cy: 79.5, size: 11.0 },
  /**
   * 홈 안에 앉는 섞기 표식.
   *
   * 실물에서는 화살이 홈을 거의 채운다 — 홈 지름의 7할쯤이다. 그보다 작게 두면
   * 홈만 크고 표식이 점처럼 보인다.
   */
  shuffleIcon: { cx: 88.0, cy: 79.5, size: 7.6 },
  /**
   * 상태이상·원소 배지. 여럿이면 이 자리를 가운데로 위아래로 쌓인다.
   *
   * ┌────────────────────────────────────────────────────────────────────────┐
   * │ **쌓는 폭은 여기 적지 않는다. 축이 섞이기 때문이다.**                    │
   * └────────────────────────────────────────────────────────────────────────┘
   *
   * `size`는 카드 **가로**의 %이고 `cy`는 **세로**의 %다. 카드가 가로로 길어서
   * (437:296) 가로 15%짜리 배지는 세로로 치면 22%가 된다 — 칸 간격을 세로 17%로
   * 두었더니 겹쳤다. 카드 비를 곱해 맞출 수도 있지만 그러면 **비가 바뀔 때마다
   * 두 곳을 고쳐야 한다.**
   *
   * 그래서 쌓는 일은 CSS `translate`에 맡긴다 — `translate`의 %는 **제 크기**를
   * 기준으로 하므로 카드 비와 아예 무관하다(`--deck-badge-i`).
   */
  effect: { cx: 11.5, cy: 50.0, size: 15.0 },
  rolling: { cx: 88.0, cy: 50.0, size: 15.0 },
} as const

/* --------------------------------------------------------------------------
   공개한 카드를 크게 보여주는 시간
   -------------------------------------------------------------------------- */

/**
 * 뽑은 카드를 크게 띄워 두는 시간.
 *
 * 3초다. 판을 세우지 않을 만큼 짧고, 상 건너편에서도 읽을 만큼은 된다. 기다릴
 * 이유가 없으면 탭 한 번으로 바로 닫는다 — **뜸을 들이는 확인 팝업과 정반대다**
 * (구현 결정 36). 저쪽은 되돌릴 수 없는 일을 막으려고 처음엔 안 눌리게 두지만,
 * 이쪽은 이미 벌어진 일을 보여줄 뿐이라 언제든 걷어낼 수 있어야 한다.
 */
export const REVEAL_HOLD_MS = 3000

/** 카드가 버린 덱으로 날아가는 시간. 눈이 따라갈 만큼만. */
export const REVEAL_FLY_MS = 420

/**
 * 남은 뜸을 다시 재는 간격.
 *
 * 띠가 계단으로 뛰지 않을 만큼 촘촘히. 확인 팝업의 `CONFIRM_TICK_MS`와 같은 값이며
 * 이유도 같다.
 */
export const REVEAL_TICK_MS = 50

/**
 * 아직 남은 뜸의 비율 0..1.
 *
 * 1이면 막 떴고 0이면 닫힐 때다. **띠와 닫는 시각을 이 한 값에서 뽑는다** —
 * CSS 애니메이션으로 띠를 돌리고 닫기는 JS 타이머에 맡기면, 탭이 뒤로 갔다 올 때
 * 띠는 다 비었는데 팝업은 그대로 있는 꼴이 난다(구현 결정 38이 같은 자리를 짚었다).
 */
export function revealRemainingRatio(remaining: number, total: number): number {
  if (!(total > 0)) return 0
  return Math.min(1, Math.max(0, remaining / total))
}

/** 읽어주는 쪽에 가는 한국어. 화면 글자는 라틴이지만 소리는 우리말이어야 한다. */
export function cardSpeech(card: Pick<Card, 'spec'>): string {
  return specSpeech(card.spec)
}

/** 굴림으로 이어진 뽑기 전체를 한 줄로 읽어준다. */
export function chainSpeech(chain: readonly Card[]): string {
  return chain.map(cardSpeech).join(' 다음 ')
}

/* --------------------------------------------------------------------------
   덱 구성 — 퍽이 손대는 자리
   -------------------------------------------------------------------------- */

/**
 * 종류별 장수.
 *
 * **퍽은 이 표를 고치는 것으로 표현된다.** "−1 두 장을 빼고 +1 한 장을 넣는다"
 * 같은 것이 곧 이 수치의 증감이다.
 *
 * **열쇠는 아홉 값에 갇혀 있지 않다.** `p1.wound`·`r.p0.fire`처럼 표식과 굴림이
 * 붙은 종류도 그대로 열쇠가 된다(`cardSpec.ts`). 알아볼 수 없는 열쇠는 `buildDeck`이
 * 조용히 건너뛴다.
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

/**
 * 한 덱이 가질 수 있는 최대 장수.
 *
 * 종류가 열려 있으므로 종류별 한도만으로는 위가 없다. 표준이 20장이고 퍽으로
 * 늘어나 봐야 30장을 넘지 않는다 — 넉넉히 잡되 무한히 열어 두지는 않는다.
 */
export const MAX_DECK_SIZE = 120

export function countOf(composition: DeckComposition, kindId: string): number {
  return composition[kindId] ?? 0
}

function clampCount(raw: number): number {
  if (!Number.isFinite(raw)) return 0
  return Math.max(0, Math.min(MAX_PER_KIND, Math.trunc(raw)))
}

/**
 * 구성표에 든 종류를 **늘 같은 차례로** 늘어놓는다.
 *
 * 아홉 값이 먼저고 그다음이 표식 붙은 것들(낱말 사전 순)이다. 차례가 흔들리면
 * `buildDeck`이 렌더마다 다른 결과를 내어 `react-hooks/purity`가 막는 자리가
 * 된다(구현 결정 12).
 */
function orderedKinds(composition: DeckComposition): CardSpec[] {
  const seen = new Set<string>()
  const out: CardSpec[] = []

  for (const key of Object.keys(composition)) {
    const spec = parseCardSpec(key)
    if (!spec || seen.has(spec.id)) continue
    seen.add(spec.id)
    out.push(spec)
  }

  const rank = new Map(VALUE_IDS.map((id, index) => [id, index]))
  out.sort((a, b) => {
    // 표식이 없는 것이 먼저다 — 늘 있던 아홉이 위에 모인다.
    const plain =
      Number(b.marks.length === 0 && !b.rolling) - Number(a.marks.length === 0 && !a.rolling)
    if (plain !== 0) return plain
    const byValue = (rank.get(a.valueId) ?? 99) - (rank.get(b.valueId) ?? 99)
    if (byValue !== 0) return byValue
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0
  })

  return out
}

/** 구성표에 실제로 들어가는 종류들. 알아볼 수 없는 열쇠는 빠진다. */
export function compositionKinds(composition: DeckComposition): CardSpec[] {
  return orderedKinds(composition).filter((spec) => countOf(composition, spec.id) > 0)
}

export function compositionSize(composition: DeckComposition): number {
  let total = 0
  for (const spec of orderedKinds(composition)) total += clampCount(countOf(composition, spec.id))
  return Math.min(MAX_DECK_SIZE, total)
}

/**
 * 구성표를 실제 카드 목록으로 편다. **섞지 않는다** — 섞는 것은 따로다.
 *
 * 종류 순서대로 늘어놓으므로 결과가 늘 같다. 렌더 중에 불려도 안전하다
 * (구현 결정 12 — 같은 입력에 같은 결과).
 */
export function buildDeck(composition: DeckComposition = STANDARD_COMPOSITION): Card[] {
  const cards: Card[] = []
  for (const spec of orderedKinds(composition)) {
    const count = clampCount(countOf(composition, spec.id))
    for (let n = 0; n < count; n += 1) {
      if (cards.length >= MAX_DECK_SIZE) return cards
      cards.push({ id: `${spec.id}#${n}`, kindId: spec.id, spec })
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

/**
 * 한 번의 뽑기 — **굴림이 나오면 끝나지 않는다.**
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ **굴림은 그림이 아니라 규칙이다.**                                        │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * 굴림 표식이 붙은 카드를 뽑으면 그 자리에서 한 장을 더 뽑고, 굴림이 아닌 것이
 * 나올 때까지 이어진다. 실물에서 손으로 하던 일이며 규칙을 판정하는 것이 아니다 —
 * **합을 내지 않고 뽑힌 것을 늘어놓을 뿐이다**(SPEC 1장).
 *
 * 굴림만 든 덱을 만들어 두면 영영 끝나지 않으므로 **덱에 든 장수만큼에서 멎는다.**
 * 규칙이 아니라 무한 고리를 막는 울타리다.
 */
export interface TurnResult {
  readonly state: DeckState
  /** 이번에 뽑은 것 전부. 뽑은 차례대로이며 마지막이 굴림이 아닌 카드다. */
  readonly chain: readonly Card[]
  /** 뽑는 도중에 한 번이라도 저절로 섞였는가. */
  readonly reshuffled: boolean
}

export function drawTurn(state: DeckState, rng: Rng): TurnResult {
  const limit = totalCount(state)
  let working = state
  let reshuffled = false
  const chain: Card[] = []

  while (chain.length < limit) {
    const result = drawOne(working, rng)
    working = result.state
    reshuffled = reshuffled || result.reshuffled
    if (!result.card) break
    chain.push(result.card)
    if (!result.card.spec.rolling) break
  }

  return { state: working, chain, reshuffled }
}

/** 가장 최근에 공개한 카드. 없으면 `null`. */
export function revealedCard(state: DeckState): Card | null {
  return state.discard[0] ?? null
}

/**
 * 가장 최근 뽑기에 딸린 카드 전부. 뽑은 차례대로.
 *
 * **따로 들고 있지 않고 버린 더미에서 되짚는다.** 버린 더미는 최근 것이 0번이고
 * 굴림 카드는 언제나 마지막 카드보다 **먼저** 뽑히므로, 0번부터 굴림이 이어지는
 * 데까지가 한 번의 뽑기다. 상태를 하나 더 두면 그것이 판을 나를 때 어긋난다.
 */
export function revealedChain(state: DeckState): Card[] {
  const chain: Card[] = []
  for (let i = 0; i < state.discard.length; i += 1) {
    const card = state.discard[i]
    if (!card) break
    chain.push(card)
    // 앞선 것이 굴림이면 그것도 이번 뽑기다. 굴림이 아니면 지난 뽑기의 끝이다.
    const older = state.discard[i + 1]
    if (!older || !older.spec.rolling) break
  }
  return chain.reverse()
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
  return state.discard[0]?.spec.shuffleAfter ?? false
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
  /**
   * 섞기 표시의 한 변(px).
   *
   * **카드에만 붙는다.** 한때 위젯 귀퉁이에도 같은 표식을 띄웠는데, 표시가 뜬
   * 카드가 화면에 나와 있으므로 같은 것이 두 번 보였다. 하나면 된다.
   */
  markSize: number
}

/**
 * 높이 ÷ 너비.
 *
 * **실물 공격 보정 카드는 가로가 길다.** Creator Pack의 `Attack Modifier -
 * Back.jpg`가 437×296이므로 그 비를 그대로 쓴다. 처음에는 여느 카드처럼 세로가
 * 길 것으로 짐작해 1.4로 두었는데, 팩을 열어 보고 뒤집혔음을 알았다.
 */
const CARD_RATIO = 296 / 437
/** 칸을 꽉 채우지 않고 남기는 비율. */
const CARD_FILL = 0.9
/**
 * 두 자리로 갈랐을 때 카드가 이보다 좁아지면 버린 덱을 접는다.
 *
 * 값 메달이 카드 너비의 46.5%이므로 64px이면 메달이 30px쯤 된다. 그 아래로는
 * 메달 안의 숫자가 뭉갠다.
 *
 * **카드가 가로로 길어지면서 한 번 올렸다.** 세로 카드일 때는 44px이었는데,
 * 가로 카드는 같은 칸에 더 잘 들어가서 한 칸짜리 위젯에도 두 장이 앉아 버렸다.
 * 앉기는 하지만 메달이 26px이라 읽을 수가 없다.
 */
const MIN_SPLIT_CARD_WIDTH = 64
const MAX_CARD_WIDTH = 240
const GAP_RATIO = 0.08
const MIN_GAP = 4
/**
 * 카드 너비 대비 숫자 크기.
 *
 * 그림이 없는 종류(+3·+4)에만 쓴다. 메달 홈(46.5%) 안에 앉아야 하므로 그보다
 * 작다.
 *
 * **내보낸다.** 크게 띄우는 팝업(`RevealFlash`)은 위젯 바깥에 그려져 `computeDeckLayout`이
 * 낸 픽셀값을 물려받지 못한다. 거기서는 제 너비에 이 비를 곱해 쓴다 — 비를 두 곳에
 * 적으면 반드시 어긋난다.
 */
export const FACE_RATIO = 0.26
const MIN_FACE = 10
/**
 * 카드 너비 대비 장수 표기 크기.
 *
 * 작다. **곁다리 정보이기 때문이다** — 판을 돌리는 것은 뽑힌 카드이고 남은
 * 장수는 궁금할 때만 본다. 처음 0.17은 카드에 얹힌 알약이 눈에 먼저 들어왔다.
 */
const COUNT_RATIO = 0.12
const MIN_COUNT = 7
/** 설정 화면의 작은 메달 미리보기에 쓴다. */
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
