// 행군 장면: 원정 전체가 이 한 장면에서 끊김 없이 이어진다
// 행군 → (요괴 물결 | 갈림길 푯말 | 길가의 사건·장터·주막·보물) → 전리품 → 다시 행군 …
import { W, H, VIEW, HUD_H, BAR_Y } from '../config.js';
import { TAU, INK, PAPER, RED, REDD, INDIGO, NAVY, TEAL, OCHRE, SUB, FONT_B, text, textBlock, ell, rr, rrPath, poly, line, st as inkStroke, clamp, easeOutBack } from '../render/draw.js';
import { BattleView, ghostUnits } from '../render/battleview.js';
import { Battle, formation, defOf, HAND, REFILL } from '../sim/battle.js';
import { G, meta, save, battleSetup, waveSetup, mods, powerNow, goldFor, curStop, chooseFork, encounterHere, advance, genShop, pickEvent, STOP } from '../state.js';
import { CHAPTERS } from '../data/stages.js';
import { AFFIX } from '../data/encounters.js';
import { CARDS, KIND, cardName, isUnit } from '../data/cards.js';
import { eventView } from '../data/events.js';
import { RELICS } from '../data/relics.js';
import { ui, button, iconBtn, panel, bar, icon, seal, stamp, brushTitle, C, inRect, tapped } from '../ui/ui.js';
import { cardFace, cardBack, cardText, DeckView, RelicView } from '../ui/cards.js';
import { RewardOverlay, ShopOverlay, ChoiceOverlay, ForkOverlay, restChoices } from '../ui/overlays.js';
import { cardIcon, relicIcon } from '../render/icons.js';
import { sfx, audio, setMuted } from '../audio.js';
import { nav } from '../nav.js';

export const GRADE = ['', '병', '을', '갑'];
const MARCH = 520, MARCH_V = 300;

export class RunScene {
  constructor() {
    const r = this.r = G.run; this.ch = r.ch;
    this.b = new Battle(battleSetup()); this.view = new BattleView(CHAPTERS[Math.min(2, r.ch)].theme, r.ch * 31 + 7);
    this.T = 0; this.dt = 0; this.speed = 1; this.slow = 1; this.menu = false; this.over = null; this.sub = null;
    this.order = null; this.aim = null; this.slotAnim = []; this.toastS = ''; this.toastT = 0; this.note = null; this.grade = null; this.enc = null; this.fade = 0; this.endT = 0;
    this.first = (meta.runs || 0) <= 1 && r.wins === 0; this.hints = 0;
    const rd = r.road;
    if (rd.state === 'reward') { this.phase = 'stop'; this.reward(curStop().type); }
    else if (rd.state === 'at') { this.phase = 'march'; this.arrive(); }
    else this.march(r.wins === 0 && rd.i === 0 ? 300 : MARCH, true);
    if (rd.i === 0 && rd.state !== 'reward') this.note = { s: CHAPTERS[r.ch].name, sub: CHAPTERS[r.ch].sub, col: INDIGO, t: 2.6 };
  }
  toast(s, t = 2.4) { this.toastS = s; this.toastT = t; }
  sync() { const b = this.b, r = this.r; b.mods = mods(); b.cap = r.cap; b.power = powerNow(); b.syncDeck(r.deck); }

