# 잠자는 사자 2호점 · Sleeping Lion II

글룸헤이븐과 사자의 턱에 쓰는 웹앱. 팬이 만든 비영리 도구.

**https://pihitpihit.github.io/sleeping-lion-2/**

만든 곳: **plastics**

설계는 [SPEC.md](./SPEC.md)가 정본이고, 작업 지침은 [CLAUDE.md](./CLAUDE.md)에 있다.

## 두 축

- **축 ① 캠페인 기록지 (영속)** — 한 판이 끝난 뒤의 결과를 기록·관리. IndexedDB 저장, 나중에 PocketBase 동기화.
- **축 ② 인게임 도구 패널 (휘발성)** — 원소 트래커 / 공격 보정 덱 / 주도권 정렬. 메모리에만 두고 새로고침하면 초기화된다.

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
- **Gloomhaven Creator Pack** — CC BY-NC-SA 4.0. 아직 쓰지 않는다. 들이게 되면 `public/assets/creator-pack/`에만 두고 그 안의 `ATTRIBUTION.md`에 파일 단위로 기록한다(SPEC 13.1장).

현재 문장·아이콘은 전부 직접 그린 인라인 SVG다.
