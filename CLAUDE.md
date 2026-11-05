# 이 저장소에는 공장이 둘 있다

| 공장 | 하는 일 | 프로토콜 | 제품 |
|---|---|---|---|
| **발명 공장** | 세상에 없는 규칙을 발명 | 이 파일 아래 전부 | 메아리 (`web/index.html`) |
| **발견 공장** | 기존 규칙 조각을 조합해 맞물리는 조합을 발견 | `fusion/PROTOCOL.md` | 교차점 (`web/fusion.html`) |

- 네가 어느 공장의 운영자인지는 세션을 깨운 메시지가 알려준다. **발견 공장 운영자라면 `fusion/PROTOCOL.md`만 따르고 아래 "한 사이클"은 무시한다.**
- 발명 공장 운영자는 `fusion/`, `web/fusion.html`, `web/fusion/`, `web/public/fusion/`, `tests/fusion*.test.ts`를 수정하지 않는다.
- 두 공장이 같은 `factory` 브랜치에 push한다. push가 거절되면 `git pull --rebase origin factory` → `npm run verify` 다시 → push.
- `npm run verify`는 두 공장의 테스트를 모두 돌린다. 상대 공장 테스트가 깨지면 네 변경이 원인인지 먼저 확인하고, 상대 영역 코드는 고치지 말고 되돌린다.

---

# 퍼즐 공장 — 자율 운영 프로토콜

이 저장소는 **사람 개입 없이** 돌아가는 퍼즐 공장이다. Claude는 예약 작업으로 주기적으로 깨어나
아래 사이클을 **한 번** 수행하고 종료한다. 사람(오너)은 가끔 `factory/STATE.md`의
"오너에게" 섹션만 읽는다.

## 미션
1. 사람이 쉽게 떠올리지 못하는 **새로운 논리 퍼즐 규칙**을 발명한다.
2. 모든 퍼즐은 **정답이 정확히 하나**이고, **추측 없이 논리로 풀린다**는 것을 기계로 증명한다.
3. 매일 퍼즐 하나를 내는 **상용 수준 웹 제품**(현재: 메아리)으로 출시한다.

## 구조
- `engine/` — 규칙과 무관한 범용 엔진. 모든 규칙은 "이 칸들 중 칠한 수 ∈ [min,max]" 제약으로 환원된다.
  - `solver.ts` 완전 탐색(증명용) · `deducer.ts` 사람식 추론(난이도·힌트) · `generator.ts` 생성기
  - `rules/*.ts` 규칙 세트. `rules/index.ts`에 등록.
- `scripts/evaluate.ts` — 규칙 품질 계기판 → `factory/reports/<rules>.json`
- `scripts/build-bank.ts` — 데일리 퍼즐 은행 `web/public/puzzles/` (기존 날짜 파일 **절대 덮어쓰지 않음**)
- `scripts/e2e.ts` — 실제 브라우저(Playwright)로 퍼즐을 풀어보는 E2E. 스크린샷은 `factory/reports/screens/`
- `web/` — 제품(정적 사이트, Vite). `factory` 브랜치 push 시 GitHub Pages 배포.
- `factory/STATE.md` 현재 상태 · `factory/BACKLOG.md` 가설 큐 · `factory/JOURNAL.md` 사이클 일지 · `factory/experiments/NNNN-*.md` 실험 기록

## 한 사이클 (반드시 이 순서)
1. **동기화**: `git fetch origin factory && git checkout factory && git pull origin factory`, `npm ci`.
2. **읽기**: `factory/STATE.md`, `factory/BACKLOG.md`, `factory/JOURNAL.md` 마지막 3개 항목.
3. **정지 조건 확인**: STATE의 `상태:`가 `BLOCKED`이면 아무것도 바꾸지 말고 종료한다.
4. **유지보수 우선**: 은행에 오늘 이후 퍼즐이 30일 미만이면 `npm run bank -- --days 90` 부터 한다.
5. **가설 하나 선택**: BACKLOG 맨 위의 `[ ]` 항목 하나. (사이클당 하나. 크면 쪼개서 BACKLOG에 되돌려 넣는다.)
6. **실험 기록 먼저**: `factory/experiments/NNNN-제목.md`에 가설 · 측정 지표 · **폐기 기준**을 코드 수정 *전에* 쓴다.
7. **구현 → 측정**: `npm run verify`(타입·테스트·빌드), 해당되면 `npm run evaluate`, UI를 건드렸으면 `npm run e2e` 후 스크린샷을 직접 보고 확인.
8. **판정**:
   - 통과 + 지표 개선 → 커밋, BACKLOG 항목 `[x]`.
   - 폐기 기준 해당 → 코드 변경은 되돌리고(`git checkout -- .`), 실험 기록에 *왜 실패했는지*만 남겨 커밋. 이것도 성과다.
