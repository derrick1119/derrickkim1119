// 길을 글자로 찍어 본다:  node tools/map.mjs <stage 0-3> [x0] [x1]
import { LEVELS } from '../js/levels.js';
const L = LEVELS[+(process.argv[2] || 0)], x0 = +(process.argv[3] || 0), x1 = +(process.argv[4] || L.w - 1);
const g = [];
for (let y = 0; y < L.h; y++) { g.push([]); for (let x = 0; x < L.w; x++) g[y].push(' #W='[L.tiles[y * L.w + x]]); }
const put = (c, x, y) => { const tx = Math.floor(x), ty = Math.floor(y); if (g[ty] && g[ty][tx] !== undefined && g[ty][tx] === ' ') g[ty][tx] = c; };
for (const b of L.day) put('D', b.x, b.y);
for (const b of L.night) put('N', b.x, b.y);
for (const c of L.crystals) put('c', c.x, c.y);
for (const gt of L.gates) for (let y = gt.y; y < gt.y + gt.h; y++) for (let x = gt.x; x < gt.x + gt.w; x++) put(gt.trap ? '_' : '|', x, y);
for (const c of L.lichens) put('f', c.x, c.y);
for (const r of L.ropes) put('r', r.x, r.y1 - 0.5);
for (const s of L.slabs) for (let x = s.x; x < s.x + s.w; x++) put('~', x, s.y);
for (const s of L.shrines) put('L', s.x, s.y - 0.5);
for (const v of L.vessels) put({ lantern: 'o', sword: 't', bow: ')' }[v.kind], v.x, v.y - 0.5);
for (const c of L.creatures) put({ dusky: 's', little: 'i', moth: 'm', guardian: 'G' }[c.kind], c.x, c.y - 0.3);
put('@', L.start.x, L.start.y); put('O', L.goal.x, L.goal.y - 0.5);
let ruler = '   ';
for (let x = x0; x <= x1; x++) ruler += x % 10 === 0 ? String(Math.floor(x / 10) % 10) : x % 5 === 0 ? '+' : ' ';
console.log(`${L.id}  ${L.w}×${L.h}  아이들 ${L.creatures.length}`); console.log(ruler);
for (let y = 0; y < L.h; y++) console.log(String(y).padStart(2) + ' ' + g[y].slice(x0, x1 + 1).join(''));
