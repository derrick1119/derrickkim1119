# 🔩 나사 풀기 공방 스튜디오 — 팀과 자동 사이클

> 오너 지시(2026-11-14, 25라운드 졸업): "1,2,4 스튜디오 개설해" · 운영 방식(2026-11-12): 전문 기획자 → 개발자 반영 → 디자이너 상용 리소스 → FUN QA 재미 검증 → PM 마일스톤·오너 빌드 테스트.
> 이 파일이 사이클 규칙이다. `BRIEF.md`의 가드레일이 여기에도 그대로 적용된다.

## 팀 (이 세션 하나 = 본체 + Agent 서브에이전트)
| 역할 | 누가 | 책임 | 산출물 |
|---|---|---|---|
| 📋 **PM** | 매 사이클 새 서브에이전트 | 마일스톤 수립·일정·QC, 마일스톤마다 오너 빌드 테스트 요청 판단, 허들 미달이면 마일스톤 재수립 | `MILESTONES.md`, TALK 📋 |
| 📐 **기획자** | 서브에이전트(마일스톤 시작·필요할 때) | 핵심 루프·판 설계표·새것 곡선·경제·메타·온보딩·난이도·수익화 설계안·지표. 결정마다 "왜" | `GDD.md`, `CONTENT.md`, TALK 📐 |
| ✏️ **개발자** | 세션 본체 | 기획서대로 구현. 기획과 다르게 하면 TALK에 이유 | `game.ts`·`main.ts` 등 코드, 테스트, 빌드 |
| 🎨 **디자이너** | 서브에이전트 | 컨셉 아트 방향(무드·팔레트·캐릭터 시트·UI 가이드)과 직접 만든 리소스(캔버스 아트·SVG·이펙트·효과음 설계). 외부 저작물 복사 금지 | `ART.md`, `assets/`, TALK 🎨 |
| 🧪 **FUN QA** | 매 사이클 새 서브에이전트(기획·개발의 결론을 주지 않고 빌드·지표·스크린샷만) | 처음 하는 사람/캐주얼/숙련별 재미 검증, 보완점, FUN 기준 개정 제안 | `FUN.md`, `reports/funqa.json`, TALK 🧪 |

- 서브에이전트는 파일을 직접 고치지 않고 글을 돌려준다. 본체가 그대로 옮긴다(편집·요약 금지, 길면 그 에이전트에게 줄여 달라고).
- 오너는 `STATUS.md`와 `TALK.md`(최신이 위)만 읽으면 된다.

## 파일
| 파일 | 무엇 |
|---|---|
| `game.ts` | 결정적 시뮬레이션 + 그리기 + 봇 (M0: 공장 `arcade/games/screwshop.ts` 복사본에서 출발) |
| `core.ts` · `rng.ts` · `juice.ts` | 공통 틀·난수·연출 (공장 코드에서 이 게임에 필요한 것만 복사) |
| `main.ts` · `index.html` · `build.ts` | 플레이 빌드 → `web/public/studio/screwshop/index.html` |
| `funqa.ts` | 봇 측정(장인·버릇·무작위 × 판별 한 번 도전) → `reports/funqa.json` |
| `shots.ts` | 390×844 스크린샷·콘솔 에러·가로 스크롤 → `screens/` |
| 테스트 | `tests/studio-screwshop*.test.ts` |

## 한 사이클 (예약 작업, 매시 :05)
1. **동기화**: `git fetch origin factory && git checkout factory && git pull --rebase origin factory`, 필요하면 `npm ci`.
2. **읽기**: STATUS.md, MILESTONES.md(지금 마일스톤·남은 작업), TALK.md 맨 위 사이클.
3. **멈춤 확인**: STATUS `상태:`가 `오너 테스트 대기`면 → 오너 피드백(채팅·STATUS)이 있을 때만 반영, 없으면 아무것도 안 하고 한 줄 보고(주소 포함). `BLOCKED`도 한 줄 보고.
4. **작업**: 이번 마일스톤의 📐·🎨·📋 지시 중 우선순위 최상 1~2개(diff 약 400줄 이내). 마일스톤 순서: 📐 기획 → 🎨 디자인 → ✏️ 개발 → 🧪 FUN QA → 📋 PM QC.
5. **측정**: `npx tsx studio/screwshop/build.ts` → `npx tsx studio/screwshop/funqa.ts` → `npx tsx studio/screwshop/shots.ts`(콘솔 에러 0, 가로 스크롤 0) → 스크린샷을 직접 본다 → `npm run verify`.
   - **verify는 종료 코드로만 판정한다.** 출력을 파이프로 거르지 않는다. 0이 아니면 push하지 않는다.
6. **🧪 FUN QA** (Agent): FUN.md · reports/funqa.json · screens/*.png · 이번 diff 요약(무엇을 바꿨는지만)을 주고 유저군별 평가.
7. **✏️ 응답**: 보완점마다 이번에 함 / 다음 사이클 / 안 함 + 이유.
8. **📋 PM** (Agent): MILESTONES.md · STATUS.md · 이번 TALK 블록 · 지표 → 진척·일정·QC. 완료 기준을 모두 넘으면 **"오너 빌드 테스트 준비 완료"**.
9. **기록**: TALK.md 맨 위에 사이클 블록(실제 대화 순서). MILESTONES.md·STATUS.md 갱신.
10. **커밋·푸시**: "스튜디오 나사 풀기 공방: <요약>". 거절되면 `git pull --rebase origin factory` → verify → push. force push 금지. 배포는 GitHub Actions `deploy` 결과로 확인.
11. **오너 알림**: PM이 준비 완료를 선언한 사이클에만 PushNotification(무엇을 테스트할지 3줄 + 전체 주소). STATUS `상태: 오너 테스트 대기`.
12. **사이클 끝 한국어 3줄 요약** — 첫 줄은 항상 `https://derrick1119.github.io/derrickkim1119/studio/screwshop/`.

## 오너 테스트 이후
- **통과** → 다음 마일스톤.
- **허들 미달** → 오너 피드백을 STATUS·TALK에 그대로 적고, PM이 마일스톤을 재수립(무엇을·어떻게·언제 다시 테스트)한 뒤 진행.

## 연속 실패
3사이클 연속 verify 실패로 push 못 함 → STATUS `상태: BLOCKED`, "오너에게"에 이유, 알림.
