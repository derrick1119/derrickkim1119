// THE LAMP 2 — 게임 로직 (화면 없이 동작: 브라우저와 tools/ghosts.mjs 가 같이 쓴다)
// 좌표: x 오른쪽, y 아래쪽. 타일 한 칸 = 48.

export const T = 48;

// 모든 조작감·규칙 수치
export const P = {
  R: 16,            // 전구 반지름
  G: 1500,          // 중력
  JUMP: 600,        // 점프 속도 (높이 약 2.5칸)
  JUMP_CUT: 0.45,   // 점프 버튼을 일찍 떼면 남는 속도 비율
  ACC: 1150,        // 땅 위 가속
  AIRACC: 640,
  MAXV: 260,        // 스스로 낼 수 있는 최고 속도 (비탈에서는 더 빨라진다)
  AIRMAX: 240,
  FRIC: 640,        // 손을 떼면 서서히 멈춘다
  DRAG: 220,        // 최고 속도를 넘겼을 때 줄어드는 정도
  TERMINAL: 1400,
  CRACK: 780,       // 이 충격부터 금이 간다 (약 4칸 낙하)
  SHATTER: 1040,    // 이 충격부터 바로 깨진다 (약 7.5칸 낙하)
  MOSS: 0.3,        // 이끼 위 충격 배율
  REST: 0.12,       // 단단한 바닥에서 살짝 튄다
  LIGHT_R: 210,     // 전구 빛이 닿는 거리
  LANTERN_R: 200,   // 켜진 등불이 밝히는 거리
  PADV: 900,        // 튕김 버섯
  MOTH_R: 300,      // 나방이 불빛을 알아채는 거리 (둥지 기준)
  COYOTE: 0.09,
  JUMPBUF: 0.12,
  INV: 1.0,         // 금이 간 직후 잠깐의 무적
  BLOOM: 0.45,      // 빛꽃이 피는 데 걸리는 시간
};

export const TILE = { EMPTY: 0, STONE: 1, MOSS: 2, SLOPE_R: 3, SLOPE_L: 4, DAY: 5, NIGHT: 6, GATE: 7, SPIKE_U: 8, SPIKE_D: 9 };
const { EMPTY, STONE, MOSS, SLOPE_R, SLOPE_L, DAY, NIGHT, GATE, SPIKE_U, SPIKE_D } = TILE;
const SQ = Math.SQRT1_2;

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