9. **새 가설 1~3개**를 BACKLOG에 추가 (이번 결과에서 나온 것 우선). 아래 "발상 규칙" 참고.
10. **기록**: JOURNAL 맨 위에 항목 추가, STATE 갱신(지표 표, 연속 실패 수, 다음 할 일).
11. **커밋 & 푸시**: `git push -u origin factory`. 네트워크 실패 시 2·4·8·16초 백오프로 최대 4회.

## 절대 규칙 (가드레일)
- `npm run verify`가 실패한 상태로 push 금지. **테스트를 약화·삭제·skip 해서 통과시키지 않는다.**
- `tests/bank.test.ts`(출시 게이트)는 어떤 경우에도 완화하지 않는다.
- 이미 존재하는 날짜의 퍼즐 파일은 수정·삭제하지 않는다 (플레이어가 푼 퍼즐이 바뀌면 안 됨).
- 규칙 세트 `echo`의 의미를 바꾸지 않는다. 새 규칙은 새 id로 추가한다. 데일리 제품의 규칙을 바꾸는 것은
  오너 승인 사항이다 — STATE의 "오너에게"에 제안으로 올린다.
- force push 금지. `factory` 브랜치에만 push. `main` 병합·PR 생성은 오너 요청 시에만.
- 런타임 의존성 추가 금지(개발 의존성만, 필요성은 실험 기록에 정당화). 번들 JS gzip 30KB 이하 유지.
- 외부 서비스 가입·결제·공개 게시 금지. 비밀값을 저장소에 쓰지 않는다.
- **연속 3사이클 실패**(verify 실패로 커밋 못 함, 또는 아무 진전 없음)면 STATE `상태: BLOCKED`로 바꾸고
  이유를 "오너에게"에 쓰고 종료한다.
- 사이클당 작업량은 diff 약 400줄 이내를 목표로 한다. 큰 일은 쪼갠다.

## 발상 규칙 (뻔한 아이디어 피하기)
새 규칙을 제안할 때는 기존 장르(스도쿠·지뢰찾기·노노그램·누리카베 등)를 그대로 가져오지 않는다.
대신 아래 축들을 **조합·비틀기**해서 만든다. 그리고 `evaluate` 지표로 비교한다.
- *무엇을 세는가*: 거리 d의 고리 / 대각선만 / 나이트 이동 칸 / 같은 행에서 보이는 것 / 연결 덩어리 크기
- *단서의 형태*: 정확한 수 / 홀짝 / "이웃 단서보다 크다" / 두 고리의 차이 / 거짓말 단서 하나
- *전역 규칙*: 맞닿기 금지 / 모두 연결 / 행마다 정확히 k개 / 2×2 금지 / 대칭
- *판의 형태*: 사각 / 육각 / 토러스(가장자리 연결) / 두 겹 판
품질 판단 기준(`evaluate`): hitRate ≥ 0.9, monotonic = true, 단서 밀도 낮을수록, techniqueMix 높을수록,
생성 시간 퍼즐당 2초 이내. 사람에게 재미있는지는 기계가 판단할 수 없다 — 유망한 규칙은 "오너에게"에 플레이 링크와 함께 올린다.

## 상용화 품질 체크리스트 (UI 작업 시)
모바일 390px에서 가로 스크롤 없음 · 라이트/다크 · 키보드만으로 플레이 가능 · 콘솔 에러 0 ·
localStorage 불가 환경에서도 동작 · 첫 방문자가 규칙을 30초 안에 이해 · 공유 텍스트에 스포일러 없음.
