#!/bin/bash
R=${1:?repo root}; D=$(cd "$(dirname "$0")" && pwd); O=$(mkdir -p "${2:-$D/out}" && cd "${2:-$D/out}" && pwd)
cd $D
(node cap.js $R pro $O/pro.json 900 > $O/pro.log 2>&1) &
(node cap.js $R ch2 $O/ch2.json 900 > $O/ch2.log 2>&1; node cap.js $R ch5 $O/ch5.json 900 > $O/ch5.log 2>&1) &
(node cap.js $R ch3 $O/ch3.json 900 > $O/ch3.log 2>&1; node cap.js $R ch6 $O/ch6.json 900 > $O/ch6.log 2>&1) &
(node cap.js $R ch4 $O/ch4.json 900 > $O/ch4.log 2>&1; node cap.js $R ch7 $O/ch7.json 900 > $O/ch7.log 2>&1) &
wait
cat $O/*.log
