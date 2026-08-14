import type { Character, CharacterEdits } from './types'

/**
 * 캐릭터 기록 — 무엇을 언제 고쳤는가.
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ **글이 아니라 값으로 담고, 읽을 때 우리말로 옮긴다.**                     │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * 서버에는 `{ field, from, to }`만 들어간다(`0018`). 글로 담으면 나중에 문구를
 * 고칠 때 **옛 기록만 옛말로 남는다.**
 *
 * 이 파일은 화면을 모른다 — 옮기는 것도 시각을 적는 것도 순수 함수라 통째로
 * 시험할 수 있다(구현 결정 158과 같은 손질).
 */

/**
 * 어떤 경로로 고쳤는가.
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ **무엇이 바뀌었는가만으로는 부족하다 — 왜 바뀌었는지가 갈린다.**          │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * 「골드 120 → 160」이 전투에서 노획한 것인지 손으로 맞춘 것인지 나중에 알 수
 * 없다. 정산이 맞았는지 되짚는 것이 기록을 두는 까닭이므로 그 둘이 갈려야 한다.
 *
 * **고친 갈래는 셋뿐이다.** 더 잘게 쪼개면 고를 때마다 생각해야 하고, 생각하기
 * 싫으면 아무거나 고르게 된다.
 *
 * `shop`은 시트에서 고친 것이지만 **왜 그렇게 됐는지가 다르다** — 골드가 빠지고
 * 아이템이 는 것은 손으로 맞춘 것과 값만 같을 뿐이다(형님이 정했다).
 *
 * `created`는 고친 것이 아니라 **처음 생긴 것**이다. 셋 중 어디에도 안 들어맞아
 * 따로 둔다 — 이것이 없으면 기록이 중간부터 시작해 **맨 아래 줄이 첫 정산인
 * 것처럼 읽힌다.**
 */
export type LogReason = 'created' | 'scenario' | 'manual' | 'shop' | 'other'

export const LOG_REASONS: readonly LogReason[] = ['created', 'scenario', 'manual', 'shop', 'other']

/** 화면에 적는 말. **흔히 쓰는 낱말로 둔다** — 우리끼리만 아는 말은 안 쓴다. */
export const REASON_TEXT: Readonly<Record<LogReason, string>> = {
  created: '생성',
  scenario: '시나리오 정산',
  manual: '직접 수정',
  shop: '상점 거래',
  other: '기타',
}

export function reasonText(reason: string): string {
  return REASON_TEXT[reason as LogReason] ?? REASON_TEXT.other
}

/** 기록 한 줄에 담기는 변화 하나. */
export interface LogChange {
  readonly field: string
  readonly from: unknown
  readonly to: unknown
}

export interface LogEntry {
  readonly id: string
  readonly at: number
  readonly actorName: string
  readonly reason: string
  readonly changes: readonly LogChange[]
}

/* --------------------------------------------------------------------------
   무엇이 바뀌었는가
   -------------------------------------------------------------------------- */

/**
 * 저장할 것에서 기록에 담을 변화를 뽑는다.
 *
 * `sheetDiff`가 이미 바뀐 칸만 골라 주므로(구현 결정 166) 여기서는 **그 전후를
 * 짝지어** 담기만 한다. 레벨은 경험치에서 나오는 값이라 따로 적지 않는다 —
 * 경험 줄을 보면 알 수 있고, 두 줄로 적으면 한 번 고친 것이 두 번으로 읽힌다.
 */
export function changesOf(before: Character, edits: CharacterEdits): LogChange[] {
  const out: LogChange[] = []
  const put = (field: keyof CharacterEdits & keyof Character) => {
    const to = edits[field as keyof CharacterEdits]
    if (to === undefined) return
    out.push({ field, from: before[field], to })
  }
  put('xp')
  put('gold')
  put('checkmarks')
  put('perks')
  put('items')
  put('notes')
  put('retired')
  return out
}

/**
 * 칸 이름.
 *
 * **캐릭터와 파티가 한 표를 나눠 쓴다** — 옮기는 규칙(수는 차이까지, 목록은 들고
 * 난 것만)이 같으므로 두 벌로 두면 언젠가 어긋난다. 이름이 겹치는 칸은 없다.
 */
const FIELD_NAME: Readonly<Record<string, string>> = {
  created: '생성',
  // 캐릭터
  xp: '경험',
  gold: '골드',
  checkmarks: '전투 목표',
  perks: '특혜',
  items: '아이템',
  notes: '메모',
  retired: '은퇴',
  // 파티
  name: '이름',
  location: '머무는 곳',
  reputation: '평판',
  achievements: '업적',
}

