import { useEffect, useState } from 'react'
import { useTreasureStore } from './treasureStore'
import { replaceTreasures } from './treasureNet'
import { parseTreasureText } from './treasureText'
import './ClassDataEditor.css'

/**
 * 보물 색인 넣기 — 관리자 전용.
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ **레포에 안 넣기로 한 값이 여기로 들어간다.**                             │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * 시나리오 책자에 인쇄된 표다 — 특혜 글·개봉 조건과 같은 등급이라 레포·배포물에
 * 담지 않고(절대 원칙 1) 마이그레이션 SQL에도 안 적는다(`0041`).
 *
 * **통째로 갈아 끼우되 여기서는 그것이 안전하다.** 개봉 조건은 줄마다 uuid가 새로
 * 나 파티가 켠 것이 끊겼지만(구현 결정 137), 보물의 열쇠는 **타일에 박힌 번호**라
 * 표를 다시 넣어도 찾은 것이 그대로 붙어 있는다.
 */

export function TreasureEditor() {
  const items = useTreasureStore((s) => s.items)
  const load = useTreasureStore((s) => s.load)

  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void load(true)
  }, [load])

  const parsed = parseTreasureText(text)

  async function save() {
    if (parsed.rows.length === 0) return
    setBusy(true)
    setError(null)
    setNote(null)
    try {
      await replaceTreasures(parsed.rows)
      await load(true)
      setNote(`${parsed.rows.length}줄을 넣었습니다.`)
      setText('')
    } catch (cause) {
      console.error('[treasure]', cause)
      setError('넣지 못했습니다. 관리자 계정인지 확인하십시오.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="classdata">
      <h2 className="classdata__title">보물 색인</h2>
      <p className="classdata__lead">
        시나리오 책자의 「보물 색인」이다. 한 줄에 하나씩{' '}
        <code>02 &apos;대형 방패&apos;(032번 아이템) 획득</code>처럼{' '}
        <strong>번호를 앞에 적는다</strong> — 번호가 열쇠라 차례가 뒤섞여도 되고 한 줄만 고쳐 넣어도
        된다. 넣으면 표를 통째로 갈아 끼우지만 <strong>파티가 찾아 둔 것은 안 끊긴다</strong>.
      </p>

      <textarea
        className="classdata__json"
        rows={8}
        value={text}
        placeholder={'01 무작위 아이템 도안\n02 …'}
        onChange={(e) => setText(e.target.value)}
      />

      <p className="classdata__hint">
        지금 표에 {items.length}줄이 들어 있다. 붙여넣은 것은 {parsed.rows.length}줄로 읽힌다.
      </p>

      {/* **조용히 버리지 않는다**(구현 결정 139) — 어디가 틀렸는지 짚어 준다. */}
      {parsed.problems.length > 0 && (
        <ul className="classdata__problems">
          {parsed.problems.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      )}

      {note !== null && <p className="classdata__note">{note}</p>}
      {error !== null && (
        <p className="classdata__error" role="alert">
          {error}
        </p>
      )}

      <button
        type="button"
        className="classdata__save"
        disabled={busy || parsed.rows.length === 0}
        onClick={() => void save()}
      >
        표 넣기
      </button>
    </section>
  )
}
