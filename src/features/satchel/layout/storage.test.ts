import { describe, expect, it } from 'vitest'
import { loadSettings, saveSettings, STORAGE_KEY, type StorageLike } from './storage'
import { emptySettings, SETTINGS_VERSION } from './types'

function fakeStorage(initial: Record<string, string> = {}): StorageLike & { data: typeof initial } {
  const data = { ...initial }
  return {
    data,
    getItem: (k) => data[k] ?? null,
    setItem: (k, v) => {
      data[k] = v
    },
  }
}

const VALID = {
  version: SETTINGS_VERSION,
  layouts: {
    4: { columns: 4, widgets: [{ instanceId: 'a', definitionId: 'test', x: 0, y: 0, w: 2, h: 2 }] },
  },
  toolbarPosition: 'left',
}

describe('loadSettings', () => {
  it('비어 있으면 기본값', () => {
    expect(loadSettings(fakeStorage())).toEqual(emptySettings())
  })

  it('저장된 것을 읽는다', () => {
    const s = loadSettings(fakeStorage({ [STORAGE_KEY]: JSON.stringify(VALID) }))
    expect(s.toolbarPosition).toBe('left')
    expect(s.layouts[4].widgets).toHaveLength(1)
  })

  // 도구 화면이 저장소 문제로 안 뜨면 안 된다.
  it('쓰레기가 들어 있어도 던지지 않는다', () => {
    for (const junk of ['{{{', 'null', '42', '"문자열"', '[]', '{"layouts":5}']) {
      expect(() => loadSettings(fakeStorage({ [STORAGE_KEY]: junk }))).not.toThrow()
    }
  })

  it('저장소 접근이 막혀도 기본값을 낸다', () => {
    expect(loadSettings(null)).toEqual(emptySettings())
    const throwing: StorageLike = {
      getItem() {
        throw new Error('접근 거부')
      },
      setItem() {},
    }
    expect(loadSettings(throwing)).toEqual(emptySettings())
  })

  // 다른 기기에서 최신 버전을 쓰던 사용자의 데이터를 덮어쓰면 안 된다.
  it('알 수 없는 상위 버전은 건드리지 않고 기본값으로 간다', () => {
    const future = JSON.stringify({ ...VALID, version: SETTINGS_VERSION + 5 })
    expect(loadSettings(fakeStorage({ [STORAGE_KEY]: future }))).toEqual(emptySettings())
  })

  // 레지스트리에서 위젯을 뺐거나 저장이 반쯤 망가졌을 때 전체가 죽으면 안 된다.
  it('망가진 레이아웃 하나가 나머지를 죽이지 않는다', () => {
    const mixed = JSON.stringify({
      version: SETTINGS_VERSION,
      layouts: {
        4: VALID.layouts[4],
        8: { columns: 8, widgets: 'ㅋㅋ' },
        notANumber: { columns: 1, widgets: [] },
      },
      toolbarPosition: 'top',
    })
    const s = loadSettings(fakeStorage({ [STORAGE_KEY]: mixed }))
    expect(Object.keys(s.layouts)).toEqual(['4'])
    expect(s.toolbarPosition).toBe('top')
  })

  it("알 수 없는 툴바 위치는 'auto'로 떨어뜨린다", () => {
    for (const bad of ['오른쪽', null, 42]) {
      const raw = JSON.stringify({ ...VALID, toolbarPosition: bad })
      expect(loadSettings(fakeStorage({ [STORAGE_KEY]: raw })).toolbarPosition).toBe('auto')
    }
  })

  it("'auto'를 그대로 읽는다", () => {
    const raw = JSON.stringify({ ...VALID, toolbarPosition: 'auto' })
    expect(loadSettings(fakeStorage({ [STORAGE_KEY]: raw })).toolbarPosition).toBe('auto')
  })
})

describe('saveSettings', () => {
  it('저장하고 다시 읽으면 같다', () => {
    const storage = fakeStorage()
    const settings = emptySettings()
    settings.toolbarPosition = 'left'
    expect(saveSettings(settings, storage)).toBe(true)
    expect(loadSettings(storage)).toEqual(settings)
  })

  it('저장 실패를 흡수한다', () => {
    const full: StorageLike = {
      getItem: () => null,
      setItem() {
        throw new Error('용량 초과')
      },
    }
    expect(() => saveSettings(emptySettings(), full)).not.toThrow()
    expect(saveSettings(emptySettings(), full)).toBe(false)
    expect(saveSettings(emptySettings(), null)).toBe(false)
  })
})
