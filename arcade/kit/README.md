# 라운드 만들기 도구 (발견 공장, 0107)

라운드마다 쓰던 브리프·측정·스크린샷 도구. 전에는 세션 임시 폴더에만 있어서 컨테이너가 바뀌면 사라졌다 — 그래서 여기 둔다.

| 파일 | 쓰임 |
|---|---|
| `BRIEF.md` | 에이전트 공통 브리프(마지막: 37라운드 v18 — 살아 움직이는 세계). 새 라운드는 이걸 복사해 '이번 라운드의 1순위'·재료·장르 목록만 바꾼다. 기준 1~23은 오너 피드백이 쌓인 것이라 지우지 않는다. |
| `TASK_COMMON.md` | 에이전트 과제 앞에 붙이는 공통 규칙(파일 하나만, git은 `show`·`log`만 — `status`도 금지, 잠금 파일 사고 0103). |
| `eval.TEMPLATE.ts` | 게임 하나 24판 측정(계기판과 같은 `evaluateGame`). GAMEID·GAMEVAR·DUMBVAR·SMARTVAR를 바꿔 `npx tsx`. |
| `snap-entry.TEMPLATE.ts` · `snap.html` · `snap.TEMPLATE.cjs` | 잘하는 봇으로 지정한 초마다 캔버스를 그려 `snap.png` 한 장으로. `npx esbuild <폴더>/snap-entry.ts --bundle --outfile=<폴더>/snap.js` 뒤 `node <폴더>/snap.cjs 1,3,30,90`. |
| `browser-check.cjs` | 실제 계기판(390px)에서 게임마다 9초 기다림 → 긋기 3번 → 톡 5번, 스크린샷·콘솔 에러·가로 스크롤 확인. |
| `snapshot.sh` | 에이전트가 만드는 중인 `arcade/games/` 파일을 '작업 중 사본'으로 커밋 → `pull --no-rebase` → verify(두 번까지) → 통과할 때만 push. 오래된 `index.lock`(60초 넘음·git 프로세스 없음)은 지우고, 커밋 실패는 "COMMIT FAILED"로 알린다. 절대 stash·checkout·reset 하지 않는다(에이전트 파일 보호). |

`<작업 폴더>`는 세션의 임시 폴더(예: 세션 scratchpad)로 바꿔 쓴다. 에이전트마다 `<작업 폴더>/diorama/<id>/`에 임시 파일을 둔다.
