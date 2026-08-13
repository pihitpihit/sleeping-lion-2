import { useEffect, useRef, useState } from 'react'
import { useAuthStore } from '../auth/authStore'
import { XP_THRESHOLDS, classIconUrl } from './character'
import { createCharacter } from './characterNet'
import { NAME_MAX, checkCharacterName, nameProblemText, tidyName } from './characterName'
import { UNDECIDED, choicesOf, type Choice } from './classChoices'
import { useClassStore } from './classStore'
import { useMineStore } from './mineStore'
import './JournalPage.css'
import './NewCharacterPage.css'

/**
 * 캐릭터 생성 — `#/character/new`.
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ **클래스는 여기서만 정한다. 세운 뒤에는 못 바꾼다.**                      │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * 캐릭터가 곧 클래스다 — 레벨·경험·퍽·아이템이 전부 그 클래스에 매인 값이라
 * 클래스만 갈아 끼우면 남은 값들이 통째로 거짓이 된다(구현 결정 181). 이름도
 * 마찬가지다(구현 결정 249). **막는 것은 서버다**(`0014`·`0017`); 이 화면은
 * 고를 것을 제대로 보여주는 몫이다.
 *
 * 그래서 목록이 아니라 **한 장씩 넘겨 본다.** 봉투를 고르는 일이라 이름만 훑는
 * 것으로는 부족하고, 표식·핸드 사이즈·레벨별 체력을 나란히 놓고 견주게 된다.
 */
