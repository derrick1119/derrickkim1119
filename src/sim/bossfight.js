// 두목의 수: 고개마다 옛이야기 속 요괴가 저마다 다른 방식으로 싸운다.
// 전투 본체(battle.js)는 네 군데에서만 이 파일을 부른다 — 태어날 때(bossInit), 매 순간(bossTick), 맞을 때(bossHit), 쓰러질 때(bossDeath).
//
// 여기서 쓰는 장치들
//   붉은 원(tele)   : 잠시 뒤 떨어지는 공격. 부대를 끌어 원 밖으로 빼면 피한다. after(n) 으로 몇이나 맞았는지 돌려받는다
//   빈틈(u.open)    : 두목이 수를 헛쳤거나 수가 끊겼을 때. 그동안 받는 피해가 1.5배
//   끊기(a.g)       : 정해진 시간 안에 두목에게 피해를 need 만큼 주면 수가 끊긴다 (씨름·조이기·떡 타령)
//   소품(def.prop)  : 종·여의주·업경대·명부 든 사자. 스스로 노리지 않으므로 부대를 끌어다 놓아 [집중 공격] 해야 한다
//   홀림(u.charm)   : 홀린 부대는 싸우지 않고 두목에게 걸어간다. 그 부대에 아무 명령이나 내리면 풀린다
import { VIEW, MID_Y } from '../config.js';
import { lvlMult } from '../data/units.js';
import { altAI } from './bossalt.js';

const hyp = Math.hypot, TAU = Math.PI * 2;
const cx = x => Math.max(VIEW.x0 + 50, Math.min(VIEW.x1 - 50, x)), cy = y => Math.max(VIEW.y0 + 36, Math.min(VIEW.y1 - 36, y));
// 두목의 외침: 꼬리표의 꼬리가 두목 머리(또는 발)에 닿게 바로 붙여 단다. 겹치면 그리는 쪽(fx)에서 비켜 쌓고, 같은 외침은 새로 쌓지 않는다
// 끊기 게이지가 머리 위에 떠 있는 동안에는 외침을 발밑으로 내린다. 양옆 위는 패널이 있어 한 칸 더 내린다
const TALL = { gumiho: 104, foxfake: 96, dueokboss: 150, warchief: 146, tigerboss: 104, serpent: 132, elder: 166, bulgaboss: 124, plague: 140, imugi: 168, skelking: 146, reaper: 134, yeomra: 168,
  foxhalmi: 128, oenun: 150, duduri: 146, bulgae: 104, jinewang: 120, daejeok: 160, gangcheolwang: 124, anggwaeng: 118, yongma: 130, dalgyalwang: 146, gangrim: 136, mujang: 172 };
export const bossSay = (b, u, s, c) => say(b, u, s, c);
const say = (b, u, s, c = '#c8402f') => {
  const x = Math.max(200, Math.min(1080, u.x)), top = x > 900 || x < 380 ? 124 : VIEW.y0 + 18; let y = u.y - (TALL[u.type] || 140) - 24, under = false;
  if ((u.ai && u.ai.g) || y < top) { y = Math.min(VIEW.y1 - 14, u.y + 30); under = true; }   // 끊기 게이지가 떠 있거나 머리 위에 자리가 없으면 발밑에
  b.ev('text', { x, y, s, c, big: true, tail: under ? -1 : 1 });
};
const tele = (b, u, x, y, r, delay, o) => { const z = Object.assign({ kind: 'tele', style: 'slam', x, y, r, t: 0, delay, hits: 0, src: u }, o); b.zones.push(z); return z; };
const mv = o => Object.keys(o).map(id => ({ id, t: o[id] }));
const pickN = (b, list, n) => list.map(s => [s, b.rand()]).sort((p, q) => p[1] - q[1]).slice(0, n).map(p => p[0]);
const open = (b, u, t, s) => { u.open = Math.max(u.open || 0, t); if (s) say(b, u, s, '#2f6f5c'); b.ev('bossOpen', { x: u.x, y: u.y, t }); };
const gauge = (u, a, kind, t, need, label) => { a.g = { kind, t, t0: t, need: need * u.maxHp, acc: 0, label }; };
// 소품을 세운다 (물리쳐도 사기·노획이 없다)
const prop = (b, u, type, x, y) => { const sq = b.addSquad(1, { type, x: cx(x), y: cy(y), lvl: u.lvl }); sq.paid = true; const p = sq.units[0]; if (p.ai) p.ai.owner = u; b.ev('appear', { x: p.x, y: p.y, summon: true }); return p; };
// 두목 가까이에서 아군이 가장 뭉친 곳
const cluster = (b, u, range, rad) => { let best = null, bs = -1; for (const e of b.units) { if (e.dead || e.team === u.team || e.hidden > 0 || e.def.banner) continue; const d = hyp(e.x - u.x, e.y - u.y); if (d > range) continue; const s = b.clusterScore(e, rad) - d * 0.004; if (s > bs) { bs = s; best = e; } } return best; };
const mine = b => b.playerSquads();

