/**
 * 캐릭터 이름 검사.
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ **이름은 한 번 정하면 못 바꾼다. 그래서 세울 때 걸러야 한다.**             │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * 파티원은 이름으로 서로를 부른다 — 축 ②의 이름표도 그것이고 전투에서 누구의
 * 체력·덱인지 가리는 것도 그것이다(구현 결정 249). 세운 뒤에는 서버가 거절하므로
 * (`0017`) **고칠 기회는 이 화면 한 번뿐이다.**
 *
 * 화면에서 거르는 것은 헛손질을 줄이는 것이고 강제는 아니다 — 레포와 번들이
 * 공개라 REST로 직접 찌르면 무엇이든 넣을 수 있다(구현 결정 44와 같은 결).
 * 여기서 막는 것은 **나중에 저를 곤란하게 할 이름**이다.
 */

/** 이름의 최대 글자 수. 띠와 이름표에 한 줄로 들어가야 한다. */
export const NAME_MAX = 24

/**
 * 쓸 수 있는 글자.
 *
 * 한글(완성형과 자모)·영문·숫자·공백, 그리고 **탈이 안 나는 문장부호**만 받는다.
 * `<>&"` 같은 것은 화면·주소·저장 어디선가 반드시 한 번은 걸리므로 애초에 안
 * 받는다. 이모지도 뺐다 — 기기마다 다르게 그려져 **옆 사람이 보는 이름표와 내가
 * 보는 것이 달라진다.**
 */
const ALLOWED = /^[가-힣ㄱ-ㅎㅏ-ㅣA-Za-z0-9 ._'’·,!?()-]+$/

/** 무엇이 걸렸는가. */
export type NameProblem = 'empty' | 'long' | 'charset' | 'duplicate'

/**
 * 다듬은 이름.
 *
 * 앞뒤 공백을 털고 가운데 연속 공백을 하나로 줄인다 — **눈에 안 보이는 차이로
 * 다른 이름이 되면 안 된다**(구현 결정 168과 같은 결). 저장되는 것도 이 값이다.
 */
export function tidyName(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ')
}

/**
 * 세울 수 있는 이름인가. 괜찮으면 `null`.
 *
 * @param taken 이미 가진 캐릭터들의 이름. **대소문자를 가리지 않고** 견준다 —
 *   `Bob`과 `bob`이 한 상에 앉으면 누구의 체력인지 알 수 없다.
 */
export function checkCharacterName(raw: string, taken: readonly string[]): NameProblem | null {
  const name = tidyName(raw)
  if (name === '') return 'empty'
  // 다듬은 뒤에 센다. 앞뒤 공백으로 자릿수를 채우는 것을 막는다.
  if ([...name].length > NAME_MAX) return 'long'
  if (!ALLOWED.test(name)) return 'charset'

  const folded = name.toLocaleLowerCase()
  if (taken.some((t) => tidyName(t).toLocaleLowerCase() === folded)) return 'duplicate'

  return null
}

/**
 * 사람에게 할 말.
 *
 * **무엇이 틀렸는지 짚어 준다** — "쓸 수 없는 이름"이라고만 하면 어디를 고쳐야
 * 하는지 알 수 없다(구현 결정 117·139와 같은 결).
 */
export function nameProblemText(problem: NameProblem): string {
  switch (problem) {
    case 'empty':
      return '이름을 적어야 한다.'
    case 'long':
      return `이름은 ${NAME_MAX}자까지다.`
    case 'charset':
      return "한글·영문·숫자·공백과 . , ! ? ( ) - _ · ' 만 쓸 수 있다."
    case 'duplicate':
      return '같은 이름의 캐릭터가 이미 있다.'
  }
}
