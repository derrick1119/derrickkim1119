# 👻 몸 갈아타기 스튜디오 — 팀과 자동 사이클

> 오너 지시(2026-11-21, 40라운드 졸업): "1번 아이디어 재밌네. 별도 스튜디오 차려서 하자. 대신에 AAA 게임급으로 만들어줘" · 운영 방식(2026-11-12): 전문 기획자 → 개발자 반영 → 디자이너 상용 리소스 → FUN QA 재미 검증 → PM 마일스톤·오너 빌드 테스트.
> 이 파일이 사이클 규칙이다. `BRIEF.md`의 가드레일(수정 범위: `studio/bodyhop/`·`web/public/studio/bodyhop/`·`tests/studio-bodyhop*.test.ts`뿐)이 여기에도 그대로 적용된다.
> 본보기: 🥷 느린 시간 닌자 `git show c410ba3:studio/slowdash/TEAM.md`. 그 팀의 교훈 — 작은 그림 고치기에 사이클을 쓰면 폐기된다 → **매 사이클은 '한 화면 전체가 한 단계 좋아짐'**.

## 팀 (이 세션 하나 = 본체 + Agent 서브에이전트)
| 역할 | 누가 | 책임 | 산출물 |
|---|---|---|---|
| 📋 **PM** | 매 사이클 새 서브에이전트 | 마일스톤 수립·일정·QC, 오너 빌드 테스트 요청 판단, 허들 미달이면 재수립 | `MILESTONES.md`, TALK 📋 |
| 📐 **기획자** | 서브에이전트(마일스톤 시작·필요할 때) | 핵심 루프·판 설계표·새것 곡선·경제·메타·온보딩·난이도·수익화 설계안·지표. 결정마다 "왜" | `GDD.md`, `CONTENT.md`, TALK 📐 |
| ✏️ **개발자** | 세션 본체 | 기획서대로 구현. 기획과 다르게 하면 TALK에 이유 | 코드·테스트·빌드 |
| 🖌️ **아트 디렉터** | 서브에이전트(M0 바이블, 이후 마일스톤마다) | AAA 아트 기준(세계관·팔레트·조명·재질·캐릭터 시트·애니 원칙·UI 스타일) 수호, 화면 승인/반려(ART §11 체크리스트) | `ART.md`, TALK 🖌️ |
| 🎨 **디자이너** | 서브에이전트 | 바이블에 따른 리소스 설계(부품 아틀라스·아이콘·이펙트·UI 요소). 외부 저작물 복사 금지 | `assets/`, TALK 🎨 |
| 🎧 **사운드 디자이너** | 서브에이전트(마일스톤마다) | 효과음 층·몸별 소리·적응형 음악·믹스. 전부 WebAudio 합성, 외부 음원 금지 | `AUDIO.md`, TALK 🎧 |
| 🧪 **FUN QA** | 매 사이클 새 서브에이전트(기획·개발의 결론을 주지 않고 빌드·지표·스크린샷만) | 처음/캐주얼/숙련별 재미 검증, 보완점, FUN 기준 개정 제안 | `FUN.md`, `reports/funqa.json`, TALK 🧪 |
| 👁 **화면 비평** | 매 사이클 새 서브에이전트 — **코드를 보지 않고 스크린샷 PNG만** | AAA 게임 화면과 나란히 놓고 [치명]/[큼]/[작음] · 화면 번호·자리 · 고치는 방향 | TALK 👁, `CRITIC-*.md` |

- 서브에이전트는 파일을 직접 고치지 않고 글을 돌려준다. 본체가 그대로 옮긴다(긴 것은 그 에이전트에게 줄여 달라고).
- 오너는 `STATUS.md`와 `TALK.md`(최신이 위)만 읽으면 된다.

## 파일
| 파일 | 무엇 |
|---|---|
| `game.ts` | 결정적 시뮬레이션 + 그리기 + 봇 (M0: 공장 `arcade/games/bodyhop.ts` 복사본) |
| `core.ts` · `rng.ts` · `juice.ts` · `sfx.ts` | 공통 틀·난수·연출·효과음 (공장 코드 복사본 — 이제 이 팀 것) |
| `main.ts` · `index.html` · `build.ts` | 플레이 빌드 → `web/public/studio/bodyhop/index.html` (한 장, gzip 기록) |
| `shots.cjs` | 실제 브라우저 스크린샷·콘솔 에러·가로 스크롤 → `screens/` (`node studio/bodyhop/shots.cjs 390`) |
| `funqa.ts`(M0 남은 일) | 봇 측정(잘하는·버릇·무작위·버티기 × 판 × 시드) → `reports/funqa.json` |
| `perf.cjs`(M1 S1) | CPU 4배 느림 게임 코드 프레임 시간(공장 `arcade/kit/frame-check.cjs` 본떠) |
| 테스트 | `tests/studio-bodyhop*.test.ts` (가볍게 — 표본 작게, CI 시간 초과 주의) |

