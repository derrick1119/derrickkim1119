#!/bin/bash
# 작업 중 사본: 커밋 → 리베이스 → verify(실패면 한 번 다시) → 통과할 때만 push. 절대 stash로 파일을 치우지 않는다.
cd /home/user/derrickkim1119 || exit 1
L=${TMPDIR:-/tmp}/snapverify.log
LK=.git/index.lock
if [ -f $LK ] && [ $(( $(date +%s) - $(stat -c %Y $LK) )) -gt 60 ] && ! pgrep -f "[ /]git (commit|add|merge|pull|status|rebase|checkout|fetch)" >/dev/null; then echo "stale index.lock removed"; rm -f $LK; fi
git add arcade/games/ && git commit -q -m "$1

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: <세션 주소>" || { git diff --quiet arcade/games/ && echo "nothing to commit" || echo "COMMIT FAILED"; }
git pull -q --no-rebase --no-edit origin factory || { echo "PULL FAILED"; exit 1; }
ok=0
for t in 1 2; do npm run verify > $L 2>&1 && { ok=1; break; }; echo "verify try $t failed: $(grep -E 'Tests |Errors|Timeout calling' $L | tr '\n' ' ' | cut -c1-200)"; done
[ $ok = 1 ] || { echo "VERIFY FAILED — not pushing"; exit 1; }
for i in 2 4 8 16; do git push -q origin factory 2>&1 && break; sleep $i; git pull -q --no-rebase --no-edit origin factory || exit 1; npm run verify > $L 2>&1 || { echo "VERIFY FAILED after re-pull — not pushing"; exit 1; }; done
git log --oneline -1 origin/factory | cut -c1-70; git status --short
