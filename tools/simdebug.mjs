// 피해 출처 분석: node tools/simdebug.mjs <stageIdx> [bot]
import { makeBattle, botStep } from './simtest.mjs';
const i = Number(process.argv[2] || 0), useBot = process.argv[3] === 'bot';
const b = makeBattle(i, 123);
const dealt = {}, taken = {};
const orig = b.damage.bind(b);
b.damage = (t, amt, src, kind, ox, oy) => { const before = t.hp; const d = orig(t, amt, src, kind, ox, oy); const key = (src ? src.type : 'zone') + ':' + kind; const real = Math.min(before, d); (t.team === 0 ? taken : dealt)[key] = ((t.team === 0 ? taken : dealt)[key] || 0) + real; return d; };
let steps = 0; const log = [];
while (!b.over && steps++ < 30 * 200) { b.step(1 / 30); b.events.length = 0; if (useBot && steps % 15 === 0) botStep(b); if (steps % 150 === 0) log.push(`t=${b.time.toFixed(0)} blue=${b.count(0)} (${b.hpSum(0).toFixed(0)}) red=${b.count(1)} (${b.hpSum(1).toFixed(0)}) morale=${b.morale.toFixed(1)}`); }
console.log(log.join('\n'));
console.log('winner', b.winner, b.reason, 't', b.time.toFixed(1), 'lost', b.lost);
const sort = o => Object.entries(o).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}=${v.toFixed(0)}`).join('  ');
console.log('player took:', sort(taken)); console.log('player dealt:', sort(dealt));
