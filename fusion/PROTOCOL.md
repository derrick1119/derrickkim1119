# 발견 공장 — 자율 운영 프로토콜

> 발명 공장(루트 `CLAUDE.md`)은 세상에 없는 규칙을 **발명**한다.
> 발견 공장은 이미 있는 규칙 조각(원자)을 조합해, 아무도 시험해보지 않은 조합 중
> **정말로 맞물려 작동하는 것을 발견**한다. 새것은 재료가 아니라 *조합*에서 나온다.

## 미션
1. 원자(기존 장르에서 떼어낸 규칙 한 조각)들의 조합 공간을 체계적으로 탐색한다.
2. "발견"을 숫자로 정의하고 증명한다 — 융합도(두 재료가 맞물려야 풀리는 정도), 필수성(재료를 빼면 무너지는 정도).
3. 발견을 매일 하나의 퍼즐로 내는 상용 수준 제품 **교차점**(`web/fusion.html`)으로 출시한다.

## 구조 (발견 공장의 영역)
- `fusion/atoms.ts` 원자 목록 · `fusion/spec.ts` 조합 정의/이름/호환성/기존 장르 판정
- `fusion/sampler.ts` 전역 규칙만 만족하는 무작위 정답 · `fusion/generator.ts` 단서 최소화 생성기
- `fusion/analyze.ts` **계기판**: 융합도·필수성·fitness·발견 기준(`DISCOVERY_RULE`)
- `fusion/cli-search.ts` 탐색 (`npm run fusion:search`) → `fusion/ledger.json`(원장), `fusion/discoveries/*.md`(발견 카드)
- `fusion/cli-bank.ts` 데일리 은행 (`npm run fusion:bank`) → `web/public/fusion/daily/`
- `fusion/e2e.ts` 브라우저 E2E (`npm run fusion:e2e`, build 후) · 스크린샷 `fusion/reports/screens/`
- `web/fusion.html`, `web/fusion/` 제품 UI
- `tests/fusion.test.ts`, `tests/fusion-bank.test.ts`(**출시 게이트**)
- `fusion/STATE.md` · `fusion/BACKLOG.md` · `fusion/JOURNAL.md` · `fusion/experiments/NNNN-*.md`

공유 영역(`engine/`, `package.json`, `vite.config.ts`, `.github/`, `web/public/puzzles/`, `web/index.html`, `web/main.ts`)은
**발명 공장 소유**다. 발견 공장은 여기를 읽기만 한다. 꼭 필요하면 *추가만* 하고(기존 동작 변경 금지), 실험 기록에 이유를 쓴다.

## 한 사이클 (반드시 이 순서)
1. **동기화**: `git fetch origin factory && git checkout factory && git pull --rebase origin factory`, `npm ci`.
2. **읽기**: `fusion/STATE.md`, `fusion/BACKLOG.md`, `fusion/JOURNAL.md` 최근 3개.
3. **정지 조건**: STATE `상태: BLOCKED`면 아무것도 바꾸지 말고 종료.
4. **유지보수 우선**: 교차점 데일리가 오늘 이후 30일 미만이면 `npm run fusion:bank -- --days 120`부터.
5. **기본 업무 — 탐색**: 원장에 미시험 조합이 남아 있으면 `timeout 1200 npm run fusion:search -- --budget 40 --max-sec 420`을 **매 사이클** 돌린다.
   한 조합에서 멈춰 timeout으로 죽어도 원장은 조합마다 저장되고, 다음 실행이 그 조합을 시간 초과로 기록하고 넘어간다(실험 0004).
   새 발견이 나오면 카드(`fusion/discoveries/<id>.md`)를 읽고, 이름·규칙 문장이 어색하지 않은지 확인한다.
6. **가설 하나**: BACKLOG 맨 위 `[ ]` 하나. 코드 수정 *전에* `fusion/experiments/NNNN-제목.md`에 가설·지표·**폐기 기준**을 쓴다.
7. **구현 → 측정**: `npm run verify`. UI를 건드렸으면 `npm run build && npm run fusion:e2e` 후 스크린샷을 직접 본다.
   계기판/원자/생성기를 바꿨으면 영향받는 발견을 `npm run fusion:search -- --only <id>`로 재평가한다.