export class World {
  constructor(level) {
    this.level = level;
    const rows = level.rows;
    this.H = rows.length;
    this.W = rows.reduce((m, r) => Math.max(m, r.length), 0);
    const W = this.W, H = this.H;
    this.tiles = new Uint8Array(W * H);
    this.dyn = new Int16Array(W * H).fill(-1);
    this.blocks = [];     // 낮돌 · 밤돌 · 문
    this.lanterns = [];
    this.flowers = [];
    this.shadows = [];
    this.moths = [];
    this.pads = [];
    this.cells = [];
    this.platforms = [];
    this.exit = null;
    this.start = { x: T * 1.5, y: T * 2 };
    this.chan = {};
    this.events = [];
    this.input = { ax: 0, jump: false, light: false };
    this.prevJump = false; this.prevLight = false;

    for (let ty = 0; ty < H; ty++) {
      const row = rows[ty];
      for (let tx = 0; tx < W; tx++) {
        const c = row[tx] || '.';
        const i = ty * W + tx, cx = tx * T + T / 2, cy = ty * T + T / 2, by = (ty + 1) * T;
        if (c === '#') this.tiles[i] = STONE;
        else if (c === 'm') this.tiles[i] = MOSS;
        else if (c === '/') this.tiles[i] = SLOPE_R;
        else if (c === '\\') this.tiles[i] = SLOPE_L;
        else if (c === '^') this.tiles[i] = SPIKE_U;
        else if (c === 'v') this.tiles[i] = SPIKE_D;
        else if (c === 'D' || c === 'N') {
          this.tiles[i] = c === 'D' ? DAY : NIGHT;
          this.dyn[i] = this.blocks.length;
          this.blocks.push({ tx, ty, kind: c === 'D' ? 'day' : 'night', ch: '', solid: c === 'N', lantern: false, a: c === 'N' ? 1 : 0 });
        } else if (c === 'A' || c === 'B' || c === 'C') {
          this.tiles[i] = GATE;
          this.dyn[i] = this.blocks.length;
          const ch = c.toLowerCase();
          this.blocks.push({ tx, ty, kind: 'gate', ch, solid: true, lantern: false, a: 1 });
          this.chan[ch] = this.chan[ch] || { open: false, latched: false };
        } else if (c === 'a' || c === 'b' || c === 'c') {
          this.cells.push({ x: cx, y: cy, ch: c, lit: false, lantern: false });
          this.chan[c] = this.chan[c] || { open: false, latched: false };
        } else if (c === 'S') this.start = { x: cx, y: by - P.R };
        else if (c === 'E') this.exit = { x: cx, y: by - 30 };
        else if (c === 'L') this.lanterns.push({ x: cx, y: by, lit: false, t: 0 });
        else if (c === '*') this.flowers.push({ x: cx, y: cy, bloom: 0, got: false });
        else if (c === 's') this.shadows.push({ x: cx, y: by - 14, sx: cx, sy: by - 14, dir: 1, puddle: false, reform: 0, t: tx * 1.7, k: 1, vy: 0, dead: false });
        else if (c === 'w') this.moths.push({ x: cx, y: cy, hx: cx, hy: cy, vx: 0, vy: 0, stun: 0, ph: tx * 2.3 + ty, hot: false });
        else if (c === 'o') this.pads.push({ x: cx, y: by, t: 9 });
      }
    }
    for (const q of level.platforms || []) {
      this.platforms.push({
        bx: q.x * T, by: q.y * T, w: (q.w || 2) * T, h: 14, dx: (q.dx || 0) * T, dy: (q.dy || 0) * T,
        period: q.period || 4, phase: q.phase || 0, dwell: q.dwell ?? 0.12, x: q.x * T, y: q.y * T, vx: 0, vy: 0, mx: 0, my: 0,
      });
    }
    this.latch = new Set(level.latch || []);
    this.boss = level.boss ? { x: -9999, speed: level.boss.speed, stun: 0, t: 0, lead: level.boss.lead || 380 } : null;

    this.bulb = {
      x: this.start.x, y: this.start.y, vx: 0, vy: 0, ang: 0, on: true, cracked: false,
      grounded: false, nx: 0, ny: -1, coyote: 0, jumpBuf: 0, jumping: false, inv: 0, toggleCd: 0, plat: null,
      lastImpact: 0, lightBuf: 0,
    };
    this.checkpoint = { x: this.start.x, y: this.start.y };
    this.state = 'play'; // play | dead | clear
    this.deadT = 0;
    this.time = 0;
    this.breaks = 0;
    this.cracks = 0;
    this.got = 0;
    this.toggles = 0;
    if (this.boss) this.boss.x = this.start.x - this.boss.lead;
    this.updateLight(0);
  }

  emit(type, data) {
    if (this.events.length > 400) return;
    const ev = data || {};
    ev.type = type;
    this.events.push(ev);
  }

  // ---------- 지형 ----------
  tileAt(tx, ty) {
    if (tx < 0 || tx >= this.W || ty < 0) return STONE;
    if (ty >= this.H) return EMPTY;
    return this.tiles[ty * this.W + tx];
  }

  // 충돌 모양: 0 없음, 1 상자, 3·4 비탈
  shapeAt(tx, ty) {
    if (tx < 0 || tx >= this.W || ty < 0) return 1;
    if (ty >= this.H) return 0;
    const i = ty * this.W + tx, t = this.tiles[i];
    if (t === STONE || t === MOSS) return 1;
    if (t === SLOPE_R || t === SLOPE_L) return t;
    if (t === DAY || t === NIGHT || t === GATE) return this.blocks[this.dyn[i]].solid ? 1 : 0;
    return 0;
  }