/** 글자를 담는 칸. 값이 짧아 무엇으로 바뀌었는지 그대로 보여 준다. */
const TEXT_FIELDS: readonly string[] = ['name', 'location']

function asNumbers(v: unknown): number[] {
  return Array.isArray(v) ? v.filter((n): n is number => typeof n === 'number') : []
}

function asStrings(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((s): s is string => typeof s === 'string') : []
}

/**
 * 변화 하나를 우리말 한 줄로.
 *
 * **수는 얼마나 움직였는지 함께 적는다** — `120 → 160 (+40)`. 기록을 보는
 * 까닭이 "얼마를 올렸나"이므로 차이가 곧 알맹이다.
 *
 * 목록(특혜·아이템)은 **들고 난 것만** 적는다. 통째로 늘어놓으면 무엇이
 * 달라졌는지 되레 안 보인다.
 */
export function describeChange(change: LogChange): string {
  const name = FIELD_NAME[change.field] ?? change.field

  /*
    **이름은 적지 않는다.** 기록은 캐릭터 한 장의 것이라 누구인지는 이미 알고,
    무엇보다 우리말 조사(을/를)가 받침에 따라 갈려 이름을 넣으면 어색해진다.
  */
  if (change.field === 'created') return '캐릭터를 만들었다'

  if (change.field === 'retired') {
    return change.to === true ? '은퇴시켰다' : '다시 나섰다'
  }

  if (TEXT_FIELDS.includes(change.field)) {
    const from = typeof change.from === 'string' ? change.from.trim() : ''
    const to = typeof change.to === 'string' ? change.to.trim() : ''
    if (to === '') return `${name}을 비웠다`
    return from === '' ? `${name} → ${to}` : `${name} ${from} → ${to}`
  }

  if (change.field === 'notes') {
    const to = typeof change.to === 'string' ? change.to.trim() : ''
    return to === '' ? '메모를 비웠다' : '메모를 고쳤다'
  }

  if (change.field === 'perks') {
    const from = new Set(asNumbers(change.from))
    const to = asNumbers(change.to)
    const added = to.filter((n) => !from.has(n))
    const removed = [...from].filter((n) => !to.includes(n))
    const parts: string[] = []
    if (added.length > 0) parts.push(`${added.join('·')}번 켬`)
    if (removed.length > 0) parts.push(`${removed.join('·')}번 끔`)
    return `${name} ${parts.join(', ')}`
  }

  if (change.field === 'achievements') {
    const from = asStrings(change.from)
    const to = asStrings(change.to)
    const added = to.filter((s) => !from.includes(s))
    const removed = from.filter((s) => !to.includes(s))
    const parts: string[] = []
    if (added.length > 0) parts.push(`${added.join(', ')} 더함`)
    if (removed.length > 0) parts.push(`${removed.join(', ')} 뺌`)
    return `${name} ${parts.join(' / ')}`
  }

  if (change.field === 'items') {
    const from = asStrings(change.from)
    const to = asStrings(change.to)
    const added = to.filter((s) => !from.includes(s))
    const removed = from.filter((s) => !to.includes(s))
    const parts: string[] = []
    if (added.length > 0) parts.push(`${added.join(', ')} 더함`)
    if (removed.length > 0) parts.push(`${removed.join(', ')} 뺌`)
    return `${name} ${parts.join(' / ')}`
  }

  const from = typeof change.from === 'number' ? change.from : 0
  const to = typeof change.to === 'number' ? change.to : 0
  const delta = to - from
  const sign = delta > 0 ? '+' : '−'
  return `${name} ${from} → ${to} (${sign}${Math.abs(delta)})`
}

/* --------------------------------------------------------------------------
   언제 고쳤는가
   -------------------------------------------------------------------------- */

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

/**
 * 사람이 읽는 시각.
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ **개발자용이 아니다 — 기호를 늘어놓지 않는다.**                           │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * `2026-08-13T13:32:42Z`는 기계의 말이다. 방금 고친 것은 「방금」이라 하고, 오늘
 * 것은 시각만, 그보다 오래된 것은 날짜까지 적는다 — **알고 싶은 것은 "얼마나
 * 지났나"이지 몇 초인지가 아니다.**
 *
 * 해가 바뀌면 연도까지 적는다. 캠페인이 해를 넘길 수 있다.
 *
 * @param now 견줄 지금. 시험이 시각을 못박을 수 있게 받는다.
 */
