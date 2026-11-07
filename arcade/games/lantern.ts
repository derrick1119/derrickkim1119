/**
 * 등불 마을 (0023, 10라운드 '취향 쪽') — 타워 디펜스 × 농사·수확 · 가리키기 · 낮과 밤.
 * 오너가 고른 "지키고 키우는 내 기지"를 궤도·자동 사격 없이 다시 만든다.
 *  - 조작은 하나: 누른 곳에 등불 빛이 비친다. 낮엔 그 빛이 밭을 키우고(다 익은 밭에 대면 거둔다), 밤엔 같은 빛이 그림자를 태운다.
 *  - 거둔 곡식이 모이면 마을이 저절로 커진다: 집 → 감시탑 → 풍차 → 등대 → 우물 … (눈에 보이는 성장)
 *  - 밤마다 새 그림자(박쥐·거인·분열)와 사건(까마귀·별똥별·붉은 달)이 열린다 → reveals
 */
import { mulberry32, type Rng } from '../../engine/rng.ts';
import type { Bot, GameDef, Input, Theme } from '../core.ts';
import { drift as dust, juice } from '../juice.ts';

const A = 1.15, CX = 0.5, CY = 0.6, LIGHT = 0.085, PLOT = 0.032, REACH = 0.03;
const DAY = (n: number) => 60 * (n === 1 ? 16 : 14), NIGHT = (n: number) => 60 * (16 + 3 * n);
type Kind = 'house' | 'tower' | 'mill' | 'lighthouse' | 'well';
const NAME: Record<Kind, string> = { house: '집', tower: '감시탑', mill: '풍차', lighthouse: '등대', well: '우물' };
const PLAN: Kind[] = ['house', 'tower', 'mill', 'house', 'lighthouse', 'tower', 'well', 'house', 'tower'];
type Foe = 'crawler' | 'bat' | 'giant' | 'splitter';
const FOE_NAME: Record<Foe, string> = { crawler: '그림자', bat: '박쥐', giant: '거인 그림자', splitter: '쪼개지는 그림자' };
interface Building { kind: Kind; x: number; y: number; lit: boolean; at: number }
interface Plot { x: number; y: number; g: number; ripe: number; lit: number }
interface Shadow { kind: Foe; x: number; y: number; hp: number; max: number; v: number; wob: number }
interface Crow { x: number; y: number; plot: number; sit: number; hp: number }
interface Star { x: number; y: number; vx: number; vy: number; lit: number }
interface Ev { t: number; kind: string; x: number; y: number; text?: string }
export interface LanternState {
  rng: Rng; t: number; night: boolean; n: number; phaseLeft: number; phaseLen: number;
  light: { x: number; y: number } | null;
  lamp: { x: number; y: number };
  plots: Plot[]; town: Building[]; next: number; grain: number; harvest: number; kills: number;
  shadows: Shadow[]; crows: Crow[]; stars: Star[]; spawnIn: number; moon: boolean;
  seen: Set<string>; events: Ev[]; dead: boolean;
}

const SLOTS = [...Array(12).keys()].map((k) => {
  const r = k < 6 ? 0.075 : 0.145, a = (k * Math.PI) / 3 + (k < 6 ? 0 : Math.PI / 6) - Math.PI / 2;
  return { x: CX + Math.cos(a) * r, y: CY + Math.sin(a) * r * 0.8 };
});
const cost = (k: number) => 3 + 2 * k;
const dist = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);
const lit = (s: LanternState, p: { x: number; y: number }, extra = 0) => !!s.light && dist(s.light, p) < LIGHT + extra;
const has = (s: LanternState, k: Kind) => s.town.some((b) => b.kind === k);
const ev = (s: LanternState, kind: string, x: number, y: number, text?: string) => s.events.push({ t: s.t, kind, x, y, text });
function see(s: LanternState, key: string, text: string) {
  if (s.seen.has(key)) return;
  s.seen.add(key);
  ev(s, 'new', CX, 0.16, text);
}