  // 빛을 막는가 (단단해진 낮돌·밤돌·문도 빛을 막는다)
  opaqueAt(x, y) {
    const tx = Math.floor(x / T), ty = Math.floor(y / T);
    if (tx < 0 || tx >= this.W || ty < 0) return true;
    if (ty >= this.H) return false;
    const i = ty * this.W + tx, t = this.tiles[i];
    if (t === STONE || t === MOSS) return true;
    if (t === SLOPE_R) return (x - tx * T) + (y - ty * T) >= T;
    if (t === SLOPE_L) return (x - tx * T) <= (y - ty * T);
    if (t === GATE || t === DAY || t === NIGHT) return this.blocks[this.dyn[i]].solid;
    return false;
  }

  solidPoint(x, y) { return this.opaqueAt(x, y); }

  los(x0, y0, x1, y1) {
    const dx = x1 - x0, dy = y1 - y0, d = Math.hypot(dx, dy);
    const n = Math.ceil(d / 7);
    for (let i = 1; i < n; i++) {
      const k = i / n;
      if (this.opaqueAt(x0 + dx * k, y0 + dy * k)) return false;
    }
    return true;
  }

  // 전구 빛이 이 점에 실제로 닿는가
  shines(x, y, margin = 0) {
    const b = this.bulb;
    if (!b.on || this.state === 'dead') return false;
    const d = Math.hypot(x - b.x, y - b.y);
    return d < P.LIGHT_R - margin && this.los(b.x, b.y, x, y);
  }

  inLantern(x, y) {
    for (const L of this.lanterns) {
      if (L.lit && Math.hypot(x - L.x, y - (L.y - 50)) < P.LANTERN_R) return true;
    }
    return false;
  }

  // ---------- 한 스텝 ----------
  step(dt) {
    const inp = this.input, b = this.bulb;
    const jumpEdge = inp.jump && !this.prevJump, lightEdge = inp.light && !this.prevLight;
    this.prevJump = inp.jump; this.prevLight = inp.light;

    for (const L of this.lanterns) if (L.lit) L.t += dt;
    for (const q of this.pads) q.t += dt;
    this.movePlatforms(dt);

    if (this.state === 'dead') {
      this.deadT -= dt;
      if (this.deadT <= 0) this.respawn();
      this.updateLight(dt);
      this.updateCreatures(dt);
      return;
    }
    if (this.state === 'clear') {
      // 소켓에 안착
      b.vx *= 0.9; b.vy *= 0.9;
      b.x += (this.exit.x - b.x) * Math.min(1, dt * 6);
      b.y += (this.exit.y - b.y) * Math.min(1, dt * 6);
      this.updateLight(dt);
      return;
    }
    this.time += dt;

    // 빛 스위치
    b.toggleCd -= dt;
    if (lightEdge) b.lightBuf = 0.16; // 조금 일찍 눌러도 놓치지 않는다
    b.lightBuf -= dt;
    if (b.lightBuf > 0 && b.toggleCd <= 0) {
      b.lightBuf = 0;
      b.on = !b.on;
      b.toggleCd = 0.08;
      this.toggles++;
      this.emit('light', { on: b.on, x: b.x, y: b.y });
    }

    // 움직이는 발판 위에 있으면 함께 실려 간다
    // (올라갈 때의 속도는 충돌 처리에서 이미 전해지므로, 옆으로 가거나 내려갈 때만 붙여 준다)
    if (b.plat) { b.x += b.plat.mx; if (b.plat.my > 0) b.y += b.plat.my; }

    // 굴리기
    const ax = clamp(inp.ax, -1, 1);
    if (b.grounded) {
      const tx = -b.ny, ty = b.nx; // 바닥을 따라 오른쪽
      const vt = b.vx * tx + b.vy * ty;
      if (ax !== 0) {
        if (ax * vt < P.MAXV) {
          const dv = Math.min(P.ACC * dt, P.MAXV - ax * vt);
          b.vx += tx * ax * dv; b.vy += ty * ax * dv;
        } else {
          // 비탈에서 얻은 속도는 평지에서 서서히 잦아든다
          const dv = Math.min(ax * vt - P.MAXV, P.DRAG * dt) * ax;
          b.vx -= tx * dv; b.vy -= ty * dv;
        }
      } else if (vt !== 0) {
        const dv = Math.min(Math.abs(vt), P.FRIC * dt) * Math.sign(vt);
        b.vx -= tx * dv; b.vy -= ty * dv;
      }
    } else if (ax !== 0 && ax * b.vx < P.AIRMAX) {
      b.vx += ax * Math.min(P.AIRACC * dt, P.AIRMAX - ax * b.vx);
    }

    // 점프
    if (jumpEdge) b.jumpBuf = P.JUMPBUF;
    b.jumpBuf -= dt;
    b.coyote -= dt;
    if (b.jumpBuf > 0 && b.coyote > 0) {
      b.vy = -P.JUMP;
      if (b.plat) { b.vx += b.plat.vx; b.vy += Math.min(0, b.plat.vy); }
      b.jumping = true; b.grounded = false; b.coyote = 0; b.jumpBuf = 0; b.plat = null;
      this.emit('jump', { x: b.x, y: b.y });
    }
    if (b.jumping) {
      if (b.vy >= 0) b.jumping = false;
      else if (!inp.jump && b.vy < -P.JUMP * P.JUMP_CUT) { b.vy = -P.JUMP * P.JUMP_CUT; b.jumping = false; }
    }

    b.vy += P.G * dt;
    const sp = Math.hypot(b.vx, b.vy);
    if (sp > P.TERMINAL) { b.vx *= P.TERMINAL / sp; b.vy *= P.TERMINAL / sp; }
    b.x += b.vx * dt; b.y += b.vy * dt;
    if (b.inv > 0) b.inv -= dt;

    const hit = this.collide();
    const wasGround = b.grounded;
    b.grounded = hit.ground;
    if (hit.ground) { b.nx = hit.gnx; b.ny = hit.gny; b.coyote = P.COYOTE; b.plat = hit.plat; }
    else { b.plat = null; if (wasGround) { b.nx = 0; b.ny = -1; } }
    b.ang += ((b.grounded ? (b.vx * -b.ny + b.vy * b.nx) : b.vx) / P.R) * dt;

    if (hit.impact > 60) {
      b.lastImpact = hit.dmg;
      this.emit('land', { x: b.x, y: b.y, v: hit.impact, soft: hit.soft < 1, nx: hit.inx, ny: hit.iny });
      if (hit.dmg >= P.SHATTER) this.shatter('impact');
      else if (hit.dmg >= P.CRACK) this.crack(true);
    }
    if (this.state !== 'play') { this.updateLight(dt); return; }

    this.hazards();
    if (this.state === 'play') this.touchables();
    this.updateLight(dt);
    if (this.state === 'play') this.updateCreatures(dt);
  }

