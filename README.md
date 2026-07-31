# 잠자는 사자 2호점 · Sleeping Lion II

Gloomhaven / Jaws of the Lion 동행 웹앱. 비공개·지정 파티 전용.

설계는 [SPEC.md](./SPEC.md)가 정본이고, 작업 지침은 [CLAUDE.md](./CLAUDE.md)에 있다.

## 두 축

- **축 ① 캠페인 기록지 (영속)** — 시나리오 정산 결과를 기록·관리. IndexedDB 저장, 나중에 PocketBase 동기화.
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

## 서드파티

- **Pirata One** — SIL Open Font License 1.1. 라틴 서브셋만 self-host. 전문: [`public/licenses/pirata-one-OFL.txt`](./public/licenses/pirata-one-OFL.txt)

그 외 아트 에셋은 쓰지 않는다. 문장·아이콘은 전부 인라인 SVG로 직접 그린다.
