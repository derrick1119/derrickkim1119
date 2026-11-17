// 길을 글자로 찍어 본다:  node tools/map.mjs [x0] [x1]
import { LEVEL as L } from '../js/levels.js';
const x0 = +(process.argv[2] || 0), x1 = +(process.argv[3] || L.w - 1);
const g = [];
for (let y = 0; y < L.h; y++) { g.push([]); for (let x = 0; x < L.w; x++) g[y].push(' .~'[L.tiles[y * L.w + x]] === '.' ? '#' : L.tiles[y * L.w + x] === 2 ? '~' : ' '); }
const put = (c, x, y) => { const tx = Math.floor(x), ty = Math.floor(y); if (g[ty] && g[ty][tx] === ' ') g[ty][tx] = c; };
for (const s of L.shards) put('^', s.x, s.y);
for (const c of L.crates) put('c', c.x, c.y - 0.5);
for (const l of L.lanterns) put('L', l.x, l.y - 0.5);
for (const r of L.roosts) put('m', r.x, r.y);
for (const s of L.stalkers) put('s', s.x, s.y - 0.5);
for (const f of L.flowers) put('*', f.x, f.y - 0.5);
for (const wt of L.watchers) put('W', wt.x, wt.y);
for (const lf of L.lifts) { put('=', lf.x, lf.y0); put('=', lf.x + 1, lf.y0); }
put('@', L.start.x, L.start.y - 0.5); put('O', L.lamp.x, L.lamp.y - 0.5);
let ruler = '   ';
for (let x = x0; x <= x1; x++) ruler += x % 10 === 0 ? String(Math.floor(x / 10) % 10) : x % 5 === 0 ? '+' : ' ';
console.log(ruler);
for (let y = 0; y < L.h; y++) console.log(String(y).padStart(2) + ' ' + g[y].slice(x0, x1 + 1).join(''));