  movePlatforms(dt) {
    for (const q of this.platforms) {
      q.phase += dt / q.period;
      // 양 끝에서 잠깐 머문다 (타고 내리기 쉽도록)
      const raw = (1 - Math.cos(q.phase * Math.PI * 2)) / 2;
      const k = clamp((raw - q.dwell) / (1 - 2 * q.dwell), 0, 1);
      const nx = q.bx + q.dx * k, ny = q.by + q.dy * k;
      q.mx = nx - q.x; q.my = ny - q.y;
      q.vx = q.mx / dt; q.vy = q.my / dt;
      q.x = nx; q.y = ny;
    }
  }

  // 원 대 지형. 가장 깊이 박힌 접촉부터 하나씩 푼다 (타일 이음매에서 덜컹거리지 않도록)
  collide() {
    const b = this.bulb, R = P.R;
    const out = { ground: false, gnx: 0, gny: -1, impact: 0, dmg: 0, soft: 1, plat: null, inx: 0, iny: -1 };
    for (let iter = 0; iter < 6; iter++) {
      let bd = 0.0005, bnx = 0, bny = 0, bsoft = 1, bplat = null;
      const tx0 = Math.floor((b.x - R) / T), tx1 = Math.floor((b.x + R) / T);
      const ty0 = Math.floor((b.y - R) / T), ty1 = Math.floor((b.y + R) / T);
      for (let ty = ty0; ty <= ty1; ty++) {
        for (let tx = tx0; tx <= tx1; tx++) {
          const sh = this.shapeAt(tx, ty);
          if (!sh) continue;
          const x0 = tx * T, y0 = ty * T, x1 = x0 + T, y1 = y0 + T;
          let depth, nx, ny;
          if (sh === 1) {
            const px = clamp(b.x, x0, x1), py = clamp(b.y, y0, y1);
            const dx = b.x - px, dy = b.y - py, d2 = dx * dx + dy * dy;
            if (d2 > R * R) continue;
            if (d2 > 1e-9) { const d = Math.sqrt(d2); depth = R - d; nx = dx / d; ny = dy / d; }
            else {
              // 중심이 상자 안: 가장 가까운 면으로 밀어낸다
              const l = b.x - x0, r = x1 - b.x, u = b.y - y0, dn = y1 - b.y, m = Math.min(l, r, u, dn);
              if (m === u) { nx = 0; ny = -1; } else if (m === dn) { nx = 0; ny = 1; } else if (m === l) { nx = -1; ny = 0; } else { nx = 1; ny = 0; }
              depth = m + R;
            }
          } else {
            const lx = b.x - x0, ly = b.y - y0;
            const inside = sh === SLOPE_R ? (lx + ly >= T && lx <= T && ly <= T) : (lx <= ly && lx >= 0 && ly <= T);
            if (inside) {
              const dh = sh === SLOPE_R ? (lx + ly - T) * SQ : (ly - lx) * SQ;
              const ds = sh === SLOPE_R ? T - lx : lx, db = T - ly;
              const m = Math.min(dh, ds, db);
              if (m === dh) { nx = sh === SLOPE_R ? -SQ : SQ; ny = -SQ; } else if (m === db) { nx = 0; ny = 1; } else { nx = sh === SLOPE_R ? 1 : -1; ny = 0; }
              depth = m + R;
            } else {
              // 세 변 가운데 가장 가까운 점
              const ax = x0, ay = y1, bx = x1, by = y1;
              const cx = sh === SLOPE_R ? x1 : x0, cy = y0;
              let best = 1e9, qx = 0, qy = 0;
              const seg = (sx, sy, ex, ey) => {
                const vx = ex - sx, vy = ey - sy;
                const k = clamp(((b.x - sx) * vx + (b.y - sy) * vy) / (vx * vx + vy * vy), 0, 1);
                const px = sx + vx * k, py = sy + vy * k, d2 = (b.x - px) * (b.x - px) + (b.y - py) * (b.y - py);
                if (d2 < best) { best = d2; qx = px; qy = py; }
              };
              seg(ax, ay, bx, by); seg(bx, by, cx, cy); seg(cx, cy, ax, ay);
              if (sh === SLOPE_L) { /* 변 순서만 다를 뿐 같은 세 변 */ }
              if (best > R * R || best < 1e-9) continue;
              const d = Math.sqrt(best);
              depth = R - d; nx = (b.x - qx) / d; ny = (b.y - qy) / d;
            }
          }
          if (depth > bd) {
            bd = depth; bnx = nx; bny = ny; bplat = null;
            bsoft = this.tileAt(tx, ty) === MOSS ? P.MOSS : 1;
          }
        }
      }
      // 발판은 윗면만, 위에서 내려올 때만 받친다 (아래에서는 통과: 끼이는 일이 없다)
      for (const q of this.platforms) {
        if (b.y > q.y + 2 || b.vy - q.vy < -40) continue;
        const px = clamp(b.x, q.x, q.x + q.w);
        const dx = b.x - px, dy = b.y - q.y, d2 = dx * dx + dy * dy;
        if (d2 > R * R || d2 < 1e-9) continue;
        const d = Math.sqrt(d2);
        if (dy / d > -0.5) continue;
        if (R - d > bd) { bd = R - d; bnx = dx / d; bny = dy / d; bplat = q; bsoft = 1; }
      }
      if (bd <= 0.0005) break;
      b.x += bnx * bd; b.y += bny * bd;
      const pvx = bplat ? bplat.vx : 0, pvy = bplat ? bplat.vy : 0;
      const vn = (b.vx - pvx) * bnx + (b.vy - pvy) * bny;
      if (vn < 0) {
        const impact = -vn;
        const e = impact > 300 && bsoft === 1 ? P.REST : 0;
        b.vx -= (1 + e) * vn * bnx; b.vy -= (1 + e) * vn * bny;
        if (impact * bsoft > out.dmg) out.dmg = impact * bsoft;
        if (impact > out.impact) { out.impact = impact; out.soft = bsoft; out.inx = bnx; out.iny = bny; }
      }
      if (bny < -0.5) { out.ground = true; out.gnx = bnx; out.gny = bny; out.plat = bplat; }
    }
    if (b.x < P.R) { b.x = P.R; if (b.vx < 0) b.vx = 0; }
    if (b.x > this.W * T - P.R) { b.x = this.W * T - P.R; if (b.vx > 0) b.vx = 0; }
    return out;
  }