export function whenText(at: number, now: number): string {
  const gap = now - at
  if (gap < 0) return timeOfDay(at)
  if (gap < MINUTE) return '방금'
  if (gap < HOUR) return `${Math.floor(gap / MINUTE)}분 전`
  if (gap < 6 * HOUR) return `${Math.floor(gap / HOUR)}시간 전`

  const d = new Date(at)
  const n = new Date(now)
  const sameDay =
    d.getFullYear() === n.getFullYear() &&
    d.getMonth() === n.getMonth() &&
    d.getDate() === n.getDate()
  if (sameDay) return `오늘 ${timeOfDay(at)}`

  const yesterday = new Date(now - DAY)
  const isYesterday =
    d.getFullYear() === yesterday.getFullYear() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getDate() === yesterday.getDate()
  if (isYesterday) return `어제 ${timeOfDay(at)}`

  const sameYear = d.getFullYear() === n.getFullYear()
  const date = `${d.getMonth() + 1}월 ${d.getDate()}일`
  return sameYear ? `${date} ${timeOfDay(at)}` : `${d.getFullYear()}년 ${date} ${timeOfDay(at)}`
}

/** 「오후 10시 32분」. 24시간제는 기계의 말에 가깝다. */
function timeOfDay(at: number): string {
  const d = new Date(at)
  const h = d.getHours()
  const half = h < 12 ? '오전' : '오후'
  const h12 = h % 12 === 0 ? 12 : h % 12
  return `${half} ${h12}시 ${String(d.getMinutes()).padStart(2, '0')}분`
}

/* --------------------------------------------------------------------------
   파티
   -------------------------------------------------------------------------- */

/**
 * 파티 기록지에서 바뀐 칸을 기록에 담을 꼴로.
 *
 * 캐릭터와 나누지 않는 것은 **칸 목록이 다르기 때문**이다 — 옮기는 규칙
 * (`describeChange`)만 함께 쓴다.
 */
export function campaignChangesOf(
  before: Record<string, unknown>,
  edits: Record<string, unknown>,
): LogChange[] {
  const out: LogChange[] = []
  for (const field of ['name', 'location', 'reputation', 'achievements', 'notes']) {
    const to = edits[field]
    if (to === undefined) continue
    out.push({ field, from: before[field], to })
  }
  return out
}

/* --------------------------------------------------------------------------
   상점 거래 갈라내기
   -------------------------------------------------------------------------- */

/** 이번 편집 동안 상점에서 산 것 하나. */
export interface Purchase {
  readonly name: string
  readonly cost: number
}

/**
 * 저장할 것을 **상점 거래와 직접 수정으로 가른다.**
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ **한 번 저장했다고 한 가지 일을 한 것이 아니다.**                         │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * 상점에서 사고 나서 경험치도 손으로 올린 채 저장할 수 있다. 그것을 한 줄로
 * 남기면 골드가 왜 줄었는지 알 수 없다 — **산 만큼은 상점 거래로, 나머지는 직접
 * 수정으로** 두 줄을 남긴다.
 *
 * 가르는 자리는 「산 뒤 · 손대기 전」의 값이다: 골드는 `before - 값의 합`이고
 * 아이템은 `before + 산 것`이다. 상점 줄이 거기까지를 말하고, 직접 수정 줄이
 * 그 뒤부터를 말한다.
 *
 * 순수 함수라 표로 못박는다 — 여기가 틀리면 **기록이 거짓말을 한다.**
 */
export function splitByShop(
  before: Character,
  edits: CharacterEdits,
  bought: readonly Purchase[],
): { shop: LogChange[]; manual: LogChange[] } {
  if (bought.length === 0) return { shop: [], manual: changesOf(before, edits) }

  const spent = bought.reduce((sum, b) => sum + b.cost, 0)
  // 시트가 0에서 멎게 하므로(음수 골드는 뜻이 없다) 여기서도 같이 멎는다.
  const midGold = Math.max(0, before.gold - spent)
  const midItems = [...before.items, ...bought.map((b) => b.name)]

  const shop: LogChange[] = []
  if (spent > 0) shop.push({ field: 'gold', from: before.gold, to: midGold })
  shop.push({ field: 'items', from: before.items, to: midItems })

  /* 나머지는 「산 뒤」의 값에서 이어 센다 — 골드와 아이템만 자리가 옮겨져 있다. */
  const mid: Record<string, unknown> = { ...before, gold: midGold, items: midItems }
  const manual: LogChange[] = []
  for (const field of ['xp', 'gold', 'checkmarks', 'perks', 'items', 'notes', 'retired'] as const) {
    const to = edits[field]
    if (to === undefined) continue
    const from = mid[field]
    // 상점이 이미 말한 만큼이면 다시 적지 않는다.
    if (JSON.stringify(from) === JSON.stringify(to)) continue
    manual.push({ field, from, to })
  }

  return { shop, manual }
}
