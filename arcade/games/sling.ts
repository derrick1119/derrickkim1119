/**
 * 돌팔매 성 (0024, 11라운드 후보 '취향 쪽') — 새총 물리 × 타워 디펜스 · 드래그 조준 · 영구 해금.
 *  - 조작: 누른 채로 손가락이 가리키는 곳을 겨누고(포물선 미리보기), 떼면 그곳에 돌이 떨어진다.
 *  - 비틀기: 빗나간 돌은 그 자리에 돌무더기로 남아 적을 막는다 → 맞히거나, 일부러 길을 막거나.
 *  - 지키고 키우는 내 것: 성벽 뒤 마을. 처치한 적이 떨군 금으로 마을이 저절로 커지고(집·궁수탑·대장간·투석기·성벽 보수) 웨이브마다 새 적이 나온다.
 */
import { mulberry32, type Rng } from '../../engine/rng.ts';
import type { Bot, GameDef, Input, Theme } from '../core.ts';
import { drift as dust, juice } from '../juice.ts';

const A = 1.3, TOP = 0.12, WALL = 1.0, SX = 0.5, SY = 0.985, RELOAD = 26, HP0 = 10, RUBBLE_R = 0.032;
type Foe = 'goblin' | 'shield' | 'bat' | 'ram' | 'slime' | 'giant';
const FOE: Record<Foe, { name: string; hp: number; v: number; r: number; dmg: number; gold: number; from: number }> = {
  goblin: { name: '고블린', hp: 1, v: 0.06, r: 0.022, dmg: 1, gold: 1, from: 1 },
  shield: { name: '방패병', hp: 2, v: 0.05, r: 0.026, dmg: 1, gold: 2, from: 2 },
  bat: { name: '박쥐', hp: 1, v: 0.1, r: 0.018, dmg: 1, gold: 1, from: 3 },
  ram: { name: '공성 망치', hp: 5, v: 0.034, r: 0.04, dmg: 3, gold: 4, from: 4 },
  slime: { name: '쪼개지는 슬라임', hp: 2, v: 0.05, r: 0.028, dmg: 1, gold: 2, from: 5 },
  giant: { name: '거인', hp: 14, v: 0.024, r: 0.06, dmg: 5, gold: 10, from: 6 },
};
type Kind = 'house' | 'tower' | 'smithy' | 'catapult' | 'wallfix';
const NAME: Record<Kind, string> = { house: '집', tower: '궁수탑', smithy: '대장간', catapult: '투석기', wallfix: '성벽 보수' };
const PLAN: Kind[] = ['house', 'tower', 'house', 'smithy', 'catapult', 'house', 'wallfix', 'tower', 'house', 'catapult', 'house', 'wallfix'];
const COST = (k: number) => 4 + 4 * k;
interface Enemy { kind: Foe; x: number; y: number; hp: number; ph: number; stuck: number }
interface Stone { x0: number; y0: number; tx: number; ty: number; t: number; T: number; big: boolean; auto: boolean }
interface Rubble { x: number; y: number; hp: number }
interface Arrow { x: number; y: number; tx: number; ty: number; t: number }
interface Building { kind: Kind; x: number; y: number; at: number; cool: number }
interface Ev { t: number; kind: string; x: number; y: number; text?: string }
export interface SlingState {
  rng: Rng; t: number; hp: number; maxHp: number; wave: number; left: number; spawnIn: number; rest: number;
  enemies: Enemy[]; stones: Stone[]; rubble: Rubble[]; arrows: Arrow[]; town: Building[]; next: number;
  gold: number; earned: number; kills: number; aim: { x: number; y: number } | null; queued: { x: number; y: number } | null; reload: number;
  seen: Set<string>; events: Ev[]; dead: boolean;
}

const dist = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);
const has = (s: SlingState, k: Kind) => s.town.some((b) => b.kind === k);
const speed = (s: SlingState, e: Enemy) => (FOE[e.kind].v * (1 + 0.26 * (s.wave - 1))) / 60;
const exX = (s: SlingState, e: Enemy, t = s.t) => (e.kind === 'bat' ? e.x + 0.1 * Math.sin(t * 0.05 + e.ph) : e.x);
const flight = (d: number) => Math.round(16 + 30 * d);
const splash = (s: SlingState, big: boolean) => (big || has(s, 'smithy') ? 0.075 : 0.055);
const ev = (s: SlingState, kind: string, x: number, y: number, text?: string) => s.events.push({ t: s.t, kind, x, y, text });
function see(s: SlingState, key: string, text: string) {
  if (s.seen.has(key)) return;
  s.seen.add(key);
  ev(s, 'new', 0.5, 0.3, text);
}
/** 다음 웨이브에 처음 나오는 적 (예고용) */
const debut = (w: number) => (Object.keys(FOE) as Foe[]).find((k) => FOE[k].from === w);