8. **판정**: 통과+개선 → 커밋, BACKLOG `[x]`. 폐기 기준 해당 → 코드 되돌리고 실패 이유만 기록해 커밋.
9. **새 가설 1~3개**를 BACKLOG에 추가 (원장에서 보이는 패턴 우선 — 예: "어떤 원자가 발견에 자주 등장하나").
9-1. **재미 A|B** (오너 요청, 실험 0003):
    - 채팅에 오너의 선택("A"/"B")이 와 있으면 먼저 `npx tsx fusion/cli-ab.ts choose A|B`. 승자가 기준선
      (`fusion/ab/baseline.json`, 데일리 은행이 새 날짜에 쓰는 규칙)이 된다.
    - `npx tsx fusion/cli-ab.ts run` — 새 발견의 재미 지표를 계산하고, 대기 중인 라운드가 없으면
      기준선(A)에 도전할 새 아이디어(B)를 골라 `fusion/ab/current.json`에 쓴다. 대기 중이면 그대로 둔다.
    - B 후보가 바닥나면 탐색·원자 추가로 새 아이디어를 만든다(사다리 2·3단계).
10. **기록**: JOURNAL 맨 위 항목, STATE 갱신(탐색 진척 `시험/전체`, 발견 수, 챔피언, 연속 실패 수).
10-1. **계기판 아티팩트 갱신** (매 사이클): `npx tsx fusion/cli-dashboard.ts --cycle NNNN` →
    `fusion/reports/dashboard.html`을 STATE "계기판" 줄의 slug로 `publish_files` 재게시(base_version은 get_artifact로).
    A|B 라운드가 새로 열렸으면 사이클 요약에 A·B 이름과 계기판 링크를 쓰고 오너에게 선택을 요청한다.
11. **푸시**: `git push -u origin factory`. 거절되면 `git pull --rebase origin factory` → `npm run verify` 다시 → push.
    네트워크 실패는 2·4·8·16초 백오프로 최대 4회.

## 절대 규칙
- `npm run verify` 실패 상태로 push 금지. 테스트 약화·삭제·skip 금지. `tests/fusion-bank.test.ts`는 절대 완화하지 않는다.
- **원자의 의미를 바꾸지 않는다** (이미 출시된 퍼즐의 정답이 바뀐다). 바꾸려면 새 id로 새 원자를 추가.
- 이미 존재하는 날짜의 교차점 퍼즐 파일은 수정·삭제하지 않는다.
- `knownGenre`(기존 장르 판정)를 느슨하게 만들어 발견 수를 부풀리지 않는다. 기존 장르와 사실상 같다고 판단되면 *추가*한다.
- `DISCOVERY_RULE`을 낮추려면 실험 기록에 근거를 쓰고, 기존 발견 전체를 새 기준으로 재평가한다.
- 발명 공장의 파일(`factory/`, 루트 `CLAUDE.md`의 발명 공장 절)을 수정하지 않는다.
- force push 금지. `factory` 브랜치에만 push. PR·main 병합은 오너 요청 시에만.
- 런타임 의존성 추가 금지. 교차점 번들 JS gzip 30KB 이하.
- 외부 서비스 가입·결제·공개 게시 금지. 기존 게임의 이름·캐릭터·아트를 가져오지 않는다 (장르 *규칙 조각*만 재료로 쓴다).
- **연속 3사이클 실패**면 STATE `상태: BLOCKED` + 이유를 "오너에게"에 쓰고 종료.
- 사이클당 코드 diff 약 400줄 이내 (탐색 산출물 JSON·카드는 제외).

## 발견의 사다리 (탐색이 끝나가면 위로 올라간다)
1. **조합 탐색** — 원자 472개 조합 전수 시험 (현재 단계)
2. **원자 추가** — 다른 장르에서 새 조각을 떼어온다: 육각판 이웃, 토러스(가장자리 연결), 영역(스타배틀식 칸막이),
   "단서 중 하나는 거짓", 홀짝 단서, 대칭 정답, 2색 칠하기… 원자 하나가 늘 때마다 조합 공간이 크게 넓어진다.
3. **조합의 조합** — 상위 발견끼리 교배(원자 교환)해서 계보를 만든다.
4. **사람 검증** — 기계는 재미를 못 잰다. 상위 발견은 STATE "오너에게"에 플레이 링크로 올린다:
   `https://derrick1119.github.io/derrickkim1119/fusion.html?play=<id>&seed=1&tier=medium`
