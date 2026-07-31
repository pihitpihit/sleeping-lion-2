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
```

### base 경로

배포 위치에 따라 `base`가 달라지므로 `VITE_BASE` 환경변수로 주입한다.

```bash
npm run build                              # base = '/'  (자가호스팅 루트, 로컬)
VITE_BASE=/sleeping-lion-2/ npm run build  # GitHub Pages 프로젝트 사이트
```

`preview`로 확인할 때는 빌드할 때와 **같은** `VITE_BASE`를 줘야 한다. 다르면 에셋이 404가 나고 SPA 폴백이 `index.html`을 돌려주는 탓에, 모듈 스크립트가 MIME 불일치로 조용히 실행되지 않는다.

```bash
VITE_BASE=/sleeping-lion-2/ npm run preview
```

## 출처와 라이선스

소스 코드는 **plastics** 저작이며 MIT다([LICENSE](./LICENSE)). 외부 자료는 각자의 라이선스를 따른다 — 전체 목록과 조건은 [NOTICE.md](./NOTICE.md)가 정본이다.

- **Pirata One** — SIL Open Font License 1.1. 라틴 서브셋만 self-host.
- **Gloomhaven Creator Pack** — CC BY-NC-SA 4.0. 아직 쓰지 않는다. 들이게 되면 `public/assets/creator-pack/`에만 두고 그 안의 `ATTRIBUTION.md`에 파일 단위로 기록한다(SPEC 13.1장).

현재 문장·아이콘은 전부 직접 그린 인라인 SVG다.
