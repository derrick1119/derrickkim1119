// 스테이지 생성기: 무작위 판을 많이 만들고, 풀이기로 걸러 "풀 만한" 것만 남긴다.
//   node tools/gen.mjs            → js/levels-gen.js 를 다시 쓴다 (시드가 고정이라 결과는 늘 같다)
//   node tools/gen.mjs --n 3000   → 장마다 후보 수 조절
//
// 남기는 기준
//   · 빛꽃을 모두 피우고 깰 수 있다. 스위치 없이는 깰 수 없다.
//   · 판에 놓인 것(그림자·상자·등불·나방)은 하나하나 빼 보았을 때 답이 달라져야 한다 (장식이 아니다).
//   · 최소 턴 수가 장마다 정한 범위 안이다.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseLevel } from '../js/rules.js';
import { solve, replay } from '../js/solver.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const N = +(args[args.indexOf('--n') + 1] || 0) || 5000;

function rng32(seed) {
  let s = seed >>> 0;
  return () => {
    let t = (s += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// 장마다의 재료와 난이도 범위
const CHAPTERS = [
  { id: 1, seed: 11, keep: 5, mult: 1, w: [5, 6], h: [4, 5], channels: [1, 2], holes: [0, 2], walls: [0, 2], extra: [0, 2], shadows: [0, 0], crates: [0, 0], lanterns: [0, 0], moths: [0, 0], par: [9, 20], toggles: 2 },
  { id: 2, seed: 22, keep: 5, mult: 1.5, w: [5, 7], h: [4, 6], channels: [1, 2], holes: [0, 2], walls: [0, 3], extra: [0, 2], shadows: [1, 2], crates: [0, 0], lanterns: [0, 0], moths: [0, 0], par: [11, 26], toggles: 2 },
  { id: 3, seed: 33, keep: 5, mult: 5, w: [5, 7], h: [5, 6], channels: [1, 2], holes: [0, 2], walls: [0, 3], extra: [0, 3], shadows: [0, 1], crates: [1, 2], lanterns: [1, 1], moths: [0, 0], par: [14, 34], toggles: 2 },
  { id: 4, seed: 44, keep: 5, mult: 0.7, w: [6, 7], h: [5, 6], channels: [1, 2], holes: [0, 2], walls: [0, 3], extra: [0, 3], shadows: [0, 1], crates: [0, 1], lanterns: [0, 1], moths: [1, 2], par: [14, 38], toggles: 2 },
];

function candidate(rnd, c) {
  const ri = ([a, b]) => a + Math.floor(rnd() * (b - a + 1));
  const W = ri(c.w), H = ri(c.h);
  const g = Array.from({ length: H }, () => Array(W).fill('.'));
  const stone = () => { const r = rnd(); return r < 0.34 ? 'D' : r < 0.74 ? 'N' : ' '; };
  for (let k = ri(c.channels); k > 0; k--) {
    if (rnd() < 0.5 && W >= 5) { const x = 1 + Math.floor(rnd() * (W - 2)); for (let y = 0; y < H; y++) g[y][x] = stone(); }
    else { const y = 1 + Math.floor(rnd() * (H - 2)); for (let x = 0; x < W; x++) g[y][x] = stone(); }
  }
  const cell = () => [Math.floor(rnd() * W), Math.floor(rnd() * H)];
  for (let k = ri(c.holes); k > 0; k--) { const [x, y] = cell(); g[y][x] = ' '; }
  for (let k = ri(c.extra); k > 0; k--) { const [x, y] = cell(); g[y][x] = rnd() < 0.5 ? 'D' : 'N'; }
  for (let k = ri(c.walls); k > 0; k--) { const [x, y] = cell(); if (g[y][x] === '.') g[y][x] = '#'; }
  const floors = () => { const out = []; for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (g[y][x] === '.') out.push([x, y]); return out; };
  const take = (ch) => { const f = floors(); if (!f.length) return null; const [x, y] = f[Math.floor(rnd() * f.length)]; g[y][x] = ch; return [x, y]; };
  const s = take('S');
  if (!s) return null;
  // 출구는 시작에서 먼 쪽으로
  const f = floors().sort((a, b) => (Math.abs(b[0] - s[0]) + Math.abs(b[1] - s[1])) - (Math.abs(a[0] - s[0]) + Math.abs(a[1] - s[1])));
  if (f.length < 6) return null;
  const e = f[Math.floor(rnd() * Math.min(3, f.length))];
  if (Math.abs(e[0] - s[0]) + Math.abs(e[1] - s[1]) < 4) return null;
  g[e[1]][e[0]] = 'E';
  for (let k = 0; k < 3; k++) if (!take('*')) return null;
  for (let k = ri(c.lanterns); k > 0; k--) take('L');
  for (let k = ri(c.crates); k > 0; k--) take('c');
  for (let k = ri(c.shadows); k > 0; k--) take('s');
  for (let k = ri(c.moths); k > 0; k--) take('w');
  return g.map((r) => r.join(''));
}

// k 번째 기호 ch 를 다른 것으로 바꾼 판
function swap(rows, ch, nth, to) {
  let seen = 0;
  return rows.map((r) => r.split('').map((x) => (x === ch && seen++ === nth ? to : x)).join(''));
}
const count = (rows, ch) => rows.join('').split(ch).length - 1;

function evaluate(rows, c) {
  const L = parseLevel({ rows });
  const r = solve(L, { max: 120000 });
  if (!r.full || r.capped) return null;
  const par = r.full.turns;
  if (par < c.par[0] || par > c.par[1]) return null;
  if (solve(L, { max: 60000, noToggle: true, wantFull: false }).any) return null;
  const st = replay(L, r.full.path);
  if (st.toggles < c.toggles) return null;
  // 놓인 것 하나하나가 답을 바꾸는가 (빼 보았는데 최소 턴이 그대로면 장식일 뿐이다)
  for (const ch of ['s', 'c', 'L', 'w']) {
    for (let k = 0; k < count(rows, ch); k++) {
      // 등불은 맨바닥이 되면 길이 열려 버리므로 벽으로 바꿔 본다
      const alt = swap(rows, ch, k, ch === 'L' ? '#' : '.');
      const ra = solve(parseLevel({ rows: alt }), { max: 120000 });
      if (ra.full && ra.full.turns === par && !ra.capped) return null;
    }
  }
  const area = L.W * L.H;
  const score = par + st.toggles * 1.5 + (st.pushes ? 4 + st.pushes : 0) + st.lanterns * 3 + st.falls * 4 + st.cracks * 1 - area * 0.12 + (r.any.turns < par ? 2 : 0);
  return { rows, par, parAny: r.any.turns, sol: r.full.path, score, st, states: r.states, sig: `${L.W}x${L.H}:${st.toggles}:${st.pushes}:${st.lanterns}:${st.falls}:${st.cracks}` };
}

const out = [];
for (const c of CHAPTERS) {
  const rnd = rng32(c.seed * 7919);
  const pool = [];
  const seen = new Set();
  const t0 = Date.now();
  const tries = Math.round(N * (c.mult || 1));
  for (let i = 0; i < tries; i++) {
    const rows = candidate(rnd, c);
    if (!rows) continue;
    const key = rows.join('/');
    if (seen.has(key)) continue;
    seen.add(key);
    const ev = evaluate(rows, c);
    if (ev) pool.push(ev);
  }
  pool.sort((a, b) => b.score - a.score);
  // 비슷한 것끼리 몰리지 않게 고른다
  const picks = [], sigs = {};
  for (const p of pool) {
    if ((sigs[p.sig] || 0) >= 1) continue;
    sigs[p.sig] = (sigs[p.sig] || 0) + 1;
    picks.push(p);
    if (picks.length >= c.keep) break;
  }
  for (const p of pool) { if (picks.length >= c.keep) break; if (!picks.includes(p)) picks.push(p); }
  picks.sort((a, b) => a.par - b.par);
  console.log(`장 ${c.id}: 후보 ${tries} → 통과 ${pool.length} → ${picks.length}개 채택  (${((Date.now() - t0) / 1000).toFixed(1)}초)`);
  for (const p of picks) console.log(`   최소 ${String(p.par).padStart(2)}턴 (출구만 ${p.parAny})  스위치 ${p.st.toggles} 밀기 ${p.st.pushes} 등불 ${p.st.lanterns} 추락 ${p.st.falls} 금 ${p.st.cracks}  ${p.rows.join(' / ')}`);
  picks.forEach((p, i) => out.push({ chapter: c.id, n: i, rows: p.rows, par: p.par, parAny: p.parAny, sol: p.sol }));
}

const body = out.map((l) => `  { chapter: ${l.chapter}, rows: ${JSON.stringify(l.rows)}, par: ${l.par}, parAny: ${l.parAny}, sol: '${l.sol}' },`).join('\n');
fs.writeFileSync(path.join(root, 'js', 'levels-gen.js'), `// tools/gen.mjs 가 만든 파일입니다. 손으로 고치지 말고 생성기를 다시 돌리세요.\nexport const GENERATED = [\n${body}\n];\n`);
console.log(`js/levels-gen.js 에 ${out.length}개 저장`);
