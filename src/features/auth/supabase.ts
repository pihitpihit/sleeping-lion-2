import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * Supabase 클라이언트.
 *
 * **`live` 빌드에서만 만든다.** `mock`·`demo`는 이 파일을 부르지 않으므로 주소도
 * 키도 그 번들에 실리지 않는다 — 시험판이 진짜 데이터에 닿지 못하게 하는 것이
 * 빌드를 가르는 이유다(SPEC 3.1).
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ **여기 실리는 키는 공개해도 되는 것뿐이다.**                              │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * `publishable` 키(옛 이름 `anon`)는 Supabase 문서가 "웹페이지·앱·소스코드에
 * 노출해도 안전"하다고 못박은 값이다. 보호는 키를 감추는 것이 아니라 **RLS
 * 정책**이 한다. 그래서 SPEC 3.1의 "공개 번들에 서버 주소가 들어가지 않는다"는
 * 조항을 걷어냈다.
 *
 * **`secret` 키(옛 `service_role`)는 절대 넣지 않는다.** 그것은 RLS를 우회한다.
 * 클라이언트·레포·CI 로그 어디에도 두지 않는다.
 */

const URL = import.meta.env.VITE_SUPABASE_URL ?? ''
const KEY = import.meta.env.VITE_SUPABASE_KEY ?? ''

/** 설정이 갖춰졌는가. 없으면 어댑터가 "아직 안 붙었다"고 말한다. */
export function isSupabaseConfigured(): boolean {
  return URL !== '' && KEY !== ''
}

let client: SupabaseClient | null = null

/**
 * 하나만 만들어 돌려 쓴다.
 *
 * 여럿 만들면 각자 세션을 들고 `localStorage`를 두고 다투며, 실시간 구독도 따로
 * 붙어 연결 수만 는다.
 */
export function supabase(): SupabaseClient {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase 설정이 없다. VITE_SUPABASE_URL과 VITE_SUPABASE_KEY를 확인하라.')
  }
  client ??= createClient(URL, KEY, {
    auth: {
      /**
       * 세션을 `localStorage`에 남기고 스스로 갱신하게 둔다.
       *
       * **절대 원칙 3이 요구하는 바다**(SPEC 6.1). 첫 로그인만 네트워크를 쓰고
       * 이후에는 저장된 것으로 열려야 한다 — 지하에서 세 시간씩 하는 게임이다.
       */
      persistSession: true,
      autoRefreshToken: true,
      /**
       * URL에 섞여 오는 인증 정보를 자동으로 줍지 않는다.
       *
       * 우리는 해시 라우팅을 쓴다(`#/login`). 자동 감지를 켜두면 라이브러리가
       * 해시를 제 것으로 알고 건드려 라우트가 흐트러진다. 지금 흐름(이메일 +
       * 비밀번호)은 URL로 무엇도 받지 않으므로 켤 이유가 없다.
       */
      detectSessionInUrl: false,
      /** 코드 교환 방식. 토큰이 해시가 아니라 질의 문자열로 온다(SPEC 3.1). */
      flowType: 'pkce',
    },
  })
  return client
}
