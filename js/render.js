// THE LAMP: 마지막 불씨 — 캔버스 렌더러 (빛/어둠 합성, 파티클, 화면 효과)
import { BASE, WORLD } from './config.js';

const TAU = Math.PI * 2;
const LIGHT_K = 1.24; // 보이는 빛은 실제 판정 반경보다 조금 넓게 번진다

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

function radial(size, stops) {
  const c = makeCanvas(size, size), g = c.getContext('2d');
  const gr = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  for (const [o, col] of stops) gr.addColorStop(o, col);
  g.fillStyle = gr;
  g.fillRect(0, 0, size, size);
  return c;
}

function glow(r, g, b) {
  return radial(64, [[0, `rgba(${r},${g},${b},1)`], [0.25, `rgba(${r},${g},${b},0.7)`], [0.6, `rgba(${r},${g},${b},0.18)`], [1, `rgba(${r},${g},${b},0)`]]);
}

function hash2(x, y) {
  let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function seeded(seed) {
  let s = seed >>> 0;
  return () => {
    let t = (s += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// 이어 붙여도 티 나지 않는 돌바닥 타일
function makeGround() {
  const S = 512, c = makeCanvas(S, S), g = c.getContext('2d');
  const rnd = seeded(20240611);
  g.fillStyle = '#1b1814';
  g.fillRect(0, 0, S, S);
  const cols = 9, rows = 12, cw = S / cols, ch = S / rows;
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const w = cw * (0.84 + rnd() * 0.1), h = ch * (0.8 + rnd() * 0.12);
      const x = col * cw + (row % 2 ? cw / 2 : 0) + (rnd() - 0.5) * 5;
      const y = row * ch + (rnd() - 0.5) * 4;
      const cool = rnd() < 0.22;
      const hue = cool ? 215 + rnd() * 20 : 26 + rnd() * 16, sat = cool ? 6 : 9 + rnd() * 7, lig = 27 + rnd() * 8;
      const rad = 6 + rnd() * 5;
      for (const ox of [0, -S]) {
        for (const oy of [0, -S]) {
          const px = x + ox, py = y + oy;
          if (px + w < 0 || py + h < 0 || px > S || py > S) continue;
          g.fillStyle = `hsl(${hue},${sat}%,${lig}%)`;
          g.beginPath(); g.roundRect(px, py, w, h, rad); g.fill();
          g.fillStyle = `hsla(${hue},${sat}%,${lig + 9}%,0.55)`;
          g.beginPath(); g.roundRect(px + 2, py + 1.5, w - 4, h * 0.34, rad); g.fill();
          g.fillStyle = 'rgba(0,0,0,0.16)';
          g.beginPath(); g.roundRect(px + 1, py + h * 0.72, w - 2, h * 0.28, rad); g.fill();
        }
      }
    }
  }
  // 이끼 얼룩
  for (let i = 0; i < 16; i++) {
    const x = rnd() * S, y = rnd() * S, r = 18 + rnd() * 34;
    for (const ox of [0, -S, S]) {
      for (const oy of [0, -S, S]) {
        const gr = g.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, r);
        gr.addColorStop(0, 'rgba(70,104,62,0.34)'); gr.addColorStop(1, 'rgba(70,104,62,0)');
        g.fillStyle = gr;
        g.fillRect(x + ox - r, y + oy - r, r * 2, r * 2);
      }
    }
  }
  for (let i = 0; i < 1400; i++) {
    const x = rnd() * S, y = rnd() * S;
    g.fillStyle = rnd() < 0.55 ? 'rgba(0,0,0,0.18)' : 'rgba(255,240,220,0.06)';
    g.fillRect(x, y, 1 + rnd() * 1.6, 1 + rnd() * 1.6);
  }
  return c;
}

const EYE = {
  soot: 'violet', moth: 'pink', stalker: 'cyan', spitter: 'violet', brute: 'red', snuffer: 'green', eclipse: 'white',
};

export class Renderer {
  constructor(canvas) {
    this.cv = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.dark = makeCanvas(4, 4);
    this.dctx = this.dark.getContext('2d');
    this.q = 0.5;
    this.w = 4; this.h = 4; this.s = 1; this.dpr = 1;
    this.cam = { x: WORLD.w / 2, y: WORLD.h / 2 };
    this.time = 0;
    this.shake = 0; this.flash = 0; this.hurt = 0;
    this.parts = []; this.texts = []; this.rings = []; this.beams = [];
    this.hitBudget = 0;
    this.lowPerf = false;

    this.groundPat = this.ctx.createPattern(makeGround(), 'repeat');
    this.spr = {
      light: radial(256, [[0, 'rgba(255,255,255,1)'], [0.3, 'rgba(255,255,255,0.97)'], [0.58, 'rgba(255,255,255,0.84)'], [0.8, 'rgba(255,255,255,0.5)'], [0.93, 'rgba(255,255,255,0.14)'], [1, 'rgba(255,255,255,0)']]),
      warm: radial(256, [[0, 'rgba(255,190,110,0.30)'], [0.4, 'rgba(255,150,64,0.12)'], [1, 'rgba(255,120,40,0)']]),
      tint: radial(256, [[0, 'rgba(255,176,84,0.62)'], [0.55, 'rgba(255,146,60,0.42)'], [0.85, 'rgba(255,120,50,0.16)'], [1, 'rgba(255,110,40,0)']]),
      moon: radial(128, [[0, 'rgba(120,160,255,0.5)'], [0.6, 'rgba(90,120,255,0.22)'], [1, 'rgba(80,110,255,0)']]),
      cold: radial(128, [[0, 'rgba(130,170,255,0.30)'], [0.6, 'rgba(90,120,255,0.10)'], [1, 'rgba(80,110,255,0)']]),
      orange: glow(255, 170, 70),
      gold: glow(255, 214, 120),
      violet: glow(190, 150, 255),
      pink: glow(255, 170, 215),
      cyan: glow(140, 230, 255),
      red: glow(255, 80, 70),
      green: glow(170, 255, 150),
      white: glow(255, 255, 255),
      vignette: radial(256, [[0, 'rgba(0,0,0,0)'], [0.62, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,0.62)']]),
      danger: radial(256, [[0, 'rgba(150,20,10,0)'], [0.55, 'rgba(150,20,10,0)'], [1, 'rgba(170,24,12,0.75)']]),
    };
    this.decor = new Map();
  }

  resize(cssW, cssH) {
    const dpr = Math.min(window.devicePixelRatio || 1, this.lowPerf ? 1.25 : 2);
    this.dpr = dpr;
    const W = Math.max(2, Math.round(cssW * dpr)), H = Math.max(2, Math.round(cssH * dpr));
    this.cv.width = W; this.cv.height = H;
    this.w = W; this.h = H;
    const area = W < H ? 500000 : 680000;
    this.s = Math.sqrt((W * H) / area);
    this.dark.width = Math.max(2, Math.round(W * this.q));
    this.dark.height = Math.max(2, Math.round(H * this.q));
  }

  snap(p) { this.cam.x = p.x; this.cam.y = p.y; }

  reset() {
    this.parts.length = 0; this.texts.length = 0; this.rings.length = 0; this.beams.length = 0;
    this.shake = 0; this.flash = 0; this.hurt = 0;
  }

  // ---------- 효과 생성 ----------
  part(x, y, vx, vy, life, size, spr, grav = 0) {
    if (this.parts.length > 520) return;
    this.parts.push({ x, y, vx, vy, life, max: life, size, spr, grav });
  }

  burst(x, y, n, speed, life, size, spr, grav = 0) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU, sp = speed * (0.35 + Math.random() * 0.65);
      this.part(x, y, Math.cos(a) * sp, Math.sin(a) * sp, life * (0.6 + Math.random() * 0.4), size * (0.6 + Math.random() * 0.6), spr, grav);
    }
  }

  ring(x, y, r0, r1, life, color, width = 3) {
    this.rings.push({ x, y, r0, r1, life, max: life, color, width });
  }

  text(x, y, str, color, size = 13, life = 0.7) {
    if (this.texts.length > 46) return;
    this.texts.push({ x: x + (Math.random() - 0.5) * 10, y, str, color, size, life, max: life });
  }

  consume(g) {
    const evs = g.events;
    this.hitBudget = 10;
    for (let i = 0; i < evs.length; i++) {
      const ev = evs[i];
      switch (ev.type) {
        case 'hit':
          if (this.hitBudget-- > 0) {
            if (!ev.dot) this.burst(ev.x, ev.y, 2, 90, 0.22, 4, 'orange');
            const v = Math.round(ev.v);
            if (v > 0) this.text(ev.x, ev.y - 6, String(v), ev.big ? '#ffd27a' : ev.dot ? '#d9b08a' : '#fff4dc', ev.big ? 17 : 12);
          }
          break;
        case 'kill': {
          const big = ev.kind === 'eclipse' ? 60 : ev.elite ? 22 : ev.r > 18 ? 12 : 6;
          this.burst(ev.x, ev.y, big, 60 + ev.r * 4, 0.5, 5 + ev.r * 0.25, ev.dawn ? 'gold' : 'violet');
          this.burst(ev.x, ev.y, Math.ceil(big / 3), 110, 0.35, 3, 'orange');
          if (ev.elite || ev.kind === 'eclipse') { this.ring(ev.x, ev.y, 10, ev.r * 5, 0.5, '255,214,120', 4); this.shake = Math.max(this.shake, 6); }
          break;
        }
        case 'hurt':
          this.shake = Math.max(this.shake, 8);
          this.hurt = 0.4;
          this.text(ev.x, ev.y - 24, '-' + Math.max(1, Math.round(ev.v)), '#ff7a66', 16, 0.9);
          this.burst(ev.x, ev.y, 8, 150, 0.4, 4, 'gold');
          break;
        case 'flare':
          this.ring(ev.x, ev.y, 12, ev.r, 0.38, '255,236,190', 7);
          this.ring(ev.x, ev.y, 6, ev.r * 0.8, 0.5, '255,180,90', 3);
          this.flash = Math.max(this.flash, 0.1 + 0.22 * ev.charge);
          this.shake = Math.max(this.shake, 3 + 8 * ev.charge);
          this.burst(ev.x, ev.y, Math.round(14 + 22 * ev.charge), ev.r * 2.2, 0.45, 5, 'gold');
          break;
        case 'ignite':
          this.ring(ev.x, ev.y, 4, 46, 0.25, '255,220,150', 2);
          break;
        case 'dark':
          this.ring(ev.x, ev.y, 150, 16, 0.3, '140,170,255', 2);
          break;
        case 'decoy':
          this.ring(ev.x, ev.y, 6, 40, 0.3, '255,200,120', 2);
          break;
        case 'boom':
          this.ring(ev.x, ev.y, 10, ev.r, 0.35, '255,170,80', 6);
          this.burst(ev.x, ev.y, 22, ev.r * 2.4, 0.45, 6, 'orange');
          this.shake = Math.max(this.shake, 6);
          this.flash = Math.max(this.flash, 0.08);
          break;
        case 'pop':
          this.ring(ev.x, ev.y, 4, ev.r, 0.2, '255,190,100', 3);
          break;
        case 'beam':
          this.beams.push({ x: ev.x, y: ev.y, a: ev.a, len: ev.len, w: ev.w, life: 0.22, max: 0.22 });
          this.shake = Math.max(this.shake, 2);
          break;
        case 'lampLit':
          this.ring(ev.x, ev.y, 10, BASE.lampR, 0.6, '255,214,130', 5);
          for (let k = 0; k < 26; k++) {
            this.part(ev.x + (Math.random() - 0.5) * 14, ev.y - 52, (Math.random() - 0.5) * 120, -40 - Math.random() * 160, 0.9, 5, 'gold', 180);
          }
          this.shake = Math.max(this.shake, 4);
          this.flash = Math.max(this.flash, 0.1);
          break;
        case 'lampOut':
          this.ring(ev.x, ev.y, BASE.lampR, 12, 0.6, '170,130,255', 4);
          break;
        case 'allLit':
          this.flash = 0.5; this.shake = 10;
          break;
        case 'xp':
          this.part(ev.x, ev.y, 0, -30, 0.25, 6, 'gold');
          break;
        case 'oil':
          this.text(ev.x, ev.y - 14, '+' + Math.round(ev.v), '#ffd98a', 14, 0.8);
          this.burst(ev.x, ev.y, 6, 80, 0.35, 4, 'gold');
          break;
        case 'chest':
          this.ring(ev.x, ev.y, 6, 90, 0.5, '255,214,120', 4);
          this.burst(ev.x, ev.y, 24, 200, 0.6, 5, 'gold');
          break;
        case 'levelup':
          this.ring(g.p.x, g.p.y, 10, 130, 0.5, '255,236,170', 4);
          break;
        case 'upgrade':
          this.burst(g.p.x, g.p.y, 18, 160, 0.5, 5, 'gold');
          break;
        case 'boss':
          this.shake = 12; this.flash = Math.max(this.flash, 0.15);
          break;
        case 'bossRing':
          this.ring(ev.x, ev.y, 30, 110, 0.35, '190,150,255', 4);
          break;
        case 'summon':
          this.ring(ev.x, ev.y, 110, 30, 0.4, '150,110,220', 3);
          break;
        case 'shield':
          this.ring(ev.x, ev.y, 120, 56, 0.5, '190,150,255', 5);
          break;
        case 'shieldBreak':
          this.ring(ev.x, ev.y, 40, 240, 0.6, '255,240,200', 8);
          this.burst(ev.x, ev.y, 40, 320, 0.7, 6, 'violet');
          this.flash = Math.max(this.flash, 0.4); this.shake = 14;
          break;
        case 'block':
          this.burst(ev.x, ev.y, 3, 80, 0.2, 4, 'violet');
          break;
        case 'bossDead':
          this.flash = 0.7; this.shake = 18;
          this.ring(ev.x, ev.y, 20, 520, 1.0, '255,236,190', 10);
          break;
        case 'tide':
          this.shake = Math.max(this.shake, 5);
          break;
        case 'windup':
          this.ring(ev.x, ev.y, 46, 20, 0.5, '255,90,70', 3);
          break;
        case 'wake':
          this.text(ev.x, ev.y - 22, '!', '#e0c8ff', 18, 0.7);
          break;
        case 'spit':
          this.burst(ev.x, ev.y, 4, 60, 0.25, 4, 'violet');
          break;
        case 'revive':
          this.flash = 0.6; this.shake = 12;
          break;
        case 'dawn':
          this.flash = Math.max(this.flash, 0.35);
          break;
        case 'dead':
          this.shake = 16;
          this.burst(ev.x, ev.y, 40, 240, 1.0, 6, 'gold');
          this.ring(ev.x, ev.y, 200, 8, 0.8, '120,140,220', 4);
          break;
      }
    }
  }

  // ---------- 바닥 장식 ----------
  chunk(cx, cy) {
    const key = cx * 1000 + cy;
    let items = this.decor.get(key);
    if (items) return items;
    items = [];
    const n = 5 + Math.floor(hash2(cx * 7 + 1, cy * 13 + 5) * 5);
    for (let i = 0; i < n; i++) {
      const r1 = hash2(cx * 31 + i, cy * 17 + 3), r2 = hash2(cx * 11 + 7, cy * 29 + i), r3 = hash2(cx + i * 5, cy - i * 3);
      const kind = r3 < 0.34 ? 'tuft' : r3 < 0.56 ? 'pebble' : r3 < 0.7 ? 'puddle' : r3 < 0.88 ? 'leaf' : 'flower';
      items.push({ kind, x: (cx + r1) * 256, y: (cy + r2) * 256, s: 0.7 + hash2(i, cx + cy) * 0.7, rot: r1 * TAU });
    }
    this.decor.set(key, items);
    return items;
  }

  drawDecor(ctx, x0, y0, x1, y1) {
    const cx0 = Math.floor(x0 / 256), cx1 = Math.floor(x1 / 256), cy0 = Math.floor(y0 / 256), cy1 = Math.floor(y1 / 256);
    for (let cy = cy0; cy <= cy1; cy++) {
      for (let cx = cx0; cx <= cx1; cx++) {
        if (cx < 0 || cy < 0 || cx * 256 > WORLD.w || cy * 256 > WORLD.h) continue;
        const items = this.chunk(cx, cy);
        for (const d of items) {
          const { x, y, s } = d;
          if (x < 24 || y < 24 || x > WORLD.w - 24 || y > WORLD.h - 24) continue;
          if (d.kind === 'tuft') {
            ctx.strokeStyle = '#4f7a54'; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
            ctx.beginPath();
            for (let k = -2; k <= 2; k++) {
              ctx.moveTo(x + k * 2, y);
              ctx.lineTo(x + k * 4.2 * s, y - (9 - Math.abs(k) * 2) * s);
            }
            ctx.stroke();
          } else if (d.kind === 'pebble') {
            ctx.fillStyle = '#5b6474';
            ctx.beginPath(); ctx.ellipse(x, y, 5 * s, 3.4 * s, d.rot, 0, TAU); ctx.fill();
            ctx.fillStyle = '#7a8496';
            ctx.beginPath(); ctx.ellipse(x - 1, y - 1, 2.4 * s, 1.4 * s, d.rot, 0, TAU); ctx.fill();
          } else if (d.kind === 'puddle') {
            ctx.fillStyle = 'rgba(70,100,140,0.5)';
            ctx.beginPath(); ctx.ellipse(x, y, 20 * s, 9 * s, 0, 0, TAU); ctx.fill();
            ctx.strokeStyle = 'rgba(190,215,255,0.35)'; ctx.lineWidth = 1.2;
            ctx.beginPath(); ctx.ellipse(x - 3 * s, y - 1.5 * s, 11 * s, 4 * s, 0, 3.4, 5.4); ctx.stroke();
          } else if (d.kind === 'leaf') {
            ctx.fillStyle = s > 1 ? '#a8633a' : '#8c7a3c';
            ctx.beginPath(); ctx.ellipse(x, y, 4.5 * s, 2 * s, d.rot, 0, TAU); ctx.fill();
          } else {
            ctx.fillStyle = '#4f7a54';
            ctx.fillRect(x - 0.7, y, 1.4, 6);
            ctx.fillStyle = s > 1 ? '#f1e6b8' : '#cfd8ff';
            ctx.beginPath(); ctx.arc(x, y, 2.6, 0, TAU); ctx.fill();
          }
        }
      }
    }
  }

  // ---------- 그리기 ----------
  draw(g, dt) {
    const ctx = this.ctx, W = this.w, H = this.h, s = this.s, p = g.p, t = (this.time += dt);
    const S = this.spr;

    this.cam.x += (p.x - this.cam.x) * Math.min(1, dt * 9);
    this.cam.y += (p.y - this.cam.y) * Math.min(1, dt * 9);
    let ox = 0, oy = 0;
    if (this.shake > 0.1) {
      ox = (Math.random() - 0.5) * this.shake; oy = (Math.random() - 0.5) * this.shake;
      this.shake *= Math.pow(0.0015, dt);
    } else this.shake = 0;
    const cx = this.cam.x + ox, cy = this.cam.y + oy;
    const vw = W / s, vh = H / s;
    const x0 = cx - vw / 2, y0 = cy - vh / 2, x1 = x0 + vw, y1 = y0 + vh;
    const inView = (x, y, m) => x > x0 - m && x < x1 + m && y > y0 - m && y < y1 + m;
    const world = () => ctx.setTransform(s, 0, 0, s, W / 2 - cx * s, H / 2 - cy * s);

    // --- 바닥 ---
    world();
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.fillStyle = this.groundPat;
    ctx.fillRect(x0 - 2, y0 - 2, vw + 4, vh + 4);
    if (x0 < 0 || y0 < 0 || x1 > WORLD.w || y1 > WORLD.h) {
      ctx.fillStyle = '#05060a';
      if (x0 < 0) ctx.fillRect(x0 - 2, y0 - 2, -x0 + 2, vh + 4);
      if (y0 < 0) ctx.fillRect(x0 - 2, y0 - 2, vw + 4, -y0 + 2);
      if (x1 > WORLD.w) ctx.fillRect(WORLD.w, y0 - 2, x1 - WORLD.w + 2, vh + 4);
      if (y1 > WORLD.h) ctx.fillRect(x0 - 2, WORLD.h, vw + 4, y1 - WORLD.h + 2);
      ctx.strokeStyle = '#39404f'; ctx.lineWidth = 12;
      ctx.strokeRect(0, 0, WORLD.w, WORLD.h);
    }
    this.drawDecor(ctx, x0, y0, x1, y1);

    // 불타는 자리 (그을음)
    for (const q of g.patches) {
      if (!inView(q.x, q.y, 40)) continue;
      ctx.fillStyle = 'rgba(20,10,6,0.35)';
      ctx.beginPath(); ctx.arc(q.x, q.y, q.r * 0.9, 0, TAU); ctx.fill();
    }

    // 기름방울 · 상자
    for (const k of g.pickups) {
      if (k.kind === 'xp' || !inView(k.x, k.y, 30)) continue;
      if (k.kind === 'oil') {
        const by = k.y + Math.sin(t * 4 + k.x) * 1.5;
        ctx.fillStyle = '#e9b94e';
        ctx.beginPath();
        ctx.moveTo(k.x, by - 9);
        ctx.quadraticCurveTo(k.x + 7, by, k.x, by + 6);
        ctx.quadraticCurveTo(k.x - 7, by, k.x, by - 9);
        ctx.fill();
        ctx.fillStyle = '#fff3c4';
        ctx.beginPath(); ctx.arc(k.x - 1.5, by + 1, 1.6, 0, TAU); ctx.fill();
      } else {
        ctx.fillStyle = '#5a4322';
        ctx.fillRect(k.x - 10, k.y - 8, 20, 15);
        ctx.fillStyle = '#e9b94e';
        ctx.fillRect(k.x - 10, k.y - 3, 20, 3);
        ctx.fillRect(k.x - 2, k.y - 8, 4, 15);
        ctx.fillStyle = '#ffe9a8';
        ctx.fillRect(k.x - 1.5, k.y - 3.5, 3, 4);
      }
    }

    // 그림자 (램프 반대쪽으로 길게)
    if (p.lit && !this.lowPerf) {
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      const lim = p.lr + 30;
      for (const e of g.enemies) {
        const dx = e.x - p.x, dy = e.y - p.y, d = Math.hypot(dx, dy);
        if (d > lim || d < 4) continue;
        const nx = dx / d, ny = dy / d, len = e.r * 1.2 + (d / p.lr) * 34;
        const px = -ny * e.r * 0.85, py = nx * e.r * 0.85;
        ctx.beginPath();
        ctx.moveTo(e.x + px, e.y + py);
        ctx.lineTo(e.x + nx * len + px * 1.5, e.y + ny * len + py * 1.5);
        ctx.lineTo(e.x + nx * len - px * 1.5, e.y + ny * len - py * 1.5);
        ctx.lineTo(e.x - px, e.y - py);
        ctx.fill();
      }
    }

    // 적
    for (const e of g.enemies) {
      if (!inView(e.x, e.y, e.r + 40)) continue;
      this.drawEnemy(ctx, e, t);
    }

    // 허깨비 등불
    for (const d of g.decoys) {
      ctx.fillStyle = '#4a3c26';
      ctx.fillRect(d.x - 4, d.y - 8, 8, 11);
      ctx.fillStyle = '#ffe2a0';
      ctx.fillRect(d.x - 2.5, d.y - 6, 5, 7);
    }

    this.drawPlayer(ctx, p, t, g);

    for (const L of g.lamps) {
      if (!inView(L.x, L.y, 90)) continue;
      this.drawLamp(ctx, L);
    }

    // --- 어둠 합성 ---
    this.drawDarkness(g, cx, cy, t);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(this.dark, 0, 0, W, H);

    // --- 빛나는 것들 (어둠 위) ---
    world();
    ctx.globalCompositeOperation = 'lighter';
    const spr = (name, x, y, r, a = 1) => {
      ctx.globalAlpha = a;
      ctx.drawImage(S[name], x - r, y - r, r * 2, r * 2);
    };

    // 빛의 색: 등불은 따뜻하게, 어둠은 달빛처럼 차갑게
    ctx.globalCompositeOperation = 'overlay';
    if (p.lit) spr('tint', p.x, p.y, p.lr * LIGHT_K, 1);
    else spr('moon', p.x, p.y, 150, 1);
    for (const L of g.lamps) {
      if (L.lit && inView(L.x, L.y, BASE.lampR * LIGHT_K)) spr('tint', L.x, L.y - 6, BASE.lampR * LIGHT_K * Math.min(1, L.litT * 2.5), 0.55);
    }
    ctx.globalCompositeOperation = 'lighter';
    if (p.lit) spr('warm', p.x, p.y, p.lr * 0.9, 0.8);
    else spr('cold', p.x, p.y, 120, 0.8);
    for (const L of g.lamps) {
      if (!inView(L.x, L.y, BASE.lampR + 40)) continue;
      if (L.lit) {
        spr('warm', L.x, L.y - 8, BASE.lampR * 0.9, 0.6);
        spr('gold', L.x, L.y - 52, 24 + Math.sin(t * 9 + L.x) * 2, 0.95);
      } else {
        spr('cyan', L.x, L.y - 52, 11, 0.3 + 0.14 * Math.sin(t * 2.4 + L.y));
      }
    }
    // 빛이 닿는 경계
    ctx.globalAlpha = 1;
    ctx.lineWidth = 1.5;
    if (p.lit) {
      ctx.strokeStyle = 'rgba(255,214,140,0.13)';
      ctx.beginPath(); ctx.arc(p.x, p.y, p.lr, 0, TAU); ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(255,214,140,0.1)';
    for (const L of g.lamps) {
      if (!L.lit || !inView(L.x, L.y, BASE.lampR + 10)) continue;
      ctx.beginPath(); ctx.arc(L.x, L.y, BASE.lampR, 0, TAU); ctx.stroke();
    }

    for (const q of g.patches) {
      if (!inView(q.x, q.y, 60)) continue;
      const a = Math.min(1, q.life / 0.5) * (0.55 + 0.25 * Math.sin(t * 17 + q.x));
      spr('orange', q.x, q.y - 3, q.r * 1.5, a);
    }

    for (const k of g.pickups) {
      if (!inView(k.x, k.y, 30)) continue;
      if (k.kind === 'xp') {
        const big = k.v >= 4;
        spr(big ? 'gold' : 'orange', k.x, k.y + Math.sin(t * 5 + k.x * 0.1) * 1.5, big ? 9 : 6, 0.95);
      } else if (k.kind === 'oil') {
        spr('gold', k.x, k.y, 15, 0.5);
      } else {
        spr('gold', k.x, k.y, 30 + Math.sin(t * 5) * 4, 0.7);
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = '#ffd98a';
        ctx.fillRect(k.x - 1.5, k.y - 150, 3, 150);
      }
    }

    for (const d of g.decoys) {
      spr('gold', d.x, d.y - 2, 26 + Math.sin(t * 14) * 5, 0.9);
      ctx.globalAlpha = 0.8;
      ctx.strokeStyle = '#ffd98a'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(d.x, d.y, 18, -Math.PI / 2, -Math.PI / 2 + TAU * (d.life / d.max)); ctx.stroke();
    }

    // 눈 — 어둠 속에서도 보인다
    for (const e of g.enemies) {
      if (!inView(e.x, e.y, e.r + 20)) continue;
      this.drawEyes(ctx, e, t, spr);
    }

    // 반딧불 고리
    const hw = g.wpn('halo');
    if (hw) {
      const cor = !!g.evo.corona, n = cor ? 8 : hw.n, R = hw.r * (cor ? 1.3 : 1);
      for (let i = 0; i < n; i++) {
        const a = g.tm.halo + (i / n) * TAU;
        spr(cor ? 'white' : 'gold', p.x + Math.cos(a) * R, p.y + Math.sin(a) * R, cor ? 13 : 11, p.lit ? 1 : 0.15);
      }
    }

    // 탄환
    for (const b of g.bullets) {
      if (b.kind === 'moon') {
        spr('cyan', b.x, b.y, 11, 1);
      } else {
        spr('orange', b.x, b.y, 10, 1);
        spr('gold', b.x - b.vx * 0.02, b.y - b.vy * 0.02, 7, 0.7);
      }
    }
    for (const b of g.ebullets) {
      spr('violet', b.x, b.y, b.r * 2.1, 1);
      spr('white', b.x, b.y, b.r * 0.7, 0.8);
    }

    // 플레이어 등불
    const lx = p.x + Math.cos(p.face) * 17, ly = p.y + Math.sin(p.face) * 11 - 6;
    if (p.lit) spr('gold', lx, ly, 17 + Math.sin(t * 15) * 1.5, 1);
    else {
      spr('cyan', lx, ly, 7, 0.4);
      // 섬광 충전 고리
      ctx.globalAlpha = 0.9;
      const full = p.charge >= 1;
      ctx.strokeStyle = full ? '#ffffff' : '#9fd0ff';
      ctx.lineWidth = full ? 3 + Math.sin(t * 16) * 1 : 2.5;
      ctx.beginPath(); ctx.arc(p.x, p.y, 24, -Math.PI / 2, -Math.PI / 2 + TAU * p.charge); ctx.stroke();
      if (full) spr('cyan', p.x, p.y, 34 + Math.sin(t * 16) * 4, 0.35);
    }

    // 가로등 진행 고리
    for (const L of g.lamps) {
      if (!inView(L.x, L.y, 80)) continue;
      if (!L.lit && L.prog > 0) {
        ctx.globalAlpha = 1; ctx.strokeStyle = '#ffd98a'; ctx.lineWidth = 3.5;
        ctx.beginPath(); ctx.arc(L.x, L.y - 52, 15, -Math.PI / 2, -Math.PI / 2 + TAU * L.prog); ctx.stroke();
        spr('gold', L.x, L.y - 52, 10 + L.prog * 16, 0.6 * L.prog);
      }
      if (L.lit && L.snuff > 0) {
        ctx.globalAlpha = 1; ctx.strokeStyle = '#b48cff'; ctx.lineWidth = 3.5;
        ctx.beginPath(); ctx.arc(L.x, L.y - 52, 17, -Math.PI / 2, -Math.PI / 2 + TAU * L.snuff); ctx.stroke();
      }
    }

    // 빛줄기
    for (let i = this.beams.length - 1; i >= 0; i--) {
      const b = this.beams[i];
      b.life -= dt;
      if (b.life <= 0) { this.beams.splice(i, 1); continue; }
      const k = b.life / b.max;
      ctx.globalAlpha = k;
      ctx.lineCap = 'round';
      const ex = b.x + Math.cos(b.a) * b.len, ey = b.y + Math.sin(b.a) * b.len;
      ctx.strokeStyle = '#ffb45a'; ctx.lineWidth = b.w * (0.6 + 0.6 * k);
      ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(ex, ey); ctx.stroke();
      ctx.strokeStyle = '#fff6dc'; ctx.lineWidth = b.w * 0.35 * k;
      ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(ex, ey); ctx.stroke();
    }

    // 고리
    for (let i = this.rings.length - 1; i >= 0; i--) {
      const r = this.rings[i];
      r.life -= dt;
      if (r.life <= 0) { this.rings.splice(i, 1); continue; }
      const k = 1 - r.life / r.max, e = 1 - (1 - k) * (1 - k);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = `rgba(${r.color},${(1 - k) * 0.9})`;
      ctx.lineWidth = r.width * (1 - k * 0.6);
      ctx.beginPath(); ctx.arc(r.x, r.y, Math.max(1, r.r0 + (r.r1 - r.r0) * e), 0, TAU); ctx.stroke();
    }

    // 파티클
    const ps = this.parts;
    for (let i = ps.length - 1; i >= 0; i--) {
      const q = ps[i];
      q.life -= dt;
      if (q.life <= 0) { ps[i] = ps[ps.length - 1]; ps.pop(); continue; }
      q.vy += q.grav * dt;
      q.x += q.vx * dt; q.y += q.vy * dt;
      q.vx *= 0.94; q.vy *= 0.94;
      const k = q.life / q.max;
      ctx.globalAlpha = k;
      const r = q.size * (0.5 + 0.5 * k);
      ctx.drawImage(S[q.spr], q.x - r, q.y - r, r * 2, r * 2);
    }

    // 등불에서 피어오르는 불티
    if (p.lit && Math.random() < dt * 14) {
      this.part(lx + (Math.random() - 0.5) * 4, ly - 4, (Math.random() - 0.5) * 16, -24 - Math.random() * 30, 0.7, 3, 'orange');
    }

    // 월식
    const b = g.boss;
    if (b && !b.dead && inView(b.x, b.y, 200)) this.drawBoss(ctx, b, t, spr);

    // 정예 체력
    ctx.globalCompositeOperation = 'source-over';
    for (const e of g.enemies) {
      if (!e.elite || e.hp >= e.maxHp || !inView(e.x, e.y, 60)) continue;
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(e.x - 22, e.y - e.r - 14, 44, 5);
      ctx.fillStyle = '#e9b94e';
      ctx.fillRect(e.x - 21, e.y - e.r - 13, 42 * Math.max(0, e.hp / e.maxHp), 3);
    }

    // --- 화면 공간 ---
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    const sx = (x) => (x - cx) * s + W / 2, sy = (y) => (y - cy) * s + H / 2;

    // 피해 숫자
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (let i = this.texts.length - 1; i >= 0; i--) {
      const q = this.texts[i];
      q.life -= dt;
      if (q.life <= 0) { this.texts.splice(i, 1); continue; }
      const k = q.life / q.max;
      q.y -= 34 * dt;
      ctx.globalAlpha = Math.min(1, k * 2.2);
      ctx.font = `800 ${Math.round(q.size * this.dpr * (W < H ? 0.9 : 1))}px system-ui, sans-serif`;
      ctx.lineWidth = 3 * this.dpr; ctx.strokeStyle = 'rgba(10,8,16,0.8)';
      ctx.strokeText(q.str, sx(q.x), sy(q.y));
      ctx.fillStyle = q.color;
      ctx.fillText(q.str, sx(q.x), sy(q.y));
    }
    ctx.globalAlpha = 1;

    this.drawIndicators(ctx, g, sx, sy, t);

    // 비네트 · 위험 · 섬광 · 새벽
    ctx.drawImage(S.vignette, 0, 0, W, H);
    const f = p.oil / g.stat.maxOil;
    const low = g.state === 'playing' && f < 0.28 ? (0.28 - f) / 0.28 : 0;
    this.hurt = Math.max(0, this.hurt - dt);
    const danger = Math.min(1, low * (0.55 + 0.25 * Math.sin(t * 6)) + this.hurt * 1.8);
    if (danger > 0.01) {
      ctx.globalAlpha = danger;
      ctx.drawImage(S.danger, 0, 0, W, H);
      ctx.globalAlpha = 1;
    }
    if (g.state === 'dawn' || g.state === 'won') {
      const k = g.state === 'won' ? 1 : Math.min(1, g.dawnT / 3.5);
      const gr = ctx.createLinearGradient(0, 0, 0, H);
      gr.addColorStop(0, `rgba(255,214,150,${0.5 * k})`);
      gr.addColorStop(1, `rgba(255,150,120,${0.2 * k})`);
      ctx.fillStyle = gr;
      ctx.fillRect(0, 0, W, H);
    }
    if (this.flash > 0.01) {
      ctx.fillStyle = `rgba(255,240,214,${Math.min(0.85, this.flash)})`;
      ctx.fillRect(0, 0, W, H);
      this.flash *= Math.pow(0.002, dt);
    } else this.flash = 0;
  }

  drawDarkness(g, cx, cy, t) {
    const d = this.dctx, DW = this.dark.width, DH = this.dark.height, p = g.p;
    let alpha = p.lit ? 0.945 : 0.925;
    const left = g.night.duration - g.clock;
    if (left < 45) alpha -= 0.07 * (1 - left / 45);
    if (g.state === 'dawn') alpha *= Math.max(0, 1 - g.dawnT / 3.4);
    else if (g.state === 'won') alpha = 0;
    d.setTransform(1, 0, 0, 1, 0, 0);
    d.globalCompositeOperation = 'source-over';
    d.globalAlpha = 1;
    d.clearRect(0, 0, DW, DH);
    d.fillStyle = `rgba(5,6,15,${alpha})`;
    d.fillRect(0, 0, DW, DH);
    if (alpha <= 0) return;
    d.globalCompositeOperation = 'destination-out';
    const k = this.s * this.q;
    d.setTransform(k, 0, 0, k, DW / 2 - cx * k, DH / 2 - cy * k);
    const img = this.spr.light;
    const light = (x, y, r, a) => {
      d.globalAlpha = a;
      d.drawImage(img, x - r, y - r, r * 2, r * 2);
    };
    const fl = 1 + 0.012 * Math.sin(t * 13) + 0.008 * Math.sin(t * 7.3);
    light(p.x, p.y, p.lr * (p.lit ? LIGHT_K : 1.5) * fl, p.lit ? 1 : 0.55);
    const vw = this.w / this.s, vh = this.h / this.s;
    const near = (x, y, m) => Math.abs(x - cx) < vw / 2 + m && Math.abs(y - cy) < vh / 2 + m;
    for (const L of g.lamps) {
      if (L.lit && near(L.x, L.y, BASE.lampR * LIGHT_K)) {
        const grow = Math.min(1, L.litT * 2.5);
        light(L.x, L.y - 6, BASE.lampR * LIGHT_K * grow * (1 + 0.01 * Math.sin(t * 11 + L.x)), 1);
      } else if (!L.lit && near(L.x, L.y, 80)) {
        // 꺼진 가로등도 달빛에 어렴풋이 보인다
        light(L.x, L.y - 30, 58 + L.prog * 40, 0.3 + 0.4 * L.prog);
      }
    }
    for (const q of g.patches) if (near(q.x, q.y, 60)) light(q.x, q.y, q.r * 2.3, 0.55 * Math.min(1, q.life / 0.5));
    for (const b of g.bullets) light(b.x, b.y, 36, 0.5);
    for (const c of g.decoys) light(c.x, c.y, 90, 0.9);
    for (const r of this.rings) {
      if (r.width >= 5 && r.r1 > r.r0) {
        const kk = r.life / r.max;
        light(r.x, r.y, r.r1 * 1.15, 0.8 * kk);
      }
    }
    for (const bm of this.beams) {
      const kk = bm.life / bm.max, n = Math.ceil(bm.len / 60);
      for (let i = 1; i <= n; i++) light(bm.x + Math.cos(bm.a) * i * 60, bm.y + Math.sin(bm.a) * i * 60, 60, 0.7 * kk);
    }
    if (!this.lowPerf) {
      for (const pk of g.pickups) {
        if (near(pk.x, pk.y, 20)) light(pk.x, pk.y, pk.kind === 'xp' ? 15 : 34, 0.4);
      }
    }
    const bs = g.boss;
    if (bs && !bs.dead && near(bs.x, bs.y, 160)) light(bs.x, bs.y, bs.r * 2.3, 0.35);
  }

  drawEnemy(ctx, e, t) {
    const x = e.x, y = e.y, r = e.r;
    const flash = e.flash > 0;
    let fill = '#15101f', rim = '#4b3d6b';
    if (e.elite) { fill = '#1f1430'; rim = '#d9a441'; }
    if (flash) { fill = '#fff3da'; rim = '#ffffff'; }
    ctx.lineWidth = e.elite ? 2.5 : 1.5;
    switch (e.type) {
      case 'moth': {
        const flap = Math.sin(t * 30 + e.phase);
        ctx.fillStyle = flash ? '#fff' : '#8f869e';
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x - r * 1.7, y - r * (0.5 + flap * 0.7));
        ctx.lineTo(x - r * 1.2, y + r * 0.7);
        ctx.closePath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + r * 1.7, y - r * (0.5 + flap * 0.7));
        ctx.lineTo(x + r * 1.2, y + r * 0.7);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = fill;
        ctx.beginPath(); ctx.ellipse(x, y, r * 0.42, r * 0.9, 0, 0, TAU); ctx.fill();
        break;
      }
      case 'stalker': {
        if (e.frozen && !flash) { fill = '#7c8292'; rim = '#cdd3e0'; }
        ctx.fillStyle = fill; ctx.strokeStyle = rim;
        ctx.beginPath();
        ctx.moveTo(x, y - r * 1.5);
        ctx.quadraticCurveTo(x + r * 1.05, y - r * 0.2, x + r * 0.5, y + r * 1.1);
        ctx.lineTo(x - r * 0.5, y + r * 1.1);
        ctx.quadraticCurveTo(x - r * 1.05, y - r * 0.2, x, y - r * 1.5);
        ctx.fill(); ctx.stroke();
        if (e.frozen) {
          ctx.fillStyle = '#3d4350';
          ctx.beginPath(); ctx.arc(x, y - r * 0.35, r * 0.3, 0, TAU); ctx.fill();
        }
        break;
      }
      case 'spitter': {
        ctx.fillStyle = fill; ctx.strokeStyle = rim;
        ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); ctx.stroke();
        ctx.beginPath();
        for (let i = 0; i < 3; i++) {
          const a = Math.PI * (0.25 + i * 0.25);
          ctx.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
          ctx.lineTo(x + Math.cos(a) * r * 1.5, y + Math.sin(a) * r * 1.5);
        }
        ctx.stroke();
        ctx.fillStyle = '#43226b';
        ctx.beginPath(); ctx.arc(x, y + r * 0.2, r * 0.42, 0, TAU); ctx.fill();
        break;
      }
      case 'brute': {
        let bx = x, by = y;
        if (e.cs === 1) {
          bx += (Math.random() - 0.5) * 3; by += (Math.random() - 0.5) * 3;
          if (!flash) { fill = '#3a1116'; rim = '#ff6a55'; }
          ctx.fillStyle = 'rgba(255,70,50,0.16)';
          const nx = -e.cdy, ny = e.cdx, len = 220;
          ctx.beginPath();
          ctx.moveTo(x + nx * r, y + ny * r);
          ctx.lineTo(x + e.cdx * len + nx * r, y + e.cdy * len + ny * r);
          ctx.lineTo(x + e.cdx * len - nx * r, y + e.cdy * len - ny * r);
          ctx.lineTo(x - nx * r, y - ny * r);
          ctx.fill();
        }
        ctx.fillStyle = fill; ctx.strokeStyle = rim;
        ctx.beginPath();
        ctx.roundRect(bx - r, by - r * 0.9, r * 2, r * 1.85, r * 0.55);
        ctx.fill(); ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(bx - r * 0.8, by - r * 0.7); ctx.lineTo(bx - r * 1.15, by - r * 1.5); ctx.lineTo(bx - r * 0.3, by - r * 0.88);
        ctx.moveTo(bx + r * 0.8, by - r * 0.7); ctx.lineTo(bx + r * 1.15, by - r * 1.5); ctx.lineTo(bx + r * 0.3, by - r * 0.88);
        ctx.fill(); ctx.stroke();
        break;
      }
      case 'snuffer': {
        if (!flash) { fill = '#0f1a1c'; rim = '#3f6a66'; }
        ctx.fillStyle = fill; ctx.strokeStyle = rim;
        ctx.beginPath();
        ctx.moveTo(x, y - r * 1.6);
        ctx.lineTo(x + r, y + r * 0.7);
        ctx.quadraticCurveTo(x, y + r * 1.2, x - r, y + r * 0.7);
        ctx.closePath();
        ctx.fill(); ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x + r * 0.9, y + r * 0.9); ctx.lineTo(x + r * 1.25, y - r * 1.7);
        ctx.stroke();
        ctx.beginPath(); ctx.arc(x + r * 1.25, y - r * 1.7, r * 0.42, Math.PI, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
        break;
      }
      case 'eclipse': {
        ctx.fillStyle = flash ? '#3a2a55' : '#020203';
        ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
        break;
      }
      default: {
        ctx.fillStyle = fill; ctx.strokeStyle = rim;
        ctx.beginPath();
        const n = 9;
        for (let i = 0; i <= n; i++) {
          const a = (i / n) * TAU;
          const wob = e.mode === 'sleep' ? 1 : 1 + 0.13 * Math.sin(t * 5 + e.phase + i * 2.1);
          const px = x + Math.cos(a) * r * wob, py = y + Math.sin(a) * r * wob * (e.mode === 'sleep' ? 0.75 : 0.93);
          if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py);
        }
        ctx.closePath();
        ctx.fill(); ctx.stroke();
      }
    }
  }

  drawEyes(ctx, e, t, spr) {
    const x = e.x, y = e.y, r = e.r;
    if (e.type === 'eclipse') return;
    if (e.mode === 'sleep') {
      ctx.globalAlpha = 0.5;
      ctx.strokeStyle = '#8f7cc0'; ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(x - r * 0.5, y - 1); ctx.lineTo(x - r * 0.15, y - 1);
      ctx.moveTo(x + r * 0.15, y - 1); ctx.lineTo(x + r * 0.5, y - 1);
      ctx.stroke();
      return;
    }
    const lookX = Math.cos(e.face) * r * 0.18, lookY = Math.sin(e.face) * r * 0.12;
    const col = EYE[e.type] || 'violet';
    if (e.type === 'stalker') {
      if (!e.frozen) spr('cyan', x + lookX, y - r * 0.35 + lookY, r * 0.62, 1);
      return;
    }
    if (e.type === 'moth') {
      spr(col, x, y - 1, 4, 0.55);
      return;
    }
    if (e.type === 'spitter') {
      const a = e.cd < 0.6 ? 1 : 0.55;
      spr(col, x, y + r * 0.2, r * (e.cd < 0.6 ? 0.9 : 0.6), a);
      return;
    }
    const blink = Math.sin(t * 1.3 + e.phase * 9) > 0.985 ? 0.15 : 1;
    const er = Math.max(3.2, r * 0.34) * (e.cs === 1 ? 1.6 : 1);
    const ey = y - r * 0.18 + lookY, gap = r * 0.38;
    spr(col, x - gap + lookX, ey, er, blink);
    spr(col, x + gap + lookX, ey, er, blink);
    if (e.elite) {
      ctx.globalAlpha = 0.5 + 0.2 * Math.sin(t * 6);
      ctx.strokeStyle = '#ffd27a'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(x, y, r + 6, 0, TAU); ctx.stroke();
    }
  }

  drawBoss(ctx, b, t, spr) {
    const vul = b.vuln > 0 || b.stun > 0;
    const col = vul ? 'gold' : 'white';
    // 광환
    spr(col, b.x, b.y, b.r * 2.25 + Math.sin(t * 3) * 4, 0.85);
    spr('violet', b.x, b.y, b.r * 3.1, 0.35);
    ctx.globalAlpha = 0.8;
    ctx.strokeStyle = vul ? '#ffe2a0' : '#f3ecff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * TAU + t * 0.25;
      const l = b.r * (1.18 + 0.22 * Math.sin(t * 2.3 + i * 1.7));
      ctx.moveTo(b.x + Math.cos(a) * b.r * 1.02, b.y + Math.sin(a) * b.r * 1.02);
      ctx.lineTo(b.x + Math.cos(a) * l, b.y + Math.sin(a) * l);
    }
    ctx.stroke();
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.fillStyle = b.flash > 0 ? '#2b1f44' : '#010102';
    ctx.beginPath(); ctx.arc(b.x, b.y, b.r * 0.97, 0, TAU); ctx.fill();
    if (b.shield > 0) {
      ctx.strokeStyle = '#b48cff';
      ctx.lineWidth = 5;
      ctx.setLineDash([16, 9]);
      ctx.lineDashOffset = -t * 40;
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r + 14, 0, TAU); ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 0.16;
      ctx.fillStyle = '#b48cff';
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r + 14, 0, TAU); ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.globalCompositeOperation = 'lighter';
  }

  drawPlayer(ctx, p, t, g) {
    const x = p.x, y = p.y;
    const bob = p.moving ? Math.sin(p.walk * 2) * 1.6 : Math.sin(t * 2) * 0.6;
    const dir = Math.cos(p.face) >= 0 ? 1 : -1;
    const dead = g.state === 'dead';
    ctx.save();
    ctx.translate(x, y + 11); ctx.scale(1.22, 1.22); ctx.translate(-x, -(y + 11));
    if (p.inv > 0 && g.state === 'playing' && Math.floor(t * 18) % 2) ctx.globalAlpha = 0.45;
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath(); ctx.ellipse(x, y + 11, 11, 4.5, 0, 0, TAU); ctx.fill();
    // 발
    const st = p.moving ? Math.sin(p.walk * 2) * 3 : 0;
    ctx.fillStyle = '#1a2233';
    ctx.beginPath(); ctx.ellipse(x - 4 + st, y + 10, 3.4, 2.2, 0, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.ellipse(x + 4 - st, y + 10, 3.4, 2.2, 0, 0, TAU); ctx.fill();
    // 망토
    ctx.fillStyle = '#34496a';
    ctx.beginPath();
    ctx.moveTo(x - 9.5, y + 9);
    ctx.quadraticCurveTo(x - 11.5, y - 4 + bob, x - 5, y - 8 + bob);
    ctx.lineTo(x + 5, y - 8 + bob);
    ctx.quadraticCurveTo(x + 11.5, y - 4 + bob, x + 9.5, y + 9);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#263651';
    ctx.beginPath();
    ctx.moveTo(x - dir * 2, y - 7 + bob); ctx.lineTo(x - dir * 9.5, y + 9); ctx.lineTo(x - dir * 3, y + 9);
    ctx.closePath(); ctx.fill();
    // 목도리
    ctx.fillStyle = '#c9583a';
    ctx.fillRect(x - 5.5, y - 9.5 + bob, 11, 3.2);
    ctx.fillRect(x - dir * 6.5 - 1.5, y - 8 + bob, 3, 7);
    // 얼굴
    ctx.fillStyle = '#f0d5b0';
    ctx.beginPath(); ctx.arc(x, y - 13 + bob, 5.6, 0, TAU); ctx.fill();
    ctx.fillStyle = '#2a2230';
    ctx.fillRect(x + dir * 1.5 - 0.8, y - 13.5 + bob, 1.6, 2.2);
    if (dir > 0) ctx.fillRect(x + 4 - 0.8, y - 13.5 + bob, 1.4, 2.2); else ctx.fillRect(x - 4 - 0.6, y - 13.5 + bob, 1.4, 2.2);
    // 모자
    ctx.fillStyle = '#1a2233';
    ctx.beginPath(); ctx.ellipse(x, y - 16.5 + bob, 10.5, 3.3, 0, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.roundRect(x - 5.6, y - 25 + bob, 11.2, 9, 3); ctx.fill();
    ctx.fillStyle = '#c9583a';
    ctx.fillRect(x - 5.6, y - 19.2 + bob, 11.2, 1.8);
    // 등불
    const lx = x + Math.cos(p.face) * 14, ly = y + Math.sin(p.face) * 9 - 3 + bob * 0.4;
    ctx.strokeStyle = '#34496a'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x + dir * 5, y - 3 + bob); ctx.lineTo(lx, ly - 6); ctx.stroke();
    ctx.fillStyle = '#4d3d25';
    ctx.fillRect(lx - 4, ly - 6, 8, 11);
    ctx.beginPath(); ctx.moveTo(lx - 5, ly - 6); ctx.lineTo(lx, ly - 10); ctx.lineTo(lx + 5, ly - 6); ctx.fill();
    ctx.fillStyle = dead ? '#222938' : p.lit ? '#fff0c0' : '#46567a';
    ctx.fillRect(lx - 2.5, ly - 4.5, 5, 8);
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  drawLamp(ctx, L) {
    const x = L.x, y = L.y;
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath(); ctx.ellipse(x, y + 3, 12, 5, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#1b212c';
    ctx.beginPath(); ctx.ellipse(x, y + 2, 8, 3.6, 0, 0, TAU); ctx.fill();
    ctx.fillRect(x - 5, y - 4, 10, 6);
    ctx.fillStyle = '#2a3342';
    ctx.fillRect(x - 2.2, y - 46, 4.4, 44);
    ctx.fillStyle = '#48566c';
    ctx.fillRect(x - 2.2, y - 46, 1.3, 44);
    ctx.fillStyle = '#1b212c';
    ctx.fillRect(x - 6, y - 47, 12, 2.4);
    // 등갓
    ctx.fillStyle = L.lit ? '#ffe7a8' : '#2f394b';
    ctx.beginPath();
    ctx.moveTo(x - 7.5, y - 59); ctx.lineTo(x + 7.5, y - 59); ctx.lineTo(x + 5.5, y - 47); ctx.lineTo(x - 5.5, y - 47);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#1b212c'; ctx.lineWidth = 1.4; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x, y - 59); ctx.lineTo(x, y - 47); ctx.stroke();
    ctx.fillStyle = '#1b212c';
    ctx.beginPath(); ctx.moveTo(x - 10, y - 59); ctx.lineTo(x, y - 67); ctx.lineTo(x + 10, y - 59); ctx.closePath(); ctx.fill();
    ctx.fillRect(x - 1.2, y - 70, 2.4, 4);
  }

  // 화면 밖의 목표를 가리키는 표시
  drawIndicators(ctx, g, sx, sy, t) {
    if (g.state !== 'playing' && g.state !== 'levelup') return;
    const W = this.w, H = this.h, dpr = this.dpr, p = g.p;
    const pad = 34 * dpr;
    const arrow = (x, y, color, size, alpha, pulse) => {
      const px = sx(x), py = sy(y);
      if (px > pad && px < W - pad && py > pad && py < H - pad) return;
      const a = Math.atan2(py - H / 2, px - W / 2);
      const hw = W / 2 - pad, hh = H / 2 - pad;
      const k = Math.min(hw / Math.abs(Math.cos(a) || 1e-6), hh / Math.abs(Math.sin(a) || 1e-6));
      const ax = W / 2 + Math.cos(a) * k, ay = H / 2 + Math.sin(a) * k;
      const sz = size * dpr * (pulse ? 1 + 0.2 * Math.sin(t * 8) : 1);
      ctx.save();
      ctx.translate(ax, ay); ctx.rotate(a);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.moveTo(sz, 0); ctx.lineTo(-sz * 0.7, sz * 0.7); ctx.lineTo(-sz * 0.3, 0); ctx.lineTo(-sz * 0.7, -sz * 0.7); ctx.closePath(); ctx.fill();
      ctx.restore();
    };
    // 가까운 꺼진 가로등 셋
    const dark = [];
    for (const L of g.lamps) {
      if (!L.lit) dark.push([Math.hypot(L.x - p.x, L.y - p.y), L]);
      else if (L.snuff > 0) arrow(L.x, L.y - 40, '#b48cff', 11, 1, true);
    }
    dark.sort((a, b) => a[0] - b[0]);
    for (let i = 0; i < Math.min(3, dark.length); i++) arrow(dark[i][1].x, dark[i][1].y - 40, '#bfe6ff', 9 - i, 0.75 - i * 0.2, false);
    for (const k of g.pickups) if (k.kind === 'chest') arrow(k.x, k.y, '#ffd27a', 10, 0.95, true);
    const b = g.boss;
    if (b && !b.dead) arrow(b.x, b.y, '#f3ecff', 13, 1, true);
    ctx.globalAlpha = 1;
  }
}
