import { MAX_PROSPERITY } from '../rules/prosperity'
import { clampReputation } from './reputation'
import type { Campaign, CampaignEdits } from './types'

/**
 * 파티 기록지의 초안 — **편집 모드에서 손대는 사본.**
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ **고치는 즉시 보내지 않는다. 저장을 누를 때 한 번 보낸다.**               │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * 캐릭터 시트와 같은 짜임이며 까닭도 같다(`sheetDraft.ts`) — 평판을 −5에서 +8로
 * 옮기면 그 사이 열세 번이 나가고 `version`이 손가락 수만큼 오른다. 그냥
 * 들여다보는 동안에도 칸이 열려 있어 **스치기만 해도 값이 바뀌었다.**
 *
 * **파티는 함께 쓰는 것이라 파티원이면 누구나 고친다**(구현 결정 44). 캐릭터
 * 시트가 "제 것만"인 것과 다르다 — 그래서 여기에는 `mine` 같은 것이 없고 서버에
 * 못 닿는 때만 잠긴다.
 *
 * 순수 함수로 떼어 둔다(SPEC 4.1).
 */

/** 기록지에서 사람이 고치는 칸 전부. */
export interface PartyDraft {
  name: string
  location: string
  notes: string
  achievements: string[]
  /** 전역 업적 — `{ 이름: 횟수 }`. 되풀이해 이룬다. */
  globalAchievements: Record<string, number>
  /** 번영도 1~9. */
  prosperity: number
  reputation: number
  /** 개봉 조건을 어디까지 켰는가 — `{ 조건 id: 켠 칸 수 }`. */
  unlocks: Record<string, number>
}

/** 지금 레코드를 초안으로 뜬다. 배열은 **사본으로** 뜬다 — 원본을 건드리면 안 된다. */
export function draftOf(campaign: Campaign): PartyDraft {
  return {
    name: campaign.name,
    location: campaign.location,
    notes: campaign.notes,
    achievements: [...campaign.achievements],
    globalAchievements: { ...campaign.globalAchievements },
    prosperity: campaign.prosperity,
    reputation: campaign.reputation,
    unlocks: { ...campaign.unlocks },
  }
}

/** 두 표가 같은가. 열쇠가 다르거나 수가 다르면 고친 것이다. */
function sameCounts(a: Record<string, number>, b: Record<string, number>): boolean {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)])
  for (const key of keys) {
    if ((a[key] ?? 0) !== (b[key] ?? 0)) return false
  }
  return true
}

function sameStrings(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((s, i) => s === b[i])
}

/**
 * 초안에서 **실제로 바뀐 칸만** 뽑는다.
 *
 * 통째로 보내지 않는 까닭은 둘이다. ① 안 건드린 칸까지 덮으면 그 사이 남이 고친
 * 것을 되돌린다 — **파티는 여럿이 함께 쓰므로 이쪽이 캐릭터보다 더 잦다.**
 * ② 무엇이 바뀌었는지가 곧 저장 단추가 살아나는 조건이라, 그 판정을 두 곳에서
 * 따로 하면 언젠가 어긋난다 — **한 함수가 둘 다 낸다.**
 */
export function partyDiff(campaign: Campaign, draft: PartyDraft): CampaignEdits {
  const edits: CampaignEdits = {}

  // 앞뒤 공백은 턴다. 눈에 안 보이는 차이로 저장 단추가 살아나면 안 된다.
  const name = draft.name.trim()
  if (name !== campaign.name) edits.name = name

  const location = draft.location.trim()
  if (location !== campaign.location) edits.location = location

  if (draft.notes !== campaign.notes) edits.notes = draft.notes

  const reputation = clampReputation(draft.reputation)
  if (reputation !== campaign.reputation) edits.reputation = reputation

  const prosperity = Math.max(1, Math.min(MAX_PROSPERITY, Math.trunc(draft.prosperity)))
  if (prosperity !== campaign.prosperity) edits.prosperity = prosperity

  // 빈 줄은 업적이 아니다. 걸러 내되 차례는 지킨다.
  const achievements = draft.achievements.map((s) => s.trim()).filter((s) => s !== '')
  if (!sameStrings(achievements, campaign.achievements)) edits.achievements = achievements

  /* 0으로 내려간 것은 열쇠째 걷는다 — 안 켠 것과 같은 값을 두 모양으로 두지 않는다. */
  const unlocks: Record<string, number> = {}
  for (const [id, count] of Object.entries(draft.unlocks)) {
    if (count > 0) unlocks[id] = count
  }
  if (!sameCounts(unlocks, campaign.unlocks)) edits.unlocks = unlocks

  const globals: Record<string, number> = {}
  for (const [name, count] of Object.entries(draft.globalAchievements)) {
    if (count > 0) globals[name] = count
  }
  if (!sameCounts(globals, campaign.globalAchievements)) edits.globalAchievements = globals

  return edits
}

/**
 * 고친 것이 있는가 — **저장 단추가 살아나는 조건.**
 *
 * `partyDiff`가 낸 것이 비었는지로 판정한다. 칸마다 따로 세면 새 칸이 늘 때마다
 * 두 곳을 고쳐야 하고, 한 곳을 빠뜨리면 **고쳤는데 저장이 안 눌리는** 꼴이 난다.
 */
export function isDirty(campaign: Campaign, draft: PartyDraft): boolean {
  return Object.keys(partyDiff(campaign, draft)).length > 0
}
