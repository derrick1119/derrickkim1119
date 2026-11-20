// npx tsx <이 파일>  — 계기판과 같은 측정(24판 중앙값)
import { evaluateGame } from '/home/user/derrickkim1119/arcade/evaluate.ts';
import type { Bot, GameDef } from '/home/user/derrickkim1119/arcade/core.ts';
import { GAMEVAR as g, DUMBVAR as dumb, SMARTVAR as smart } from '/home/user/derrickkim1119/arcade/games/GAMEID.ts';
const t0 = performance.now();
const r = evaluateGame(g as GameDef<unknown>, dumb as Bot<unknown>, smart as Bot<unknown>);
console.log(JSON.stringify(r), ((performance.now() - t0) / 1000).toFixed(1) + 's');
