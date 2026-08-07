import { describe, expect, it } from 'vitest'
import { emptySettings, isEmptySettings, type SatchelSettings } from '../layout'
import { reconcile, type RemoteSettings } from './satchelNet'

/**
 * 로컬과 서버를 맞추는 판정.
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ **여기가 틀리면 짜 놓은 배치가 소리 없이 지워진다.**                      │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * 서버에 두기로 한 까닭이 배치를 잃지 않기 위해서인데, 판정이 틀리면 그것을
 * 하려다 오히려 잃는다. 특히 **빈 것이 알맹이를 밀어내는 길**이 없어야 한다 —
 * 새 기기에서 처음 열면 빈 설정이 만들어지기 때문이다.
 */

/** 위젯 하나를 놓은 설정. '알맹이가 있다'의 최소 조건이다. */
function filled(updatedAt: number): SatchelSettings {
  return {
    ...emptySettings(),
    updatedAt,
    layouts: {
      4: {
        columns: 4,
        widgets: [{ instanceId: 'a', definitionId: 'elements', x: 0, y: 0, w: 2, h: 2 }],
      },
    },
  }
}

function remoteOf(settings: SatchelSettings, arrivedAt = 1_000): RemoteSettings {
  return { settings, updatedAt: arrivedAt }
}

describe('빈 설정 가려내기', () => {
  it('갓 만든 것은 비었다', () => {
    expect(isEmptySettings(emptySettings())).toBe(true)
  })

  it('위젯을 하나라도 놓았으면 비지 않았다', () => {
    expect(isEmptySettings(filled(5))).toBe(false)
  })

  it('위젯이 없어도 화면 설정을 건드렸으면 비지 않았다', () => {
    expect(isEmptySettings({ ...emptySettings(), toolbarPosition: 'left' })).toBe(false)
    expect(isEmptySettings({ ...emptySettings(), showWidgetTitles: false })).toBe(false)
    expect(isEmptySettings({ ...emptySettings(), widgetRotations: { a: 90 } })).toBe(false)
  })

  it('빈 레이아웃만 있는 것은 비었다 — 격자만 잡히고 아무것도 안 놓은 상태다', () => {
    const settings = { ...emptySettings(), layouts: { 4: { columns: 4, widgets: [] } } }
    expect(isEmptySettings(settings)).toBe(true)
  })
})

describe('맞추기', () => {
  it('서버에 줄이 없으면 로컬을 올린다', () => {
    expect(reconcile(filled(10), null)).toEqual({ adopt: null, push: true })
  })

  it('서버에 줄이 없고 로컬도 비었으면 올릴 것이 없다', () => {
    expect(reconcile(emptySettings(), null)).toEqual({ adopt: null, push: false })
  })

  it('로컬이 비었으면 서버 것을 가져온다 — 이러려고 서버에 둔다', () => {
    const remote = remoteOf(filled(10))
    expect(reconcile(emptySettings(), remote)).toEqual({ adopt: remote.settings, push: false })
  })

  it('늦게 고친 쪽이 이긴다 — 로컬', () => {
    expect(reconcile(filled(20), remoteOf(filled(10)))).toEqual({ adopt: null, push: true })
  })

  it('늦게 고친 쪽이 이긴다 — 서버', () => {
    const remote = remoteOf(filled(30))
    expect(reconcile(filled(20), remote)).toEqual({ adopt: remote.settings, push: false })
  })

  it('같으면 가만둔다', () => {
    expect(reconcile(filled(20), remoteOf(filled(20)))).toEqual({ adopt: null, push: false })
  })

  /* ------------------------------------------------------------------------
     지워지지 않아야 하는 자리들
     ------------------------------------------------------------------------ */

  it('빈 서버 줄이 알맹이 있는 로컬을 밀어내지 못한다', () => {
    // 다른 기기가 갓 설치되어 빈 것을 올려 둔 상황. 시각은 그쪽이 늦다.
    const remote = remoteOf({ ...emptySettings(), updatedAt: 9_999 })
    expect(reconcile(filled(10), remote)).toEqual({ adopt: null, push: true })
  })

  it('시각을 모르는 옛 로컬은 서버에 진다 — 서버 줄은 누군가 실제로 올린 것이다', () => {
    const remote = remoteOf(filled(10))
    expect(reconcile(filled(0), remote)).toEqual({ adopt: remote.settings, push: false })
  })

  it('뭉치에 시각이 없는 서버 것은 도착 시각으로 갈음한다', () => {
    // 서버 뭉치의 updatedAt이 0이면 그것 말고 아는 것이 없다. 종류가 다른 값을
    // 견주게 되지만, 이 자리에 올 수 있는 것은 시각을 찍기 전에 올라간 뭉치뿐이다.
    const stale = remoteOf(filled(0), 50)
    expect(reconcile(filled(40), stale)).toEqual({ adopt: stale.settings, push: false })
    expect(reconcile(filled(60), stale)).toEqual({ adopt: null, push: true })
  })

  it('기기 시계끼리 견준다 — 서버 도착 시각은 끼어들지 않는다', () => {
    /**
     * 도착 시각은 언제나 고친 시각보다 늦다. 그것으로 견주면 로컬이 영영 진다.
     * 뭉치 안의 시각이 있으면 도착 시각은 보지 않아야 한다.
     */
    const remote = remoteOf(filled(10), Number.MAX_SAFE_INTEGER)
    expect(reconcile(filled(20), remote)).toEqual({ adopt: null, push: true })
  })
})