function spawn(s: LanternState) {
  const n = s.n, r = s.rng();
  const kind: Foe = n >= 4 && r < 0.18 ? 'splitter' : n >= 3 && r < 0.3 ? 'giant' : n >= 2 && r < 0.55 ? 'bat' : 'crawler';
  const a = s.rng() * Math.PI * 2, hp = { crawler: 1, bat: 0.35, giant: 4, splitter: 1.6 }[kind];
  const v = { crawler: 0.05 + 0.015 * n, bat: 0.13 + 0.02 * n, giant: 0.034 + 0.003 * n, splitter: 0.06 + 0.006 * n }[kind] / 60;
  s.shadows.push({ kind, x: CX + Math.cos(a) * 0.62, y: CY + Math.sin(a) * 0.62, hp, max: hp, v, wob: s.rng() * 6 });
  see(s, kind, kind === 'crawler' ? '밤이 왔어요 — 그림자를 빛으로 태워요!' : `새 그림자: ${FOE_NAME[kind]}!`);
  s.spawnIn = Math.max(5, Math.round(68 - 15 * n - s.rng() * 12)); // 첫 밤은 느긋하게, 넷째 밤부터 몰려온다
}

function build(s: LanternState) {
  while (s.next < PLAN.length && s.grain >= cost(s.next)) {
    s.grain -= cost(s.next);
    const kind = PLAN[s.next], slot = SLOTS[s.town.length];
    s.town.push({ kind, x: slot.x, y: slot.y, lit: true, at: s.t });
    s.next++;
    ev(s, 'build', slot.x, slot.y, `새 ${NAME[kind]}!`);
    see(s, 'b:' + kind, kind === 'house' ? '마을이 커져요 — 새 집!' : `새 건물: ${NAME[kind]}`);
  }
}

function turn(s: LanternState) {
  s.night = !s.night;
  if (s.night) {
    s.phaseLen = s.phaseLeft = NIGHT(s.n);
    s.moon = s.n >= 5 && s.n % 2 === 1;
    if (s.moon) see(s, 'moon', '붉은 달 — 그림자가 빨라져요!');
    s.spawnIn = 60;
  } else {
    s.n++;
    s.phaseLen = s.phaseLeft = DAY(s.n);
    s.shadows = [];
    s.stars = [];
    const dark = s.town.find((b) => b.kind === 'house' && !b.lit);
    if (has(s, 'well') && dark) (dark.lit = true), ev(s, 'build', dark.x, dark.y, '우물 덕에 다시 켜졌어요');
    if (s.n === 2) see(s, 'crow', '낮에도 까마귀가 밭을 노려요!');
  }
}

