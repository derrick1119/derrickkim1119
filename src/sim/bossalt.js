// 또 다른 두목들의 수 (자료는 data/bossalt.js, 그림은 render/bossart2.js). 장치는 sim/bossfight.js 의 KIT 를 함께 쓴다
// 저마다 하나씩 새 장치를 더했다:
//   여우 할미 — 자리 바꾸기   외눈 도깨비 — 남는 돌무더기·외눈 노리기   두두리 — 땅에 꽂은 방망이(서 있는 동안 기운을 얻는다)
//   불개 — 달 물기(사방이 어두워진다, 불로 밝혀 끊는다)   지네 왕 — 지켜야 할 두꺼비   지하국 대적 — 땅속으로 숨기·불로 지지지 않으면 아무는 상처
//   강철이 — 쌓이는 열기(늦추면 식는다)   앙괭이 대장 — 체 걸기(부대를 곁에 세워 둔다)   용마 — 한 줄 통째로 내달리기·물회오리
//   달걀귀신 — 큰 한 방으로만 깨지는 껍데기   강림 도령 — 포승줄로 끌어당기기·세 번 부르기(멀리 떨어져야 한다)   무장승 — 공격의 갈래를 가리는 세 가지 일
import { VIEW, MID_Y } from '../config.js';
import { lvlMult } from '../data/units.js';
// 장치(KIT)는 bossfight.js 가 altAI(KIT) 로 건네준다 (서로 불러오지 않도록)
import { CALL_R } from '../data/bossalt.js';
let KIT = null;
export function altAI(kit) { KIT = kit; return ALT_AI; }

const hyp = Math.hypot;
// 갈래마다 다른 피해: 불 / 원거리
const FIRE = new Set(['fireball', 'shell', 'firearrow', 'sunfire']);
const isFire = (kind, src) => kind === 'burn' || !!(src && src.def && FIRE.has(src.def.proj));
const isRanged = (kind, src) => kind === 'proj' || !!(src && src.def && src.def.range > 0 && !src.def.heal && !FIRE.has(src.def.proj));
// 땅에 남는 해 (돌무더기·불 자국): battle.js 의 updateZones 가 우리 부대를 늦추거나 태운다
const hazard = (b, x, y, r, dur, o) => b.zones.push(Object.assign({ kind: 'hazard', x: KIT.cx(x), y: KIT.cy(y), r, t: 0, dur, acc: 0 }, o));
// 요괴를 불러낸다 (잠깐 땅에 그림자가 진 뒤 나타난다)
const spawnAt = (b, u, type, n, x, y, delay = 1) => b.zones.push({ kind: 'spawn', x: KIT.cx(x), y: KIT.cy(y), r: 16, t: 0, delay, utype: type, n, lvl: u.lvl, team: 1, warn: true });
// 원 안에 든 우리 인형 (영웅은 빼고)
const caughtIn = (b, z, hero) => b.units.filter(e => !e.dead && e.team === 0 && !e.def.structure && !e.def.banner && (hero || !e.def.hero) && hyp(e.x - z.x, e.y - z.y) <= z.r + e.r * 0.5);
// 우리 부대가 가장 많이 선 줄 (위·가운데·아래)
const busyLane = b => { const n = [0, 0, 0], h = (VIEW.y1 - VIEW.y0) / 3; for (const e of b.units) if (!e.dead && e.team === 0 && !e.def.banner && !e.def.structure) n[Math.min(2, Math.max(0, ((e.y - VIEW.y0) / h) | 0))]++; const lane = n.indexOf(Math.max(...n)); return VIEW.y0 + h * (lane + 0.5); };
const ya = w => { const c = w.charCodeAt(w.length - 1); return w + (c >= 0xAC00 && c <= 0xD7A3 && (c - 0xAC00) % 28 ? '아' : '야'); };

// 무장승의 세 가지 일
const LABOR = [
  { label: '물 긷기 — 원거리로!', hint: '활·총으로 쏘아 금빛을 채운다', say: '물 삼 년! 물을 길어 오너라!', only: isRanged, need: 0.05 },
  { label: '불 때기 — 불로!', hint: '불화살·불벼락·도술로 태워 채운다', say: '불 삼 년! 아궁이에 불을 때라!', only: isFire, need: 0.035 },
  { label: '나무하기 — 근접으로!', hint: '칼·창으로 베어 금빛을 채운다', say: '나무 삼 년! 나무를 해 오너라!', only: kind => kind === 'melee', need: 0.05 },
];

