// 전장 렌더러: 한지 배경, y 정렬된 종이 인형과 지형지물, 장판, 투사체, 이펙트
import { W, H, GRID } from '../config.js';
import { TAU, INK, PAPER, RED, REDD, INDIGO, OCHRE, TEAL, FONT_B, text, ell, rr, rrPath, poly, line, path, st, drawSprite, clamp, lerp } from './draw.js';
import { getLook } from './sprites.js';
import { makeGround, propSprite } from './terrain.js';
import { Fx } from './fx.js';
import { UNITS } from '../data/units.js';
import { icon } from '../ui/ui.js';

const PI = Math.PI;
function swing(p) { if (p < 0.28) return lerp(0, -0.9, p / 0.28); if (p < 0.55) return lerp(-0.9, 1.7, (p - 0.28) / 0.27); return lerp(1.7, 0, (p - 0.55) / 0.45); }

// 종이 인형 한 장: 걷기는 깡충거림과 기울임, 공격은 내지르기와 무기 휘두르기
export function drawUnit(g, u, T, alpha = 1) {
  const L = getLook(u.type), k = L.scale, hold = L.hold, mode = hold.mode;
  const c = Math.cos(u.facing), s = Math.sin(u.facing);
  if (u._dir === undefined) u._dir = u.team === 0 ? 1 : -1;
  if (c > 0.35) u._dir = 1; else if (c < -0.35) u._dir = -1;
  const dir = u._dir, ph = u.walk * 0.26, moving = u.moving && !L.still;
  let hop = moving ? Math.abs(Math.sin(ph)) * 3.2 : 0, tilt = moving ? Math.sin(ph) * 0.085 : Math.sin(T * 2 + u.id) * 0.018;
  if (L.float) hop += 3 + Math.sin(T * 3.2 + u.id) * 2.2;
  if (L.still) { tilt = 0; hop = u.moving ? Math.abs(Math.sin(ph * 1.6)) * 1.2 : 0; }
  const ap = clamp((T - u.atkT) / (mode === 'lob' ? 0.9 : 0.36), 0, 1), act = ap < 1 ? Math.sin(ap * PI) : 0;
  let x = u.x, y = u.y - (u.jumpH || 0), sy = 1;
  if (act > 0) {
    if (mode === 'slash' || mode === 'thrust' || mode === 'bite') { x += c * act * 6 * k; y += s * act * 6 * k; tilt += dir * act * (mode === 'bite' ? 0.2 : 0.12); }
    else if (mode === 'shoot') { x -= c * act * 3 * k; y -= s * act * 3 * k; sy = 1 - act * 0.05; }
    else if (mode === 'cast') { hop += act * 5; tilt += dir * act * 0.08; }
  }
  if (u.stun > 0) x += Math.sin(T * 40 + u.id) * 0.9;
  g.save(); if (alpha < 1) g.globalAlpha = alpha;
  if (L.float || u.jumpH) { g.fillStyle = 'rgba(50,36,20,0.16)'; g.beginPath(); g.ellipse(u.x, u.y + 1, u.r * 0.9, u.r * 0.36, 0, 0, TAU); g.fill(); }
  const by = y - hop * k, fl = u.flash > 0 ? u.flash * 0.85 : 0;
  if (u.root > 0) { for (let i = 0; i < 3; i++) { const a = i / 3 * TAU + u.id; g.beginPath(); g.arc(u.x + Math.cos(a) * u.r * 0.8, u.y - 2 + Math.sin(a) * u.r * 0.35, 5, PI, TAU); st(g, INK, 4); g.beginPath(); g.arc(u.x + Math.cos(a) * u.r * 0.8, u.y - 2 + Math.sin(a) * u.r * 0.35, 5, PI, TAU); st(g, '#5f9a4a', 2); } }
  drawSprite(g, L.front, x, by, dir * k, k * sy, tilt, fl);
  if (L.weapon) {
    const hx0 = hold.x * k * dir, hy0 = hold.y * k, ct = Math.cos(tilt), sn = Math.sin(tilt);
    let hx = x + hx0 * ct - hy0 * sn, hy = by + hx0 * sn + hy0 * ct, rot;
    if (mode === 'thrust') {
      const ready = u.def && u.def.charge && u.run > 60 && u.moving, w = Math.max(act, ready ? 1 : 0), rest = dir * hold.a, aim = u.facing + PI / 2;
      let d = aim - rest; while (d > PI) d -= TAU; while (d < -PI) d += TAU;
      rot = rest + d * w; hx += c * act * 9 * k; hy += s * act * 9 * k;
    } else if (mode === 'cast') rot = dir * (hold.a - act * 0.95) + tilt;
    else if (mode === 'lob') rot = dir * (hold.a + (ap < 0.22 ? lerp(0, 1.7, ap / 0.22) : lerp(1.7, 0, (ap - 0.22) / 0.78)));
    else rot = dir * (hold.a + (ap < 1 ? swing(ap) : 0)) + tilt;
    drawSprite(g, L.weapon, hx, hy, dir * k, k, rot, fl);
  }
  const top = by - L.h * k;
  if (u.barrier > 0) { g.globalAlpha = alpha * 0.5; ell(g, x, by - L.h * k * 0.45, u.r * 1.55, L.h * k * 0.62, 'rgba(160,205,235,0.3)', '#5f8fb8', 2); g.globalAlpha = alpha; }
  if (u.stun > 0) for (let i = 0; i < 3; i++) { const a = T * 6 + i / 3 * TAU; icon.star(g, x + Math.cos(a) * 11 * k, top - 2 + Math.sin(a) * 4, 4.4); }
  if (u.haste > 0 && u.moving) { g.globalAlpha = alpha * 0.7; for (let i = -1; i <= 1; i++) line(g, [u.x - c * (u.r + 6) + i * 5 * -s, u.y - 12 - s * (u.r + 6) + i * 5 * c, u.x - c * (u.r + 18) + i * 5 * -s, u.y - 12 - s * (u.r + 18) + i * 5 * c], RED, 1.8); g.globalAlpha = alpha; }
  if (u.weaken > 0) poly(g, [x - 5, top - 9, x + 5, top - 9, x, top - 1], '#6a4a9a', INK, 1.2);
  if (u.fuse > 0 && Math.sin(T * 50) > 0) { g.globalAlpha = 0.6; ell(g, x, by - 20, u.r * 2, u.r * 2, '#fff'); g.globalAlpha = alpha; }
  if (u.hp < u.maxHp - 0.5 && u.hp > 0 && !(u.def && u.def.boss)) {
    const bw = Math.max(20, u.r * 2.1), bx = x - bw / 2, byy = top - 6;
    rr(g, bx - 1, byy - 1, bw + 2, 5.5, 1.5, PAPER, INK, 1.1); g.fillStyle = u.team === 0 ? INDIGO : RED; g.fillRect(bx, byy, bw * clamp(u.hp / u.maxHp, 0, 1), 3.5);
  }
  if (L.hero && alpha >= 1) icon.flag(g, x - 2, top - 14 + Math.sin(T * 3) * 1.5, 0.75, OCHRE);
  g.restore();
}

