/**
 * 문구 보관소.
 *
 * SPEC 9장은 한국어 우선으로 하되 다국어 여지를 남기라고 한다. 정식 i18n
 * (react-i18next 등)을 붙이기 전까지 번역본이 있는 문구를 여기 모아둔다.
 *
 * 화면은 지금 `ko`만 읽는다. `en`은 당장 쓰이지 않지만, 나중에 쓸 때 다시
 * 짜내지 않도록 함께 적어둔다.
 *
 * 모든 문구를 여기로 옮기지는 않는다 — 번역본이 실제로 있는 것만 둔다.
 * 한국어밖에 없는 문구까지 끌어오면 키만 늘고 읽기 어려워진다.
 */

export const messages = {
  /** 바닥글 첫 줄. 이 앱이 무엇인가를 한 줄로 말한다. */
  siteTagline: {
    ko: '동방 대륙 여행 필수품',
    en: 'Your essential companion for travels across the Eastern Continent',
  },
} as const

/** 현재 화면 언어. 정식 i18n을 붙이면 이 상수는 사라진다. */
export const LOCALE = 'ko' as const