export function NewCharacterPage() {
  const session = useAuthStore((s) => s.session)

  const list = useClassStore((s) => s.list)
  const loadClasses = useClassStore((s) => s.load)
  useEffect(() => {
    void loadClasses()
  }, [loadClasses])

  /** 겹치는 이름을 막으려면 내가 가진 것을 알아야 한다. */
  const mine = useMineStore((s) => s.characters)
  const loadMine = useMineStore((s) => s.load)
  const userId = session?.userId ?? null
  useEffect(() => {
    if (userId === null) return
    void loadMine(userId)
  }, [userId, loadMine])

  const [index, setIndex] = useState(0)
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const trackRef = useRef<HTMLDivElement>(null)

  const choices = choicesOf(list)
  const picked = choices[Math.min(index, choices.length - 1)] ?? UNDECIDED

  const problem = checkCharacterName(
    name,
    mine.map((c) => c.name),
  )
  /*
    **아직 아무것도 안 친 것은 잘못이 아니다.** 화면을 열자마자 빨간 글씨가 떠
    있으면 무엇을 잘못한 줄 안다 — 단추는 그대로 잠긴다.
  */
  const warn = name === '' ? null : problem

  /** 캐러셀을 특정 칸으로 민다. 고르는 것은 굴리는 것이므로 상태가 아니라 스크롤이다. */
  function slideTo(next: number) {
    const el = trackRef.current
    if (el === null) return
    const clamped = Math.max(0, Math.min(next, choices.length - 1))
    el.scrollTo({ left: clamped * el.clientWidth, behavior: 'smooth' })
  }

  async function make() {
    if (userId === null || problem !== null) return
    setBusy(true)
    setError(null)
    try {
      // 파티 없이 세운다. 드는 것은 캐릭터 화면에서 따로 한다(`0015`).
      const made = await createCharacter(null, userId, tidyName(name), picked.icon, picked.classId)
      void loadMine(userId)
      window.location.hash = `#/character/${made.id}`
    } catch (cause) {
      console.error('[character]', cause)
      setError('세우지 못했다.')
    } finally {
      setBusy(false)
    }
  }

  if (session === null) return null

  return (
    <div className="journal">
      <header className="topbar">
        <div className="topbar__inner">
          <a className="journal__back" href="#/journal" aria-label="일지로">
            ←
          </a>
          <span className="topbar__names">
            <h1 className="topbar__name">캐릭터 생성</h1>
            <span className="topbar__sub">클래스와 이름은 여기서만 정한다</span>
          </span>
        </div>
      </header>

      <div className="newchar">
        {/* ----------------------------------------------------------------
            캐러셀
            ----------------------------------------------------------------
            **굴리는 것은 브라우저가 한다**(`scroll-snap-type: x mandatory`).
            손가락으로 넘기는 것이 공짜로 붙고, 관성·되튐도 기기 것이 그대로
            쓰인다 — 직접 만들면 그 결을 흉내 내야 한다.

            고른 것은 상태가 아니라 **굴린 자리에서 읽는다.** 둘로 두면 손으로
            넘겼을 때와 단추로 넘겼을 때가 어긋난다.
            ---------------------------------------------------------------- */}
        <div className="carousel">
          <button
            type="button"
            className="carousel__arrow carousel__arrow--prev"
            aria-label="앞 클래스"
            disabled={index === 0}
            onClick={() => slideTo(index - 1)}
          >
            ‹
          </button>

          <div
            className="carousel__track"
            ref={trackRef}
            onScroll={(e) => {
              const el = e.currentTarget
              if (el.clientWidth === 0) return
              const at = Math.round(el.scrollLeft / el.clientWidth)
              if (at !== index) setIndex(at)
            }}
          >
            {choices.map((choice) => (
              <ClassCard key={choice.key} choice={choice} />
            ))}
          </div>

          <button
            type="button"
            className="carousel__arrow carousel__arrow--next"
            aria-label="다음 클래스"
            disabled={index >= choices.length - 1}
            onClick={() => slideTo(index + 1)}
          >
            ›
          </button>
        </div>

        {/* 어디쯤인지 — 스물둘까지 가므로 점을 다 찍지 않고 수로 적는다. */}
        <p className="carousel__where sl-numeral" aria-hidden="true">
          {index + 1} / {choices.length}
        </p>

        {/* ----------------------------------------------------------------
            이름 — 아래에 둔다
            ----------------------------------------------------------------
            클래스를 고르고 나서 이름을 짓는 것이 실제 순서다. **잘못된 이름은
            그 자리에서 짚어 준다** — 세운 뒤에는 서버가 고치기를 거절하므로
            (`0017`) 여기서 놓치면 거두고 새로 세우는 수밖에 없다.
            ---------------------------------------------------------------- */}
        <div className="newchar__name">
          <label className="sheet__label" htmlFor="newchar-name">
            이름
          </label>
          <input
            id="newchar-name"
            className="sheet__input"
            value={name}
            placeholder="이름을 짓는다"
            /* 다듬으면 줄어들 수 있으므로 칸 자체는 조금 넉넉하게 받는다. */
            maxLength={NAME_MAX * 2}
            disabled={busy}
            onChange={(e) => setName(e.target.value)}
          />
          <p className={`newchar__warn${warn === null ? ' newchar__warn--ok' : ''}`} role="alert">
            {warn === null ? ' ' : nameProblemText(warn)}
          </p>
        </div>

        {error !== null && (
          <p className="journal__error" role="alert">
            {error}
          </p>
        )}

        <div className="sheet__bar">
          <a className="sheet__cancel" href="#/journal">
            그만두기
          </a>
          <button
            type="button"
            className="sheet__save"
            disabled={busy || problem !== null}
            onClick={() => void make()}
          >
            생성
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * 클래스 한 장.
 *
 * 표식·이름·핸드 사이즈·레벨별 체력을 적는다. **모르는 것은 안 적는다** — 클래스
 * 수치를 안 넣었으면 체력 표가 통째로 빠지고 그림과 번호만 남는다(구현 결정 115).
 *
 * 그림과 플레이버 텍스트는 아직 없다. 팩에서 더 가져오는 것은 ATTRIBUTION을 함께
 * 고쳐야 하는 별개의 일이고(SPEC 13.1), 플레이버는 카드에 인쇄된 글이라 담지
 * 않는다(절대 원칙 1).
 */
function ClassCard({ choice }: { choice: Choice }) {
  const url = choice.icon === 0 ? null : classIconUrl(choice.icon)

  return (
    <article className="classcard" aria-label={choice.title}>
      <span className={`classcard__badge${url ? '' : ' classcard__badge--plain'}`}>
        {url ? (
          <img src={url} alt="" draggable={false} />
        ) : (
          <span aria-hidden="true">{choice.letter}</span>
        )}
      </span>

      <h2 className="classcard__name">{choice.title}</h2>

      {choice.handSize > 0 && (
        <p className="classcard__hand">
          손에 드는 카드 <span className="sl-numeral">{choice.handSize}</span>장
        </p>
      )}

      {choice.hp.length === 9 && (
        <ol className="classcard__levels" aria-label="레벨별 최대 체력">
          {choice.hp.map((hp, i) => (
            <li key={i} className="classcard__level">
              <span className="classcard__level-n sl-numeral" aria-hidden="true">
                {i + 1}
              </span>
              <span className="classcard__level-hp sl-numeral" aria-hidden="true">
                {hp}
              </span>
              <span className="classcard__level-xp sl-numeral" aria-hidden="true">
                {XP_THRESHOLDS[i]}
              </span>
              <span className="sheet__hidden">
                레벨 {i + 1}, 최대 체력 {hp}, 경험 {XP_THRESHOLDS[i]}
              </span>
            </li>
          ))}
        </ol>
      )}
    </article>
  )
}
