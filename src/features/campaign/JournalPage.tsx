import { useEffect, useState } from 'react'
import { useCampaignStore } from './campaignStore'
import { PartySheet } from './PartySheet'
import { priceModifierLabel, shopPriceModifier } from './reputation'
import './JournalPage.css'

/**
 * 일지 — 축 ① 캠페인 기록지의 진입로.
 *
 * 경로 하나로 목록과 기록지를 함께 다룬다. `#/journal`은 목록이고
 * `#/journal/<id>`는 그 기록지다 — 초대 링크(`#/join/<토큰>`)와 같은 방식이라
 * 라우터를 새로 들이지 않는다(`routes.ts`).
 *
 * **화면 이름은 '일지'다.** 웰컴의 카드 제목과 같아야 눌러서 온 사람이 같은 곳에
 * 왔다는 것을 안다. SPEC의 '캠페인 기록지'는 기술 용어이고 화면은 여관 문체를
 * 따른다(SPEC 9장).
 */
export function JournalPage() {
  const list = useCampaignStore((s) => s.list)
  const current = useCampaignStore((s) => s.current)
  const loaded = useCampaignStore((s) => s.loaded)
  const error = useCampaignStore((s) => s.error)
  const refresh = useCampaignStore((s) => s.refresh)
  const open = useCampaignStore((s) => s.open)
  const close = useCampaignStore((s) => s.close)
  const add = useCampaignStore((s) => s.add)
  const edit = useCampaignStore((s) => s.edit)

  const [newName, setNewName] = useState('')

  /** 해시에서 기록지 id를 읽는다. `#/journal/<id>` */
  const [openId, setOpenId] = useState(() => idFromHash(window.location.hash))
  useEffect(() => {
    const onHash = () => setOpenId(idFromHash(window.location.hash))
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  useEffect(() => {
    if (openId) void open(openId)
    else {
      close()
      void refresh()
    }
  }, [openId, open, close, refresh])

  async function onCreate() {
    const made = await add(newName)
    if (!made) return
    setNewName('')
    window.location.hash = `#/journal/${made.id}`
  }

  return (
    <div className="journal">
      <header className="journal__bar">
        <a
          className="journal__back"
          href={openId ? '#/journal' : '#/'}
          aria-label={openId ? '일지 목록으로' : '처음으로'}
        >
          ←
        </a>
        <h1 className="journal__title">
          {openId && current ? current.name || '이름 없는 파티' : '일지'}
        </h1>
      </header>

      {error && (
        <p className="journal__error" role="status">
          {error}
        </p>
      )}

      {/* 기록지 한 장 */}
      {openId ? (
        current ? (
          /* `key`로 기록지를 가른다. 다른 것을 펼치면 초안(치던 글자)이 함께
             새로 시작해야 한다 — 이펙트로 맞추면 렌더가 꼬리를 문다. */
          <PartySheet
            key={current.id}
            campaign={current}
            onEdit={(edits) => void edit(current.id, edits)}
          />
        ) : (
          loaded && <p className="journal__empty">그런 기록지가 없다.</p>
        )
      ) : (
        <>
          {/* 목록 */}
          {loaded && list.length === 0 && (
            <p className="journal__empty">아직 적어둔 것이 없다. 파티를 하나 세워라.</p>
          )}

          {list.length > 0 && (
            <ul className="journal__list">
              {list.map((campaign) => {
                const modifier = shopPriceModifier(campaign.reputation)
                return (
                  <li key={campaign.id}>
                    <a className="journal__entry" href={`#/journal/${campaign.id}`}>
                      <span className="journal__entry-name">
                        {campaign.name || '이름 없는 파티'}
                      </span>
                      <span className="journal__entry-meta">
                        {campaign.location && (
                          <span className="journal__entry-place">{campaign.location}</span>
                        )}
                        <span className="sl-numeral" aria-label={`평판 ${campaign.reputation}`}>
                          {campaign.reputation > 0
                            ? `+${campaign.reputation}`
                            : campaign.reputation}
                        </span>
                        <span className="journal__entry-price sl-numeral" aria-hidden="true">
                          {priceModifierLabel(modifier)}
                        </span>
                      </span>
                    </a>
                  </li>
                )
              })}
            </ul>
          )}

          <div className="journal__new">
            <input
              className="journal__new-input"
              value={newName}
              placeholder="새 파티 이름"
              aria-label="새 파티 이름"
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  void onCreate()
                }
              }}
            />
            <button
              type="button"
              className="journal__new-button"
              disabled={newName.trim() === ''}
              onClick={() => void onCreate()}
            >
              세우기
            </button>
          </div>
        </>
      )}
    </div>
  )
}

/** `#/journal/abc` → `abc`. 목록이면 빈 문자열. */
function idFromHash(hash: string): string {
  const parts = hash.replace(/^#\//, '').split('/')
  return parts[0] === 'journal' ? (parts[1] ?? '') : ''
}
