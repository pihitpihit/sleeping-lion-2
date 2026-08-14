# Gloomhaven Creator Pack 유래 에셋 — 출처 표시

이 디렉토리의 파일은 **CC BY-NC-SA 4.0**이며, 저장소 나머지의 MIT 라이선스가
적용되지 않는다.

- **저작권:** Isaac Childres / Cephalofair Games
- **라이선스:** https://creativecommons.org/licenses/by-nc-sa/4.0/
- **원본 출처:** https://boardgamegeek.com/thread/1733586/files-for-creation
- **면책:** 원 저작물은 보증 없이(as-is) 제공된다. CC BY-NC-SA 4.0의 면책 조항을
  따른다.

---

## 이 디렉토리의 규칙

1. **여기 있는 것만 Creator Pack 유래다.** 다른 곳에 흩어 놓지 않는다. 특히
   `.tsx`에 인라인 SVG로 박아 넣지 않는다 — 그 소스 파일이 개작물로 취급될 소지가
   있어 MIT 코드와의 경계가 무너진다.
2. **필요한 것만 넣는다.** 팩 전체(약 200MB)를 통째로 커밋하지 않는다.
3. **서체 파일은 절대 넣지 않는다.** 팩에 Nyala나 High Tower Text가 섞여 있어도
   그것은 저작자가 라이선스할 수 있는 대상이 아니다. 자세한 사유는 루트
   [`NOTICE.md`](../../../NOTICE.md).
4. **카드 원문·시나리오 서사·몬스터 스탯 텍스트는 넣지 않는다.** 라이선스와 별개로
   SPEC 3장의 자체 원칙이다. 우리가 가져오는 것은 아이콘·문양 같은 **그림**뿐이다.
5. **파일을 추가하거나 고치면 아래 표를 반드시 갱신한다.** 변경 사실 표시는
   BY-NC-SA의 의무이지 선택이 아니다.

---

## 파일 목록 ① — 벡터 아이콘

원본은 **Creator Pack V2**의 `Icon Pack/` 아래 두 파일이다. 둘 다 쪽마다 아이콘
하나가 들어 있는 벡터 PDF다.

| 파일 | 원본 | 용도 | 변경 여부 | 변경 내용 |
|---|---|---|---|---|
| `elements/fire.svg` | `Icon Pack/Element Icons.pdf` 3쪽 | 원소 트래커 | 변경함 | PDF 쪽 → SVG 추출 |
| `elements/ice.svg` | 같은 파일 2쪽 | 원소 트래커 | 변경함 | 〃 |
| `elements/air.svg` | 같은 파일 1쪽 | 원소 트래커 | 변경함 | 〃 |
| `elements/earth.svg` | 같은 파일 4쪽 | 원소 트래커 | 변경함 | 〃 |
| `elements/light.svg` | 같은 파일 5쪽 | 원소 트래커 | 변경함 | 〃 |
| `elements/dark.svg` | 같은 파일 6쪽 | 원소 트래커 | 변경함 | 〃 |
| `general/hp-drop.svg` | `Icon Pack/General Icons.pdf` 8쪽 | HP/XP 트래커의 체력 표식 | 변경함 | PDF 쪽 → SVG 추출 |
| `general/xp-star.svg` | 같은 파일 17쪽 | HP/XP 트래커의 경험 표식 | 변경함 | 〃 |
| `general/shuffle.svg` | 같은 파일 **21쪽** | 공격 보정 덱의 섞기 표식 | 변경함 | 〃 |
| `general/check.svg` | 같은 파일 **23쪽** | 캐릭터 시트의 전투 목표 체크표 | 변경함 | 〃 |
| `general/xp-star-lit.webp` | `general/xp-star.svg`(같은 파일 17쪽)에서 파생 | 캐릭터 시트·HP/XP 트래커의 경험 표식 | **크게 변경함** | 검정 실루엣에 **두께감을 입혀 구웠다** — 가장자리를 비스듬히 깎고 위에서 빛을 주었으며 색은 HP/XP 트래커가 쓰던 푸른 그라디언트를 따랐다. 굽는 스크립트는 `tools/bake_marks.py` |
| `general/level-crown.svg` | `Character Ability Cards/Ability Cards - Front.jpg`의 위쪽 한가운데 | 캐릭터 레벨 표식 | **크게 변경함** | **아이콘 묶음에는 없어 카드 앞면에서 그 자리만 오려냈다**(x 187~223, y 65~87, 37×23px). 그 크기로는 조금만 키워도 흐려지므로 **윤곽을 따서 벡터로 다시 떴다** — 화소 경계를 걸어 닫힌 고리를 얻고, 확대·JPEG에서 생긴 물결은 굵은 자로 펴고, 좌우를 맞췄다. 눈으로 베끼지 않았으므로 비율은 원본 그대로다. 뽑는 스크립트는 `tools/extract_crown.py`(오려내기)와 `tools/trace_crown.py`(벡터) |
| `general/hp-drop-lit.webp` | `general/hp-drop.svg`(같은 파일 8쪽)에서 파생 | HP/XP 트래커의 체력 표식 | **크게 변경함** | 〃 (붉은 쪽) |
| `classes/class-01.svg` ~ `class-21.svg` | `Icon Pack/Class Icons and Augments.pdf` 1~21쪽 (쪽 번호 = 파일 번호) | 캐릭터 시트의 클래스 표식 | 변경함 | PDF 쪽 → SVG 추출 |

