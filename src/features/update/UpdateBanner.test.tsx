import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { UpdateBannerPanel } from './UpdateBanner'

describe('UpdateBannerPanel', () => {
  it('알리고, 새로고침과 나중에를 낸다', () => {
    const html = renderToStaticMarkup(<UpdateBannerPanel onReload={() => {}} onLater={() => {}} />)
    expect(html).toContain('새 버전이 나왔다')
    expect(html).toContain('새로고침')
    expect(html).toContain('aria-label="나중에"')
  })
})
