import { useEffect, useState } from 'react'
import { classIconUrl, MAX_LEVEL } from './character'
import { deleteClass, pushClasses } from './classNet'
import { CLASS_JSON_TEMPLATE, parseClassJson } from './classJson'
import { useClassStore } from './classStore'
import './ClassDataEditor.css'

/**
 * 클래스 수치 넣기 — 관리자 전용.
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ **레포에 안 넣기로 한 값이 여기로 들어간다.**                             │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * 클래스 이름·핸드 사이즈·레벨별 체력은 실물 카드에 인쇄된 게임 콘텐츠다. 레포와
 * 배포 사이트가 공개이므로 거기 커밋하면 우리가 공개 배포하는 것이 된다
 * (절대 원칙 1). **마이그레이션 SQL에 적는 것도 같다** — 그것도 레포다.
 *
 * 그래서 넣는 자리를 앱 안에 둔다. 여기서 넣은 값은 DB에만 있고, 승인된 사람만
 * 읽는다(`0011_character_classes.sql`).
 *
 * **칸을 아홉 벌 그리지 않고 JSON을 받는다.** 한 벌에 열두 칸(이름·핸드·체력 아홉)
 * 이라 아홉 클래스면 백 칸이 넘는다. 카드를 보며 한 번에 적어 붙여넣는 편이
 * 손이 덜 간다. **틀린 자리를 짚어 준다** — 어디가 틀렸는지 모르면 붙여넣기가
 * 수수께끼가 된다.
 */

export function ClassDataEditor() {
  const byIcon = useClassStore((s) => s.byIcon)
  const load = useClassStore((s) => s.load)

  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void load(true)
  }, [load])

  const stored = Object.values(byIcon).sort((a, b) => a.icon - b.icon)
  const parsed = text.trim() === '' ? null : parseClassJson(text)

  async function save() {
    if (!parsed || parsed.problems.length > 0 || parsed.classes.length === 0) return
    setBusy(true)
    setError(null)
    setNote(null)
    try {
      await pushClasses(parsed.classes)
      await load(true)
      setNote(`${parsed.classes.length}개를 넣었습니다.`)
      setText('')
    } catch (cause) {
      console.error('[classes]', cause)
      setError('넣지 못했습니다. 관리자 계정인지 확인하십시오.')
    } finally {
      setBusy(false)
    }
  }

  async function remove(icon: number) {
    setBusy(true)
    setError(null)
    try {
      await deleteClass(icon)
      await load(true)
    } catch (cause) {
      console.error('[classes]', cause)
      setError('지우지 못했습니다.')
    } finally {
      setBusy(false)
    }
  }

  /** 넣어 둔 것을 도로 JSON으로 — 고칠 때 처음부터 치지 않아도 된다. */
  function loadStoredIntoBox() {
    setText(
      `[\n${stored
        .map(
          (c) =>
            `  { "icon": ${c.icon}, "name": ${JSON.stringify(c.name)}, "handSize": ${c.handSize}, "hp": [${c.hp.join(', ')}] }`,
        )
        .join(',\n')}\n]`,
    )
  }

  return (
    <section className="classdata">
      <h2 className="classdata__title">클래스 수치</h2>

      <p className="classdata__hint">
        카드에 인쇄된 값은 <strong>저장소에 넣지 않습니다</strong> — 레포와 배포 사이트가 공개라
        커밋하면 그대로 공개됩니다. 여기서 넣으면 <strong>승인된 사람만</strong> 읽는 표에 들어가고,
        캐릭터 시트가 이름·핸드 사이즈·레벨별 최대 체력을 그것으로 채웁니다.
      </p>

      {stored.length > 0 && (
        <ul className="classdata__list">
          {stored.map((c) => {
            const url = classIconUrl(c.icon)
            return (
              <li key={c.icon}>
                <span className="classdata__badge">
                  {url ? <img src={url} alt="" draggable={false} /> : <span>?</span>}
                </span>
                <span className="classdata__name">{c.name}</span>
                <span className="classdata__meta sl-numeral">
                  손 {c.handSize} · 체력 {c.hp[0]}–{c.hp[MAX_LEVEL - 1]}
                </span>
                <button
                  type="button"
                  className="classdata__remove"
                  aria-label={`${c.name} 지우기`}
                  disabled={busy}
                  onClick={() => void remove(c.icon)}
                >
                  ×
                </button>
              </li>
            )
          })}
        </ul>
      )}

      {stored.length === 0 && <p className="classdata__empty">아직 넣은 것이 없습니다.</p>}

      <label className="classdata__label" htmlFor="classdata-json">
        JSON으로 넣기
      </label>
      <textarea
        id="classdata-json"
        className="classdata__box"
        rows={10}
        spellCheck={false}
        value={text}
        placeholder={CLASS_JSON_TEMPLATE}
        onChange={(e) => setText(e.target.value)}
      />

      {parsed && parsed.problems.length > 0 && (
        <ul className="classdata__problems" role="alert">
          {parsed.problems.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      )}

      {parsed && parsed.problems.length === 0 && parsed.classes.length > 0 && (
        <p className="classdata__ok">{parsed.classes.length}개를 읽었습니다.</p>
      )}

      {error !== null && (
        <p className="classdata__problems" role="alert">
          {error}
        </p>
      )}
      {note !== null && <p className="classdata__ok">{note}</p>}

      <div className="classdata__actions">
        <button
          type="button"
          className="classdata__save"
          disabled={busy || !parsed || parsed.problems.length > 0 || parsed.classes.length === 0}
          onClick={() => void save()}
        >
          넣기
        </button>
        {stored.length > 0 && (
          <button
            type="button"
            className="classdata__fill"
            disabled={busy}
            onClick={loadStoredIntoBox}
          >
            넣어 둔 것 불러오기
          </button>
        )}
      </div>
    </section>
  )
}
