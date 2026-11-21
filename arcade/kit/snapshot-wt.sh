#!/bin/bash
# 작업 중 사본(0119 v2): 지정한 파일을 '지금 모습'으로 복사 → 깨끗한 worktree(HEAD + origin 병합)에 넣어 verify
# → 통과한 바로 그 사본을 worktree에서 커밋 → factory 가지를 그 커밋으로 옮김(작업 트리는 건드리지 않음) → push.
# 에이전트가 그사이 파일을 또 고쳐도, 검증된 사본만 올라간다.  사용: snapwt.sh "메시지" 파일...
cd /home/user/derrickkim1119 || exit 1
MSG=$1; shift
SP=${SCRATCH:?세션 임시 폴더를 SCRATCH로}
WT=$SP/wt-verify; SNAP=$SP/snap-copy
rm -rf $SNAP; mkdir -p $SNAP
for f in "$@"; do mkdir -p $SNAP/$(dirname $f); cp $f $SNAP/$f; done
git fetch -q origin factory
rm -rf $WT; git worktree prune; git worktree add -q --detach $WT HEAD || exit 1
ln -s /home/user/derrickkim1119/node_modules $WT/node_modules
cd $WT && git merge -q --no-edit origin/factory || { echo "MERGE FAILED"; exit 1; }
for f in "$@"; do cp $SNAP/$f $WT/$f; done
if git diff --quiet -- "$@"; then echo "nothing to commit"; cd /home/user/derrickkim1119; git worktree remove --force $WT; exit 0; fi
ok=0; for t in 1 2; do npm run verify > $WT.log 2>&1 && { ok=1; break; }; echo "verify try $t failed: $(grep -E 'Tests |error TS|Timeout calling' $WT.log | tr '\n' ' ' | cut -c1-200)"; done
[ $ok = 1 ] || { echo "VERIFY FAILED — nothing committed"; cd /home/user/derrickkim1119; git worktree remove --force $WT; exit 1; }
git add -- "$@" && git commit -q -m "$MSG

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: <세션 주소>" || exit 1
NEW=$(git rev-parse HEAD)
cd /home/user/derrickkim1119
git update-ref refs/heads/factory $NEW && git reset -q   # 가지·색인만 옮김, 작업 트리 그대로
git worktree remove --force $WT
for i in 2 4 8 16; do git push -q origin factory 2>&1 && break; sleep $i; echo "push retry — origin moved; rerun snapwt"; exit 1; done
git log --oneline -1 origin/factory | cut -c1-80