// ── 여럿이 함께 쓰는 수 ──
// 연달아 내리찍기: 두목 앞에서 뭉친 곳을 향해 원 셋이 차례로 떨어진다. 거의 다 피하면 헛손질 — 두목이 비틀거린다
function chain(b, u, o) {
  const t = cluster(b, u, 440, 80); if (!t) return false;
  const dx = t.x - u.x, dy = t.y - u.y, L = hyp(dx, dy) || 1, m = lvlMult(u.lvl), hit = { n: 0, left: 3 };
  for (let i = 0; i < 3; i++) tele(b, u, cx(u.x + dx / L * (96 + i * 98)), cy(u.y + dy / L * (96 + i * 98)), 72, 1.5 + i * 0.45, { style: o.style || 'slam', n: i + 1, dmg: o.dmg * m, stun: 0.9, kb: 26, after: n => { hit.n += n; if (--hit.left === 0 && hit.n <= 2 && !u.dead) { u.stun = Math.max(u.stun, 2.4); open(b, u, 4.5, o.whiff); } } });
  u.cast = 2.5; say(b, u, o.say); return true;
}
// 여러 부대의 발밑에 원을 하나씩
function circles(b, u, n, r, delay, o, text, col) {
  const ss = pickN(b, mine(b), n); if (!ss.length) return false; const m = lvlMult(u.lvl);
  for (const s of ss) tele(b, u, s.cx, s.cy, r, delay, Object.assign({}, o, { dmg: o.dmg * m, burnDmg: o.burnDmg ? o.burnDmg * m : undefined }));
  u.cast = Math.max(u.cast, 0.6); if (text) say(b, u, text, col); return true;
}
// 명부: 부대 하나의 이름을 적는다. 여덟 숨 안에 명부 든 사자를 물리치지 못하면 그 부대가 크게 다친다
function doom(b, u, a) {
  if (a.scribe && !a.scribe.dead) return false;
  const ss = mine(b).filter(s => !s.hero); if (!ss.length) return false;
  const s = ss.sort((p, q) => q.alive - p.alive + (b.rand() - 0.5))[0];
  a.doomSq = s; s.doom = 8; a.scribe = prop(b, u, 'scribe', VIEW.x1 - 250, s.cy < MID_Y ? VIEW.y1 - 84 : VIEW.y0 + 84);
  say(b, u, '명부에 이름을 적는다…', '#5a4a8a'); return true;
}
function doomTick(b, u, a, dt) {
  const s = a.doomSq; if (!s) return;
  const end = () => { s.doom = 0; a.doomSq = null; if (a.scribe && !a.scribe.dead) b.kill(a.scribe, null, true); a.scribe = null; };
  if (s.alive <= 0 || !a.scribe || a.scribe.dead) { end(); return; }
  s.doom -= dt; a.scribe.ai.count = s.doom;
  if (s.doom <= 0) { for (const e of s.units) if (!e.dead) b.damage(e, e.maxHp * 0.5, null, 'aoe'); b.ev('text', { x: s.cx, y: s.cy - 70, s: '이름이 불렸다!', c: '#5a4a8a', big: true }); b.ev('impact', { x: s.cx, y: s.cy, r: 80, style: 'dark' }); end(); }
}
const scribeDown = (b, u) => { const o = u.ai.owner; if (!o || o.dead) return; const a = o.ai; if (a.doomSq) { a.doomSq.doom = 0; a.doomSq = null; } a.scribe = null; o.stun = Math.max(o.stun, 1.5); open(b, o, 5, '붓이 꺾였다! 이름이 지워진다'); };