  // ───────── 흐름 ─────────
  march(dist = MARCH, quiet) {
    const st = curStop(); this.phase = 'march'; this.left = dist; this.over = null; this.b.beginMarch();
    if (st) this.view.addProp(st.type, this.view.scroll + dist + (st.type === 'battle' || st.type === 'elite' || st.type === 'boss' ? 1190 : 1010));
    if (!quiet) sfx('order');
  }
  arrive() {
    const r = this.r, b = this.b, rd = r.road, st = curStop(); rd.state = 'at'; this.sync();
    const done = () => this.leave();
    if (st.type === 'fork') { this.phase = 'stop'; this.over = new ForkOverlay({ a: st.a, b: st.b, onPick: k => { chooseFork(k); this.over = null; this.arrive(); } }); }
    else if (st.type === 'battle' || st.type === 'elite' || st.type === 'boss') {
      const e = this.enc = encounterHere(); b.startWave(e.enemy, waveSetup(e)); this.phase = 'fight'; this.grade = null;
      this.note = { s: e.name, sub: e.boss ? '두목과의 싸움' : e.affix ? `강적 — ${AFFIX[e.affix].name}: ${AFFIX[e.affix].desc}` : e.enemyName + '가 몰려옵니다', col: e.boss || e.affix ? RED : INDIGO, t: 2.2 };
      if (e.boss) sfx('boss');
    }
    else if (st.type === 'event') { this.phase = 'stop'; const id = r.pending && r.pending.kind === 'event' ? r.pending.id : pickEvent(); r.pending = { kind: 'event', id }; const v = eventView({ id }); this.over = new ChoiceOverlay({ title: v.title, art: v.art, text: v.text, choices: v.choices, onDone: done }); }
    else if (st.type === 'shop') { this.phase = 'stop'; const items = r.pending && r.pending.kind === 'shop' ? r.pending.items : genShop(); r.pending = { kind: 'shop', items }; this.over = new ShopOverlay({ items, onDone: done }); }
    else if (st.type === 'rest') { this.phase = 'stop'; b.repair(1); this.over = new ChoiceOverlay({ title: '주막', art: 'priest', col: '#2f6f5c', text: '고갯마루 주막에 들렀습니다.\n군기 수레를 말끔히 고치고 숨을 고릅니다.\n두목과 맞서기 전에 무엇을 할까요?', choices: restChoices(), onDone: done }); }
    else { this.phase = 'stop'; this.reward('treasure'); }
    save();
  }
  reward(kind) { this.phase = 'stop'; this.over = new RewardOverlay({ kind, onDone: () => this.leave() }); }
  // 지금 칸을 마치고 다시 걷는다 (두목을 물리쳤으면 다음 고개로)
  leave() {
    const r = this.r; this.over = null; this.sync();
    if (advance()) { this.phase = 'over'; nav.go('end', { win: true }); return; }
    if (r.ch !== this.ch) { this.ch = r.ch; this.fade = 1; this.sync(); this.note = { s: CHAPTERS[r.ch].name, sub: '깃발 하나를 되찾고 · 부대 한도 +1 · 모든 병력 패 Lv +1', col: INDIGO, t: 3.2 }; sfx('win'); }
    this.march();
  }
  waveClear(e) {
    const r = this.r, b = this.b, enc = this.enc, c1 = e.lost <= enc.starDeaths, c2 = e.time <= enc.starTime, grade = 1 + (c1 ? 1 : 0) + (c2 ? 1 : 0), gold = goldFor(grade, enc.kind);
    r.gold += gold; r.merit = (r.merit || 0) + grade; r.wins++; r.kills = b.kills; r.lost = b.lost; r.nextMorale = 0; r.road.state = 'reward';
    this.grade = { grade, gold, t: 0, stamped: false }; this.phase = 'clear'; this.order = null; this.aim = null; sfx('win'); save();
  }
  bannerDown() {
    const r = this.r, b = this.b; r.flags--; save();
    if (r.flags > 0) { b.raiseBanner(); this.note = { s: '군기 수레가 부서졌다!', sub: `깃발 하나를 잃고 다시 세웁니다 — 남은 깃발 ${r.flags}`, col: RED, t: 2.6 }; }
    else { this.phase = 'over'; this.endT = 1.8; this.order = null; this.aim = null; sfx('lose'); }
  }

