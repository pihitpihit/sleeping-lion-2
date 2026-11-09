/**
 * 새 버전 알아채기 — 홈 화면 웹앱을 위한 것이다.
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ **배포하면 앱이 스스로 알아채고 새로고침 단추를 띄운다.**                 │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * 아이폰 홈 화면에 얹은 웹앱은 주소창도 당겨서 새로고침도 없어 배포 뒤에도 옛 화면이
 * 남는다(형님이 짚었다). 빌드가 제 버전을 번들과 `version.json`에 함께 적어 두므로
 * (`vite.config.ts`) 서버의 것을 읽어 견주면 된다.
 *
 * 순수한 셈만 여기 두고 화면은 `UpdateBanner`가 한다.
 */

/** 지금 돌고 있는 번들의 버전. */
export const APP_VERSION: string = __APP_VERSION__

/** 서버가 준 것이 지금 것과 다른 새 버전인가. 모양이 틀리면 아니라고 본다. */
export function newVersionOf(current: string, fetched: unknown): string | null {
  if (current === 'dev') return null
  if (typeof fetched !== 'object' || fetched === null) return null
  const v = (fetched as { version?: unknown }).version
  if (typeof v !== 'string' || v === '' || v === 'dev') return null
  return v === current ? null : v
}

/**
 * 새로 불러올 주소 — **물음표 뒤에 버전을 붙인다.**
 *
 * 그냥 `reload()`하면 브라우저가 들고 있던 `index.html`을 다시 쓸 수 있다(GitHub
 * Pages는 10분 동안 캐시하게 둔다). 주소가 달라지면 새로 받는다. 화면은 `#` 뒤만
 * 읽으므로 물음표 뒤는 아무 일도 안 한다 — 지금 보던 화면 그대로 돌아온다.
 */
export function freshUrl(pathname: string, hash: string, version: string): string {
  return `${pathname}?v=${encodeURIComponent(version)}${hash}`
}

/** 서버에 올라간 버전. 못 읽으면 `null` — 신호가 없어도 앱은 그대로 돈다. */
export async function fetchDeployedVersion(): Promise<string | null> {
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}version.json?t=${Date.now()}`, {
      cache: 'no-store',
    })
    if (!res.ok) return null
    return newVersionOf(APP_VERSION, await res.json())
  } catch {
    return null
  }
}

/** 새 버전으로 새로 불러온다. 버전을 모르면 지금 시각을 붙여 캐시를 비켜 간다. */
export function reloadFresh(version?: string | null): void {
  const { pathname, hash } = window.location
  window.location.replace(freshUrl(pathname, hash, version || String(Date.now())))
}
