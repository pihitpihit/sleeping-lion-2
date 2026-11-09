import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { WorldMapPanel } from './WorldMap'
import { MAP_FILE, stickerFile } from './worldMapSpots'

/*
  지도 판은 값만 받으므로 서버 렌더로 확인된다(구현 결정 194). 그림 주소는 지어낸
  것이다 — 실제 그림은 비공개 버킷에만 있다(`0051`).
*/

const stickers = [
  { no: 201, name: '가', state: 'done' as const, spot: { x: 100, y: 50, w: 20, h: 10 } },
  { no: 202, name: '나', state: 'blocked' as const, spot: { x: 300, y: 50, w: 20, h: 10 } },
]
const urls = {
  [MAP_FILE]: 'https://example.test/map',
  [stickerFile(201)]: 'https://example.test/201',
  [stickerFile(202)]: 'https://example.test/202',
}

function render(over: Partial<Parameters<typeof WorldMapPanel>[0]> = {}) {
  return renderToStaticMarkup(
    <WorldMapPanel
      stickers={stickers}
      urls={urls}
      failed={false}
      onClose={() => {}}
      initialSize={{ w: 1000, h: 500 }}
      {...over}
    />,
  )
}

describe('WorldMapPanel', () => {
  it('스티커를 상태에 맞는 테로 제자리에 붙인다', () => {
    const html = render()
    expect(html).toContain('wmap__sticker--done')
    expect(html).toContain('wmap__sticker--blocked')
    expect(html).toContain('left:10%;top:10%')
    expect(html).toContain('left:30%')
  })

  it('지도 크기를 알기 전에는 스티커를 안 붙인다 — 엉뚱한 자리에 서지 않게', () => {
    expect(render({ initialSize: null })).not.toContain('wmap__sticker')
  })

  it('주소를 못 받은 스티커는 빠지고 지도는 선다', () => {
    const html = render({
      urls: { [MAP_FILE]: urls[MAP_FILE], [stickerFile(201)]: urls[stickerFile(201)] },
    })
    expect(html).toContain('wmap__sticker--done')
    expect(html).not.toContain('wmap__sticker--blocked')
  })

  it('지도 그림이 아직 없으면 어디서 올리는지 적는다', () => {
    expect(render({ urls: {} })).toContain('#/admin')
  })

  it('서버에 못 닿으면 그 사실만 적는다', () => {
    expect(render({ failed: true, urls: null })).toContain('지도를 받지 못했다')
  })
})