## 한 사이클 (예약 작업, 매시 :40)
1. **동기화**: `git fetch origin factory && git checkout factory && git pull --rebase origin factory`, 필요하면 `npm ci`.
2. **읽기**: STATUS.md, MILESTONES.md(지금 마일스톤·남은 묶음), TALK.md 맨 위 사이클.
3. **멈춤 확인**: STATUS `상태:`가 `오너 테스트 대기`면 오너 피드백(채팅·STATUS)이 있을 때만 반영, 없으면 아무것도 안 하고 한 줄 보고(주소 포함). `BLOCKED`도 한 줄 보고.
4. **작업**: 이번 마일스톤의 다음 묶음(S1, S2…) 1개(diff 약 400줄 이내). 한 층을 **월드 1 전 판에 한꺼번에** 바꾼다. 전/후 스크린샷 한 쌍을 TALK에.
5. **측정**: `npx tsx studio/bodyhop/build.ts` → (funqa) → `node studio/bodyhop/shots.cjs 390`(콘솔 에러 0, 가로 스크롤 0) → 스크린샷을 직접 본다 → `npm run verify`.
   - **verify는 종료 코드로만 판정한다.** 출력을 파이프로 거르지 않는다. 0이 아니면 push하지 않는다.
6. **👁 화면 비평 루프**: 스크린샷을 스크래치 폴더에 복사 → 👁(코드 안 봄)가 PNG만 보고 비평 → [치명]·[큼] 중 이번 묶음 범위 안의 것은 고치고 다시 찍어 재비평. 범위 밖은 MILESTONES의 해당 묶음으로 보낸다(같은 그림 요소를 2사이클 넘게 연속으로 손대지 않는다). [작음]은 S12에 모아서.
7. **🧪 FUN QA** (Agent): FUN.md · reports/funqa.json · screens/*.png · 이번 diff 요약만 주고 유저군별 평가.
8. **✏️ 응답**: 보완점마다 이번에 함 / 다음 사이클 / 안 함 + 이유.
9. **📋 PM** (Agent): MILESTONES·STATUS·이번 TALK 블록·지표 → 진척·일정·QC. 완료 기준을 모두 넘으면 **"오너 빌드 테스트 준비 완료"**.
10. **기록**: TALK.md 맨 위에 사이클 블록. MILESTONES·STATUS 갱신.
11. **커밋·푸시**: "스튜디오 몸 갈아타기: <요약>" + 저장소 기본 Co-Authored-By·Claude-Session 줄(모델 이름은 넣지 않는다). 거절되면 `git pull --rebase origin factory` → verify → push. force push 금지. 배포는 GitHub Actions `deploy` 결과로 확인.
12. **오너 알림**: PM이 준비 완료를 선언한 사이클에만 PushNotification(무엇을 테스트할지 3줄 + 전체 주소). STATUS `상태: 오너 테스트 대기`.
13. **사이클 끝 한국어 3줄 요약** — 첫 줄은 항상 `https://derrick1119.github.io/derrickkim1119/studio/bodyhop/`.

## 오너 테스트 이후
- **통과** → 다음 마일스톤. **허들 미달** → 오너 말을 STATUS·TALK에 그대로 적고, PM이 마일스톤을 재수립(MILESTONES의 R1~R6).

## 지킬 선 (코어)
톡 = 가장 가까운 적으로 갈아타기 · 버린 몸 펑 · 새 몸 큰 기술 바로 · 몸이 저절로 싸움 · 기운 고리 약 1초. 카드·퍼즐·정답 있는 판·수 제한으로 바꾸지 않는다(⚔️ 동물 군단 교훈).

## 연속 실패
3사이클 연속 verify 실패로 push 못 함 → STATUS `상태: BLOCKED`, 이유, 알림.
