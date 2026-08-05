# 잠자는 사자 2호점 · Sleeping Lion II

글룸헤이븐과 사자의 턱에 쓰는 웹앱. 팬이 만든 비영리 도구.

**https://pihitpihit.github.io/sleeping-lion-2/**

만든 곳: **plastics**

설계는 [SPEC.md](./SPEC.md)가 정본이고, 작업 지침은 [CLAUDE.md](./CLAUDE.md)에 있다.

## 두 축

- **축 ① 캠페인 기록지 (영속)** — 한 판이 끝난 뒤의 결과를 기록·관리. IndexedDB 저장, 나중에 PocketBase 동기화.
- **축 ② 인게임 도구 패널 (휘발성)** — 원소 트래커 / 공격 보정 덱 / 주도권 정렬 / HP/XP 트래커 / 라운드 트래커 다섯으로 한정. 메모리에만 두고 새로고침하면 초기화된다.

## 행낭 (`#/satchel`)

축 ②를 담는 위젯 보드. 격자 위에 연장을 놓고 크기를 맞춘다.

- **플레이 모드**로 열린다. 격자가 보이지 않고 놓인 연장을 쓰기만 한다.
- **고쳐 놓기**를 누르면 편집 모드가 되어 격자가 나타난다. 도구 띠에서 연장을 골라 놓고, 끌어 옮기고, 우하단 모서리로 크기를 바꾼다.
- 키보드로도 된다 — 연장에 초점을 준 뒤 방향키로 이동, `Shift`+방향키로 크기, `Delete`로 치우기.
- **배치는 저장된다**(`localStorage`). 화면 크기가 달라지면 열 수에 맞춰 다시 앉힌다. 연장 안의 상태(뽑은 카드 등)는 저장하지 않는다 — SPEC 5.2.
- 연장은 **90도 단위로 돌아간다.** 태블릿을 상 가운데 놓고 마주 앉을 때 쓴다. 방향은 열 수와 무관하게 하나로 기억한다.
- 지금 놓을 수 있는 연장은 **원소 트래커 · HP/XP 트래커 · 라운드 트래커**, 그리고 배치 실험용 `Test`다. 공격 보정 덱과 주도권 정렬은 아직 없다.
- 값의 임자가 연장마다 다르다. **원소와 라운드는 행낭 전체에 하나뿐이고**(식탁 위 원소판은 하나다), **HP/XP는 놓은 것마다 따로다**(체력은 사람마다 다르다).

## 저작권 경계

Cephalofair Games의 저작물 원문(카드 텍스트·시나리오 서사·몬스터 스탯)은 코드·데이터·서버 어디에도 넣지 않는다. 콘텐츠는 식별자·인덱스·수치로만 표현하고, 텍스트는 사용자 입력이나 사용자 소유 데이터팩으로만 채운다. 자세한 원칙은 SPEC 3장.

## 개발

```bash
npm install
npm run dev            # 개발 서버
npm run build          # 타입체크 + 프로덕션 빌드
npm run preview        # 빌드 결과 확인
npm run lint           # ESLint
npm run format         # Prettier 적용 (format:check 는 검사만)
npm run test           # Vitest (test:watch 는 감시 모드)
npm run check          # 위 넷을 한 번에 — 커밋 전에 돌린다
```

### base 경로 — 로컬에서는 건드리지 않는다

`VITE_BASE`는 **GitHub Actions 워크플로만** 쓴다. 로컬에서는 기본값 `/`로 두고
`npm run build` → `npm run preview`를 그대로 쓴다.

> **직접 주지 말 것.** 빌드와 preview의 base가 어긋나면 에셋이 404가 나고 SPA
> 폴백이 `index.html`을 돌려준다. 그러면 모듈 스크립트가 MIME 불일치로 **조용히**
> 실행되지 않아 빈 화면만 뜬다. 콘솔에 오류도 안 찍힌다.
>
> 실제로 두 번 밟았다. 한 번은 build에만 주고 preview에 안 줘서, 한 번은 그 반대로.
> `npm run check`가 마지막에 base 없이 다시 빌드하기 때문에 특히 어긋나기 쉽다.

Pages 배포용 빌드를 손으로 재현해야 한다면 **둘 다** 준다.

```bash
VITE_BASE=/sleeping-lion-2/ npm run build
VITE_BASE=/sleeping-lion-2/ npm run preview   # 열 주소도 /sleeping-lion-2/ 로
```

## 출처와 라이선스

소스 코드는 **plastics** 저작이며 MIT다([LICENSE](./LICENSE)). 외부 자료는 각자의 라이선스를 따른다 — 전체 목록과 조건은 [NOTICE.md](./NOTICE.md)가 정본이다.

- **Pirata One** — SIL Open Font License 1.1. 라틴 서브셋만 self-host.
- **Gloomhaven Creator Pack** — CC BY-NC-SA 4.0. **쓰는 중이다** — 원소 아이콘 6종과 HP/XP 표식 2종. `public/assets/creator-pack/`에만 두고 `.tsx`에 인라인으로 박지 않으며, 그 안의 `ATTRIBUTION.md`에 파일 단위로 기록한다(SPEC 13.1장).

사자 문장·파비콘을 비롯한 나머지 화면 요소는 직접 그린 인라인 SVG이며 CC 조건과 무관하다.
