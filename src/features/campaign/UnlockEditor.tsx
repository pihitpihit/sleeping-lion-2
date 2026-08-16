import { useEffect, useState } from 'react'
import { useUnlockStore } from './unlockStore'
import { replaceUnlockConditions } from './unlockNet'
import { parseUnlockText } from './unlockText'
import './ClassDataEditor.css'

/**
 * 봉투·상자 개봉 조건 넣기 — 관리자 전용.
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ **레포에 안 넣기로 한 값이 여기로 들어간다.**                             │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * 인쇄된 캠페인 시트의 줄이다 — 특혜 글과 같은 등급이라 레포·배포물에 담지 않고
 * (절대 원칙 1) 마이그레이션 SQL에도 안 적는다. 넣는 자리를 앱 안에 둔다
 * (`0027`).
 *
 * **통째로 갈아 끼운다.** 줄이 하나 빠진 채 남아 있으면 시트와 어긋난다 —
 * 특혜 표와 같은 손질이다(구현 결정 137). 다만 **켠 것은 조건 id로 세므로**
 * 표를 다시 넣으면 파티가 켜 둔 것이 끊긴다: 값을 처음 채울 때의 일이다.
 *
 * 붙여넣는 꼴은 줄마다 한 줄이고 상자 수는 앞에 `[n]`으로 적는다 — JSON을 손으로
 * 치는 것보다 시트를 보고 옮겨 적기 쉽다.
 */

export function UnlockEditor() {
  const items = useUnlockStore((s) => s.items)
  const load = useUnlockStore((s) => s.load)

  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void load(true)
  }, [load])

  const parsed = parseUnlockText(text)

  async function save() {
    if (parsed.length === 0) return
    setBusy(true)
    setError(null)
    setNote(null)
    try {
      await replaceUnlockConditions(parsed)
      await load(true)
      setNote(`${parsed.length}줄을 넣었습니다.`)
      setText('')
    } catch (cause) {
      console.error('[unlock]', cause)
      setError('넣지 못했습니다. 관리자 계정인지 확인하십시오.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="classdata">
      <h2 className="classdata__title">봉투·상자 개봉 조건</h2>
      <p className="classdata__lead">
        인쇄된 캠페인 시트의 「봉투/상자 개봉을 위한 특수 조건」 칸이다. 한 줄에 조건 하나,
        체크상자가 여럿인 줄은 <code>[10]</code>처럼 앞에 수를 적는다.{' '}
        <strong>넣으면 표를 통째로 갈아 끼운다</strong> — 파티가 켜 둔 것은 끊긴다.
      </p>

      <textarea
        className="classdata__json"
        rows={8}
        value={text}
        placeholder={'조건 한 줄\n[10] 상자가 열 개인 줄'}
        onChange={(e) => setText(e.target.value)}
      />

      <p className="classdata__hint">
        지금 표에 {items.length}줄이 들어 있다. 붙여넣은 것은 {parsed.length}줄로 읽힌다.
      </p>

      {note !== null && <p className="classdata__note">{note}</p>}
      {error !== null && (
        <p className="classdata__error" role="alert">
          {error}
        </p>
      )}

      <button
        type="button"
        className="classdata__save"
        disabled={busy || parsed.length === 0}
        onClick={() => void save()}
      >
        표 넣기
      </button>
    </section>
  )
}