  // ---------- 다치기 ----------
  crack(fromFall) {
    const b = this.bulb;
    if (this.state !== 'play') return;
    if (!fromFall && b.inv > 0) return;
    if (b.cracked) { this.shatter(fromFall ? 'impact' : 'hit'); return; }
    b.cracked = true;
    b.inv = P.INV;
    this.cracks++;
    this.emit('crack', { x: b.x, y: b.y });
  }

  shatter(cause) {
    if (this.state !== 'play') return;
    const b = this.bulb;
    this.state = 'dead';
    this.deadT = 1.15;
    this.breaks++;
    this.emit('shatter', { x: b.x, y: b.y, vx: b.vx, vy: b.vy, cause });
  }

  respawn() {
    const b = this.bulb, c = this.checkpoint;
    b.x = c.x; b.y = c.y; b.vx = 0; b.vy = 0; b.cracked = false; b.on = true;
    b.grounded = false; b.nx = 0; b.ny = -1; b.plat = null; b.inv = 0.6; b.jumping = false; b.coyote = 0; b.jumpBuf = 0;
    for (const s of this.shadows) { s.x = s.sx; s.y = s.sy; s.puddle = false; s.reform = 0; s.dir = 1; s.vy = 0; s.dead = false; s.k = 1; }
    for (const m of this.moths) { m.x = m.hx; m.y = m.hy; m.vx = 0; m.vy = 0; m.stun = 0; }
    if (this.boss) { this.boss.x = c.x - this.boss.lead; this.boss.stun = 1.2; }
    this.state = 'play';
    this.emit('respawn', { x: b.x, y: b.y });
  }

