import { supabase } from '../auth/supabase'

/**
 * 봉투·상자 개봉 조건 — **인쇄된 캠페인 시트의 그 칸**(`0027`).
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ **글은 DB에만 있다.**                                                     │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * 특혜 표와 같은 등급이다(구현 결정 135) — 레포와 배포물에는 표와 정책뿐이고
 * 값은 앱 안의 관리자 화면에서 들어간다. 못 읽어도 앱은 완전히 돈다: 그때는
 * 기록지에 그 칸이 안 보일 뿐이다(절대 원칙 3).
 */

export interface UnlockCondition {
  readonly id: string
  readonly text: string
  /** 그 줄에 붙은 체크상자 수. 금화 기부처럼 여럿인 줄이 있다. */
  readonly boxes: number
  readonly sort: number
  /** 이 줄이 다 차면 위대한 떡갈나무가 열린다(`0033`). */
  readonly opensOak: boolean
}

interface Row {
  id: string
  text: string | null
  boxes: number | null
  sort: number | null
  opens_oak: boolean | null
}

export async function listUnlockConditions(): Promise<UnlockCondition[]> {
  const { data, error } = await supabase()
    .from('unlock_conditions')
    .select('id, text, boxes, sort, opens_oak')
    .order('sort', { ascending: true })
  if (error) throw error

  return ((data ?? []) as unknown as Row[]).map((row) => ({
    id: row.id,
    text: typeof row.text === 'string' ? row.text : '',
    // 모르는 값은 한 칸으로 친다 — 상자가 없는 줄은 켤 수가 없다.
    boxes: typeof row.boxes === 'number' && row.boxes > 0 ? Math.trunc(row.boxes) : 1,
    sort: typeof row.sort === 'number' ? row.sort : 0,
    opensOak: row.opens_oak === true,
  }))
}

/**
 * 표를 통째로 갈아 끼운다 — 관리자 화면이 쓴다.
 *
 * **줄이 하나 빠진 채 남아 있으면 안 되므로** 지우고 넣는다(구현 결정 137과 같은
 * 손질). 켠 것은 조건 id로 세므로 여기서 id가 새로 나면 **그 진행은 끊긴다** —
 * 그래서 표를 다시 넣는 것은 값을 처음 채울 때의 일이다.
 */
export async function replaceUnlockConditions(
  rows: readonly { text: string; boxes: number; opensOak?: boolean }[],
): Promise<void> {
  const client = supabase()
  const { error: wipe } = await client
    .from('unlock_conditions')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000')
  if (wipe) throw wipe
  if (rows.length === 0) return

  const { error } = await client.from('unlock_conditions').insert(
    rows.map((row, i) => ({
      text: row.text,
      boxes: row.boxes,
      sort: i,
      opens_oak: row.opensOak === true,
    })),
  )
  if (error) throw error
}
