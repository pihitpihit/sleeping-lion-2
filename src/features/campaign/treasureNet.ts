import { supabase } from '../auth/supabase'

/**
 * 보물 색인 — **책자에 인쇄된 표**(`0041`).
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ **글은 DB에만 있다.**                                                     │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * 특혜·개봉 조건과 같은 등급이다(구현 결정 135) — 레포와 배포물에는 표와 정책
 * 뿐이고 값은 앱 안의 관리자 화면에서 들어간다. 못 읽어도 앱은 완전히 돈다:
 * 그때는 번호만 보이고 글이 없을 뿐이다(절대 원칙 3).
 */

export interface Treasure {
  /** 타일에 박힌 번호. **이것이 열쇠다**(`0041`). */
  readonly no: number
  readonly text: string
}

interface Row {
  no: number | null
  text: string | null
}

export async function listTreasures(): Promise<Treasure[]> {
  const { data, error } = await supabase()
    .from('treasures')
    .select('no, text')
    .order('no', { ascending: true })
  if (error) throw error

  return ((data ?? []) as unknown as Row[])
    .filter((row): row is { no: number; text: string } => typeof row.no === 'number')
    .map((row) => ({
      no: Math.trunc(row.no),
      text: typeof row.text === 'string' ? row.text : '',
    }))
}

/**
 * 표를 통째로 갈아 끼운다 — 관리자 화면이 쓴다.
 *
 * **개봉 조건과 달리 이것은 안전하다**(구현 결정 137과 갈리는 자리). 거기서는
 * 줄마다 uuid가 새로 나 켠 것이 끊겼지만, **보물의 열쇠는 타일에 박힌 번호**라
 * 표를 다시 넣어도 찾은 것이 그대로 붙어 있는다.
 */
export async function replaceTreasures(rows: readonly Treasure[]): Promise<void> {
  const client = supabase()
  const { error: wipe } = await client.from('treasures').delete().gte('no', 0)
  if (wipe) throw wipe
  if (rows.length === 0) return

  const { error } = await client
    .from('treasures')
    .insert(rows.map((row) => ({ no: row.no, text: row.text })))
  if (error) throw error
}