**클래스 아이콘에 대하여.** 21쪽 전부를 가져왔다. 1~17쪽이 글룸헤이븐 클래스이고,
18~21쪽은 **그중 넷을 색 있는 원반에 담은 것**이다(1·4·6·13쪽과 같은 그림).

**아이콘에는 이름이 붙어 있지 않고 우리도 붙이지 않는다** — 사람이 그림을 보고
고른다. 클래스 이름은 게임 콘텐츠이며 잠긴 클래스는 이름 자체가 스포일러이므로
레포에 담지 않는다(SPEC 3장). 이름·핸드 사이즈·레벨별 체력은 앱 안의 관리자
화면에서 넣어 DB에만 둔다(`0011`·`0012`).

> **2026-08-11 정정.** 한때 "18~21쪽이 사자의 턱 클래스"라고 적었는데 **틀렸다.**
> 실물 카드의 마크와 대조해 보니 사자의 턱 넷(폭탄·도끼·홀·갈고리)은 이 팩에
> 아예 없다. 그래서 아이콘 없이도 클래스를 담을 수 있게 구조를 넓혔다
> (`0012_classes_without_icons.sql`). **그림은 눈으로 대조하기 전에는 단정하지
> 않는다.**

**변경 내용 상세.** `pdftocairo -svg`로 해당 쪽을 SVG로 추출했다. 도형·색·비율은
원본 그대로이며 다시 그리거나 색을 바꾸지 않았다. 화면에서는 CSS `filter`로
흑백 처리하거나 밝게 물들이지만 **파일 자체는 원본 색을 유지한다.**

---

## 파일 목록 ② — 공격 보정 카드 그림

원본은 **Creator Pack V2**의 `Attack Modifiers/` 폴더다. **벡터가 아니라 래스터**
(JPG·PNG)이며, 팩에 벡터본이 없다.

| 파일 | 원본 | 용도 | 변경 여부 | 변경 내용 |
|---|---|---|---|---|
| `attack-modifiers/card-back.webp` | `Attack Modifiers/Attack Modifier - Back.jpg` | 카드 뒷면(더미) | 변경함 | 폭 400px로 축소, WebP 변환 |
| `attack-modifiers/card-face.webp` | `Attack Modifiers/Attack Modifier - Blank.jpg` | 카드 앞면 틀 | 변경함 | 〃 |
| `attack-modifiers/x0.webp` | `Attack Modifiers/No Damage.png` | ×0 값 메달 | 변경함 | 투명 여백 잘라내고 200×200으로, WebP 변환 |
| `attack-modifiers/m2.webp` | `Attack Modifiers/Minus 2.png` | −2 값 메달 | 변경함 | 〃 |
| `attack-modifiers/m1.webp` | `Attack Modifiers/Minus 1.png` | −1 값 메달 | 변경함 | 〃 |
| `attack-modifiers/p0.webp` | `Attack Modifiers/Neutral.png` | +0 값 메달 | 변경함 | 〃 |
| `attack-modifiers/p1.webp` | `Attack Modifiers/Plus 1.png` | +1 값 메달 | 변경함 | 〃 |
| `attack-modifiers/p2.webp` | `Attack Modifiers/Plus 2.png` | +2 값 메달 | 변경함 | 〃 |
| `attack-modifiers/x2.webp` | `Attack Modifiers/Double Damage.png` | ×2 값 메달 | 변경함 | 〃 |
| `attack-modifiers/p3.webp` | `Attack Modifiers/Plus 1.png` + `Plus 2.png` + `Minus 1.png` + `Minus 2.png` | 특혜로만 나오는 `+3` 값 메달 | **크게 변경함** | **팩에 `+3` 메달이 없다.** `Plus 1`의 원반에서 숫자와 그 그림자를 지우고(가려진 자리는 나머지 셋에서 색 변환해 채움) 그 위에 Pirata One으로 `+3`을 얹었다. 자리·크기·테·그림자·잉크 밝기는 팩 메달 넷을 화소 단위로 재서 맞췄다. 굽는 스크립트는 `tools/bake_medallion.py` |
| `attack-modifiers/p4.webp` | 같은 넷 | 같은 까닭의 `+4` 값 메달 | **크게 변경함** | 〃 |
| `attack-modifiers/socket.webp` | `Attack Modifiers/Attack Modifier - Blank.jpg` | 카드에 파인 둥근 홈 | 변경함 | **왼쪽 아래 홈만 44×44로 오려내고 원 바깥을 알파로 잘라냄.** 축소·자르기·형식 변환뿐이며 다시 그리지 않았다 |

