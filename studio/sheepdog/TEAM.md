# 🐑 양치기 멍멍 스튜디오 — 팀과 한 사이클

> 오너 지시(2026-11-12, BRIEF.md 원문): 전문 기획자가 콘텐츠·시스템을 디테일하게 기획 → 개발자가 반영 → 디자이너가 상용화 수준 리소스 → FUN QA가 계속 재미 검증 → PM이 마일스톤마다 오너 빌드 테스트 요청, 허들 미달이면 마일스톤 재수립. 최종 목표는 상용화.
> 이 파일이 사이클 규칙이다. BRIEF.md 가드레일이 그대로 적용된다. 참고한 운영 방식: `studio/planet-guardian/TEAM.md`.

## 팀
| 역할 | 누가 | 언제 | 산출물 |
|---|---|---|---|
| 📋 **PM** | 매 사이클 새 서브에이전트 | 매 사이클 끝 | `MILESTONES.md`, TALK 📋 블록, "오너 빌드 테스트 준비 완료" 판정 |
| 📐 **기획자**(전문) | 서브에이전트 | 마일스톤 시작 · 기획 공백이 생길 때 · FUN QA가 시스템 문제를 짚을 때 | `GDD.md`, `CONTENT.md`, TALK 📐 블록 |
| 🎨 **디자이너** | 서브에이전트 | 마일스톤 시작 · 아트/UI 작업이 있는 사이클 · 스크린샷 리뷰 | `ART.md`, `assets/`(코드로 그린 SVG·캔버스 아트), TALK 🎨 블록 |
| ✏️ **개발자** | 세션 본체 | 매 사이클 | 코드·테스트·빌드, TALK ✏️ 블록 (기획과 다르게 구현하면 이유) |
| 🧪 **FUN QA** | 매 사이클 새 서브에이전트 — 기획·개발의 결론은 주지 않고 빌드·지표·스크린샷·diff 요약만 | 매 사이클 측정 뒤 | `FUN.md` 개정 제안, `reports/funqa.json` 해석, TALK 🧪 블록 |

- 서브에이전트는 파일을 고치지 않고 글을 돌려준다. 본체가 그대로 옮긴다(편집·요약 금지, 길면 줄여 달라고 다시 부탁).
- 오너는 `STATUS.md`와 `TALK.md`(최신이 위)만 읽으면 된다.

## 한 사이클 (1시간 예약 작업이 깨운다 — 정확히 한 번)
1. **동기화**: `git fetch origin factory && git checkout factory && git pull --rebase origin factory`, 필요하면 `npm ci`.
2. **읽기**: STATUS.md · MILESTONES.md(지금 마일스톤·남은 작업) · TALK.md 맨 위 사이클.
3. **멈춤 확인**: STATUS `상태:`가
   - `오너 테스트 대기` → 오너 피드백(채팅·STATUS)이 있으면 반영(통과면 다음 마일스톤, 미달이면 피드백을 STATUS·TALK에 원문 그대로 적고 PM이 마일스톤 재수립). 없으면 **아무것도 바꾸지 않고 한 줄 보고**(주소 포함).
   - `BLOCKED` → 한 줄 보고.
4. **기획·디자인(필요할 때)**: 마일스톤 첫 사이클이거나 이번 작업에 기획/아트 공백이 있으면 📐/🎨 에이전트에게 먼저 묻는다.
5. **개발**: MILESTONES의 남은 작업과 지난 🧪·📋 지시 중 우선순위 최상 1~2개(diff 약 400줄 이내). 기획이 바뀌면 GDD/CONTENT도.
6. **측정** (모두 종료 코드 확인):
   `npx tsx studio/sheepdog/build.ts` → `npx tsx studio/sheepdog/funqa.ts` → `npx tsx studio/sheepdog/shots.ts`(콘솔 에러 0) → `npm run verify`.
   - **verify는 종료 코드로만 판정**한다. 파이프로 거르지 않는다. 0이 아니면 push 금지. 테스트 약화·삭제·skip 금지.
   - UI를 건드렸으면 `screens/*.png`를 직접 열어 본다.
7. **🧪 FUN QA** (Agent): FUN.md · reports/funqa.json · screens/*.png · 이번 diff 요약(무엇을 바꿨는지만)을 주고 유저군별(처음/캐주얼/숙련) 평가와 보완점 3개 이내.
8. **✏️ 응답**: 보완점마다 이번에 함 / 다음 사이클 / 안 함 + 이유.
9. **📋 PM** (Agent): MILESTONES.md · STATUS.md · 이번 TALK 블록 · 지표 → 진척·일정·QC 판정. 완료 기준과 QC를 모두 넘으면 **"오너 빌드 테스트 준비 완료"**.
10. **기록**: TALK.md 맨 위에 `## C### (날짜) — 요약` 블록(실제 대화 순서: ✏️ 한 일 → 🧪 → ✏️ 응답 → 📋). MILESTONES·STATUS 갱신.
11. **커밋·푸시**: `스튜디오 양치기 멍멍: C### <요약>`. 거절되면 `git pull --rebase origin factory` → verify → push. force push 금지. 배포는 Actions `deploy` 결과로 확인.
12. **오너 알림**: PM이 준비 완료를 선언한 사이클에만 PushNotification(테스트할 것 3줄 + https://derrick1119.github.io/derrickkim1119/studio/sheepdog/). STATUS `상태: 오너 테스트 대기`. 그 뒤로는 새 기능을 만들지 않는다.
13. **요약**: 한국어 3줄. **첫 줄은 플레이 주소** https://derrick1119.github.io/derrickkim1119/studio/sheepdog/

## 수정 범위
`studio/sheepdog/`, `web/public/studio/sheepdog/`, `tests/studio-sheepdog*.test.ts` 뿐. 다른 곳은 읽기만.

## 연속 실패
3사이클 연속 verify 실패로 push 못 함 → STATUS `상태: BLOCKED`, '오너에게'에 이유, 알림.