// ── 구미호의 재주 셋 ──
function foxfire(b, u, n) { circles(b, u, n, 62, 1.5, { style: 'fox', dmg: 38, burn: 3, burnDmg: 6 }, '여우불!', '#3f8fb8'); }
function charm(b, u, t) {
  const ss = mine(b).filter(s => !s.hero && hyp(s.cx - u.x, s.cy - u.y) < 560); if (!ss.length) return;
  const s = ss.sort((p, q) => q.alive - p.alive)[0]; for (const e of s.units) if (!e.dead) { e.charm = t; e.charmTo = u; e.target = null; }
  say(b, u, '홀림!', '#b8559a'); b.ev('charm', { x: s.cx, y: s.cy });
}
function illusion(b, u) {
  const ss = mine(b), back = ss.length ? ss.sort((p, q) => p.cx - q.cx)[0] : null, lvl = u.lvl;
  b.ev('appear', { x: u.x, y: u.y, summon: true });
  u.x = cx(u.x + (b.rand() - 0.5) * 220); u.y = cy(VIEW.y0 + 60 + b.rand() * (VIEW.y1 - VIEW.y0 - 120)); u.target = null;
  for (let i = 0; i < 2; i++) { const fx = back && i === 0 ? back.cx + 70 : u.x + (i ? -150 : 150), fy = back && i === 0 ? back.cy : u.y + (i ? 90 : -90); const sq = b.addSquad(1, { type: 'foxfake', x: cx(fx), y: cy(fy), lvl }); sq.paid = true; b.ev('appear', { x: sq.cx, y: sq.cy, summon: true }); }
  say(b, u, '둔갑! 꼬리 달린 것이 진짜다', '#3f8fb8');
}

