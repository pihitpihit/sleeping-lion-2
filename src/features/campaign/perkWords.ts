import { MARKS, valueHasArt, type MarkDef } from '../satchel/widgets/deck/cardSpec'

/**
 * 특혜 글에서 그림으로 바꿀 수 있는 낱말을 갈라낸다.
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ **「굴림 바람 카드 2장 추가」 → (굴림)(바람) 카드 2장 추가.**              │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * 특혜 글은 관리자가 적어 넣은 우리말 문장이다(`0013`). 그 안의 원소·상태이상·
 * 굴림은 **실물 시트에도 그림으로 인쇄돼 있는 것**이라, 글자로만 두면 카드에서
 * 보는 그림과 시트에서 읽는 낱말이 따로 논다.
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ **긴 낱말이 먼저다. 「이동불가」 안의 「불」을 잡으면 안 된다.**            │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * 그래서 **자리마다 가장 긴 낱말부터 맞춰 보고 맞으면 통째로 삼킨다.** 낱말
 * 경계를 따로 보지 않아도 이것 하나로 갈린다 — 실제로 DB의 특혜 글에서 「불」이
 * 열 번 걸리는데 그중 다섯이 「이동불가」 속이었다.
 *
 * 수는 낱말에 **붙어 있을 때만** 딸려 온다(`밀기2`·`치료1`). 수를 다는 표식이
 * 아니면 삼키지 않는다 — `4장`의 `4`가 앞 낱말에 붙는 일이 없어야 한다.
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ **값도 그림이다: `+1`·`−2`·`×0`은 팩의 값 메달로 바꾼다.**                 │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * 카드에 찍힌 것과 같은 그림이라 글자로 두면 또 따로 논다. **그림이 있는 일곱만
 * 바꾼다** — `+3`·`+4`는 특혜로만 나오는 값이라 팩에 메달이 없고, 그때는 글자
 * 그대로 두는 것이 맞다(구현 결정 115와 같은 결).
 */

/** 그림으로 바꿀 낱말과 그것이 가리키는 표식. */
const LEXICON: Readonly<Record<string, string>> = {
  // 원소 여섯 — 팩에서 색까지 그려진 둥근 배지로 온다.
  불: 'fire',
  얼음: 'ice',
  바람: 'air',
  풀: 'earth',
  빛: 'light',
  어둠: 'dark',
  // 상태이상 — 팩의 마름모 배지.
  부상: 'wound',
  이동불가: 'immobilize',
  중독: 'poison',
  혼란: 'muddle',
  기절: 'stun',
  저주: 'curse',
  무장해제: 'disarm',
  투명: 'invisible',
  축복: 'bless',
  강화: 'strengthen',
  // 수를 다는 것.
  밀기: 'push',
  당기기: 'pull',
  관통: 'pierce',
  치료: 'heal',
  방어: 'shield',
  /*
    **「대상」만 잡고 「추가」는 남긴다.** 표식의 이름은 「대상 추가」지만, 글에서는
    「대상 추가」와 「대상 하나 추가」처럼 뒷말이 갈린다 — 그림이 삼킬 것은 표식이
    가리키는 것까지다.
  */
  대상: 'targets',
}

/**
 * 굴림.
 *
 * 표식표(`MARKS`)에는 없다 — 카드에서 굴림은 표식이 아니라 **값의 성질**이라
 * 따로 다룬다(구현 결정 127). 글에서는 나란히 놓이므로 여기서만 함께 센다.
 */
export const ROLLING_WORD = '굴림'

/** 자리마다 가장 긴 것부터 맞춰 본다. */
const WORDS: readonly string[] = [...Object.keys(LEXICON), ROLLING_WORD].sort(
  (a, b) => b.length - a.length,
)

const DEF_BY_ID = new Map(MARKS.map((m) => [m.id, m]))

export type PerkPiece =
  | { readonly kind: 'text'; readonly text: string }
  | { readonly kind: 'rolling' }
  | { readonly kind: 'mark'; readonly def: MarkDef; readonly amount: number | null }
  /** 값 메달. 그림이 있는 일곱(`x0`·`m2`·`m1`·`p0`·`p1`·`p2`·`x2`)만 온다. */
  | { readonly kind: 'value'; readonly valueId: string }

/**
 * 값을 적는 꼴.
 *
 * 빼기는 세 가지로 적힌다 — 아스키 하이픈, 참빼기표(U+2212), 엔대시. **적는 사람
 * 손에 따라 갈리는 것이지 다른 값이 아니다.** 곱하기도 `×`와 `x` 둘 다 받는다.
 *
 * **뒤에 수가 더 붙으면 값이 아니다**(`+10`) — 자릿수를 하나로 못박는다.
 */
const VALUE_RE = /^([+\-\u2212\u2013\u00d7xX])(\d)(?!\d)/

/** 적힌 꼴을 값 낱말로. 그림이 없는 값이면 `null`이라 글자로 남는다. */
function valueIdOf(sign: string, digit: string): string | null {
  const id = sign === '+' ? `p${digit}` : /[\u00d7xX]/.test(sign) ? `x${digit}` : `m${digit}`
  return valueHasArt(id) ? id : null
}

/** 특혜 글 한 줄을 글자와 표식으로 가른다. */
export function splitPerkText(text: string): PerkPiece[] {
  const out: PerkPiece[] = []
  let plain = ''

  const flush = () => {
    if (plain !== '') {
      out.push({ kind: 'text', text: plain })
      plain = ''
    }
  }

  let i = 0
  while (i < text.length) {
    // 값이 먼저다. 낱말은 모두 한글이라 겹치지 않지만 갈래를 하나로 둔다.
    const value = VALUE_RE.exec(text.slice(i))
    if (value !== null) {
      const id = valueIdOf(value[1] as string, value[2] as string)
      if (id !== null) {
        flush()
        out.push({ kind: 'value', valueId: id })
        i += value[0].length
        continue
      }
    }

    const word = WORDS.find((w) => text.startsWith(w, i))
    if (word === undefined) {
      plain += text[i]
      i += 1
      continue
    }

    flush()
    i += word.length

    if (word === ROLLING_WORD) {
      out.push({ kind: 'rolling' })
      continue
    }

    const def = DEF_BY_ID.get(LEXICON[word] as string)
    if (def === undefined) {
      // 표에서 사라진 표식. 낱말을 되돌려 놓는다 — 조용히 지우지 않는다.
      plain += word
      continue
    }

    // 수는 붙어 있을 때만, 수를 다는 표식일 때만 딸려 온다.
    let amount: number | null = null
    if (def.numeric === true) {
      const digits = /^\d+/.exec(text.slice(i))
      if (digits !== null) {
        amount = Number(digits[0])
        i += digits[0].length
      }
    }
    out.push({ kind: 'mark', def, amount })
  }

  flush()
  return out
}
