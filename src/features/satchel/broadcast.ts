import type { RealtimeChannel } from '@supabase/supabase-js'
import { isSupabaseConfigured, supabase } from '../auth/supabase'

/**
 * 기기끼리 값을 즉시 나르는 통로.
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ **여기 오가는 것은 저장되지 않는다. 그리고 잠겨 있다.**                   │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * Supabase의 Broadcast다. 지나가는 것은 지나가는 대로 두는 것이 SPEC 5.4의
 * "전투가 끝나면 어느 기기에도 남지 않는다"를 절충 없이 지킨다. 남아야 하는 것은
 * 표에 따로 얹는다.
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ **여기로는 알맹이를 보내지 않는다. "바뀌었다"는 신호만 보낸다.**          │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * Broadcast는 기본이 공개 채널이고, 그것을 잠그려면 `realtime.messages`에 정책을
 * 걸어야 하는데 **그 표는 Supabase 소유라 SQL Editor의 어떤 역할로도 손이 닿지
 * 않는다**(`postgres`도 `supabase_privileged_role`도 거절당한다).
 *
 * 그래서 통로에 알맹이를 싣지 않기로 했다. 받는 쪽은 신호를 보고 **표에서 값을
 * 읽어 온다** — 표에는 우리가 건 RLS가 걸려 있으므로 자격 없는 쪽은 아무것도
 * 얻지 못한다. 통로를 엿들어 알 수 있는 것은 "언제 무엇인가 바뀌었다"는 사실뿐이다.
 *
 * 대가는 지연이다. 알맹이를 실어 보내면 곧장 뜨지만, 이제는 신호를 받고 한 번
 * 더 다녀와야 한다. **탭한 사람의 화면은 여전히 즉시 바뀐다** — 늦어지는 것은
 * 옆 사람 화면이고, 반 초 남짓이라 판에 지장이 없다.
 *
 * **모든 실패를 삼킨다.** 통로가 끊겼다고 도구가 멎으면 안 된다(절대 원칙 3).
 * 남아야 하는 값은 표가 따로 들고 있으므로 다음에 만질 때 다시 맞춰진다.
 */

export interface Wire {
  /**
   * 이 종류의 신호가 오면 부른다. 나중에 덮어쓸 수 있다.
   *
   * **통로를 열 때 종류를 미리 다 말해 두어야 한다.** Supabase는 붙기 전에
   * 걸어둔 것만 듣는다 — 붙은 뒤에 더할 수 없다. 그래서 여기서는 손잡이만
   * 갈아 끼우고, 실제 구독은 열 때 한 번에 건다.
   */
  on: (event: string, handler: () => void) => void
  /** "바뀌었다"고 알린다. **값은 싣지 않는다.** */
  ping: (event: string) => void
  close: () => void
}

const CLOSED: Wire = { on: () => {}, ping: () => {}, close: () => {} }

/**
 * 통로를 연다.
 *
 * `self: false`로 둔다 — 내가 보낸 신호가 나에게 돌아오면 방금 쓴 것을 괜히
 * 다시 읽으러 간다.
 */
export function openWire(name: string, events: readonly string[]): Wire {
  if (!isSupabaseConfigured()) return CLOSED

  const handlers = new Map<string, () => void>()
  let channel: RealtimeChannel | null = null

  try {
    let builder = supabase().channel(name, { config: { broadcast: { self: false } } })
    for (const event of events) {
      builder = builder.on('broadcast', { event }, () => handlers.get(event)?.())
    }
    channel = builder.subscribe()
  } catch {
    channel = null
  }

  return {
    on: (event, handler) => handlers.set(event, handler),
    ping: (event) => {
      if (!channel) return
      try {
        // 빈 몸으로 보낸다. 실을 것이 없다는 것이 이 설계의 요점이다.
        void channel.send({ type: 'broadcast', event, payload: {} })
      } catch {
        // 끊겼다. 다음에 상대가 화면을 열 때 표에서 읽어 맞춘다.
      }
    },
    close: () => {
      if (!channel) return
      try {
        void supabase().removeChannel(channel)
      } catch {
        // 이미 닫혔다.
      }
      channel = null
    },
  }
}