  hazards() {
    const b = this.bulb, R = P.R;
    if (b.y > this.H * T + 160) { this.shatter('fall'); return; }
    const tx0 = Math.floor((b.x - R) / T), tx1 = Math.floor((b.x + R) / T);
    const ty0 = Math.floor((b.y - R) / T), ty1 = Math.floor((b.y + R) / T);
    for (let ty = ty0; ty <= ty1; ty++) {
      for (let tx = tx0; tx <= tx1; tx++) {
        const t = this.tileAt(tx, ty);
        if (t !== SPIKE_U && t !== SPIKE_D) continue;
        const x0 = tx * T + 7, x1 = x0 + T - 14;
        const y0 = t === SPIKE_U ? ty * T + T * 0.45 : ty * T, y1 = t === SPIKE_U ? (ty + 1) * T : ty * T + T * 0.55;
        const px = clamp(b.x, x0, x1), py = clamp(b.y, y0, y1);
        if ((b.x - px) * (b.x - px) + (b.y - py) * (b.y - py) < (R - 3) * (R - 3)) { this.shatter('spike'); return; }
      }
    }
    const boss = this.boss;
    if (boss && b.x - R * 0.4 < boss.x) this.shatter('dark');
  }

  touchables() {
    const b = this.bulb, R = P.R;
    for (const q of this.pads) {
      if (b.vy >= 0 && Math.abs(b.x - q.x) < 22 + R * 0.6 && b.y + R > q.y - 12 && b.y < q.y) {
        b.vy = -P.PADV; b.y = q.y - 12 - R; b.grounded = false; b.coyote = 0; b.jumping = false;
        q.t = 0;
        this.emit('pad', { x: q.x, y: q.y });
      }
    }
    for (const L of this.lanterns) {
      if (!L.lit && b.on && Math.hypot(b.x - L.x, b.y - (L.y - 28)) < 46) this.lightLantern(L);
    }
    const e = this.exit;
    if (e && Math.hypot(b.x - e.x, b.y - e.y) < 38) {
      this.state = 'clear';
      b.on = true;
      this.emit('clear', { x: e.x, y: e.y });
    }
  }