export const BOSS_AI = {
  // ① 여우 누이 — 구미호: 꼬리 아홉. 체력을 구분의 일 깎을 때마다 꼬리가 하나 떨어지고, 그때마다 독해지며 재주를 부린다
  gumiho: {
    init(b, u, a) { u.tails = 9; a.fire = 7; },
    tick(b, u, a, dt) {
      if (!b.waveOn) return;
      const want = Math.max(1, Math.ceil(u.hp / u.maxHp * 9 - 1e-6));
      if (u.tails > want) {
        u.tails--; a.inv = 0.45; u.atk *= 1.05; if (u.tails <= 3) u.haste = 999; if (u.tails <= 1) u.rage = 999;
        b.ev('tail', { x: u.x, y: u.y, n: u.tails });   // 남은 꼬리는 두목 체력 칸 옆에 크게 알린다
        const k = u.tails % 3; if (k === 2) foxfire(b, u, 3); else if (k === 1) illusion(b, u); else charm(b, u, 4.5);
      }
      a.fire -= dt; if (a.fire <= 0 && u.stun <= 0 && u.x < VIEW.x1 - 30) { a.fire = 8.5; foxfire(b, u, u.tails <= 4 ? 2 : 1); }
    },
  },
  foxfake: {},
  // ② 두억시니: 연달아 내리찍고, 영웅에게 뛰어든다. 피하면 제풀에 비틀거린다
  dueokboss: {
    init(b, u, a) { a.moves = mv({ chain: 5, leap: 11 }); },
    moves: {
      chain: { cd: 11.5, use: (b, u) => chain(b, u, { dmg: 60, say: '내리찍기!', whiff: '헛손질! 지금이다!' }) },
      leap: { cd: 14, use(b, u) {
        const ss = mine(b); if (!ss.length) return false; const s = ss.find(q => q.hero) || ss[(b.rand() * ss.length) | 0], m = lvlMult(u.lvl);
        const z = tele(b, u, s.cx, s.cy, 96, 1.7, { dmg: 84 * m, stun: 1, kb: 34, after: n => { if (u.dead) return; u.x = cx(z.x + 18); u.y = cy(z.y); u.target = null; b.ev('pounce', { x: u.x, y: u.y }); if (n <= 1) { u.stun = Math.max(u.stun, 2); open(b, u, 4, '빗나갔다! 지금이다!'); } } });
        u.cast = 1.7; say(b, u, '머리를 깨 주마!'); return true;
      } },
    },
  },
  // ③ 도깨비 씨름 — 푸른 김서방: 영웅을 붙잡고 씨름을 건다. 그동안 김서방을 세게 치면(왼다리 걸기) 넘어진다
  warchief: {
    init(b, u, a) { a.moves = mv({ wrestle: 9 }); },
    moves: { wrestle: { cd: 17, use(b, u, a) {
      const near = b.units.filter(e => !e.dead && e.team === 0 && !e.def.banner && !e.def.structure && hyp(e.x - u.x, e.y - u.y) < 250); if (!near.length) return false;
      const t = near.find(e => e.def.hero) || near.sort((p, q) => q.hp - p.hp)[0];
      a.grab = t; t.stun = Math.max(t.stun, 3.7); u.cast = 3.7; gauge(u, a, 'wrestle', 3.7, 0.07, '왼다리를 걸어라!'); say(b, u, '어이, 씨름 한 판 하자!'); return true;
    } } },
    gaugeEnd(b, u, a, won) {
      const t = a.grab; a.grab = null;
      if (won) { u.cast = 0; u.stun = Math.max(u.stun, 3); if (t && !t.dead) t.stun = 0; open(b, u, 5, '왼다리 걸기! 김서방이 넘어졌다'); }
      else if (t && !t.dead) { b.damage(t, (t.def.hero ? 0.16 : 0.5) * t.maxHp, u, 'aoe'); if (!t.dead) { t.stun = 1.4; t.x = cx(t.x - 90); } say(b, u, '메다꽂기!'); b.ev('impact', { x: t.x, y: t.y, r: 70, style: 'slam' }); }
    },
  },
  // ④ 해와 달이 된 오누이 — 호랑이: 후방을 덮치고, 떡을 내놓으라고 으른다(으르는 동안 세게 치면 물러난다)
  tigerboss: {
    init(b, u, a) { a.moves = mv({ pounce: 6, demand: 10 }); },
    moves: {
      pounce: { cd: 10.5, use(b, u) {
        const ss = mine(b); if (!ss.length) return false; const soft = ss.filter(s => s.def.soft), s = (soft.length ? soft : ss).sort((p, q) => p.cx - q.cx)[0], m = lvlMult(u.lvl);
        const z = tele(b, u, s.cx, s.cy, 84, 1.6, { style: 'pounce', dmg: 100 * m, stun: 1.1, kb: 26, after: n => { if (u.dead) return; u.x = cx(z.x + 16); u.y = cy(z.y); u.target = null; b.ev('pounce', { x: u.x, y: u.y }); if (n <= 1) { u.stun = Math.max(u.stun, 1.8); open(b, u, 4, '허탕! 호랑이가 헛짚었다'); } } });
        u.cast = 1.6; say(b, u, '어흥!'); return true;
      } },
      demand: { cd: 14, use(b, u, a) { u.cast = 2.4; gauge(u, a, 'demand', 2.4, 0.045, '떡 대신 매를!'); say(b, u, '떡 하나 주면 안 잡아먹지!', '#b8742a'); return true; } },
    },
    gaugeEnd(b, u, a, won) {
      if (won) { u.cast = 0; u.stun = Math.max(u.stun, 1.2); say(b, u, '호랑이가 움찔 물러났다', '#2f6f5c'); return; }
      const n = Math.min(b.morale, 1.5); b.morale -= n; u.hp = Math.min(u.maxHp, u.hp + u.maxHp * 0.04); say(b, u, `떡을 빼앗겼다! 사기 -${Math.round(n * 10) / 10}`, '#b8742a');
    },
  },
  // ⑤ 은혜 갚은 까치 — 구렁이: 비늘이 단단해 피해가 덜 든다. 종을 세 번 울리면 몸부림치며 빈틈을 보인다. 부대를 조여 묶는다
  serpent: {
    init(b, u, a) { a.armor = 0.3; a.rings = 0; a.moves = mv({ coil: 8, spit: 4 }); a.bell = prop(b, u, 'bell', VIEW.x1 - 330, VIEW.y0 + 176); },
    tick(b, u, a, dt) { const s = a.coil; if (!s) return; a.ct = (a.ct || 0) - dt; if (a.ct <= 0) { a.ct = 0.5; const m = lvlMult(u.lvl); for (const e of s.units) if (!e.dead) b.damage(e, 7 * m, null, 'burn'); } },
    moves: {
      coil: { cd: 14, use(b, u, a) {
        const ss = mine(b).filter(s => !s.hero && hyp(s.cx - u.x, s.cy - u.y) < 320); if (!ss.length) return false;
        const s = ss.sort((p, q) => hyp(p.cx - u.x, p.cy - u.y) - hyp(q.cx - u.x, q.cy - u.y))[0]; a.coil = s; for (const e of s.units) if (!e.dead) e.root = Math.max(e.root, 5.2);
        u.cast = 5; gauge(u, a, 'coil', 5, 0.06, '조인 부대를 구해라!'); say(b, u, '칭칭 감아 주마!'); return true;
      } },
      spit: { cd: 8.5, use: (b, u) => circles(b, u, 2, 66, 1.4, { style: 'poison', dmg: 40, weaken: 4, slow: 0.4, slowT: 3 }, '독을 뱉는다!', '#5f8a3a') },
    },
    gaugeEnd(b, u, a, won) {
      const s = a.coil; a.coil = null; if (!s) return;
      if (won) { u.cast = 0; u.stun = Math.max(u.stun, 1.5); for (const e of s.units) e.root = 0; say(b, u, '구렁이가 몸을 풀었다', '#2f6f5c'); }
      else { const m = lvlMult(u.lvl); for (const e of s.units) if (!e.dead) b.damage(e, 40 * m, u, 'aoe'); say(b, u, '으스러뜨린다!'); }
    },
  },
  // 종: 피해를 주면 울린다. 세 번 울리면 구렁이가 한동안 무방비가 된다 (그 뒤 잠시 쉰다)
  bell: {
    hit(b, u, a, d) {
      const o = a.owner; if (!o || o.dead || a.rest > b.time) return 0;
      a.acc = (a.acc || 0) + d; if (a.acc < 70 * lvlMult(u.lvl)) return 0;
      a.acc = 0; const oa = o.ai; oa.rings++; b.ev('ring', { x: u.x, y: u.y, n: oa.rings }); b.ev('text', { x: u.x, y: u.y - 84, s: '댕—! ' + '● '.repeat(oa.rings).trim(), c: '#b8862a', big: true });
      if (oa.rings >= 3) { oa.rings = 0; a.rest = b.time + 11; o.stun = Math.max(o.stun, 4.5); o.cast = 0; if (oa.g) { const A = BOSS_AI[oa.id], g = oa.g; oa.g = null; A.gaugeEnd(b, o, oa, true, g); } open(b, o, 7, '종소리에 구렁이가 몸부림친다!'); }
      return 0;
    },
  },
  // ⑥ 장승과 당산나무 — 당산 할배: 뿌리 감옥과 아기 장승(기존 수). 아기 장승을 오래 두면 다 자라 장승이 된다
  elder: {
    tick(b, u, a, dt) {
      a.gt = (a.gt || 1) - dt; if (a.gt > 0) return; a.gt = 1;
      let grown = 0; for (const e of b.units) if (!e.dead && e.type === 'treant' && e.summoned) grown++; if (grown >= 2) return;
      for (const e of b.units) if (!e.dead && e.type === 'sapling' && e.team === 1 && b.time - e.born > 17) { b.kill(e, null, true); b.zones.push({ kind: 'spawn', x: e.x, y: e.y, r: 16, t: 0, delay: 0.5, utype: 'treant', n: 1, lvl: u.lvl, team: 1 }); b.ev('text', { x: e.x, y: e.y - 60, s: '아기 장승이 다 자랐다!', c: '#3f7a3a' }); break; }
    },
  },
  // ⑦ 불가사리: 쇠를 먹고 자란다. 무는 입(잿빛 원)을 피하지 못하면 무기를 먹히고 불가사리가 커진다. 불에 타면 도로 줄어든다
  bulgaboss: {
    init(b, u, a) { u.grown = 0; a.bt = 0; a.moves = mv({ devour: 6, stomp: 13 }); },
    tick(b, u, a, dt) { if (u.burn > 0 && u.grown > 0) { a.bt += dt; if (a.bt >= 2) { a.bt = 0; u.grown--; u.atk /= 1.09; say(b, u, '불에 쇠가 녹는다!', '#d9702a'); } } },
    moves: {
      devour: { cd: 10, use(b, u) {
        const ss = mine(b).filter(s => !s.def.range && !s.def.heal && hyp(s.cx - u.x, s.cy - u.y) < 330); if (!ss.length) return false;
        const s = ss.sort((p, q) => hyp(p.cx - u.x, p.cy - u.y) - hyp(q.cx - u.x, q.cy - u.y))[0], m = lvlMult(u.lvl);
        tele(b, u, s.cx, s.cy, 86, 1.5, { style: 'devour', dmg: 58 * m, weaken: 6, after: n => { if (u.dead) return; if (n > 0) { if (u.grown < 8) { u.grown++; u.atk *= 1.09; u.hp = Math.min(u.maxHp, u.hp + u.maxHp * 0.05); b.ev('grow', { x: u.x, y: u.y }); } say(b, u, '무기를 먹혔다! 불가사리가 자란다'); } else open(b, u, 3.5, '헛입질! 지금이다!'); } });
        u.cast = 1.5; say(b, u, '덥석! 원 밖으로 빼라', '#6a6f78'); return true;
      } },
      stomp: { cd: 13, use: (b, u) => u.grown >= 2 && circles(b, u, 3, 74, 1.5, { dmg: 46 + 11 * u.grown, stun: 0.6, kb: 20 }, '쿵! 쿵!') },
    },
  },
  // ⑧ 처용과 역신 — 역신: 역병을 옮긴다. 앓는 부대 곁에 다른 부대가 붙어 있으면 옮으니 떼어 놓아야 한다. 노랫가락(북·함성 패)에 무릎을 꿇는다
  plague: {
    init(b, u, a) { a.st = 0; a.song = b.time; a.moves = mv({ miasma: 4, wail: 11 }); },
    tick(b, u, a, dt) {
      a.st -= dt;
      if (a.st <= 0) {
        a.st = 0.5; const m = lvlMult(u.lvl);
        for (const e of b.units) {
          if (e.dead || e.team !== 0 || !(e.plague > 0)) continue;
          e.plague -= 0.5; if (e.plague <= 0) { e.immune = b.time + 6; continue; }
          b.damage(e, 4.5 * m, null, 'burn'); if (e.dead) continue;
          b.near(e.x, e.y, 48, o => { if (!o.dead && o.team === 0 && !(o.plague > 0) && o.squad !== e.squad && !o.def.banner && !o.def.structure && !(o.immune > b.time) && hyp(o.x - e.x, o.y - e.y) < 44) o.plague = 6; });
        }
      }
      const lc = b.lastCard; if (lc && lc.t > a.song && SONGS.has(lc.id)) { a.song = lc.t; u.stun = Math.max(u.stun, 2.5); for (const e of b.units) if (e.team === 0 && e.plague > 0) { e.plague = 0; e.immune = b.time + 6; } open(b, u, 4, '노랫소리에 역신이 무릎을 꿇었다!'); }
    },
    moves: {
      miasma: { cd: 9.5, use(b, u) { const ss = pickN(b, mine(b).filter(s => !s.units.some(e => e.plague > 0)), 1); if (!ss.length) return false; for (const e of ss[0].units) if (!e.dead) e.plague = 7; u.cast = 0.6; say(b, u, '역병이 번진다 — 부대를 떼어 놓아라!', '#5f8a3a'); b.ev('plague', { x: ss[0].cx, y: ss[0].cy }); return true; } },
      wail: { cd: 13, use: (b, u) => circles(b, u, 2, 64, 1.6, { style: 'dark', dmg: 44, weaken: 4 }, '앓는 소리…', '#5a4a8a') },
    },
  },
  // ⑨ 이무기: 벼락과 물벼락. 체력이 절반쯤 되면 여의주를 띄운다 — 스무 숨 안에 깨지 못하면 용이 된다
  imugi: {
    init(b, u, a) { a.moves = mv({ thunder: 4, flood: 9 }); },
    tick(b, u, a, dt) {
      if (!b.waveOn) return;
      if (!a.did && u.hp < u.maxHp * 0.55) { a.did = true; a.pt = 20; a.pearl = prop(b, u, 'pearl', u.x - 150, u.y > MID_Y ? VIEW.y0 + 76 : VIEW.y1 - 76); say(b, u, '여의주가 떠올랐다 — 어서 깨뜨려라!', '#3f7fb8'); }
      const p = a.pearl; if (p && !p.dead) {
        a.pt -= dt; p.ai.count = a.pt; u.hp = Math.min(u.maxHp, u.hp + u.maxHp * 0.006 * dt);
        if (a.pt <= 0) { b.kill(p, null, true); a.pearl = null; u.atk *= 1.4; u.haste = 999; u.rage = 999; say(b, u, '이무기가 용이 되었다!'); b.ev('warcry', { x: u.x, y: u.y }); }
      }
    },
    moves: {
      thunder: { cd: 7.5, use: (b, u) => circles(b, u, 3, 56, 1.15, { style: 'bolt', dmg: 74, stun: 0.6 }, '벼락!', '#b8862a') },
      flood: { cd: 15, use(b, u) {
        const n = [0, 0, 0], h = (VIEW.y1 - VIEW.y0) / 3; for (const e of b.units) if (!e.dead && e.team === 0 && !e.def.banner) n[Math.min(2, Math.max(0, ((e.y - VIEW.y0) / h) | 0))]++;
        const lane = n.indexOf(Math.max(...n)), y = VIEW.y0 + h * (lane + 0.5), m = lvlMult(u.lvl);
        for (let i = 0; i < 6; i++) tele(b, u, VIEW.x1 - 110 - i * 196, y, 80, 1.8 + i * 0.14, { style: 'flood', dmg: 56 * m, kb: 44, slow: 0.4, slowT: 3 });
        u.cast = 1.2; say(b, u, '물벼락! 길을 비켜라', '#3f7fb8'); return true;
      } },
    },
  },
  pearl: { death(b, u, a) { const o = a.owner; if (!o || o.dead) return; o.ai.pearl = null; o.stun = Math.max(o.stun, 2); open(b, o, 6, '여의주를 잃고 이무기가 몸부림친다!'); } },
  // ⑩ 어둑시니: 어둠 속에서 점점 커진다. 횃불·삼족오의 해·불에 닿으면 도로 줄어든다 (낙인과 망령은 기존 수)
  skelking: {
    init(b, u, a) { u.grown = 0; a.gt = 6; a.bt = 0; },
    tick(b, u, a, dt) {
      if (!b.waveOn || u.x > VIEW.x1) return;
      if (b.torch > 0 || b.sun || u.burn > 0) { a.bt += dt; if (a.bt >= 1.6 && u.grown > 0) { a.bt = 0; u.grown--; u.atk /= 1.06; if (!a.lit) { a.lit = 1; say(b, u, '빛에 어둠이 줄어든다!', '#b8862a'); } } }
      else { a.gt -= dt; if (a.gt <= 0 && u.grown < 6) { a.gt = 6; u.grown++; u.atk *= 1.06; u.hp = Math.min(u.maxHp, u.hp + u.maxHp * 0.02); b.ev('grow', { x: u.x, y: u.y }); if (u.grown === 3) say(b, u, '어둑시니가 커진다 — 불을 밝혀라!', '#5a4a8a'); } }
    },
  },
  // ⑪ 저승 차사: 명부에 부대의 이름을 적는다. 멀찍이 선 '명부 든 사자' 를 물리치면 이름이 지워진다. 망령을 불러낸다
  reaper: {
    init(b, u, a) { a.moves = mv({ doom: 6, gate: 12 }); },
    tick: doomTick,
    moves: {
      doom: { cd: 16, use: doom },
      gate: { cd: 14, use(b, u) {
        for (let i = 0; i < 3; i++) { const an = i / 3 * TAU + b.rand(); b.zones.push({ kind: 'spawn', x: cx(u.x - 60 + Math.cos(an) * 70), y: cy(u.y + Math.sin(an) * 60), r: 16, t: 0, delay: 1.2 + i * 0.15, utype: 'skel', n: 1, lvl: u.lvl, team: 1, warn: true }); }
        u.cast = 0.7; say(b, u, '저승 문아, 열려라!', '#2f6f9a'); return true;
      } },
    },
  },
  scribe: { death: scribeDown },
  // ⑫ 염라대왕: 세 마당. 심판의 원 → 업경대(비추는 동안 때린 만큼 되돌아온다. 깨뜨리거나 공격을 멈춰라) → 명부
  yeomra: {
    init(b, u, a) { a.phase = 0; a.moves = mv({ verdict: 5, gavel: 10, mirror: 3, doom: 4 }); },
    tick(b, u, a, dt) {
      if (!b.waveOn) return;
      const p = u.hp < u.maxHp * 0.34 ? 2 : u.hp < u.maxHp * 0.67 ? 1 : 0;
      if (p > a.phase) { a.phase = p; a.inv = 0.8; u.cast = Math.max(u.cast, 0.8); if (p === 2) u.haste = 999; say(b, u, p === 1 ? '업경대를 가져오너라!' : '명부를 펼쳐라!', '#7a1f1c'); b.ev('warcry', { x: u.x, y: u.y }); }
      if (a.mirror && !a.mirror.dead) { a.mt -= dt; a.mirror.ai.count = a.mt; if (a.mt <= 0) { b.kill(a.mirror, null, true); a.mirror = null; } }
      doomTick(b, u, a, dt);
    },
    moves: {
      verdict: { cd: 9, use: (b, u) => circles(b, u, 3, 68, 1.6, { style: 'dark', dmg: 76, weaken: 4 }, '죄를 묻겠다!', '#5a4a8a') },
      gavel: { cd: 13, use: (b, u) => chain(b, u, { dmg: 96, say: '판결이다!', whiff: '판결이 빗나갔다! 지금이다' }) },
      mirror: { cd: 19, use(b, u, a) { if (a.phase < 1 || (a.mirror && !a.mirror.dead)) return false; a.mt = 8; a.mirror = prop(b, u, 'mirror', u.x - 160, u.y < MID_Y ? VIEW.y1 - 92 : VIEW.y0 + 92); say(b, u, '업경대를 세워라!', '#7a1f1c'); return true; } },
      doom: { cd: 17, use: (b, u, a) => a.phase >= 2 && doom(b, u, a) },
    },
    hit(b, u, a, d, src, kind) { if (a.mirror && !a.mirror.dead && src && src.team === 0 && !src.dead && (kind === 'melee' || kind === 'proj')) { b.damage(src, d * 0.3, null, 'burn'); a.refT = b.time; } return d; },
  },
  mirror: { death(b, u, a) { const o = a.owner; if (!o || o.dead) return; o.ai.mirror = null; o.stun = Math.max(o.stun, 1.5); open(b, o, 5, '업경대가 깨졌다!'); } },
};
// 역신이 무릎 꿇는 노랫가락 (패)
const SONGS = new Set(['horn', 'cry', 'pangut', 'deong']);

