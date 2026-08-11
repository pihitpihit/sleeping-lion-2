import { useEffect, useState } from 'react'
import { useClassStore } from './classStore'
import { EXPECTED_PERK_BOXES, PERK_JSON_TEMPLATE, parsePerkJson } from './perkJson'
import { pushClassPerks } from './perkNet'
import { perkBoxCount } from './perks'
import './ClassDataEditor.css'

/**
 * 특혜 표 넣기 — 관리자 전용.
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ **레포에 안 넣기로 한 값이 여기로 들어간다.**                             │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * 특혜 한 줄에 적힌 글은 실물 시트에 인쇄된 게임 콘텐츠다 — 지금까지 담은 것 중
 * 가장 또렷하게 저작물성이 있다. 레포와 배포 사이트가 공개이므로 거기 커밋하면
 * 우리가 공개 배포하는 것이 된다(절대 원칙 1). **마이그레이션 SQL도 레포다.**
 *
 * 그래서 넣는 자리를 앱 안에 둔다. 여기서 넣은 값은 DB에만 있고 승인된 사람만
 * 읽는다(`0013_class_perks.sql`).
 *
 * **한 클래스씩 통째로 갈아 끼운다.** 상자 번호가 줄의 차례에서 나오므로 줄이
 * 하나 빠진 채 남아 있으면 그 아래 번호가 통째로 밀린다 — 켜 둔 상자가 다른
 * 특혜를 가리키게 되고, **그 어긋남은 눈에 안 보인다.**
 */