export const lantern: GameDef<LanternState> = {
  id: 'lantern',
  name: '등불 마을',
  genes: ['defense', 'farm', 'pointer', 'daynight'],
  twist: '등불 하나로 낮엔 밭을 키우고 밤엔 그림자를 태운다 — 같은 손짓이 시간에 따라 다른 일이 된다',
  rules: ['누르고 있는 곳에 등불 빛이 비쳐요 (키보드: 화살표로 옮기고 스페이스).', '낮: 빛을 댄 밭이 빨리 자라고, 다 익은 밭에 대면 거둬요. 곡식이 모이면 마을이 커져요.', '밤: 숲에서 오는 그림자를 빛으로 태워요. 불 켜진 집이 다 꺼지면 끝.'],
  controls: 'touch',
  hint: '누르고 있는 곳에 빛 / 화살표 + 스페이스',
  aspect: A,
  art: {
    concept: '숲속 등불 마을',
    mood: '낮엔 볕 드는 풀밭과 황금 밭, 밤엔 남색 어둠 속에 창문 불빛과 내 등불만 따뜻하게 번진다. 숲 가장자리에서 눈들이 깜빡인다.',
    palette: { bg: '#0d1530', ink: '#fff3c4', muted: '#4a5a86', accent: '#ffc94d', hot: '#ff5a6e', soft: '#1d2a52' },
  },
  reveals: (s) => s.seen.size,
  create(seed) {
    const s: LanternState = {
      rng: mulberry32(seed), t: 0, night: false, n: 1, phaseLeft: DAY(1), phaseLen: DAY(1), light: null, lamp: { x: CX, y: CY },
      plots: [...Array(8).keys()].map((k) => ({ x: CX + Math.cos((k * Math.PI) / 4 + Math.PI / 8) * 0.25, y: CY + Math.sin((k * Math.PI) / 4 + Math.PI / 8) * 0.22, g: 0.25 + 0.1 * (k % 3), ripe: 0, lit: 0 })),
      town: SLOTS.slice(0, 3).map((p) => ({ kind: 'house' as Kind, x: p.x, y: p.y, lit: true, at: -999 })),
      next: 0, grain: 0, harvest: 0, kills: 0, shadows: [], crows: [], stars: [], spawnIn: 60, moon: false, seen: new Set(), events: [], dead: false,
    };
    return s;
  },
  step(s, inp: Input) {
    s.t++;
    s.events = s.events.filter((e) => s.t - e.t < 90);
    // 등불은 손가락으로 빠르게 날아간다(0.2초에 화면 1/3). 누르고 있는 동안만 빛난다
    if (inp.pointer) {
      const to = { x: inp.pointer.x, y: inp.pointer.y * A }, d = dist(s.lamp, to), k = Math.min(1, 0.05 / Math.max(d, 1e-9));
      s.lamp = { x: s.lamp.x + (to.x - s.lamp.x) * k, y: s.lamp.y + (to.y - s.lamp.y) * k };
    }
    s.light = inp.pointer ? s.lamp : null;
    if (--s.phaseLeft <= 0) turn(s);
    const mill = has(s, 'mill') ? 1.6 : 1;
    // 밭: 낮엔 저절로 자라고 빛을 대면 3배. 익으면 빛을 0.2초 대서 거둔다. 6초 안 거두면 시든다
    for (const p of s.plots) {
      const on = lit(s, p, PLOT * 0.5);
      p.lit = on ? p.lit + 1 : 0;
      if (p.g < 1) {
        p.g = Math.min(1, p.g + (s.night ? 0.25 : 1) * (on ? 3 : 1) * mill / (60 * 10));
        if (p.g >= 1) p.ripe = 0;
      } else if (on && p.lit >= 12) {
        p.g = 0;
        s.grain++;
        s.harvest++;
        ev(s, 'harvest', p.x, p.y, '+1');
        build(s);
      } else if (++p.ripe > 60 * 6) (p.g = 0), ev(s, 'wither', p.x, p.y, '시들었어요');
    }
    if (!s.night && s.n >= 2 && s.t % 150 === 0 && s.crows.length < 1 + Math.floor(s.n / 2)) {
      const k = Math.floor(s.rng() * 8), side = s.rng() < 0.5 ? -0.1 : 1.1;
      s.crows.push({ x: side, y: 0.1 + s.rng() * 0.3, plot: k, sit: 0, hp: 0.25 });
    }
    for (const c of s.crows) {
      const p = s.plots[c.plot], d = dist(c, p);
      if (lit(s, c, 0.01)) c.hp -= 1 / 60;
      if (d > 0.01) (c.x += ((p.x - c.x) / d) * Math.min(d, 0.004)), (c.y += ((p.y - c.y) / d) * Math.min(d, 0.004));
      else if (++c.sit > 100) (p.g = 0), (c.hp = 0), ev(s, 'wither', p.x, p.y, '까마귀가 먹었어요');
      if (c.hp <= 0 && c.sit <= 100) (s.kills++, ev(s, 'kill', c.x, c.y, '훠이!'));
    }
    s.crows = s.crows.filter((c) => c.hp > 0 && !s.night);
    if (s.night) {
      if (--s.spawnIn <= 0) spawn(s);
      if (s.n >= 3 && s.t % 170 === 0) {
        s.stars.push({ x: s.rng() * 0.6, y: -0.02, vx: 0.0025, vy: 0.0022, lit: 0 });
        see(s, 'star', '별똥별 — 빛으로 잡으면 곡식 +2');
      }
    }
    for (const st of s.stars) {
      st.x += st.vx;
      st.y += st.vy;
      st.lit = lit(s, st, 0.01) ? st.lit + 1 : 0;
      if (st.lit < 8) continue;
      ev(s, 'star', st.x, st.y, '+2');
      st.y = 9;
      s.grain += 2;
      s.harvest += 2;
      build(s);
    }
    s.stars = s.stars.filter((st) => st.y < A + 0.05 && st.x < 1.05);
    // 감시탑·등대: 밤에 저절로 비춘다
    const sweep = s.t * 0.022;
    for (const sh of s.shadows) {
      let burn = lit(s, sh, 0.012) ? 1 / 45 : 0;
      const inLight = burn > 0;
      for (const b of s.town) if (b.kind === 'tower' && dist(b, sh) < 0.27) burn += 1 / 260;
      if (has(s, 'lighthouse')) {
        const a = Math.atan2(sh.y - CY, sh.x - CX), da = Math.abs(((a - sweep) % (2 * Math.PI) + 3 * Math.PI) % (2 * Math.PI) - Math.PI);
        if (da < 0.32 && dist(sh, { x: CX, y: CY }) < 0.5) burn += 1 / 120;
      }
      sh.hp -= burn;
      const target = s.town.filter((b) => b.kind === 'house' && b.lit).sort((p, q) => dist(p, sh) - dist(q, sh))[0];
      if (!target) continue;
      const d = dist(sh, target), v = sh.v * (inLight ? 0.35 : 1) * (s.moon ? 1.25 : 1);
      const side = sh.kind === 'bat' ? Math.sin(s.t / 9 + sh.wob) * 0.6 : 0;
      sh.x += ((target.x - sh.x) / d) * v - ((target.y - sh.y) / d) * v * side;
      sh.y += ((target.y - sh.y) / d) * v + ((target.x - sh.x) / d) * v * side;
      if (d < REACH) {
        target.lit = false;
        sh.hp = -99;
        ev(s, 'lost', target.x, target.y, '집이 꺼졌어요!');
      }
    }
    for (const sh of s.shadows.filter((x) => x.hp <= 0 && x.hp > -99)) {
      s.kills++;
      ev(s, 'kill', sh.x, sh.y, sh.kind === 'giant' ? '+1 거인!' : '+1');
      if (sh.kind === 'splitter') for (const k of [-1, 1]) s.shadows.push({ kind: 'crawler', x: sh.x + k * 0.03, y: sh.y, hp: 0.6, max: 0.6, v: 0.06 / 60, wob: 0 });
    }
    s.shadows = s.shadows.filter((x) => x.hp > 0);
    if (!s.town.some((b) => b.kind === 'house' && b.lit)) s.dead = true;
  },
  over: (s) => s.dead,
  score: (s) => s.kills + s.harvest,
  draw(ctx, s, w, h, th: Theme) {
    const fx = juice(s), X = (x: number) => x * w, Y = (y: number) => y * w, R = (r: number) => r * w;
    // 낮↔밤을 2초에 걸쳐 섞는다
    const into = Math.min(1, (s.phaseLen - s.phaseLeft) / 120), dark = s.night ? into : 1 - into;
    ctx.save();
    fx.begin(ctx);
    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, s.moon && s.night ? '#3a1530' : dark > 0.5 ? '#16224a' : '#9fd88a');
    sky.addColorStop(1, dark > 0.5 ? th.bg : '#5aa66a');
    ctx.fillStyle = sky;
    ctx.fillRect(-10, -10, w + 20, h + 20);
    for (const p of s.plots) {
      ctx.strokeStyle = dark > 0.5 ? 'rgba(60,50,40,.5)' : 'rgba(170,130,80,.55)';
      ctx.lineWidth = R(0.018);
      ctx.beginPath();
      ctx.moveTo(X(CX), Y(CY));
      ctx.lineTo(X(p.x), Y(p.y));
      ctx.stroke();
    }
    for (let k = 0; k < 70; k++) {
      const x = ((k * 7919) % 997) / 997, y = (((k * 104729) % 991) / 991) * A, sway = Math.sin(s.t / 30 + k) * 1.5;
      ctx.strokeStyle = dark > 0.5 ? 'rgba(40,70,90,.5)' : 'rgba(40,110,50,.55)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(X(x) - 3, Y(y));
      ctx.lineTo(X(x) - 1 + sway, Y(y) - 6);
      ctx.moveTo(X(x) + 2, Y(y));
      ctx.lineTo(X(x) + 3 + sway, Y(y) - 5);
      ctx.stroke();
      if (k % 5 === 0) (ctx.fillStyle = dark > 0.5 ? '#3a4a6a' : ['#ffffff', '#ffd1e8', '#fff06a'][k % 3]), ctx.fillRect(X(x) + 4, Y(y) - 7, 3, 3);
    }
    // 숲 가장자리 (흔들리는 나무)
    for (let k = 0; k < 26; k++) {
      const a = (k / 26) * Math.PI * 2, x = CX + Math.cos(a) * 0.56, y = CY + Math.sin(a) * 0.6, sway = Math.sin(s.t / 40 + k) * 2;
      ctx.fillStyle = dark > 0.5 ? '#1a1410' : '#6b4a2b';
      ctx.fillRect(X(x) - 2, Y(y) + R(0.02), 4, R(0.025));
      for (const [lift, half, col] of [[0, 0.045, dark > 0.5 ? '#0b1a2a' : '#2f6b3d'], [0.035, 0.032, dark > 0.5 ? '#10243a' : '#3f8a4f']] as const) {
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.moveTo(X(x) + sway, Y(y) - R(0.06 + lift));
        ctx.lineTo(X(x) - R(half), Y(y) + R(0.025 - lift));
        ctx.lineTo(X(x) + R(half), Y(y) + R(0.025 - lift));
        ctx.fill();
      }
      // 낮에도 숲 속 눈이 깜빡인다 (밤이 온다는 예고)
      if ((k * 7 + Math.floor(s.t / 50)) % 9 === 0) {
        ctx.fillStyle = dark > 0.5 ? th.hot : 'rgba(255,240,180,.8)';
        ctx.fillRect(X(x) - 4, Y(y) - 2, 2, 2);
        ctx.fillRect(X(x) + 2, Y(y) - 2, 2, 2);
      }
    }
    // 밭
    for (const p of s.plots) {
      ctx.fillStyle = '#6b4a2b';
      ctx.fillRect(X(p.x - PLOT), Y(p.y - PLOT), R(PLOT * 2), R(PLOT * 2));
      const ripe = p.g >= 1;
      ctx.fillStyle = ripe ? '#ffd23f' : '#7ed957';
      for (let k = 0; k < 3; k++) {
        const hh = R(0.006 + 0.03 * p.g) * (ripe ? 1 + 0.08 * Math.sin(s.t / 6 + k) : 1);
        ctx.fillRect(X(p.x - PLOT * 0.7 + k * PLOT * 0.6), Y(p.y + PLOT * 0.8) - hh, R(0.008), hh);
      }
      if (ripe && s.t % 30 < 15) (ctx.fillStyle = '#fff6b0'), ctx.fillRect(X(p.x) - 1, Y(p.y - PLOT) - 4, 3, 3);
    }
    // 마을
    for (const b of s.town) {
      const x = X(b.x), y = Y(b.y), u = R(0.027), grow = Math.min(1, (s.t - b.at) / 20);
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(grow, grow);
      ctx.fillStyle = b.kind === 'house' ? '#c9a27a' : b.kind === 'tower' ? '#8d99ae' : b.kind === 'mill' ? '#e6d5b8' : b.kind === 'lighthouse' ? '#f1f1f1' : '#7f8c9a';
      if (b.kind === 'tower' || b.kind === 'lighthouse') ctx.fillRect(-u * 0.5, -u * 2, u, u * 2.6);
      else ctx.fillRect(-u, -u * 0.6, u * 2, u * 1.4);
      ctx.fillStyle = b.kind === 'house' ? '#a2453d' : '#5c677d';
      ctx.beginPath();
      ctx.moveTo(-u * 1.2, b.kind === 'house' || b.kind === 'mill' || b.kind === 'well' ? -u * 0.6 : -u * 2);
      ctx.lineTo(0, b.kind === 'house' || b.kind === 'mill' || b.kind === 'well' ? -u * 1.6 : -u * 2.9);
      ctx.lineTo(u * 1.2, b.kind === 'house' || b.kind === 'mill' || b.kind === 'well' ? -u * 0.6 : -u * 2);
      ctx.fill();
      if (b.kind === 'mill') {
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        for (let k = 0; k < 4; k++) {
          const a = s.t * 0.05 + (k * Math.PI) / 2;
          ctx.beginPath();
          ctx.moveTo(0, -u);
          ctx.lineTo(Math.cos(a) * u * 1.6, -u + Math.sin(a) * u * 1.6);
          ctx.stroke();
        }
      }
      if (b.kind === 'house') (ctx.fillStyle = b.lit ? '#ffe066' : '#1b1b2a'), ctx.fillRect(-u * 0.35, -u * 0.2, u * 0.7, u * 0.6);
      ctx.restore();
    }
    // 어둠 + 빛 번짐
    if (dark > 0.01) {
      ctx.fillStyle = s.moon ? `rgba(30,5,20,${0.62 * dark})` : `rgba(5,9,28,${0.62 * dark})`;
      ctx.fillRect(-10, -10, w + 20, h + 20);
      dust(ctx, w, h, s.t, '#d9ff8a', 22, 0.05);
    }
    ctx.globalCompositeOperation = 'lighter';
    const glow = (x: number, y: number, r: number, a: number) => {
      const gr = ctx.createRadialGradient(X(x), Y(y), 0, X(x), Y(y), R(r));
      gr.addColorStop(0, `rgba(255,200,90,${a})`);
      gr.addColorStop(1, 'rgba(255,200,90,0)');
      ctx.fillStyle = gr;
      ctx.beginPath();
      ctx.arc(X(x), Y(y), R(r), 0, Math.PI * 2);
      ctx.fill();
    };
    for (const b of s.town) if (b.lit || b.kind !== 'house') glow(b.x, b.y, 0.05, 0.35 * dark);
    if (s.night && has(s, 'lighthouse')) {
      const a = s.t * 0.022;
      ctx.fillStyle = 'rgba(255,230,140,.16)';
      ctx.beginPath();
      ctx.moveTo(X(CX), Y(CY));
      ctx.arc(X(CX), Y(CY), R(0.5), a - 0.32, a + 0.32);
      ctx.fill();
    }
    if (s.light) glow(s.light.x, s.light.y, LIGHT * 1.25, 0.55);
    ctx.globalCompositeOperation = 'source-over';
    // 감시탑 빛줄기
    if (s.night) for (const b of s.town.filter((x) => x.kind === 'tower')) {
      const sh = s.shadows.filter((x) => dist(x, b) < 0.27).sort((p, q) => dist(p, b) - dist(q, b))[0];
      if (!sh) continue;
      ctx.strokeStyle = 'rgba(255,230,140,.5)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(X(b.x), Y(b.y) - R(0.04));
      ctx.lineTo(X(sh.x), Y(sh.y));
      ctx.stroke();
    }
    // 그림자들 (눈 두 개)
    for (const sh of s.shadows) {
      const r = R(sh.kind === 'giant' ? 0.04 : sh.kind === 'bat' ? 0.016 : 0.022) * (1 + 0.08 * Math.sin(s.t / 7 + sh.wob));
      const aura = ctx.createRadialGradient(X(sh.x), Y(sh.y), 0, X(sh.x), Y(sh.y), r * 2.2);
      aura.addColorStop(0, s.moon ? 'rgba(255,60,90,.45)' : 'rgba(150,90,255,.45)');
      aura.addColorStop(1, 'rgba(150,90,255,0)');
      ctx.fillStyle = aura;
      ctx.fillRect(X(sh.x) - r * 2.2, Y(sh.y) - r * 2.2, r * 4.4, r * 4.4);
      ctx.fillStyle = sh.kind === 'splitter' ? '#4a2470' : '#1c1030';
      ctx.strokeStyle = sh.kind === 'giant' ? '#ff8aa0' : '#b28dff';
      ctx.lineWidth = 1.5;
      ctx.globalAlpha = 0.55 + 0.45 * (sh.hp / sh.max);
      ctx.beginPath();
      if (sh.kind === 'bat') {
        const f = Math.sin(s.t / 3 + sh.wob) * r;
        ctx.moveTo(X(sh.x) - r * 2, Y(sh.y) - f);
        ctx.lineTo(X(sh.x), Y(sh.y) + r * 0.6);
        ctx.lineTo(X(sh.x) + r * 2, Y(sh.y) - f);
      } else ctx.arc(X(sh.x), Y(sh.y), r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.fillStyle = s.moon ? '#ff3355' : '#ff6b81';
      ctx.fillRect(X(sh.x) - r * 0.45, Y(sh.y) - r * 0.2, 3, 3);
      ctx.fillRect(X(sh.x) + r * 0.2, Y(sh.y) - r * 0.2, 3, 3);
      if (lit(s, sh, 0.012)) fx.burst(X(sh.x), Y(sh.y), '#ffb347', 1, 1.2, 2);
    }
    for (const c of s.crows) {
      ctx.fillStyle = '#111';
      ctx.beginPath();
      ctx.ellipse(X(c.x), Y(c.y), R(0.016), R(0.01), 0, 0, Math.PI * 2);
      ctx.fill();
    }
    for (const st of s.stars) {
      ctx.strokeStyle = '#fff6c8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(X(st.x), Y(st.y));
      ctx.lineTo(X(st.x - st.vx * 12), Y(st.y - st.vy * 12));
      ctx.stroke();
      fx.burst(X(st.x), Y(st.y), '#fff6c8', 1, 0.6, 1.5);
    }
    // 사건 → 연출 (상태에 남은 사건 중 이번에 처음 보는 것만)
    const seenT = fx.memo.t ?? -1;
    for (const e of s.events) {
      if (e.t <= seenT) continue;
      if (e.kind === 'harvest' || e.kind === 'star') fx.burst(X(e.x), Y(e.y), '#ffd23f', 14, 2.5), fx.pop(X(e.x), Y(e.y) - 10, e.text!, '#ffe680');
      if (e.kind === 'kill') fx.burst(X(e.x), Y(e.y), '#b28dff', 16, 3), fx.pop(X(e.x), Y(e.y) - 8, e.text!, '#e0d0ff', 14);
      if (e.kind === 'wither') fx.pop(X(e.x), Y(e.y) - 8, e.text!, '#c0a080', 12);
      if (e.kind === 'lost') fx.kick(9), fx.blink(th.hot, 0.35), fx.pop(X(e.x), Y(e.y) - 14, e.text!, th.hot, 16);
      if (e.kind === 'build') fx.burst(X(e.x), Y(e.y), '#ffe066', 26, 3.5), fx.blink('#ffe9a0', 0.25), fx.pop(X(e.x), Y(e.y) - 24, e.text!, '#fff3c4', 17);
      if (e.kind === 'new') fx.pop(w / 2, h * 0.2, e.text!, th.accent, 17);
    }
    fx.memo.t = s.t;
    ctx.restore();
    // 머리말: 점수 · 남은 집 · 낮/밤 시계 · 다음 건물 예고
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';
    ctx.fillStyle = th.ink;
    ctx.font = `800 ${R(0.07)}px system-ui, sans-serif`;
    ctx.fillText(String(lantern.score(s)), 10, 8);
    ctx.textAlign = 'right';
    ctx.font = `700 ${R(0.04)}px system-ui, sans-serif`;
    const houses = s.town.filter((b) => b.kind === 'house');
    ctx.fillText(`${'🏠'.repeat(houses.filter((b) => b.lit).length)}${'▫'.repeat(houses.filter((b) => !b.lit).length)}`, w - 8, 10);
    ctx.textAlign = 'center';
    const left = Math.ceil(s.phaseLeft / 60);
    ctx.fillText(s.night ? `🌙 ${s.n}일째 밤 · 동틀 때까지 ${left}초` : `☀️ ${s.n}일째 낮 · 밤까지 ${left}초`, w / 2, R(0.1));
    if (s.next < PLAN.length) {
      const need = cost(s.next), have = Math.min(s.grain, need), seen = s.seen.has('b:' + PLAN[s.next]);
      ctx.fillStyle = 'rgba(0,0,0,.35)';
      ctx.fillRect(w / 2 - R(0.22), h - R(0.065), R(0.44), R(0.045));
      ctx.fillStyle = th.accent;
      ctx.fillRect(w / 2 - R(0.22), h - R(0.065), R(0.44) * (have / need), R(0.045));
      ctx.fillStyle = th.ink;
      ctx.font = `700 ${R(0.032)}px system-ui, sans-serif`;
      ctx.fillText(`곡식 ${have}/${need} → ${seen || PLAN[s.next] === 'house' ? NAME[PLAN[s.next]] : '??? 새 건물'}`, w / 2, h - R(0.06));
    }
    if (s.t < 240 && !s.light) (ctx.fillStyle = th.ink), ctx.fillText('👆 밭을 눌러 빛을 비춰 보세요', w / 2, h * 0.36);
  },
};