function startWave(s: SlingState) {
  s.wave++;
  s.left = 5 + 5 * s.wave;
  s.spawnIn = 30;
  ev(s, 'wave', 0.5, 0.45, `${s.wave}번째 웨이브!`);
}

function spawn(s: SlingState) {
  const open = (Object.keys(FOE) as Foe[]).filter((k) => FOE[k].from <= s.wave && k !== 'giant');
  let kind: Foe = s.rng() < 0.45 ? 'goblin' : open[Math.floor(s.rng() * open.length)];
  if (s.wave >= 6 && s.wave % 4 === 2 && s.left === 1) kind = 'giant'; // 6·10·14… 웨이브 마지막은 거인
  if (FOE[kind].from === s.wave) see(s, kind, `새 적: ${FOE[kind].name}!`);
  s.enemies.push({ kind, x: 0.08 + s.rng() * 0.84, y: TOP, hp: FOE[kind].hp, ph: s.rng() * 6, stuck: 0 });
  s.left--;
  s.spawnIn = Math.max(6, Math.round(64 - 7 * s.wave - s.rng() * 14));
}

function launch(s: SlingState, to: { x: number; y: number }, from = { x: SX, y: SY }, auto = false) {
  const tx = Math.max(0.03, Math.min(0.97, to.x)), ty = Math.max(0.02, Math.min(WALL - 0.05, to.y));
  s.stones.push({ x0: from.x, y0: from.y, tx, ty, t: 0, T: flight(Math.hypot(tx - from.x, ty - from.y)), big: auto, auto });
}

function hit(s: SlingState, e: Enemy, dmg: number) {
  e.hp -= dmg;
  if (e.hp > 0) return;
  s.kills++;
  s.gold += FOE[e.kind].gold;
  s.earned += FOE[e.kind].gold;
  ev(s, 'kill', e.x, e.y, `+${FOE[e.kind].gold}`);
  if (e.kind === 'slime') for (const k of [-1, 1]) s.enemies.push({ kind: 'goblin', x: e.x + k * 0.03, y: e.y, hp: 1, ph: 0, stuck: 0 });
  while (s.next < PLAN.length && s.gold >= COST(s.next)) {
    s.gold -= COST(s.next);
    // 마을 자리: 성문 가까운 가운데부터 바깥으로, 두 줄
    const kind = PLAN[s.next++], k = s.town.length, col = [3, 2, 4, 1, 5, 0][Math.floor(k / 2) % 6], x = 0.1 + col * 0.16, y = WALL + (k % 2 ? 0.21 : 0.115);
    s.town.push({ kind, x, y, at: s.t, cool: 0 });
    if (kind === 'house' || kind === 'wallfix') (s.maxHp += kind === 'house' ? 1 : 3), (s.hp = Math.min(s.maxHp, s.hp + (kind === 'house' ? 1 : 4)));
    ev(s, 'build', x, y, `새 ${NAME[kind]}!`);
    see(s, 'b:' + kind, kind === 'house' ? '마을이 커져요 — 집이 늘면 성도 튼튼해져요' : `새 건물: ${NAME[kind]}`);
  }
}

