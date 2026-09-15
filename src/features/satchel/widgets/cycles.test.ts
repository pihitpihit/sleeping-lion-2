import { describe, expect, it } from 'vitest'

/*
  ┌──────────────────────────────────────────────────────────────────────────┐
  │ **모듈이 서로를 물고 돌면 화면이 통째로 안 뜬다.**                        │
  └──────────────────────────────────────────────────────────────────────────┘

  위젯이 행낭 스토어를 직접 부르면서 고리가 생겼었다:
  `satchelStore` → `registry` → 위젯 → `satchelStore`. 번들러가 모듈 차례를
  어떻게 잡느냐에 따라 **아직 만들어지지 않은 것을 읽는 자리**가 되고, 그때는
  아무 메시지도 없이 까만 화면만 남는다(구현 결정 585와 같은 종류의 고장).

  **눈으로는 안 보인다** — 각 파일은 멀쩡하고 고리는 셋을 이어 봐야 드러난다.
  그래서 시험이 붙든다.

  파일을 읽는 데 `node:fs`를 쓰지 않는다. 이 저장소의 `tsconfig`는 브라우저
  쪽만 보므로 노드 타입이 없다 — **Vite가 주는 `import.meta.glob`**이면 타입이
  그대로 붙고 시험도 같은 도구 위에서 돈다.
*/

const SOURCES = import.meta.glob('/src/**/*.{ts,tsx}', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

/** 시험 파일은 아무도 `import`하지 않는다 — 고리에 낄 수 없다. */
function isSource(path: string): boolean {
  return !/\.test\.tsx?$/.test(path)
}

/**
 * 상대 `import`가 가리키는 파일을 찾는다.
 *
 * 확장자를 안 적는 것이 보통이라 있을 법한 꼴을 차례로 짚어 본다 — 패키지
 * `import`는 고리를 만들 수 없으므로 건너뛴다.
 */
function resolveFrom(fromPath: string, spec: string): string | null {
  const parts = fromPath.split('/').slice(0, -1)
  for (const step of spec.split('/')) {
    if (step === '.') continue
    else if (step === '..') parts.pop()
    else parts.push(step)
  }
  const base = parts.join('/')
  for (const candidate of [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    `${base}/index.ts`,
    `${base}/index.tsx`,
  ]) {
    if (candidate in SOURCES) return candidate
  }
  return null
}

describe('모듈이 서로를 물고 돌지 않는다', () => {
  it('상대 `import`에 고리가 없다', () => {
    const graph = new Map<string, string[]>()
    for (const [path, source] of Object.entries(SOURCES)) {
      if (!isSource(path)) continue
      const out: string[] = []
      for (const m of source.matchAll(/from\s+'(\.[^']+)'/g)) {
        const target = resolveFrom(path, m[1])
        if (target !== null && isSource(target)) out.push(target)
      }
      graph.set(path, out)
    }

    /** 파일이 하나도 안 잡히면 시험이 통과해도 뜻이 없다 — 먼저 그것부터 본다. */
    expect(graph.size).toBeGreaterThan(50)

    const state = new Map<string, 1 | 2>()
    const cycles: string[] = []

    const walk = (node: string, stack: string[]) => {
      state.set(node, 1)
      stack.push(node)
      for (const next of graph.get(node) ?? []) {
        if (state.get(next) === 1) {
          cycles.push([...stack.slice(stack.indexOf(next)), next].join(' → '))
        } else if (state.get(next) === undefined) {
          walk(next, stack)
        }
      }
      stack.pop()
      state.set(node, 2)
    }

    for (const node of graph.keys()) if (state.get(node) === undefined) walk(node, [])

    expect(cycles).toEqual([])
  })
})
