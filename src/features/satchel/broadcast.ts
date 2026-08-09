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
 * **`private: true`로 붙는다.** Broadcast는 기본이 공개 채널이라 이름만 알면
 * 누구나 듣고 보낼 수 있었다. 이름에 계정 id가 들어가는데 파티원은 서로의
 * `profiles.id`를 읽을 수 있으므로 **파티원끼리 서로의 행낭을 엿들을 수 있었다.**
 * 표에는 진작 RLS가 걸려 있었으니, 같은 값이 다니는 두 길 중 한쪽만 잠근 꼴이었다.
 * 이제 `realtime.messages` 정책이 자격을 본다(`0010_private_channels.sql`).
 *
 * **모든 실패를 삼킨다.** 통로가 끊겼다고 도구가 멎으면 안 된다(절대 원칙 3).
 * 남아야 하는 값은 표가 따로 들고 있으므로 다음에 만질 때 다시 맞춰진다.
 */

export interface Wire {
  /**
   * 이 종류의 소식을 받으면 부른다. 나중에 덮어쓸 수 있다.
   *
   * **통로를 열 때 종류를 미리 다 말해 두어야 한다.** Supabase는 붙기 전에
   * 걸어둔 것만 듣는다 — 붙은 뒤에 더할 수 없다. 그래서 여기서는 손잡이만
   * 갈아 끼우고, 실제 구독은 열 때 한 번에 건다.
   */
  on: (event: string, handler: (raw: unknown) => void) => void
  send: (event: string, payload: unknown) => void
  close: () => void
}

const CLOSED: Wire = { on: () => {}, send: () => {}, close: () => {} }

/**
 * 통로를 연다.
 *
 * `self: false`로 둔다 — 내가 보낸 것이 나에게 돌아오면 방금 앉힌 값을 다시
 * 앉히느라 화면이 한 번 튄다.
 *
 * **붙기 전에 보낸 것은 버려진다.** 자격을 확인하는 왕복이 먼저라 곧바로는 못
 * 보낸다. 값이 남아야 하는 자리는 표가 뒤따라 받으므로 잃지 않는다.
 */
export function openWire(name: string, events: readonly string[]): Wire {
  if (!isSupabaseConfigured()) return CLOSED

  const handlers = new Map<string, (raw: unknown) => void>()
  let channel: RealtimeChannel | null = null
  let closed = false

  try {
    let builder = supabase().channel(name, {
      config: { broadcast: { self: false }, private: true },
    })
    for (const event of events) {
      builder = builder.on('broadcast', { event }, (message) => {
        handlers.get(event)?.((message as { payload?: unknown }).payload)
      })
    }
    channel = builder

    /**
     * **소켓에 내 신분을 먼저 실어야 한다.** 잠긴 통로는 정책이 `auth.uid()`를
     * 보는데, 그 값은 소켓에 붙은 토큰에서 나온다. 이것을 건너뛰면 정책이
     * 익명으로 보고 전부 막는다.
     */
    void supabase()
      .realtime.setAuth()
      .catch(() => {})
      .then(() => {
        if (!closed) channel?.subscribe()
      })
  } catch {
    channel = null
  }

  return {
    on: (event, handler) => handlers.set(event, handler),
    send: (event, payload) => {
      if (!channel) return
      try {
        void channel.send({ type: 'broadcast', event, payload })
      } catch {
        // 끊겼다. 표에 얹는 쪽이 뒤따르므로 값은 이어진다.
      }
    },
    close: () => {
      closed = true
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