const TELE = { boulder: RED, slam: RED, bomb: '#d9702a', root: '#4f8a4a', dark: '#5a4a8a', meteor: '#d9702a' };

export class BattleView {
  constructor(theme, map, seed) {
    this.theme = theme; this.map = map; this.ground = makeGround(theme, map, seed); this.fx = new Fx(); this.dust = 0;
    this.props = (map.obstacles || []).map(o => ({ o, spr: propSprite(o, theme), y: o.kind === 'wall' || o.kind === 'barricade' ? o.y + o.h : o.y + (o.r || 0) * 0.6 }));
  }
  draw(g, b, T, opt = {}) {
    const fx = this.fx;
    g.save();
    if (fx.shake > 0) g.translate((Math.random() - 0.5) * fx.shake, (Math.random() - 0.5) * fx.shake);
    g.drawImage(this.ground, 0, 0, W, H);
    if (opt.deploy) this.drawDeploy(g, opt.deploy, T);
    for (const z of b.zones) this.drawZone(g, z, T);
    for (const c of b.corpses) {
      if (c.revive) { g.globalAlpha = 0.85; path(g, p => { p.moveTo(c.x, c.y - 16); p.quadraticCurveTo(c.x + 7, c.y - 6, c.x + 4, c.y); p.quadraticCurveTo(c.x, c.y + 3, c.x - 4, c.y); p.quadraticCurveTo(c.x - 7, c.y - 6, c.x, c.y - 16); }, '#9fd3e8', INK, 1); g.globalAlpha = 1; g.beginPath(); g.arc(c.x, c.y - 4, 14, -PI / 2, -PI / 2 + TAU * (1 - c.t / 3)); st(g, '#4f8fb8', 2.6); }
      else { g.globalAlpha = clamp(c.t / 3, 0, 0.6); poly(g, [c.x - 7, c.y - 1, c.x - 2, c.y - 5, c.x + 6, c.y - 3, c.x + 8, c.y + 2, c.x - 3, c.y + 4], PAPER, INK, 1); g.globalAlpha = 1; }
    }
    if (opt.rings) for (const r of opt.rings) { g.globalAlpha = 0.9; ell(g, r.x, r.y + 1, r.r * 1.35, r.r * 0.72, r.col + '55', r.col, 2.4); g.globalAlpha = 1; }
    if (opt.orders) this.drawOrders(g, b, T);
    fx.drawLayer(g, true);
    const list = [];
    for (const u of b.units) { if (u.dead || u.hidden > 0) continue; if (opt.skip && opt.skip.has(u.squad)) continue; list.push({ y: u.y, u }); }
    for (const o of this.props) list.push(o);
    if (opt.extra) for (const e of opt.extra) list.push(e);
    list.sort((a, c) => a.y - c.y);
    for (const it of list) { if (it.u) drawUnit(g, it.u, T, it.alpha === undefined ? 1 : it.alpha); else if (it.spr) drawSprite(g, it.spr, it.o.x, it.o.y); }
    this.dust -= opt.dt || 0;
    if (this.dust <= 0) { this.dust = 0.09; for (const u of b.units) if (!u.dead && u.moving && u.def.charge && u.run > 60 && u.hidden <= 0) fx.puff(u.x - Math.cos(u.facing) * 12, u.y - 2, 1, '#e8dcc0', 6); }
    for (const p of b.proj) this.drawProj(g, p, T);
    fx.drawLayer(g, false);
    g.restore();
    if (fx.flash > 0) { g.globalAlpha = fx.flash * 0.45; g.fillStyle = fx.flashCol; g.fillRect(0, 0, W, H); g.globalAlpha = 1; }
  }
  drawDeploy(g, d, T) {
    for (let r = 0; r < GRID.rows; r++) for (let c = 0; c < GRID.cols; c++) {
      const x = GRID.x0 + c * GRID.cw, y = GRID.py0 + r * GRID.ch, hot = d.hot && d.hot.col === c && d.hot.row === r;
      g.globalAlpha = hot ? 0.55 : 0.22 + (d.dragging ? 0.1 : 0); rr(g, x + 4, y + 4, GRID.cw - 8, GRID.ch - 8, 8, hot ? (d.ok ? '#bcd3ea' : '#eab3a6') : PAPER);
      g.globalAlpha = hot ? 1 : 0.5; g.setLineDash(hot ? [] : [7, 6]); g.beginPath(); rrPath(g, x + 4, y + 4, GRID.cw - 8, GRID.ch - 8, 8); st(g, hot ? (d.ok ? INDIGO : RED) : INK, hot ? 3 : 1.4); g.setLineDash([]);
    }
    g.globalAlpha = 1;
  }
  drawZone(g, z, T) {
    if (z.kind === 'tele') {
      const col = TELE[z.style] || RED, k = clamp(z.t / z.delay, 0, 1);
      g.globalAlpha = 0.18; ell(g, z.x, z.y, z.r, z.r, col); g.globalAlpha = 0.3; ell(g, z.x, z.y, z.r * k, z.r * k, col);
      g.globalAlpha = 0.95; g.setLineDash([14, 10]); g.lineDashOffset = -T * 40; g.beginPath(); g.arc(z.x, z.y, z.r, 0, TAU); st(g, col, 4); g.setLineDash([]);
      text(g, '!', z.x, z.y, { size: 40 + Math.sin(T * 14) * 4, font: FONT_B, fill: col, stroke: PAPER, lw: 7 }); g.globalAlpha = 1;
    } else if (z.kind === 'mark') {
      text(g, '!', z.x, z.y - 32, { size: 34 + Math.sin(T * 18) * 4, font: FONT_B, fill: RED, stroke: PAPER, lw: 6 });
      g.beginPath(); g.arc(z.x, z.y, z.r * (1.6 - z.t / z.delay * 0.6), 0, TAU); st(g, RED, 2.4);
    } else if (z.kind === 'spawn') {
      const k = clamp(z.t / z.delay, 0, 1), sap = z.utype === 'sapling';
      g.globalAlpha = 0.45 + k * 0.3; ell(g, z.x, z.y, 16 + k * 4, 9 + k * 2, sap ? '#4f8a4a' : '#3d3560', INK, 1.4); g.globalAlpha = 1;
      if (z.fx !== undefined) { g.globalAlpha = 0.6 * (1 - k); line(g, [z.fx, z.fy - 30, z.x, z.y], '#5a4a8a', 3); g.globalAlpha = 1; }
    } else if (z.kind === 'rain') {
      g.globalAlpha = 0.16; ell(g, z.x, z.y, z.r, z.r, INDIGO); g.globalAlpha = 0.85; g.setLineDash([10, 8]); g.lineDashOffset = T * 30; g.beginPath(); g.arc(z.x, z.y, z.r, 0, TAU); st(g, INDIGO, 2.6); g.setLineDash([]); g.globalAlpha = 1;
    } else if (z.kind === 'grail') {
      const a = z.t > z.dur - 0.5 ? (z.dur - z.t) * 2 : 1;
      g.globalAlpha = 0.26 * a; ell(g, z.x, z.y, z.r, z.r, '#f0d264'); g.globalAlpha = 0.9 * a; g.beginPath(); g.arc(z.x, z.y, z.r, 0, TAU); st(g, '#b8862a', 2.6);
      g.beginPath(); g.arc(z.x, z.y, z.r * (0.3 + (T * 0.6) % 0.7), 0, TAU); g.globalAlpha = 0.45 * a; st(g, '#b8862a', 1.6); g.globalAlpha = 1;
    }
  }
  drawOrders(g, b, T) {
    for (const sq of b.squads) {
      if (sq.team !== 0 || sq.alive <= 0) continue; const o = sq.order;
      if (o.kind === 'move') { g.globalAlpha = 0.7; g.setLineDash([8, 8]); g.lineDashOffset = -T * 30; line(g, [sq.cx, sq.cy, o.x, o.y], INK, 2.4); g.setLineDash([]); g.globalAlpha = 1; icon.flag(g, o.x, o.y - 6, 1); }
      else if (o.kind === 'focus' && o.target && o.target.alive > 0) {
        const t = o.target; g.globalAlpha = 0.55; g.setLineDash([6, 8]); g.lineDashOffset = -T * 30; line(g, [sq.cx, sq.cy, t.cx, t.cy], RED, 2.4); g.setLineDash([]);
        g.globalAlpha = 0.9; const r = 22 + Math.sin(T * 6) * 2; g.beginPath(); g.arc(t.cx, t.cy - 14, r, 0, TAU); st(g, RED, 3);
        for (let i = 0; i < 4; i++) { const a = i / 4 * TAU + T; line(g, [t.cx + Math.cos(a) * (r - 6), t.cy - 14 + Math.sin(a) * (r - 6), t.cx + Math.cos(a) * (r + 6), t.cy - 14 + Math.sin(a) * (r + 6)], RED, 3); }
        g.globalAlpha = 1;
      } else if (o.kind === 'hold') icon.flag(g, sq.cx + 30, sq.cy - 50, 0.8);
    }
  }
  drawProj(g, p, T) {
    if (p.lob) {
      const sh = 1 - Math.min(0.6, (p.h || 0) / 160); g.fillStyle = 'rgba(50,36,20,0.2)'; g.beginPath(); g.ellipse(p.x, p.y, 8 * sh, 4.5 * sh, 0, 0, TAU); g.fill();
      const yy = p.y - (p.h || 0) - 10, vx = (p.tx - p.sx) / p.dur, vy = (p.ty - p.sy) / p.dur - Math.cos(clamp(p.t / p.dur, 0, 1) * PI) * 120, a = Math.atan2(vy, vx);
      g.save(); g.translate(p.x, yy);
      if (p.kind === 'fireball') { g.rotate(T * 9); g.globalAlpha = 0.5; ell(g, 0, 0, 10, 10, '#ff9a2e'); g.globalAlpha = 1; rr(g, -4, -7.5, 8, 15, 1, '#f0d264', INK, 1.1); line(g, [-1.6, -4.5, 1.6, -2, -1.6, 0.6, 1.6, 3], RED, 1.1); }
      else { g.rotate(a); line(g, [-14, 0, 6, 0], INK, 3); line(g, [-14, 0, 6, 0], '#e9d9b0', 1.4); poly(g, [5, -3, 12, 0, 5, 3], RED, INK, 0.9); g.globalAlpha = 0.8; poly(g, [-14, -2.4, -24, 0, -14, 2.4], '#ff9a2e'); g.globalAlpha = 1; }
      g.restore();
    } else {
      const a = p.ang || 0;
      if (p.kind === 'dark') { g.globalAlpha = 0.5; ell(g, p.x - Math.cos(a) * 8, p.y - Math.sin(a) * 8, 5, 5, '#8fd3e8'); g.globalAlpha = 1; ell(g, p.x, p.y, 6, 6, '#3d3560', INK, 1.2); return; }
      if (p.kind === 'stone') { ell(g, p.x, p.y, 4.4, 4, '#a59f8f', INK, 1.2); return; }
      line(g, [p.x - Math.cos(a) * 16, p.y - Math.sin(a) * 16, p.x, p.y], INK, 2.6);
      g.save(); g.translate(p.x, p.y); g.rotate(a); poly(g, [-18, -2.6, -12, 0, -18, 2.6], '#fbf7ec', INK, 0.8); poly(g, [0, -2.2, 5, 0, 0, 2.2], '#e4e8ea', INK, 0.8); g.restore();
    }
  }
  // 시뮬레이션 이벤트 → 이펙트/사운드
  handle(b, sfx) {
    const fx = this.fx;
    for (const e of b.events) {
      switch (e.type) {
        case 'hit':
          if (e.block) { fx.star(e.x, e.y - 18, 9, '#dfe6ee'); sfx('clang'); break; }
          if (e.kind === 'burn') { fx.burst(e.x, e.y - 16, 1, '#ff9a2e', 50, 3); break; }
          if (e.kind === 'melee' || e.kind === 'proj') { fx.burst(e.x, e.y - 16, e.flank ? 4 : 2, e.team === 0 ? '#e4826a' : '#f6d98a', 110); sfx(e.kind === 'proj' ? 'thud' : 'hit'); }
          if (e.flank && Math.random() < 0.34) fx.txt(e.x, e.y - 46, '배후!', '#c8642a', 18, 0.6);
          if (e.big && e.amt >= 60) fx.txt(e.x, e.y - 42, String(Math.round(e.amt)), e.team === 0 ? RED : INK, 20, 0.7);
          break;
        case 'melee': fx.star(e.x, e.y, e.big ? 15 : 10); break;
        case 'death': {
          const L = getLook(e.utype); fx.puff(e.x, e.y - 12, e.boss ? 14 : 5, PAPER, e.boss ? 18 : 10);
          fx.add({ k: 'sprite', x: e.x, y: e.y, spr: L.front, sx: L.scale, sy: L.scale, life: 0.3 });
          if (e.boss) { fx.shake = 16; fx.flash = 1; fx.flashCol = '#fff'; fx.ring(e.x, e.y, 150, INK, 0.7, 8); sfx('boom'); } else sfx('death');
          break;
        }
        case 'shoot': sfx(e.kind === 'fireball' || e.kind === 'dark' ? 'magic' : e.kind === 'shell' ? 'boom' : 'shoot'); if (e.kind === 'shell') { fx.puff(e.x, e.y - 30, 4, '#d9d4c8', 9); fx.shake = Math.max(fx.shake, 3); } break;
        case 'heal': if (!e.quiet && e.fx !== undefined) fx.beam(e.fx, e.fy - 34, e.x, e.y - 16, e.team === 0 ? '#f0d264' : '#e4826a', 0.22, 3); fx.add({ k: 'plus', x: e.x + (Math.random() - 0.5) * 12, y: e.y - 30, vy: -40, life: 0.6, size: 5.5, col: e.team === 0 ? '#5fae6a' : '#e4826a' }); sfx('heal'); break;
        case 'charge': fx.star(e.x, e.y - 14, 24, '#fbf7ec'); fx.ring(e.x, e.y, 46, INK, 0.3, 5); fx.puff(e.x, e.y - 6, 6, '#e8dcc0', 9); fx.txt(e.x, e.y - 52, '돌격!', e.team === 0 ? INDIGO : RED, 24, 0.8); fx.shake = Math.max(fx.shake, 5); sfx('charge'); break;
        case 'impact': {
          const st2 = e.style, col = st2 === 'root' ? '#4f8a4a' : st2 === 'dark' ? '#5a4a8a' : st2 === 'strike' ? INDIGO : '#d9702a';
          fx.ring(e.x, e.y, e.r * 1.25, col, 0.45, 8); fx.ring(e.x, e.y, e.r * 0.8, INK, 0.3, 4);
          fx.burst(e.x, e.y - 8, st2 === 'fireball' ? 8 : 14, st2 === 'root' ? '#9bcf7a' : st2 === 'dark' ? '#b8a0e0' : '#ffb03a', 220, 4.5); fx.puff(e.x, e.y - 6, st2 === 'fireball' ? 4 : 8, st2 === 'root' ? '#cfe6b8' : st2 === 'dark' ? '#d3c6ea' : '#e8dcc0', 13);
          fx.shake = Math.max(fx.shake, st2 === 'fireball' ? 3 : st2 === 'meteor' ? 14 : 8); if (st2 === 'meteor') { fx.flash = 0.7; fx.flashCol = '#ffd9a0'; }
          sfx('boom'); break;
        }
        case 'rainTick': for (let i = 0; i < 9; i++) { const a = Math.random() * TAU, r = Math.sqrt(Math.random()) * e.r, x = e.x + Math.cos(a) * r, y = e.y + Math.sin(a) * r; fx.add({ k: 'arrow', x, y, life: 0.16 + Math.random() * 0.1 }); fx.add({ k: 'stuck', ground: true, x, y, life: 0.9 }); } sfx('rain'); break;
        case 'vanish': fx.puff(e.x, e.y - 14, 7, '#cfe6f0', 11); sfx('leap'); break;
        case 'appear': fx.puff(e.x, e.y - 14, 7, e.summon || e.revive ? '#cfe6f0' : '#f6f1e6', 11); if (!e.summon && !e.revive) { fx.txt(e.x, e.y - 54, '기습!', RED, 22, 0.8); sfx('warn'); } break;
        case 'fuse': fx.txt(e.x, e.y - 60, '화르륵…', '#2f7fa8', 18, 0.5); break;
        case 'lob': fx.add({ k: 'arc', x: e.x, y: e.y - 34, x1: e.tx, y1: e.ty, h: 230, life: e.dur, size: 9, col: '#a59f8f' }); sfx('charge'); break;
        case 'raise': fx.beam(e.fx, e.fy - 40, e.x, e.y, '#8fd3e8', 0.5, 3); sfx('magic'); break;
        case 'warcry': fx.ring(e.x, e.y, 320, RED, 0.8, 10); fx.shake = 10; sfx('boss'); break;
        case 'text': { fx.add({ k: 'text', x: e.x, y: e.y, vy: -30, drag: 1.5, s: e.s, col: e.c || INK, size: e.big ? 30 : 20, life: e.big ? 1.3 : 0.8, big: e.big }); if (e.big) sfx('warn'); break; }
        case 'cast':
          if (e.id === 'grail') { fx.ring(e.x, e.y, e.r * 1.3, '#b8862a', 0.6, 7); sfx('bless'); }
          else if (e.id === 'horn') { sfx('horn'); fx.flash = 0.3; fx.flashCol = '#f6d98a'; }
          else if (e.id === 'sanctuary') { fx.ring(e.x, e.y, 170, '#5f8fb8', 0.6, 8); sfx('bless'); }
          else if (e.id === 'meteor') { fx.add({ k: 'fall', x: e.x, y: e.y, life: 1.1, size: 18, col: '#f0d264', tail: '#ff9a2e' }); sfx('magic'); }
          else if (e.id === 'strike') sfx('leap'); else if (e.id === 'rain') sfx('shoot');
          break;
      }
    }
    b.events.length = 0;
  }
}

// 진형 미리보기(드래그 중)용 임시 인형
export function ghostUnits(type, n, x, y, formation) {
  const def = UNITS[type]; return formation(n).map(([dx, dy], i) => ({ type, def, x: x + dx, y: y + dy, r: def.r, facing: -PI / 2, walk: 0, moving: false, atkT: -9, id: i, flash: 0, hp: 1, maxHp: 1, team: 0, stun: 0, root: 0, haste: 0, weaken: 0, barrier: 0, fuse: 0, run: 0 }));
}
