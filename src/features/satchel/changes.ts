import type { RealtimeChannel } from '@supabase/supabase-js'
import { isSupabaseConfigured, supabase } from '../auth/supabase'

/**
 * 서버가 직접 밀어주는 표 변경 — Postgres Changes.
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ **밀기 전에 서버가 RLS로 자격을 본다. 볼 수 없는 행은 오지 않는다.**      │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * Broadcast 채널은 잠글 수 없어서(`realtime.messages`가 우리 권한 밖이다) 값을
 * 실어 보낼 수 없었다. 그래서 "바뀌었다"는 신호만 보내고 받는 쪽이 표를 다시
 * 읽었다 — 왕복이 한 번 더 들었다.
 *
 * 이쪽은 **값이 함께 온다.** 그리고 그 길을 우리가 지킬 수 있다 — 표의 RLS가
 * 그대로 적용되므로 자격 없는 쪽에는 애초에 가지 않는다.
 *
 * **모든 실패를 삼킨다.** 붙지 못해도 도구는 돌아야 한다(절대 원칙 3). 그때는
 * 화면을 열 때 표에서 한 번 읽는 것으로 맞춰진다 — 옆 기기가 실시간으로 따라오지
 * 않을 뿐이다.
 */

export interface Subscription {
  close: () => void
}

/**
 * 한 행이 바뀔 때마다 부른다.
 *
 * `filter`는 `열이름=eq.값` 꼴이다. 없으면 그 표의 **내가 볼 수 있는 모든 행**이
 * 온다 — RLS가 이미 걸러 주지만, 걸어 두면 서버가 덜 보낸다.
 *
 * 지우기는 알리지 않는다. 판이 사라지는 것은 전투를 접을 때뿐이고, 그것은 화면
 * 쪽이 이미 알고 있다.
 */
export function watchRow<T>(
  channelName: string,
  table: string,
  filter: string | undefined,
  pick: (row: Record<string, unknown>) => T,
  onChange: (value: T) => void,
): Subscription {
  if (!isSupabaseConfigured()) return { close: () => {} }

  let channel: RealtimeChannel | null = null
  try {
    channel = supabase()
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table, ...(filter ? { filter } : {}) },
        (message) => {
          const row = (message as { new?: Record<string, unknown> }).new
          // 지우기에는 `new`가 비어 있다. 그때는 알릴 것이 없다.
          if (!row || Object.keys(row).length === 0) return
          onChange(pick(row))
        },
      )
      .subscribe()
  } catch {
    channel = null
  }

  return {
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

/**
 * 내가 쓴 것이 나에게 돌아오는 것을 가려낸다.
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ **Broadcast와 달리 `self: false` 같은 것이 없다.**                        │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * 서버는 행이 바뀌었다는 사실만 알지 누가 바꿨는지로 가르지 않는다. 그래서 내가
 * 방금 쓴 것도 되돌아온다. 그대로 앉히면 **쓰고 나서 돌아오기까지 사이에 내가
 * 또 만진 것이 옛 값으로 덮인다** — 원소를 연달아 두 번 켜면 두 번째가 도로
 * 꺼지는 꼴이다.
 *
 * 값에 찍힌 시각으로 가른다. 내가 올린 것의 시각을 적어 두었다가 같은 것이
 * 돌아오면 버린다. **같은 기기가 찍은 값끼리만 견주므로 시계가 어긋날 여지가
 * 없다** — 남이 보낸 것은 시각이 다르니 그대로 통과한다.
 */
export class EchoGuard {
  private mine = new Set<number>()

  /** 올리기 직전에 적어 둔다. */
  remember(stamp: number): void {
    this.mine.add(stamp)
    // 오래 쌓이지 않게 둔다. 돌아오는 데 걸리는 시간이 초 단위를 넘지 않는다.
    if (this.mine.size > 8) {
      const oldest = Math.min(...this.mine)
      this.mine.delete(oldest)
    }
  }

  /** 내가 올린 그것인가. 맞으면 버려야 한다. */
  isEcho(stamp: number): boolean {
    if (!this.mine.has(stamp)) return false
    this.mine.delete(stamp)
    return true
  }
}
