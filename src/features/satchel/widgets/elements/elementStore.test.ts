import { beforeEach, describe, expect, it } from 'vitest'
import { useElementStore } from './elementStore'

/**
 * 행낭 전체에 원소 상태가 **하나뿐**이라는 것을 못 박는다.
 *
 * 실물 원소판은 식탁 위에 하나이고 트래커 위젯은 그것을 비추는 창일 뿐이다.
 * 나눠 갖도록 되돌리면 이 시험이 깨진다.
 */
describe('원소 상태는 행낭에 하나뿐이다', () => {
  beforeEach(() => useElementStore.getState().resetAll())

  it('건드리기 전에는 전부 꺼짐이다', () => {
    for (const id of ['fire', 'ice', 'air', 'earth', 'light', 'dark']) {
      expect(useElementStore.getState().stateOf(id)).toBe('inert')
    }
  })

  it('한 곳에서 바꾸면 어디서 읽어도 같다', () => {
    useElementStore.getState().setState('fire', 'strong')
    // 트래커가 몇 개든 같은 스토어를 읽는다 — 읽는 쪽을 나눌 방법 자체가 없다.
    expect(useElementStore.getState().stateOf('fire')).toBe('strong')
  })

  it('원소끼리는 서로를 건드리지 않는다', () => {
    useElementStore.getState().setState('fire', 'strong')
    expect(useElementStore.getState().stateOf('ice')).toBe('inert')
  })

  it('탭하면 꺼짐 → 타오름 → 사그라듦 → 꺼짐으로 돈다', () => {
    const { advance, stateOf } = useElementStore.getState()
    advance('earth')
    expect(stateOf('earth')).toBe('strong')
    advance('earth')
    expect(stateOf('earth')).toBe('waning')
    advance('earth')
    expect(stateOf('earth')).toBe('inert')
  })

  it('전부 끄면 하나도 남지 않는다', () => {
    useElementStore.getState().setState('fire', 'strong')
    useElementStore.getState().setState('dark', 'waning')
    useElementStore.getState().resetAll()
    expect(useElementStore.getState().stateOf('fire')).toBe('inert')
    expect(useElementStore.getState().stateOf('dark')).toBe('inert')
  })

  /** SPEC 5.2 — 도구 런타임은 메모리 전용이다. persist가 붙으면 여기서 걸린다. */
  it('저장소에 아무것도 쓰지 않는다', () => {
    const written: string[] = []
    const fake = {
      setItem: (k: string) => written.push(k),
      getItem: () => null,
      removeItem: () => {},
    }
    const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: fake })

    useElementStore.getState().setState('fire', 'strong')
    useElementStore.getState().advance('ice')

    if (original) Object.defineProperty(globalThis, 'localStorage', original)
    else Reflect.deleteProperty(globalThis, 'localStorage')

    expect(written).toEqual([])
  })
})
