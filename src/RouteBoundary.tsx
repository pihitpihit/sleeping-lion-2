import { Component, type ErrorInfo, type ReactNode } from 'react'
import { looksStale, readLastReload, shouldReload, writeLastReload } from './staleChunk'

/**
 * 화면 하나가 터졌을 때 **앱 전체가 사라지지 않게** 받아 낸다.
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ **어두운 빈 화면은 고장이 아니라 고장을 숨긴 것이다.**                    │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * 형님이 「파티 생성을 누르면 그냥 어두운 화면만 나온다」고 짚었다. 화면은 전부
 * `lazy`로 갈라 두었는데(`routes.ts`) **조각을 못 불러오면 그 예외가 위로 올라와
 * React가 트리를 통째로 걷어낸다.** 남는 것은 바탕색뿐이라 무엇이 잘못됐는지
 * 화면에 한 글자도 안 남는다.
 *
 * 조각을 못 불러오는 까닭은 대개 **낡은 껍데기**다. 조각 이름에는 내용 해시가
 * 붙어 배포할 때마다 바뀌는데, 홈화면 아이콘으로 앱을 켜 둔 채 배포가 몇 번
 * 나가면 손에 든 `index.html`은 이미 없어진 이름을 부른다. 그 화면을 그때 처음
 * 열면 그 순간 404가 난다 — **이미 불러온 화면은 멀쩡한 채로 그 화면만** 그렇다.
 *
 * 그래서 두 가지를 한다: ① 낡은 것으로 보이면 **한 번만** 새로 불러온다(껍데기가
 * 새것이 되면 그대로 풀린다) ② 그래도 안 되면 무슨 일인지 화면에 적는다.
 *
 * 오류 경계는 클래스여야 한다 — React가 함수 컴포넌트에는 이 갈고리를 주지
 * 않는다. 「함수형 컴포넌트만」(CLAUDE.md 코딩 규약)에서 여기만 벗어난다.
 */

interface Props {
  /** 지금 라우트. 이 값이 바뀌면 받아 둔 오류를 놓아준다 — 다른 화면이다. */
  readonly route: string
  readonly children: ReactNode
}

interface State {
  readonly error: unknown
}

export class RouteBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: unknown): State {
    return { error }
  }

  componentDidCatch(error: unknown, info: ErrorInfo): void {
    console.error('[route]', error, info.componentStack)
    const now = Date.now()
    if (shouldReload(error, readLastReload(), now)) {
      writeLastReload(now)
      window.location.reload()
    }
  }

  componentDidUpdate(prev: Props): void {
    // 다른 화면으로 옮겼으면 앞의 오류는 이 화면의 것이 아니다.
    if (prev.route !== this.props.route && this.state.error !== null) {
      this.setState({ error: null })
    }
  }

  render(): ReactNode {
    const { error } = this.state
    if (error === null) return this.props.children

    const stale = looksStale(error)
    return (
      <div className="crash">
        <div className="crash__box" role="alert">
          <h1 className="crash__title">화면을 불러오지 못했다</h1>
          <p className="crash__body">
            {stale
              ? '앱이 새로 배포되어 손에 든 것이 낡았다. 다시 불러오면 풀린다.'
              : '이 화면을 그리다 무언가 잘못됐다. 다시 불러오거나 다른 곳으로 가 보라.'}
          </p>
          <p className="crash__why">
            {error instanceof Error ? `${error.name}: ${error.message}` : String(error)}
          </p>
          <div className="crash__acts">
            <button
              type="button"
              className="crash__go"
              onClick={() => {
                window.location.reload()
              }}
            >
              다시 불러오기
            </button>
            <a className="crash__home" href="#/">
              여관으로
            </a>
          </div>
        </div>
      </div>
    )
  }
}