  lightLantern(L) {
    const b = this.bulb;
    L.lit = true; L.t = 0;
    this.checkpoint = { x: L.x, y: L.y - P.R - 0.5 };
    const healed = b.cracked;
    b.cracked = false;
    // 등불은 감지기와 그림자에게만 영향을 준다. 낮의 돌·밤의 돌을 바꾸는 것은 전구 자신의 빛뿐이다
    // (등불이 길을 영영 없애 버려 갇히는 일이 없도록).
    const lx = L.x, ly = L.y - 50;
    for (const c of this.cells) {
      if (Math.hypot(c.x - lx, c.y - ly) < P.LANTERN_R && this.los(lx, ly, c.x, c.y)) c.lantern = true;
    }
    if (this.boss) this.boss.stun = Math.max(this.boss.stun, 2.4);
    this.emit('lantern', { x: L.x, y: L.y, healed });
  }

  // ---------- 빛에 반응하는 것들 ----------
  updateLight(dt) {
    const b = this.bulb, R = P.R;
    const shining = b.on && this.state !== 'dead';

    for (const c of this.cells) c.lit = c.lantern || this.shines(c.x, c.y);
    for (const ch in this.chan) {
      const st = this.chan[ch];
      let open = st.latched;
      if (!open) for (const c of this.cells) if (c.ch === ch && c.lit) { open = true; break; }
      if (open && this.latch.has(ch)) st.latched = true;
      if (open !== st.open) { st.open = open; this.emit('gate', { ch, open }); }
    }

    for (const k of this.blocks) {
      let want;
      if (k.kind === 'gate') want = !this.chan[k.ch].open;
      else {
        const cx = k.tx * T + T / 2, cy = k.ty * T + T / 2;
        let lit = k.lantern;
        if (!lit && shining) {
          const d = Math.hypot(cx - b.x, cy - b.y);
          // 경계에서 깜빡이지 않도록 약간의 여유
          const was = k.kind === 'day' ? k.solid : !k.solid;
          lit = d < P.LIGHT_R + (was ? 8 : 0);
        }
        want = k.kind === 'day' ? lit : !lit;
      }
      if (want && !k.solid) {
        // 전구와 겹친 채로는 굳지 않는다 (끼임 방지)
        const x0 = k.tx * T, y0 = k.ty * T;
        const px = clamp(b.x, x0, x0 + T), py = clamp(b.y, y0, y0 + T);
        const free = this.state === 'dead' || (b.x - px) * (b.x - px) + (b.y - py) * (b.y - py) > (R + 0.5) * (R + 0.5);
        if (free) k.solid = true;
      } else if (!want && k.solid) k.solid = false;
      if (dt > 0) k.a += ((k.solid ? 1 : 0) - k.a) * Math.min(1, dt * 14);
      else k.a = k.solid ? 1 : 0;
    }

    if (this.state !== 'play') return;
    for (const f of this.flowers) {
      if (f.got) continue;
      if (this.shines(f.x, f.y, 4)) {
        f.bloom += dt / P.BLOOM;
        if (f.bloom >= 1) {
          f.got = true; f.bloom = 1;
          this.got++;
          this.emit('bloom', { x: f.x, y: f.y, n: this.got, all: this.got === this.flowers.length });
        }
      } else if (f.bloom > 0) f.bloom = Math.max(0, f.bloom - dt * 2);
    }
  }

