// 봇이 대신 플레이하는 헤드리스 밸런스 시뮬레이터
//   node tools/sim.mjs                 → 봇 종류별 요약
//   node tools/sim.mjs --night 2 --runs 30 --bot full --meta 3
//   node tools/sim.mjs --check         → 최소 조건 검사 (npm test)
import { Game } from '../js/game.js';
import { WORLD, BASE, NIGHTS, META } from '../js/config.js';

const args = process.argv.slice(2);
const opt = (name, def) => {
  const i = args.indexOf('--' + name);
  return i >= 0 ? args[i + 1] : def;
};
const has = (name) => args.includes('--' + name);

const DT = 1 / 60;

// ---------- 봇 ----------
// afk: 가만히 / light: 램프를 켠 채 피해 다님 / full: 빛과 어둠을 오감 / camper: 가로등 밑에서 버팀
function makeBot(kind, rng) {
  return { kind, think: 0, mx: 0, my: 0, rng, wantDark: false };
}

function botStep(g, bot) {
  const p = g.p, inp = g.input;
  if (bot.kind === 'afk') return;

  // 사람처럼: 일정 간격으로만 판단하고, 보이는 것만 본다
  bot.think -= DT;
  const vision = p.lit ? p.lr + 70 : 150;
  let nearest = 1e9, close = 0, ring = 0, wide = 0, stalkNear = false;
  for (const e of g.enemies) {
    const d = Math.hypot(e.x - p.x, e.y - p.y);
    if (d > vision + e.r) continue;
    const edge = d - e.r - p.r;
    if (edge < nearest && !e.frozen && e.mode !== 'sleep') nearest = edge;
    if (edge < 150) ring++;
    if (edge < 330) wide++;
    if (edge < 70 && !e.frozen) close++;
    if (e.kind === 'stalker' && !e.frozen && edge < 190) stalkNear = true;
  }
  const f = p.oil / g.stat.maxOil;

  if (bot.think <= 0) {
    bot.think = 0.14 + bot.rng() * 0.08;
    let fx = 0, fy = 0;
    for (const e of g.enemies) {
      const dx = e.x - p.x, dy = e.y - p.y;
      const d = Math.hypot(dx, dy) || 1;
      if (d > vision + e.r) continue;
      const edge = d - e.r - p.r;
      if (edge < 280) {
        const w = (e.frozen || e.mode === 'sleep' ? 0.15 : 1) * (e.kind === 'boss' ? 3 : 1) / Math.pow(Math.max(14, edge), 1.7);
        fx -= (dx / d) * w; fy -= (dy / d) * w;
      }
    }
    for (const b of g.ebullets) {
      const dx = b.x - p.x, dy = b.y - p.y, d = Math.hypot(dx, dy) || 1;
      if (d < 150) {
        const sp = Math.hypot(b.vx, b.vy) || 1;
        const side = (dx * b.vy - dy * b.vx) > 0 ? 1 : -1;
        const w = 1.4 / Math.pow(Math.max(14, d), 1.7);
        fx += (-b.vy / sp) * side * w; fy += (b.vx / sp) * side * w;
      }
    }
    fx *= 2600; fy *= 2600;

    // 목표
    let tx = null, ty = null, tw = 1, best = 1e9;
    if (bot.kind === 'camper') {
      const L = g.lamps[0];
      tx = L.x; ty = L.y + 20; tw = 3;
    } else if (bot.kind === 'kiter') {
      tx = WORLD.w / 2 - 600; ty = WORLD.h / 2 - 600; tw = 3;
    } else {
      for (const k of g.pickups) {
        if (k.kind !== 'chest') continue;
        const d = Math.hypot(k.x - p.x, k.y - p.y);
        if (d < 520) { tx = k.x; ty = k.y; tw = 1.5; }
      }
      if (tx === null && f < 0.55) {
        for (const k of g.pickups) {
          if (k.kind !== 'oil') continue;
          const d = Math.hypot(k.x - p.x, k.y - p.y);
          if (d < best && d < 460) { best = d; tx = k.x; ty = k.y; tw = 1.6; }
        }
        if (tx === null && f < 0.38) {
          for (const L of g.lamps) {
            if (!L.lit) continue;
            const d = Math.hypot(L.x - p.x, L.y - p.y);
            if (d < best && d < 1000) { best = d; tx = L.x; ty = L.y; tw = 1.4; }
          }
        }
      }
      if (tx === null && close === 0) {
        let cnt = 0, sx = 0, sy = 0;
        for (const k of g.pickups) {
          if (k.kind !== 'xp') continue;
          const d = Math.hypot(k.x - p.x, k.y - p.y);
          if (d < 300) { cnt++; sx += k.x; sy += k.y; }
        }
        if (cnt >= 2) { tx = sx / cnt; ty = sy / cnt; tw = 1.1; }
      }
      if (tx === null && f > 0.45 && wide < 12) {
        for (const L of g.lamps) {
          if (L.lit) continue;
          const d = Math.hypot(L.x - p.x, L.y - p.y);
          if (d < best) { best = d; tx = L.x; ty = L.y; tw = 1.0; }
        }
      }
    }
    if (tx !== null) {
      const dx = tx - p.x, dy = ty - p.y, d = Math.hypot(dx, dy) || 1;
      if (d > 6) { fx += (dx / d) * tw; fy += (dy / d) * tw; }
    }
    const m = 160;
    if (p.x < m) fx += (m - p.x) / m * 3;
    if (p.y < m) fy += (m - p.y) / m * 3;
    if (p.x > WORLD.w - m) fx -= (p.x - (WORLD.w - m)) / m * 3;
    if (p.y > WORLD.h - m) fy -= (p.y - (WORLD.h - m)) / m * 3;

    const len = Math.hypot(fx, fy);
    if (len > 0.05) {
      const a = Math.atan2(fy, fx) + (bot.rng() - 0.5) * 0.5;
      bot.mx = Math.cos(a); bot.my = Math.sin(a);
    } else { bot.mx = 0; bot.my = 0; }
  }
  inp.mx = bot.mx; inp.my = bot.my;

  // 램프 전환
  if (bot.kind === 'full' && p.toggleCd <= 0) {
    const boss = g.boss && !g.boss.dead ? g.boss : null;
    const shieldUp = boss && boss.shield > 0;
    if (p.lit) {
      let embers = 0;
      const reach = g.stat.magnet * BASE.darkMagnetMul;
      for (const k of g.pickups) {
        if (k.kind === 'xp' && Math.hypot(k.x - p.x, k.y - p.y) < reach) embers++;
      }
      const safe = nearest > 95 && !stalkNear;
      const sinceFlare = g.t - (bot.lastFlare || 0);
      if (safe && (embers >= 6 || f < 0.35 || sinceFlare > 7 || wide >= 14)) inp.toggle = true;
      else if (shieldUp && nearest > 60 && Math.hypot(boss.x - p.x, boss.y - p.y) < 460) inp.toggle = true;
    } else {
      const bossClose = boss && Math.hypot(boss.x - p.x, boss.y - p.y) < 190;
      let go = false;
      if (shieldUp && p.darkTime < 6) go = p.charge >= 0.55 && bossClose;
      else if (p.charge >= 0.98 && (ring >= 2 || p.darkTime > 3.8)) go = true;
      else if (p.charge >= 0.4 && nearest < 34) go = true;
      else if (stalkNear || p.darkTime > 5.2) go = true;
      if (go) { inp.toggle = true; bot.lastFlare = g.t; }
    }
  }
}

