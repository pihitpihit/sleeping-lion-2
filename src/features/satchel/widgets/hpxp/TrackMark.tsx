import { TRACK_LABEL, type HpXpTrack } from './hpxp'
import './TrackMark.css'

/**
 * 생명·경험 표식 하나 — **글자 대신 그림으로.**
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ **판 위에서 보는 그림과 같아야 같은 것으로 읽힌다.**                      │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * 다이얼이 쓰는 바로 그 파일이다(`hp-drop-lit`·`xp-star-lit`, 두께감까지 구워
 * 담은 그림). 설정 화면과 기록에서 「생명」·「경험」이라 글자로 적혀 있었는데,
 * 같은 값이 화면마다 다르게 서면 같은 것인 줄 모른다(구현 결정 319·334와 같은 결).
 *
 * **수를 얹을 수 있다.** 물방울은 위가 뾰족하고 아래가 불룩해 한가운데에 두면
 * 아래로 쏠려 보인다 — 표식을 올리고 수를 내려 둥근 자리에 앉힌다. 값은 다이얼이
 * 쓰는 것과 같다(물방울 −7%/+16%, 별 0%/+10%, 구현 결정 325).
 *
 * 그림은 Creator Pack 에셋이라 `.tsx`에 인라인 SVG로 박지 않는다(절대 원칙 1-1) —
 * 파일은 `public/`에 두고 마스크로 오려 색만 여기서 정한다.
 */

const MARK_FILE: Record<HpXpTrack, string> = { hp: 'hp-drop-lit', xp: 'xp-star-lit' }

export function TrackMark({
  track,
  value = null,
  size = 34,
}: {
  track: HpXpTrack
  /** 표식 안에 얹을 수. 없으면 그림만 선다. */
  value?: number | null
  /** 한 변(px). 수는 그림 크기를 따라 함께 큰다. */
  size?: number
}) {
  return (
    <span
      className={`tmark tmark--${track}`}
      role="img"
      aria-label={value === null ? TRACK_LABEL[track] : `${TRACK_LABEL[track]} ${value}`}
      style={
        {
          '--tmark-size': `${size}px`,
          '--tmark-src': `url(${import.meta.env.BASE_URL}assets/creator-pack/general/${MARK_FILE[track]}.webp)`,
        } as React.CSSProperties
      }
    >
      <span className="tmark__art" aria-hidden="true" />
      {value !== null && (
        <b className="tmark__n sl-numeral" aria-hidden="true">
          {value}
        </b>
      )}
    </span>
  )
}
