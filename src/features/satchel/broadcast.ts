import type { RealtimeChannel } from '@supabase/supabase-js'
import { isSupabaseConfigured, supabase } from '../auth/supabase'

/**
 * 기기끼리 값을 즉시 나르는 통로.
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ **여기 오가는 것은 저장되지 않는다.**                                     │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * Supabase의 Broadcast다. 지나가는 것은 지나가는 대로 두는 것이 SPEC 5.4의
 * "전투가 끝나면 어느 기기에도 남지 않는다"를 절충 없이 지킨다. 남아야 하는 것은
 * 표에 따로 얹는다.
 *
 * 두 곳이 쓴다 — **판**(원소·라운드·HP/XP·덱)과 **행낭 구성**(위젯 배치·설정).
 * 나르는 것만 다르고 방식이 같으므로 여기 한 곳에 둔다.
 *
 * **모든 실패를 삼킨다.** 통로가 끊겼다고 도구가 멎으면 안 된다(절대 원칙 3).
 * 남아야 하는 값은 표가 따로 들고 있으므로 다음에 만질 때 다시 맞춰진다.
 */

export interface Broadcast<T> {
  send: (payload: T) => void
  close: () => void
}

/**
 * 통로를 연다.
 *
 * `self: false`로 둔다 — 내가 보낸 것이 나에게 돌아오면 방금 앉힌 값을 다시
 * 앉히느라 화면이 한 번 튄다.
 *
 * **받은 것도 거른다.** 다른 판을 쓰는 기기가 섞여 있을 수 있고, 통로에 실려
 * 오는 것은 남이 보낸 글자일 뿐이다.
 */
export function openBroadcast<T>(
  channelName: string,
  event: string,
  sanitize: (raw: unknown) => T,
  onMessage: (payload: T) => void,
  onPresenceChange?: () => void,
): Broadcast<T> {
  let channel: RealtimeChannel | null = null

  if (isSupabaseConfigured()) {
    try {
      let builder = supabase()
        .channel(channelName, { config: { broadcast: { self: false } } })
        .on('broadcast', { event }, (message) => {
          onMessage(sanitize((message as { payload?: unknown }).payload))
        })
      if (onPresenceChange) {
        builder = builder.on('presence', { event: 'sync' }, () => onPresenceChange())
      }
      channel = builder.subscribe()
    } catch {
      channel = null
    }
  }

  return {
    send: (payload) => {
      if (!channel) return
      try {
        void channel.send({ type: 'broadcast', event, payload })
      } catch {
        // 끊겼다. 표에 얹는 쪽이 뒤따르므로 값은 이어진다.
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