export function bossInit(b, u) {
  const A = BOSS_AI[u.type]; if (!A) return;
  const a = u.ai = { id: u.type, inv: 0, moves: [], g: null }; u.open = 0; if (A.init) A.init(b, u, a);
}
export function bossTick(b, u, dt) {
  const a = u.ai, A = BOSS_AI[a.id];
  if (u.open > 0) u.open -= dt; if (a.inv > 0) a.inv -= dt;
  if (a.g) { const g = a.g; g.t -= dt; if (g.acc >= g.need || g.t <= 0) { a.g = null; A.gaugeEnd(b, u, a, g.acc >= g.need, g); } }
  if (A.tick) A.tick(b, u, a, dt);
  if (u.dead || !A.moves || !b.waveOn || u.stun > 0 || u.x > VIEW.x1 - 30) return;
  for (const p of a.moves) { p.t -= dt; if (p.t > 0) continue; if (u.cast > 0 || a.g) { p.t = 0.4; continue; } p.t = A.moves[p.id].use(b, u, a) ? A.moves[p.id].cd : 1.5; break; }
}
// 두목(과 소품)이 맞을 때: 무적·비늘·빈틈을 셈하고, 끊기에 든 피해를 적는다
export function bossHit(b, t, d, src, kind) {
  const a = t.ai, A = BOSS_AI[a.id];
  if (a.inv > 0) return 0;
  if (A.hit) { d = A.hit(b, t, a, d, src, kind); if (d <= 0) return 0; }
  if (t.open > 0) d *= 1.5; else if (a.armor) d *= 1 - a.armor;
  if (a.g && (!a.g.only || a.g.only(kind, src))) a.g.acc += d;   // 무장승의 일: 그 일에 맞는 공격만 셈한다
  return d;
}
export function bossDeath(b, t, silent) {
  const a = t.ai, A = BOSS_AI[a.id]; if (A.death && !silent) A.death(b, t, a);
  if (!t.def.boss) return;
  for (const e of b.units) { if (!e.dead && (e.def.prop || e.def.fake)) b.kill(e, null, true); e.charm = 0; e.plague = 0; }
  for (const s of b.squads) s.doom = 0;
}
// 또 다른 두목들(sim/bossalt.js)이 함께 쓰는 장치
export const KIT = { say, tele, open, gauge, prop, cluster, mine, circles, chain, pickN, mv, cx, cy, charm };
Object.assign(BOSS_AI, altAI(KIT));
