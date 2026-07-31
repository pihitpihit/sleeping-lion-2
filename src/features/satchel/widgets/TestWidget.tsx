import './TestWidget.css'

/**
 * 배치 실험 전용 위젯.
 *
 * **아무 기능이 없다.** 좌표도 표시하지 않는다 — 배치 확인은 화면을 눈으로 보고,
 * 정확한 값이 필요하면 격자·레이아웃의 순수 함수 테스트로 확인한다.
 *
 * 실제 도구들과 구분되도록 의도적으로 밋밋하게 둔다.
 *
 * 정의(크기 제한 등)는 `registry.ts`에 있다. 한 파일에서 컴포넌트와 값을 함께
 * 내보내면 개발 중 빠른 새로고침이 깨진다.
 */
export function TestWidget() {
  return <div className="test-widget" />
}
