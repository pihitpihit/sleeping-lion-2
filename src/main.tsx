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
keepRuntime()

const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('#root 엘리먼트를 찾을 수 없습니다.')

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