export function ClassPerkEditor() {
  const classes = useClassStore((s) => s.list)
  const stored = useClassStore((s) => s.perks)
  const load = useClassStore((s) => s.load)

  const [classId, setClassId] = useState('')
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void load(true)
  }, [load])

  const chosen = classes.find((c) => c.id === classId) ?? null
  const mine = classId === '' ? [] : (stored[classId] ?? [])
  const parsed = classId === '' || text.trim() === '' ? null : parsePerkJson(text, classId)

  async function save() {
    if (!parsed || parsed.problems.length > 0 || parsed.perks.length === 0) return
    setBusy(true)
    setError(null)
    setNote(null)
    try {
      await pushClassPerks(classId, parsed.perks)
      await load(true)
      setNote(`${parsed.perks.length}줄 · 상자 ${parsed.boxes}개를 넣었습니다.`)
      setText('')
    } catch (cause) {
      console.error('[perks]', cause)
      setError('넣지 못했습니다. 관리자 계정인지 확인하십시오.')
    } finally {
      setBusy(false)
    }
  }

  async function clear() {
    if (classId === '') return
    setBusy(true)
    setError(null)
    setNote(null)
    try {
      await pushClassPerks(classId, [])
      await load(true)
      setNote('비웠습니다.')
    } catch (cause) {
      console.error('[perks]', cause)
      setError('비우지 못했습니다.')
    } finally {
      setBusy(false)
    }
  }

  /** 넣어 둔 것을 도로 JSON으로 — 고칠 때 처음부터 치지 않아도 된다. */
  function loadStoredIntoBox() {
    setText(
      `[\n${mine
        .map(
          (p) =>
            `  { "count": ${p.count}, "text": ${JSON.stringify(p.text)}, "changes": ${JSON.stringify(p.changes)} }`,
        )
        .join(',\n')}\n]`,
    )
  }

  return (
    <section className="classdata">
      <h2 className="classdata__title">특혜 표</h2>

      <p className="classdata__hint">
        시트에 인쇄된 특혜 글은 <strong>저장소에 넣지 않습니다</strong> — 레포와 배포 사이트가
        공개라 커밋하면 그대로 공개됩니다. 여기서 넣으면 <strong>승인된 사람만</strong> 읽는 표에
        들어가고, 캐릭터 시트가 번호 대신 특혜 줄을 보여주며 공격 보정 덱이 켠 상자대로 구성을
        맞춥니다.
      </p>

      {classes.length === 0 ? (
        <p className="classdata__empty">클래스를 먼저 넣어야 합니다.</p>
      ) : (
        <>
          <label className="classdata__label" htmlFor="perk-class">
            클래스
          </label>
          <select
            id="perk-class"
            className="classdata__select"
            value={classId}
            disabled={busy}
            onChange={(e) => {
              setClassId(e.target.value)
              setText('')
              setNote(null)
              setError(null)
            }}
          >
            <option value="">— 고르십시오 —</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({perkBoxCount(stored[c.id] ?? [])}/{EXPECTED_PERK_BOXES})
              </option>
            ))}
          </select>
        </>
      )}

      {chosen && (
        <>
          <ul className="classdata__list">
            {mine.length === 0 ? (
              <li className="classdata__empty-row">아직 넣은 것이 없습니다.</li>
            ) : (
              mine.map((p, index) => (
                <li key={p.id}>
                  {/* 이 줄이 차지하는 상자 번호. 캐릭터가 켜 두는 번호와 같다. */}
                  <span className="classdata__slot sl-numeral" aria-hidden="true">
                    {boxRange(
                      mine.slice(0, index).reduce((n, q) => n + q.count, 0),
                      p.count,
                    )}
                  </span>
                  <span className="classdata__name">{p.text}</span>
                  <span className="classdata__meta sl-numeral">
                    {Object.entries(p.changes)
                      .map(([kind, delta]) => `${kind} ${delta > 0 ? `+${delta}` : delta}`)
                      .join(' · ') || '덱 그대로'}
                  </span>
                </li>
              ))
            )}
          </ul>

          <label className="classdata__label" htmlFor="perk-json">
            JSON으로 넣기 — {chosen.name}
          </label>
          <textarea
            id="perk-json"
            className="classdata__box"
            rows={12}
            spellCheck={false}
            value={text}
            placeholder={PERK_JSON_TEMPLATE}
            onChange={(e) => setText(e.target.value)}
          />

          <p className="classdata__hint">
            <code>changes</code>의 열쇠는 카드 종류입니다 — <code>p1</code>(+1), <code>m1</code>
            (−1), <code>x2</code>(×2), <code>p1.wound</code>(+1 부상), <code>r.p0.fire</code>(굴림
            불), <code>r.p0.push2</code>(굴림 밀기2). 교체는 두 줄로 쪼갭니다 — &ldquo;−1 한 장을 +1
            한 장으로&rdquo;는 <code>{'{ "m1": -1, "p1": 1 }'}</code>.
          </p>

          {parsed && parsed.problems.length > 0 && (
            <ul className="classdata__problems" role="alert">
              {parsed.problems.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          )}

          {parsed && parsed.problems.length === 0 && parsed.perks.length > 0 && (
            <p
              className={parsed.boxes === EXPECTED_PERK_BOXES ? 'classdata__ok' : 'classdata__warn'}
            >
              {parsed.perks.length}줄 · 상자 {parsed.boxes}개를 읽었습니다.
              {parsed.boxes !== EXPECTED_PERK_BOXES &&
                ` — 실물 시트는 보통 ${EXPECTED_PERK_BOXES}개입니다. 세어 보십시오.`}
            </p>
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
              disabled={busy || !parsed || parsed.problems.length > 0 || parsed.perks.length === 0}
              onClick={() => void save()}
            >
              넣기
            </button>
            {mine.length > 0 && (
              <>
                <button
                  type="button"
                  className="classdata__fill"
                  disabled={busy}
                  onClick={loadStoredIntoBox}
                >
                  넣어 둔 것 불러오기
                </button>
                <button
                  type="button"
                  className="classdata__fill"
                  disabled={busy}
                  onClick={() => void clear()}
                >
                  비우기
                </button>
              </>
            )}
          </div>
        </>
      )}
    </section>
  )
}

/** 이 줄이 차지하는 상자 번호. 하나면 `3`, 여럿이면 `3–4`. */
function boxRange(before: number, count: number): string {
  const first = before + 1
  return count === 1 ? `${first}` : `${first}–${before + count}`
}
