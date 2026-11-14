// THE LAMP 2 — 캔버스 렌더러
// 어둠 속에서는 지형이 밤하늘을 등진 실루엣으로만 보이고, 전구의 빛이 닿는 곳만 제 색을 드러낸다.
import { T, P, TILE } from './world.js';

const TAU = Math.PI * 2;
const VIS_R = P.LIGHT_R * 1.14; // 보이는 빛은 판정보다 살짝 넓게 번진다
const { STONE, MOSS, SLOPE_R, SLOPE_L, DAY, NIGHT, GATE, SPIKE_U, SPIKE_D } = TILE;

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, w); c.height = Math.max(1, h);
  return c;
}
function radial(size, stops) {
  const c = makeCanvas(size, size), g = c.getContext('2d');
  const gr = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  for (const [o, col] of stops) gr.addColorStop(o, col);
  g.fillStyle = gr; g.fillRect(0, 0, size, size);
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

// 장마다 다른 색
const THEME = {
  1: { sky: ['#0a1024', '#1a2444', '#33304f'], far: '#131b36', stone: [28, 14, 34], cap: '#8a7a5e', name: 'dusk' },
  2: { sky: ['#07101c', '#11263a', '#1d3a44'], far: '#0e1f2e', stone: [150, 12, 30], cap: '#5f8a62', name: 'woods' },
  3: { sky: ['#0d0a1c', '#1f1a3a', '#3a2a4a'], far: '#18142e', stone: [232, 14, 34], cap: '#7f86a6', name: 'tower' },
};

export const SKINS = {
  warm: { glass: '#fff3c9', core: '#ffd27a', glow: 'gold', rgb: '255,196,110' },
  day: { glass: '#f4fbff', core: '#dff1ff', glow: 'white', rgb: '220,236,255' },
  moon: { glass: '#d8e6ff', core: '#9fc4ff', glow: 'cyan', rgb: '150,190,255' },
  dawn: { glass: '#ffe3ea', core: '#ffb0c4', glow: 'pink', rgb: '255,170,196' },
};

export class Renderer {
  constructor(canvas) {
    this.cv = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.world = makeCanvas(2, 2); this.wctx = this.world.getContext('2d');
    this.sil = makeCanvas(2, 2); this.sctx = this.sil.getContext('2d');
    this.mask = makeCanvas(2, 2); this.mctx = this.mask.getContext('2d');
    this.w = 2; this.h = 2; this.s = 1; this.dpr = 1;
    this.cam = { x: 0, y: 0 };
    this.time = 0;
    this.shake = 0; this.flash = 0; this.hurt = 0;
    this.parts = []; this.rings = []; this.shards = [];
    this.lowPerf = false;
    this.skin = SKINS.warm;
    this.level = null;
    this.segs = [];
    this.tileCache = new Map();
    this.lightK = 1; // 빛이 켜지고 꺼질 때의 부드러운 전환
    this.spr = {
      gold: glow(255, 214, 120), orange: glow(255, 170, 70), white: glow(255, 255, 255), cyan: glow(140, 210, 255),
      violet: glow(190, 150, 255), pink: glow(255, 170, 215), red: glow(255, 90, 80), blue: glow(110, 140, 255),
      light: radial(256, [[0, 'rgba(255,255,255,1)'], [0.35, 'rgba(255,255,255,0.96)'], [0.7, 'rgba(255,255,255,0.72)'], [0.9, 'rgba(255,255,255,0.3)'], [1, 'rgba(255,255,255,0)']]),
      vignette: radial(256, [[0, 'rgba(0,0,0,0)'], [0.6, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,0.6)']]),
      danger: radial(256, [[0, 'rgba(150,20,10,0)'], [0.55, 'rgba(150,20,10,0)'], [1, 'rgba(170,24,12,0.7)']]),
    };
  }

  resize(cssW, cssH) {
    const dpr = Math.min(window.devicePixelRatio || 1, this.lowPerf ? 1.25 : 2);
    this.dpr = dpr;
    const W = Math.max(2, Math.round(cssW * dpr)), H = Math.max(2, Math.round(cssH * dpr));
    this.cv.width = W; this.cv.height = H;
    this.w = W; this.h = H;
    this.s = Math.min(H / (11.5 * T), W / (10.5 * T));
    this.world.width = W; this.world.height = H;
    this.sil.width = W; this.sil.height = H;
    this.mask.width = Math.ceil(W / 2); this.mask.height = Math.ceil(H / 2);
    this.tileCache.clear();
  }

  // 스테이지가 바뀔 때: 빛을 가리는 선분을 미리 뽑아 둔다
  setLevel(w) {
    this.level = w;
    this.theme = THEME[w.level.chapter] || THEME[1];
    this.parts.length = 0; this.rings.length = 0; this.shards.length = 0;
    this.shake = 0; this.flash = 0; this.hurt = 0;
    this.tileCache.clear();
    const segs = [];
    const op = (tx, ty) => {
      if (tx < 0 || tx >= w.W || ty < 0) return true;
      if (ty >= w.H) return false;
      const t = w.tiles[ty * w.W + tx];
      return t === STONE || t === MOSS;
    };
    // 가로 경계 (이어지는 것은 하나로)
    for (let ty = 0; ty <= w.H; ty++) {
      let run = -1;
      for (let tx = 0; tx <= w.W; tx++) {
        const edge = tx < w.W && op(tx, ty - 1) !== op(tx, ty);
        if (edge && run < 0) run = tx;
        if (!edge && run >= 0) { segs.push([run * T, ty * T, tx * T, ty * T]); run = -1; }
      }
    }
    for (let tx = 0; tx <= w.W; tx++) {
      let run = -1;
      for (let ty = 0; ty <= w.H; ty++) {
        const edge = ty < w.H && op(tx - 1, ty) !== op(tx, ty);
        if (edge && run < 0) run = ty;
        if (!edge && run >= 0) { segs.push([tx * T, run * T, tx * T, ty * T]); run = -1; }
      }
    }
    for (let ty = 0; ty < w.H; ty++) {
      for (let tx = 0; tx < w.W; tx++) {
        const t = w.tiles[ty * w.W + tx], x0 = tx * T, y0 = ty * T;
        if (t === SLOPE_R) segs.push([x0, y0 + T, x0 + T, y0]);
        else if (t === SLOPE_L) segs.push([x0, y0, x0 + T, y0 + T]);
      }
    }
    this.segs = segs;
    this.snap(w.bulb);
  }

  snap(b) {
    this.cam.x = b.x; this.cam.y = b.y - (this.h / this.s) * (this.w < this.h ? 0.02 : 0.14);
    this.clampCam();
  }

  clampCam() {
    const w = this.level, vw = this.w / this.s, vh = this.h / this.s;
    // 세로 화면에서는 아래쪽을 화면 버튼이 가리므로, 바닥 밑으로 여유를 두어 전구가 더 위에 보이게 한다
    const LW = w.W * T, LH = w.H * T + (this.w < this.h ? vh * 0.24 : 0);
    this.cam.x = LW <= vw ? LW / 2 : Math.max(vw / 2, Math.min(LW - vw / 2, this.cam.x));
    this.cam.y = LH <= vh ? LH - vh / 2 : Math.max(vh / 2, Math.min(LH - vh / 2, this.cam.y));
  }

  // ---------- 효과 ----------
  part(x, y, vx, vy, life, size, spr, grav = 0) {
    if (this.parts.length > 420) return;
    this.parts.push({ x, y, vx, vy, life, max: life, size, spr, grav });
  }
  burst(x, y, n, speed, life, size, spr, grav = 0) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU, sp = speed * (0.3 + Math.random() * 0.7);
      this.part(x, y, Math.cos(a) * sp, Math.sin(a) * sp, life * (0.6 + Math.random() * 0.4), size * (0.6 + Math.random() * 0.6), spr, grav);
    }
  }
  ring(x, y, r0, r1, life, color, width = 3) { this.rings.push({ x, y, r0, r1, life, max: life, color, width }); }

  consume(w) {
    for (const ev of w.events) {
      switch (ev.type) {
        case 'light':
          if (ev.on) { this.ring(ev.x, ev.y, 8, P.LIGHT_R, 0.3, this.skin.rgb, 3); this.flash = Math.max(this.flash, 0.05); }
          else this.ring(ev.x, ev.y, 90, 10, 0.22, '140,170,255', 2);
          break;
        case 'jump': this.burst(ev.x, ev.y + P.R, 4, 60, 0.3, 4, 'white'); break;
        case 'land':
          if (ev.v > 240) {
            this.burst(ev.x - ev.nx * P.R, ev.y - ev.ny * P.R, Math.min(10, 3 + ev.v / 120), 40 + ev.v * 0.15, 0.35, 4, ev.soft ? 'cyan' : 'white');
            if (ev.v > 500) this.shake = Math.max(this.shake, Math.min(9, ev.v / 110));
          }
          break;
        case 'crack':
          this.shake = Math.max(this.shake, 9); this.hurt = 0.45;
          this.burst(ev.x, ev.y, 10, 170, 0.5, 4, 'white');
          this.ring(ev.x, ev.y, 6, 60, 0.3, '255,255,255', 3);
          break;
        case 'shatter': {
          this.shake = 16; this.flash = Math.max(this.flash, 0.35); this.hurt = 0.6;
          for (let i = 0; i < 26; i++) {
            const a = Math.random() * TAU, sp = 90 + Math.random() * 330;
            this.shards.push({ x: ev.x, y: ev.y, vx: Math.cos(a) * sp + ev.vx * 0.35, vy: Math.sin(a) * sp - 140 + ev.vy * 0.2, a: Math.random() * TAU, va: (Math.random() - 0.5) * 18, life: 1.1, size: 3 + Math.random() * 6 });
          }
          this.burst(ev.x, ev.y, 24, 260, 0.7, 5, this.skin.glow);
          this.ring(ev.x, ev.y, 10, 150, 0.45, '255,244,214', 6);
          break;
        }
        case 'respawn': this.ring(ev.x, ev.y, 80, 12, 0.4, this.skin.rgb, 3); this.burst(ev.x, ev.y, 14, 120, 0.5, 4, this.skin.glow); break;
        case 'pad': this.burst(ev.x, ev.y - 10, 10, 160, 0.4, 4, 'pink'); this.ring(ev.x, ev.y - 8, 6, 44, 0.25, '255,170,215', 3); break;
        case 'lantern':
          this.ring(ev.x, ev.y - 50, 10, P.LANTERN_R, 0.6, '255,214,130', 5);
          for (let k = 0; k < 22; k++) this.part(ev.x + (Math.random() - 0.5) * 14, ev.y - 60, (Math.random() - 0.5) * 120, -40 - Math.random() * 150, 0.9, 5, 'gold', 180);
          this.flash = Math.max(this.flash, 0.1); this.shake = Math.max(this.shake, 3);
          break;
        case 'bloom':
          this.ring(ev.x, ev.y, 4, 54, 0.45, '255,230,150', 3);
          this.burst(ev.x, ev.y, 16, 130, 0.7, 5, 'gold');
          if (ev.all) this.flash = Math.max(this.flash, 0.12);
          break;
        case 'gate': break;
        case 'melt': this.burst(ev.x, ev.y, 6, 70, 0.35, 4, 'violet'); break;
        case 'bite': this.burst(ev.x, ev.y, 10, 150, 0.4, 5, 'violet'); break;
        case 'shadowFall': this.burst(ev.x, ev.y, 14, 160, 0.6, 5, 'violet'); this.ring(ev.x, ev.y, 6, 60, 0.35, '190,150,255', 3); break;
        case 'clear':
          this.flash = 0.5; this.shake = 6;
          this.ring(ev.x, ev.y, 10, 420, 1.0, '255,236,190', 9);
          for (let k = 0; k < 40; k++) this.part(ev.x + (Math.random() - 0.5) * 30, ev.y, (Math.random() - 0.5) * 260, -80 - Math.random() * 300, 1.3, 6, 'gold', 220);
          break;
      }
    }
  }

  // ---------- 타일 그림 (크기별로 한 번 그려 두고 재사용) ----------
  tileSprite(type, mask, v) {
    const key = type * 1000 + mask * 10 + v + this.theme.stone[0] * 100000;
    let c = this.tileCache.get(key);
    if (c) return c;
    const px = Math.ceil(T * this.s) + 1;
    c = makeCanvas(px, px);
    const g = c.getContext('2d');
    g.scale(px / T, px / T);
    const [h, s, l] = this.theme.stone;
    const up = mask & 1, rt = mask & 2, dn = mask & 4, lf = mask & 8; // 그쪽이 비어 있음
    const body = (clip) => {
      g.save(); clip();
      g.fillStyle = `hsl(${h},${s}%,${l - 4 + v * 2}%)`;
      g.fillRect(0, 0, T, T);
      // 돌결
      for (let r = 0; r < 3; r++) {
        const y = r * 16, off = (r + v) % 2 ? 12 : 0;
        for (let x = -24 + off; x < T; x += 24) {
          const k = hash2(x * 7 + r * 13 + v * 31, r * 5 + type);
          g.fillStyle = `hsl(${h + k * 14 - 7},${s}%,${l + k * 9 - 2}%)`;
          g.beginPath(); g.roundRect(x + 1, y + 1, 22, 14, 3); g.fill();
          g.fillStyle = 'rgba(255,255,255,0.07)';
          g.fillRect(x + 3, y + 2, 17, 2);
        }
      }
      g.fillStyle = 'rgba(0,0,0,0.22)';
      if (!up) g.fillRect(0, 0, T, 2);
      g.restore();
    };
    if (type === STONE || type === MOSS) {
      body(() => { g.beginPath(); g.rect(0, 0, T, T); g.clip(); });
      g.fillStyle = 'rgba(0,0,0,0.3)';
      if (rt) g.fillRect(T - 3, 0, 3, T);
      if (lf) g.fillRect(0, 0, 3, T);
      if (dn) g.fillRect(0, T - 4, T, 4);
      if (type === MOSS) {
        g.fillStyle = '#4f8a52';
        g.beginPath(); g.moveTo(0, 13);
        for (let x = 0; x <= T; x += 8) g.quadraticCurveTo(x + 4, 18 + ((x / 8 + v) % 2) * 4, x + 8, 13);
        g.lineTo(T, 0); g.lineTo(0, 0); g.closePath(); g.fill();
        g.fillStyle = '#7dbb72';
        g.beginPath(); g.roundRect(0, 0, T, 6, 3); g.fill();
        g.fillStyle = '#b6e39a';
        for (let i = 0; i < 4; i++) g.fillRect(5 + i * 11 + v * 2, 2, 3, 2);
      } else if (up) {
        g.fillStyle = this.theme.cap;
        g.beginPath(); g.roundRect(0, 0, T, 6, 2); g.fill();
        g.fillStyle = 'rgba(255,255,255,0.22)';
        g.fillRect(0, 0, T, 2);
        g.fillStyle = 'rgba(0,0,0,0.25)';
        g.fillRect(0, 6, T, 2);
      }
    } else if (type === SLOPE_R || type === SLOPE_L) {
      const R = type === SLOPE_R;
      body(() => { g.beginPath(); g.moveTo(0, T); g.lineTo(T, T); g.lineTo(R ? T : 0, 0); g.closePath(); g.clip(); });
      g.strokeStyle = this.theme.cap; g.lineWidth = 6; g.lineCap = 'butt';
      g.beginPath(); if (R) { g.moveTo(0, T); g.lineTo(T, 0); } else { g.moveTo(0, 0); g.lineTo(T, T); } g.stroke();
      g.strokeStyle = 'rgba(255,255,255,0.2)'; g.lineWidth = 2;
      g.beginPath(); if (R) { g.moveTo(-1, T - 2); g.lineTo(T - 2, -1); } else { g.moveTo(2, -1); g.lineTo(T + 1, T - 2); } g.stroke();
    } else if (type === SPIKE_U || type === SPIKE_D) {
      if (type === SPIKE_D) { g.translate(0, T); g.scale(1, -1); }
      for (let i = 0; i < 3; i++) {
        const x = 2 + i * 15;
        g.fillStyle = '#2a2231';
        g.beginPath(); g.moveTo(x, T); g.lineTo(x + 7, T - 30 - (i % 2) * 4); g.lineTo(x + 14, T); g.closePath(); g.fill();
        g.fillStyle = '#cfc6dd';
        g.beginPath(); g.moveTo(x + 5, T - 20); g.lineTo(x + 7, T - 30 - (i % 2) * 4); g.lineTo(x + 9, T - 20); g.closePath(); g.fill();
      }
    }
    this.tileCache.set(key, c);
    return c;
  }

  // ---------- 그리기 ----------
  draw(w, dt) {
    const ctx = this.ctx, W = this.w, H = this.h, s = this.s, b = w.bulb, t = (this.time += dt), S = this.spr;
    const dead = w.state === 'dead';

    // 카메라: 가는 방향을 조금 앞서 본다
    const tx = b.x + Math.max(-90, Math.min(90, b.vx * 0.28)), ty = b.y - (H / s) * (W < H ? 0.02 : 0.14);
    if (!dead) {
      this.cam.x += (tx - this.cam.x) * Math.min(1, dt * 5);
      this.cam.y += (ty - this.cam.y) * Math.min(1, dt * 4);
    }
    this.clampCam();
    let ox = 0, oy = 0;
    if (this.shake > 0.1) { ox = (Math.random() - 0.5) * this.shake; oy = (Math.random() - 0.5) * this.shake; this.shake *= Math.pow(0.002, dt); } else this.shake = 0;
    const cx = this.cam.x + ox, cy = this.cam.y + oy;
    const vw = W / s, vh = H / s, x0 = cx - vw / 2, y0 = cy - vh / 2, x1 = x0 + vw, y1 = y0 + vh;
    const setT = (c, k = 1) => c.setTransform(s * k, 0, 0, s * k, (W / 2 - cx * s) * k, (H / 2 - cy * s) * k);
    const inView = (x, y, m) => x > x0 - m && x < x1 + m && y > y0 - m && y < y1 + m;

    const on = b.on && !dead;
    this.lightK += ((on ? 1 : 0) - this.lightK) * Math.min(1, dt * 16);
    const flick = b.cracked ? 0.82 + 0.18 * Math.sin(t * 31) * Math.sin(t * 7.3) : 1;

    // --- 1. 하늘 ---
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    const th = this.theme;
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, th.sky[0]); sky.addColorStop(0.62, th.sky[1]); sky.addColorStop(1, th.sky[2]);
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
    this.drawFar(ctx, cx, cy, W, H, t);

    // --- 2. 세계 (제 색) ---
    const wc = this.wctx;
    wc.setTransform(1, 0, 0, 1, 0, 0);
    wc.globalCompositeOperation = 'source-over'; wc.globalAlpha = 1;
    wc.clearRect(0, 0, W, H);
    setT(wc);
    const tx0 = Math.max(0, Math.floor(x0 / T)), tx1 = Math.min(w.W - 1, Math.floor(x1 / T));
    const ty0 = Math.max(0, Math.floor(y0 / T)), ty1 = Math.min(w.H - 1, Math.floor(y1 / T));
    const solidish = (x, y) => {
      if (x < 0 || x >= w.W || y < 0) return true;
      if (y >= w.H) return true;
      const q = w.tiles[y * w.W + x];
      return q === STONE || q === MOSS || q === SLOPE_R || q === SLOPE_L;
    };
    for (let y = ty0; y <= ty1; y++) {
      for (let x = tx0; x <= tx1; x++) {
        const q = w.tiles[y * w.W + x];
        if (!q || q === DAY || q === NIGHT || q === GATE) continue;
        let mask = 0;
        if (q === STONE || q === MOSS) mask = (solidish(x, y - 1) ? 0 : 1) | (solidish(x + 1, y) ? 0 : 2) | (solidish(x, y + 1) ? 0 : 4) | (solidish(x - 1, y) ? 0 : 8);
        wc.drawImage(this.tileSprite(q, mask, (x * 3 + y * 5) % 3), x * T, y * T, T + 0.6, T + 0.6);
      }
    }
    // 화면 밖(스테이지 아래·옆)은 돌로 채운다
    wc.fillStyle = `hsl(${th.stone[0]},${th.stone[1]}%,${th.stone[2] - 6}%)`;
    if (x0 < 0) wc.fillRect(x0 - 2, y0 - 2, -x0 + 2, vh + 4);
    if (x1 > w.W * T) wc.fillRect(w.W * T, y0 - 2, x1 - w.W * T + 2, vh + 4);
    if (y1 > w.H * T) {
      // 스테이지 바닥 아래: 바닥이 돌인 칸 밑으로만 돌을 이어 그린다 (낭떠러지는 비워 둔다)
      for (let x = tx0; x <= tx1; x++) {
        const q = w.tiles[(w.H - 1) * w.W + x];
        if (q === STONE || q === MOSS) wc.fillRect(x * T, w.H * T - 0.5, T + 0.6, y1 - w.H * T + 2);
      }
    }

    for (const q of w.platforms) this.drawPlatform(wc, q);
    for (const k of w.blocks) {
      if (k.a < 0.02 || !inView(k.tx * T + 24, k.ty * T + 24, 60)) continue;
      this.drawBlock(wc, k, t);
    }
    for (const q of w.pads) if (inView(q.x, q.y, 60)) this.drawPad(wc, q);
    for (const L of w.lanterns) if (inView(L.x, L.y, 90)) this.drawLanternPost(wc, L);
    if (w.exit && inView(w.exit.x, w.exit.y, 140)) this.drawSocket(wc, w.exit, w.state === 'clear');
    for (const c of w.cells) if (inView(c.x, c.y, 40)) this.drawCell(wc, c);
    for (const m of w.moths) if (inView(m.x, m.y, 40)) this.drawMoth(wc, m, t);
    for (const sh of w.shadows) if (!sh.dead && inView(sh.x, sh.y, 40)) this.drawShadow(wc, sh, t);

    // --- 3. 실루엣: 같은 그림을 한 가지 어두운 색으로 ---
    const sc = this.sctx;
    sc.setTransform(1, 0, 0, 1, 0, 0);
    sc.globalCompositeOperation = 'source-over';
    sc.clearRect(0, 0, W, H);
    sc.drawImage(this.world, 0, 0);
    sc.globalCompositeOperation = 'source-in';
    sc.fillStyle = '#04060d';
    sc.fillRect(0, 0, W, H);
    ctx.drawImage(this.sil, 0, 0);

    // --- 4. 빛이 닿는 곳만 남긴다 ---
    this.drawMask(w, cx, cy, t, flick);
    wc.setTransform(1, 0, 0, 1, 0, 0);
    wc.globalCompositeOperation = 'destination-in';
    wc.drawImage(this.mask, 0, 0, W, H);
    ctx.drawImage(this.world, 0, 0);

    // --- 5. 스스로 빛나는 것들 ---
    setT(ctx);
    // 낮의 돌과 밤의 돌은 제 빛을 낸다: 어둠 속에서도, 그늘 속에서도 제 색으로 보인다
    for (const k of w.blocks) {
      if (k.kind === 'gate' || k.a < 0.02 || !inView(k.tx * T + 24, k.ty * T + 24, 60)) continue;
      this.drawBlock(ctx, k, t);
    }
    ctx.globalCompositeOperation = 'lighter';
    const spr = (name, x, y, r, a = 1) => { ctx.globalAlpha = a; ctx.drawImage(S[name], x - r, y - r, r * 2, r * 2); };

    // 전구 빛의 따뜻한 색, 빛이 닿는 경계
    if (this.lightK > 0.02) {
      spr(this.skin.glow, b.x, b.y, VIS_R * 0.85, 0.2 * this.lightK * flick);
      ctx.globalAlpha = 0.22 * this.lightK;
      ctx.strokeStyle = `rgb(${this.skin.rgb})`; ctx.lineWidth = 1.5; ctx.setLineDash([3, 9]);
      ctx.beginPath(); ctx.arc(b.x, b.y, P.LIGHT_R, 0, TAU); ctx.stroke();
      ctx.setLineDash([]);
    }

    // 낮의 돌 · 밤의 돌 · 문
    for (const k of w.blocks) {
      const bx = k.tx * T, by = k.ty * T;
      if (!inView(bx + 24, by + 24, 60)) continue;
      if (k.kind === 'gate') {
        if (k.a < 0.5) { ctx.globalAlpha = 0.25; ctx.strokeStyle = '#8fd6ff'; ctx.lineWidth = 1.5; ctx.setLineDash([4, 6]); ctx.strokeRect(bx + 6, by + 2, T - 12, T - 4); ctx.setLineDash([]); }
        continue;
      }
      const day = k.kind === 'day';
      const col = day ? '255,210,120' : '130,160,255';
      if (k.a > 0.05) {
        ctx.globalAlpha = (day ? 0.55 : 0.75) * k.a;
        ctx.strokeStyle = `rgb(${col})`; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.roundRect(bx + 2, by + 2, T - 4, T - 4, 7); ctx.stroke();
        spr(day ? 'gold' : 'blue', bx + 24, by + 24, 30, (day ? 0.16 : 0.3) * k.a);
      }
      if (k.a < 0.95) {
        ctx.globalAlpha = 0.34 * (1 - k.a);
        ctx.strokeStyle = `rgb(${col})`; ctx.lineWidth = 1.5; ctx.setLineDash([4, 7]);
        ctx.beginPath(); ctx.roundRect(bx + 4, by + 4, T - 8, T - 8, 6); ctx.stroke();
        ctx.setLineDash([]);
        this.glyph(ctx, bx + 24, by + 24, day, 0.3 * (1 - k.a));
      }
    }

    // 감지기
    for (const c of w.cells) {
      if (!inView(c.x, c.y, 40)) continue;
      spr(c.lit ? 'cyan' : 'blue', c.x, c.y, c.lit ? 20 : 9, c.lit ? 0.9 : 0.35 + 0.15 * Math.sin(t * 3 + c.x));
    }

    // 빛꽃
    for (const f of w.flowers) {
      if (!inView(f.x, f.y, 50)) continue;
      this.drawFlower(ctx, f, t, spr);
    }

    // 등불
    for (const L of w.lanterns) {
      if (!inView(L.x, L.y, P.LANTERN_R + 40)) continue;
      if (L.lit) {
        const grow = Math.min(1, L.t * 2.5);
        spr('gold', L.x, L.y - 56, 26 + Math.sin(t * 9 + L.x) * 2, 0.95);
        spr('orange', L.x, L.y - 50, P.LANTERN_R * 0.8 * grow, 0.12);
      } else spr('cyan', L.x, L.y - 56, 9, 0.3 + 0.14 * Math.sin(t * 2.4 + L.x));
    }

    // 출구
    if (w.exit && inView(w.exit.x, w.exit.y, 200)) {
      const e = w.exit, done = w.state === 'clear';
      spr('gold', e.x, e.y - 6, done ? 90 : 20 + Math.sin(t * 3) * 3, done ? 0.9 : 0.5);
      ctx.globalAlpha = done ? 0.5 : 0.16 + 0.06 * Math.sin(t * 2);
      ctx.fillStyle = '#ffe2a0';
      ctx.fillRect(e.x - 2, e.y - 260, 4, 250);
    }

    // 그림자의 눈 · 나방
    for (const sh of w.shadows) {
      if (sh.dead || sh.k < 0.3 || !inView(sh.x, sh.y, 40)) continue;
      const look = sh.dir * 2.5, blink = Math.sin(t * 1.3 + sh.t) > 0.98 ? 0.1 : 1;
      spr('violet', sh.x - 5 + look, sh.y - 5, 4.5, blink * sh.k);
      spr('violet', sh.x + 5 + look, sh.y - 5, 4.5, blink * sh.k);
    }
    for (const m of w.moths) {
      if (!inView(m.x, m.y, 40)) continue;
      spr(m.hot ? 'red' : 'pink', m.x, m.y, m.hot ? 13 : 7, m.hot ? 0.8 : 0.35);
    }

    // 고리 · 파티클
    for (let i = this.rings.length - 1; i >= 0; i--) {
      const r = this.rings[i];
      r.life -= dt;
      if (r.life <= 0) { this.rings.splice(i, 1); continue; }
      const k = 1 - r.life / r.max, e = 1 - (1 - k) * (1 - k);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = `rgba(${r.color},${(1 - k) * 0.85})`;
      ctx.lineWidth = r.width * (1 - k * 0.6);
      ctx.beginPath(); ctx.arc(r.x, r.y, Math.max(1, r.r0 + (r.r1 - r.r0) * e), 0, TAU); ctx.stroke();
    }
    const ps = this.parts;
    for (let i = ps.length - 1; i >= 0; i--) {
      const q = ps[i];
      q.life -= dt;
      if (q.life <= 0) { ps[i] = ps[ps.length - 1]; ps.pop(); continue; }
      q.vy += q.grav * dt; q.x += q.vx * dt; q.y += q.vy * dt; q.vx *= 0.95; q.vy *= 0.95;
      const k = q.life / q.max, r = q.size * (0.5 + 0.5 * k);
      ctx.globalAlpha = k;
      ctx.drawImage(S[q.spr], q.x - r, q.y - r, r * 2, r * 2);
    }
    // 빛 속을 떠다니는 먼지
    if (on && !this.lowPerf && Math.random() < dt * 9) {
      const a = Math.random() * TAU, d = Math.random() * P.LIGHT_R * 0.9;
      this.part(b.x + Math.cos(a) * d, b.y + Math.sin(a) * d, (Math.random() - 0.5) * 10, -6 - Math.random() * 10, 1.6, 2.2, this.skin.glow);
    }

    // --- 6. 전구 (언제나 보인다) ---
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    if (!dead) this.drawBulb(ctx, b, t, flick, w.state === 'clear');
    // 깨진 조각
    for (let i = this.shards.length - 1; i >= 0; i--) {
      const q = this.shards[i];
      q.life -= dt;
      if (q.life <= 0) { this.shards.splice(i, 1); continue; }
      q.vy += 900 * dt; q.x += q.vx * dt; q.y += q.vy * dt; q.a += q.va * dt;
      ctx.save();
      ctx.translate(q.x, q.y); ctx.rotate(q.a);
      ctx.globalAlpha = Math.min(1, q.life * 1.6);
      ctx.fillStyle = 'rgba(226,240,255,0.85)';
      ctx.beginPath(); ctx.moveTo(-q.size, -q.size * 0.3); ctx.lineTo(q.size * 0.7, -q.size * 0.6); ctx.lineTo(q.size * 0.2, q.size * 0.7); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
    ctx.globalAlpha = 1;

    // 밤을 삼킨 것
    if (w.boss) this.drawBoss(ctx, w.boss, x0, y0, vw, vh, t, spr);

    // --- 7. 화면 효과 ---
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    ctx.drawImage(S.vignette, 0, 0, W, H);
    this.hurt = Math.max(0, this.hurt - dt);
    const danger = Math.min(1, this.hurt * 1.7 + (b.cracked && !dead ? 0.16 + 0.08 * Math.sin(t * 5) : 0));
    if (danger > 0.01) { ctx.globalAlpha = danger; ctx.drawImage(S.danger, 0, 0, W, H); ctx.globalAlpha = 1; }
    if (this.flash > 0.01) {
      ctx.fillStyle = `rgba(255,244,220,${Math.min(0.8, this.flash)})`;
      ctx.fillRect(0, 0, W, H);
      this.flash *= Math.pow(0.003, dt);
    } else this.flash = 0;
  }

  // 먼 배경: 별과 겹겹의 실루엣
  drawFar(ctx, cx, cy, W, H, t) {
    const dpr = this.dpr, th = this.theme;
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 70; i++) {
      const x = ((hash2(i, 3) * 2400 - cx * 0.05) % 2400 + 2400) % 2400 / 2400 * W * 1.2 - W * 0.1;
      const y = hash2(i, 11) * H * 0.62;
      ctx.globalAlpha = 0.25 + 0.45 * hash2(i, 5) * (0.6 + 0.4 * Math.sin(t * (0.6 + hash2(i, 9)) + i));
      ctx.fillRect(x, y, dpr * (1 + hash2(i, 7)), dpr * (1 + hash2(i, 7)));
    }
    // 달
    ctx.globalAlpha = 0.9;
    const mx = W * 0.78 - cx * 0.02 * this.s, my = H * 0.2, mr = 34 * dpr;
    ctx.fillStyle = '#e7e3d0';
    ctx.beginPath(); ctx.arc(mx, my, mr, 0, TAU); ctx.fill();
    ctx.fillStyle = th.sky[0];
    ctx.beginPath(); ctx.arc(mx + mr * 0.42, my - mr * 0.12, mr * 0.9, 0, TAU); ctx.fill();
    ctx.globalAlpha = 1;
    for (let layer = 0; layer < 2; layer++) {
      const par = 0.12 + layer * 0.14, base = H * (0.6 + layer * 0.1) - (cy - 400) * par * this.s * 0.25;
      ctx.fillStyle = layer ? th.far : th.sky[1];
      ctx.globalAlpha = layer ? 0.95 : 0.6;
      const step = (150 + layer * 60) * dpr, off = (cx * par * this.s) % step;
      for (let x = -step - off; x < W + step; x += step) {
        const i = Math.floor((x + off + cx * par * this.s) / step);
        const hgt = (60 + hash2(i, layer + 2) * 170) * dpr * (layer ? 1 : 0.8);
        const wd = step * (0.35 + hash2(i, layer + 9) * 0.4);
        if (th.name === 'woods') {
          ctx.beginPath(); ctx.moveTo(x, base + 400 * dpr); ctx.lineTo(x + wd / 2, base - hgt); ctx.lineTo(x + wd, base + 400 * dpr); ctx.closePath(); ctx.fill();
        } else if (th.name === 'tower') {
          ctx.fillRect(x, base - hgt, wd * 0.6, hgt + 400 * dpr);
          ctx.beginPath(); ctx.moveTo(x - 4 * dpr, base - hgt); ctx.lineTo(x + wd * 0.3, base - hgt - wd * 0.5); ctx.lineTo(x + wd * 0.6 + 4 * dpr, base - hgt); ctx.closePath(); ctx.fill();
        } else {
          ctx.fillRect(x, base - hgt * 0.5, wd, hgt * 0.5 + 400 * dpr);
          ctx.beginPath(); ctx.arc(x + wd / 2, base - hgt * 0.5, wd / 2, Math.PI, 0); ctx.fill();
        }
      }
    }
    ctx.globalAlpha = 1;
  }

  // 빛이 닿는 영역 (절반 해상도 → 가장자리가 부드럽다)
  drawMask(w, cx, cy, t, flick) {
    const m = this.mctx, MW = this.mask.width, MH = this.mask.height, b = w.bulb, k = this.s * 0.5;
    m.setTransform(1, 0, 0, 1, 0, 0);
    m.globalCompositeOperation = 'source-over'; m.globalAlpha = 1;
    m.clearRect(0, 0, MW, MH);
    m.setTransform(k, 0, 0, k, MW / 2 - cx * k, MH / 2 - cy * k);
    const img = this.spr.light;
    const blob = (x, y, r, a) => { m.globalAlpha = a; m.drawImage(img, x - r, y - r, r * 2, r * 2); };
    const vw = this.w / this.s, vh = this.h / this.s;
    const near = (x, y, mg) => Math.abs(x - cx) < vw / 2 + mg && Math.abs(y - cy) < vh / 2 + mg;

    // 전구: 벽에 가려지는 빛
    if (this.lightK > 0.02 && w.state !== 'dead') {
      const R = VIS_R * (0.3 + 0.7 * this.lightK) * (1 + 0.01 * Math.sin(t * 12));
      const poly = this.visibility(w, b.x, b.y, R);
      m.save();
      m.beginPath();
      for (let i = 0; i < poly.length; i += 2) { if (i) m.lineTo(poly[i], poly[i + 1]); else m.moveTo(poly[i], poly[i + 1]); }
      m.closePath();
      m.clip();
      blob(b.x, b.y, R, this.lightK * flick);
      m.restore();
    }
    // 꺼진 전구도 유리알만큼은 주변을 비춘다
    blob(b.x, b.y, 58, 0.5 * (1 - this.lightK) + 0.2);
    for (const L of w.lanterns) {
      if (L.lit && near(L.x, L.y, P.LANTERN_R)) blob(L.x, L.y - 50, P.LANTERN_R * 1.05 * Math.min(1, L.t * 2.5) * (1 + 0.01 * Math.sin(t * 10 + L.x)), 0.95);
    }
    for (const f of w.flowers) if (f.got && near(f.x, f.y, 80)) blob(f.x, f.y, 62, 0.75);
    if (w.exit && near(w.exit.x, w.exit.y, 200)) blob(w.exit.x, w.exit.y - 10, w.state === 'clear' ? 420 : 70, w.state === 'clear' ? 1 : 0.55);
    for (const r of this.rings) if (r.width >= 5 && r.r1 > r.r0) blob(r.x, r.y, r.r1 * 1.1, 0.7 * (r.life / r.max));
    for (const c of w.cells) if (c.lit && near(c.x, c.y, 40)) blob(c.x, c.y, 34, 0.6);
    m.globalAlpha = 1;
  }

  // (x,y) 에서 반경 R 안에 보이는 영역의 다각형. 선분 끝점마다 광선을 쏘아 가장 가까운 교점을 잇는다.
  visibility(w, x, y, R) {
    const near = [];
    const add = (a, b2, c, d) => {
      if (Math.max(a, c) < x - R || Math.min(a, c) > x + R || Math.max(b2, d) < y - R || Math.min(b2, d) > y + R) return;
      near.push(a, b2, c, d);
    };
    for (const sg of this.segs) add(sg[0], sg[1], sg[2], sg[3]);
    for (const k of w.blocks) {
      if (!k.solid) continue;
      const bx = k.tx * T, by = k.ty * T;
      if (bx > x + R || bx + T < x - R || by > y + R || by + T < y - R) continue;
      // 전구가 올라선 돌은 윗면만 가리게 한다 (자기 발밑이 시커멓게 보이지 않도록 안쪽으로 조금 들인다)
      add(bx, by + 3, bx + T, by + 3); add(bx + T, by + 3, bx + T, by + T); add(bx + T, by + T, bx, by + T); add(bx, by + T, bx, by + 3);
    }
    const angles = [];
    for (let i = 0; i < near.length; i += 2) {
      const a = Math.atan2(near[i + 1] - y, near[i] - x);
      angles.push(a - 0.0007, a, a + 0.0007);
    }
    const N = 28;
    for (let i = 0; i < N; i++) angles.push((i / N) * TAU - Math.PI);
    angles.sort((p, q) => p - q);
    const out = [];
    for (let i = 0; i < angles.length; i++) {
      const a = angles[i], dx = Math.cos(a), dy = Math.sin(a);
      let best = R;
      for (let j = 0; j < near.length; j += 4) {
        const sx = near[j], sy = near[j + 1], ex = near[j + 2] - sx, ey = near[j + 3] - sy;
        const den = dx * ey - dy * ex;
        if (den > -1e-9 && den < 1e-9) continue;
        const tt = ((sx - x) * ey - (sy - y) * ex) / den;
        if (tt < 0 || tt >= best) continue;
        const u = ((sx - x) * dy - (sy - y) * dx) / den;
        if (u >= 0 && u <= 1) best = tt;
      }
      const d = Math.min(R, best + 44); // 돌 속으로 한 칸 가까이 스며들어, 빛을 받은 면의 결이 드러나게
      out.push(x + dx * d, y + dy * d);
    }
    return out;
  }

  // ---------- 개별 그림 ----------
  glyph(ctx, x, y, day, a) {
    ctx.globalAlpha = a;
    ctx.fillStyle = day ? '#ffe2a0' : '#b9ccff';
    ctx.beginPath();
    if (day) {
      ctx.arc(x, y, 5, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#ffe2a0'; ctx.lineWidth = 1.6;
      ctx.beginPath();
      for (let i = 0; i < 8; i++) { const an = (i / 8) * TAU; ctx.moveTo(x + Math.cos(an) * 8, y + Math.sin(an) * 8); ctx.lineTo(x + Math.cos(an) * 11.5, y + Math.sin(an) * 11.5); }
      ctx.stroke();
    } else {
      ctx.arc(x, y, 8, 0.5, TAU - 0.5); ctx.arc(x + 4, y, 6, TAU - 0.9, 0.9, true); ctx.closePath(); ctx.fill();
    }
  }

  drawBlock(c, k, t) {
    const x = k.tx * T, y = k.ty * T, a = k.a;
    c.globalAlpha = a;
    if (k.kind === 'gate') {
      c.fillStyle = '#2b3447';
      c.fillRect(x + 4, y, T - 8, T);
      c.fillStyle = '#8fa2c4';
      for (let i = 0; i < 3; i++) c.fillRect(x + 9 + i * 12, y, 6, T);
      c.fillStyle = '#4e5d7c';
      c.fillRect(x + 4, y + 20, T - 8, 8);
    } else {
      const day = k.kind === 'day';
      const g = c.createLinearGradient(x, y, x, y + T);
      if (day) { g.addColorStop(0, '#ffe7a6'); g.addColorStop(1, '#d89a3c'); } else { g.addColorStop(0, '#5a6fd0'); g.addColorStop(1, '#27306e'); }
      c.fillStyle = g;
      c.beginPath(); c.roundRect(x + 1, y + 1, T - 2, T - 2, 7); c.fill();
      c.fillStyle = day ? 'rgba(255,255,255,0.45)' : 'rgba(190,210,255,0.35)';
      c.beginPath(); c.roundRect(x + 4, y + 3, T - 8, 6, 3); c.fill();
      c.fillStyle = day ? 'rgba(120,70,10,0.35)' : 'rgba(10,14,50,0.45)';
      c.beginPath(); c.roundRect(x + 1, y + T - 9, T - 2, 8, 6); c.fill();
      c.globalAlpha = a * 0.9;
      c.fillStyle = day ? '#8a5a12' : '#dfe8ff';
      c.beginPath();
      if (day) {
        c.arc(x + 24, y + 25, 5, 0, TAU); c.fill();
        c.strokeStyle = '#8a5a12'; c.lineWidth = 1.8; c.beginPath();
        for (let i = 0; i < 8; i++) { const an = (i / 8) * TAU + t * 0.3; c.moveTo(x + 24 + Math.cos(an) * 8, y + 25 + Math.sin(an) * 8); c.lineTo(x + 24 + Math.cos(an) * 11.5, y + 25 + Math.sin(an) * 11.5); }
        c.stroke();
      } else { c.arc(x + 24, y + 25, 8, 0.5, TAU - 0.5); c.arc(x + 28, y + 25, 6, TAU - 0.9, 0.9, true); c.closePath(); c.fill(); }
    }
    c.globalAlpha = 1;
  }

  drawPlatform(c, q) {
    c.fillStyle = '#4a4033';
    c.beginPath(); c.roundRect(q.x, q.y, q.w, q.h, 4); c.fill();
    c.fillStyle = '#8b7654';
    c.beginPath(); c.roundRect(q.x, q.y, q.w, 5, 3); c.fill();
    c.fillStyle = '#c9b48a';
    for (let x = q.x + 8; x < q.x + q.w - 4; x += 22) c.fillRect(x, q.y + 7, 3, 3);
    c.strokeStyle = '#3a3344'; c.lineWidth = 2;
    c.beginPath();
    c.moveTo(q.x + 8, q.y); c.lineTo(q.x + 8, q.y - 600); c.moveTo(q.x + q.w - 8, q.y); c.lineTo(q.x + q.w - 8, q.y - 600);
    c.stroke();
  }

  drawPad(c, q) {
    const sq = Math.max(0, 1 - q.t * 5), h = 16 - sq * 8;
    c.fillStyle = '#e8dcc6';
    c.fillRect(q.x - 5, q.y - h + 2, 10, h - 2);
    c.fillStyle = '#d6577a';
    c.beginPath(); c.ellipse(q.x, q.y - h, 22 + sq * 4, 9 - sq * 3, 0, Math.PI, 0); c.fill();
    c.fillStyle = '#ffd3df';
    c.beginPath(); c.arc(q.x - 9, q.y - h - 3, 2.6, 0, TAU); c.arc(q.x + 6, q.y - h - 5, 3, 0, TAU); c.arc(q.x + 14, q.y - h - 2, 2, 0, TAU); c.fill();
  }

  drawLanternPost(c, L) {
    const x = L.x, y = L.y;
    c.fillStyle = '#1d2330';
    c.beginPath(); c.ellipse(x, y - 1, 9, 4, 0, 0, TAU); c.fill();
    c.fillRect(x - 5, y - 7, 10, 6);
    c.fillStyle = '#2d3646';
    c.fillRect(x - 2.2, y - 50, 4.4, 45);
    c.fillStyle = '#4d5c74';
    c.fillRect(x - 2.2, y - 50, 1.3, 45);
    c.fillStyle = '#1d2330';
    c.fillRect(x - 6, y - 51, 12, 2.4);
    c.fillStyle = L.lit ? '#ffe7a8' : '#343f54';
    c.beginPath(); c.moveTo(x - 7.5, y - 63); c.lineTo(x + 7.5, y - 63); c.lineTo(x + 5.5, y - 51); c.lineTo(x - 5.5, y - 51); c.closePath(); c.fill();
    c.strokeStyle = '#1d2330'; c.lineWidth = 1.4; c.stroke();
    c.fillStyle = '#1d2330';
    c.beginPath(); c.moveTo(x - 10, y - 63); c.lineTo(x, y - 71); c.lineTo(x + 10, y - 63); c.closePath(); c.fill();
  }

  // 출구: 전구가 끼워질 커다란 소켓
  drawSocket(c, e, done) {
    const x = e.x, y = e.y + 30;
    c.fillStyle = '#232a3a';
    c.beginPath(); c.roundRect(x - 26, y - 10, 52, 10, 3); c.fill();
    c.fillStyle = '#39445c';
    c.beginPath(); c.roundRect(x - 19, y - 20, 38, 12, 4); c.fill();
    c.fillStyle = '#8b96b2';
    for (let i = 0; i < 3; i++) c.fillRect(x - 17, y - 19 + i * 4, 34, 1.6);
    c.strokeStyle = '#39445c'; c.lineWidth = 5;
    c.beginPath(); c.arc(x, y - 46, 34, Math.PI * 0.12, Math.PI * 0.88, true); c.stroke();
    c.fillStyle = done ? '#ffe7a8' : '#566282';
    c.beginPath(); c.arc(x - 33, y - 58, 5, 0, TAU); c.arc(x + 33, y - 58, 5, 0, TAU); c.fill();
  }

  drawCell(c, q) {
    c.fillStyle = '#232a3a';
    c.beginPath(); c.roundRect(q.x - 11, q.y - 11, 22, 22, 6); c.fill();
    c.fillStyle = q.lit ? '#c8f1ff' : '#3d4d6e';
    c.beginPath(); c.arc(q.x, q.y, 6.5, 0, TAU); c.fill();
    c.fillStyle = q.lit ? '#ffffff' : '#6d83b0';
    c.beginPath(); c.arc(q.x, q.y, 2.6, 0, TAU); c.fill();
  }

  drawMoth(c, m, t) {
    const flap = Math.sin(t * 34 + m.ph), x = m.x, y = m.y;
    c.fillStyle = m.hot ? '#e9c9c0' : '#a59ab4';
    c.beginPath();
    c.moveTo(x, y); c.lineTo(x - 15, y - 5 - flap * 7); c.lineTo(x - 10, y + 7); c.closePath();
    c.moveTo(x, y); c.lineTo(x + 15, y - 5 - flap * 7); c.lineTo(x + 10, y + 7); c.closePath();
    c.fill();
    c.fillStyle = '#2a2231';
    c.beginPath(); c.ellipse(x, y, 3.4, 7, 0, 0, TAU); c.fill();
  }

  drawShadow(c, sh, t) {
    const x = sh.x, k = sh.k, y = sh.y + 14;
    c.fillStyle = '#0a0713';
    if (k < 0.35) {
      // 빛에 가라앉은 웅덩이
      c.globalAlpha = 0.85;
      c.beginPath(); c.ellipse(x, y - 2, 17, 3.6, 0, 0, TAU); c.fill();
      c.globalAlpha = 1;
      return;
    }
    const h = 28 * k;
    c.beginPath();
    c.moveTo(x - 14, y);
    for (let i = 0; i <= 8; i++) {
      const a = Math.PI + (i / 8) * Math.PI;
      const wob = 1 + 0.12 * Math.sin(t * 5 + sh.t + i * 1.9);
      c.lineTo(x + Math.cos(a) * 14 * wob, y - h * 0.55 + Math.sin(a) * h * 0.5 * wob);
    }
    c.lineTo(x + 14, y); c.closePath(); c.fill();
    c.strokeStyle = '#4b3d6b'; c.lineWidth = 1.5; c.stroke();
  }

  drawFlower(ctx, f, t, spr) {
    const x = f.x, y = f.y;
    if (f.got) {
      spr('gold', x, y, 26 + Math.sin(t * 3 + x) * 2, 0.55);
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#ffe9a8';
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * TAU + t * 0.4;
        ctx.beginPath(); ctx.ellipse(x + Math.cos(a) * 8, y + Math.sin(a) * 8, 6.5, 3.6, a, 0, TAU); ctx.fill();
      }
      ctx.fillStyle = '#fff8dc';
      ctx.beginPath(); ctx.arc(x, y, 4.5, 0, TAU); ctx.fill();
      return;
    }
    // 봉오리: 어둠 속에서도 희미하게 반짝여 위치를 알려 준다
    const p = f.bloom;
    spr('gold', x, y, 9 + p * 16 + Math.sin(t * 4 + x) * 1.5, 0.28 + p * 0.6);
    ctx.globalAlpha = 0.5 + p * 0.5;
    ctx.fillStyle = '#d9c27a';
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TAU, d = 2 + p * 6;
      ctx.beginPath(); ctx.ellipse(x + Math.cos(a) * d, y + Math.sin(a) * d, 3 + p * 3.5, 2.2 + p * 1.4, a, 0, TAU); ctx.fill();
    }
    if (p > 0) {
      ctx.globalAlpha = 0.9; ctx.strokeStyle = '#ffe9a8'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(x, y, 15, -Math.PI / 2, -Math.PI / 2 + TAU * p); ctx.stroke();
    }
  }

  drawBulb(ctx, b, t, flick, seated) {
    const R = P.R, sk = this.skin, on = this.lightK;
    ctx.save();
    ctx.translate(b.x, b.y);
    if (b.inv > 0 && Math.floor(t * 18) % 2 && !seated) ctx.globalAlpha = 0.55;
    // 빛무리
    if (on > 0.02) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.85 * on * flick;
      ctx.drawImage(this.spr[sk.glow], -R * 2.6, -R * 2.6, R * 5.2, R * 5.2);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
    }
    // 이대로 부딪히면 금이 갈 만큼 빠를 때: 붉은 기운으로 알려 준다
    const sp = Math.hypot(b.vx, b.vy);
    if (sp > P.CRACK * 0.92 && !seated) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = Math.min(1, 0.35 + (sp - P.CRACK * 0.92) / 300);
      ctx.drawImage(this.spr.red, -R * 2.2, -R * 2.2, R * 4.4, R * 4.4);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
    }
    ctx.rotate(b.ang);
    // 꼭지쇠 (굴러가는 방향이 보이도록 함께 돈다)
    ctx.fillStyle = '#7d8799';
    ctx.beginPath(); ctx.roundRect(-6.5, R * 0.55, 13, 9.5, 2.5); ctx.fill();
    ctx.fillStyle = '#4b5567';
    ctx.fillRect(-6.5, R * 0.55 + 3, 13, 1.5); ctx.fillRect(-6.5, R * 0.55 + 6, 13, 1.5);
    ctx.fillStyle = '#2f3644';
    ctx.beginPath(); ctx.roundRect(-3.5, R * 0.55 + 8.5, 7, 3, 1.5); ctx.fill();
    // 유리알
    const g = ctx.createRadialGradient(-4, -5, 1, 0, 0, R);
    if (on > 0.5) { g.addColorStop(0, '#ffffff'); g.addColorStop(0.45, sk.glass); g.addColorStop(1, sk.core); }
    else { g.addColorStop(0, 'rgba(210,225,255,0.55)'); g.addColorStop(0.6, 'rgba(110,130,180,0.34)'); g.addColorStop(1, 'rgba(70,86,130,0.5)'); }
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(0, 0, R, 0, TAU); ctx.fill();
    ctx.strokeStyle = on > 0.5 ? 'rgba(255,255,255,0.75)' : 'rgba(190,210,255,0.6)';
    ctx.lineWidth = 1.4; ctx.stroke();
    // 필라멘트
    ctx.strokeStyle = on > 0.5 ? '#ff9a3c' : '#56627e';
    ctx.lineWidth = 1.6; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-4, R * 0.5); ctx.lineTo(-4, 1); ctx.lineTo(-2, -4); ctx.lineTo(0, 1); ctx.lineTo(2, -4); ctx.lineTo(4, 1); ctx.lineTo(4, R * 0.5);
    ctx.stroke();
    // 반짝임
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.beginPath(); ctx.ellipse(-6, -7, 3.4, 1.9, -0.7, 0, TAU); ctx.fill();
    // 금
    if (b.cracked) {
      ctx.strokeStyle = on > 0.5 ? 'rgba(90,50,20,0.9)' : 'rgba(230,240,255,0.9)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-2, -R); ctx.lineTo(1, -8); ctx.lineTo(-4, -3); ctx.lineTo(2, 3); ctx.lineTo(-1, 8);
      ctx.moveTo(1, -8); ctx.lineTo(7, -6); ctx.moveTo(-4, -3); ctx.lineTo(-10, 0);
      ctx.stroke();
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  drawBoss(ctx, boss, x0, y0, vw, vh, t, spr) {
    const bx = boss.x;
    if (bx < x0 - 40) {
      // 화면 밖에서 다가오는 중: 왼쪽 가장자리가 검게 물든다
      const near = 1 - Math.min(1, (x0 - bx) / 700);
      if (near > 0) {
        const g = ctx.createLinearGradient(x0, 0, x0 + 150, 0);
        g.addColorStop(0, `rgba(3,2,8,${0.85 * near})`); g.addColorStop(1, 'rgba(3,2,8,0)');
        ctx.fillStyle = g; ctx.fillRect(x0, y0, 150, vh);
      }
      return;
    }
    const stun = boss.stun > 0;
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#030208';
    ctx.beginPath();
    ctx.moveTo(x0 - 20, y0 - 20);
    ctx.lineTo(bx - 30, y0 - 20);
    const n = 14;
    for (let i = 0; i <= n; i++) {
      const y = y0 - 20 + ((vh + 40) * i) / n;
      const wob = Math.sin(t * 3 + i * 1.7) * 14 + Math.sin(t * 5.3 + i * 0.9) * 8 + (stun ? -26 : 0);
      ctx.lineTo(bx + wob, y);
    }
    ctx.lineTo(x0 - 20, y0 + vh + 20);
    ctx.closePath(); ctx.fill();
    const g = ctx.createLinearGradient(bx - 10, 0, bx + 90, 0);
    g.addColorStop(0, 'rgba(3,2,8,0.85)'); g.addColorStop(1, 'rgba(3,2,8,0)');
    ctx.fillStyle = g; ctx.fillRect(bx - 10, y0, 100, vh);
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 16; i++) {
      const ex = bx - 26 - hash2(i, 4) * 240, ey = y0 + hash2(i, 8) * vh;
      if (ex < x0 - 10) continue;
      const open = stun ? 0.12 : Math.sin(t * (0.7 + hash2(i, 2)) + i * 2.1) > -0.7 ? 1 : 0.1;
      const r = 4 + hash2(i, 6) * 5;
      spr(stun ? 'blue' : 'violet', ex - r * 1.2, ey + Math.sin(t * 2 + i) * 4, r, open);
      spr(stun ? 'blue' : 'violet', ex + r * 1.2, ey + Math.sin(t * 2 + i) * 4, r, open);
    }
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
  }
}
