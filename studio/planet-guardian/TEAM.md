# 행성 수호대 스튜디오 — 팀과 자동 사이클

> 오너 요청(2026-11-07): "자동화로 계속 개선. 기획자와 FUN QA가 의견을 나누며 게임이 만들어지는 걸 지켜보겠다. PM은 마일스톤을 관리하고, 완료되면 내가 최종 테스트한다."
> 이 파일이 사이클 규칙이다. BRIEF.md의 가드레일이 여기에도 그대로 적용된다.

## 팀
| 역할 | 누가 | 책임 | 산출물 |
|---|---|---|---|
| **기획자** (겸 개발) | 세션 본체 | 보완점에 대응하는 방안을 정하고 구현. 받아들이지 않을 땐 이유 | 코드, GDD.md, TALK.md의 ✏️ 블록 |
| **FUN QA** | 매 사이클 새 서브에이전트(기획자 결론을 주지 않고 빌드·지표·스크린샷만 준다) | 유저군별 재미 테스트, 보완점 전달 | TALK.md의 🧪 블록, FUN.md 기준 개정 |
| **PM** | 매 사이클 새 서브에이전트 | 마일스톤 목표·설계·일정, 품질 관리(QC), 오너 테스트 준비 판단 | MILESTONES.md, TALK.md의 📋 블록 |

- 서브에이전트는 파일을 직접 고치지 않고 글을 돌려준다. 기획자가 그대로 TALK.md에 옮긴다(편집·요약 금지, 길면 그 에이전트에게 줄여 달라고).
- 오너는 TALK.md(최신이 위)와 STATUS.md만 읽으면 된다.

## 한 사이클 (예약 작업, 1시간마다)
1. **동기화**: `git fetch origin factory && git checkout factory && git pull --rebase origin factory`, `npm ci`.
2. **읽기**: STATUS.md, MILESTONES.md(지금 마일스톤·남은 작업), TALK.md 맨 위 사이클.
3. **멈춤 확인**: STATUS `상태:`가 `오너 테스트 대기`면 → 오너 피드백(채팅·STATUS)이 있으면 반영하고, 없으면 아무것도 안 하고 한 줄 보고. `BLOCKED`도 한 줄 보고.
4. **기획자 작업**: 지난 사이클 🧪 보완점과 📋 PM 지시 중 우선순위 최상 1~2개를 구현(diff 약 400줄 이내). 기획 판단이 바뀌면 GDD.md도.
5. **측정**: `npx tsx studio/planet-guardian/build.ts` → `npx tsx studio/planet-guardian/funqa.ts` → `npx tsx studio/planet-guardian/shots.ts`(콘솔 에러 0이어야 함) → `npm run verify`.
   - **verify는 종료 코드로만 판정한다.** 출력을 grep·tail·head로 거르거나 파이프로 넘겨 종료 코드를 잃지 않고, 0이 아니면 push하지 않는다. (C008 위반 1건 뒤 추가)
6. **FUN QA** (Agent): FUN.md · reports/funqa.json · screens/*.png · 이번 diff 요약(무엇을 바꿨는지만, 왜 좋은지는 말하지 않음)을 주고 유저군별 평가 요청.
7. **기획자 응답**: 보완점마다 대응 방안(이번에 함/다음 사이클/안 함 + 이유).
8. **PM** (Agent): MILESTONES.md · STATUS.md · 이번 TALK 블록 · 지표를 주고 → 마일스톤 진척·일정 갱신·QC 판정. **완료 기준을 모두 넘고 QC 체크리스트 통과면 "오너 테스트 준비 완료"** 선언.
9. **기록**: TALK.md 맨 위에 사이클 블록(📋 → 🧪 → ✏️ 순서가 아니라 실제 대화 순서: ✏️ 한 일 → 🧪 평가 → ✏️ 응답 → 📋 PM). MILESTONES.md·STATUS.md 갱신.
10. **커밋·푸시**: "스튜디오 행성 수호대: C### <요약>". 거절되면 pull --rebase → verify → push. 배포는 Actions `deploy` 결과로 확인.
11. **오너 알림**: PM이 "오너 테스트 준비 완료"를 선언한 사이클에만 PushNotification(무엇을 테스트할지 3줄 + 주소). STATUS `상태: 오너 테스트 대기`로 바꾸고 다음 사이클부터 멈춤.

## 연속 실패
3사이클 연속 verify 실패로 push 못 함 → STATUS `상태: BLOCKED`, "오너에게"에 이유, 알림.
