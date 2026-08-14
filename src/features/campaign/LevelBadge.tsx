import './LevelBadge.css'

/** 레벨 왕관 — Creator Pack 능력 카드에서 자리를 재어 그린 것(`tools/draw_crown.py`). */
const CROWN_URL = `${import.meta.env.BASE_URL}assets/creator-pack/general/level-crown.svg`

/**
 * 레벨 표식 — **왕관 안에 수를 앉힌다.**
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ **숫자만 있으면 그것이 레벨인 줄 모른다.**                                │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * 목록의 줄 끝에 수가 하나 서 있으면 골드인지 경험인지 레벨인지 알 길이 없다.
 * 실물에서도 레벨은 왕관으로 적힌다.
 *
 * **그림은 덮개로 깐다.** Creator Pack 에셋이므로 `.tsx`에 인라인 SVG로 박지
 * 않는다(절대 원칙 1-1) — 파일은 `public/`에 두고 `mask`로 오려 색만 여기서
 * 정한다. HP/XP 트래커가 표식을 다루는 것과 같은 손질이다.
 *
 * 크기는 부모가 글자 크기로 정한다. 왕관도 수도 그것을 따라 함께 큰다 —
 * 두 값을 따로 주면 어느 한쪽만 고쳤을 때 수가 왕관 밖으로 나간다.
 */
export function LevelBadge({ level }: { level: number }) {
  return (
    <span className="levelbadge" role="img" aria-label={`레벨 ${level}`}>
      <span
        className="levelbadge__crown"
        aria-hidden="true"
        style={{ '--crown': `url(${CROWN_URL})` } as React.CSSProperties}
      />
      <span className="levelbadge__n sl-numeral" aria-hidden="true">
        {level}
      </span>
    </span>
  )
}
