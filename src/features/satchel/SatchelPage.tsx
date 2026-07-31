import { useBoardSize } from './useBoardSize'
import './SatchelPage.css'

/**
 * 행낭 — 위젯 보드.
 *
 * 지금은 셸뿐이다. 툴바 자리는 M5가, 격자는 M2가, 위젯은 M4가 채운다.
 *
 * 보드는 스크롤되지 않는다. 격자가 화면에 꽉 차고 위젯이 그 안에 들어가는 구조라
 * 넘칠 곳이 없어야 한다. 홈화면처럼 페이지를 넘기는 것은 현재 범위 밖이다.
 */
export function SatchelPage() {
  const { ref: boardRef, size } = useBoardSize<HTMLDivElement>()

  return (
    <div className="satchel">
      {/* 툴바 자리. M5에서 햄버거·모드 전환·위젯 목록이 들어온다. */}
      <header className="satchel__bar">
        <a className="satchel__back" href="#/">
          {/* 간격은 CSS gap으로 준다. JSX 문자열 끝의 공백은 다듬어져 사라진다. */}
          <span aria-hidden="true">←</span>
          <span>잠자는 사자 2호점</span>
        </a>
      </header>

      <div
        className="satchel__board"
        ref={boardRef}
        /* 관측값을 눈에 보이지 않게 노출한다. M2가 붙기 전까지 격자 계산의
           입력이 제대로 들어오는지 확인할 유일한 통로다. */
        data-board-width={Math.round(size.width)}
        data-board-height={Math.round(size.height)}
      >
        <p className="satchel__empty">행낭은 아직 비어 있다.</p>
      </div>
    </div>
  )
}