// 업그레이드 선택: 'random' 또는 성향이 있는 선택
const PREF = {
  light: ['sunspark', 'corona', 'supernova', 'spark', 'halo', 'heat', 'lance', 'hands', 'wick', 'tank', 'trail', 'shade', 'luck', 'boots', 'magnet', 'trim', 'flare', 'moonbolt', 'echo', 'dusk'],
  dark: ['supernova', 'sunspark', 'corona', 'flare', 'moonbolt', 'dusk', 'echo', 'spark', 'heat', 'tank', 'shade', 'halo', 'boots', 'hands', 'wick', 'magnet', 'luck', 'lance', 'trail', 'trim'],
};
function pick(g, policy, rng) {
  const cs = g.choices;
  if (policy === 'random') return Math.floor(rng() * cs.length);
  const order = PREF[policy];
  let bi = 0, bv = 1e9;
  cs.forEach((c, i) => {
    const v = order.indexOf(c.id);
    const vv = v < 0 ? 999 : v;
    if (vv < bv) { bv = vv; bi = i; }
  });
  return bi;
}

function mulberry(seed) {
  let s = seed >>> 0;
  return () => {
    let t = (s += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function metaAt(level) {
  const m = {};
  for (const id in META) m[id] = Math.min(META[id].max, level);
  if (level < 5) m.revive = 0;
  return m;
}

export function runOne({ night = 0, seed = 1, bot = 'full', policy = 'random', meta = 0, trace = false }) {
  const g = new Game({ night, seed, meta: metaAt(meta) });
  const rng = mulberry(seed * 7919 + 13);
  const b = makeBot(bot, rng);
  const samples = [];
  let maxEnemies = 0, darkTicks = 0, ticks = 0;
  const limit = (NIGHTS[night].duration + 240) * 60;
  while (ticks < limit && g.state !== 'dead' && g.state !== 'won') {
    if (g.state === 'levelup') { g.choose(pick(g, policy, rng)); continue; }
    botStep(g, b);
    g.update(DT);
    g.events.length = 0;
    ticks++;
    if (!g.p.lit) darkTicks++;
    if (g.enemies.length > maxEnemies) maxEnemies = g.enemies.length;
    if (trace && ticks % 900 === 0) {
      samples.push({ t: Math.round(g.t), lvl: g.p.level, en: g.enemies.length, kills: g.kills, oil: Math.round(g.p.oil), lamps: g.litCount });
    }
  }
  return {
    won: g.state === 'won', t: g.t, level: g.p.level, kills: g.kills, lamps: g.lampsLit, boss: g.bossKilled,
    lumen: g.lumenEarned(), maxEnemies, dark: darkTicks / Math.max(1, ticks), dmgBy: g.dmgBy, taken: g.dmgTaken,
    samples, up: g.up, evo: g.evo, flares: g.flares, takenBy: g.takenBy,
  };
}

function summarize(label, rs) {
  const n = rs.length;
  const avg = (f) => rs.reduce((a, r) => a + f(r), 0) / n;
  const win = rs.filter((r) => r.won).length / n;
  const dmg = {};
  for (const r of rs) for (const k in r.dmgBy) dmg[k] = (dmg[k] || 0) + r.dmgBy[k];
  const tot = Object.values(dmg).reduce((a, b) => a + b, 0) || 1;
  const share = Object.entries(dmg).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${Math.round((v / tot) * 100)}%`).join(', ');
  const ts = rs.map((r) => r.t).sort((a, b) => a - b);
  console.log(
    `${label.padEnd(26)} win ${(win * 100).toFixed(0).padStart(3)}%  time ${avg((r) => r.t).toFixed(0).padStart(4)}s (min ${ts[0].toFixed(0)}, med ${ts[n >> 1].toFixed(0)})  lv ${avg((r) => r.level).toFixed(1).padStart(4)}  kills ${avg((r) => r.kills).toFixed(0).padStart(4)}  lamps ${avg((r) => r.lamps).toFixed(1)}  boss ${(avg((r) => (r.boss ? 1 : 0)) * 100).toFixed(0)}%  lumen ${avg((r) => r.lumen).toFixed(0)}  maxEn ${avg((r) => r.maxEnemies).toFixed(0)}  dark ${(avg((r) => r.dark) * 100).toFixed(0)}%`,
  );
  const tk = {};
  for (const r of rs) for (const k in r.takenBy) tk[k] = (tk[k] || 0) + r.takenBy[k] / n;
  const tks = Object.entries(tk).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${Math.round(v)}`).join(', ');
  console.log(`${''.padEnd(26)} dmg: ${share}`);
  console.log(`${''.padEnd(26)} taken/run: ${tks}`);
  return { win, time: avg((r) => r.t), level: avg((r) => r.level) };
}

function batch(o, runs) {
  const rs = [];
  for (let i = 0; i < runs; i++) rs.push(runOne({ ...o, seed: 1000 + i * 37 }));
  return rs;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const runs = +opt('runs', 12);
  const night = +opt('night', 1) - 1;
  const meta = +opt('meta', 0);
  if (has('trace')) {
    const r = runOne({ night, seed: +opt('seed', 1), bot: opt('bot', 'full'), policy: opt('policy', 'light'), meta, trace: true });
    console.table(r.samples);
    console.log({ won: r.won, t: r.t.toFixed(1), level: r.level, kills: r.kills, up: r.up, evo: r.evo, dmgBy: r.dmgBy, taken: Math.round(r.taken), takenBy: r.takenBy, flares: r.flares });
  } else if (has('check')) {
    // 회귀 방지용 최소 조건
    const afk = summarize('afk', batch({ night: 0, bot: 'afk' }, 6));
    const full = summarize('full/light', batch({ night: 0, bot: 'full', policy: 'light' }, 10));
    let ok = true;
    if (afk.time > 150) { console.error('FAIL: 가만히 있어도 너무 오래 산다'); ok = false; }
    if (full.win < 0.3) { console.error('FAIL: 첫 번째 밤이 너무 어렵다'); ok = false; }
    if (full.level < 12) { console.error('FAIL: 성장이 너무 느리다'); ok = false; }
    console.log(ok ? 'sim check OK' : 'sim check FAILED');
    process.exit(ok ? 0 : 1);
  } else if (opt('bot')) {
    summarize(`${opt('bot')}/${opt('policy', 'random')} n${night + 1} m${meta}`, batch({ night, bot: opt('bot'), policy: opt('policy', 'random'), meta }, runs));
  } else {
    const t0 = Date.now();
    console.log(`== Night ${night + 1}, meta ${meta}, ${runs} runs each ==`);
    summarize('afk', batch({ night, bot: 'afk', meta }, Math.min(runs, 6)));
    summarize('camper/random', batch({ night, bot: 'camper', policy: 'random', meta }, runs));
    summarize('kiter/random', batch({ night, bot: 'kiter', policy: 'random', meta }, runs));
    summarize('light/random', batch({ night, bot: 'light', policy: 'random', meta }, runs));
    summarize('light/light', batch({ night, bot: 'light', policy: 'light', meta }, runs));
    summarize('full/random', batch({ night, bot: 'full', policy: 'random', meta }, runs));
    summarize('full/light', batch({ night, bot: 'full', policy: 'light', meta }, runs));
    summarize('full/dark', batch({ night, bot: 'full', policy: 'dark', meta }, runs));
    console.log(`(${((Date.now() - t0) / 1000).toFixed(1)}s)`);
  }
}
