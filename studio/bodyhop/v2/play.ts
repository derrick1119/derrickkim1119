/**
 * 👻 몸 갈아타기 2기 M1 — 움직이는 시안(수채 동화풍, 오너가 고른 1번).
 * 규칙 = v2/sim.ts(결정적 시뮬, 1기 그대로) · 그림 = w1/에 미리 구운 수채 조각을 2D 캔버스에 옮겨 놓기만 한다.
 * 아이폰 사파리 안전: WebGL 없음 · 캔버스 filter 없음 · 합성은 source-over/multiply/lighter만.
 * 처음엔 봇이 하고, 화면을 톡하면 내가 한다. 스페이스 = 가장 센 적에게 톡.
 */
import { mulberry32 } from '../rng.ts';
import { bodyhop as game, bodyhopHabit2, bodyhopSmart, GEO, KD, popR, type HopState } from './sim.ts';
import type { Input } from '../core.ts';
import ATLAS from './w1/atlas.json';

type Spr = { x: number; y: number; w: number; h: number; ax: number; ay: number };
const MAP = ATLAS as Record<string, Spr>;
const DW = 390, DH = 844, CXp = 195, CYp = 598, S = 400;
/** 카메라: 마당 쪽으로 당겨(👁 [치명] 캐릭터가 작고 하늘이 45%) 마당 가운데를 화면 y 560에, 1.15배 */
const ZOOM = 1.15, CAMY = 560;
const X = (x: number) => CXp + (x - GEO.CX) * S;
const Y = (y: number) => CYp + (y - GEO.CY) * S;
const TEAL = '#12C9C0', INK = '#4A2410', PAPER = '#FBF6EA';
const TAU = Math.PI * 2;

const cv = document.getElementById('c') as HTMLCanvasElement;
const ctx = cv.getContext('2d')!;
const load = (src: string) => new Promise<HTMLImageElement>((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = src; });

let IMG: Record<string, HTMLImageElement> = {};
let s: HopState, seed = 1, human = false, pend: { x: number; y: number } | null = null, rng = mulberry32(7), endT = 0;
const prev = new Map<number, { x: number; y: number; mv: number }>();

function fresh() {
  s = game.create(seed++);
  prev.clear();
  endT = 0;
}

// ───────── 화면 맞춤 (디자인 390×844를 화면에 꽉, 남는 곳은 종이색) ─────────
let scale = 1, ox = 0, oy = 0, dpr = 1;
function fit() {
  dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = window.innerWidth, h = window.innerHeight;
  cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
  cv.style.width = w + 'px'; cv.style.height = h + 'px';
  scale = Math.min(w / DW, h / DH);
  ox = (w - DW * scale) / 2; oy = (h - DH * scale) / 2;
}

function spr(name: string, x: number, y: number, sc = 1, o: { sx?: number; sy?: number; rot?: number; a?: number; flip?: boolean; op?: GlobalCompositeOperation } = {}) {
  const m = MAP[name]; if (!m) return;
  ctx.save();
  ctx.translate(x, y);
  if (o.rot) ctx.rotate(o.rot);
  ctx.scale(sc * (o.sx ?? 1) * (o.flip ? -1 : 1) / 2, sc * (o.sy ?? 1) / 2);
  if (o.a !== undefined) ctx.globalAlpha = Math.max(0, Math.min(1, o.a));
  if (o.op) ctx.globalCompositeOperation = o.op;
  ctx.drawImage(IMG.atlas, m.x, m.y, m.w, m.h, -m.ax, -m.ay, m.w, m.h);
  ctx.restore();
}

/** 바닥 그림자: 보랏빛 곱하기(수채의 그림자 색), 빛은 왼쪽 위 → 오른쪽 아래로 */
function shadow(x: number, y: number, rx: number, a = 0.5) {
  ctx.save(); ctx.globalCompositeOperation = 'multiply';
  ctx.translate(x + rx * 0.2, y + 1); ctx.scale(1, 0.32);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx * 1.1);
  g.addColorStop(0, `rgba(110,85,150,${a})`); g.addColorStop(0.6, `rgba(130,105,165,${a * 0.6})`); g.addColorStop(1, 'rgba(150,130,180,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, rx * 1.1, 0, TAU); ctx.fill(); ctx.restore();
}

function glow(x: number, y: number, r: number, a: number, rgb = '80,240,225') {
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, `rgba(${rgb},${a})`); g.addColorStop(1, `rgba(${rgb},0)`);
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); ctx.restore();
}