export const sling: GameDef<SlingState> = {
  id: 'sling',
  name: '돌팔매 성',
  genes: ['slingshot', 'defense', 'dragaim', 'unlock'],
  twist: '빗나간 돌은 돌무더기 바리케이드가 된다 — 맞히거나, 일부러 길을 막거나',
  rules: ['누른 채로 겨누고 떼면 그곳에 돌이 떨어져요 (키보드: 화살표 + 스페이스).', '돌에 맞은 적은 쓰러지고, 빗나간 돌은 돌무더기가 되어 적을 막아요.', '적이 성벽에 닿으면 성이 다쳐요. 금으로 마을이 커지고, 웨이브마다 새 적이 와요.'],
  controls: 'touch',
  hint: '누른 채 겨누고 떼면 던지기 / 화살표 + 스페이스',
  aspect: A,
  art: {
    concept: '돌성벽 마을의 공방전',
    mood: '위에서 내려다본 초록 들판과 흙길, 구름 그림자가 지나간다. 회색 돌성벽 뒤로 빨간 지붕 마을이 하나씩 늘고, 숲에서 형형색색 적들이 줄지어 내려온다.',
    palette: { bg: '#2f5d3a', ink: '#fff7e0', muted: '#7a8f6a', accent: '#ffcf4a', hot: '#ff5a4f', soft: '#8a7a64' },
  },
  reveals: (s) => s.seen.size,
  create(seed) {
    const s: SlingState = {
      rng: mulberry32(seed), t: 0, hp: HP0, maxHp: HP0, wave: 0, left: 0, spawnIn: 0, rest: 120,
      enemies: [], stones: [], rubble: [], arrows: [], town: [], next: 0, gold: 0, earned: 0, kills: 0, aim: null, queued: null, reload: 0,
      seen: new Set(), events: [], dead: false,
    };
    return s;
  },
  step(s, inp: Input) {
    s.t++;
    s.events = s.events.filter((e) => s.t - e.t < 90);
    // 조준: 누르고 있는 동안 손가락 = 겨눈 곳, 떼는 순간 던진다(장전 중이면 장전 끝나자마자)
    const p = inp.pointer ? { x: inp.pointer.x, y: inp.pointer.y * A } : null;
    if (!p && s.aim) s.queued = s.aim;
    s.aim = p;
    if (s.reload > 0) s.reload--;
    if (s.queued && s.reload === 0) launch(s, s.queued), (s.queued = null), (s.reload = has(s, 'smithy') ? RELOAD - 6 : RELOAD);
    // 웨이브: 다 나오고 다 쓰러지면 2초 쉬고 다음
    if (s.left > 0 && --s.spawnIn <= 0) spawn(s);
    if (s.left === 0 && s.enemies.length === 0 && --s.rest <= 0) (startWave(s), (s.rest = 120));
    // 돌
    for (const st of s.stones) {
      if (++st.t < st.T) continue;
      const R = splash(s, st.big);
      const hitAny = s.enemies.filter((e) => Math.hypot(exX(s, e) - st.tx, e.y - st.ty) < R + FOE[e.kind].r);
      ev(s, 'land', st.tx, st.ty);
      if (hitAny.length) for (const e of hitAny) hit(s, e, st.big || has(s, 'smithy') ? 2 : 1);
      else if (!st.auto) {
        s.rubble.push({ x: st.tx, y: st.ty, hp: 3 });
        if (s.rubble.length > 8) s.rubble.shift();
        see(s, 'rubble', '빗나간 돌은 돌무더기가 돼요 — 적을 막아요!');
      }
    }
    s.stones = s.stones.filter((st) => st.t < st.T);
    // 마을 건물: 궁수탑은 화살, 투석기는 큰 돌
    for (const b of s.town) {
      if (b.kind !== 'tower' && b.kind !== 'catapult') continue;
      if (--b.cool > 0) continue;
      const from = { x: b.x, y: WALL + 0.02 };
      const tgt = s.enemies.filter((e) => e.y > TOP + 0.03 && dist({ x: exX(s, e), y: e.y }, from) < (b.kind === 'tower' ? 0.5 : 0.9)).sort((p2, q) => q.y - p2.y)[0];
      if (!tgt) continue;
      if (b.kind === 'tower') (s.arrows.push({ x: from.x, y: from.y, tx: exX(s, tgt), ty: tgt.y, t: 0 }), (b.cool = 110), hit(s, tgt, 1));
      else (launch(s, { x: tgt.x, y: tgt.y + speed(s, tgt) * 40 }, from, true), (b.cool = 280));
    }
    s.arrows = s.arrows.filter((a) => ++a.t < 12);
    s.enemies = s.enemies.filter((e) => e.hp > 0);
    // 적: 아래로 걷는다. 돌무더기에 막히면 부수느라 멈춘다(박쥐는 넘어 날아간다)
    for (const e of s.enemies) {
      const f = FOE[e.kind];
      const block = e.kind === 'bat' ? null : s.rubble.find((r) => Math.hypot(r.x - e.x, r.y - e.y - 0.01) < RUBBLE_R + f.r && r.y > e.y);
      if (block) {
        block.hp -= (e.kind === 'ram' || e.kind === 'giant' ? 3 : 1) / 60;
        e.stuck++;
      } else e.y += speed(s, e);
      if (e.y >= WALL - 0.02) {
        e.hp = 0;
        s.hp -= f.dmg;
        ev(s, 'wall', exX(s, e), WALL, `-${f.dmg}`);
      }
    }
    s.enemies = s.enemies.filter((e) => e.hp > 0);
    s.rubble = s.rubble.filter((r) => r.hp > 0);
    if (s.hp <= 0) s.dead = true;
  },
  over: (s) => s.dead,
  score: (s) => s.earned,
  draw(ctx, s, w, h, th: Theme) {
    const fx = juice(s), X = (x: number) => x * w, Y = (y: number) => y * w, R = (r: number) => r * w;
    ctx.save();
    fx.begin(ctx);
    // 들판 · 흙길 · 지나가는 구름 그림자
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#24452c');
    g.addColorStop(0.25, '#3f7a47');
    g.addColorStop(1, '#4f8c4f');
    ctx.fillStyle = g;
    ctx.fillRect(-10, -10, w + 20, h + 20);
    ctx.fillStyle = 'rgba(160,120,70,.35)';
    ctx.beginPath();
    ctx.moveTo(X(0.42), 0);
    ctx.quadraticCurveTo(X(0.3), Y(0.5), X(0.44), Y(WALL));
    ctx.lineTo(X(0.56), Y(WALL));
    ctx.quadraticCurveTo(X(0.42), Y(0.5), X(0.58), 0);
    ctx.fill();
    for (let k = 0; k < 60; k++) {
      const x = ((k * 7919) % 997) / 997, y = (((k * 104729) % 991) / 991) * WALL;
      ctx.fillStyle = k % 7 ? 'rgba(20,60,25,.35)' : ['#fff', '#ffd1e8', '#fff06a'][k % 3];
      ctx.fillRect(X(x), Y(y), k % 7 ? 2 : 3, k % 7 ? 4 : 3);
    }
    ctx.fillStyle = 'rgba(0,0,0,.05)';
    for (let k = 0; k < 3; k++) {
      const y = ((s.t * 0.0006 + k * 0.4) % 1.3) - 0.2;
      ctx.beginPath();
      ctx.ellipse(X((k * 0.37 + 0.2) % 1), Y(y), R(0.2), R(0.08), 0, 0, Math.PI * 2);
      ctx.fill();
    }
    for (let k = 0; k < 16; k++) {
      const side = k % 2, y = TOP + 0.08 + (k >> 1) * 0.11, sway = Math.sin(s.t / 35 + k) * 2;
      ctx.fillStyle = '#2a5a33';
      ctx.beginPath();
      ctx.arc(X(side ? 0.97 : 0.03) + sway, Y(y), R(0.045), 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#3c7a45';
      ctx.beginPath();
      ctx.arc(X(side ? 0.96 : 0.04) + sway, Y(y) - R(0.015), R(0.03), 0, Math.PI * 2);
      ctx.fill();
    }
    // 위쪽 숲 (적이 나오는 곳)
    for (let k = 0; k < 14; k++) {
      const x = k / 13, sway = Math.sin(s.t / 40 + k) * 2;
      ctx.fillStyle = k % 2 ? '#183a22' : '#1f4a2a';
      ctx.beginPath();
      ctx.arc(X(x) + sway, Y(TOP - 0.01), R(0.06), 0, Math.PI * 2);
      ctx.fill();
    }
    // 돌무더기
    for (const r of s.rubble) {
      ctx.fillStyle = '#7d7f86';
      for (let k = 0; k < 5; k++) {
        const a = k * 1.3, rr = R(RUBBLE_R) * (0.35 + 0.12 * (k % 3)) * (0.6 + 0.4 * Math.min(1, r.hp / 3));
        ctx.beginPath();
        ctx.arc(X(r.x) + Math.cos(a) * R(0.014), Y(r.y) + Math.sin(a) * R(0.01), rr, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    // 적
    for (const e of s.enemies) {
      const f = FOE[e.kind], x = X(exX(s, e)), y = Y(e.y), r = R(f.r), bob = Math.sin(s.t / 6 + e.ph) * 1.5;
      ctx.fillStyle = 'rgba(0,0,0,.25)';
      ctx.beginPath();
      ctx.ellipse(x, y + r * 0.8, r, r * 0.35, 0, 0, Math.PI * 2);
      ctx.fill();
      const col = { goblin: '#7bc043', shield: '#5b8bd9', bat: '#6b4aa0', ram: '#8a5a2b', slime: '#b35fd6', giant: '#d9534f' }[e.kind];
      ctx.fillStyle = col;
      if (e.kind === 'bat') {
        const f2 = Math.sin(s.t / 3 + e.ph) * r;
        ctx.beginPath();
        ctx.moveTo(x - r * 2, y - f2);
        ctx.lineTo(x, y + r * 0.5);
        ctx.lineTo(x + r * 2, y - f2);
        ctx.fill();
      } else if (e.kind === 'ram') {
        ctx.fillRect(x - r * 0.5, y - r, r, r * 2);
        ctx.fillStyle = '#3a2a1a';
        ctx.fillRect(x - r * 0.7, y - r * 0.6, r * 0.2, r * 0.5);
        ctx.fillRect(x + r * 0.5, y - r * 0.6, r * 0.2, r * 0.5);
      } else {
        ctx.beginPath();
        ctx.arc(x, y + bob, r, 0, Math.PI * 2);
        ctx.fill();
      }
      if (e.kind === 'shield') (ctx.fillStyle = '#cfd8e8'), ctx.fillRect(x - r, y + r * 0.3 + bob, r * 2, r * 0.45);
      ctx.fillStyle = '#fff';
      ctx.fillRect(x - r * 0.45, y - r * 0.25 + bob, 3, 3);
      ctx.fillRect(x + r * 0.2, y - r * 0.25 + bob, 3, 3);
      if (f.hp > 1) (ctx.fillStyle = 'rgba(0,0,0,.4)'), ctx.fillRect(x - r, y - r - 6, r * 2, 3), (ctx.fillStyle = th.accent), ctx.fillRect(x - r, y - r - 6, (r * 2 * e.hp) / f.hp, 3);
    }
    // 성벽
    ctx.fillStyle = '#8d8a84';
    ctx.fillRect(0, Y(WALL), w, R(0.035));
    ctx.fillStyle = '#a7a39b';
    for (let x = 0; x < 1; x += 0.06) ctx.fillRect(X(x), Y(WALL) - R(0.018), R(0.035), R(0.02));
    ctx.strokeStyle = 'rgba(0,0,0,.2)';
    for (let x = 0.03; x < 1; x += 0.06) (ctx.beginPath(), ctx.moveTo(X(x), Y(WALL)), ctx.lineTo(X(x), Y(WALL + 0.035)), ctx.stroke());
    // 마을 (성벽 뒤)
    ctx.fillStyle = '#5c8f4f';
    ctx.fillRect(0, Y(WALL + 0.035), w, h);
    for (const b of s.town) {
      const x = X(b.x), y = Y(b.y), u = R(0.028), grow = Math.min(1, (s.t - b.at) / 20);
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(grow, grow);
      ctx.fillStyle = b.kind === 'house' ? '#e0c49a' : b.kind === 'tower' ? '#9aa3ad' : b.kind === 'smithy' ? '#6d5a4b' : b.kind === 'catapult' ? '#8a5a2b' : '#a7a39b';
      if (b.kind === 'tower') ctx.fillRect(-u * 0.5, -u * 2.2, u, u * 2.8);
      else ctx.fillRect(-u, -u * 0.6, u * 2, u * 1.3);
      ctx.fillStyle = b.kind === 'house' ? '#c0392b' : '#4a4f57';
      ctx.beginPath();
      const top = b.kind === 'tower' ? -u * 2.2 : -u * 0.6;
      ctx.moveTo(-u * 1.2, top);
      ctx.lineTo(0, top - u);
      ctx.lineTo(u * 1.2, top);
      ctx.fill();
      ctx.restore();
      if (b.kind === 'smithy' && s.t % 12 === 0) fx.burst(x, y - R(0.05), 'rgba(200,200,200,.6)', 1, 0.6, 3);
    }
    // 새총과 겨눔선
    ctx.strokeStyle = '#5a3a1a';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(X(SX), Y(SY) + 8);
    ctx.lineTo(X(SX), Y(SY));
    ctx.lineTo(X(SX) - 8, Y(SY) - 10);
    ctx.moveTo(X(SX), Y(SY));
    ctx.lineTo(X(SX) + 8, Y(SY) - 10);
    ctx.stroke();
    const target = s.aim ?? s.queued;
    if (target) {
      const tx = Math.max(0.03, Math.min(0.97, target.x)), ty = Math.max(0.02, Math.min(WALL - 0.05, target.y));
      ctx.fillStyle = th.ink;
      for (let k = 1; k < 12; k++) {
        const u = k / 12, hgt = Math.sin(u * Math.PI) * 0.12;
        ctx.globalAlpha = 0.8 - u * 0.4;
        ctx.beginPath();
        ctx.arc(X(SX + (tx - SX) * u), Y(SY + (ty - SY) * u - hgt), 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.strokeStyle = s.reload > 0 ? th.muted : th.accent;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(X(tx), Y(ty), R(splash(s, false)), 0, Math.PI * 2);
      ctx.stroke();
    }
    // 날아가는 돌 (그림자는 땅, 돌은 포물선 위)
    for (const st of s.stones) {
      const u = st.t / st.T, x = st.x0 + (st.tx - st.x0) * u, y = st.y0 + (st.ty - st.y0) * u, hgt = Math.sin(u * Math.PI) * (0.08 + 0.1 * Math.hypot(st.tx - st.x0, st.ty - st.y0));
      ctx.fillStyle = 'rgba(0,0,0,.25)';
      ctx.beginPath();
      ctx.ellipse(X(x), Y(y), R(0.012), R(0.006), 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = st.big ? '#5d5f66' : '#9a9ca3';
      ctx.beginPath();
      ctx.arc(X(x), Y(y - hgt), R(st.big ? 0.016 : 0.011) * (1 + hgt * 2), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = '#f4e3b0';
    ctx.lineWidth = 2;
    for (const a of s.arrows) {
      const u = a.t / 12;
      ctx.beginPath();
      ctx.moveTo(X(a.x + (a.tx - a.x) * u), Y(a.y + (a.ty - a.y) * u));
      ctx.lineTo(X(a.x + (a.tx - a.x) * (u + 0.15)), Y(a.y + (a.ty - a.y) * (u + 0.15)));
      ctx.stroke();
    }
    dust(ctx, w, h * 0.75, s.t, 'rgba(255,255,220,.5)', 18, 0.08);
    const seenT = fx.memo.t ?? -1;
    for (const e of s.events) {
      if (e.t <= seenT) continue;
      if (e.kind === 'land') fx.burst(X(e.x), Y(e.y), '#c9b08a', 8, 2, 2.5);
      if (e.kind === 'kill') fx.burst(X(e.x), Y(e.y), th.accent, 14, 3), fx.pop(X(e.x), Y(e.y) - 10, e.text!, th.accent, 15), fx.kick(2);
      if (e.kind === 'wall') fx.kick(9), fx.blink(th.hot, 0.3), fx.burst(X(e.x), Y(e.y), '#a7a39b', 18, 3.5), fx.pop(X(e.x), Y(e.y) - 14, e.text!, th.hot, 16);
      if (e.kind === 'build') fx.burst(X(e.x), Y(e.y), th.accent, 24, 3.5), fx.blink('#fff2b0', 0.2), fx.pop(X(e.x), Y(e.y) - 30, e.text!, th.ink, 16);
      if (e.kind === 'wave') fx.pop(w / 2, h * 0.32, e.text!, th.ink, 22), fx.blink('#ffffff', 0.15);
      if (e.kind === 'new') fx.pop(w / 2, h * 0.4, e.text!, th.accent, 16);
    }
    fx.memo.t = s.t;
    ctx.restore();
    // 머리말: 금 · 성 체력 · 웨이브와 다음 적 예고 · 다음 건물 (위 띠는 반투명 — 적이 나오는 숲이 비친다)
    ctx.fillStyle = 'rgba(10,25,15,.55)';
    ctx.fillRect(0, 0, w, Y(TOP - 0.035));
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';
    ctx.fillStyle = th.ink;
    ctx.font = `800 ${R(0.065)}px system-ui, sans-serif`;
    ctx.fillText(`🪙 ${s.earned}`, 10, 8);
    ctx.textAlign = 'right';
    ctx.font = `700 ${R(0.038)}px system-ui, sans-serif`;
    ctx.fillText(`성 ${Math.max(0, s.hp)}/${s.maxHp}`, w - 10, 10);
    ctx.fillStyle = 'rgba(0,0,0,.35)';
    ctx.fillRect(w - 10 - R(0.25), 14 + R(0.04), R(0.25), 6);
    ctx.fillStyle = s.hp <= 3 ? th.hot : '#7be07b';
    ctx.fillRect(w - 10 - R(0.25), 14 + R(0.04), (R(0.25) * Math.max(0, s.hp)) / s.maxHp, 6);
    ctx.textAlign = 'center';
    ctx.fillStyle = th.ink;
    const nxt = debut(s.wave + 1);
    ctx.fillText(s.left === 0 && s.enemies.length === 0 ? `다음: ${s.wave + 1}번째 웨이브${nxt ? ` · 새 적 ???` : ''}` : `${s.wave}번째 웨이브 · 남은 적 ${s.left + s.enemies.length}`, w / 2, R(0.1));
    if (s.next < PLAN.length) {
      const need = COST(s.next), have = Math.min(s.gold, need), seen = s.seen.has('b:' + PLAN[s.next]);
      ctx.font = `700 ${R(0.032)}px system-ui, sans-serif`;
      ctx.fillStyle = 'rgba(0,0,0,.4)';
      ctx.fillRect(w / 2 - R(0.24), h - R(0.06), R(0.48), R(0.045));
      ctx.fillStyle = th.accent;
      ctx.fillRect(w / 2 - R(0.24), h - R(0.06), (R(0.48) * have) / need, R(0.045));
      ctx.fillStyle = th.ink;
      ctx.fillText(`금 ${have}/${need} → ${seen || PLAN[s.next] === 'house' ? NAME[PLAN[s.next]] : '??? 새 건물'}`, w / 2, h - R(0.055));
    }
    if (s.t < 300 && s.stones.length === 0 && !s.aim) (ctx.fillStyle = th.ink), (ctx.font = `700 ${R(0.04)}px system-ui, sans-serif`), ctx.fillText('👆 누른 채 겨누고, 떼면 던져요', w / 2, h * 0.55);
  },
};

const memo = new WeakMap<object, Input>();
/** 봇: 0.7초쯤마다 아무 데나 누르거나 뗀다 */
export const slingRandom: Bot<SlingState> = {
  name: '아무 데나',
  act(s, rng) {
    if (s.t % 40 === 0 || !memo.has(s)) memo.set(s, { tap: false, dir: 0, pointer: rng() < 0.6 ? { x: rng(), y: rng() * 0.75 } : null });
    return memo.get(s)!;
  },
};

/** 봇: 성벽에 가장 먼저 닿을 적의 '돌이 떨어질 때 위치'를 겨누고, 장전되면 뗀다 */
export const slingSmart: Bot<SlingState> = {
  name: '돌팔매꾼',
  act(s) {
    if (s.aim && s.reload <= 0 && !s.queued) return { tap: false, dir: 0, pointer: null };
    const busy = s.stones.filter((st) => !st.auto);
    const eta = (e: Enemy) => (WALL - e.y) / speed(s, e) - e.hp * 30;
    const tgt = [...s.enemies].filter((e) => e.y > TOP && !busy.some((st) => Math.hypot(st.tx - e.x, st.ty - e.y) < 0.08)).sort((p, q) => eta(p) - eta(q))[0];
    if (!tgt) return { tap: false, dir: 0, pointer: s.aim ? { x: s.aim.x, y: s.aim.y / A } : null };
    let T = flight(Math.hypot(tgt.x - SX, tgt.y - SY)) + 4;
    const blocked = tgt.kind !== 'bat' && s.rubble.some((r) => Math.hypot(r.x - tgt.x, r.y - tgt.y - 0.01) < RUBBLE_R + FOE[tgt.kind].r + 0.004 && r.y > tgt.y);
    let y = tgt.y + (blocked ? 0 : speed(s, tgt) * T);
    T = flight(Math.hypot(tgt.x - SX, y - SY)) + 4;
    y = tgt.y + (blocked ? 0 : speed(s, tgt) * T);
    return { tap: false, dir: 0, pointer: { x: exX(s, tgt, s.t + T), y: y / A } };
  },
};
