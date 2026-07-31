import './FireEffect.css'

/** 불꽃 혀의 개수. 늘릴수록 풍성하지만 폰에서 비싸진다. */
const FLAMES = 6
/** 튀어오르는 불티. */
const SPARKS = 5

/**
 * 불 원소가 타오를 때의 효과.
 *
 * **CSS 트랜스폼과 불투명도만 쓴다.** `feTurbulence` 같은 SVG 필터는 매 프레임
 * CPU에서 다시 계산돼 폰에서 감당하기 어렵다. 여기 쓰는 속성은 전부 합성 단계에서
 * 처리되므로 여러 개가 동시에 타올라도 버틴다.
 *
 * 세 겹으로 쌓는다.
 * 1. 그을음 — 아이콘 둘레가 타들어간 자국. 느리게 돌며 일렁인다.
 * 2. 잉걸 — 바닥에서 올라오는 열기.
 * 3. 불꽃과 불티 — 저마다 다른 주기로 솟아오른다. 주기를 어긋나게 두어야
 *    기계적으로 깜빡이지 않고 살아 있는 것처럼 보인다.
 */
export function FireEffect() {
  return (
    <span className="fire" aria-hidden="true">
      <span className="fire__scorch" />
      <span className="fire__ember" />
      {Array.from({ length: FLAMES }, (_, i) => (
        <span key={`f${i}`} className={`fire__flame fire__flame--${i + 1}`} />
      ))}
      {Array.from({ length: SPARKS }, (_, i) => (
        <span key={`s${i}`} className={`fire__spark fire__spark--${i + 1}`} />
      ))}
    </span>
  )
}
