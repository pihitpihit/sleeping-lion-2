import { useEffect, useId, useState } from 'react'
import { ConfirmDialog } from '../satchel/board/ConfirmDialog'
import {
  CHECK_MARK_URL,
  MAX_CHECKMARKS,
  XP_STAR_URL,
  XP_THRESHOLDS,
  classIconUrl,
  levelForXp,
  perkSlotCount,
  perksEarned,
  togglePerk,
  xpToNextLevel,
} from './character'
import { DeckPreview } from './DeckPreview'
import { classInfoOf, maxHpFor, useClassStore } from './classStore'
import { HandCards } from './HandCards'
import { changesOf } from './characterLog'
import { writeLog } from './characterNet'
import { LogView } from './LogView'
import { PerkText } from './PerkText'
import { perkRowsOf } from './perks'
import { ownerBadge } from '../satchel/perkSource'
import { Coin } from '../satchel/widgets/gold/Coin'
import {
  draftOf,
  isDirty,
  moveOf,
  sheetDiff,
  toggleOf,
  type Move,
  type SheetDraft,
} from './sheetDraft'
import type { Character, CharacterEdits } from './types'

interface Props {
  character: Character
  /** 내 것인가. 남의 것은 읽기 전용이다(SPEC 6장). */
  mine: boolean
  /** 서버에 못 닿는 중. 내 것이어도 잠근다. */
  offline?: boolean
  onEdit: (edits: CharacterEdits) => void
  onRemove: () => void
  /**
   * 혼자 서는 시트인가.
   *
   * `Roster`에서는 **줄 밑에 매달린다** — 위 테두리를 지우고 위쪽 모서리를 각지게
   * 두어 눌린 줄과 한 덩어리로 보이게 한 것이다. 캐릭터 한 장짜리 화면
   * (`#/character/<id>`)에는 매달릴 줄이 없으므로 **상자를 통째로 걷고 폭을
   * 스스로 잡는다** — 한 장의 종이처럼 선으로만 칸을 가르고, 넓은 화면에서는
   * 두 단으로 선다. 머리도 이때만 위에 붙어 따라온다.
   */
  standalone?: boolean
}

/**
 * 캐릭터 시트.
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ **내 것만 고친다. 남의 것은 보기만 한다**(SPEC 6장).                      │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * 실물 시트에서 **이름·클래스·레벨·경험·골드·아이템·퍽·체크마크·메모**를 옮겼다.
 * 파티 기록지와 마찬가지로 시트 그림을 깔지 않고 우리 결로 다시 그린다 — 종이
 * 비율에 갇히면 폰에서 못 쓰고, 시트에 박힌 영문 라벨이 한국어 화면과 겉돈다.
 *
 * **규칙을 판정하지 않는다.** 레벨을 대신 올려주지 않고 퍽을 자동으로 켜지도
 * 않는다. 경험이 다음 눈금에 닿으면 "올릴 때가 되었다"고 말할 뿐이고 누르는 것은
 * 사람이다 — 레벨업은 퍽을 고르고 능력 카드를 바꾸는 일이라 실물에서도 멈춰서
 * 한다.
 *
 * **퍽은 번호만 켠다.** 클래스별 퍽 표는 게임 콘텐츠라 우리가 갖고 있지 않다
 * (SPEC 3장). 사람이 제 시트를 보고 몇 번째 줄인지 짚는다.
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ **클래스는 여기서 못 바꾼다. 캐릭터를 세울 때 정하는 것이다.**             │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * 캐릭터가 곧 클래스다 — 바위심장이 도끼투척수로 바뀌는 일은 없고, 그러고 싶으면
 * 거두고 새로 세운다. 레벨·경험·퍽·아이템이 전부 그 클래스에 매인 값이라 클래스만
 * 갈아 끼우면 **남은 값들이 통째로 거짓이 된다.**
 *
 * **막는 것은 서버다**(`0014_lock_character_class.sql`). 화면에서 칸을 안 내는
 * 것은 헛손질을 줄이는 것일 뿐이다(구현 결정 44와 같은 결).
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ **열람이 기본이고, 고치려면 편집으로 들어간다.**                          │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * 2026-08-12까지는 칸을 건드리는 즉시 서버로 갔다. 다이얼로 골드를 120에서
 * 340으로 옮기면 그 사이 스물두 번이 나가고 `version`이 스물두 번 오른다 —
 * **낙관적 잠금이 손가락 수만큼 무의미해진다.** 게다가 시트를 그냥 들여다보는
 * 동안에도 모든 칸이 눌려 있어 **스치기만 해도 값이 바뀌었다.**
 *
 * 이제 편집 모드에서 초안(`sheetDraft.ts`)을 고치고 **저장을 누를 때 한 번**
 * 보낸다. 저장 단추는 실제로 바뀐 것이 있을 때만 살아난다. 정산은 여러 칸을
 * 함께 고치는 일이라(골드·경험·체크마크·아이템이 한꺼번에 움직인다) 실물에서도
 * 지우개로 다 고친 다음 덮는다.
 *
 * **바뀐 칸만 보낸다.** 통째로 보내면 안 건드린 칸까지 덮어 그 사이 남이 고친
 * 것을 되돌린다.
 *
 * **부르는 쪽이 `key`로 다시 태운다.** 초안을 이펙트로 맞추면 남이 고친 값이
 * 치고 있는 글자를 덮어쓴다.
 */
