import { describe, expect, it } from 'vitest'
import { splitPerkText } from './perkWords'

/**
 * 특혜 글은 관리자가 적어 넣은 우리말 문장이다(`0013`). 그 안에서 그림으로 바꿀
 * 낱말을 갈라내는 일은 **화면과 무관하게 정해진다** — 순수 함수로 떼어 덮는다.
 */

/** 읽기 쉽게 조각을 짧은 글로 편다. */
function shape(text: string): string[] {
  return splitPerkText(text).map((p) => {
    if (p.kind === 'text') return `"${p.text}"`
    if (p.kind === 'rolling') return '[굴림]'
    return p.amount === null ? `[${p.def.id}]` : `[${p.def.id}:${p.amount}]`
  })
}

describe('낱말을 그림으로 가른다', () => {
  it('형님이 든 보기 그대로', () => {
    expect(shape('굴림 바람 카드 2장 추가')).toEqual(['[굴림]', '" "', '[air]', '" 카드 2장 추가"'])
  })

  it('그림으로 바꿀 것이 없으면 통째로 글이다', () => {
    expect(shape('카드 2장을 1장으로 교체')).toEqual(['"카드 2장을 1장으로 교체"'])
  })
})

/**
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ **「이동불가」 안의 「불」을 잡으면 안 된다.**                              │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * DB의 특혜 글에서 「불」이 열 번 걸리는데 그중 다섯이 「이동불가」 속이었다.
 * 자리마다 **가장 긴 낱말부터** 맞춰 보는 것 하나로 갈린다.
 */
describe('긴 낱말이 먼저다', () => {
  it('이동불가를 통째로 잡는다', () => {
    expect(shape('이동불가 카드 1장 추가')).toEqual(['[immobilize]', '" 카드 1장 추가"'])
  })

  it('불은 불대로 잡는다', () => {
    expect(shape('불 카드')).toEqual(['[fire]', '" 카드"'])
  })

  it('한 줄에 둘 다 있어도 갈린다', () => {
    expect(shape('불 이동불가')).toEqual(['[fire]', '" "', '[immobilize]'])
  })
})

describe('붙어 있는 수', () => {
  it('수를 다는 표식은 붙은 수를 삼킨다', () => {
    expect(shape('밀기2 카드')).toEqual(['[push:2]', '" 카드"'])
    expect(shape('관통3')).toEqual(['[pierce:3]'])
  })

  /** `4장`의 `4`가 앞 낱말에 붙는 일이 없어야 한다. */
  it('수를 안 다는 표식은 삼키지 않는다', () => {
    expect(shape('불2')).toEqual(['[fire]', '"2"'])
  })

  it('띄어 적힌 수는 딸려 오지 않는다', () => {
    expect(shape('밀기 2')).toEqual(['[push]', '" 2"'])
  })
})

describe('그 밖', () => {
  /** 「대상」만 잡고 「추가」는 남긴다 — 그림이 삼킬 것은 표식이 가리키는 것까지다. */
  it('대상 추가에서 대상만 잡는다', () => {
    expect(shape('대상 추가')).toEqual(['[targets]', '" 추가"'])
  })

  it('가운뎃점으로 묶인 원소 둘을 각각 잡는다', () => {
    expect(shape('불·얼음')).toEqual(['[fire]', '"·"', '[ice]'])
  })

  it('빈 글은 아무것도 내지 않는다', () => {
    expect(splitPerkText('')).toEqual([])
  })
})
