import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// 배포 대상에 따라 base 경로가 달라진다.
//  - GitHub Pages 프로젝트 사이트: '/sleeping-lion-2/'  (워크플로에서 VITE_BASE로 주입)
//  - 자가호스팅(라즈베리파이) 루트, 로컬 dev: '/'
// 배포 대상이 확정되면 이 분기를 고정값으로 바꿔도 된다.
export default defineConfig({
  base: process.env.VITE_BASE ?? '/',
  plugins: [react()],
})