export function CharacterSheet({
  character,
  mine,
  offline = false,
  standalone = false,
  onEdit,
  onRemove,
}: Props) {
  const noteId = useId()

  /** 고칠 수 있는 사람인가. 남의 것과 오프라인은 편집으로 들어갈 수조차 없다. */
  const canEdit = mine && !offline

  const [wantsEdit, setWantsEdit] = useState(false)
  const [draft, setDraft] = useState<SheetDraft>(() => draftOf(character))
  const [newItem, setNewItem] = useState('')
  /** 무엇을 물으려고 팝업을 띄웠는가. */
  const [asking, setAsking] = useState<'discard' | 'remove' | null>(null)
  /** 기록 팝업이 열려 있는가. 읽기·편집 어느 쪽에서나 열 수 있다. */
  const [logOpen, setLogOpen] = useState(false)

  /**
   * 화면에 그리는 값.
   *
   * **편집 중이면 초안, 아니면 레코드다.** 열람 중에 초안을 그리면 남이 고친 값이
   * 들어와도 화면이 옛것을 붙들고 있다 — 초안은 편집으로 들어갈 때 새로 뜬다.
   */
  /**
   * 지금 편집 중인가.
   *
   * **고칠 수 없게 되면 그 자리에서 내려온다.** 편집 중에 서버가 끊기면 칸이
   * 열린 채로 남는데, 저장은 어차피 안 나간다 — 열려 있는 것처럼 보이는 화면이
   * 잠긴 화면보다 나쁘다.
   */
  const editing = wantsEdit && canEdit

  const shown: SheetDraft = editing ? draft : draftOf(character)
  const dirty = editing && isDirty(character, draft)

  function set<K extends keyof SheetDraft>(key: K, value: SheetDraft[K]) {
    setDraft((d) => ({ ...d, [key]: value }))
  }

  function startEditing() {
    setDraft(draftOf(character))
    setNewItem('')
    setWantsEdit(true)
  }

  function stopEditing() {
    setWantsEdit(false)
    setNewItem('')
    setAsking(null)
  }

  function save() {
    const edits = sheetDiff(character, draft)
    // 바뀐 것이 없으면 보내지 않는다. 빈 갱신도 `version`을 올린다.
    if (Object.keys(edits).length > 0) {
      onEdit(edits)
      /*
        **기록은 값이 들어간 다음에 남긴다.** 실패해도 삼키므로(`writeLog`)
        저장이 되돌아가지 않는다 — 기록은 읽어 보는 것이지 정본이 아니다.
      */
      /*
        **시트에서 고친 것은 언제나 「직접 수정」이다.** 사람이 고를 것이 아니라
        경로가 정하는 것이다 — 시나리오 정산으로 들어오는 길은 따로 난다(형님이
        짚었다). 그래서 고르는 자리를 두지 않는다.
      */
      void writeLog(character.id, character.ownerId, 'manual', changesOf(character, edits))
    }
    stopEditing()
  }

  /**
   * **레벨은 경험치에서 나온다.** 사람이 고르는 값이 아니다 — 2026-08-12에
   * 구현 결정 43을 뒤집었다. 표에도 이 값이 적히고(`sheetDiff`) 화면도 이것을
   * 그리므로 시트와 목록이 다른 수를 말할 일이 없다.
   */
  const level = levelForXp(shown.xp)
  const toNext = xpToNextLevel(shown.xp)

  /**
   * 경험이 다음 눈금까지 얼마나 왔는가 — `60/95 (63%)`.
   *
   * **남은 수가 아니라 온 만큼을 적는다.** 「다음까지 35」는 목표를 모르면 뜻이
   * 없다 — 얼마나 왔는지 보려면 지금 값과 눈금이 함께 있어야 한다. 형님이 짚었다.
   *
   * 아홉 레벨이면 다음 눈금이 없다. 그때는 아무것도 안 적는다 — 표식 위에 수가
   * 이미 있다.
   */
  const nextMark = toNext === null ? null : shown.xp + toNext

  /*
    **고치는 동안에는 「얼마에서 얼마를 움직였나」를 적는다.**

    `60+35/95` — 저장된 값에 증감을 달고 목표를 뒤에 붙인다. 고치다 보면 몇을
    올렸는지 잊는데(정산은 여러 칸을 함께 만진다) 현재값만으로는 알 수 없다.
    형님이 짚었다. 증감 부분만 색이 붙는다(`tally__delta`).
  */
  const xpDelta = shown.xp - character.xp
  const goldDelta = shown.gold - character.gold
  const xpProgress =
    nextMark === null
      ? undefined
      : `${shown.xp}/${nextMark} (${Math.round((shown.xp / nextMark) * 100)}%)`
  const slots = perkSlotCount(level, shown.checkmarks)
  const earned = perksEarned(level, shown.checkmarks)
  // 클래스는 초안에 없다 — 바뀔 수 없으므로 레코드에서 그대로 읽는다.
  const iconUrl = classIconUrl(character.classIcon)

  /**
   * 클래스 수치. 관리자가 넣어 두었으면 이름·핸드 사이즈·최대 체력이 온다.
   *
   * **없어도 화면은 그대로 돈다** — 넣기 전에는 아이콘만 보이던 종전 모습이다.
   * 값이 레포에 없고 DB에만 있으므로(절대 원칙 1) 이쪽이 기본 상태다.
   */
  const classes = useClassStore((s) => s.list)
  const loadClasses = useClassStore((s) => s.load)
  useEffect(() => {
    void loadClasses()
  }, [loadClasses])
  const info = classInfoOf(classes, character.classId, character.classIcon)

  /**
   * 이 클래스의 특혜 줄과 각 줄이 시작하는 상자 번호.
   *
   * **번호는 줄의 차례에서 나온다**(`perkBoxes`) — 캐릭터가 켜 둔 값은 지금까지도
   * 상자 번호였으므로 표가 들어와도 그대로 맞물린다.
   */
  /**
   * 그 레벨의 최대 체력. 클래스 수치를 안 넣었으면 `null`.
   *
   * **별도 줄로 내지 않고 눈금 안에 적는다**(2026-08-12) — 아홉 줄이 이미
   * 레벨과 경험치를 늘어놓고 있고, 체력도 레벨마다 정해진 값이라 같은 표에
   * 들어가는 것이 맞다. 형님이 짚었다.
   */
  const hpAt = (n: number) => maxHpFor(info, n)

  const perkTable = useClassStore((s) => s.perks)
  const rows = perkRowsOf(info === null ? [] : (perkTable[info.id] ?? []))

  function addItem() {
    const value = newItem.trim()
    if (value === '') return
    set('items', [...draft.items, value])
    setNewItem('')
  }

  return (
    <div
      className={[
        'char',
        // 두 시트가 함께 쓰는 짜임 — 안쪽 칸이 평평해지고 장식선으로 갈린다.
        'paper',
        standalone ? 'char--solo paper--wide' : '',
        // 은퇴는 초안이 아니라 **저장된 사실**로 흐린다 — 편집 중에 껐다 켰다 할
        // 때마다 시트 전체가 흐려졌다 밝아지면 눈이 어지럽다.
        character.retired ? 'char--retired' : '',
        editing ? 'char--editing' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {/* ------------------------------------------------------------------
          이름과 클래스 표식
          ------------------------------------------------------------------
          ┌──────────────────────────────────────────────────────────────────┐
          │ **혼자 설 때는 페이지의 고정 띠가 대신 그린다.**                  │
          └──────────────────────────────────────────────────────────────────┘

          캐릭터 한 장짜리 화면에는 뒤로가기와 이름을 인 띠가 이미 위에 붙어
          있다. 시트가 제 머리를 또 그리면 **같은 정보가 두 줄로 겹친다** —
          형님이 짚었다. 매달릴 줄이 있는 로스터에서는 위에 아무것도 없으므로
          여기서 그린다.
          ------------------------------------------------------------------ */}
      {!standalone && (
        <div className="char__head">
          <div className="char__badge" aria-hidden={iconUrl === null}>
            {iconUrl ? (
              <img src={iconUrl} alt={`클래스 표식 ${character.classIcon}번`} draggable={false} />
            ) : (
              <span className="char__badge-empty" aria-hidden="true">
                ?
              </span>
            )}
          </div>

          <div className="char__names">
            {/*
              ┌──────────────────────────────────────────────────────────────┐
              │ **이름은 생성할 때 정한다. 여기서는 읽기만 한다.**            │
              └──────────────────────────────────────────────────────────────┘

              파티원은 이름으로 서로를 부른다 — 축 ②의 이름표도 그것이고,
              전투에서 누구의 체력·덱인지 가리는 것도 그것이다. **판 도중에
              바뀌면 옆 사람이 보던 것이 딴 사람이 된다.** 막는 것은 서버다
              (`0017`).
            */}
            <h2 className="char__name">{character.name || '이름 없음'}</h2>
            <p className="char__owner">
              {character.ownerName || '이름 없음'}의 캐릭터
              {info && (
                <>
                  {' · '}
                  <span className="char__class">{info.name}</span>
                  {info.handSize > 0 && (
                    <>
                      {' '}
                      <HandCards count={info.handSize} />
                    </>
                  )}
                </>
              )}
            </p>
          </div>
        </div>
      )}

      {/*
        ┌────────────────────────────────────────────────────────────────────┐
        │ **두 단으로 갈 수 있게 감싼다. 폰에서는 `display: contents`로 편다.** │
        └────────────────────────────────────────────────────────────────────┘

        가르는 자리는 하나뿐이다 — 폰에서는 두 단이 이어 붙어 한 줄로 서므로
        **DOM 차례가 곧 읽는 차례**이고, 그것을 지키려면 지금 차례를 한 번만
        끊을 수 있다. 특혜 뒤에서 끊는 것이 두 단의 키가 가장 비슷하다.
      */}
      <div className="paper__col paper__col--a">
        {/* ------------------------------------------------------------------
          레벨 — 실물 시트의 1~9 눈금
          ------------------------------------------------------------------
          ┌──────────────────────────────────────────────────────────────────┐
          │ **누르는 자리가 아니다. 경험치가 정한다.**                        │
          └──────────────────────────────────────────────────────────────────┘

          2026-08-12에 구현 결정 43을 뒤집었다 — 눈금은 표에 적힌 사실이지
          사람이 정할 것이 아니다. 지나온 눈금에 표를 내어 어디까지 왔는지
          보인다.
          ------------------------------------------------------------------ */}
        <section className="sheet__block">
          {/*
            ┌──────────────────────────────────────────────────────────────┐
            │ **손패는 여기 선다 — 클래스 수치라 레벨표와 한 자리다.**       │
            └──────────────────────────────────────────────────────────────┘

            띠의 부제 줄에 넣었더니 **그림 높이가 줄을 밀어 올려 띠가 통째로
            두꺼워졌고**, 그림은 px로 고정이라 굴려도 안 줄었다. 여기 오면
            레벨별 최대 체력과 나란히 서서 "이 클래스는 이렇다"가 한 자리에
            모인다.
          */}
          <div className="char__blockhead">
            <h3 className="sheet__label">
              레벨
              <span className="char__hint"> — 경험치가 정한다</span>
            </h3>
            {/*
              **그림 하나로 말한다.** 「손에 드는 카드」라고 적어 두었는데 카드
              두 장에 수가 얹힌 그림이면 그것으로 족하다 — 읽어주는 쪽에는
              `HandCards`가 이미 우리말로 전한다.
            */}
            {info !== null && info.handSize > 0 && (
              <span className="handchip">
                <HandCards count={info.handSize} />
              </span>
            )}
          </div>
          <ol className="char__levels" aria-label={`레벨 ${level}`}>
            {XP_THRESHOLDS.map((threshold, index) => {
              const n = index + 1
              return (
                <li
                  key={n}
                  className={[
                    'char__level',
                    n === level ? 'char__level--on' : '',
                    // 지나온 눈금. 어디까지 왔는지 한눈에 보인다.
                    n < level ? 'char__level--past' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  aria-current={n === level ? 'true' : undefined}
                >
                  <span className="char__level-n sl-numeral" aria-hidden="true">
                    {n}
                  </span>
                  {/* 경험치 눈금 — 푸른 쪽. HP/XP 트래커와 같은 결이다. */}
                  <span className="char__level-xp sl-numeral" aria-hidden="true">
                    {threshold}
                  </span>
                  {/*
                  그 레벨의 최대 체력 — 붉은 쪽.

                  **클래스 수치를 안 넣었으면 아예 안 그린다.** 짐작해서 숫자를
                  내면 사람이 그것을 믿는다(구현 결정 115).
                */}
                  {hpAt(n) !== null && (
                    <span className="char__level-hp sl-numeral" aria-hidden="true">
                      {hpAt(n)}
                    </span>
                  )}
                </li>
              )
            })}
          </ol>
        </section>

        {/* ------------------------------------------------------------------
          경험과 골드
          ------------------------------------------------------------------
          ┌──────────────────────────────────────────────────────────────────┐
          │ **읽을 때는 표식 위의 수, 고칠 때는 다이얼.**                     │
          └──────────────────────────────────────────────────────────────────┘

          들여다보는 동안에는 손잡이가 자리만 차지한다 — 값 둘을 한 줄에 놓고
          **경험은 별, 골드는 금화** 위에 수를 얹으면 한눈에 든다. 표식은 둘 다
          이미 앱에서 쓰는 것이라(HP/XP 트래커·골드 카운터) 같은 것으로 읽힌다.

          **편집으로 들어가도 모양이 그대로다.** 표식 양옆에 캐럿이 돋을 뿐이다 —
          다이얼로 갈아 끼우면 눈이 자리를 다시 찾아야 한다(형님이 짚었다).
          캐럿은 안쪽이 한 칸, 바깥쪽이 여러 칸이다: 골드를 8에서 340으로 옮기는
          일이 있으므로 한 칸짜리만으로는 손이 남아나지 않는다.
          ------------------------------------------------------------------ */}
        <div className="tally">
          <Tally
            kind="xp"
            label="경험"
            value={shown.xp}
            caption={xpProgress}
            base={editing ? character.xp : undefined}
            delta={editing ? xpDelta : 0}
            /*
              **고치는 동안에도 몇 %인지 남긴다.** 「60+35/95」만 적었더니 목표까지
              얼마나 왔는지가 사라졌다. 비율은 고친 뒤의 값으로 센다 — 지금 이
              손질이 어디까지 데려다 놓았는지가 궁금한 것이다.
            */
            tail={nextMark === null ? undefined : `/${nextMark}`}
            /* 비율도 증감과 같은 색을 입는다. 얼마나 움직였는지를 함께 말한다. */
            pct={nextMark === null ? undefined : Math.round((shown.xp / nextMark) * 100)}
            move={editing ? moveOf(character.xp, shown.xp) : null}
            steps={editing ? [1, 5] : undefined}
            onChange={(next) => set('xp', next)}
          />
          <Tally
            kind="gold"
            label="골드"
            value={shown.gold}
            base={editing ? character.gold : undefined}
            delta={editing ? goldDelta : 0}
            move={editing ? moveOf(character.gold, shown.gold) : null}
            steps={editing ? [1, 10] : undefined}
            onChange={(next) => set('gold', next)}
          />
        </div>

        {/* ------------------------------------------------------------------
          체크마크 — 셋마다 퍽 하나
          ------------------------------------------------------------------ */}
        <section className="sheet__block">
          <h3 className="sheet__label">
            전투 목표
            <span className="char__hint"> — 셋마다 퍽 하나</span>
          </h3>
          <div className="char__checks">
            {Array.from({ length: MAX_CHECKMARKS }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                type="button"
                aria-label={`체크마크 ${n}개까지`}
                aria-pressed={n <= shown.checkmarks}
                /* 묶음은 격자가 낸다 — 한 줄에 셋이므로 줄 하나가 곧 한 묶음이다. */
                className={[
                  'char__check',
                  n <= shown.checkmarks ? 'char__check--on' : '',
                  // 편집 중에만 짚어 준다. 저장하면 견줄 것이 없어져 저절로 물러난다.
                  editing
                    ? markClass(toggleOf(n <= character.checkmarks, n <= shown.checkmarks))
                    : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                disabled={!editing}
                /* 켜진 마지막 칸을 다시 누르면 하나 줄인다 — 잘못 짚었을 때의 길이다. */
                onClick={() => set('checkmarks', n === shown.checkmarks ? n - 1 : n)}
              >
                {/*
                  켜지든 말든 늘 그린다 — 켤 때만 그리면 그 칸만 다시 자리를
                  잡느라 눌린 자리가 흔들린다. 꺼진 것은 보이지 않을 뿐이다.
                */}
                <img className="char__check-mark" src={CHECK_MARK_URL} alt="" draggable={false} />
              </button>
            ))}
          </div>
        </section>

        {/* ------------------------------------------------------------------
          퍽 — 표가 있으면 줄로, 없으면 번호로
          ------------------------------------------------------------------ */}
        <section className="sheet__block">
          <h3 className="sheet__label">
            퍽
            <span className="char__hint">
              {' '}
              — 얻은 것 <span className="sl-numeral">{earned}</span>, 켠 것{' '}
              <span className="sl-numeral">{shown.perks.length}</span>
            </span>
          </h3>

          {/*
          **표가 있으면 줄을 보여주고, 없으면 번호만 늘어놓는다.**

          특혜 글은 게임 콘텐츠라 레포에 없고 DB에만 있다(절대 원칙 1). 아무것도
          안 넣었으면 지금까지 그랬듯 번호를 켠다 — 없어도 앱은 완전히 돈다
          (절대 원칙 3). 어느 쪽이든 켜지는 값은 **같은 상자 번호**다.
        */}
          {rows.length > 0 ? (
            <>
              <p className="char__note">
                시트의 줄 그대로다. 상자를 켜면 공격 보정 덱이 그만큼 맞춰진다.
              </p>
              <ul className="char__perkrows">
                {rows.map(({ perk, first }) => (
                  <li key={perk.id} className="char__perkrow">
                    <span className="char__perkboxes">
                      {Array.from({ length: perk.count }, (_, i) => first + i).map((slot) => {
                        const on = shown.perks.includes(slot)
                        return (
                          <button
                            key={slot}
                            type="button"
                            aria-label={`${perk.text} — ${slot}번 상자`}
                            aria-pressed={on}
                            className={[
                              'char__perkbox',
                              on ? 'char__perkbox--on' : '',
                              editing
                                ? markClass(toggleOf(character.perks.includes(slot), on))
                                : '',
                            ]
                              .filter(Boolean)
                              .join(' ')}
                            disabled={!editing}
                            onClick={() => set('perks', togglePerk(shown.perks, slot))}
                          />
                        )
                      })}
                    </span>
                    <span className="char__perktext">
                      <PerkText text={perk.text} />
                    </span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <>
              <p className="char__note">
                퍽 표는 클래스마다 다르고 우리가 갖고 있지 않다. 제 시트에서 몇 번째 줄인지 보고 그
                번호를 켠다.
              </p>
              <div className="char__perks">
                {Array.from({ length: slots }, (_, i) => i + 1).map((slot) => {
                  const on = shown.perks.includes(slot)
                  return (
                    <button
                      key={slot}
                      type="button"
                      aria-label={`퍽 ${slot}번`}
                      aria-pressed={on}
                      className={[
                        'char__perk',
                        on ? 'char__perk--on' : '',
                        editing ? markClass(toggleOf(character.perks.includes(slot), on)) : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      disabled={!editing}
                      onClick={() => set('perks', togglePerk(shown.perks, slot))}
                    >
                      <span className="sl-numeral" aria-hidden="true">
                        {slot}
                      </span>
                    </button>
                  )
                })}
              </div>
            </>
          )}
        </section>
      </div>

      <div className="paper__col paper__col--b">
        {/* ------------------------------------------------------------------
          공격 보정 덱 — 켠 특혜에서 나온 구성
          ------------------------------------------------------------------
          **판은 읽지 않는다.** 남은 장수·뽑힌 카드는 축 ②의 휘발성 런타임이라
          영속 기록지가 비출 것이 아니다(SPEC 5.2). 특혜 표가 없으면 아예 안
          나온다 — 그때는 구성의 정본이 위젯 설정이고 시트는 그것을 모른다.
          ------------------------------------------------------------------ */}
        <DeckPreview
          perks={rows.map((r) => r.perk)}
          checked={shown.perks}
          /* 카드 왼쪽 아래 홈에 앉을 표식. 실물에서 그 자리는 덱 주인의 것이다. */
          owner={ownerBadge(info?.icon ?? character.classIcon, info?.name ?? '', character.name)}
        />

        {/* ------------------------------------------------------------------
          아이템 — 사용자가 적는다(구현 결정 2)
          ------------------------------------------------------------------ */}
        <section className="sheet__block">
          <h3 className="sheet__label">아이템</h3>

          {shown.items.length > 0 && (
            <ul className="sheet__achievements">
              {shown.items.map((item, index) => (
                <li key={`${index}-${item}`}>
                  <span>{item}</span>
                  {/* 지우는 단추는 편집 중에만 낸다. 열람 화면에 ×가 늘어서 있으면
                    누를 수 있는 줄 알고 손이 간다. */}
                  {editing && (
                    <button
                      type="button"
                      className="sheet__remove"
                      aria-label={`아이템 '${item}' 지우기`}
                      onClick={() =>
                        set(
                          'items',
                          draft.items.filter((_, i) => i !== index),
                        )
                      }
                    >
                      ×
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}

          {shown.items.length === 0 && !editing && <p className="char__note">아직 없다.</p>}

          {editing && (
            <div className="sheet__add">
              <input
                className="sheet__input"
                value={newItem}
                placeholder="아이템을 적는다"
                aria-label="새 아이템"
                onChange={(e) => setNewItem(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addItem()
                  }
                }}
              />
              <button
                type="button"
                className="sheet__add-button"
                disabled={newItem.trim() === ''}
                onClick={addItem}
              >
                더하기
              </button>
            </div>
          )}
        </section>

        <section className="sheet__block">
          <label className="sheet__label" htmlFor={noteId}>
            메모
          </label>
          <textarea
            id={noteId}
            className="sheet__notes"
            rows={4}
            value={shown.notes}
            placeholder={editing ? '적어둘 것' : ''}
            disabled={!editing}
            onChange={(e) => set('notes', e.target.value)}
          />
        </section>
      </div>

      {/*
        은퇴와 거두기.

        **은퇴는 접어두는 것이고 거두기는 없애는 것이다** — 은퇴한 캐릭터도 파티
        기록의 일부라 기본은 접어두는 쪽이다. 은퇴는 칸 하나이므로 초안에 담겨
        저장을 눌러야 남고, **거두기는 되돌릴 수 없어 그 자리에서 나간다.**
      */}
      {editing && (
        <div className="char__actions">
          <button
            type="button"
            className="char__retire"
            aria-pressed={shown.retired}
            onClick={() => set('retired', !shown.retired)}
          >
            {shown.retired ? '다시 나선다' : '은퇴시킨다'}
          </button>
          <button type="button" className="char__remove" onClick={() => setAsking('remove')}>
            거둔다
          </button>
        </div>
      )}

      {/*
        기록 보기 — **시트 맨 아래.**

        자주 여는 자리가 아니라 정산이 맞았는지 되짚을 때만 연다. 저장 띠보다
        위에 두어 **띠가 늘 마지막**이게 한다.
      */}
      {/*
        **제 캐릭터의 기록만 본다.** 시트의 현재값은 파티원이 다 보지만(SPEC 6장)
        이력은 갈린다 — 형님이 좁혔다. 막는 것은 서버다(`0019`); 여기서 문을 안
        내는 것은 헛손질을 줄이는 것뿐이다.
      */}
      {mine && (
        <div className="char__logrow">
          <button type="button" className="char__logopen" onClick={() => setLogOpen(true)}>
            고친 기록 보기
          </button>
        </div>
      )}

      {logOpen && <LogView characterId={character.id} onClose={() => setLogOpen(false)} />}

      {/*
        ┌────────────────────────────────────────────────────────────────────┐
        │ **띠는 아래에 붙어 따라온다.** 시트가 길어 끝까지 내려야 하면        │
        │ 저장을 잊는다.                                                      │
        └────────────────────────────────────────────────────────────────────┘

        열람 중에는 편집으로 들어가는 문 하나뿐이다. 남의 시트이거나 서버에
        못 닿는 중이면 그 문도 없다 — **왜 없는지 대신 적는다.**
      */}
      <div className="sheet__bar">
        {!editing ? (
          canEdit ? (
            <button
              type="button"
              className="sheet__edit"
              aria-label="고치기"
              title="고치기"
              onClick={startEditing}
            >
              <PencilIcon />
            </button>
          ) : (
            <p className="sheet__locked">
              {!mine ? '남의 시트라 보기만 한다.' : '서버에 닿지 못해 지금은 고칠 수 없다.'}
            </p>
          )
        ) : (
          <>
            <button
              type="button"
              className="sheet__cancel"
              /* 고친 것이 있으면 한 번 묻는다. 없으면 버릴 것도 없다. */
              onClick={() => (dirty ? setAsking('discard') : stopEditing())}
            >
              취소
            </button>
            <button type="button" className="sheet__save" disabled={!dirty} onClick={save}>
              {dirty ? '저장' : '고친 것 없음'}
            </button>
          </>
        )}
      </div>

      {asking === 'discard' && (
        <ConfirmDialog
          title="고치던 것을 버립니까?"
          description="저장하지 않은 것은 되돌아오지 않는다."
          confirmLabel="버린다"
          /*
            **뜸을 짧게 잡는다.** 기본 5초는 몇 시간짜리 판이 날아가는 자리에
            맞춘 값이다(구현 결정 36). 여기서 잃는 것은 방금 고친 몇 칸이므로
            손이 멎을 만큼만 두면 된다 — 5초를 그대로 쓰면 그만두는 일이 벌처럼
            느껴진다.
          */
          delayMs={1500}
          onConfirm={stopEditing}
          onCancel={() => setAsking(null)}
        />
      )}

      {asking === 'remove' && (
        <ConfirmDialog
          title={`'${character.name || '이름 없음'}'을 거둡니까?`}
          description="레벨·경험·골드·아이템·특혜가 모두 사라진다. 되돌릴 수 없다."
          confirmLabel="거둔다"
          onConfirm={() => {
            setAsking(null)
            onRemove()
          }}
          onCancel={() => setAsking(null)}
        />
      )}
    </div>
  )
}

/**
 * 표식 위에 얹힌 수 — 경험과 골드.
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ **읽을 때와 고칠 때가 같은 모양이다.**                                    │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * 편집으로 들어가면 표식 양옆에 캐럿이 돋을 뿐이다 — 다이얼로 갈아 끼우면 눈이
 * 자리를 다시 찾아야 한다(형님이 짚었다). 캐럿은 **안쪽이 한 칸, 바깥쪽이 여러
 * 칸**이다: 골드를 8에서 340으로 옮기는 일이 있으므로 한 칸짜리만으로는 손이
 * 남아나지 않는다.
 *
 * 경험의 별은 팩 것이고 금화는 우리가 그린 것이다 — **둘 다 이미 앱에서 쓰는
 * 그림이라** 여기서 처음 보는 표식이 아니다. 수는 그림 밖에 얹어 `sl-numeral`이
 * 그대로 먹게 한다(구현 결정 296과 같은 손질).
 */
function Tally({
  kind,
  label,
  value,
  caption,
  base,
  delta,
  tail,
  pct,
  move,
  steps,
  onChange,
}: {
  kind: 'xp' | 'gold'
  /** 읽어주는 쪽에만 간다 — 그림이 무엇인지는 눈에 이미 보인다. */
  label: string
  value: number
  /** 밑에 적을 글. 없으면 안 적는다 — 골드는 적을 것이 없다. */
  caption?: string
  /** 저장된 값. 고치는 동안 「기존값+증감」으로 적는다. */
  base?: number
  /** 저장된 값에서 얼마나 움직였는가. 0이면 증감을 안 적는다. */
  delta?: number
  /** 증감 뒤에 붙일 글 — 경험의 `/95`. */
  tail?: string
  /** 목표까지의 비율. 증감과 같은 색을 입는다. */
  pct?: number
  /** 저장된 값에서 어느 쪽으로 움직였는가. 편집 중에만 온다. */
  move?: Move
  /** [한 칸, 여러 칸]. 오면 캐럿이 돋고 안 오면 읽기 전용이다. */
  steps?: readonly [number, number]
  onChange?: (next: number) => void
}) {
  const carets = steps !== undefined && onChange !== undefined

  return (
    <div className={`tally__item tally__item--${kind}`}>
      {carets && (
        <span className="tally__carets tally__carets--left">
          <Caret label={`${label} ${steps[1]} 내리기`} onPress={() => onChange(value - steps[1])}>
            «
          </Caret>
          <Caret label={`${label} ${steps[0]} 내리기`} onPress={() => onChange(value - steps[0])}>
            ‹
          </Caret>
        </span>
      )}

      <span className="tally__art" role="img" aria-label={`${label} ${value}`}>
        {kind === 'gold' ? (
          <Coin />
        ) : (
          <img src={XP_STAR_URL} alt="" draggable={false} aria-hidden="true" />
        )}
        <span className={`tally__n sl-numeral${markClass(move ?? null)}`} aria-hidden="true">
          {value}
        </span>
      </span>

      {carets && (
        <span className="tally__carets tally__carets--right">
          <Caret label={`${label} ${steps[0]} 올리기`} onPress={() => onChange(value + steps[0])}>
            ›
          </Caret>
          <Caret label={`${label} ${steps[1]} 올리기`} onPress={() => onChange(value + steps[1])}>
            »
          </Caret>
        </span>
      )}

      {/*
        고치는 동안에는 「기존값+증감」이 앞선다 — 무엇에서 얼마를 움직였는지
        알아야 하기 때문이다. 손대지 않았으면 읽을 때와 같은 글을 그대로 낸다.
      */}
      {base !== undefined && delta !== undefined && delta !== 0 ? (
        <span className="tally__label sl-numeral">
          {base}
          <span className={`tally__delta${markClass(moveOf(0, delta))}`}>
            {delta > 0 ? '+' : '−'}
            {Math.abs(delta)}
          </span>
          {tail}
          {pct !== undefined && (
            <span className={`tally__delta${markClass(moveOf(0, delta))}`}> ({pct}%)</span>
          )}
        </span>
      ) : (
        caption !== undefined && <span className="tally__label sl-numeral">{caption}</span>
      )}
    </div>
  )
}

function Caret({
  label,
  onPress,
  children,
}: {
  label: string
  onPress: () => void
  children: string
}) {
  return (
    <button type="button" className="tally__caret" aria-label={label} onClick={onPress}>
      <span aria-hidden="true">{children}</span>
    </button>
  )
}

/**
 * 바뀐 자리에 붙일 클래스.
 *
 * **오른 것은 녹색, 내린 것은 붉은색.** 되돌려 놓으면 색도 함께 사라지고,
 * 저장하면 견줄 것이 없어져 저절로 물러난다(`sheetDraft.ts`).
 */
function markClass(move: Move): string {
  if (move === 'up') return ' is-up'
  if (move === 'down') return ' is-down'
  return ''
}

/** 고치기 단추의 연필. 직접 그린 도형이다(Creator Pack 격리 규칙 밖). */
function PencilIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M4 20h4L19.2 8.8a2.1 2.1 0 0 0 0-3L18.2 4.8a2.1 2.1 0 0 0-3 0L4 16v4Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinejoin="round"
      />
      <path d="M14.4 5.6 18.4 9.6" fill="none" stroke="currentColor" strokeWidth="1.9" />
    </svg>
  )
}
