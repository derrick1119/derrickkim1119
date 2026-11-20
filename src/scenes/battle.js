// 전투 장면: 배치 → 전투 → 결과
import { W, H, FIELD, cellAt } from '../config.js';
import { TAU, INK, PAPER, RED, REDD, INDIGO, NAVY, TEAL, OCHRE, SUB, FONT_B, text, textBlock, ell, rr, rrPath, poly, line, st as inkStroke, drawSprite, clamp, easeOutBack } from '../render/draw.js';
import { BattleView, ghostUnits } from '../render/battleview.js';
import { portrait } from '../render/sprites.js';
import { Battle, formation, HAND, REFILL } from '../sim/battle.js';
import { CARDS, KIND, cardName } from '../data/cards.js';
import { WEAPONS, ARMS } from '../data/weapons.js';
import { cardFace, cardBack, cardText, ArmyView, DeckView } from '../ui/cards.js';
import { cardIcon, relicIcon } from '../render/icons.js';
import { G, meta, save, battleSetup, cap, used, lvlOf, countOf, squadAtCell, unitStats, goldFor, depth } from '../state.js';
import { CHAPTERS, MAPS } from '../data/stages.js';
import { AFFIX } from '../data/encounters.js';
import { UNITS } from '../data/units.js';
import { RELICS } from '../data/relics.js';
import { ui, button, iconBtn, panel, bar, icon, seal, stamp, brushTitle, C, inRect, tapped } from '../ui/ui.js';
import { sfx, audio, setMuted } from '../audio.js';
import { nav } from '../nav.js';

