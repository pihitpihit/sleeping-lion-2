import { describe, expect, it } from 'vitest'
import { EchoGuard } from './changes'

/**
 * 내가 쓴 것이 나에게 돌아오는 것을 가려내기.
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ **여기가 틀리면 연달아 두 번 만진 것이 도로 되돌아간다.**                 │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * Postgres Changes에는 Broadcast의 `self: false` 같은 것이 없다. 서버는 행이
 * 바뀌었다는 사실만 알지 누가 바꿨는지로 가르지 않으므로, 내가 쓴 것도 되돌아온다.
 * 그대로 앉히면 **쓰고 나서 돌아오기까지 사이에 또 만진 것이 옛 값으로 덮인다** —
 * 원소를 연달아 두 번 켜면 두 번째가 도로 꺼지는 꼴이다.
 */

describe('되돌아온 것 가려내기', () => {
  it('내가 적어 둔 것은 걸러낸다', () => {
    const guard = new EchoGuard()
    guard.remember(100)
    expect(guard.isEcho(100)).toBe(true)
  })

  it('남이 보낸 것은 통과시킨다', () => {
    const guard = new EchoGuard()
    guard.remember(100)
    expect(guard.isEcho(200)).toBe(false)
  })

  it('한 번 걸러낸 것은 다시 걸러내지 않는다', () => {
    /**
     * 같은 시각이 두 번 돌아올 일은 없다. 남겨두면 나중에 **남이 우연히 같은
     * 시각을 찍었을 때** 그 사람의 것을 버린다.
     */
    const guard = new EchoGuard()
    guard.remember(100)
    expect(guard.isEcho(100)).toBe(true)
    expect(guard.isEcho(100)).toBe(false)
  })

  it('적어 둔 적 없으면 그대로 통과한다', () => {
    const guard = new EchoGuard()
    expect(guard.isEcho(1)).toBe(false)
  })

  it('여러 번 잇달아 올려도 각각 걸러낸다', () => {
    // 위젯을 옮기면 놓기 → 크기 → 회전이 잇달아 나간다.
    const guard = new EchoGuard()
    guard.remember(1)
    guard.remember(2)
    guard.remember(3)
    expect(guard.isEcho(2)).toBe(true)
    expect(guard.isEcho(1)).toBe(true)
    expect(guard.isEcho(3)).toBe(true)
  })

  it('오래 쌓이지 않는다 — 가장 오래된 것부터 버린다', () => {
    /**
     * 돌아오는 데 걸리는 시간이 초 단위를 넘지 않으므로 최근 몇 개면 족하다.
     * 버려진 것이 뒤늦게 돌아오면 한 번 헛되이 앉히는데, 값이 같으므로 화면은
     * 그대로다.
     */
    const guard = new EchoGuard()
    for (let i = 1; i <= 12; i += 1) guard.remember(i)

    expect(guard.isEcho(12)).toBe(true)
    expect(guard.isEcho(11)).toBe(true)
    // 가장 오래된 것들은 이미 버려졌다.
    expect(guard.isEcho(1)).toBe(false)
  })
})
