# 라운드 만들기 도구 (발견 공장, 0107)

라운드마다 쓰던 브리프·측정·스크린샷 도구. 전에는 세션 임시 폴더에만 있어서 컨테이너가 바뀌면 사라졌다 — 그래서 여기 둔다.

| 파일 | 쓰임 |
|---|---|
| `BRIEF.md` | 에이전트 공통 브리프(마지막: 40라운드 v21 — 생각 부담 없는 실시간 전투: 정답 있는 판·수 제한·힌트 금지 · 한 번에 여럿 · 성장은 저절로 · 맨 위 40라운드 부분 + 아래 v19 본문. v20(39 이어 다듬기·막힘 힌트)은 git 기록). 새 라운드는 이걸 복사해 '이번 라운드의 1순위'·재료·장르 목록만 바꾼다. 기준 1~23은 오너 피드백이 쌓인 것이라 지우지 않는다. |
| `TASK_COMMON.md` | 에이전트 과제 앞에 붙이는 공통 규칙(파일 하나만, git은 `show`·`log`만 — `status`도 금지, 잠금 파일 사고 0103). |
| `eval.TEMPLATE.ts` | 게임 하나 24판 측정(계기판과 같은 `evaluateGame`). GAMEID·GAMEVAR·DUMBVAR·SMARTVAR를 바꿔 `npx tsx`. |
| `snap-entry.TEMPLATE.ts` · `snap.html` · `snap.TEMPLATE.cjs` | 잘하는 봇으로 지정한 초마다 캔버스를 그려 `snap.png` 한 장으로. `npx esbuild <폴더>/snap-entry.ts --bundle --outfile=<폴더>/snap.js` 뒤 `node <폴더>/snap.cjs 1,3,30,90`. |
| `browser-check.cjs` | 실제 계기판(390px)에서 게임마다 9초 기다림 → 긋기 3번 → 톡 5번, 스크린샷·콘솔 에러·가로 스크롤 확인. 0112부터 소리도 셈: `sound <id> idle N touched M ctx running`(만지는 동안 M > 0이어야 함), 끝에 `muted: new sounds 0`·단추 글자 모두 '꺼짐'. |
| `frame-check.cjs` | (0118) 느린 폰 흉내: CPU 4배 느리게 하고 게임마다 기다림 3초 + 톡·긋기 5초 동안 프레임 간격과 **게임 코드 시간**(rAF 콜백). 볼 숫자는 게임 코드 — 중앙 ≤ 8ms · p95 ≤ 16ms 권장. 간격은 헤드리스가 GPU 없이 칠해서 과장됨. `node arcade/kit/frame-check.cjs id1,id2 [4] [3]` |
| `studio-brief.TEMPLATE.md` · `studio-status.TEMPLATE.md` | (0121) 졸업 때 `studio/<id>/BRIEF.md`·`STATUS.md`를 만드는 틀(동물 군단 브리프에서 일반화, 오너 기준 1~12를 38라운드까지로 새로 씀). `{{...}}` 칸을 채운다. 졸업 순서: 틀 채우기 → `create_session`(세션 첫 말에 BRIEF 읽기) → 그 세션에 `create_trigger` 매시(공장 :10과 겹치지 않게) → 레지스트리에서 빼고 ab.json `graduated`. |
| `snapshot-wt.sh` | (0119) 에이전트가 고치는 중에도 안전한 작업 중 사본: 지정한 파일의 '지금 모습'을 복사 → 깨끗한 worktree(HEAD + origin)에서 verify → **통과한 그 사본만** 커밋 → 가지만 옮기고 작업 트리는 그대로 → push. `SCRATCH=<임시 폴더> arcade/kit/snapshot-wt.sh "메시지" arcade/games/<id>.ts` (`<세션 주소>`는 바꿔 쓴다). 옛 `snapshot.sh`는 검증과 커밋 사이에 파일이 바뀌면 깨진 사본을 커밋할 수 있다. |
| `hint-check.cjs` | (0123) 실제 계기판에서 막힘 힌트 점검: 시작 5초 → 전구 톡 → 18초 가만히, 게임마다 스크린샷 셋(`<id>-0before/1hint/2idle.png`)·콘솔 에러. |
| `snapshot.sh` | 에이전트가 만드는 중인 `arcade/games/` 파일을 '작업 중 사본'으로 커밋 → `pull --no-rebase` → verify(두 번까지) → 통과할 때만 push. 오래된 `index.lock`(60초 넘음·git 프로세스 없음)은 지우고, 커밋 실패는 "COMMIT FAILED"로 알린다. 절대 stash·checkout·reset 하지 않는다(에이전트 파일 보호). |

`<작업 폴더>`는 세션의 임시 폴더(예: 세션 scratchpad)로 바꿔 쓴다. 에이전트마다 `<작업 폴더>/diorama/<id>/`에 임시 파일을 둔다.

## 라운드를 열 때 (공장이 직접)
- 게임 측정 뒤 `ab.json` 새 라운드의 `machinePick`·`machinePick2`는 `arcade/picks.ts` 계산 그대로(0114, `tests/arcade-picks.test.ts`가 맞춰 봄). 계기판이 같은 계산을 '기계 추천(참고만)'으로 보인다.
- `npx tsx arcade/cli-dashboard.ts --cycle NNNN` → `node arcade/kit/browser-check.cjs <id들> <폴더>`: 콘솔 에러 0 · 가로 스크롤 390 · 게임마다 소리 남 · 끄기 맞음을 확인하고 실험 기록에 적는다.
- 아이디어 메뉴(0117): 다음 라운드 초안은 `arcade/menus/round<N>.draft.json`(계기판 메뉴 모양 + `exists` 이미 있음 위험 + `alternates`). `tests/arcade-menu.test.ts`가 모든 메뉴의 칸을 검사한다(아직 안 고른 메뉴는 첫 3초·깊이까지).