function ell(x: number, y: number, rx: number, ry: number, a0 = 0, a1 = TAU) { ctx.beginPath(); ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), 0, a0, a1); }

/** 종이 띠(수채 판자) 위 글씨 — 하늘·풀 위 맨 글씨는 안 읽힌다(👁) */
function plate(t: string, x: number, y: number, size: number, col = INK) {
  const m = MAP.tag, w = Math.max(80, t.length * size * 0.92 + 30), h = size * 2;
  ctx.drawImage(IMG.atlas, m.x, m.y, m.w, m.h, x - w / 2, y - h / 2 - 2, w, h + 4);
  text(t, x, y + 1, size, col);
}
function text(t: string, x: number, y: number, size: number, col = INK, align: CanvasTextAlign = 'center') {
  ctx.save(); ctx.font = `800 ${size}px ui-rounded, "SF Pro Rounded", system-ui, -apple-system, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif`;
  ctx.textAlign = align; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
  ctx.lineWidth = size * 0.28; ctx.strokeStyle = PAPER; ctx.strokeText(t, x, y);
  ctx.fillStyle = col; ctx.fillText(t, x, y); ctx.restore();
}

// ───────── 몸 ─────────
const isMe = (m: { id: number }) => s.me === m.id && !s.fly;
function drawMon(m: HopState['mons'][number], now: number) {
  const k = KD[m.k], x = X(m.x), p = prev.get(m.id) ?? { x: m.x, y: m.y, mv: 0 };
  const sp = Math.hypot(m.x - p.x, m.y - p.y);
  p.mv = p.mv * 0.8 + (sp > 0.0004 ? 1 : 0) * 0.2; p.x = m.x; p.y = m.y; prev.set(m.id, p);
  const ph = m.seed * 6.3 + now * 0.11;
  const air = m.air * 1.3 + p.mv * Math.abs(Math.sin(now * 0.32 + m.seed * 5)) * 4;
  let sx = 1 + 0.035 * Math.sin(ph), sy = 1 - 0.035 * Math.sin(ph);
  if (m.st === GEO.WIND) (sx *= 1.12), (sy *= 0.86);
  if (s.t - m.atkT < 7) (sx *= 0.9), (sy *= 1.14);
  if (p.mv > 0.5 && air < 1.2) (sx *= 1.08), (sy *= 0.92);
  const hurt = s.t - m.hurtT < 9;
  const y = Y(m.y), jx = hurt ? Math.sin(now * 2.7) * 2 : 0;
  const me = isMe(m);
  const boss = m.k === 'bear';
  const sc = boss ? m.r * S / 34 : m.r * S * 1.8 / 30;
  shadow(x, y, (boss ? 40 : 24) * sc * (1 - Math.min(0.5, air / 60)), 0.55);
  if (me) {
    // 내 몸: 발밑 청록 고리 + 빛(청록 = 나만)
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineWidth = 12; ctx.strokeStyle = 'rgba(60,230,215,0.4)'; ell(x, y, m.r * S * 1.9, m.r * S * 0.75); ctx.stroke(); ctx.restore();
    ctx.save(); ctx.lineWidth = 4; ctx.strokeStyle = TEAL; ell(x, y, m.r * S * 1.8, m.r * S * 0.7); ctx.stroke(); ctx.restore();
    glow(x, y - m.r * S * 1.4, m.r * S * 3.4, 0.38);
  }
  const rot = m.air > 4 ? Math.sin(now * 0.4 + m.seed) * 0.5 : 0;
  const o = { sx, sy, rot, flip: m.face < 0 };
  if (boss) spr('bear', x + jx, y - air, sc, o);
  else {
    const col = Math.floor(m.seed * 997) % 4;
    const mood = me ? 'slime_me' : m.stun > 0 || m.air > 6 ? `slime${col}_dizzy` : m.mad ? `slime${col}_mad` : `slime${col}_idle`;
    spr(mood, x + jx, y - air, sc, o);
  }
  if (me) spr(boss ? 'bear' : 'slime_me', x + jx, y - air, sc, { ...o, op: 'lighter', a: 0.16 + 0.06 * Math.sin(now * 0.2) });
  if (hurt) spr(boss ? 'bear' : 'slime0_idle', x + jx, y - air, sc, { ...o, op: 'lighter', a: 0.45 * (1 - (s.t - m.hurtT) / 9) });
  if (m.stun > 0 && !me) spr('dizzy', x, y - air - (boss ? 95 : 50) * sc * (boss ? 0.6 : 1), 0.8 * Math.max(0.6, sc), { rot: Math.sin(now * 0.2) * 0.2 });
  if (me) {
    const top = y - air - (boss ? 150 * sc : 62 * sc);
    // 머리 위 훌(작게 둥실) + 체력 띠
    spr('ghost_float', x + 2, top - 18 + Math.sin(now * 0.12) * 3, 0.75);
    const fr = Math.max(0, m.hp / m.max), bw = 34;
    ctx.save(); ctx.fillStyle = 'rgba(74,36,16,0.35)'; ctx.fillRect(x - bw / 2 - 1, top + 6, bw + 2, 5);
    ctx.fillStyle = fr < 0.35 && Math.floor(now / 8) % 2 ? '#E8485E' : TEAL; ctx.fillRect(x - bw / 2, top + 7, bw * fr, 3); ctx.restore();
  }
  if (m.shield > 0) { ctx.save(); ctx.strokeStyle = 'rgba(245,190,50,0.9)'; ctx.lineWidth = 3; ell(x, y - m.r * S, m.r * S * 1.5, m.r * S * 1.3); ctx.stroke(); ctx.restore(); }
}

