import { describe, expect, it } from 'vitest'
import { fetchWithRetry } from './lazyPage'

/*
  **한 번 미끄러진 것과 진짜 없는 것을 가른다.** 앞의 것은 다시 해 보면 되고
  뒤의 것은 포기해야 한다 — 둘을 못 가르면 어두운 화면이 그대로 남거나(포기가
  이르다) 끝없이 다시 부른다.

  기다리는 것은 가짜로 넘긴다. 진짜 쉬면 시험이 그만큼 느려지고, 느린 시험은
  결국 안 돌린다.
*/

const nowait = () => Promise.resolve()

describe('fetchWithRetry', () => {
  it('한 번에 되면 다시 부르지 않는다', async () => {
    let calls = 0
    const got = await fetchWithRetry(
      () => {
        calls++
        return Promise.resolve('조각')
      },
      [1, 2],
      nowait,
    )
    expect(got).toBe('조각')
    expect(calls).toBe(1)
  })

  it('한 번 미끄러져도 다음에 받으면 그것으로 끝난다', async () => {
    let calls = 0
    const got = await fetchWithRetry(
      () => {
        calls++
        return calls === 1 ? Promise.reject(new Error('끊김')) : Promise.resolve('조각')
      },
      [1, 2],
      nowait,
    )
    expect(got).toBe('조각')
    expect(calls).toBe(2)
  })

  it('끝까지 못 받으면 마지막 오류를 그대로 올린다 — 그물이 받아야 한다', async () => {
    let calls = 0
    await expect(
      fetchWithRetry(
        () => {
          calls++
          return Promise.reject(new Error(`끊김${calls}`))
        },
        [1, 2],
        nowait,
      ),
    ).rejects.toThrow('끊김3')
    // 쉬는 사이가 둘이면 시도는 셋이다. 끝없이 부르지 않는다.
    expect(calls).toBe(3)
  })
})
