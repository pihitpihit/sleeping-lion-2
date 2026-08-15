import { useEffect, useState } from 'react'
import { CatalogPopup } from './Catalog'
import { useAchievementStore } from './achievementStore'
import './Shop.css'

/**
 * 업적 고르기 — **상점과 같은 팝업, 값만 없다**(형님이 정했다).
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ **같은 것을 사람마다 다르게 적어 두면 나중에 알 수 없다.**                │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * 여태 파티 기록지에서 손으로 쳤다. 찾다가 없으면 그 자리에서 한 줄 더하는
 * 결로 바꾼다 — 값을 묻는 팝업이 없으므로 「추가」를 누르면 곧바로 들어간다.
 *
 * 담은 것은 **초안에 담긴다** — 기록지에서 저장을 눌러야 남는다(구현 결정 165).
 */
export function AchievementPicker({
  owned,
  userId,
  onPick,
  onClose,
}: {
  /** 지금 파티가 이룬 것들. **초안의 값이다** — 방금 담은 것이 곧바로 표시된다. */
  owned: readonly string[]
  userId: string | null
  onPick: (name: string) => void
  onClose: () => void
}) {
  const items = useAchievementStore((s) => s.items)
  const loaded = useAchievementStore((s) => s.loaded)
  const load = useAchievementStore((s) => s.load)
  const define = useAchievementStore((s) => s.add)
  const drop = useAchievementStore((s) => s.drop)

  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <>
      <CatalogPopup
        title="업적"
        ownedWord="달성"
        entries={loaded ? items : null}
        owned={owned}
        canDefine={userId !== null}
        tail={(entry) => (
          /*
            **여러 번 담을 수 있다.** 같은 업적을 두 번 이루는 판은 없지만, 막아
            두면 잘못 뺐을 때 되돌릴 길이 없다 — 몇 개인지만 적는다.
          */
          <button type="button" className="shop__buy" onClick={() => onPick(entry.name)}>
            담기
          </button>
        )}
        dropNote={
          <>
            <strong>목록은 함께 쓰는 것이다</strong> — 지우면 다른 파티에서도 사라진다. 이미 이룬
            것으로 적어 둔 것은 그대로 남는다.
          </>
        }
        onAdd={(name) => {
          setError(null)
          /* 값이 없으므로 곧바로 들어간다 — 물어볼 것이 없다. */
          void define(name, userId ?? '').catch((cause: unknown) => {
            console.error('[achievement]', cause)
            setError('적지 못했다. 같은 이름이 이미 있는지 보라.')
          })
        }}
        onDrop={(entry) => void drop(entry.id)}
        onClose={onClose}
      />

      {error !== null && (
        <p className="shop__error" role="alert">
          {error}
        </p>
      )}
    </>
  )
}
