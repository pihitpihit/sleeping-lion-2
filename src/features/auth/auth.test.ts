import { beforeEach, describe, expect, it } from 'vitest'
import { resolveAuthMode, requiresLogin, isTrial } from './mode'
import { guardRoute, LOGIN_ROUTE } from './guard'
import { expiryFrom, isSessionValid, parseSession, type Session } from './session'
import { isSafeReturnRoute, setPendingRoute, takePendingRoute } from './pendingRoute'

describe('resolveAuthMode — 모르면 잠근다', () => {
  it('아는 값만 열어준다', () => {
    expect(resolveAuthMode('demo')).toBe('demo')
    expect(resolveAuthMode('mock')).toBe('mock')
    expect(resolveAuthMode('live')).toBe('live')
  })

  /**
   * 이 시험이 이 파일에서 가장 중요하다. 플래그를 빠뜨렸을 때 정식 배포가
   * 조용히 열리는 것을 막는다.
   */
  it('없거나 모르는 값이면 live다', () => {
    for (const raw of [undefined, null, '', '  ', 'production', 'true', 'DEMOO', 0, 1, {}, []]) {
      expect(resolveAuthMode(raw)).toBe('live')
    }
  })

  it('앞뒤 공백과 대소문자는 봐준다', () => {
    // YAML에서 딸려 온 공백 하나로 배포가 잠기면 원인을 찾기 어렵다.
    expect(resolveAuthMode(' demo ')).toBe('demo')
    expect(resolveAuthMode('MOCK')).toBe('mock')
    expect(resolveAuthMode('\tDemo\n')).toBe('demo')
  })

  it('demo만 로그인을 요구하지 않는다', () => {
    expect(requiresLogin('demo')).toBe(false)
    expect(requiresLogin('mock')).toBe(true)
    expect(requiresLogin('live')).toBe(true)
  })

  it('시험판 표시는 mock에서만 켠다', () => {
    expect(isTrial('mock')).toBe(true)
    expect(isTrial('demo')).toBe(false)
    expect(isTrial('live')).toBe(false)
  })
})

describe('guardRoute', () => {
  it('로그인 전에는 아무 화면도 열리지 않는다', () => {
    for (const mode of ['mock', 'live'] as const) {
      for (const route of ['/', '/satchel']) {
        expect(guardRoute(route, mode, false)).toEqual({
          kind: 'redirect',
          to: LOGIN_ROUTE,
          remember: route,
        })
      }
    }
  })

  /** 출처표시 의무는 로그인 여부와 무관하게 배포에서 발생한다(SPEC 13.1). */
  it('공지는 로그인 없이도 열린다', () => {
    for (const mode of ['demo', 'mock', 'live'] as const) {
      expect(guardRoute('/notice', mode, false)).toEqual({ kind: 'allow' })
    }
  })

  it('로그인하면 다 열린다', () => {
    for (const mode of ['mock', 'live'] as const) {
      for (const route of ['/', '/satchel', '/notice']) {
        expect(guardRoute(route, mode, true)).toEqual({ kind: 'allow' })
      }
    }
  })

  it('가려던 곳을 기억해 둔다', () => {
    const decision = guardRoute('/satchel', 'live', false)
    expect(decision).toMatchObject({ remember: '/satchel' })
  })

  it('이미 들어와 있으면 로그인 화면을 다시 보여주지 않는다', () => {
    expect(guardRoute(LOGIN_ROUTE, 'live', true)).toEqual({ kind: 'redirect', to: '/' })
    expect(guardRoute(LOGIN_ROUTE, 'live', false)).toEqual({ kind: 'allow' })
  })

  it('demo 배포에는 로그인 화면이 없다', () => {
    expect(guardRoute('/', 'demo', false)).toEqual({ kind: 'allow' })
    expect(guardRoute('/satchel', 'demo', false)).toEqual({ kind: 'allow' })
    expect(guardRoute(LOGIN_ROUTE, 'demo', false)).toEqual({ kind: 'redirect', to: '/' })
  })
})

describe('세션', () => {
  const good: Session = { userId: 'u', displayName: '형님', expiresAt: 1_000 }

  it('만료를 지나면 없는 것으로 친다', () => {
    expect(isSessionValid(good, 999)).toBe(true)
    expect(isSessionValid(good, 1_000)).toBe(false)
    expect(isSessionValid(good, 1_001)).toBe(false)
    expect(isSessionValid(null, 0)).toBe(false)
  })

  it('저장된 값을 한 자락도 믿지 않는다', () => {
    expect(parseSession(JSON.stringify(good))).toEqual(good)

    for (const bad of [
      null,
      undefined,
      42,
      '',
      'null',
      '{',
      '[]',
      '"문자열"',
      JSON.stringify({}),
      JSON.stringify({ userId: 'u', displayName: '형님' }), // 만료 없음
      JSON.stringify({ userId: '', displayName: '형님', expiresAt: 1 }),
      JSON.stringify({ userId: 'u', displayName: '', expiresAt: 1 }),
      JSON.stringify({ userId: 'u', displayName: '형님', expiresAt: '내일' }),
      JSON.stringify({ userId: 'u', displayName: '형님', expiresAt: Number.NaN }),
      JSON.stringify({ userId: 'u', displayName: '형님', expiresAt: Infinity }),
    ]) {
      expect(parseSession(bad)).toBeNull()
    }
  })

  it('만료는 지금부터 센다', () => {
    expect(expiryFrom(0, 1)).toBe(24 * 60 * 60 * 1000)
    expect(expiryFrom(500, 0)).toBe(500)
  })
})

/**
 * 시험은 node에서 돈다(`vite.config.ts`). 브라우저 저장소가 없으므로 필요한
 * 만큼만 세운다 — 이것 하나 때문에 jsdom을 통째로 들이는 것은 과하다.
 */
function installFakeStorage(name: 'sessionStorage' | 'localStorage'): void {
  const map = new Map<string, string>()
  Object.defineProperty(globalThis, name, {
    configurable: true,
    value: {
      getItem: (key: string) => map.get(key) ?? null,
      setItem: (key: string, value: string) => void map.set(key, String(value)),
      removeItem: (key: string) => void map.delete(key),
      clear: () => map.clear(),
    },
  })
}

describe('되돌아갈 곳', () => {
  beforeEach(() => installFakeStorage('sessionStorage'))

  it('바깥 주소로는 튕겨 보내지 않는다', () => {
    expect(isSafeReturnRoute('/satchel')).toBe(true)
    expect(isSafeReturnRoute('//evil.example')).toBe(false)
    expect(isSafeReturnRoute('https://evil.example')).toBe(false)
    expect(isSafeReturnRoute('satchel')).toBe(false)
    expect(isSafeReturnRoute(null)).toBe(false)
  })

  it('한 번 꺼내면 사라진다', () => {
    setPendingRoute('/satchel')
    expect(takePendingRoute()).toBe('/satchel')
    expect(takePendingRoute()).toBeNull()
  })

  it('위험한 값은 아예 적지 않는다', () => {
    setPendingRoute('//evil.example')
    expect(takePendingRoute()).toBeNull()
  })
})