const memo = new WeakMap<object, Input>();
/** 봇: 1초쯤마다 아무 데나 누르거나 뗀다 */
export const lanternRandom: Bot<LanternState> = {
  name: '아무 데나',
  act(s, rng) {
    if (s.t % 45 === 0 || !memo.has(s)) memo.set(s, { tap: false, dir: 0, pointer: rng() < 0.7 ? { x: rng(), y: rng() } : null });
    return memo.get(s)!;
  },
};

/** 봇: 밤엔 집에 가장 먼저 닿을 그림자, 낮엔 까마귀 → 익은 밭(오래된 것부터) → 가장 많이 자란 밭 */
export const lanternSmart: Bot<LanternState> = {
  name: '등불지기',
  act(s) {
    const at = (p: { x: number; y: number }) => ({ tap: false, dir: 0 as const, pointer: { x: p.x, y: p.y / A } });
    if (s.night) {
      const houses = s.town.filter((b) => b.kind === 'house' && b.lit);
      const eta = (sh: Shadow) => Math.min(...houses.map((b) => dist(b, sh))) / sh.v - sh.hp * 45;
      const sh = [...s.shadows].sort((p, q) => eta(p) - eta(q))[0];
      const star = s.stars.find((st) => st.x > 0.05 && st.y > 0.05);
      if (star && (!sh || eta(sh) > 60 * 4)) return at({ x: star.x + star.vx * 4, y: star.y + star.vy * 4 });
      if (sh) return at(sh);
      return at({ x: CX, y: CY });
    }
    const crow = s.crows.find((c) => c.x > 0 && c.x < 1);
    if (crow) return at(crow);
    const ripe = s.plots.filter((p) => p.g >= 1).sort((p, q) => q.ripe - p.ripe)[0];
    if (ripe) return at(ripe);
    return at([...s.plots].sort((p, q) => q.g - p.g)[0]);
  },
};