const ALT_AI = {
  // ① 여우 할미: 뒤에 선 부대와 자리를 바꾼다. 원 밖으로 빼면 헛짚는다. 절반이 깎이면 탈을 벗고 날래진다
  foxhalmi: {
    init(b, u, a) { a.moves = KIT.mv({ swap: 7, fire: 3.5, charm: 13 }); },
    tick(b, u, a) { if (!a.half && b.waveOn && u.hp < u.maxHp * 0.5) { a.half = true; u.haste = 999; a.inv = 0.6; KIT.say(b, u, '할미 탈을 벗었다!', '#8a5aa8'); b.ev('tail', { x: u.x, y: u.y }); } },
    moves: {
      swap: { cd: 13, use(b, u) {
        const ss = KIT.mine(b).filter(s => !s.hero); if (!ss.length) return false;
        const s = ss.sort((p, q) => p.cx - q.cx)[0];   // 맨 뒤에 선 부대
        const z = KIT.tele(b, u, s.cx, s.cy, 80, 1.8, { style: 'swap', hits: 3, after() {
          if (u.dead) return; const caught = caughtIn(b, z);
          if (!caught.length) { u.stun = Math.max(u.stun, 1.6); KIT.open(b, u, 4, '헛짚었다! 꼬리가 보인다'); return; }
          const ox = u.x, oy = u.y;
          for (const e of caught) { b.warp(e, ox + (e.x - z.x) * 0.8 + 24, oy + (e.y - z.y) * 0.8); e.stun = Math.max(e.stun, 0.6); }
          b.warp(u, z.x, z.y); u.target = null; KIT.open(b, u, 3, '자리를 바꿨다! 꼬리가 보인다');
        } });
        u.cast = 1.8; KIT.say(b, u, '아이고, 자리 좀 바꿔 앉자꾸나…', '#8a5aa8'); return true;
      } },
      fire: { cd: 9, use: (b, u, a) => KIT.circles(b, u, a.half ? 3 : 2, 60, 1.5, { style: 'fox', dmg: 34, burn: 3, burnDmg: 5 }, '여우불!', '#3f8fb8') },
      charm: { cd: 16, use(b, u) { if (!KIT.mine(b).some(s => !s.hero)) return false; KIT.charm(b, u, 4); return true; } },
    },
  },
  // ② 외눈 도깨비: 바위를 던지면 돌무더기가 남아 발을 묶는다. 외눈이 번쩍일 때 세게 치면 눈을 감는다
  oenun: {
    init(b, u, a) { a.moves = KIT.mv({ rock: 4, eye: 11, chain: 7 }); },
    moves: {
      rock: { cd: 9.5, use(b, u) {
        const ss = KIT.pickN(b, KIT.mine(b), 3); if (!ss.length) return false; const m = lvlMult(u.lvl);
        for (const s of ss) { const x = s.cx, y = s.cy; KIT.tele(b, u, x, y, 62, 1.6, { style: 'rock', dmg: 46 * m, stun: 0.6, kb: 14, after: () => hazard(b, x, y, 56, 11, { style: 'rock', slow: 0.45 }) }); }
        u.cast = 1.2; KIT.say(b, u, '바위 받아라!'); return true;
      } },
      eye: { cd: 16, use(b, u, a) { u.cast = 3.2; KIT.gauge(u, a, 'eye', 3.2, 0.06, '외눈을 노려라!'); KIT.say(b, u, '외눈이 번쩍인다!'); b.ev('warcry', { x: u.x, y: u.y }); return true; } },
      chain: { cd: 12, use: (b, u) => KIT.chain(b, u, { dmg: 56, say: '쿵쿵쿵!', whiff: '헛손질! 지금이다!' }) },
    },
    gaugeEnd(b, u, a, won) {
      if (won) { u.cast = 0; u.stun = Math.max(u.stun, 3); KIT.open(b, u, 5, '눈을 감았다! 지금이다'); return; }
      const m = lvlMult(u.lvl), ss = KIT.mine(b).sort((p, q) => hyp(p.cx - u.x, p.cy - u.y) - hyp(q.cx - u.x, q.cy - u.y)).slice(0, 2);
      for (const s of ss) { for (const e of s.units) if (!e.dead) { b.damage(e, 32 * m, u, 'aoe'); if (!e.dead) e.weaken = Math.max(e.weaken, 5); } b.ev('impact', { x: s.cx, y: s.cy, r: 70, style: 'bolt' }); }
      KIT.say(b, u, '눈빛이 꽂힌다!');
    },
  },
  // ③ 두두리: 금 나와라 뚝딱! — 졸개를 불러낸다. 땅에 꽂은 방망이가 서 있는 동안 상처가 아물고 날래진다
  duduri: {
    init(b, u, a) { a.moves = KIT.mv({ ttuk: 5, plant: 8, slam: 6.5 }); },
    tick(b, u, a, dt) {
      const c = a.club; if (!c) return; if (c.dead) { a.club = null; return; }
      a.ct -= dt; c.ai.count = a.ct; u.hp = Math.min(u.maxHp, u.hp + u.maxHp * 0.007 * dt); u.haste = Math.max(u.haste, 0.3);
      if (a.ct <= 0) { b.kill(c, null, true); a.club = null; for (let i = 0; i < 3; i++) spawnAt(b, u, 'goblin', 2, u.x - 60 + i * 50, u.y + (i - 1) * 70, 0.6 + i * 0.15); spawnAt(b, u, 'orc', 1, u.x - 90, u.y, 0.9); KIT.say(b, u, '뚝딱 뚝딱! 도깨비 나와라!'); }
    },
    moves: {
      ttuk: { cd: 13, use(b, u) { for (let i = 0; i < 2; i++) spawnAt(b, u, 'goblin', 2, u.x - 40, u.y + (i ? 80 : -80), 1 + i * 0.2); u.cast = 0.8; KIT.say(b, u, '금 나와라 뚝딱! 도깨비 나와라 뚝딱!', '#b8742a'); return true; } },
      plant: { cd: 20, use(b, u, a) { if (a.club && !a.club.dead) return false; a.ct = 14; a.club = KIT.prop(b, u, 'dokbang', u.x - 140, u.y < MID_Y ? VIEW.y1 - 92 : VIEW.y0 + 92); u.cast = 0.8; KIT.say(b, u, '방망이를 꽂았다 — 부러뜨려라!', '#b8742a'); return true; } },
      slam: { cd: 9, use: (b, u) => KIT.circles(b, u, 2, 70, 1.5, { dmg: 46, stun: 0.6, kb: 20 }, '쿵!') },
    },
  },
  dokbang: { death(b, u, a) { const o = a.owner; if (!o || o.dead) return; o.ai.club = null; o.haste = 0; o.stun = Math.max(o.stun, 2); KIT.open(b, o, 6, '방망이가 부러졌다!'); } },
  // ④ 불개: 달을 물면 사방이 깜깜해져 원거리 사거리가 줄고 불개가 사나워진다. 횃불·해로 밝히면 달을 뱉는다. 덮친 자리에 불 발자국
  bulgae: {
    init(b, u, a) { a.moves = KIT.mv({ eclipse: 5, pounce: 2.5 }); },
    tick(b, u, a, dt) {
      if (!(a.ecl > 0)) return; a.ecl -= dt;
      const lit = b.torch > 0 || b.sun;
      if (lit || a.ecl <= 0 || u.dead) { b.sky = a.sky || 'day'; a.ecl = 0; u.dmgUp = 0; if (lit && !u.dead) { u.stun = Math.max(u.stun, 2); KIT.open(b, u, 4.5, '달을 뱉었다! 지금이다'); } else if (!u.dead) KIT.say(b, u, '달이 다시 떴다', '#5a4a8a'); }
    },
    moves: {
      eclipse: { cd: 21, use(b, u, a) {
        if (a.ecl > 0 || b.torch > 0 || b.sun) return false;
        a.sky = b.sky; b.sky = 'night'; a.ecl = 9; u.dmgUp = 9; u.dmgUpAmt = 0.3; u.haste = Math.max(u.haste, 9); u.cast = 1;
        KIT.say(b, u, '불개가 달을 물었다! 불을 밝혀라', '#c8402f'); b.ev('warcry', { x: u.x, y: u.y }); return true;
      } },
      pounce: { cd: 9, use(b, u, a) {
        const ss = KIT.mine(b); if (!ss.length) return false; const soft = ss.filter(s => s.def.soft), s = (soft.length ? soft : ss).sort((p, q) => p.cx - q.cx)[0], m = lvlMult(u.lvl), sx = u.x, sy = u.y;
        const z = KIT.tele(b, u, s.cx, s.cy, 80, a.ecl > 0 ? 1.2 : 1.6, { style: 'pounce', dmg: 92 * m, stun: 1, kb: 24, after: n => {
          if (u.dead) return; u.x = KIT.cx(z.x + 16); u.y = KIT.cy(z.y); u.target = null; b.ev('pounce', { x: u.x, y: u.y });
          for (let i = 1; i <= 3; i++) hazard(b, sx + (z.x - sx) * i / 4, sy + (z.y - sy) * i / 4, 34, 6, { style: 'fire', burn: 6 * m });
          hazard(b, z.x, z.y, 60, 6, { style: 'fire', burn: 7 * m });
          if (n <= 1) { u.stun = Math.max(u.stun, 1.6); KIT.open(b, u, 3.5, '허탕! 불개가 헛짚었다'); }
        } });
        u.cast = z.delay; KIT.say(b, u, '컹!'); return true;
      } },
    },
    death(b, u, a) { if (a.ecl > 0) { b.sky = a.sky || 'day'; a.ecl = 0; } },
  },
  // ⑤ 지네 왕: 껍질이 단단하다. 은혜 갚으러 온 두꺼비를 지켜 내면 독을 뿜어 지네를 무방비로 만든다. 두꺼비를 잃으면 지네가 기운을 얻는다
  jinewang: {
    init(b, u, a) { a.armor = 0.25; a.moves = KIT.mv({ toad: 4, spit: 6, lunge: 9 }); },
    tick(b, u, a, dt) {
      if (a.armT > 0) { a.armT -= dt; if (a.armT <= 0) a.armor = 0.25; }
      const t = a.toad; if (!t) return;
      if (t.dead) { a.toad = null; u.hp = Math.min(u.maxHp, u.hp + u.maxHp * 0.06); u.atk *= 1.05; KIT.say(b, u, '두꺼비를 삼켰다!', '#5f8a3a'); return; }
      a.tt -= dt; t.ai.count = a.tt; a.lock = (a.lock || 0) - dt; if (a.lock <= 0 && u.cast <= 0) { a.lock = 1.4; u.target = t; u.retarget = 1.5; }
      if (a.tt <= 0) {
        a.toad = null; b.ev('impact', { x: u.x, y: u.y, r: 90, style: 'poison' }); b.ev('text', { x: t.x, y: t.y - 60, s: '두꺼비가 독을 뿜었다!', c: '#2f6f5c', big: true });
        u.stun = Math.max(u.stun, 3.5); a.armor = 0; a.armT = 10; KIT.open(b, u, 7, '독에 취해 껍질이 물러졌다!'); b.ev('vanish', { x: t.x, y: t.y, ally: true }); b.kill(t, null, true);
      }
    },
    moves: {
      toad: { cd: 26, use(b, u, a) {
        if (a.toad) return false; const y = VIEW.y0 + 80 + b.rand() * (VIEW.y1 - VIEW.y0 - 160), x = Math.max(VIEW.x0 + 300, Math.min(u.x - 200, VIEW.x0 + 520));
        const t = b.summon('toad', x, y, 1, 999, 1).units[0]; t.hp = t.maxHp = 260 * 2.2 * lvlMult(u.lvl) * 1.3; t.stun = 0;
        a.toad = t; a.tt = 15; a.lock = 0; KIT.say(b, u, '두꺼비가 나타났다 — 지켜 주어라!', '#2f6f5c'); return true;
      } },
      spit: { cd: 8.5, use: (b, u) => KIT.circles(b, u, 2, 64, 1.4, { style: 'poison', dmg: 38, weaken: 4, slow: 0.4, slowT: 3 }, '독을 뱉는다!', '#5f8a3a') },
      lunge: { cd: 11, use: (b, u) => KIT.chain(b, u, { dmg: 54, style: 'poison', say: '사각사각 덮친다!', whiff: '헛물었다! 지금이다' }) },
    },
  },
  toad: {},
  // ⑥ 지하국 대적: 땅속으로 숨었다 뭉친 곳에서 솟구친다. 상처가 저절로 아물지만, 불에 타는 동안은 아물지 않는다
  daejeok: {
    init(b, u, a) { a.rt = 0; a.moves = KIT.mv({ burrow: 8, breath: 4 }); },
    tick(b, u, a, dt) {
      if (!b.waveOn || u.x > VIEW.x1) return;
      if (u.burn > 0) { if (!a.ash) { a.ash = 1; KIT.say(b, u, '불에 지지니 상처가 아물지 않는다!', '#d9702a'); } return; }
      if (u.hp < u.maxHp) { u.hp = Math.min(u.maxHp, u.hp + u.maxHp * 0.0055 * dt); a.rt += dt; if (a.rt > 10) { a.rt = 0; KIT.say(b, u, '상처가 아문다 — 불로 지져라!', '#7a5a3a'); } }
    },
    moves: {
      burrow: { cd: 17, use(b, u) {
        const t = KIT.cluster(b, u, 1200, 90); if (!t) return false; const x = KIT.cx(t.x), y = KIT.cy(t.y), m = lvlMult(u.lvl);
        b.ev('appear', { x: u.x, y: u.y, summon: true }); u.hidden = 2.6; u.leapX = x + 10; u.leapY = y; u.leapTo = null; u.cast = 0.1;
        KIT.tele(b, u, x, y, 100, 2.5, { style: 'rock', dmg: 68 * m, stun: 1, kb: 40, after: n => { hazard(b, x, y, 70, 8, { style: 'rock', slow: 0.4 }); if (!u.dead && n <= 1) KIT.open(b, u, 4, '헛솟구쳤다! 지금이다'); } });
        KIT.say(b, u, '땅속으로 숨었다!', '#7a5a3a'); return true;
      } },
      breath: { cd: 9, use: (b, u) => KIT.circles(b, u, 3, 60, 1.4, { style: 'breath', dmg: 44, weaken: 3 }, '머리 셋이 한꺼번에!', '#5a4a3a') },
    },
  },
  // ⑦ 강철이: 숨마다 열기가 쌓여 세지고 커진다. 늦추거나 묶거나 비가 오면 식는다. 불길을 끌며 내달린다
  gangcheolwang: {
    init(b, u, a) { a.heat = 0; a.ht = 4; a.bt = 0; a.ct = 0; a.atk0 = u.atk; u.grown = 0; a.moves = KIT.mv({ charge: 6, flare: 9 }); },
    tick(b, u, a, dt) {
      if (!b.waveOn || u.x > VIEW.x1) return;
      const set = n => { a.heat = n; u.grown = n; u.atk = a.atk0 * (1 + 0.06 * n); };
      if (u.slow > 0 || u.root > 0 || u.stun > 0 || b.sky === 'rain') { a.ct += dt; if (a.ct >= 1 && a.heat > 0) { a.ct = 0; set(a.heat - 1); if (!a.cool) { a.cool = 1; KIT.say(b, u, '열기가 식는다!', '#3f7fb8'); } } }
      else { a.ct = 0; a.ht -= dt; if (a.ht <= 0) { a.ht = 4; if (a.heat < 5) { set(a.heat + 1); b.ev('grow', { x: u.x, y: u.y, n: a.heat }); if (a.heat === 4) KIT.say(b, u, '열기가 넘친다 — 발을 묶어 식혀라!', '#d9702a'); } } }
      if (a.heat >= 4) { a.bt -= dt; if (a.bt <= 0) { a.bt = 1; const m = lvlMult(u.lvl); b.near(u.x, u.y, 110, e => { if (!e.dead && e.team === 0 && !e.def.structure && !e.def.banner && hyp(e.x - u.x, e.y - u.y) < 86 + e.r) { e.burn = Math.max(e.burn, 1.6); e.burnDmg = Math.max(e.burnDmg, 3.5 * m); } }); } }
    },
    moves: {
      charge: { cd: 15, use(b, u) {
        const t = KIT.cluster(b, u, 700, 80); if (!t) return false; const dx = t.x - u.x, dy = t.y - u.y, L = hyp(dx, dy) || 1, m = lvlMult(u.lvl), hit = { n: 0, left: 4 };
        const pts = []; for (let i = 0; i < 4; i++) pts.push([KIT.cx(u.x + dx / L * (90 + i * 100)), KIT.cy(u.y + dy / L * (90 + i * 100))]);
        pts.forEach(([x, y], i) => KIT.tele(b, u, x, y, 66, 1.3 + i * 0.12, { style: 'fire', dmg: 50 * m, burn: 3, burnDmg: 5 * m, kb: 22, after: n => { hit.n += n; hazard(b, x, y, 42, 5, { style: 'fire', burn: 4 * m }); if (--hit.left === 0 && !u.dead) { const [ex, ey] = pts[pts.length - 1]; b.warp(u, ex + 20, ey); if (hit.n <= 2) { u.stun = Math.max(u.stun, 1.8); KIT.open(b, u, 4, '헛달렸다! 지금이다'); } } } }));
        u.cast = 1.7; KIT.say(b, u, '불길을 끌고 달린다!', '#d9702a'); return true;
      } },
      flare: { cd: 10, use: (b, u, a) => KIT.circles(b, u, a.heat >= 4 ? 3 : 2, 62, 1.4, { style: 'fire', dmg: 38 + 5 * a.heat, burn: 3, burnDmg: 6 }, '불길!', '#d9702a') },
    },
  },
  // ⑧ 앙괭이 대장: 신을 빼앗아 발을 늦추고 사기를 훔친다. 체가 나타났을 때 부대를 곁에 세워 두면 체가 걸리고, 앙괭이는 구멍을 세느라 넋을 놓는다
  anggwaeng: {
    init(b, u, a) { a.moves = KIT.mv({ steal: 3.5, swarm: 8, sieve: 7 }); },
    tick(b, u, a, dt) {
      const s = a.sieve; if (!s) return; if (s.dead) { a.sieve = null; return; }
      a.st -= dt; s.ai.count = a.st;
      if (b.units.some(e => !e.dead && e.team === 0 && !e.def.structure && !e.def.banner && hyp(e.x - s.x, e.y - s.y) < 74)) { a.hold += dt; s.ai.hold = a.hold; }
      if (a.hold >= 2.5) { a.sieve = null; b.kill(s, null, true); b.ev('text', { x: s.x, y: s.y - 70, s: '체를 걸었다!', c: '#2f6f5c', big: true }); u.cast = 0; u.stun = Math.max(u.stun, 5); KIT.open(b, u, 6.5, '하나, 둘, 셋… 체 구멍을 센다'); return; }
      if (a.st <= 0) { a.sieve = null; b.kill(s, null, true); KIT.say(b, u, '체가 바람에 날아갔다', '#7a5a3a'); }
    },
    moves: {
      steal: { cd: 9, use(b, u) {
        const ss = KIT.pickN(b, KIT.mine(b).filter(s => !s.hero), 2); if (!ss.length) return false; const m = lvlMult(u.lvl);
        for (const s of ss) { const z = KIT.tele(b, u, s.cx, s.cy, 64, 1.3, { style: 'shoe', dmg: 22 * m, after: n => { for (const e of caughtIn(b, z, true)) { e.slow = Math.max(e.slow, 8); e.slowAmt = Math.max(e.slowAmt, 0.45); } if (n > 0) { b.morale = Math.max(0, b.morale - 0.5); b.ev('text', { x: z.x, y: z.y - 60, s: '신발을 빼앗겼다!', c: '#7a5a3a' }); } } }); }
        u.cast = 0.8; KIT.say(b, u, '신발 좀 빌리자!', '#7a5a3a'); return true;
      } },
      swarm: { cd: 14, use(b, u) { for (let i = 0; i < 2; i++) spawnAt(b, u, 'yagwang', 2, u.x - 50, u.y + (i ? 70 : -70), 1 + i * 0.2); u.cast = 0.6; KIT.say(b, u, '얘들아, 신발 사냥이다!', '#7a5a3a'); return true; } },
      sieve: { cd: 19, use(b, u, a) { if (a.sieve) return false; a.sieve = KIT.prop(b, u, 'sieve', VIEW.x0 + 300 + b.rand() * 260, VIEW.y0 + 90 + b.rand() * (VIEW.y1 - VIEW.y0 - 180)); a.st = 12; a.hold = 0; KIT.say(b, u, '체다! 부대를 곁에 세워 두어라', '#2f6f5c'); return true; } },
    },
  },
  sieve: { hit: () => 0 },
  // ⑨ 용마: 우리 부대가 가장 많이 선 줄을 통째로 내달려 우리 뒤에 선다. 물회오리를 일으킨다. 절반 아래로 깎이면 슬피 울며 날래진다
  yongma: {
    init(b, u, a) { a.moves = KIT.mv({ gallop: 5, whirl: 8.5, splash: 3 }); },
    tick(b, u, a) { if (!a.cry && b.waveOn && u.hp < u.maxHp * 0.5) { a.cry = 1; u.haste = 999; KIT.say(b, u, '히히힝— 용마가 슬피 운다…', '#3f7fb8'); b.ev('warcry', { x: u.x, y: u.y }); } },
    moves: {
      gallop: { cd: 15, use(b, u) {
        const y = busyLane(b), m = lvlMult(u.lvl), hit = { n: 0, left: 6 };
        for (let i = 0; i < 6; i++) KIT.tele(b, u, VIEW.x1 - 110 - i * 196, y, 80, 1.7 + i * 0.12, { style: 'gallop', dmg: 66 * m, kb: 40, stun: 0.6, after: n => { hit.n += n; if (--hit.left === 0 && !u.dead) { b.warp(u, VIEW.x0 + 110, y); u.target = null; if (hit.n <= 2) { u.stun = Math.max(u.stun, 1.6); KIT.open(b, u, 4, '헛달렸다! 지금이다'); } } } });
        u.cast = 1.8; KIT.say(b, u, '용마가 내달린다! 위아래로 비켜라', '#3f7fb8'); return true;
      } },
      splash: { cd: 10, use: (b, u) => KIT.circles(b, u, 2, 62, 1.3, { style: 'flood', dmg: 52, kb: 24, slow: 0.4, slowT: 2.5 }, '발굽 물벼락!', '#3f7fb8') },
      whirl: { cd: 12, use(b, u) { for (const dy of [-100, 0, 100]) spawnAt(b, u, 'whirl', 1, u.x - 70, u.y + dy, 0.8); u.cast = 0.6; KIT.say(b, u, '물회오리!', '#3f7fb8'); return true; } },
    },
  },
  // ⑩ 달걀귀신: 껍데기를 쓰고 있으면 피해가 크게 준다. 큰 한 방(폭발·돌격·벼락)을 세 번 넣으면 껍데기가 깨진다
  dalgyalwang: {
    init(b, u, a) { a.shell = true; a.armor = 0.6; a.cracks = 0; a.ck = 0; a.moves = KIT.mv({ roll: 6, wail: 3.5, split: 12 }); },
    tick(b, u, a, dt) { if (!a.shell) { a.sh -= dt; if (a.sh <= 0) { a.shell = true; a.armor = 0.6; a.cracks = 0; u.look = null; KIT.say(b, u, '껍데기가 다시 굳었다', '#5a4a6a'); } } },
    hit(b, u, a, d, src, kind) {
      if (!a.shell || b.time < a.ck) return d;
      const big = (kind === 'aoe' && d >= u.maxHp * 0.018) || d >= u.maxHp * 0.035; if (!big) return d;
      a.ck = b.time + 0.45; a.cracks++; b.ev('text', { x: u.x, y: u.y - 150, s: `쩍! ${'●'.repeat(a.cracks)}${'○'.repeat(Math.max(0, 3 - a.cracks))}`, c: '#5a4a6a', big: true });
      if (a.cracks >= 3) {
        a.shell = false; a.armor = 0; a.sh = 12; u.look = 'dalgyalwang_crack'; u.stun = Math.max(u.stun, 1.5); KIT.open(b, u, 6, '껍데기가 깨졌다!'); b.ev('tail', { x: u.x, y: u.y });
        for (let i = 0; i < 3; i++) spawnAt(b, u, 'skel', 1, u.x - 40 + i * 40, u.y + (i - 1) * 60, 0.5);
      }
      return d;
    },
    moves: {
      roll: { cd: 11, use: (b, u) => KIT.chain(b, u, { dmg: 58, say: '데굴데굴!', whiff: '헛굴렀다! 지금이다' }) },
      wail: { cd: 9, use: (b, u) => KIT.circles(b, u, 2, 64, 1.5, { style: 'wail', dmg: 42, weaken: 4 }, '(소리 없는 울음)', '#5a4a6a') },
      split: { cd: 16, use(b, u) { for (const dy of [-80, 80]) spawnAt(b, u, 'skel', 2, u.x - 50, u.y + dy, 1); u.cast = 0.6; return true; } },
    },
  },
  // ⑪ 강림 도령: 포승줄로 뒤의 부대를 끌어당기고, 가까운 부대의 이름을 세 번 부른다 — 세 번째 부름 때 점선 안에 있으면 크게 다친다
  gangrim: {
    init(b, u, a) { a.moves = KIT.mv({ rope: 4, call: 8, gate: 12 }); },
    tick(b, u, a, dt) {
      const s = a.callSq; if (!s) return;
      if (s.alive <= 0 || u.dead) { s.call = 0; a.callSq = null; return; }
      const was = a.ct; a.ct -= dt; s.call = a.ct;
      if (was > 2.8 && a.ct <= 2.8) KIT.say(b, u, `${ya(s.def.name)}! (두 번)`, '#5a4a8a');
      if (a.ct <= 0) {
        s.call = 0; a.callSq = null;
        if (hyp(s.cx - u.x, s.cy - u.y) < CALL_R) { const m = lvlMult(u.lvl); for (const e of s.units) if (!e.dead) b.damage(e, e.maxHp * 0.25, null, 'aoe'); b.ev('impact', { x: s.cx, y: s.cy, r: 80, style: 'dark' }); KIT.say(b, u, `${ya(s.def.name)}! 대답했구나!`, '#5a4a8a'); void m; }
        else { u.stun = Math.max(u.stun, 1.5); KIT.open(b, u, 4, '부름이 닿지 않았다!'); }
      }
    },
    moves: {
      rope: { cd: 14, use(b, u) {
        const ss = KIT.mine(b).filter(s => !s.hero); if (!ss.length) return false; const s = ss.sort((p, q) => p.cx - q.cx)[0];
        const z = KIT.tele(b, u, s.cx, s.cy, 72, 1.4, { style: 'rope', hits: 3, after() {
          if (u.dead) return; const caught = caughtIn(b, z); if (!caught.length) { KIT.open(b, u, 3, '줄이 헛나갔다!'); return; }
          for (const e of caught) { b.warp(e, u.x - 80 + (e.x - z.x) * 0.6, u.y + (e.y - z.y) * 0.6); e.root = Math.max(e.root, 0.8); }
          KIT.say(b, u, '끌려왔구나!', '#8a2a26');
        } });
        u.cast = 1.4; KIT.say(b, u, '포승줄을 받아라!', '#8a2a26'); return true;
      } },
      call: { cd: 20, use(b, u, a) {
        if (a.callSq) return false; const ss = KIT.mine(b).filter(s => !s.hero && hyp(s.cx - u.x, s.cy - u.y) < 520); if (!ss.length) return false;
        const s = ss.sort((p, q) => hyp(p.cx - u.x, p.cy - u.y) - hyp(q.cx - u.x, q.cy - u.y))[0]; a.callSq = s; a.ct = 5.6; s.call = a.ct;
        KIT.say(b, u, `${ya(s.def.name)}! — 이름이 불렸다, 멀리 떨어져라`, '#5a4a8a'); return true;
      } },
      gate: { cd: 16, use(b, u) { for (let i = 0; i < 2; i++) spawnAt(b, u, 'skel', 1, u.x - 60 + Math.cos(i * 2.1) * 70, u.y + Math.sin(i * 2.1) * 60, 1.2 + i * 0.15); u.cast = 0.7; KIT.say(b, u, '저승 군사야, 나오너라!', '#2f6f9a'); return true; } },
    },
    death(b, u, a) { if (a.callSq) { a.callSq.call = 0; a.callSq = null; } },
  },
  // ⑫ 무장승: 세 가지 일(물 긷기·불 때기·나무하기)을 차례로 시킨다. 시간 안에 그 일에 맞는 공격으로 채우면 무방비가 되고, 못 하면 낫고 꾸짖는다
  mujang: {
    init(b, u, a) { a.labor = 0; a.moves = KIT.mv({ chore: 6, stomp: 10, verdict: 4 }); },
    tick(b, u, a) { if (!a.half && b.waveOn && u.hp < u.maxHp * 0.5) { a.half = true; u.haste = 999; KIT.say(b, u, '허허, 제법이로구나! 이제 서두르자!', '#7a4a2c'); b.ev('warcry', { x: u.x, y: u.y }); } },
    moves: {
      chore: { cd: 17, use(b, u, a) { const k = LABOR[a.labor % 3]; a.labor++; u.cast = 5.5; a.g = { kind: 'chore', t: 5.5, t0: 5.5, need: k.need * u.maxHp, acc: 0, label: k.label, hint: k.hint, only: k.only }; KIT.say(b, u, k.say, '#7a4a2c'); return true; } },
      stomp: { cd: 13, use: (b, u) => KIT.chain(b, u, { dmg: 92, say: '쿵! 지게 작대기다!', whiff: '헛디뎠다! 지금이다' }) },
      verdict: { cd: 9, use: (b, u) => KIT.circles(b, u, 3, 66, 1.6, { style: 'rock', dmg: 70, stun: 0.5 }, '돌덩이 받아라!', '#7a4a2c') },
    },
    gaugeEnd(b, u, a, won) {
      if (won) { u.cast = 0; u.stun = Math.max(u.stun, 2); KIT.open(b, u, 6, '일을 다 해냈다! 무장승이 감탄한다'); return; }
      u.hp = Math.min(u.maxHp, u.hp + u.maxHp * 0.05); KIT.circles(b, u, 3, 66, 1.2, { dmg: 58, stun: 0.6, kb: 16 }, '게으른 것들!', '#7a4a2c');
    },
  },
};
