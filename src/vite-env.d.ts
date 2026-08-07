/// <reference types="vite/client" />

/**
 * 빌드 시점에 주입되는 값들.
 *
 * **여기 있는 것은 전부 번들에 실린다.** 감춰야 하는 값을 `VITE_` 접두사로 두면
 * 그대로 공개된다 — Supabase의 `secret` 키(옛 `service_role`)를 여기 넣지 않는
 * 이유다(SPEC 3.1).
 */
interface ImportMetaEnv {
  /** 배포 모드 — `demo` | `mock` | `live`. 모르는 값이면 `live`로 친다. */
  readonly VITE_AUTH_MODE?: string
  /** Supabase 프로젝트 주소. `live` 빌드에만 넣는다. */
  readonly VITE_SUPABASE_URL?: string
  /** Supabase `publishable` 키(옛 `anon`). **공개해도 되는 값이다.** */
  readonly VITE_SUPABASE_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
