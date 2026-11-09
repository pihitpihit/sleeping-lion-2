import { useEffect, useState } from 'react'
import { MAP_FILE, isMapFile } from './worldMapSpots'
import { listMapFiles, uploadMapFile } from './worldMapNet'
import './ClassDataEditor.css'

/**
 * 세계 지도 그림 올리기 — 관리자 전용(`0051`).
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ **레포에 안 넣기로 한 그림이 여기로 들어간다.**                           │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * 지도와 스티커는 Cephalofair의 그림이라 비공개 버킷에만 둔다. secret 키를 어디에도
 * 두지 않으므로 서버 쪽에서 올릴 길이 없다 — 관리자의 세션으로 여기서 올린다.
 *
 * **여러 장을 한 번에 고른다.** 지도 한 장과 스티커 아흔다섯 장이다. 이름이 정해진
 * 꼴(`map.webp`·`gh-001.webp`)이 아닌 것은 올리지 않고 짚어 준다 — 엉뚱한 파일이
 * 버킷에 쌓이면 무엇이 쓰이는지 알 수 없다. 같은 이름이면 덮어쓴다.
 */
export function MapUploader() {
  const [present, setPresent] = useState<string[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(0)
  const [total, setTotal] = useState(0)
  const [skipped, setSkipped] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)

  async function refresh() {
    try {
      setPresent(await listMapFiles())
    } catch (cause) {
      console.error('[world-map]', cause)
      setPresent(null)
    }
  }

  useEffect(() => {
    let alive = true
    listMapFiles()
      .then((files) => {
        if (alive) setPresent(files)
      })
      .catch((cause) => console.error('[world-map]', cause))
    return () => {
      alive = false
    }
  }, [])

  async function upload(files: FileList | null) {
    if (!files || files.length === 0) return
    const all = [...files]
    const good = all.filter((f) => isMapFile(f.name))
    setSkipped(all.filter((f) => !isMapFile(f.name)).map((f) => f.name))
    setError(null)
    setDone(0)
    setTotal(good.length)
    setBusy(true)
    const failed: string[] = []
    // 한 장씩 올린다 — 한꺼번에 아흔여섯 요청을 띄우면 느린 자리에서 줄줄이 끊긴다.
    for (const f of good) {
      try {
        await uploadMapFile(f.name, f)
      } catch (cause) {
        console.error('[world-map]', f.name, cause)
        failed.push(f.name)
      }
      setDone((n) => n + 1)
    }
    setBusy(false)
    if (failed.length > 0) {
      setError(
        `${failed.length}장을 못 올렸다: ${failed.slice(0, 5).join(', ')}${failed.length > 5 ? ' …' : ''}`,
      )
    }
    await refresh()
  }

  const stickers = present?.filter((n) => n !== MAP_FILE && isMapFile(n)).length ?? 0
  const hasMap = present?.includes(MAP_FILE) ?? false

  return (
    <section className="classdata">
      <h2 className="classdata__title">세계 지도 그림</h2>
      <p className="classdata__lead">
        기록지의 세계 지도에 쓰는 그림이다. <code>{MAP_FILE}</code> 한 장과 <code>gh-001.webp</code>{' '}
        꼴의 스티커를 <strong>한 번에 골라</strong> 올린다. 비공개로 두고 승인된 사람만 받는다 —
        공개 레포에는 담지 않는다. 같은 이름이면 덮어쓴다.
      </p>

      <p className="classdata__hint">
        {present === null
          ? '버킷을 읽지 못했다.'
          : `지금 지도 ${hasMap ? '있음' : '없음'} · 스티커 ${stickers}장.`}
      </p>

      <input
        type="file"
        multiple
        accept="image/webp,image/png,image/jpeg"
        disabled={busy}
        onChange={(e) => {
          void upload(e.target.files)
          e.target.value = ''
        }}
      />

      {total > 0 && (
        <p className="classdata__note">
          {busy ? `올리는 중 — ${done} / ${total}` : `${total}장을 처리했다.`}
        </p>
      )}

      {skipped.length > 0 && (
        <ul className="classdata__problems">
          <li>
            이름이 맞지 않아 안 올린 것 {skipped.length}장: {skipped.slice(0, 5).join(', ')}
            {skipped.length > 5 ? ' …' : ''}
          </li>
        </ul>
      )}

      {error !== null && (
        <p className="classdata__error" role="alert">
          {error}
        </p>
      )}
    </section>
  )
}
