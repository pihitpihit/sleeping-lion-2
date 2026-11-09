import { supabase } from '../auth/supabase'

/**
 * 세계 지도 그림 — 비공개 버킷(`0051`)에서 받고 올린다.
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ **주소는 잠깐만 산다. 승인된 사람의 세션으로만 받는다.**                  │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * 그림은 Cephalofair의 것이라 공개 주소로 내놓지 않는다. 받을 때마다 서버가 RLS로
 * 자격을 보고 한 시간짜리 주소를 내준다. 같은 화면을 다시 열 때 또 묻지 않도록
 * 그 주소를 기억해 두고 끝나기 전에 새로 받는다.
 */

const BUCKET = 'world-map'
const LIFE_S = 60 * 60
/** 끝나기 이만큼 전이면 새로 받는다 — 지도를 펴 놓은 사이에 주소가 죽지 않게. */
const MARGIN_MS = 10 * 60 * 1000

const cache = new Map<string, { url: string; until: number }>()

/** 이름들의 주소. 못 받은 것은 빠진다 — 그 스티커만 안 보일 뿐 지도는 선다. */
export async function mapUrls(names: readonly string[]): Promise<Record<string, string>> {
  const now = Date.now()
  const out: Record<string, string> = {}
  const missing: string[] = []
  for (const name of names) {
    const hit = cache.get(name)
    if (hit && hit.until - MARGIN_MS > now) out[name] = hit.url
    else missing.push(name)
  }
  if (missing.length === 0) return out

  const { data, error } = await supabase().storage.from(BUCKET).createSignedUrls(missing, LIFE_S)
  if (error) throw error
  for (const row of data ?? []) {
    if (row.error || !row.signedUrl || !row.path) continue
    cache.set(row.path, { url: row.signedUrl, until: now + LIFE_S * 1000 })
    out[row.path] = row.signedUrl
  }
  return out
}

/** 버킷에 무엇이 있는가. 관리자 화면이 몇 장 올라갔는지 보여 주려고 쓴다. */
export async function listMapFiles(): Promise<string[]> {
  const { data, error } = await supabase().storage.from(BUCKET).list('', { limit: 1000 })
  if (error) throw error
  return (data ?? []).map((f) => f.name).filter((n) => typeof n === 'string')
}

/** 한 장 올린다. **같은 이름이면 덮어쓴다** — 그림을 갈아 끼우는 길이 이것이다. */
export async function uploadMapFile(name: string, file: Blob): Promise<void> {
  const { error } = await supabase()
    .storage.from(BUCKET)
    .upload(name, file, { upsert: true, contentType: file.type || undefined })
  if (error) throw error
  cache.delete(name)
}