**둥근 홈에 대하여.** 실물 카드는 **양쪽 아래에 홈이 있고** 왼쪽에는 덱 주인
(1·2·3·4·M 또는 클래스 표식)이, 오른쪽에는 섞기 표식이 앉는다. 그런데 팩의 빈
카드 그림에는 왼쪽 홈만 박혀 있다. 오른쪽에 섞기 표식만 얹으면 바탕 없이 떠
보이므로, **왼쪽 홈을 오려 알파로 잘라 어디에나 얹을 수 있게 했다.** 원본
그림에서 잘라낸 것이지 새로 그린 것이 아니다.

**변경 내용 상세.** 축소·자르기·형식 변환만 했다. 그림을 다시 그리거나 색을
바꾸거나 요소를 더하고 빼지 않았다. 원본은 카드가 437×296이고 메달은 그 안에
투명 배경으로 놓여 있었는데, 여백을 잘라 메달만 남겼다. 화면에서 앞면 틀 위에
메달을 얹어 실물 카드를 재현하며 **그 합성은 그릴 때만 일어난다** — 합쳐서 저장한
파일은 만들지 않았다(구현 결정 15).

파일 이름은 우리 코드의 카드 종류 id(`x0`·`m1`·`p1` 등)를 따랐다. 원본 이름과의
대응은 위 표가 정본이다.

**가져오지 않은 것.** `Double Damage - Bless.png`와 `No Damage - Curse.png`는
축복·저주 카드용이라 지금 쓰지 않는다. 퍽으로 넣는 +3·+4는 **팩에 그림이 없어**
화면에서 숫자로 그린다.

추출한 원본 색(글레어 효과에 쓴다):

| 원소 | 색 |
|---|---|
| 불 | `#E2421F` |
| 얼음 | `#56C8EF` |
| 바람 | `#98B0B5` |
| 풀 | `#7DA82A` |
| 빛 | `#ECA610` |
| 어둠 | `#202830` |

`general/`의 두 파일은 원본이 거의 검정(`#232020`)이다. 붉은·푸른 바탕에서
묻히므로 화면에서 CSS `filter: brightness(0) invert(1)`로 흰빛을 만들지만,
**파일 자체는 원본 색을 유지한다.**

**가져오지 않은 것.** `Element Icons.pdf`의 7쪽(소비 표시 ✗)과 8쪽(만능 원소),
그리고 `General Icons.pdf`의 나머지 23쪽은 넣지 않았다.

> **2026-08-12 — 상태이상은 `Status Effect Icons.pdf`에서 가져왔다.** 한동안
> `General Icons.pdf`에 있는 줄 알고 찾다가 못 넣고 있었는데, 팩에 **전용
> 파일이 따로 있었다.** 열네 쪽이 곧 카드에 붙는 배지이며 색까지 다 그려져 있다.

## 상태이상 배지 — 어느 쪽이 무엇인가

**그림만 보고 단정하지 않았다.** 쪽마다 그림을 뽑아 형님에게 하나씩 보여 주고
확인한 것이다(2026-08-12). 실물 카드 사진으로 대조된 것은 그렇게 적었다.

| 쪽 | 파일 | 뜻 | 어떻게 알았나 |
|---|---|---|---|
| 1 | `bless.svg` | 축복 | 형님 확인 |
| 2 | `curse.svg` | 저주 | 형님 확인 |
| 3 | `disarm.svg` | 무장해제 | 형님 확인 |
| 4 | `immobilize.svg` | 이동불가 | **실물 카드 080**과 일치 |
| 5 | `wound.svg` | 부상 | 색·문양 |
| 6 | `muddle.svg` | 혼란 | 특혜 시트의 `?` 표식 |
| 7 | `stun.svg` | 기절 | **실물 카드 016**의 가운데 문양과 일치 |
| 8 | `poison.svg` | 중독 | 색·문양 |
| 9 | `invisible.svg` | 투명 | 색·문양 |
| 10 | `strengthen.svg` | 강화 | 형님 확인 |
| 11 | `push.svg` | 밀기 | 형님 확인 |
| 12 | `pierce.svg` | 관통 | 형님 확인 |
| 13 | `target.svg` | 대상 추가 | 형님 확인 |
| 14 | `rolling.svg` | 굴림(한 장 더) | **실물 카드 016**의 오른쪽 배지와 일치 |

**당기기는 팩에 없다.** `push.svg`를 **화면에서 반 바퀴 돌려 쓴다** — 마름모가
대칭이라 틀은 그대로고 화살만 뒤집힌다. 파일을 새로 만들지 않았고 그리는 순간에만
거는 것이라 사본을 고쳐 담는 것과 다르다(구현 결정 15와 같은 선). 팩의 `Font/` 디렉토리는 저작자가 라이선스할 수 있는
대상이 아니므로 손대지 않았다(루트 [`NOTICE.md`](../../../NOTICE.md) 참조).

> **변경 여부**를 "변경함"으로 적었다면 **변경 내용**을 구체적으로 쓴다.
> "수정함" 같은 말로는 의무를 다한 것이 아니다.
