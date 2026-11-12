# 🎈 풍선 팡 연쇄 스튜디오 — 팀과 자동 사이클

> 오너 지시(2026-11-12, 원문은 BRIEF.md): 전문 기획자가 컨텐츠·시스템을 디테일하게 기획 → 개발자가 반영 → 디자이너가 상용화 수준 리소스 → FUN QA가 계속 재미 검증 → PM이 마일스톤마다 오너 빌드 테스트 요청, 허들 미달이면 마일스톤 재수립. 최종 목표는 상용화.
> 이 파일이 사이클 규칙이다. BRIEF.md의 가드레일이 그대로 적용된다. (참고: `studio/planet-guardian/TEAM.md`)

## 팀
| 역할 | 누가 | 책임 | 산출물 |
|---|---|---|---|
| 📋 **PM** | 매 사이클 새 서브에이전트 | 마일스톤·일정·QC, 오너 테스트 준비 판단, 허들 미달 시 재수립 | MILESTONES.md, 📋 블록 |
| 📐 **기획자** | 서브에이전트(마일스톤 시작·필요할 때) | 핵심 루프·판 설계표·새것 곡선·경제·메타·온보딩·난이도·수익화 설계안·지표. 결정마다 "왜" | GDD.md, CONTENT.md, 📐 블록 |
| ✏️ **개발자** | 세션 본체 | 기획서대로 구현, 다르게 하면 이유를 TALK에 | 코드·테스트·빌드, ✏️ 블록 |
| 🎨 **디자이너** | 서브에이전트(마일스톤 시작·리소스 필요할 때) | 컨셉·팔레트·캐릭터 시트·UI 가이드, 코드로 그린 리소스(캔버스·SVG)·이펙트·사운드 설계. 외부 저작물 금지 | ART.md, assets/, 🎨 블록 |
| 🧪 **FUN QA** | 매 사이클 새 서브에이전트 — 기획·개발의 결론을 주지 않고 빌드·지표·스크린샷·diff 사실만 | 유저군(처음/캐주얼/숙련)별 재미 검증, 보완점, FUN 기준 개정 제안 | FUN.md, reports/funqa.json, 🧪 블록 |

- 서브에이전트는 파일을 고치지 않고 글을 돌려준다. 본체가 그대로 옮긴다(편집·요약 금지, 길면 그 에이전트에게 줄여 달라고).
- 오너는 STATUS.md와 TALK.md(최신이 위)만 읽으면 된다.

## 파일
| 파일 | 내용 |
|---|---|
| `game.ts` | 결정적 시뮬레이션 + 그리기 + 봇(프로토타입에서 이식) |
| `core.ts` · `juice.ts` | 공통 틀(입력·봇 실행) · 화면 연출 |
| `main.ts` · `index.html` · `build.ts` | 플레이 페이지 → `web/public/studio/balloonpop/index.html` |
| `funqa.ts` | 유저군별 지표 → `reports/funqa.json` |
| `shots.ts` | 390px·데스크톱 스크린샷 + 콘솔 에러·가로 스크롤·키보드/마우스 톡 검사 → `screens/` |
| 테스트 | `tests/studio-balloonpop.test.ts` |

## 한 사이클 (예약 작업, 1시간마다)
1. **동기화**: `git fetch origin factory && git checkout factory && git pull --rebase origin factory`, 필요하면 `npm ci`.
2. **읽기**: STATUS.md, MILESTONES.md(지금 마일스톤·다음 할 일), TALK.md 맨 위 사이클.
3. **멈춤 확인**: STATUS `상태:`가 `오너 테스트 대기`면 → 오너 피드백(채팅·STATUS)이 있을 때만 반영(통과 → 다음 마일스톤 / 미달 → 피드백 원문을 STATUS·TALK에 적고 PM이 마일스톤 재수립). 없으면 아무것도 안 하고 한 줄 보고. `BLOCKED`도 한 줄 보고.
4. **기획/디자인**(필요할 때): 마일스톤 시작이나 PM 지시가 있으면 📐·🎨 서브에이전트에게 이번 작업의 설계·리소스를 받는다.
5. **개발**: 📋 지시와 🧪 보완점 중 우선순위 최상 1~2개를 구현(diff 약 400줄 이내). 기획과 다르게 하면 이유를 ✏️에.
6. **측정**: `npx tsx studio/balloonpop/build.ts` → `npx tsx studio/balloonpop/funqa.ts` → `npx tsx studio/balloonpop/shots.ts`(종료 코드 0 = 콘솔 에러 0) → `npm run verify`.
   - **verify는 종료 코드로만 판정한다.** 출력을 grep·tail·head로 거르거나 파이프로 넘겨 종료 코드를 잃지 않는다. 0이 아니면 push하지 않는다.
7. **FUN QA** (Agent): FUN.md · reports/funqa.json · screens/*.png · 이번 diff 요약(무엇을 바꿨는지만)을 주고 유저군별 평가.
8. **개발자 응답**: 보완점마다 이번에 함/다음 사이클/안 함 + 이유.
9. **PM** (Agent): MILESTONES.md · STATUS.md · 이번 TALK 블록 · 지표 → 진척·일정·QC 판정. 완료 기준을 모두 넘고 QC 통과면 **"오너 빌드 테스트 준비 완료"** 선언.
10. **기록**: TALK.md 맨 위에 사이클 블록(실제 대화 순서: 📐/🎨 → ✏️ 한 일 → 🧪 평가 → ✏️ 응답 → 📋 PM). MILESTONES.md·STATUS.md 갱신.
11. **커밋·푸시**: "스튜디오 풍선 팡 연쇄: C### <요약>"(모델 이름 넣지 않음). 거절되면 `git pull --rebase origin factory` → verify → push. force push 금지. 배포는 GitHub Actions `deploy` 결과로 확인.
12. **오너 알림**: PM이 "오너 빌드 테스트 준비 완료"를 선언한 사이클에만 PushNotification(무엇을 테스트할지 3줄 + https://derrick1119.github.io/derrickkim1119/studio/balloonpop/). STATUS `상태: 오너 테스트 대기`로 바꾸고 다음 사이클부터 멈춤.
13. **요약**: 사이클 끝 한국어 3줄, 첫 줄은 플레이 주소 https://derrick1119.github.io/derrickkim1119/studio/balloonpop/ (오너 테스트 대기 중 한 줄 보고에도 붙인다).

## 수정 범위
`studio/balloonpop/`, `web/public/studio/balloonpop/`, `tests/studio-balloonpop*.test.ts` 뿐. 공장 원본 `arcade/games/balloonpop.ts`는 읽기만.

## 연속 실패
3사이클 연속 verify 실패로 push 못 함 → STATUS `상태: BLOCKED`, "오너에게"에 이유, 알림.
