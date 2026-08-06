# 출처와 라이선스 (NOTICE)

> **편집 규칙 — 두 용도가 한 파일에 있다.**
>
> `site:begin` / `site:end` 주석으로 감싼 구간만 사이트의
> [출처와 라이선스 페이지](https://pihitpihit.github.io/sleeping-lion-2/#/notice)에
> 렌더된다. 그 구간에는 **표기 의무가 있는 사실만** 둔다 — 누가 만들었고, 어떤
> 라이선스이며, 원본이 어디이고, 무엇을 바꿨는가.
>
> 우리가 지켜야 할 규칙, 판단 근거, 하지 말아야 할 것의 기록은 구간 **바깥**에
> 둔다. 방문자에게 필요한 정보가 아니다.
>
> 파일을 둘로 쪼개지 않는 이유는 단순하다 — 사본은 반드시 원본과 어긋난다.

---

<!-- site:begin -->

이 앱의 소스 코드는 **plastics** 저작이며 MIT 라이선스다([전문](./LICENSE)).
아래 자료는 각자의 라이선스를 따르며 MIT로 재배포되지 않는다.

## 글꼴

### Pirata One

- **저작권:** Copyright (c) 2012, Rodrigo Fuenzalida, Nicolas Massi
  (www.taip.com.ar / abc.taip.com.ar), with Reserved Font Name 'Pirata'
- **라이선스:** SIL Open Font License, Version 1.1 —
  [전문](./public/licenses/pirata-one-OFL.txt)
- **원본:** https://fonts.google.com/specimen/Pirata+One
- **변경사항:** 라틴 서브셋(woff2)만 포함한다. 글자꼴과 폰트 이름은 바꾸지 않았다.

## 아트 에셋

### Gloomhaven Creator Pack — *사용 중*

- **저작권:** Isaac Childres / Cephalofair Games
- **라이선스:** [Creative Commons BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/)
- **원본:** https://boardgamegeek.com/thread/1733586/files-for-creation
- **쓰는 것:**
  - 원소 아이콘 6종(불·얼음·바람·풀·빛·어둠), HP/XP 표식 2종(체력 방울·경험 별),
    섞기 표식 1종 — `Icon Pack/Element Icons.pdf`와 `Icon Pack/General Icons.pdf`
    에서 해당 쪽을 SVG로 추출.
  - 공격 보정 카드 그림 9종(뒷면·앞면 틀·값 메달 7종) — `Attack Modifiers/` 폴더.
- **변경사항:** 벡터 아이콘은 쪽 단위 추출 외에 도형·색·비율을 바꾸지 않았다.
  카드 그림은 축소·여백 잘라내기·WebP 변환만 했고 다시 그리거나 색을 바꾸지
  않았다. 화면에서 흑백으로 보이거나 앞면 틀 위에 메달이 얹히는 것은 **그릴 때만
  일어나며** 파일 자체는 원본 그대로다.
- **파일 단위 기록:** `public/assets/creator-pack/ATTRIBUTION.md`

**이 에셋을 개변한 결과물도 CC BY-NC-SA 4.0이다.** 그 밖의 화면 요소(사자 문장,
파비콘 등)는 직접 그린 것이라 이 조건과 무관하다.

## 상표

"Gloomhaven", "Jaws of the Lion", "Cephalofair"는 Cephalofair Games의 상표다.
이 앱은 어떤 게임에 쓰는 도구인지 밝히기 위해 이름을 언급할 뿐이며, 로고와
워드마크는 쓰지 않는다. Cephalofair Games가 만들었거나 후원한 앱이 아니다.

## 라이브러리

react, react-dom, scheduler, marked — 모두 MIT.

<!-- site:end -->

---

# 이하 저장소 전용

여기서부터는 사이트에 노출되지 않는다. 우리가 지킬 규칙과 판단 근거다.

## Creator Pack을 도입할 때 지켜야 할 것

| 조건 | 우리가 해야 할 것 |
|---|---|
| **BY** (저작자표시) | 저작자·저작권 표시, 라이선스 고지, 면책 고지, 원본 링크를 유지한다 |
| **NC** (비영리) | 이 앱으로 돈을 벌지 않는다. 광고·유료화·판매 금지 |
| **SA** (동일조건변경허락) | 에셋을 **개변하면 그 결과물도 BY-NC-SA 4.0**이 된다 |
| 변경 표시 | 무엇을 어떻게 바꿨는지 명시한다 |

파일 단위 기록은 `public/assets/creator-pack/ATTRIBUTION.md`에 남긴다.

### SA의 전염 범위

SA는 개변한 에셋에만 미치고 나란히 놓인 우리 코드까지 MIT에서 끌어내리지 않는다
(CC 용어로 collection과 adaptation의 차이). **단 그 경계를 지키려면 Creator Pack
유래 에셋을 반드시 별도 파일로 두어야 한다.** 아이콘을 `.tsx`에 인라인 SVG로
박아 넣으면 그 소스 파일 자체가 개작물로 취급될 소지가 있다.

### 저작자 사전 연락 (미결)

원 스레드에서 Isaac Childres는 CC BY-NC-SA 4.0을 선언하면서도, 앱 제작에 대해서는
"I'd prefer they still talk to me first"라고 했다. 법적으로는 CC 조건 준수로
충분하다고 보지만, 에셋을 실제로 도입하기 전에 한 번 연락해두는 편이 안전하다.
자세한 경위는 SPEC 13.1장.

## 쓸 수 없는 글꼴 (기록용)

Creator Pack 원 스레드는 게임에 쓰인 글꼴 셋을 알려준다. 그러나 **저작자가
라이선스한 것은 에셋이지 글꼴이 아니다** — 글꼴은 그의 소유가 아니다.

| 글꼴 | 판정 | 사유 |
|---|---|---|
| Pirata One | ✅ 사용 중 | SIL OFL 1.1 |
| **Nyala** | ❌ **금지** | Windows 번들 독점 글꼴. 재배포 불가 |
| **High Tower Text** | ❌ **금지** | Monotype 독점(MS Office 번들). 스레드의 다운로드 링크는 정식 배포처가 아니다 |

라틴 본문 세리프가 필요해지면 아래 OFL 대체를 쓴다. 결이 가깝고 재배포가 자유롭다.

- High Tower Text(베네치안 올드스타일) 대체 → **EB Garamond**, **Cardo**
- Nyala(휴머니스트 세리프) 대체 → **Gentium Book Plus**, **Alegreya**

CSS 폰트 스택에 이름만 적는 것은 재배포가 아니므로 금지 대상이 아니다. 다만 기기마다
화면이 달라지고 iOS에는 아예 없으므로 쓰지 않는다.

## 참고만 하고 가져오지 않은 것

**Gloomhaven Secretariat** (https://github.com/Lurkars/gloomhavensecretariat) —
AGPL-3.0. 컨셉과 데이터 모델만 눈으로 참고했고 **코드는 한 줄도 이식하지 않았다.**
번들된 게임 콘텐츠 데이터도 가져오지 않았다.

## 빌드 도구

vite, @vitejs/plugin-react (MIT), TypeScript (Apache-2.0). 배포물에 포함되지 않으므로
사이트 고지 대상이 아니다.
