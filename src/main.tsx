import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import { keepRuntime } from './features/satchel/runtime/keep'
import './index.css'

/**
 * 판을 새로고침 너머로 잇는 그물을 먼저 친다.
 *
 * **화면이 아니라 여기서 친다.** 행낭을 나갔다 들어오는 사이에 그물이 없으면
 * 그 틈에 새로고침된 판을 잃는다. 앱이 사는 동안 계속 붙어 있어야 한다.
 *
 * 그리기 전에 부르는 것도 뜻이 있다 — 저장된 판을 먼저 앉혀야 첫 렌더가 이미
 * 맞은 값을 그린다. 뒤에 두면 라운드가 1로 한 번 떴다가 제 값으로 튄다.
 */
/*
  **떴다는 표를 남긴다.** 껍데기의 그물이 이것을 본다 — 몇 초가 지나도 표가
  없으면 낡은 `index.html`이 없어진 조각을 부른 것이므로 한 번 새로 부른다.
*/
;(window as unknown as { __sl2Booted?: boolean }).__sl2Booted = true

/*
  **그물을 치다 넘어져도 앱은 떠야 한다.** 여기서 던지면 `render()`가 아예 안
  불려 **까만 화면**이 된다 — 저장된 판 하나 때문에 앱 전체가 안 열리는 것은
  바꿀 수 없는 손해다. 판을 잃는 것이 앱을 잃는 것보다 낫다.
*/
try {
  keepRuntime()
} catch (cause) {
  console.error('[runtime]', cause)
}

const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('#root 엘리먼트를 찾을 수 없습니다.')

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
