import { describe, expect, it } from 'vitest'
import { NAME_MAX, checkCharacterName, nameProblemText, tidyName } from './characterName'

/**
 * 이름은 세울 때 한 번만 정할 수 있고 그 뒤로는 서버가 거절한다(`0017`). 그래서
 * **거르는 자리가 여기 하나뿐**이라 알맹이를 순수 함수로 떼어 통째로 덮는다.
 */

describe('다듬기', () => {
  it('앞뒤 공백을 털고 가운데 연속 공백을 하나로 줄인다', () => {
    expect(tidyName('  바위 심장  ')).toBe('바위 심장')
    expect(tidyName('바위   심장')).toBe('바위 심장')
    expect(tidyName('\t바위\n심장 ')).toBe('바위 심장')
  })
})

describe('쓸 수 있는 이름', () => {
  it('한글·영문·숫자·공백은 통과한다', () => {
    for (const name of ['바위심장', 'Brute', '바위 심장 2', 'ㄱㄴㄷ', 'a1 B2']) {
      expect(checkCharacterName(name, [])).toBeNull()
    }
  })

  it('탈이 안 나는 문장부호는 통과한다', () => {
    for (const name of ['바위-심장', '바위_심장', "O'Brien", '바위(둘)', '바위·심장', '어이!']) {
      expect(checkCharacterName(name, [])).toBeNull()
    }
  })
})

describe('막는 이름', () => {
  it('비었으면 막는다 — 공백만 있는 것도 빈 것이다', () => {
    expect(checkCharacterName('', [])).toBe('empty')
    expect(checkCharacterName('   ', [])).toBe('empty')
  })

  /** 앞뒤 공백으로 자릿수를 채우지 못한다 — 다듬은 뒤에 센다. */
  it('길면 막는다', () => {
    expect(checkCharacterName('가'.repeat(NAME_MAX), [])).toBeNull()
    expect(checkCharacterName('가'.repeat(NAME_MAX + 1), [])).toBe('long')
    expect(checkCharacterName(`  ${'가'.repeat(NAME_MAX)}  `, [])).toBeNull()
  })

  /** 화면·주소·저장 어디선가 반드시 한 번은 걸리는 글자들. */
  it('탈 나는 글자는 막는다', () => {
    for (const name of ['<script>', '바위&심장', '바위/심장', '바위"심장', '바위\\심장']) {
      expect(checkCharacterName(name, [])).toBe('charset')
    }
  })

  /** 기기마다 다르게 그려져 옆 사람이 보는 이름표와 내가 보는 것이 달라진다. */
  it('이모지는 막는다', () => {
    expect(checkCharacterName('바위심장🔥', [])).toBe('charset')
  })
})

describe('겹치는 이름', () => {
  it('이미 가진 것과 같으면 막는다', () => {
    expect(checkCharacterName('바위심장', ['바위심장'])).toBe('duplicate')
  })

  /** `Bob`과 `bob`이 한 상에 앉으면 누구의 체력인지 알 수 없다. */
  it('대소문자를 가리지 않는다', () => {
    expect(checkCharacterName('bob', ['Bob'])).toBe('duplicate')
    expect(checkCharacterName('BOB', ['bob'])).toBe('duplicate')
  })

  /** 눈에 안 보이는 차이로 다른 이름이 되면 안 된다. */
  it('공백만 다른 것도 같은 이름으로 본다', () => {
    expect(checkCharacterName('바위 심장', ['바위  심장'])).toBe('duplicate')
    expect(checkCharacterName(' 바위심장 ', ['바위심장'])).toBe('duplicate')
  })

  it('다른 이름은 통과한다', () => {
    expect(checkCharacterName('도끼투척수', ['바위심장', '땜장이'])).toBeNull()
  })
})

describe('사람에게 할 말', () => {
  /** "쓸 수 없는 이름"이라고만 하면 어디를 고쳐야 하는지 알 수 없다. */
  it('네 갈래가 저마다 다른 말을 한다', () => {
    const said = (['empty', 'long', 'charset', 'duplicate'] as const).map(nameProblemText)
    expect(new Set(said).size).toBe(4)
    expect(said.every((s) => s.trim() !== '')).toBe(true)
  })
})
