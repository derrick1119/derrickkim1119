# 🧪 마녀 고양이 물약 정렬 스튜디오 — 팀과 자동 사이클

> 오너 지시(BRIEF.md): 전문 기획자가 콘텐츠·시스템을 기획 → 개발자가 반영 → 디자이너가 상용화 수준 리소스 → FUN QA가 재미 검증 → PM이 마일스톤마다 오너 빌드 테스트 요청, 허들 미달이면 재수립. 최종 목표 상용화.
> 이 파일이 사이클 규칙이다. BRIEF.md의 가드레일이 그대로 적용된다(수정 범위: `studio/potionsort/`, `web/public/studio/potionsort/`, `tests/studio-potionsort*.test.ts`).

## 팀 (이 세션 하나 — 본체 + 서브에이전트)
| 역할 | 누가 | 책임 | 산출물 |
|---|---|---|---|
| 📋 **PM** | 매 사이클 새 서브에이전트 | 마일스톤·일정·QC, 오너 테스트 준비 판단, 허들 미달이면 재수립 | `MILESTONES.md`, TALK 📋 |
| 📐 **기획자** | 서브에이전트(마일스톤 시작·필요할 때) | 핵심 루프·판 설계표·새것 곡선·경제·메타·온보딩·난이도·수익화 *설계안*·지표. 결정마다 "왜" | `GDD.md`, `CONTENT.md`, TALK 📐 |
| ✏️ **개발자** | 세션 본체 | 기획서대로 구현, 다르면 이유를 TALK에. 측정·테스트·빌드·배포 | 코드, `tests/studio-potionsort*.test.ts` |
| 🎨 **디자이너** | 서브에이전트 | 컨셉·팔레트·캐릭터 시트·UI 가이드, 코드로 그리는 아트·SVG·이펙트·효과음 설계. 외부 저작물 복사 금지 | `ART.md`, `assets/`, TALK 🎨 |
| 🧪 **FUN QA** | 매 사이클 새 서브에이전트 — 기획·개발의 결론은 주지 않고 빌드·지표·스크린샷만 | 처음/캐주얼/숙련 유저군별 재미 검증, 보완점, FUN 기준 개정 제안 | `FUN.md`, `reports/funqa.json`, TALK 🧪 |

- 서브에이전트는 파일을 고치지 않고 글을 돌려준다. 본체가 그대로 옮긴다(편집·요약 금지, 길면 그 에이전트에게 줄여 달라고).
- 오너는 `STATUS.md`와 `TALK.md`(최신이 위)만 읽으면 된다.

## 한 사이클 (예약 작업, 매시 :15)
1. **동기화**: `git fetch origin factory && git checkout factory && git pull --rebase origin factory`, 필요하면 `npm ci`.
2. **읽기**: STATUS.md · MILESTONES.md(지금 마일스톤·다음 사이클) · TALK.md 맨 위 사이클.
3. **멈춤 확인**: STATUS `상태: 오너 테스트 대기`면 → 오너 피드백(채팅·STATUS)이 있을 때만 반영, 없으면 한 줄 보고(주소 포함)하고 끝. `BLOCKED`도 한 줄 보고.
4. **작업**: 마일스톤 순서(📐 → 🎨 → ✏️)대로 1~2개, diff 약 400줄 이내. 기획이 바뀌면 GDD/CONTENT도.
5. **측정**: `npx tsx studio/potionsort/build.ts` → `npx tsx studio/potionsort/funqa.ts` → `npx tsx studio/potionsort/shots.ts`(종료 코드 0 = 콘솔 에러 0·가로 스크롤 없음·터치·키보드·저장 불가) → `npm run verify`.
   - **verify는 종료 코드로만 판정한다.** 출력을 파이프로 거르지 않고, 0이 아니면 push하지 않는다.
6. **🧪 FUN QA** (Agent): FUN.md · reports/funqa.json · screens/*.png · 이번 diff 요약(무엇을 바꿨는지만)을 주고 유저군별 평가.
7. **✏️ 응답**: 보완점마다 이번에 함/다음 사이클/안 함 + 이유.
8. **📋 PM** (Agent): MILESTONES · STATUS · 이번 TALK 블록 · 지표 → 진척·QC 판정. 완료 기준·QC를 모두 넘으면 **"오너 빌드 테스트 준비 완료"**.
9. **기록**: TALK.md 맨 위에 사이클 블록(실제 대화 순서), MILESTONES·STATUS 갱신.
10. **커밋·푸시**: "스튜디오 마녀 고양이 물약 정렬: C### <요약>". 거절되면 `git pull --rebase origin factory` → verify → push. force push 금지. 배포는 Actions `deploy` 결과로 확인(github.io 직접 접속은 막힘).
11. **오너 알림**: PM이 준비 완료를 선언한 사이클에만 PushNotification(테스트할 것 3줄 + https://derrick1119.github.io/derrickkim1119/studio/potionsort/). STATUS `상태: 오너 테스트 대기`.
12. **요약**: 사이클 끝 한국어 3줄, 첫 줄은 https://derrick1119.github.io/derrickkim1119/studio/potionsort/

## 연속 실패
3사이클 연속 verify 실패로 push 못 함 → STATUS `상태: BLOCKED`, "오너에게"에 이유, 알림.