/** 펑 범위: 지금 버리면 터질 자리(따뜻한 흰 점선). 안에 든 적이 많을수록 진하고 두근 */
function popRing(now: number) {
  const b = s.mons.find((m) => m.id === s.me && !m.dead);
  if (!b || s.fly) return;
  const r = popR(s, b.k) * S;
  let n = 0;
  for (const m of s.mons) if (!m.dead && m.id !== b.id && Math.hypot(m.x - b.x, (m.y - b.y) / GEO.YS) < popR(s, b.k)) n++;
  const beat = n >= 5 ? 1 + 0.05 * Math.sin(now * 0.5) : 1;
  ctx.save(); ctx.setLineDash([5, 6]); ctx.lineDashOffset = -now * 0.4; ctx.lineWidth = 1.5 + Math.min(4, n * 0.6);
  ctx.strokeStyle = `rgba(255,248,225,${0.45 + Math.min(0.5, n * 0.08)})`;
  ell(X(b.x), Y(b.y), r * beat, r * GEO.YS * beat); ctx.stroke(); ctx.restore();
  // 유령 기운 고리(다 차야 다음 갈아타기)
  const cx = X(b.x), cy = Y(b.y), rx = b.r * S * 1.95, ry = b.r * S * 0.8, fr = Math.min(1, s.charge);
  ctx.save(); ctx.lineCap = 'round';
  ctx.lineWidth = 4.5; ctx.strokeStyle = 'rgba(42,106,112,0.25)'; ell(cx, cy, rx, ry); ctx.stroke();
  ctx.strokeStyle = fr >= 1 ? TEAL : 'rgba(20,200,195,0.8)'; ell(cx, cy, rx, ry, -Math.PI / 2, -Math.PI / 2 + TAU * fr); ctx.stroke();
  ctx.restore();
  if (fr >= 1) glow(cx, cy, rx * 0.9, 0.12 + 0.06 * Math.sin(now * 0.25));
}

function drawCorpses() {
  for (const c of s.corpses) {
    const age = s.t - c.t, u = age / 46, x = X(c.x), y = Y(c.y);
    if (c.how === 3 || c.how === 2) {
      const r = popR(s, c.k) * S, sc = (r / 62) * (0.45 + 0.75 * (1 - Math.pow(1 - Math.min(1, age / 10), 3)));
      spr('burst', x, y - 10, sc, { a: age < 14 ? 1 : 1 - (age - 14) / 32, sy: 0.9 });
      if (age < 8) glow(x, y - 10, r * 2, 0.8 * (1 - age / 8), '255,235,190');
      // 충격파 고리
      ctx.save(); ctx.strokeStyle = `rgba(255,250,235,${0.8 * (1 - u)})`; ctx.lineWidth = 7 * (1 - u) + 0.5; ell(x, y, r * (0.5 + u * 1.6), r * GEO.YS * (0.5 + u * 1.6)); ctx.stroke(); ctx.restore();
    } else if (c.how === 0 || c.how === 1) {
      // 휘말린 몸: 어질어질 날아가며 사라짐
      const col = Math.floor(c.seed * 997) % 4, k = c.k === 'bear';
      const fx = x + c.vx * S * age * 0.6, fy = y + c.vy * S * age * 0.6, h = Math.sin(Math.min(1, u * 1.4) * Math.PI) * 40;
      shadow(fx, fy, 14, 0.4 * (1 - u));
      spr(k ? 'bear' : `slime${col}_dizzy`, fx, fy - h, k ? 0.78 : 0.82, { rot: age * 0.25 * (c.vx >= 0 ? 1 : -1), a: 1 - Math.max(0, u - 0.5) * 2 });
      if (age < 10) spr('burst', x, y - 8, 0.22 * (0.6 + age / 25), { a: 1 - age / 10 });
    }
  }
}