  // ───────── 입력 ─────────
  input(i) {
    const b = this.b, fx = this.view.fx;
    if (i.pressed && i.y < BAR_Y - 4 && i.y > HUD_H + 4) {
      if (this.aim && this.aim.armed) this.aim.live = true;
      else if (!this.aim) { const sq = b.squadNear(i.x, i.y, 0, 48); if (sq && !sq.def.banner) { this.order = { sq, moved: false, target: null }; sfx('click'); } }
    }
    const o = this.order;
    if (o) {
      if (o.sq.alive <= 0) this.order = null;
      else if (i.down) { if (Math.hypot(i.x - i.px, i.y - i.py) > 24) o.moved = true; o.x = clamp(i.x, VIEW.x0 + 10, VIEW.x1 - 10); o.y = clamp(i.y, VIEW.y0 + 6, VIEW.y1 - 6); o.target = o.moved ? b.squadNear(i.x, i.y, 1, 46) : null; }
      else {
        this.order = null; const sq = o.sq, hy = sq.cy - 76;
        if (!o.moved) { if (sq.order.kind === 'auto') { b.orderHold(sq); fx.txt(sq.cx, hy, '대기!', INDIGO, 26, 0.9); } else { b.orderAuto(sq); fx.txt(sq.cx, hy, '돌격!', RED, 26, 0.9); } sfx('order'); }
        else if (o.target) { b.orderFocus(sq, o.target); fx.txt(o.target.cx, o.target.cy - 76, '집중 공격!', RED, 26, 0.9); sfx('focus'); }
        else if (i.y < BAR_Y) { b.orderMove(sq, o.x, o.y); fx.ring(o.x, o.y, 34, INK, 0.4, 4); sfx('order'); }
      }
    }
    const a = this.aim;
    if (a) {
      if (b.hand[a.slot] !== a.card || !b.canPlay(a.slot)) this.aim = null;
      else if ((a.drag || a.live) && !i.down) { if (i.y < BAR_Y - 8 && i.y > HUD_H + 4 && (a.live || i.dragged)) { b.play(a.slot, i.x, i.y); this.aim = null; } else { a.drag = false; a.live = false; a.armed = true; } }
    }
  }
  key(k) {
    const b = this.b; if (this.over || this.sub) return;
    if (k === 'Escape' || k === ' ') { this.menu = !this.menu; return; }
    if (this.menu || this.phase === 'over') return;
    const n = '12345'.indexOf(k);
    if (n >= 0 && b.hand[n]) { if (this.aim && this.aim.slot === n) this.aim = null; else if (b.canPlay(n)) { this.aim = { slot: n, card: b.hand[n], drag: false, armed: true, live: false }; this.order = null; sfx('click'); } else this.deny(n); }
    else if (k === 'q' || k === 'Q') this.allOrder(true); else if (k === 'e' || k === 'E') this.allOrder(false);
    else if (k === 'r' || k === 'R') { if (b.redraw()) this.aim = null; } else if (k === 'f' || k === 'F') this.speed = this.speed === 1 ? 2 : 1;
  }
  deny(n) { const why = this.b.whyNot(n); sfx('deny'); this.toast(why === 'cap' ? `전장에는 부대를 ${this.b.cap}개까지 세울 수 있습니다` : why === 'hero' ? (CARDS[this.b.hand[n].id].kind === 'lead' ? '영웅은 이미 전장에 있습니다' : '그 영웅이 전장에 있어야 쓸 수 있습니다') : '사기가 부족합니다', 1.4); }
  allOrder(hold) { const b = this.b, mine = b.squads.filter(q => q.team === 0 && q.alive > 0 && !q.def.banner); for (const q of mine) hold ? b.orderHold(q) : b.orderAuto(q); this.view.fx.txt(640, 330, hold ? '전군 대기!' : '전군 돌격!', hold ? INDIGO : RED, 38, 1); sfx(hold ? 'order' : 'horn'); }

