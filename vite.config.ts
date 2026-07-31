import { readFileSync } from 'node:fs'
import type { Plugin } from 'vite'
// vite가 아니라 vitest/config에서 가져온다 — vite의 defineConfig에는 test 필드가 없다.
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
// tsconfig.node.json이 nodenext 해석이라 확장자를 명시해야 한다
// (allowImportingTsExtensions가 켜져 있어 .ts로 적을 수 있다).
import { extractPublicSections } from './src/features/notice/publicSections.ts'

/**
 * NOTICE.md를 `?raw`로 가져올 때 공개 구간만 남겨서 넘긴다.
 *
 * 런타임에 걸러도 화면에는 안 보이지만, 걸러낸 원문이 JS 번들에 그대로 실려
 * 배포된다. 저장소 전용으로 적어둔 내용이 소스 보기로 읽히면 구분한 의미가 없다.
 * 그래서 번들에 들어가기 전에 잘라낸다.
 */
function noticePublicSectionsOnly(): Plugin {
  return {
    name: 'sl2:notice-public-sections-only',
    // Vite 내장 asset 플러그인이 ?raw를 처리하기 전에 가로챈다.
    enforce: 'pre',
    load(id) {
      if (!/NOTICE\.md\?raw$/.test(id)) return null
      const filePath = id.replace(/\?raw$/, '')
      const source = readFileSync(filePath, 'utf-8')
      // 문서를 고치면 다시 읽히도록 의존성을 등록한다.
      this.addWatchFile(filePath)
      return `export default ${JSON.stringify(extractPublicSections(source))}`
    },
  }
}

// 배포 대상에 따라 base 경로가 달라진다.
//  - GitHub Pages 프로젝트 사이트: '/sleeping-lion-2/'  (워크플로에서 VITE_BASE로 주입)
//  - 자가호스팅(라즈베리파이) 루트, 로컬 dev: '/'
// 배포 대상이 확정되면 이 분기를 고정값으로 바꿔도 된다.
export default defineConfig({
  base: process.env.VITE_BASE ?? '/',
  plugins: [react(), noticePublicSectionsOnly()],
  test: {
    // 검증 대상은 순수 함수(격자 계산, 배치 판정)이므로 DOM이 필요 없다.
    // 컴포넌트는 헤드리스 브라우저로 실물을 확인하는 편이 낫다.
    // jsdom이 필요해지면 그때 붙인다.
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