function drawGhost(now: number) {
  if (s.fly) {
    const f = s.fly, t = Math.min(1, (s.t - f.t) / f.T), to = s.mons.find((m) => m.id === f.to);
    const x0 = X(f.x0), y0 = Y(f.y0), x1 = to ? X(to.x) : x0, y1 = to ? Y(to.y) - to.r * S * 1.2 : y0;
    const side = x1 >= x0 ? 1 : -1, cx = (x0 + x1) / 2 + side * 60, cy = Math.min(y0, y1) - 110;
    const P = (u: number) => [(1 - u) * (1 - u) * x0 + 2 * (1 - u) * u * cx + u * u * x1, (1 - u) * (1 - u) * y0 + 2 * (1 - u) * u * cy + u * u * y1];
    // 꼬리 궤적(청록 물감 한 획)
    ctx.save(); ctx.lineCap = 'round'; ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 2; i++) {
      ctx.beginPath(); for (let k = 0; k <= 16; k++) { const u = Math.max(0, t - 0.6) + (t - Math.max(0, t - 0.6)) * (k / 16); const [px, py] = P(u); k ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
      ctx.lineWidth = i ? 6 : 20; ctx.strokeStyle = i ? 'rgba(170,255,245,0.95)' : 'rgba(60,220,210,0.4)'; ctx.stroke();
    }
    ctx.restore();
    for (let k = 0; k < 6; k++) { const u = Math.max(0, t - 0.5 + k * 0.08); const [px, py] = P(Math.min(t, u)); glow(px + Math.sin(k * 7 + t * 20) * 9, py + Math.cos(k * 5) * 9, 6, 0.9, '210,255,250'); }
    const [gx, gy] = P(t), [hx, hy] = P(Math.max(0, t - 0.05));
    spr('ghost_dive', gx, gy, 1.05, { rot: Math.atan2(gy - hy, gx - hx) - Math.PI / 2 });
    return;
  }
  if (s.home || s.out > 0) {
    const x = X(s.gx), y = Y(s.gy) - (s.home ? 26 : 30) + Math.sin(now * 0.1) * 4;
    if (s.out > 0) {
      // 몸 밖: 남은 시간 고리 + 깜박
      ctx.save(); ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(232,72,94,0.8)'; ctx.beginPath(); ctx.arc(x, y, 26, -Math.PI / 2, -Math.PI / 2 + TAU * (1 - s.out / 240)); ctx.stroke(); ctx.restore();
    }
    glow(x, y, 46, 0.35);
    spr('ghost_float', x, y, 0.95, { a: s.out > 0 && s.out > 180 && Math.floor(now / 6) % 2 ? 0.6 : 1 });
  }
}

function hud(now: number) {
  spr('tag', 12, 50, 1); spr('plank', DW / 2 - 30, 49, 1); spr('tag', DW - 100, 50, 1);
  for (let i = 0; i < 3; i++) spr('heart', 31 + i * 25, 66, 1, { a: i < s.hearts ? 1 : 0.18 });
  text(`1-${s.stage + 1}`, DW / 2, 65, 16);
  for (let i = 0; i < 3; i++) spr(s.starOk[i] ? 'star_on' : 'star_off', DW - 81 + i * 25, 66, 1);
  if (!human && s.phase === 'play') {
    const a = 0.75 + 0.25 * Math.sin(now * 0.08);
    ctx.save(); ctx.globalAlpha = a; plate('적을 톡! 그 몸에 쏙 들어가요', DW / 2, DH - 56, 17); ctx.restore();
  }
  const big = s.big && s.t - s.big.t < 80 ? s.big : null;
  const ban = !big && s.banner && s.t - s.banner.t < 150 && !s.hops ? s.banner : null;
  if (big) { const u = Math.min(1, (s.t - big.t) / 8); plate(big.text, DW / 2, 150, 26 * (0.7 + 0.3 * u), '#C0402A'); }
  else if (ban) { const a = Math.min(1, (150 - (s.t - ban.t)) / 20); ctx.save(); ctx.globalAlpha = a; plate(ban.head, DW / 2, 138, 22); text(ban.sub, DW / 2, 176, 15, '#6A4A38'); ctx.restore(); }
  if (s.phase !== 'play') {
    ctx.save(); ctx.fillStyle = 'rgba(251,246,234,0.35)'; ctx.fillRect(0, 0, DW, DH); ctx.restore();
    spr('card', 45, 300, 1);
    text('마당을 비웠어요!', DW / 2, 345, 24);
    for (let i = 0; i < 3; i++) spr(s.starOk[i] ? 'star_on' : 'star_off', DW / 2 - 50 + i * 50, 400, 2.1);
    text('톡 하면 다시', DW / 2, 450, 14, '#6A4A38');
  }
}