const TRAY_Y = 1086, BAR_Y = 1100;
export const GRADE = ['', '병', '을', '갑'];
const fmtTime = s => { s = Math.max(0, Math.ceil(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };

export { portrait };

export class BattleScene {
  constructor() {
    const r = this.r = G.run; this.st = r.enc; this.ch = CHAPTERS[r.ch];
    this.view = new BattleView(this.ch.theme, MAPS[this.st.map], depth() * 7 + 3);
    this.first = (meta.runs || 0) <= 1 && r.wins === 0;
    const types = [...new Set(this.st.enemy.map(e => e[0]))].sort((a, b) => (UNITS[b].boss ? 1 : 0) - (UNITS[a].boss ? 1 : 0));
    this.intro = types.filter(t => !meta.seen[t]); if (!this.intro.length) this.intro = types.filter(t => t === this.st.key);
    this.phase = 'deploy'; this.T = 0; this.speed = 1; this.menu = false; this.slow = 1; this.endT = 0;
    this.sel = null; this.tipOpen = true; this.drag = null; this.scroll = 0; this.order = null; this.aim = null;
    this.toastS = ''; this.toastT = 0; this.banner = 2.6; this.res = null; this.hinted = false; this.fightBanner = 0;
    this.seed = (Math.random() * 1e9) | 0; this.army = null; this.deckView = null; this.slotAnim = [];
    this.rebuild();
    if (this.st.boss) sfx('boss');
  }
  rebuild() { this.b = new Battle(battleSetup(this.seed)); this.hp0 = Math.max(1, this.b.hpSum(0)); this.hp1 = Math.max(1, this.b.hpSum(1)); }
  toast(s, t = 2.2) { this.toastS = s; this.toastT = t; }
  bench() { return this.r.squads.filter(s => !s.placed); }

  // ───────── 배치 단계 ─────────
  updateDeploy(i) {
    if (this.menu || this.banner > 1.6 || this.army || this.deckView) return;
    const bench = this.bench(), maxScroll = Math.max(0, bench.length * 104 - 536);
    this.scroll = clamp(this.scroll, 0, maxScroll);
    if (i.pressed) {
      if (i.y >= TRAY_Y) { if (i.x < 552 && i.y > 1112) { const s = bench[Math.floor((i.x - 12 + this.scroll) / 104)]; this.drag = { s: s || null, from: 'tray', scroll0: this.scroll, mode: s ? 'pend' : 'scroll' }; } }
      else if (this.infoOpen() && inRect(i, 24, 470, 672, 190)) { /* 정보 패널이 처리 */ }
      else if (inRect(i, 580, 156, 130, 56)) { /* 머리 띠 아래 버튼 */ }
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
        if (!b.canPlay(a.slot) || b.hand[a.slot] !== a.card) this.aim = null;
        else if (a.drag || a.live) { if (!i.down) { if (i.y < BAR_Y - 8 && i.y > 200 && (a.live || i.dragged)) { b.play(a.slot, i.x, i.y); this.aim = null; this.carded = true; } else { a.drag = false; a.live = false; a.armed = true; } } }
      }
    }
    const want = (this.order && this.order.moved) || (this.aim && (this.aim.live || (this.aim.drag && i.y < BAR_Y - 8))) ? 0.12 : 1;
    this.slow += (want - this.slow) * Math.min(1, dt * 16);
    if (!this.menu) {
      const ts = this.slow * (b.over ? 0.3 : 1);
      for (let k = 0; k < this.speed; k++) { b.step(dt * ts); this.view.handle(b, sfx); }
      fx.update(dt * Math.max(0.35, ts));
      if (b.over) { this.endT += dt; if (this.endT > 1.4) this.finish(); }
      if (this.first && !this.hinted && b.time > 2 && this.toastT <= 0) { this.toast('부대를 끌어 명령을 내려보세요! (끄는 동안 시간이 느려집니다)', 5); this.hinted = true; }
      else if (this.first && !this.carded && b.time > 9 && this.toastT <= 0) { this.toast('아래 패를 끌어 전장에 놓으면 사기(엽전)를 내고 씁니다', 5); this.carded = true; }
    }
  }
  finish() {
    const b = this.b, r = this.r, st = this.st; this.phase = 'result'; this.order = null; this.aim = null;
    r.kills += b.kills; r.lost += b.lost; r.nextMorale = 0;
    for (const e of st.enemy) meta.seen[e[0]] = 1;
    if (b.winner === 0) {
      const c1 = b.lost <= st.starDeaths, c2 = b.time <= st.starTime, grade = 1 + (c1 ? 1 : 0) + (c2 ? 1 : 0), gold = goldFor(grade, st.kind);
      r.gold += gold; r.merit = (r.merit || 0) + grade; r.wins++;
      this.res = { win: true, grade, c1, c2, gold, t: 0, stamped: false };
      r.rewardPending = { kind: st.kind };
      sfx('win');
    } else { r.crowns--; this.res = { win: false, reason: b.reason, t: 0 }; sfx('lose'); }
    save();
  }

  // ───────── 프레임 ─────────
  frame(g, dt, i) {
    this.T += dt; this.dt = dt; ui.top = this.army || this.deckView ? 1 : 0; if (this.banner > 0) this.banner -= dt; if (this.toastT > 0) this.toastT -= dt; if (this.fightBanner > 0) this.fightBanner -= dt;
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
        opt.extra = ghostUnits(d.s.type, countOf(d.s.type), i.x, i.y - 16, formation, d.s.wpn).map(u => ({ y: u.y + 400, u, alpha: 0.85 }));
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
    if (!a) return;
    const c = a.card, d = CARDS[c.id], col = KIND[d.kind].col, b = this.b;
    if ((a.live || a.drag) && i.y < BAR_Y - 8) {
      if (d.target) {
        const r = d.r * (c.id === 'grail' ? b.mods.grailR : 1);
        g.globalAlpha = 0.22; ell(g, i.x, i.y, r, r, col); g.globalAlpha = 1;
        g.setLineDash([12, 8]); g.lineDashOffset = -T * 40; g.beginPath(); g.arc(i.x, i.y, r, 0, TAU); inkStroke(g, col, 3.4); g.setLineDash([]);
        ell(g, i.x, i.y, 30, 30, PAPER, col, 3); cardIcon(g, c.id, i.x, i.y, 1.05); text(g, cardName(c), i.x, i.y - r - 20, { size: 26, font: FONT_B, stroke: PAPER, lw: 6 });
      } else {
        g.globalAlpha = 0.14; g.fillStyle = col; g.fillRect(FIELD.x0, FIELD.y0, FIELD.x1 - FIELD.x0, FIELD.y1 - FIELD.y0); g.globalAlpha = 1;
        g.setLineDash([16, 10]); g.lineDashOffset = -T * 40; rr(g, FIELD.x0 + 6, FIELD.y0 + 6, FIELD.x1 - FIELD.x0 - 12, FIELD.y1 - FIELD.y0 - 12, 14, null, col, 4); g.setLineDash([]);
        ell(g, i.x, i.y - 30, 36, 36, PAPER, col, 3); cardIcon(g, c.id, i.x, i.y - 30, 1.25); text(g, `${cardName(c)} — 손을 떼면 전군에 사용`, 360, 312, { size: 28, font: FONT_B, stroke: PAPER, lw: 7 });
      }
    }
    // 고른 패의 설명
    g.globalAlpha = 0.95; rr(g, 30, 204, 660, 68, 10, PAPER, INK, 2.4); g.globalAlpha = 1;
    rr(g, 40, 214, 6, 48, 3, col); text(g, cardName(c), 58, 238, { size: 26, font: FONT_B, align: 'left', maxW: 150 });
    textBlock(g, a.armed ? cardText(c, b.power * b.mods.cardPow) + '  — 쓸 자리를 터치하세요' : cardText(c, b.power * b.mods.cardPow), 216, 228, 460, 21, { size: 16, align: 'left', weight: 400 });
  }

  // ───────── 머리 띠 ─────────
  drawHud(g, b) {
    const r = this.r, st = this.st, fight = this.phase !== 'deploy';
    g.fillStyle = NAVY; g.fillRect(0, 0, W, 104); g.globalAlpha = 0.22; for (let x = 0; x < W; x += 20) poly(g, [x, 104, x + 10, 96, x + 20, 104], OCHRE); g.globalAlpha = 1; g.fillStyle = OCHRE; g.fillRect(0, 104, W, 3);
    const p = fight ? b.hpSum(0) / this.hp0 : 1, e = fight ? b.hpSum(1) / this.hp1 : 1;
    icon.banner(g, 34, 54, '#3f6ea8'); text(g, String(b.count(0)), 78, 40, { size: 40, font: FONT_B, fill: C.cream, align: 'left' }); text(g, '아군', 136, 44, { size: 17, fill: '#8fb6e6', align: 'left' }); bar(g, 78, 68, 190, 14, p, '#8fb6e6');
    icon.banner(g, 686, 54, '#b8442f', true); text(g, String(b.count(1) + b.pending), 642, 40, { size: 40, font: FONT_B, fill: C.cream, align: 'right' }); text(g, '요괴', 584, 44, { size: 17, fill: '#e4826a', align: 'right' }); bar(g, 452, 68, 190, 14, e, '#e4826a', { right: true });
    const left = fight ? b.timeLimit - b.time : st.time, low = fight && left < 15;
    ell(g, 360, 62, 58, 58, PAPER, INK, 4); g.beginPath(); g.arc(360, 62, 49, 0, TAU); inkStroke(g, INK + '66', 1.6);
    text(g, fmtTime(left), 360, 56, { size: 38, font: FONT_B, fill: low ? RED : INK }); text(g, this.ch.short, 360, 91, { size: 15, fill: SUB });
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
  drawUnitCard(g, s, x, y, dragging) {
    const d = UNITS[s.type], w = 98, h = 150;
    if (dragging) g.globalAlpha = 0.35;
    rr(g, x + 2, y + 4, w, h, 6, 'rgba(50,36,20,0.25)'); rr(g, x, y, w, h, 6, PAPER, INK, 2.4);
    g.save(); g.beginPath(); rrPath(g, x + 2, y + 2, w - 4, 86, 5); g.clip(); g.fillStyle = d.hero ? '#f0dfae' : '#e4dcc0'; g.fillRect(x, y, w, 90); g.fillStyle = '#a9b78f'; g.globalAlpha *= 0.6; g.fillRect(x, y + 66, w, 24); g.globalAlpha /= 0.6; portrait(g, s.type, x + w / 2, y + 82, d.hero ? 1.0 : 1.1, this.T, false, s.wpn); g.restore();
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
    bench.forEach((s, n) => { const x = 12 + n * 104 - this.scroll; if (x > -110 && x < 560) this.drawUnitCard(g, s, x, 1124, d && d.mode === 'move' && d.s === s); });
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
    if (iconBtn(g, 'deck', 586, 162, 58, 44, (gg, x, y) => { cardBack(gg, x - 22, y - 15, 20, 28); text(gg, String(this.r.deck.length), x + 12, y + 1, { size: 22, font: FONT_B }); })) this.deckView = new DeckView({ P: this.b.power * this.b.mods.cardPow, onClose: () => { this.deckView = null; } });
  }
  drawInfo(g) {
    if (!this.infoOpen()) return;
    const x = 24, y = 472, w = 672, h = 186, sel = this.sel;
    panel(g, x, y, w, h);
    if (!sel) {
      const stg = this.st;
      rr(g, x + 18, y + 18, 96, 32, 6, stg.boss || stg.kind === 'elite' ? RED : INDIGO); text(g, stg.boss ? '두목' : stg.kind === 'elite' ? '강적' : '싸움', x + 66, y + 35, { size: 18, fill: C.cream });
      text(g, stg.name, x + 126, y + 35, { size: 30, font: FONT_B, align: 'left', maxW: 380 });
      text(g, stg.enemyName, x + w - 22, y + 37, { size: 17, fill: RED, align: 'right', maxW: 150 });
      const tip = this.first ? '아래 패를 끌어 부대를 배치하세요. 싸움이 시작되면 부대를 끌어 이동시키고, 요괴 위에 놓아 집중 공격을 명령할 수 있습니다.' : (stg.affix ? `[${AFFIX[stg.affix].name}] ${AFFIX[stg.affix].desc}. ` : '') + stg.tip;
      textBlock(g, tip, x + 22, y + 76, w - 200, 27, { size: 19, align: 'left', weight: 400 });
      this.intro.slice(0, 2).forEach((t, n) => { const px = x + w - 62 - n * 80; rr(g, px - 36, y + 58, 72, 96, 5, '#efe2c4', INK, 1.6); g.save(); g.beginPath(); g.rect(px - 35, y + 59, 70, 94); g.clip(); portrait(g, t, px, y + 148, UNITS[t].boss ? 0.6 : 1.15, this.T); g.restore(); });
      text(g, '요괴 부대를 탭하면 정보를 볼 수 있습니다', x + 22, y + h - 24, { size: 16, align: 'left', fill: SUB, weight: 400 });
      return;
    }
    const type = sel.enemy ? sel.type : sel.s.type, d = UNITS[type], lvl = sel.enemy ? sel.lvl : lvlOf(type), wpn = sel.enemy ? null : sel.s.wpn, stt = unitStats(type, lvl, wpn), n = sel.enemy ? sel.n : stt.n;
    rr(g, x + 18, y + 18, 108, h - 36, 5, sel.enemy ? '#efd9cf' : '#dbe3ea', INK, 1.6);
    g.save(); g.beginPath(); g.rect(x + 19, y + 19, 106, h - 38); g.clip(); portrait(g, type, x + 72, y + 152, d.boss ? 0.95 : 1.9, this.T, true, wpn); g.restore();
    text(g, d.name, x + 142, y + 38, { size: 32, font: FONT_B, fill: sel.enemy ? RED : INK, align: 'left' });
    const nw = (g.font = `32px ${FONT_B}`, g.measureText(d.name).width);
    rr(g, x + 152 + nw, y + 24, 56, 26, 5, NAVY); text(g, `Lv${lvl}`, x + 180 + nw, y + 38, { size: 16, fill: '#f0d99a' });
    rr(g, x + 216 + nw, y + 24, 72, 26, 5, sel.enemy ? RED : INDIGO); text(g, d.role, x + 252 + nw, y + 38, { size: 16, fill: C.cream });
    const stats = [`체력 ${stt.hp}`, `${d.heal ? '치유' : '공격'} ${stt.atk}`, `${n}명`]; if (!sel.enemy) stats.push(`군량 ${d.cost}`);
    text(g, stats.join('  ·  '), x + 142, y + 74, { size: 19, align: 'left', fill: SUB });
    textBlock(g, d.tip, x + 142, y + 106, sel.enemy ? w - 166 : w - 336, 25, { size: 18, align: 'left', weight: 400 });
    if (!sel.enemy) {
      const s = sel.s;
      const arm = ARMS[type];
      text(g, '시작 명령', x + w - 96, y + (arm ? 62 : 74), { size: 16, fill: SUB });
      if (button(g, 'stance', x + w - 174, y + (arm ? 76 : 92), 156, arm ? 46 : 70, s.hold ? '대기' : '돌격', { style: s.hold ? 'indigo' : 'red', size: arm ? 26 : 34 })) { s.hold = !s.hold; this.rebuild(); save(); }
      if (arm && button(g, 'wpn', x + w - 174, y + 130, 156, 42, `무기 · ${WEAPONS[wpn || arm.base].name}`, { style: 'paper', size: 19, r: 10 })) this.army = new ArmyView({ uid: s.uid, onChange: () => this.rebuild(), onClose: () => { this.army = null; this.rebuild(); } });
    }
  }
  // 손패 한 칸
  handCard(g, n, x, y, w, h, b, i, live) {
    const c = b.hand[n], an = this.slotAnim[n] || (this.slotAnim[n] = { c: null, t: 9 });
    if (an.c !== c) { an.c = c; an.t = 0; if (c) sfx('card'); } an.t += this.dt || 0;
    if (!c) {
      g.globalAlpha = 0.5; g.setLineDash([7, 6]); rr(g, x + 3, y + 3, w - 6, h - 6, 8, null, INK, 1.6); g.setLineDash([]); g.globalAlpha = 1;
      if (b.drawPile.length + b.discard.length > 0) { const f = clamp(1 - b.slotT[n] / (REFILL * b.mods.drawRate), 0, 1); g.beginPath(); g.arc(x + w / 2, y + h / 2, 22, -Math.PI / 2, -Math.PI / 2 + TAU * f); inkStroke(g, INDIGO, 5); text(g, '뽑는 중', x + w / 2, y + h - 22, { size: 14, fill: SUB }); }
      return;
    }
    const d = CARDS[c.id], can = b.canPlay(n), a = this.aim, armed = a && a.slot === n;
    if (live && i.pressed && inRect(i, x, y, w, h)) {
      if (!can) { sfx('deny'); this.toast(d.hero && !b.hero() ? '영웅이 쓰러져 쓸 수 없습니다' : '사기가 부족합니다', 1.2); }
      else if (armed && a.armed) this.aim = null;
      else { this.aim = { slot: n, card: c, drag: true, armed: false, live: false }; this.order = null; sfx('click'); }
    }
    const k = clamp(an.t / 0.22, 0, 1), up = armed ? (a.drag && i.y < BAR_Y - 8 ? 0 : -12) : 0, yy = y + up + (1 - easeOutBack(k)) * 46;
    g.save(); g.globalAlpha = k * (armed && a.drag && i.y < BAR_Y - 8 ? 0.35 : 1);
    if (armed) rr(g, x - 4, yy - 4, w + 8, h + 8, 12, null, OCHRE, 4);
    cardFace(g, c, x, yy, w, h, { cost: b.free > 0 ? 0 : b.costOf(c), dim: !can, free: b.free > 0 });
    if (d.hero && !b.hero()) text(g, '쓰러짐', x + w / 2, yy + h / 2, { size: 22, font: FONT_B, fill: C.cream, stroke: INK, lw: 5 });
    g.restore();
  }
  drawBar(g, b, i) {
    panel(g, 0, BAR_Y, W, H - BAR_Y, 'tray');
    const live = this.phase === 'fight' && !b.over && !this.menu && !this.deckView, mine = b.squads.filter(q => q.team === 0 && q.alive > 0);
    text(g, '사기', 14, 1123, { size: 21, font: FONT_B, align: 'left' });
    for (let k = 0; k < 10; k++) { const f = clamp(b.morale - k, 0, 1), cx = 76 + k * 30; icon.coin(g, cx, 1122, 12, f >= 1); if (f > 0 && f < 1) { g.save(); g.beginPath(); g.rect(cx - 12, 1122 + 12 - 24 * f, 24, 24 * f); g.clip(); icon.coin(g, cx, 1122, 12, true); g.restore(); } }
    cardBack(g, 372, 1108, 20, 28); text(g, String(b.drawPile.length), 404, 1123, { size: 19, font: FONT_B, align: 'left' });
    g.globalAlpha = 0.6; cardBack(g, 440, 1108, 20, 28); g.globalAlpha = 1; text(g, String(b.discard.length), 472, 1123, { size: 19, font: FONT_B, align: 'left', fill: SUB });
    for (let n = 0; n < HAND; n++) this.handCard(g, n, 8 + n * 139, 1144, 132, 130, b, i, live);
    if (button(g, 'redraw', 572, 1106, 140, 34, '패 갈기 · 사기 1', { style: b.canRedraw() ? 'paper' : 'grey', size: 16, r: 8 }) && live) { if (b.redraw()) { this.aim = null; } else sfx('deny'); }
    if (button(g, 'allhold', 572, 1150, 140, 56, '전군 대기', { style: 'navy', size: 23, r: 10 }) && live) { for (const q of mine) b.orderHold(q); this.view.fx.txt(360, 640, '전군 대기!', INDIGO, 38, 1); sfx('order'); }
    if (button(g, 'allgo', 572, 1216, 140, 56, '전군 돌격', { style: 'red', size: 23, r: 10 }) && live) { for (const q of mine) b.orderAuto(q); this.view.fx.txt(360, 640, '전군 돌격!', RED, 38, 1); sfx('horn'); }
  }
  drawOverlays(g, b) {
    const st = this.st;
    if (this.banner > 0 && this.phase === 'deploy') {
      const k = clamp(this.banner > 2.2 ? (2.6 - this.banner) / 0.4 : this.banner < 0.4 ? this.banner / 0.4 : 1, 0, 1);
      g.save(); g.globalAlpha = k; g.fillStyle = 'rgba(248,240,220,0.9)'; g.fillRect(0, 292, W, 256); g.fillStyle = INK; g.fillRect(0, 290, W, 3); g.fillRect(0, 546, W, 3);
      g.translate(0, (1 - easeOutBack(k)) * -30);
      text(g, this.ch.name, 360, 340, { size: 26, fill: SUB });
      brushTitle(g, 360, 418, 470, 88, st.name, st.boss ? RED : INDIGO, 46);
      text(g, st.boss ? '두목과의 싸움' : st.affix ? `강적 — ${AFFIX[st.affix].name}: ${AFFIX[st.affix].desc}` : this.ch.sub, 360, 504, { size: 22, fill: st.affix ? RED : SUB });
      g.restore();
    }
    if (this.fightBanner > 0) { const k = clamp(this.fightBanner / 0.3, 0, 1), s = 1 + (1 - k) * 0.6; g.save(); g.globalAlpha = k; g.translate(360, 560); g.scale(s, s); text(g, '전투 개시!', 0, 0, { size: 84, font: FONT_B, fill: INK, stroke: PAPER, lw: 14 }); g.restore(); }
    if (this.toastT > 0) { g.globalAlpha = clamp(this.toastT / 0.3, 0, 1); const y = this.phase === 'deploy' ? 700 : 232; rr(g, 40, y - 26, 640, 52, 26, PAPER, INK, 2.4); text(g, this.toastS, 360, y + 1, { size: 20, maxW: 606 }); g.globalAlpha = 1; }
    if (this.phase === 'result') this.drawResult(g, b);
    if (this.menu && !this.deckView) this.drawMenu(g);
    if (this.army) this.army.frame(g, this.dt);
    if (this.deckView) this.deckView.frame(g, this.dt);
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
      if (t > 1.0 && button(g, 'reward', 190, 812, 340, 78, '전리품 고르기', { size: 36 })) nav.go('reward');
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
    text(g, `${this.ch.name}  ·  ${this.st.name}`, 360, 384, { size: 22, maxW: 480 });
    const rel = r.relics, pitch = Math.min(48, 470 / Math.max(1, rel.length));
    text(g, rel.length ? '지닌 보물' : '지닌 보물 없음', 360, 422, { size: 19, fill: SUB });
    rel.forEach((id, n) => { const x = 360 + (n - (rel.length - 1) / 2) * pitch; if (tapped('rel' + n, x - pitch / 2, 438, pitch, 48)) this.relSel = id; if (this.relSel === id) ell(g, x, 462, 23, 23, '#f6e6b8', RED, 2); relicIcon(g, id, x, 462, Math.min(0.82, pitch / 44)); });
    if (rel.length) text(g, this.relSel && rel.includes(this.relSel) ? `${RELICS[this.relSel].name} — ${RELICS[this.relSel].desc}` : '보물을 누르면 효과를 볼 수 있습니다', 360, 502, { size: 16, fill: this.relSel ? INK : SUB, weight: 400, maxW: 500 });
    if (button(g, 'm1', 170, 524, 380, 76, '계속하기', { size: 36 })) this.menu = false;
    if (button(g, 'm4', 170, 614, 380, 64, `전술 패 보기 · ${r.deck.length}장`, { style: 'paper', size: 28 })) this.deckView = new DeckView({ P: this.b.power * this.b.mods.cardPow, onClose: () => { this.deckView = null; } });
    if (button(g, 'm2', 170, 692, 380, 64, audio.muted ? '소리 켜기' : '소리 끄기', { style: 'paper', size: 28 })) setMuted(!audio.muted);
    if (fight) { if (button(g, 'm3', 170, 770, 380, 64, '싸움 물리기', { style: 'red', size: 28 })) { this.menu = false; this.b.finish(1, 'giveup'); } }
    else if (this.phase === 'deploy') { if (button(g, 'm3', 170, 770, 380, 64, '처음 화면으로', { style: 'paper', size: 28 })) nav.go('title'); }
    text(g, '부대 끌기 = 이동 후 대기  ·  요괴 위에 놓기 = 집중 공격', 360, 866, { size: 17, fill: SUB, maxW: 500, weight: 400 });
    text(g, '부대 탭 = 대기 ↔ 돌격  ·  패 끌기 = 사기를 내고 사용', 360, 894, { size: 17, fill: SUB, maxW: 500, weight: 400 });
  }
}