  // ───────── 프레임 ─────────
  frame(g, dt, i) {
    this.T += dt; this.dt = dt; const b = this.b, view = this.view, r = this.r;
    ui.top = this.sub ? 1 : this.over ? (this.over.sub ? 2 : 1) : 0;
    if (this.toastT > 0) this.toastT -= dt; if (this.note) { this.note.t -= dt; if (this.note.t <= 0) this.note = null; }
    const live = !this.menu && !this.over && !this.sub && this.phase !== 'over' && this.phase !== 'stop';
    if (live) this.input(i);
    const aiming = this.aim && (this.aim.live || (this.aim.drag && i.y < BAR_Y - 8)), want = (this.order && this.order.moved) || aiming ? 0.12 : 1;
    this.slow += (want - this.slow) * Math.min(1, dt * 16);
    if (!this.menu && !this.sub && this.phase !== 'stop') {
      const ts = this.slow * (this.phase === 'over' ? 0.3 : 1);
      for (let k = 0; k < this.speed; k++) {
        if (this.phase === 'march') { const dx = MARCH_V * dt * ts, ahead = b.march(dx, dt * ts); view.scroll += dx; view.fx.shift(dx); this.left -= dx; if (this.left <= 0 && (ahead < 6 || this.left < -700)) { this.arrive(); break; } }
        b.step(dt * ts);
        for (const e of view.handle(b, sfx)) { if (e.type === 'waveClear' && this.phase === 'fight') this.waveClear(e); else if (e.type === 'bannerDown' && this.phase !== 'over') this.bannerDown(); }
      }
      view.fx.update(dt * Math.max(0.35, ts));
      if (this.phase === 'clear') { this.grade.t += dt; if (this.grade.t > 1.5) this.reward(this.enc.kind); }
      if (this.phase === 'over') { this.endT -= dt; if (this.endT <= 0 && !this.gone) { this.gone = true; nav.go('end', { win: false }); } }
      if (this.first && this.phase === 'fight' && this.toastT <= 0) { if (this.hints === 0 && b.waveT > 1.5) { this.toast('아래 병력 패를 전장으로 끌어다 놓으면 부대가 섭니다 (사기를 냅니다)', 5); this.hints = 1; } else if (this.hints === 1 && b.waveT > 9) { this.toast('부대를 끌면 이동, 요괴 위에 놓으면 집중 공격 · 끄는 동안 시간이 느려집니다', 5); this.hints = 2; } }
    } else view.fx.update(0);
    // 그리기
    const opt = { dt, orders: true, march: this.phase === 'march', rings: [] }, o = this.order, a = this.aim;
    if (o) { for (const u of o.sq.units) if (!u.dead) opt.rings.push({ x: u.x, y: u.y, r: u.r, col: '#2f4d7e' }); if (o.target) for (const u of o.target.units) if (!u.dead) opt.rings.push({ x: u.x, y: u.y, r: u.r, col: '#c8402f' }); }
    if (a && isUnit(a.card) && (a.live || a.drag || a.armed)) {
      const maxX = b.deployMaxX(), on = (a.live || a.drag) && i.y < BAR_Y - 8 && i.y > HUD_H; opt.deploy = { maxX, ok: !on || i.x <= maxX + 34 };
      if (on) { const d = CARDS[a.card.id], def = defOf(d.unit, a.card.wpn); opt.extra = ghostUnits(d.unit, def.n, Math.min(i.x, maxX), clamp(i.y, VIEW.y0 + 26, VIEW.y1 - 26), formation, a.card.wpn).map(u => ({ y: u.y, u, alpha: 0.75 })); }
    }
    view.draw(g, b, this.T, opt);
    this.drawOrder(g, i);
    if (this.slow < 0.9) { g.globalAlpha = (1 - this.slow) * 0.2; g.fillStyle = NAVY; g.fillRect(0, 0, W, H); g.globalAlpha = 1; }
    if (this.fade > 0) { // 고개가 바뀔 때: 종이가 하얗게 바랬다가 새 풍경으로
      const f0 = this.fade; this.fade = Math.max(0, this.fade - dt * 1.4); if (f0 > 0.5 && this.fade <= 0.5) view.setTheme(CHAPTERS[r.ch].theme, r.ch * 31 + 7);
      g.globalAlpha = 1 - Math.abs(this.fade - 0.5) * 2; g.fillStyle = '#f8f0dc'; g.fillRect(0, HUD_H, W, BAR_Y - HUD_H); g.globalAlpha = 1;
    }
    this.drawHud(g, b);
    this.drawBar(g, b, i, live);
    this.drawNotes(g, b);
    if (this.over) this.over.frame(g, dt);
    if (this.menu && !this.sub) this.drawMenu(g);
    if (this.sub) this.sub.frame(g, dt);
  }
  drawOrder(g, i) {
    const o = this.order, a = this.aim, T = this.T, b = this.b;
    if (o && o.moved) {
      const sq = o.sq, col = o.target ? RED : PAPER, tx = o.target ? o.target.cx : o.x, ty = o.target ? o.target.cy - 12 : o.y;
      const dx = tx - sq.cx, dy = ty - sq.cy, d = Math.hypot(dx, dy) || 1, ux = dx / d, uy = dy / d;
      line(g, [sq.cx, sq.cy - 10, tx - ux * 20, ty - uy * 20], INK, 10); line(g, [sq.cx, sq.cy - 10, tx - ux * 20, ty - uy * 20], col, 5);
      poly(g, [tx, ty, tx - ux * 26 - uy * 15, ty - uy * 26 + ux * 15, tx - ux * 26 + uy * 15, ty - uy * 26 - ux * 15], col, INK, 2.4);
      if (!o.target) { icon.flag(g, o.x + 4, o.y - 26, 1.3); text(g, '이동 후 대기', o.x, o.y + 30, { size: 22, font: FONT_B, stroke: PAPER, lw: 6 }); }
      else text(g, '집중 공격', tx, ty - 62, { size: 24, font: FONT_B, fill: RED, stroke: PAPER, lw: 6 });
    }
    if (!a) return;
    const c = a.card, d = CARDS[c.id], col = KIND[d.kind].col, unit = isUnit(c);
    if ((a.live || a.drag) && i.y < BAR_Y - 8 && i.y > HUD_H) {
      if (unit) { const x = Math.min(i.x, b.deployMaxX()); text(g, cardName(c), x, i.y - 78, { size: 24, font: FONT_B, stroke: PAPER, lw: 6 }); if (i.x > b.deployMaxX() + 34) text(g, '요괴와 너무 가깝습니다 — 선 안쪽에 섭니다', i.x, i.y + 40, { size: 18, fill: RED, stroke: PAPER, lw: 5 }); }
      else if (d.target) {
        const r = d.r * (c.id === 'grail' ? b.mods.grailR : 1);
        g.globalAlpha = 0.22; ell(g, i.x, i.y, r, r, col); g.globalAlpha = 1;
        g.setLineDash([12, 8]); g.lineDashOffset = -T * 40; g.beginPath(); g.arc(i.x, i.y, r, 0, TAU); inkStroke(g, col, 3.4); g.setLineDash([]);
        ell(g, i.x, i.y, 30, 30, PAPER, col, 3); cardIcon(g, c.id, i.x, i.y, 1.05); text(g, cardName(c), i.x, i.y - r - 20, { size: 26, font: FONT_B, stroke: PAPER, lw: 6 });
      } else {
        g.globalAlpha = 0.14; g.fillStyle = col; g.fillRect(VIEW.x0, VIEW.y0 - 30, VIEW.x1 - VIEW.x0, VIEW.y1 - VIEW.y0 + 44); g.globalAlpha = 1;
        g.setLineDash([16, 10]); g.lineDashOffset = -T * 40; rr(g, VIEW.x0 + 6, VIEW.y0 - 24, VIEW.x1 - VIEW.x0 - 12, VIEW.y1 - VIEW.y0 + 32, 14, null, col, 4); g.setLineDash([]);
        ell(g, i.x, i.y - 30, 36, 36, PAPER, col, 3); cardIcon(g, c.id, i.x, i.y - 30, 1.25); text(g, `${cardName(c)} — 손을 떼면 전군에 사용`, 640, 190, { size: 28, font: FONT_B, stroke: PAPER, lw: 7 });
      }
    }
    // 고른 패의 설명
    g.globalAlpha = 0.95; rr(g, 284, 72, 780, 56, 10, PAPER, INK, 2.4); g.globalAlpha = 1; rr(g, 294, 80, 6, 40, 3, col);
    text(g, cardName(c), 312, 100, { size: 24, font: FONT_B, align: 'left', maxW: 170 });
    const tip = unit ? `${CARDS[c.id].desc()} — 요괴 전열 앞까지 어디든 세울 수 있습니다` : cardText(c, b.power * b.mods.cardPow);
    textBlock(g, a.armed ? tip + '  ▸ 쓸 자리를 누르세요' : tip, 496, 92, 550, 20, { size: 15.5, align: 'left', weight: 400 });
  }

