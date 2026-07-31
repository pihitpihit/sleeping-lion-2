# 출처와 라이선스 (NOTICE)

이 저장소의 **소스 코드**는 **plastics** 저작이며 MIT 라이선스다([LICENSE](./LICENSE)).
아래 자료는 각자의 라이선스를 따르며 MIT로 재배포되지 않는다.

---

## 글꼴

### Pirata One

- **저작권:** Copyright (c) 2012, Rodrigo Fuenzalida, Nicolas Massi
  (www.taip.com.ar / abc.taip.com.ar), with Reserved Font Name 'Pirata'
- **라이선스:** SIL Open Font License, Version 1.1
- **전문:** [`public/licenses/pirata-one-OFL.txt`](./public/licenses/pirata-one-OFL.txt)
- **원본:** https://fonts.google.com/specimen/Pirata+One
- **변경사항:** 라틴 서브셋(woff2)만 포함. 글자꼴 자체는 수정하지 않았고 폰트 이름도
  바꾸지 않았다.
- **파일:** `src/assets/fonts/pirata-one-latin.woff2`

---

## 아트 에셋

### Gloomhaven Creator Pack — *현재 미사용*

아직 이 저장소에 Creator Pack 에셋이 없다. 도입하면 아래 항목을 채우고
`public/assets/creator-pack/ATTRIBUTION.md`에 파일 단위로 기록한다.

- **저작권:** Isaac Childres / Cephalofair Games
- **라이선스:** [Creative Commons BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/)
- **출처:** https://boardgamegeek.com/thread/1733586/files-for-creation
- **라이선스 근거:** 저작자 Isaac Childres가 위 스레드에서 직접 선언했다 —
  "I am sharing these assets under creative commons license BY-NC-SA 4.0 ...
  you can use these assets for non-commercial applications with proper
  attribution, and any derivative work based off these assets is protected
  under the same license as well."

**이 라이선스가 우리에게 지우는 의무**

| 조건 | 우리가 해야 할 것 |
|---|---|
| **BY** (저작자표시) | 저작자·저작권 표시, 라이선스 고지, 면책 고지, 원본 링크를 유지한다 |
| **NC** (비영리) | 이 앱으로 돈을 벌지 않는다. 광고·유료화·판매 금지 |
| **SA** (동일조건변경허락) | 에셋을 **개변하면 그 결과물도 BY-NC-SA 4.0**이 된다 |
| 변경 표시 | 무엇을 어떻게 바꿨는지 명시한다 |

**주의 — SA의 전염 범위**

SA는 개변한 에셋에만 미치고 나란히 놓인 우리 코드까지 MIT에서 끌어내리지 않는다
(CC 용어로 collection과 adaptation의 차이). **단 그 경계를 지키려면 Creator Pack
유래 에셋을 반드시 별도 파일로 두어야 한다.** 아이콘을 `.tsx`에 인라인 SVG로
박아 넣으면 그 소스 파일 자체가 개작물로 취급될 소지가 있다.

**주의 — 상표는 별개**

CC 라이선스는 상표권을 부여하지 않는다("Patent and trademark rights are not
licensed under this Public License"). "Gloomhaven", "Jaws of the Lion",
"Cephalofair"는 Cephalofair Games의 상표이며, 이 앱은 호환성을 설명하기 위해
지명적으로만 언급한다. 로고·워드마크는 사용하지 않는다.

---

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

---

## 참고만 하고 가져오지 않은 것

**Gloomhaven Secretariat** (https://github.com/Lurkars/gloomhavensecretariat) —
AGPL-3.0. 컨셉과 데이터 모델만 눈으로 참고했고 **코드는 한 줄도 이식하지 않았다.**
번들된 게임 콘텐츠 데이터도 가져오지 않았다.

---

## 런타임 의존성

react, react-dom, scheduler — 모두 MIT.
빌드 도구(vite, @vitejs/plugin-react: MIT / TypeScript: Apache-2.0)는 배포물에
포함되지 않는다.