  updateCreatures(dt) {
    const b = this.bulb, R = P.R, alive = this.state === 'play';

    // 그림자: 어둠 속에서 걷고, 빛을 받으면 웅덩이로 가라앉는다
    for (const s of this.shadows) {
      if (s.dead) continue;
      s.t += dt;
      // 딛고 선 바닥이 사라지면 떨어진다 — 밤의 돌 위에 있는 그림자에게 빛을 비추면
      if (!this.solidPoint(s.x, s.y + 16)) {
        s.vy += P.G * dt;
        s.y += s.vy * dt;
        const t = this.tileAt(Math.floor(s.x / T), Math.floor((s.y + 8) / T));
        if (t === SPIKE_U || s.y > this.H * T + 80) {
          s.dead = true;
          this.emit('shadowFall', { x: s.x, y: Math.min(s.y, this.H * T) });
        } else if (this.solidPoint(s.x, s.y + 16)) {
          s.y = Math.floor((s.y + 16) / T) * T - 14; s.vy = 0;
        }
        continue;
      }
      s.vy = 0;
      const lit = this.shines(s.x, s.y - 4) || this.inLantern(s.x, s.y);
      if (lit) { if (!s.puddle) this.emit('melt', { x: s.x, y: s.y }); s.puddle = true; s.reform = 1.3; }
      else if (s.puddle) { s.reform -= dt; if (s.reform <= 0) s.puddle = false; }
      s.k += ((s.puddle ? 0 : 1) - s.k) * Math.min(1, dt * 9);
      if (s.puddle) continue;
      const dx = b.x - s.x, dy = b.y - s.y;
      // 제 구역(태어난 곳 주변)을 지키다가, 어둠 속의 전구가 가까이 오면 쫓아온다
      const away = s.x - s.sx;
      const chase = alive && !b.on && Math.abs(dx) < T * 6 && Math.abs(dy) < T * 1.7 && Math.abs(away) < T * 8;
      if (!chase && Math.abs(away) > T * 3.5) s.dir = away > 0 ? -1 : 1;
      const dir = chase ? (dx > 0 ? 1 : -1) : s.dir;
      const speed = chase ? 108 : 52;
      const ahead = s.x + dir * (16 + speed * dt);
      if (this.solidPoint(ahead, s.y - 2) || !this.solidPoint(ahead, s.y + 22)) {
        if (!chase) s.dir = -dir;
      } else {
        s.x += dir * speed * dt;
        s.dir = dir;
      }
      if (alive && Math.hypot(dx, dy) < R + 13 && b.inv <= 0) {
        b.vx = (dx > 0 ? 1 : -1) * 260; b.vy = -330; b.grounded = false; b.plat = null;
        this.emit('bite', { x: s.x, y: s.y });
        this.crack(false);
        if (this.state !== 'play') return;
      }
    }

    // 나방: 불빛을 보면 달려든다
    for (const m of this.moths) {
      const dbx = b.x - m.x, dby = b.y - m.y, db = Math.hypot(dbx, dby);
      const hot = alive && b.on && m.stun <= 0 && Math.hypot(b.x - m.hx, b.y - m.hy) < P.MOTH_R && this.los(m.x, m.y, b.x, b.y);
      if (hot && !m.hot) this.emit('moth', { x: m.x, y: m.y });
      m.hot = hot;
      if (m.stun > 0) m.stun -= dt;
      let tx, ty, sp;
      if (hot) { tx = b.x; ty = b.y; sp = 168; }
      else { tx = m.hx + Math.cos(this.time * 1.7 + m.ph) * 20; ty = m.hy + Math.sin(this.time * 2.3 + m.ph) * 12; sp = 110; }
      const dx = tx - m.x, dy = ty - m.y, d = Math.hypot(dx, dy) || 1;
      const k = Math.min(1, d / 30);
      m.vx += ((dx / d) * sp * k - m.vx) * Math.min(1, dt * 4.5);
      m.vy += ((dy / d) * sp * k - m.vy) * Math.min(1, dt * 4.5);
      m.x += m.vx * dt; m.y += m.vy * dt;
      if (hot && db < R + 9 && b.inv <= 0) {
        m.stun = 2.4; m.vx = -(dbx / (db || 1)) * 240; m.vy = -160;
        this.emit('bite', { x: m.x, y: m.y });
        this.crack(false);
        if (this.state !== 'play') return;
      }
    }

    // 밤을 삼킨 것: 왼쪽에서 밀려오는 어둠
    const boss = this.boss;
    if (boss && alive) {
      boss.t += dt;
      if (boss.stun > 0) boss.stun -= dt;
      else boss.x += boss.speed * dt;
      if (boss.x < b.x - 760) boss.x = b.x - 760;
    }
  }

  get flawless() { return this.breaks === 0 && this.cracks === 0; }
}