  // ───────── 머리 띠: 깃발·군기, 노정, 엽전 ─────────
  drawHud(g, b) {
    const r = this.r, rd = r.road, fight = this.phase === 'fight', T = this.T;
    g.fillStyle = NAVY; g.fillRect(0, 0, W, HUD_H); g.globalAlpha = 0.22; for (let x = 0; x < W; x += 20) poly(g, [x, HUD_H, x + 10, HUD_H - 8, x + 20, HUD_H], OCHRE); g.globalAlpha = 1; g.fillStyle = OCHRE; g.fillRect(0, HUD_H, W, 3);
    for (let k = 0; k < 3; k++) icon.flag(g, 24 + k * 26, 30, 1.15, k < r.flags ? RED : '#566078');
    const hp = b.bannerHp(); text(g, '군기', 104, 21, { size: 14, fill: '#8fb6e6', align: 'left' }); bar(g, 104, 32, 120, 14, hp, hp < 0.35 ? '#e4826a' : '#8fb6e6');
    // 노정: 이번 고개에서 만날 것들
    const n = rd.stops.length, x0 = 330, x1 = 900, sx = k => x0 + k * (x1 - x0) / (n - 1), cy = 34;
    text(g, CHAPTERS[Math.min(2, r.ch)].short, 300, cy, { size: 18, font: FONT_B, fill: C.cream, align: 'right' });
    line(g, [x0, cy, x1, cy], '#566078', 3);
    const prog = this.phase === 'march' ? clamp(1 - this.left / MARCH, 0, 1) : 1, mx = rd.i === 0 ? sx(0) - 26 * (1 - prog) : sx(rd.i - 1) + (sx(rd.i) - sx(rd.i - 1)) * prog;
    line(g, [x0, cy, Math.max(x0, mx), cy], OCHRE, 3);
    rd.stops.forEach((s, k) => {
      const x = sx(k), past = k < rd.i || (k === rd.i && rd.state === 'reward'), cur = k === rd.i && this.phase !== 'march';
      g.save(); if (past) g.globalAlpha = 0.4;
      if (s.type === 'fork') { seal(g, x, cy - 11, 20, STOP[s.a.type].ch, STOP[s.a.type].col); seal(g, x, cy + 11, 20, STOP[s.b.type].ch, STOP[s.b.type].col); }
      else { const v = STOP[s.type], sz = cur ? 34 : s.type === 'boss' ? 32 : 26; if (cur) ell(g, x, cy, 22 + Math.sin(T * 5) * 1.5, 22 + Math.sin(T * 5) * 1.5, null, OCHRE, 2.4); seal(g, x, cy, sz, v.ch, v.col); }
      g.restore(); if (past) icon.check(g, x, cy, 0.9, true);
    });
    icon.flag(g, mx, cy - 18 + Math.abs(Math.sin(T * 6)) * (this.phase === 'march' ? 3 : 0), 0.9, OCHRE);
    // 오른쪽: 엽전, 보물, 빠르기, 멈춤
    panel(g, 928, 14, 128, 36, 'tag'); icon.coin(g, 948, 32, 11); text(g, String(r.gold), 1004, 33, { size: 20, font: FONT_B, maxW: 80 });
    if (iconBtn(g, 'relics', 1066, 13, 62, 38, (gg, x, y) => { if (r.relics.length) relicIcon(gg, r.relics[r.relics.length - 1], x - 12, y, 0.52); else text(gg, '보', x - 12, y + 1, { size: 18, font: FONT_B, fill: SUB }); text(gg, String(r.relics.length), x + 15, y + 1, { size: 19, font: FONT_B }); })) this.sub = new RelicView({ onClose: () => { this.sub = null; } });
    if (iconBtn(g, 'speed', 1138, 13, 58, 38, (gg, x, y) => text(gg, '×' + this.speed, x, y + 1, { size: 22, font: FONT_B, fill: this.speed > 1 ? RED : INK }), { on: this.speed > 1 })) this.speed = this.speed === 1 ? 2 : 1;
    if (iconBtn(g, 'menu', 1206, 13, 60, 38, icon.menu)) this.menu = true;
    // 싸움 중: 전공 조건과 두목 체력
    if (fight && this.enc) {
      const e = this.enc;
      [[`손실 ${b.waveLost}/${e.starDeaths}`, b.waveLost <= e.starDeaths], [`${Math.ceil(b.waveT)}/${e.starTime}초`, b.waveT <= e.starTime]].forEach(([s, ok], k) => { const x = 16 + k * 128; g.globalAlpha = ok ? 0.95 : 0.55; panel(g, x, 74, 120, 28, 'tag'); icon.check(g, x + 16, 88, 0.7, ok); text(g, s, x + 68, 89, { size: 15, fill: ok ? INK : '#8f897a', maxW: 86 }); g.globalAlpha = 1; });
      const left = b.count(1) + b.pending; g.globalAlpha = 0.95; panel(g, 1150, 74, 114, 28, 'tag'); g.globalAlpha = 1; text(g, `요괴 ${left}`, 1207, 89, { size: 15, fill: RED });
      const boss = b.units.find(u => !u.dead && u.def.boss);
      if (boss && !this.aim) { rr(g, 400, 74, 480, 30, 8, PAPER, INK, 2); text(g, boss.def.name, 414, 90, { size: 18, font: FONT_B, fill: RED, align: 'left', maxW: 110 }); bar(g, 530, 81, 340, 16, boss.hp / boss.maxHp, RED, { back: '#d9cdb0' }); }
    }
  }
  // 손패 한 칸
  handCard(g, n, x, y, w, h, b, i, live) {
    const c = b.hand[n], an = this.slotAnim[n] || (this.slotAnim[n] = { c: null, t: 9 });
    if (an.c !== c) { an.c = c; an.t = 0; if (c && this.T > 0.5) sfx('card'); } an.t += this.dt;
    if (!c) {
      g.globalAlpha = 0.5; g.setLineDash([7, 6]); rr(g, x + 3, y + 3, w - 6, h - 6, 8, null, INK, 1.6); g.setLineDash([]); g.globalAlpha = 1;
      if (b.drawPile.length + b.discard.length > 0) { const f = clamp(1 - b.slotT[n] / (REFILL * b.mods.drawRate), 0, 1); g.beginPath(); g.arc(x + w / 2, y + h / 2 - 6, 22, -Math.PI / 2, -Math.PI / 2 + TAU * f); inkStroke(g, INDIGO, 5); text(g, '뽑는 중', x + w / 2, y + h - 24, { size: 14, fill: SUB }); }
      else text(g, '패 없음', x + w / 2, y + h / 2, { size: 14, fill: SUB });
      return;
    }
    const why = b.whyNot(n), can = why === '', a = this.aim, armed = a && a.slot === n;
    if (live && i.pressed && inRect(i, x, y, w, h)) { if (!can) this.deny(n); else if (armed && a.armed) this.aim = null; else { this.aim = { slot: n, card: c, drag: true, armed: false, live: false }; this.order = null; sfx('click'); } }
    const k = clamp(an.t / 0.22, 0, 1), up = armed ? (a.drag && i.y < BAR_Y - 8 ? 0 : -12) : 0, yy = y + up + (1 - easeOutBack(k)) * 46;
    g.save(); g.globalAlpha = k * (armed && a.drag && i.y < BAR_Y - 8 ? 0.35 : 1);
    if (armed) rr(g, x - 4, yy - 4, w + 8, h + 8, 12, null, OCHRE, 4);
    cardFace(g, c, x, yy, w, h, { cost: b.free > 0 ? 0 : b.costOf(c), dim: !can, free: b.free > 0 });
    if (why === 'cap' || why === 'hero') { rr(g, x + 10, yy + h / 2 - 14, w - 20, 28, 6, 'rgba(31,42,68,0.86)'); text(g, why === 'cap' ? '부대 가득' : CARDS[c.id].kind === 'lead' ? '출전 중' : '영웅 없음', x + w / 2, yy + h / 2 + 1, { size: 17, font: FONT_B, fill: C.cream }); }
    g.restore();
    text(g, String(n + 1), x + w - 10, y + h - 4, { size: 11, fill: SUB });
  }
  drawBar(g, b, i, live) {
    panel(g, 0, BAR_Y, W, H - BAR_Y, 'tray');
    text(g, '사기', 16, 588, { size: 21, font: FONT_B, align: 'left' }); text(g, b.morale.toFixed(0) + ' / 10', 226, 589, { size: 15, fill: SUB, align: 'right' });
    for (let k = 0; k < 10; k++) { const f = clamp(b.morale - k, 0, 1), cx = 34 + (k % 5) * 42, cy = 618 + Math.floor(k / 5) * 32; icon.coin(g, cx, cy, 13, f >= 1); if (f > 0 && f < 1) { g.save(); g.beginPath(); g.rect(cx - 13, cy + 13 - 26 * f, 26, 26 * f); g.clip(); icon.coin(g, cx, cy, 13, true); g.restore(); } }
    const n = b.squadCount(), full = n >= b.cap;
    icon.people(g, 26, 690, 0.95, full ? RED : INDIGO); text(g, `부대 ${n} / ${b.cap}`, 44, 691, { size: 17, align: 'left', fill: full ? RED : INK });
    cardBack(g, 150, 677, 18, 26); text(g, String(b.drawPile.length), 176, 691, { size: 17, font: FONT_B, align: 'left' }); g.globalAlpha = 0.55; cardBack(g, 198, 677, 18, 26); g.globalAlpha = 1; text(g, String(b.discard.length), 224, 691, { size: 17, font: FONT_B, align: 'left', fill: SUB });
    for (let k = 0; k < HAND; k++) this.handCard(g, k, 248 + k * 136, 574, 128, 138, b, i, live);
    if (button(g, 'allhold', 936, 574, 162, 62, '전군 대기', { style: 'navy', size: 24, r: 10 }) && live) this.allOrder(true);
    if (button(g, 'allgo', 1106, 574, 162, 62, '전군 돌격', { style: 'red', size: 24, r: 10 }) && live) this.allOrder(false);
    if (button(g, 'redraw', 936, 646, 162, 62, '패 갈기 · 사기 1', { style: b.canRedraw() ? 'paper' : 'grey', size: 19, r: 10 }) && live) { if (b.redraw()) this.aim = null; else sfx('deny'); }
    if (button(g, 'deck', 1106, 646, 162, 62, `덱 ${this.r.deck.length}장`, { style: this.r.items.length ? 'teal' : 'paper', size: 22, r: 10 }) && !this.over) this.sub = new DeckView({ P: b.power * b.mods.cardPow, onChange: () => this.sync(), onClose: () => { this.sub = null; this.sync(); } });
  }
  drawNotes(g, b) {
    const nt = this.note, gr = this.grade;
    if (nt) { const k = clamp(Math.min(nt.t / 0.3, 1), 0, 1); g.save(); g.globalAlpha = k; g.translate(0, (1 - easeOutBack(k)) * -20); brushTitle(g, 640, 210, 520, 76, nt.s, nt.col, 40); if (nt.sub) { rr(g, 340, 258, 600, 36, 18, 'rgba(248,240,220,0.92)', INK, 1.6); text(g, nt.sub, 640, 277, { size: 18, maxW: 570 }); } g.restore(); }
    if (gr && this.phase === 'clear') {
      const t = gr.t, kk = clamp((t - 0.25) / 0.16, 0, 1), sc = 2.2 - 1.2 * kk;
      text(g, '물리쳤다!', 560, 300, { size: 64, font: FONT_B, stroke: PAPER, lw: 12 });
      if (t > 0.25) { if (!gr.stamped && kk >= 1) { gr.stamped = true; sfx('star'); this.view.fx.shake = 6; } g.save(); g.globalAlpha = kk; g.translate(760, 300); g.scale(sc, sc); stamp(g, 0, 0, 52, GRADE[gr.grade], RED); g.restore(); }
      if (t > 0.5) { rr(g, 540, 360, 200, 44, 22, PAPER, INK, 2); icon.coin(g, 574, 382, 14); text(g, `엽전 +${gr.gold}`, 652, 383, { size: 23, font: FONT_B }); }
    }
    if (this.phase === 'over') { g.fillStyle = `rgba(31,42,68,${clamp((1.8 - this.endT) / 1.2, 0, 0.6)})`; g.fillRect(0, 0, W, H); text(g, '깃발을 모두 잃었습니다', 640, 320, { size: 54, font: FONT_B, fill: C.cream, stroke: INK, lw: 8 }); }
    if (this.toastT > 0) { g.globalAlpha = clamp(this.toastT / 0.3, 0, 1); rr(g, 290, 502, 700, 46, 23, PAPER, INK, 2.4); text(g, this.toastS, 640, 526, { size: 19, maxW: 670 }); g.globalAlpha = 1; }
  }
  drawMenu(g) {
    const r = this.r;
    g.fillStyle = 'rgba(31,42,68,0.55)'; g.fillRect(0, 0, W, H);
    panel(g, 380, 96, 520, 530); brushTitle(g, 640, 102, 280, 62, '잠시 멈춤', INDIGO, 34);
    text(g, `${CHAPTERS[Math.min(2, r.ch)].name}  ·  이긴 싸움 ${r.wins}`, 640, 172, { size: 19, fill: SUB, maxW: 460 });
    if (button(g, 'm1', 450, 200, 380, 66, '계속하기', { size: 32 })) this.menu = false;
    if (button(g, 'm2', 450, 278, 380, 56, `덱 살피기 · ${r.deck.length}장`, { style: 'paper', size: 25 })) this.sub = new DeckView({ P: this.b.power * this.b.mods.cardPow, onChange: () => this.sync(), onClose: () => { this.sub = null; this.sync(); } });
    if (button(g, 'm3', 450, 344, 380, 56, `지닌 보물 · ${r.relics.length}`, { style: 'paper', size: 25 })) this.sub = new RelicView({ onClose: () => { this.sub = null; } });
    if (button(g, 'm4', 450, 410, 380, 56, audio.muted ? '소리 켜기' : '소리 끄기', { style: 'paper', size: 25 })) setMuted(!audio.muted);
    if (button(g, 'm5', 450, 476, 380, 56, '처음 화면으로', { style: 'paper', size: 25 })) nav.go('title');
    text(g, '패 끌기 = 병력 세우기·전술 쓰기  ·  부대 끌기 = 이동  ·  요괴 위에 놓기 = 집중 공격', 640, 560, { size: 14.5, fill: SUB, maxW: 480, weight: 400 });
    text(g, '키보드: 1~5 패 고르기 · Q 전군 대기 · E 전군 돌격 · R 패 갈기 · F 빠르기 · 스페이스 멈춤', 640, 584, { size: 14.5, fill: SUB, maxW: 480, weight: 400 });
    text(g, '진행은 칸마다 저장됩니다 (싸움 도중에 나가면 그 싸움부터 다시)', 640, 606, { size: 13.5, fill: SUB, maxW: 480, weight: 400 });
  }
}