function draw(now: number) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#EFE6D4'; ctx.fillRect(0, 0, cv.width, cv.height);
  ctx.setTransform(scale * dpr, 0, 0, scale * dpr, ox * dpr, oy * dpr);
  ctx.save(); ctx.translate(CXp, CAMY); ctx.scale(ZOOM, ZOOM); ctx.translate(-CXp, -CYp);
  // 큰 펑엔 화면이 살짝 흔들린다
  const last = s.corpses.length ? s.corpses[s.corpses.length - 1] : null;
  if (last && (last.how === 3 || last.how === 2) && s.t - last.t < 10) ctx.translate(Math.sin(now * 3.1) * 3 * (1 - (s.t - last.t) / 10), Math.cos(now * 2.3) * 2 * (1 - (s.t - last.t) / 10));
  ctx.drawImage(IMG.bg, 0, 0, DW, DH);
  popRing(now);
  // 내 몸은 맨 앞(👁 [치명] 옆 적에 가려 '나'를 오해) · 펑은 몸들 앞(묻히지 않게)
  const list = s.mons.filter((m) => !m.dead).sort((a, b) => (isMe(a) ? 1 : 0) - (isMe(b) ? 1 : 0) || a.y - b.y);
  for (const m of list) drawMon(m, now);
  drawCorpses();
  drawGhost(now);
  ctx.drawImage(IMG.front, 0, 0, DW, DH);
  ctx.restore();
  ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.drawImage(IMG.veil, 0, 0, DW, DH); ctx.restore();
  hud(now);
}

// ───────── 입력 · 흐름 ─────────
function toSim(cx: number, cy: number) {
  const dx = CXp + ((cx - ox) / scale - CXp) / ZOOM, dy = CYp + ((cy - oy) / scale - CAMY) / ZOOM;
  return { x: GEO.CX + (dx - CXp) / S, y: (GEO.CY + (dy - CYp) / S) / GEO.A };
}
cv.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  if (s.phase !== 'play') { if (endT > 60) fresh(); return; }
  human = true; pend = toSim(e.clientX, e.clientY);
});
window.addEventListener('keydown', (e) => {
  if (e.key !== ' ' && e.key !== 'Enter') return;
  e.preventDefault();
  if (s.phase !== 'play') { if (endT > 60) fresh(); return; }
  human = true; const p = bodyhopHabit2.act(s, rng).pointer; if (p) pend = { x: p.x, y: p.y };
});

let acc = 0, last = 0, frame = 0, upNext = false;
function tick() {
  let inp: Input = { tap: false, dir: 0, pointer: null };
  if (upNext) upNext = false;
  else if (pend) { inp = { tap: true, dir: 0, pointer: pend }; pend = null; upNext = true; }
  else if (!human && s.t > 100 && s.t % 3 === 0) inp = bodyhopSmart.act(s, rng); // 봇은 판 이름이 읽힌 뒤에
  if (s.phase === 'play') game.step(s, inp);
  else if (++endT > 420) fresh();
  // 한 판만 보여 준다(M1): 판을 깨면 결과 카드 → 다시 첫 판
  if (s.phase === 'result' && s.stage === 0) s.phase = 'end' as HopState['phase'];
}
function loop(t: number) {
  const dt = Math.min(100, last ? t - last : 16.7); last = t;
  acc += dt;
  let n = 0;
  while (acc >= 1000 / 60 && n < 4) { tick(); acc -= 1000 / 60; n++; frame++; }
  if (n === 4) acc = 0;
  draw(frame);
  requestAnimationFrame(loop);
}

(async () => {
  fit(); window.addEventListener('resize', fit);
  const [bg, front, veil, atlas] = await Promise.all(['w1/bg.jpg', 'w1/front.png', 'w1/veil.jpg', 'w1/atlas.png'].map(load));
  IMG = { bg, front, veil, atlas };
  fresh();
  document.getElementById('ld')?.remove();
  (window as any).__hop = { get s() { return s; }, step: (k: number) => { for (let i = 0; i < k; i++) tick(); }, draw: () => draw(frame) };
  requestAnimationFrame(loop);
})();
