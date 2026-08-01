/// <reference types="vite/client" />

/**
 * 빌드 시점 설정.
 *
 * 전부 **선택**이다 — 빠뜨렸을 때 타입이 막아주지 않는다는 뜻이므로, 읽는 쪽이
 * 없을 때를 감당해야 한다. `resolveAuthMode`가 그 일을 한다(모르면 `live`).
 */
interface ImportMetaEnv {
  /**
   * 배포 모드 — `demo` | `mock` | `live`.
   *
   * 없거나 모르는 값이면 **`live`로 친다.** 잠기는 쪽으로 틀리는 편이 낫다.
   * 자세한 것은 `src/features/auth/mode.ts`.
   */
  readonly VITE_AUTH_MODE?: string

  /**
   * 배포 경로. GitHub Pages는 하위 경로(`/sleeping-lion-2/`)에 올라간다.
   *
   * **로컬에서는 절대 쓰지 않는다.** 빌드와 미리보기의 값이 어긋나면 404 →
   * SPA 폴백 → HTML이 JS로 내려와 모듈이 조용히 막힌다. 화면이 하얘지고
   * 콘솔에는 아무것도 안 뜬다. 두 번 겪었다.
   */
  readonly VITE_BASE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
