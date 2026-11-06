# 게임 발견 공장 — 자율 운영 프로토콜

> 오너(2026-11-06): "BB탄은 벽돌깨기에서, 랜덤다이스는 디펜스에서, 무한의 계단은 단순 투버튼에서 착안해 대박이 났다.
> 기존에 있는 걸 잘 조합하고 변형해서 새로운 걸 만들어내는 공장이었으면 좋겠다."
>
> 그래서 이 공장은 **아는 장르 2~3개의 핵심 재미 한 조각씩을 섞고, 한 번 비튼** 캐주얼 게임을 만든다.
> 장르 *규칙 조각*만 재료로 쓴다 — 특정 게임의 이름·캐릭터·아트·레벨·외형을 가져오지 않는다.

## 구조
- `arcade/core.ts` 공통 틀(결정적 시뮬레이션·입력·봇 실행) + `GENES`(장르 조각 목록)
- `arcade/games/<id>.ts` 게임 하나 = `GameDef` + 못하는 봇 + 잘하는 봇. `arcade/registry.ts`에 등록
- `arcade/evaluate.ts` 봇 계기판 → `arcade/reports/eval.json`
- `arcade/play.ts` 브라우저 플레이어 · `arcade/cli-dashboard.ts` 계기판 → `arcade/reports/dashboard.html`
- `arcade/ab.json` A|B 라운드 · `arcade/STATE.md` · `arcade/BACKLOG.md` · `arcade/JOURNAL.md` · `arcade/experiments/NNNN-*.md`
- `tests/arcade.test.ts` 출시 게이트(결정성·규칙 3줄 이하·실력이 통함)

## 게임 하나의 조건 (게이트)
- 조작: 원버튼(탭) 또는 좌우 하나. 규칙 문장 **3줄 이하**, 첫 문장에 조작이 나온다.
- 결정적 시뮬레이션(같은 시드·같은 입력 → 같은 결과). 그림 그리기는 시뮬레이션과 분리.
- 봇 계기판: 숙련 격차(잘함 ÷ 못함 점수) ≥ 3, 못하는 봇 생존 ≥ 5초, 잘하는 봇 중앙값 30초~3분.
- "조합 + 비틀기"를 `genes`(2~3개)와 `twist`(한 문장)로 명시. 비틀기 없이 장르를 섞기만 한 것은 탈락.

## 한 사이클 (반드시 이 순서)
1. **동기화**: `git fetch origin factory && git checkout factory && git pull --rebase origin factory`, `npm ci`.
2. **읽기**: `arcade/STATE.md`, `arcade/BACKLOG.md`, `arcade/JOURNAL.md` 최근 3개, `arcade/ab.json`.
3. **정지 조건**: STATE `상태: BLOCKED`면 아무것도 바꾸지 말고 종료.
4. **오너 판정 처리 (최우선)**: 채팅에 오너의 A|B 답이 있으면 `ab.json` 현재 라운드에 winner·이유 기록, `champion` 갱신,
   JOURNAL에 "A|B N라운드 판정". 오너가 단 이유(“둘 다 별로, ○○ 때문”)는 다음 게임 설계 기준으로 BACKLOG 맨 위에.
   새 라운드를 연다: A = 챔피언, B = 후보 중 봇 재미 추정 1위(직전 라운드에 나온 적 없는 것).
5. **기본 업무 — 게임 하나**: BACKLOG 맨 위 `[ ]` 하나. 대개 "새 조합 게임 만들기" 또는 "기존 게임 다듬기".
   코드 수정 *전에* `arcade/experiments/NNNN-제목.md`에 조합·비틀기·가설·**폐기 기준**을 쓴다.
6. **측정**: `npx tsx arcade/evaluate.ts`, `npm run verify`. 게이트 미달이면 수치를 보고 한 번 다듬고, 그래도 미달이면
   레지스트리에서 빼고(코드는 `arcade/games/`에 남김) 실험 기록에 이유를 쓴다. 이것도 성과다.
7. **새 아이디어 1~3개**를 BACKLOG에 (조합표에서 아직 안 쓴 짝, 오너 이유에서 나온 것 우선).
8. **기록**: JOURNAL 맨 위 항목, STATE 갱신(게임 목록·봇 지표·라운드·연속 실패 수).
9. **계기판 갱신**: `npx tsx arcade/cli-dashboard.ts --cycle NNNN` → `arcade/reports/dashboard.html`을
   STATE "계기판" 줄의 slug로 `publish_files` 재게시(base_version은 `get_artifact`). 게시 실패는 JOURNAL에만 적는다.
10. **푸시**: 커밋 메시지 "발견 NNNN: <요약>", `git push -u origin factory`. 거절되면 `git pull --rebase origin factory` → verify → push.

## 절대 규칙
- `npm run verify` 실패 상태로 push 금지. 테스트 약화·삭제·skip 금지.
- 발명 공장 파일(`factory/`, `engine/`의 기존 동작, 루트 CLAUDE.md 발명 공장 절) 수정 금지. 공유 파일은 *추가만*.
- 런타임 의존성 추가 금지. 게임 하나의 번들은 gzip 30KB 이하.
- 외부 서비스 가입·결제·공개 게시 금지. 기존 게임의 이름·캐릭터·아트·레벨을 가져오지 않는다.
- force push 금지. `factory` 브랜치에만 push. PR·main 병합은 오너 요청 시에만.
- 연속 3사이클 실패(verify 실패로 커밋 못 함, 진전 없음)면 STATE `상태: BLOCKED` + 이유를 "오너에게"에 쓰고 종료.
- 사이클당 코드 diff 약 400줄 이내(게임 하나가 대개 200~300줄).
