// 헤드리스 밸런스 테스트: node tools/simtest.mjs [runs]
import { Battle } from '../src/sim/battle.js';
import { STAGES, MAPS, foodCap } from '../src/data/stages.js';
import { UNITS } from '../src/data/units.js';

// 스테이지별 "평균적인" 플레이어 군대 (열, 줄 0=전열)
const ARMIES = [
  /*1-1 cap8 */ [['commander', 2.5, 0], ['sword', 2, 0], ['shield', 3, 0], ['xbow', 2.5, 1]],
  /*1-2 cap9 */ [['commander', 2.5, 1], ['sword', 1.5, 0], ['shield', 2.5, 0], ['spear', 3.5, 0], ['xbow', 2.5, 2]],
  /*1-3 cap10*/ [['commander', 2.5, 1], ['sword', 1.5, 0], ['shield', 2.5, 0], ['spear', 3.5, 0], ['xbow', 2, 2], ['priest', 3, 2]],
  /*1-4 cap11*/ [['commander', 2.5, 1], ['sword', 1.5, 0, 2], ['shield', 2.5, 0], ['spear', 3.5, 0], ['xbow', 2, 2, 2], ['priest', 3, 2]],
  /*2-1 cap12*/ [['commander', 2.5, 1], ['sword', 1.5, 0, 2], ['shield', 2.5, 0], ['spear', 3.5, 0], ['xbow', 1.5, 2, 2], ['priest', 2.5, 2], ['xbow', 3.5, 2, 2]],
  /*2-2 cap13*/ [['commander', 2.5, 1], ['sword', 1.5, 0, 2], ['shield', 2.5, 0, 2], ['spear', 3.5, 0], ['xbow', 1.5, 2, 2], ['priest', 2.5, 2], ['wizard', 3.5, 2]],
  /*2-3 cap14*/ [['commander', 2.5, 1], ['sword', 1.5, 0, 2], ['shield', 2.5, 0, 2], ['spear', 3.5, 0, 2], ['xbow', 1.5, 2, 2], ['priest', 2.5, 2], ['wizard', 3.5, 2]],
  /*2-4 cap15*/ [['commander', 2.5, 1, 2], ['sword', 1.5, 0, 2], ['shield', 2.5, 0, 2], ['spear', 3.5, 0, 2], ['xbow', 1.5, 2, 2], ['priest', 2.5, 2, 2], ['wizard', 3.5, 2], ['xbow', 4.5, 2, 2]],
  /*3-1 cap16*/ [['commander', 2.5, 1, 2], ['sword', 1.5, 0, 3], ['shield', 2.5, 0, 2], ['spear', 3.5, 0, 2], ['xbow', 1.5, 2, 2], ['priest', 2.5, 2, 2], ['wizard', 3.5, 2], ['knight', 0.5, 1]],
  /*3-2 cap17*/ [['commander', 2.5, 1, 2], ['sword', 1.5, 0, 3], ['shield', 2.5, 0, 3], ['spear', 3.5, 0, 2], ['xbow', 1.5, 2, 3], ['priest', 2.5, 2, 2], ['wizard', 3.5, 2, 2], ['knight', 0.5, 1]],
  /*3-3 cap18*/ [['commander', 2.5, 1, 2], ['sword', 1.5, 0, 3], ['shield', 2.5, 0, 3], ['spear', 3.5, 0, 2], ['xbow', 1.5, 2, 3], ['priest', 2.5, 2, 2], ['wizard', 3.5, 2, 2], ['knight', 0.5, 1, 2], ['xbow', 4.5, 2, 3]],
  /*3-4 cap19*/ [['commander', 2.5, 1, 3], ['sword', 1.5, 0, 3], ['shield', 2.5, 0, 3], ['spear', 3.5, 0, 3], ['xbow', 1.5, 2, 3], ['priest', 2.5, 2, 2], ['wizard', 3.5, 2, 2], ['knight', 0.5, 1, 2], ['berserk', 4.5, 0, 2]],
];
export function makeBattle(i, seed, armyOverride) {
  const st = STAGES[i];
  const army = (armyOverride || ARMIES[i]).map(([type, col, row, lvl]) => ({ type, col, row, lvl: lvl || 1, hold: false }));
  const enemy = st.enemy.map(([type, col, row, o]) => Object.assign({ type, col, row, lvl: st.lvl }, o || {}));
  return new Battle({ map: MAPS[st.map], player: army, enemy, seed, timeLimit: st.time, power: 1 + 0.1 * i, heroSkill: UNITS[army[0].type].skill });
}
function bot(b) { // 간단한 지휘 봇: 화살비/정화 굿/영웅기를 대충 쓴다
  if (b.morale >= 4) {
    let best = null, bs = 2.5; for (const u of b.units) { if (u.dead || u.team !== 1 || u.hidden > 0) continue; const s = b.clusterScore(u, 80); if (s > bs) { bs = s; best = u; } }
    let hurt = null, hs = 2.5; for (const u of b.units) { if (u.dead || u.team !== 0) continue; let n = 0; b.near(u.x, u.y, 100, o => { if (o.team === 0 && !o.dead && o.hp < o.maxHp * 0.6) n++; }); if (n > hs) { hs = n; hurt = u; } }
    if (hurt) b.cast('grail', hurt.x, hurt.y); else if (best) b.cast('rain', best.x, best.y);
  }
  if (b.heroCd <= 0 && b.hero()) { let best = null, bs = 2; for (const u of b.units) { if (u.dead || u.team !== 1) continue; const s = b.clusterScore(u, 80) + (u.def.boss ? 3 : 0); if (s > bs) { bs = s; best = u; } } if (best) b.cast(b.heroSkill, best.x, best.y); }
}
// 숙련 봇: 예고 장판 회피 + 기사 집중 공격까지 한다
function pro(b) {
  bot(b);
  const PRI = ['necro', 'shaman', 'catapult', 'garcher', 'skelarcher'];
  for (const sq of b.squads) {
    if (sq.team !== 0 || sq.alive <= 0) continue;
    let danger = null; for (const z of b.zones) if (z.kind === 'tele' && z.hits !== 1 && z.delay - z.t > 0.5 && Math.hypot(z.x - sq.cx, z.y - sq.cy) < z.r + 34) danger = z;
    if (danger) { if (sq.order.kind !== 'move' || !sq.dodge) { const dx = sq.cx - danger.x, dy = sq.cy - danger.y + 30, d = Math.hypot(dx, dy) || 1; b.orderMove(sq, danger.x + dx / d * (danger.r + 80), danger.y + dy / d * (danger.r + 80)); sq.dodge = true; } }
    else if (sq.dodge) { sq.dodge = false; b.orderAuto(sq); }
    else if (sq.type === 'knight' && sq.order.kind === 'auto') { for (const t of PRI) { const e = b.squads.find(q => q.team === 1 && q.alive > 0 && q.type === t); if (e) { b.orderFocus(sq, e); break; } } }
  }
}
// 캐주얼 봇: 굼뜨고 부정확하게 스킬을 쓴다 (실제 초보 플레이어 근사)
function casual(b) {
  if (b.rand() < 0.45) return;
  const foes = b.units.filter(u => !u.dead && u.team === 1 && u.hidden <= 0), mine = b.units.filter(u => !u.dead && u.team === 0);
  if (!foes.length || !mine.length) return;
  if (b.morale >= 5) {
    const hurt = mine.filter(u => u.hp < u.maxHp * 0.5);
    if (hurt.length >= 3 && b.rand() < 0.5) { const u = hurt[(b.rand() * hurt.length) | 0]; b.cast('grail', u.x, u.y); }
    else { const u = foes[(b.rand() * foes.length) | 0]; if (b.clusterScore(u, 80) >= 2) b.cast('rain', u.x + (b.rand() - 0.5) * 50, u.y + (b.rand() - 0.5) * 50); }
  }
  if (b.heroCd <= -2 && b.hero()) { const u = foes[(b.rand() * foes.length) | 0]; b.cast(b.heroSkill, u.x, u.y); }
}
export function botStep(b){ bot(b); }
if (process.argv[1] && process.argv[1].endsWith('simtest.mjs')) {
const runs = Number(process.argv[2] || 12);
const only = process.argv[3] !== undefined ? Number(process.argv[3]) : -1;
for (let i = 0; i < STAGES.length; i++) {
  if (only >= 0 && only !== i) continue;
  const modes = (process.argv[4] || 'auto,casual,bot').split(',');
  const res = { auto: [0, 0, 0], casual: [0, 0, 0], bot: [0, 0, 0], pro: [0, 0, 0] };
  for (const mode of modes) for (let k = 0; k < runs; k++) {
    const b = makeBattle(i, 100 + k * 7 + i);
    let steps = 0; while (!b.over && steps++ < 30 * 200) { b.step(1 / 30); b.events.length = 0; if (steps % 12 === 0) { if (mode === 'bot') bot(b); else if (mode === 'pro') pro(b); } if (mode === 'casual' && steps % 60 === 0) casual(b); }
    const r = res[mode]; if (b.winner === 0) r[0]++; r[1] += b.time; r[2] += b.lost;
  }
  const st = STAGES[i]; const f = r => `${String(Math.round(r[0] / runs * 100)).padStart(3)}% ${(r[1] / runs).toFixed(0).padStart(3)}s -${(r[2] / runs).toFixed(0).padStart(2)}`;
  console.log(st.id, st.name.padEnd(9), ...modes.flatMap(m => ['| ' + m, f(res[m])]), '| food', ARMIES[i].reduce((a, s) => a + UNITS[s[0]].cost, 0) + '/' + foodCap(i));
}
}
