// 전투 장면: 배치 → 전투 → 결과
import { W, H, FIELD, cellAt } from '../config.js';
import { TAU, INK, PAPER, RED, REDD, INDIGO, NAVY, TEAL, OCHRE, SUB, FONT_B, text, textBlock, ell, rr, rrPath, poly, line, st as inkStroke, drawSprite, clamp, easeOutBack } from '../render/draw.js';
import { BattleView, ghostUnits } from '../render/battleview.js';
import { getLook } from '../render/sprites.js';
import { Battle, formation } from '../sim/battle.js';
import { G, meta, save, battleSetup, cap, used, lvlOf, countOf, squadAtCell, unitStats, goldFor } from '../state.js';
import { STAGES, CHAPTERS, MAPS } from '../data/stages.js';
import { UNITS, SKILLS } from '../data/units.js';
import { RELICS } from '../data/relics.js';
import { ui, button, iconBtn, panel, bar, icon, seal, stamp, brushTitle, C, inRect } from '../ui/ui.js';
import { sfx, audio, setMuted } from '../audio.js';
import { nav } from '../nav.js';

const TRAY_Y = 1086, BAR_Y = 1100;
const SKCOL = { rain: RED, grail: '#2f6f5c', horn: '#b8742a', strike: INDIGO, sanctuary: INDIGO, meteor: INDIGO };
export const GRADE = ['', '병', '을', '갑'];
const fmtTime = s => { s = Math.max(0, Math.ceil(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };

// 인형 초상 (카드·정보창용)
export function portrait(g, type, x, y, s, t = 0, bob = false) {
  const L = getLook(type), k = s * L.scale, b = bob ? Math.abs(Math.sin(t * 5)) * 3 * s : 0, h = L.hold;
  drawSprite(g, L.front, x, y - b, k, k);
  if (L.weapon) drawSprite(g, L.weapon, x + h.x * k, y - b + h.y * k, k, k, h.a);
}

export class BattleScene {
  constructor() {
    const r = this.r = G.run; this.st = STAGES[r.stage]; this.ch = CHAPTERS[this.st.ch];
    this.view = new BattleView(this.ch.theme, MAPS[this.st.map], r.stage * 7 + 3);
    this.phase = 'deploy'; this.T = 0; this.speed = 1; this.menu = false; this.slow = 1; this.endT = 0;
    this.sel = null; this.tipOpen = true; this.drag = null; this.scroll = 0; this.order = null; this.aim = null;
    this.toastS = ''; this.toastT = 0; this.banner = 2.6; this.res = null; this.hinted = false; this.fightBanner = 0;
    this.seed = (Math.random() * 1e9) | 0;
    this.rebuild();
    if (this.st.boss) sfx('boss');
  }
  rebuild() { this.b = new Battle(battleSetup(this.seed)); this.hp0 = Math.max(1, this.b.hpSum(0)); this.hp1 = Math.max(1, this.b.hpSum(1)); }
  toast(s, t = 2.2) { this.toastS = s; this.toastT = t; }
  bench() { return this.r.squads.filter(s => !s.placed); }

  // ───────── 배치 단계 ─────────
  updateDeploy(i) {
    if (this.menu || this.banner > 1.6) return;
    const bench = this.bench(), maxScroll = Math.max(0, bench.length * 104 - 536);
    this.scroll = clamp(this.scroll, 0, maxScroll);
    if (i.pressed) {
      if (i.y >= TRAY_Y) { if (i.x < 552 && i.y > 1112) { const s = bench[Math.floor((i.x - 12 + this.scroll) / 104)]; this.drag = { s: s || null, from: 'tray', scroll0: this.scroll, mode: s ? 'pend' : 'scroll' }; } }
      else if (this.infoOpen() && inRect(i, 24, 470, 672, 190)) { /* 정보 패널이 처리 */ }
      else if (i.y > 210) {
        const cell = cellAt(i.x, i.y), s = cell && squadAtCell(cell.col, cell.row);
        if (s) this.drag = { s, from: 'field', mode: 'pend' };
        else { const e = this.b.squadNear(i.x, i.y, 1, 44); if (e) { this.sel = { enemy: true, type: e.type, lvl: e.lvl, n: e.total }; sfx('click'); } else { this.sel = null; this.tipOpen = false; } }
      }
    }
    const d = this.drag;
    if (d && i.down) {
      const dx = i.x - i.px, dy = i.y - i.py;
      if (d.mode === 'pend') { if (d.from === 'tray' && Math.abs(dx) > 14 && Math.abs(dx) > Math.abs(dy) * 1.4 && maxScroll > 0) d.mode = 'scroll'; else if (Math.hypot(dx, dy) > 14) d.mode = 'move'; }
      if (d.mode === 'scroll') this.scroll = clamp(d.scroll0 - dx, 0, maxScroll);
    }
    if (d && i.released) {
      this.drag = null;
      if (d.mode === 'pend' && d.s) { this.sel = { s: d.s }; sfx('click'); }
      else if (d.mode === 'move') this.drop(d.s, i);
    }
  }
  drop(s, i) {
    const def = UNITS[s.type], cell = i.y < TRAY_Y ? cellAt(i.x, i.y) : null;
    if (cell) {
      const o = squadAtCell(cell.col, cell.row);
      if (o && o !== s) {
        if (s.placed) { o.col = s.col; o.row = s.row; }
        else {
          if (UNITS[o.type].hero) { this.toast('영웅의 자리는 바꿀 수 없습니다'); sfx('deny'); return; }
          if (used() - UNITS[o.type].cost + def.cost > cap()) { this.toast('군량이 부족합니다'); sfx('deny'); return; }
          o.placed = false;
        }
      } else if (!s.placed && used() + def.cost > cap()) { this.toast('군량이 부족합니다 — 다른 부대를 빼거나 다음 전투를 기다리세요'); sfx('deny'); return; }
      s.col = cell.col; s.row = cell.row; s.placed = true; sfx('place'); this.sel = { s };
    } else if (i.y >= TRAY_Y && s.placed) {
      if (def.hero) { this.toast('영웅은 반드시 출전합니다'); sfx('deny'); return; }
      s.placed = false; sfx('click'); if (this.sel && this.sel.s === s) this.sel = null;
    } else return;
    this.rebuild(); save();
  }
  startFight() {
    this.seed = (Math.random() * 1e9) | 0; this.rebuild();
    this.phase = 'fight'; this.sel = null; this.drag = null; this.view.fx.clear(); this.banner = 0; this.fightBanner = 1.3; sfx('horn');
  }
  infoOpen() { return this.phase === 'deploy' && (this.sel || this.tipOpen); }

  // ───────── 전투 단계 ─────────
  updateFight(dt, i) {
    const b = this.b, fx = this.view.fx;
    if (!this.menu && !b.over) {
      if (i.pressed && i.y < BAR_Y - 4 && i.y > 200) {
        if (this.aim && this.aim.armed) this.aim.live = true;
        else if (!this.aim) { const sq = b.squadNear(i.x, i.y, 0, 48); if (sq) { this.order = { sq, moved: false, target: null }; sfx('click'); } }
      }
      const o = this.order;
      if (o) {
        if (o.sq.alive <= 0) this.order = null;
        else if (i.down) { if (Math.hypot(i.x - i.px, i.y - i.py) > 24) o.moved = true; o.x = clamp(i.x, FIELD.x0 + 10, FIELD.x1 - 10); o.y = clamp(i.y, FIELD.y0 + 10, FIELD.y1 - 10); o.target = o.moved ? b.squadNear(i.x, i.y, 1, 46) : null; }
        else {
          this.order = null; const sq = o.sq, hy = sq.cy - 76;
          if (!o.moved) { if (sq.order.kind === 'auto') { b.orderHold(sq); fx.txt(sq.cx, hy, '대기!', INDIGO, 26, 0.9); } else { b.orderAuto(sq); fx.txt(sq.cx, hy, '돌격!', RED, 26, 0.9); } sfx('order'); }
          else if (o.target) { b.orderFocus(sq, o.target); fx.txt(o.target.cx, o.target.cy - 76, '집중 공격!', RED, 26, 0.9); sfx('focus'); }
          else if (i.y < BAR_Y) { b.orderMove(sq, o.x, o.y); fx.ring(o.x, o.y, 34, INK, 0.4, 4); sfx('order'); }
          this.hinted = true;
        }
      }
      const a = this.aim;
      if (a) {
        if (!b.canCast(a.id)) this.aim = null;
        else if (a.drag || a.live) { if (!i.down) { if (i.y < BAR_Y - 8 && i.y > 200 && (a.live || i.dragged)) { b.cast(a.id, i.x, i.y); this.aim = null; } else { a.drag = false; a.live = false; a.armed = true; } } }
      }
    }
    const want = (this.order && this.order.moved) || (this.aim && (this.aim.live || (this.aim.drag && i.y < BAR_Y - 8))) ? 0.12 : 1;
    this.slow += (want - this.slow) * Math.min(1, dt * 16);
    if (!this.menu) {
      const ts = this.slow * (b.over ? 0.3 : 1);
      for (let k = 0; k < this.speed; k++) { b.step(dt * ts); this.view.handle(b, sfx); }
      fx.update(dt * Math.max(0.35, ts));
      if (b.over) { this.endT += dt; if (this.endT > 1.4) this.finish(); }
      if (this.r.stage === 0 && !this.hinted && b.time > 2 && this.toastT <= 0) { this.toast('부대를 끌어 명령을 내려보세요! (끄는 동안 시간이 느려집니다)', 5); this.hinted = true; }
    }
  }
  finish() {
    const b = this.b, r = this.r, st = this.st; this.phase = 'result'; this.order = null; this.aim = null;
    r.kills += b.kills; r.lost += b.lost;
    if (b.winner === 0) {
      const c1 = b.lost <= st.starDeaths, c2 = b.time <= st.starTime, grade = 1 + (c1 ? 1 : 0) + (c2 ? 1 : 0), gold = goldFor(grade, st.boss);
      r.gold += gold; r.merit = (r.merit || 0) + grade;
      this.res = { win: true, grade, c1, c2, gold, t: 0, stamped: false };
      meta.best = Math.max(meta.best, r.stage + 1);
      if (r.stage >= STAGES.length - 1) { r.done = true; meta.clears++; } else r.rewardPending = { boss: !!st.boss };
      sfx('win');
    } else { r.crowns--; this.res = { win: false, reason: b.reason, t: 0 }; sfx('lose'); }
    save();
  }

  // ───────── 프레임 ─────────
  frame(g, dt, i) {
    this.T += dt; if (this.banner > 0) this.banner -= dt; if (this.toastT > 0) this.toastT -= dt; if (this.fightBanner > 0) this.fightBanner -= dt;
    if (this.phase === 'deploy') { this.updateDeploy(i); this.view.fx.update(dt); }
    else if (this.phase === 'fight') this.updateFight(dt, i);
    else { this.res.t += dt; this.view.fx.update(dt); }
    const b = this.b, T = this.phase === 'deploy' ? this.T : b.time + (this.res ? this.res.t : 0);
    const opt = { dt, orders: this.phase !== 'deploy' };
    if (this.phase === 'deploy') {
      const d = this.drag, moving = d && d.mode === 'move';
      opt.deploy = { dragging: moving };
      if (moving) {
        const cell = i.y < TRAY_Y ? cellAt(i.x, i.y) : null;
        if (cell) { const o = squadAtCell(cell.col, cell.row), def = UNITS[d.s.type]; let ok = true; if (!d.s.placed) { if (o && o !== d.s) ok = !UNITS[o.type].hero && used() - UNITS[o.type].cost + def.cost <= cap(); else ok = used() + def.cost <= cap(); } opt.deploy.hot = cell; opt.deploy.ok = ok; }
        opt.skip = new Set(b.squads.filter(q => q.team === 0 && q.ref.uid === d.s.uid));
        opt.extra = ghostUnits(d.s.type, countOf(d.s.type), i.x, i.y - 16, formation).map(u => ({ y: u.y + 400, u, alpha: 0.85 }));
      }
      if (this.sel && this.sel.s && this.sel.s.placed) { const q = b.squads.find(q => q.team === 0 && q.ref.uid === this.sel.s.uid); if (q) opt.rings = q.units.map(u => ({ x: u.x, y: u.y, r: u.r, col: '#2f4d7e' })); }
    } else if (this.phase === 'fight') {
      const o = this.order; opt.rings = [];
      if (o) { for (const u of o.sq.units) if (!u.dead) opt.rings.push({ x: u.x, y: u.y, r: u.r, col: '#2f4d7e' }); if (o.target) for (const u of o.target.units) if (!u.dead) opt.rings.push({ x: u.x, y: u.y, r: u.r, col: '#c8402f' }); }
    }
    this.view.draw(g, b, T, opt);
    if (this.phase === 'fight') this.drawOrderArrow(g, i);
    if (this.slow < 0.9 && this.phase === 'fight') { g.globalAlpha = (1 - this.slow) * 0.2; g.fillStyle = NAVY; g.fillRect(0, 0, W, H); g.globalAlpha = 1; }
    this.drawHud(g, b);
    if (this.phase === 'deploy') this.drawDeployUI(g, i); else this.drawBar(g, b, i);
    this.drawOverlays(g, b);
  }
  drawOrderArrow(g, i) {
    const o = this.order, a = this.aim, T = this.T;
    if (o && o.moved) {
      const sq = o.sq, col = o.target ? RED : PAPER;
      const tx = o.target ? o.target.cx : o.x, ty = o.target ? o.target.cy - 12 : o.y;
      const dx = tx - sq.cx, dy = ty - sq.cy, d = Math.hypot(dx, dy) || 1, ux = dx / d, uy = dy / d;
      line(g, [sq.cx, sq.cy - 10, tx - ux * 20, ty - uy * 20], INK, 10); line(g, [sq.cx, sq.cy - 10, tx - ux * 20, ty - uy * 20], col, 5);
      poly(g, [tx, ty, tx - ux * 26 - uy * 15, ty - uy * 26 + ux * 15, tx - ux * 26 + uy * 15, ty - uy * 26 - ux * 15], col, INK, 2.4);
      if (!o.target) { icon.flag(g, o.x + 4, o.y - 26, 1.3); text(g, '이동 후 대기', o.x, o.y + 30, { size: 22, font: FONT_B, stroke: PAPER, lw: 6 }); }
      else text(g, '집중 공격', tx, ty - 62, { size: 24, font: FONT_B, fill: RED, stroke: PAPER, lw: 6 });
    }
    if (a && (a.live || a.drag) && i.y < BAR_Y - 8) {
      const s = SKILLS[a.id], r = s.r * (a.id === 'grail' ? this.b.mods.grailR : 1), col = a.id === 'grail' || a.id === 'sanctuary' ? '#b8862a' : a.id === 'rain' ? INDIGO : '#d9702a';
      g.globalAlpha = 0.22; ell(g, i.x, i.y, r, r, col); g.globalAlpha = 1;
      g.setLineDash([12, 8]); g.lineDashOffset = -T * 40; g.beginPath(); g.arc(i.x, i.y, r, 0, TAU); inkStroke(g, col, 3.4); g.setLineDash([]);
      seal(g, i.x, i.y, 46, s.ch, SKCOL[a.id]); text(g, s.name, i.x, i.y - r - 20, { size: 26, font: FONT_B, stroke: PAPER, lw: 6 });
    } else if (a && a.armed) text(g, `${SKILLS[a.id].name} — 쓸 자리를 터치하세요`, 360, 1062, { size: 26, font: FONT_B, stroke: PAPER, lw: 6 });
  }

  // ───────── 머리 띠 ─────────
  drawHud(g, b) {
    const r = this.r, st = this.st, fight = this.phase !== 'deploy';
    g.fillStyle = NAVY; g.fillRect(0, 0, W, 104); g.fillStyle = OCHRE; g.fillRect(0, 104, W, 3);
    const p = fight ? b.hpSum(0) / this.hp0 : 1, e = fight ? b.hpSum(1) / this.hp1 : 1;
    icon.banner(g, 34, 54, '#3f6ea8'); text(g, String(b.count(0)), 78, 40, { size: 40, font: FONT_B, fill: C.cream, align: 'left' }); text(g, '아군', 136, 44, { size: 17, fill: '#8fb6e6', align: 'left' }); bar(g, 78, 68, 190, 14, p, '#8fb6e6');
    icon.banner(g, 686, 54, '#b8442f', true); text(g, String(b.count(1) + b.pending), 642, 40, { size: 40, font: FONT_B, fill: C.cream, align: 'right' }); text(g, '요괴', 584, 44, { size: 17, fill: '#e4826a', align: 'right' }); bar(g, 452, 68, 190, 14, e, '#e4826a', { right: true });
    const left = fight ? b.timeLimit - b.time : st.time, low = fight && left < 15;
    ell(g, 360, 62, 58, 58, PAPER, INK, 4); g.beginPath(); g.arc(360, 62, 49, 0, TAU); inkStroke(g, INK + '66', 1.6);
    text(g, fmtTime(left), 360, 56, { size: 38, font: FONT_B, fill: low ? RED : INK }); text(g, `${st.id} 고개`, 360, 91, { size: 15, fill: SUB });
    // 둘째 줄: 남은 깃발, 전공 조건, 버튼
    for (let k = 0; k < 3; k++) icon.flag(g, 22 + k * 26, 136, 0.95, k < r.crowns ? RED : '#c9c2b0');
    const lost = fight ? b.lost : 0, tt = fight ? b.time : 0;
    [[`손실 ${lost}/${st.starDeaths}`, lost <= st.starDeaths], [`${st.starTime}초 안에`, tt <= st.starTime]].forEach(([s, ok], n) => {
      const x = 104 + n * 150; g.globalAlpha = ok ? 1 : 0.55; panel(g, x, 116, 140, 34, 'tag'); icon.check(g, x + 20, 133, 0.8, ok); text(g, s, x + 80, 134, { size: 17, fill: ok ? INK : '#8f897a', maxW: 100 }); g.globalAlpha = 1;
    });
    if (fight) { if (iconBtn(g, 'speed', 560, 114, 66, 38, (gg, x, y) => text(gg, '×' + this.speed, x, y + 1, { size: 24, font: FONT_B, fill: this.speed > 1 ? RED : INK }), { on: this.speed > 1 })) this.speed = this.speed === 1 ? 2 : 1; }
    else { panel(g, 446, 116, 180, 34, 'tag'); icon.coin(g, 466, 133, 11); text(g, `엽전 ${r.gold}`, 544, 134, { size: 17, maxW: 130 }); }
    if (iconBtn(g, 'menu', 638, 114, 66, 38, icon.menu)) this.menu = true;
    const boss = b.units.find(u => !u.dead && u.def.boss);
    if (boss) { rr(g, 110, 160, 500, 34, 8, PAPER, INK, 2); text(g, boss.def.name, 126, 178, { size: 20, font: FONT_B, fill: RED, align: 'left', maxW: 110 }); bar(g, 246, 168, 354, 18, boss.hp / boss.maxHp, RED, { back: '#d9cdb0' }); }
  }
  drawCard(g, s, x, y, dragging) {
    const d = UNITS[s.type], w = 98, h = 150;
    if (dragging) g.globalAlpha = 0.35;
    rr(g, x + 2, y + 4, w, h, 6, 'rgba(50,36,20,0.25)'); rr(g, x, y, w, h, 6, PAPER, INK, 2.4);
    g.save(); g.beginPath(); rrPath(g, x + 2, y + 2, w - 4, 86, 5); g.clip(); g.fillStyle = d.hero ? '#f0dfae' : '#e4dcc0'; g.fillRect(x, y, w, 90); g.fillStyle = '#a9b78f'; g.globalAlpha *= 0.6; g.fillRect(x, y + 66, w, 24); g.globalAlpha /= 0.6; portrait(g, s.type, x + w / 2, y + 82, d.hero ? 1.0 : 1.1, this.T); g.restore();
    line(g, [x + 2, y + 89, x + w - 2, y + 89], INK, 1.8);
    text(g, d.name, x + w / 2, y + 107, { size: 19, font: FONT_B, maxW: w - 10 });
    icon.sack(g, x + 20, y + 131, 0.75); text(g, String(d.cost), x + 36, y + 133, { size: 19, align: 'left' }); text(g, `${countOf(s.type)}명`, x + w - 8, y + 133, { size: 16, fill: SUB, align: 'right' });
    rr(g, x + 5, y + 5, 38, 20, 4, NAVY); text(g, `Lv${lvlOf(s.type)}`, x + 24, y + 16, { size: 13, fill: '#f0d99a' });
    g.globalAlpha = 1;
  }
  drawDeployUI(g, i) {
    const bench = this.bench(), d = this.drag;
    for (const q of this.b.squads) if (q.team === 0 && q.ref.hold && !(d && d.mode === 'move' && d.s.uid === q.ref.uid)) icon.flag(g, q.cx + 34, q.cy - 46, 0.9);
    panel(g, 0, TRAY_Y, W, H - TRAY_Y, 'tray');
    const u = used(), c = cap();
    icon.sack(g, 26, TRAY_Y + 23, 0.9); text(g, `군량 ${u} / ${c}`, 44, TRAY_Y + 25, { size: 20, align: 'left', fill: u >= c ? RED : INK });
    text(g, bench.length ? '패를 끌어 배치 · 부대를 탭하면 정보' : '부대를 끌어 자리를 바꿀 수 있습니다', 168, TRAY_Y + 25, { size: 17, align: 'left', fill: SUB, maxW: 380 });
    g.save(); g.beginPath(); g.rect(6, TRAY_Y + 38, 544, 160); g.clip();
    bench.forEach((s, n) => { const x = 12 + n * 104 - this.scroll; if (x > -110 && x < 560) this.drawCard(g, s, x, 1124, d && d.mode === 'move' && d.s === s); });
    if (!bench.length) text(g, '모든 부대 출전 준비 완료', 278, 1198, { size: 26, font: FONT_B, fill: SUB });
    g.restore();
    if (bench.length * 104 > 540) { g.fillStyle = 'rgba(38,42,54,0.2)'; g.fillRect(12, 1276, 532, 3); g.fillStyle = INK; g.fillRect(12 + this.scroll / (bench.length * 104) * 532, 1276, 532 * 536 / (bench.length * 104), 3); }
    const pulse = 1 + Math.sin(this.T * 5) * 0.012;
    g.save(); g.translate(636, 1198); g.scale(pulse, pulse); g.translate(-636, -1198);
    if (button(g, 'fight', 562, 1130, 148, 132, '', { style: 'indigo', r: 20 })) this.startFight();
    text(g, '출정', 636, 1184, { size: 50, font: FONT_B, fill: C.cream }); text(g, '전투 시작', 636, 1232, { size: 17, fill: '#f0d99a' });
    g.restore();
    this.drawInfo(g);
    if (!this.infoOpen() && iconBtn(g, 'tip', 652, 162, 52, 44, (gg, x, y) => text(gg, '?', x, y + 1, { size: 30, font: FONT_B }))) { this.tipOpen = true; this.sel = null; }
  }
  drawInfo(g) {
    if (!this.infoOpen()) return;
    const x = 24, y = 472, w = 672, h = 186, sel = this.sel;
    panel(g, x, y, w, h);
    if (!sel) {
      const stg = this.st;
      rr(g, x + 18, y + 18, 96, 32, 6, stg.boss ? RED : INDIGO); text(g, stg.boss ? '두목' : `${stg.id} 고개`, x + 66, y + 35, { size: 18, fill: C.cream });
      text(g, stg.name, x + 126, y + 35, { size: 30, font: FONT_B, align: 'left', maxW: 380 });
      text(g, stg.enemyName, x + w - 22, y + 37, { size: 17, fill: RED, align: 'right', maxW: 150 });
      textBlock(g, stg.tip, x + 22, y + 76, w - 200, 27, { size: 19, align: 'left', weight: 400 });
      (stg.intro || []).slice(0, 2).forEach((t, n) => { const px = x + w - 62 - n * 80; rr(g, px - 36, y + 58, 72, 96, 5, '#efe2c4', INK, 1.6); g.save(); g.beginPath(); g.rect(px - 35, y + 59, 70, 94); g.clip(); portrait(g, t, px, y + 148, UNITS[t].boss ? 0.6 : 1.15, this.T); g.restore(); });
      text(g, '요괴 부대를 탭하면 정보를 볼 수 있습니다', x + 22, y + h - 24, { size: 16, align: 'left', fill: SUB, weight: 400 });
      return;
    }
    const type = sel.enemy ? sel.type : sel.s.type, d = UNITS[type], lvl = sel.enemy ? sel.lvl : lvlOf(type), stt = unitStats(type, lvl), n = sel.enemy ? sel.n : stt.n;
    rr(g, x + 18, y + 18, 108, h - 36, 5, sel.enemy ? '#efd9cf' : '#dbe3ea', INK, 1.6);
    g.save(); g.beginPath(); g.rect(x + 19, y + 19, 106, h - 38); g.clip(); portrait(g, type, x + 72, y + 152, d.boss ? 0.95 : 1.9, this.T, true); g.restore();
    text(g, d.name, x + 142, y + 38, { size: 32, font: FONT_B, fill: sel.enemy ? RED : INK, align: 'left' });
    const nw = (g.font = `32px ${FONT_B}`, g.measureText(d.name).width);
    rr(g, x + 152 + nw, y + 24, 56, 26, 5, NAVY); text(g, `Lv${lvl}`, x + 180 + nw, y + 38, { size: 16, fill: '#f0d99a' });
    rr(g, x + 216 + nw, y + 24, 72, 26, 5, sel.enemy ? RED : INDIGO); text(g, d.role, x + 252 + nw, y + 38, { size: 16, fill: C.cream });
    const stats = [`체력 ${stt.hp}`, `${d.heal ? '치유' : '공격'} ${stt.atk}`, `${n}명`]; if (!sel.enemy) stats.push(`군량 ${d.cost}`);
    text(g, stats.join('  ·  '), x + 142, y + 74, { size: 19, align: 'left', fill: SUB });
    textBlock(g, d.tip, x + 142, y + 106, sel.enemy ? w - 166 : w - 336, 25, { size: 18, align: 'left', weight: 400 });
    if (!sel.enemy) {
      const s = sel.s;
      text(g, '시작 명령', x + w - 96, y + 74, { size: 17, fill: SUB });
      if (button(g, 'stance', x + w - 174, y + 92, 156, 70, s.hold ? '대기' : '돌격', { style: s.hold ? 'indigo' : 'red', size: 34 })) { s.hold = !s.hold; this.rebuild(); save(); }
    }
  }
  skillBtn(g, id, cx, cy, sz, b, i) {
    const s = SKILLS[id], can = b.canCast(id), armed = this.aim && this.aim.id === id, x = cx - sz / 2, y = cy - sz / 2;
    if (i.pressed && inRect(i, x, y, sz, sz) && !this.menu && this.phase === 'fight' && !b.over) {
      if (!can) { sfx('deny'); this.toast(s.hero ? (b.hero() ? '영웅기를 준비하는 중입니다' : '영웅이 쓰러졌습니다') : '사기가 부족합니다', 1.2); }
      else if (!s.target) b.cast(id);
      else if (armed) this.aim = null;
      else { this.aim = { id, drag: true, armed: false, live: false }; this.order = null; sfx('click'); }
    }
    const oy = armed ? -6 : 0;
    if (armed) rr(g, x - 6, y - 6 + oy, sz + 12, sz + 12, sz * 0.2, null, OCHRE, 4);
    g.save(); if (!can) g.globalAlpha = 0.6;
    seal(g, cx, cy + oy, sz, s.ch, can ? SKCOL[id] : '#8f897a', { k: 0.5, dy: -13 });
    text(g, s.name, cx, cy + oy + sz * 0.3, { size: 16, fill: C.cream, maxW: sz - 12 });
    g.restore();
    if (s.hero) {
      if (!b.hero()) text(g, '쓰러짐', cx, cy - 4, { size: 20, font: FONT_B, fill: C.cream, stroke: INK, lw: 5 });
      else if (b.heroCd > 0) { const f = clamp(b.heroCd / (s.cd * b.mods.heroCd), 0, 1); g.save(); g.beginPath(); rrPath(g, x, y, sz, sz, sz * 0.16); g.clip(); g.fillStyle = 'rgba(30,24,30,0.5)'; g.beginPath(); g.moveTo(cx, cy); g.arc(cx, cy, sz, -Math.PI / 2, -Math.PI / 2 + TAU * f); g.closePath(); g.fill(); g.restore(); text(g, String(Math.ceil(b.heroCd)), cx, cy - 6, { size: 38, font: FONT_B, fill: C.cream, stroke: INK, lw: 6 }); }
    }
    ell(g, x + 6, y + 6 + oy, 15, 15, PAPER, INK, 2); text(g, s.hero ? '영' : String(b.costOf(id)), x + 6, y + 7 + oy, { size: 18, font: FONT_B });
  }
  drawBar(g, b, i) {
    panel(g, 0, BAR_Y, W, H - BAR_Y, 'tray');
    text(g, '사기', 30, 1134, { size: 22, font: FONT_B, align: 'left' });
    for (let k = 0; k < 10; k++) { const f = clamp(b.morale - k, 0, 1); icon.coin(g, 96 + k * 34, 1133, 13, f >= 1); if (f > 0 && f < 1) { g.save(); g.beginPath(); g.rect(96 + k * 34 - 13, 1133 + 13 - 26 * f, 26, 26 * f); g.clip(); icon.coin(g, 96 + k * 34, 1133, 13, true); g.restore(); } }
    const ids = ['rain', 'grail', 'horn']; if (b.heroSkill) ids.push(b.heroSkill);
    ids.forEach((id, n) => this.skillBtn(g, id, 76 + n * 126, 1212, 104, b, i));
    const live = this.phase === 'fight' && !b.over && !this.menu, mine = b.squads.filter(q => q.team === 0 && q.alive > 0);
    if (button(g, 'allhold', 574, 1124, 132, 62, '전군 대기', { style: 'navy', size: 24, r: 10 }) && live) { for (const q of mine) b.orderHold(q); this.view.fx.txt(360, 640, '전군 대기!', INDIGO, 38, 1); sfx('order'); }
    if (button(g, 'allgo', 574, 1200, 132, 62, '전군 돌격', { style: 'red', size: 24, r: 10 }) && live) { for (const q of mine) b.orderAuto(q); this.view.fx.txt(360, 640, '전군 돌격!', RED, 38, 1); sfx('horn'); }
  }
  drawOverlays(g, b) {
    const st = this.st;
    if (this.banner > 0 && this.phase === 'deploy') {
      const k = clamp(this.banner > 2.2 ? (2.6 - this.banner) / 0.4 : this.banner < 0.4 ? this.banner / 0.4 : 1, 0, 1);
      g.save(); g.globalAlpha = k; g.fillStyle = 'rgba(248,240,220,0.9)'; g.fillRect(0, 292, W, 256); g.fillStyle = INK; g.fillRect(0, 290, W, 3); g.fillRect(0, 546, W, 3);
      g.translate(0, (1 - easeOutBack(k)) * -30);
      text(g, this.ch.name, 360, 340, { size: 26, fill: SUB });
      brushTitle(g, 360, 418, 470, 88, st.name, st.boss ? RED : INDIGO, 46);
      text(g, st.boss ? '두목과의 싸움' : this.ch.sub, 360, 504, { size: 22, fill: SUB });
      g.restore();
    }
    if (this.fightBanner > 0) { const k = clamp(this.fightBanner / 0.3, 0, 1), s = 1 + (1 - k) * 0.6; g.save(); g.globalAlpha = k; g.translate(360, 560); g.scale(s, s); text(g, '전투 개시!', 0, 0, { size: 84, font: FONT_B, fill: INK, stroke: PAPER, lw: 14 }); g.restore(); }
    if (this.toastT > 0) { g.globalAlpha = clamp(this.toastT / 0.3, 0, 1); const y = this.phase === 'deploy' ? 700 : 232; rr(g, 40, y - 26, 640, 52, 26, PAPER, INK, 2.4); text(g, this.toastS, 360, y + 1, { size: 20, maxW: 606 }); g.globalAlpha = 1; }
    if (this.phase === 'result') this.drawResult(g, b);
    if (this.menu) this.drawMenu(g);
  }
  drawResult(g, b) {
    const R = this.res, st = this.st, r = this.r, t = R.t;
    g.fillStyle = `rgba(31,42,68,${clamp(t * 2, 0, 0.5)})`; g.fillRect(0, 0, W, H);
    const k = easeOutBack(clamp(t / 0.35, 0, 1));
    g.save(); g.translate(360, 620); g.scale(k, k); g.translate(-360, -620);
    if (R.win) {
      panel(g, 70, 350, 580, 560);
      brushTitle(g, 360, 352, 330, 84, '승전', INDIGO, 54);
      text(g, '전공', 226, 478, { size: 30, font: FONT_B, fill: SUB }); text(g, '등급', 226, 516, { size: 22, fill: SUB });
      if (t > 0.6) { const kk = clamp((t - 0.6) / 0.16, 0, 1), sc = 2.2 - 1.2 * kk; if (!R.stamped && kk >= 1) { R.stamped = true; sfx('star'); this.view.fx.shake = 6; } g.save(); g.globalAlpha = kk; g.translate(400, 496); g.scale(sc, sc); stamp(g, 0, 0, 68, GRADE[R.grade], RED); g.restore(); }
      [[`손실 ${st.starDeaths}명 이하  (${b.lost}명)`, R.c1], [`${st.starTime}초 안에 섬멸  (${Math.ceil(b.time)}초)`, R.c2]].forEach(([s, ok], n) => { const y = 620 + n * 46; icon.check(g, 138, y, 1.1, ok); text(g, s, 168, y + 1, { size: 22, align: 'left', fill: ok ? INK : '#a9a394' }); });
      rr(g, 220, 724, 280, 56, 28, '#efe2c4', INK, 2); icon.coin(g, 268, 752, 18); text(g, `엽전 + ${R.gold}`, 384, 753, { size: 28, font: FONT_B });
      g.restore();
      if (t > 1.0) { if (r.done) { if (button(g, 'done', 190, 812, 340, 78, '원정 완료', { size: 38 })) nav.go('end', { win: true }); } else if (button(g, 'reward', 190, 812, 340, 78, '전리품 고르기', { size: 36 })) nav.go('reward'); }
    } else {
      panel(g, 70, 400, 580, 440);
      brushTitle(g, 360, 402, 330, 84, '패전', '#5a5346', 54);
      text(g, R.reason === 'time' ? '시간 안에 요괴를 몰아내지 못했습니다' : R.reason === 'giveup' ? '싸움을 물렸습니다' : '아군이 모두 쓰러졌습니다', 360, 512, { size: 26, maxW: 520 });
      for (let n = 0; n < 3; n++) icon.flag(g, 300 + n * 60, 600, 2.4, n < r.crowns ? RED : '#c9c2b0');
      text(g, r.crowns > 0 ? `남은 깃발 ${r.crowns}개 — 진형과 명령을 바꿔 다시 도전하세요` : '깃발을 모두 잃었습니다', 360, 672, { size: 20, fill: SUB, maxW: 520, weight: 400 });
      g.restore();
      if (t > 0.7) { if (r.crowns > 0) { if (button(g, 'retry', 190, 730, 340, 84, '다시 도전', { size: 40 })) nav.go('battle'); } else if (button(g, 'over', 190, 730, 340, 84, '원정 종료', { style: 'red', size: 40 })) nav.go('end', { win: false }); }
    }
  }
  drawMenu(g) {
    const r = this.r, fight = this.phase === 'fight';
    g.fillStyle = 'rgba(31,42,68,0.55)'; g.fillRect(0, 0, W, H);
    panel(g, 90, 300, 540, 640);
    brushTitle(g, 360, 302, 300, 72, '잠시 멈춤', INDIGO, 38);
    text(g, `${this.ch.name}  ${this.st.id}`, 360, 384, { size: 24 });
    const rel = r.relics.map(id => RELICS[id].name);
    text(g, rel.length ? '지닌 보물' : '지닌 보물 없음', 360, 424, { size: 19, fill: SUB });
    if (rel.length) textBlock(g, rel.join(' · '), 360, 452, 480, 24, { size: 18, weight: 400 });
    if (button(g, 'm1', 170, 560, 380, 80, '계속하기', { size: 36 })) this.menu = false;
    if (button(g, 'm2', 170, 660, 380, 72, audio.muted ? '소리 켜기' : '소리 끄기', { style: 'paper', size: 30 })) setMuted(!audio.muted);
    if (fight) { if (button(g, 'm3', 170, 752, 380, 72, '싸움 물리기', { style: 'red', size: 30 })) { this.menu = false; this.b.finish(1, 'giveup'); } }
    else if (this.phase === 'deploy') { if (button(g, 'm3', 170, 752, 380, 72, '처음 화면으로', { style: 'paper', size: 30 })) nav.go('title'); }
    text(g, '부대 끌기 = 이동 후 대기  ·  요괴 위에 놓기 = 집중 공격', 360, 866, { size: 17, fill: SUB, maxW: 500, weight: 400 });
    text(g, '부대 탭 = 대기 ↔ 돌격  ·  진행은 자동 저장됩니다', 360, 894, { size: 17, fill: SUB, maxW: 500, weight: 400 });
  }
}
