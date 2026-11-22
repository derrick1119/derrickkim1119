// 행군 장면: 원정 전체가 이 한 장면에서 끊김 없이 이어진다
// 행군 → (요괴 물결 | 갈림길 푯말 | 길가의 사건·장터·주막·보물) → 전리품 → 다시 행군 …
import { W, H, VIEW, HUD_H, BAR_Y } from '../config.js';
import { TAU, INK, PAPER, RED, REDD, INDIGO, NAVY, TEAL, OCHRE, SUB, FONT_B, text, textBlock, ell, rr, rrPath, poly, line, st as inkStroke, clamp, easeOutBack, iga } from '../render/draw.js';
import { BattleView, ghostUnits } from '../render/battleview.js';
import { Battle, formation, defOf, HAND, REFILL } from '../sim/battle.js';
import { G, meta, save, battleSetup, waveSetup, mods, powerNow, goldFor, curStop, chooseFork, encounterHere, advance, genShop, pickEvent, hearTale, taleView, settleBattle, lootTable, grantLoot, tacticCards, addCard, noteDeed, STOP } from '../state.js';
import { MARCH as MARCH_TALK, HERO_TALK, CHATTER, FIRST_SIGHT, BOSS, bondLines, bossPlay } from '../data/story.js';
import { Play, drawFrame } from '../ui/theater.js';
import { juice, SPOT } from '../ui/juice.js';
import { CHAPTERS, ORD, chapterOf } from '../data/stages.js';
import { AFFIX } from '../data/encounters.js';
import { CARDS, KIND, cardName, isUnit } from '../data/cards.js';
import { eventView } from '../data/events.js';
import { RELICS } from '../data/relics.js';
import { UNITS, HERO_SKILLS, HERO_TRAIT, COMBOS, SYNERGIES } from '../data/units.js';
import { TERRAINS, SKY } from '../data/terrain.js';
import { portrait, getLook } from '../render/sprites.js';
import { ui, button, iconBtn, panel, bar, icon, seal, stamp, brushTitle, bubble, C, inRect, tapped } from '../ui/ui.js';
import { cardFace, cardBack, cardText, DeckView, RelicView } from '../ui/cards.js';
import { RewardOverlay, ShopOverlay, ChoiceOverlay, ForkOverlay, StoryOverlay, restChoices } from '../ui/overlays.js';
import { cardIcon, relicIcon } from '../render/icons.js';
import { sfx, audio, setMuted } from '../audio.js';
import { nav } from '../nav.js';
import { drawInk, MEOK, JU } from '../render/ink.js';
import { symbol, inkGlyph, inkMark } from '../render/symbols.js';

const NUM = ['', '하나', '둘', '셋', '넷', '다섯'];
export const GRADE = ['', 'star1', 'star2', 'star3'];   // 전공 등급: 붓으로 찍는 별 하나·둘·셋
// 고개 하나가 인형극의 한 마당이다
const MARCH = 520, MARCH_V = 300;
const FIGHT = t => t === 'battle' || t === 'elite' || t === 'boss';
const talkTime = s => clamp(1.3 + s.length * 0.07, 2, 3.6);
const DOK = ['goblin', 'orc', 'garcher', 'rshield', 'shaman', 'dueok', 'yagwang'], GHOST = ['skel', 'skelarcher'];

export class RunScene {
  constructor() {
    const r = this.r = G.run; this.ch = r.ch;
    this.b = new Battle(battleSetup()); for (const u of this.b.units) u.born = -9; this.view = new BattleView(chapterOf(r.ch).theme, r.ch * 31 + 7);
    this.T = 0; this.dt = 0; this.speed = 1; this.slow = 1; this.menu = false; this.over = null; this.sub = null;
    this.order = null; this.aim = null; this.slotAnim = []; this.toastS = ''; this.toastT = 0; this.note = null; this.grade = null; this.enc = null; this.fade = 0; this.endT = 0; this.joinQ = [];
    this.first = (meta.runs || 0) <= 1 && r.wins === 0; this.hints = 0; this.talk = null; if (!r.seen) r.seen = {}; this.stock = {}; this.lootT = 0;
    const rd = r.road;
    juice.clear();
    if (rd.i === 0 && rd.state !== 'reward') { this.note = { s: chapterOf(r.ch).name, sub: chapterOf(r.ch).sub, col: INDIGO, t: 4.2 }; this.curtain = { t: 0, s: chapterOf(r.ch).tale, n: ORD[chapterOf(r.ch).n] + ' 마당' }; }
    if (rd.state === 'reward') { this.phase = 'stop'; this.reward(curStop().type); }
    else if (rd.state === 'at') { this.phase = 'march'; this.arrive(); }
    else this.march(r.wins === 0 && rd.i === 0 ? 300 : MARCH, true);
  }
  toast(s, t = 2.4) { this.toastS = s; this.toastT = t; }
  sync() { const b = this.b, r = this.r; settleBattle(b); b.mods = mods(); b.cap = r.cap; b.power = powerNow(); b.lootTable = lootTable(); b.mastery = r.mastery || {}; b.syncDeck(r.deck); }

  // ───────── 흐름 ─────────
  march(dist = MARCH, quiet) {
    const st = curStop(), lines = this.marchLines(st); this.phase = 'march'; this.over = null; this.b.beginMarch();
    // 말할 거리가 있으면 그만큼 더 걷는다 (고개 이름 띠가 걷힌 뒤에 말을 꺼낸다)
    if (lines) { this.say(lines); dist = Math.max(dist, (lines.reduce((a, l) => a + talkTime(l[1]), 0) + (this.note ? this.note.t : 0) + 0.3) * MARCH_V); }
    this.left = dist;
    if (st) this.view.addProp(st.type, this.view.scroll + dist + (FIGHT(st.type) ? 1190 : 1010), FIGHT(st.type) ? 196 : 152, FIGHT(st.type));   // 싸움터의 깃대는 '요괴 N' 패널 아래로 내려 꽂는다
    if (!quiet) sfx('order');
  }
  arrive() {
    const r = this.r, b = this.b, rd = r.road, st = curStop(); rd.state = 'at'; this.sync(); this.bossSaid = false; this.storyDone = false;
    const done = () => this.leave();
    if (st.type === 'fork') { this.phase = 'stop'; this.over = new ForkOverlay({ a: st.a, b: st.b, onPick: k => { chooseFork(k); this.over = null; this.arrive(); } }); }
    else if (st.type === 'battle' || st.type === 'elite' || st.type === 'boss') {
      // 싸움터를 먼저 차린다(지형·하늘). 요괴가 닿기 전 잠깐이 진형을 고칠 시간이다
      const e = this.enc = encounterHere(); b.prepWave(waveSetup(e)); this.phase = 'prep'; this.prepT = e.boss ? 8 : this.first ? 5.5 : 4; this.grade = null;   // 두목 앞에서는 두목의 수를 읽을 틈을 준다
      this.note = { s: e.name, sub: e.boss ? (BOSS[e.key] ? BOSS[e.key].sub : '두목과의 싸움') + (e.with ? ' · ' + e.with : '') : e.affix ? `강적 — ${AFFIX[e.affix].name}: ${AFFIX[e.affix].desc}` : iga(e.enemyName) + ' 몰려옵니다', col: e.boss || e.affix ? RED : INDIGO, t: 2.2, ch: e.boss ? 'boss' : st.type === 'elite' ? 'elite' : 'battle', chCol: e.boss ? '#f1e2c0' : undefined };
      if (e.boss) sfx('boss');
    }
    else if (st.type === 'event') { this.phase = 'stop'; const id = r.pending && r.pending.kind === 'event' ? r.pending.id : pickEvent(); r.pending = { kind: 'event', id }; const v = eventView({ id }); this.over = new ChoiceOverlay({ title: v.title, art: v.art, after: v.after, text: v.text, choices: v.choices, onDone: done }); }
    else if (st.type === 'shop') { this.phase = 'stop'; const items = r.pending && r.pending.kind === 'shop' ? r.pending.items : genShop(); r.pending = { kind: 'shop', items }; this.over = new ShopOverlay({ items, onDone: done }); }
    else if (st.type === 'rest') { this.phase = 'stop'; b.repair(1); const tl = r.pending && r.pending.kind === 'rest' ? r.pending : Object.assign({ kind: 'rest' }, hearTale(r.ch)); r.pending = tl; this.welcome(noteDeed()); this.over = new ChoiceOverlay({ title: '주막', art: 'jumo', col: '#2f6f5c', text: '고갯마루 주막에서 수레를 고칩니다.\n주모가 옛이야기 한 토막을 들려줍니다.', tale: taleView(tl), choices: restChoices(), onDone: done }); }
    else { this.phase = 'stop'; this.reward('treasure'); }
    save();
  }
  // 전리품. 다른 영웅이 합류했으면 두 영웅이 몇 마디 나눈 뒤에 떠난다
  reward(kind) {
    const r = this.r, leads = () => r.deck.filter(c => CARDS[c.id].kind === 'lead').map(c => CARDS[c.id].unit), before = leads();
    this.phase = 'stop'; this.over = new RewardOverlay({ kind, onDone: () => { const who = leads().find(h => !before.includes(h)); if (who && before.length) this.over = new StoryOverlay({ lines: bondLines(who, before[0]), onDone: () => this.leave() }); else this.leave(); } });
  }
  // 싸움이 끝나면: 두목이었다면 사연을 듣고 나서 전리품을 고른다
  afterWave() {
    const e = this.enc, st = e.boss && BOSS[e.key];
    if (st && !this.storyDone) { this.storyDone = true; this.phase = 'stop'; this.talk = null; this.over = new Play({ beats: bossPlay(e.key, this.r.hero), title: e.name, onDone: () => { this.over = null; this.reward(e.kind); } }); } else this.reward(e.kind);
  }

  // ───────── 한 줄 대사: 걷거나 싸우는 인형 머리 위에 뜬다 ─────────
  // lines: [[말하는 이, 글, (자리)], …]. 말하는 이가 전장에 없으면 그 줄은 건너뛴다
  say(lines) { if (lines && lines.length) this.talk = { q: lines.slice(), cur: null, t: 0, last: null }; }
  speaker(who, last) {
    const b = this.b, ok = u => !u.dead && u.hidden <= 0 && u.x > 30 && u.x < W - 30;
    if (who === 'B') return b.units.find(u => ok(u) && u.def.boss) || null;
    if (who === 'H') who = this.r.hero;
    if (who !== 'S') return b.units.find(u => ok(u) && u.type === who) || null;
    const pool = b.units.filter(u => ok(u) && u.team === 0 && !u.def.hero && !u.def.structure && !u.temp), other = pool.filter(u => !last || u.squad !== last.squad);
    const from = other.length ? other : pool; return from.length ? from[(Math.random() * from.length) | 0] : null;
  }
  marchLines(st) {
    if (!st) return null; const r = this.r, M = MARCH_TALK[Math.min(MARCH_TALK.length - 1, r.ch)], i = r.road.i;
    const ls = st.type === 'boss' ? M.boss : [M.seq[0], M.seq[1], [['H', HERO_TALK[Math.min(2, Math.floor(r.ch / 4))][r.hero]]], M.seq[2]][i] || CHATTER[(i + r.ch) % CHATTER.length];
    const heard = (meta.seen.talk || 0) > r.ch, live = (heard && st.type !== 'boss' ? ls.slice(0, 1) : ls).filter(l => this.speaker(l[0])); return live.length ? live : null;
  }
  talkTick(dt) {
    const k = this.talk; if (!k) return; if (!k.cur && this.note) return;
    if (k.cur) { if (this.note) return; k.t -= dt; if (k.cur.u.dead) k.t = Math.min(k.t, 0.25); if (k.t > 0) return; k.cur = null; }
    while (k.q.length) { const l = k.q.shift(), u = l[2] || this.speaker(l[0], k.last); if (!u) continue; k.cur = { u, s: l[1], t0: this.T }; k.last = u; k.t = talkTime(l[1]); return; }
    this.talk = null;
  }
  drawTalk(g) {
    const k = this.talk; if (!k || !k.cur || this.note) return; const u = k.cur.u, L = u.type ? getLook(u.type) : null;
    const top = u.h || (L ? Math.min(150, L.h * L.scale + (L.float ? 12 : 4)) : 70);
    bubble(g, clamp(u.x, 30, W - 30), Math.max(HUD_H + 70, u.y - top - 26 - (u.jumpH || 0)), k.cur.s, easeOutBack(clamp((this.T - k.cur.t0) / 0.18, 0, 1)));
  }
  // 지금 칸을 마치고 다시 걷는다 (두목을 물리쳤으면 다음 고개로)
  leave() {
    const r = this.r; this.over = null; this.sync();
    if (advance()) { meta.seen.talk = 3; this.phase = 'over'; nav.go('end', { win: true }); return; }
    if (r.ch !== this.ch) { meta.seen.talk = Math.max(meta.seen.talk || 0, r.ch); this.ch = r.ch; this.fade = 1; this.curtain = { t: 0, s: chapterOf(r.ch).tale, n: ORD[chapterOf(r.ch).n] + ' 마당' }; this.sync(); this.note = { s: chapterOf(r.ch).name, sub: '깃발 하나를 되찾고 · 부대 한도 +1 · 모든 병력 패 +1단', col: INDIGO, t: 3.2 }; sfx('win'); }
    this.march();
  }
  waveClear(e) {
    const r = this.r, b = this.b, enc = this.enc, c1 = e.lost <= enc.starDeaths, c2 = e.time <= enc.starTime, grade = 1 + (c1 ? 1 : 0) + (c2 ? 1 : 0), gold = goldFor(grade, enc.kind);
    r.gold += gold; r.merit = (r.merit || 0) + grade; r.wins++; r.kills = b.kills; r.lost = b.lost; r.nextMorale = 0; r.road.state = 'reward';
    settleBattle(b); if (enc.kind !== 'battle') { const got = grantLoot(enc.kind === 'boss' ? 3 : 2); this.toast(`${enc.kind === 'boss' ? '두목' : '강적'}의 짐에서 패 ${got.length}장을 노획 — ${got.join(', ')}`, 4.5); this.sync(); }
    this.grade = { grade, gold, t: 0, stamped: false }; this.phase = 'clear'; this.order = null; this.aim = null; sfx('win'); save();
    // 번 엽전이 주머니로 날아간다
    for (let q = 0; q < Math.min(8, 3 + Math.round(gold / 15)); q++) juice.fly({ draw: (gg, x, y, s) => icon.coin(gg, x, y, 13 * s, true), x0: 590 + q * 14, y0: 382, x1: SPOT.gold[0], y1: SPOT.gold[1], s0: 1, s1: 0.8, arc: 60 + q * 8, delay: 0.35 + q * 0.05, dur: 0.5, col: '#f0d264' });   // 전리품 화면이 뜨기 전에 다 닿는다
    // 영물의 인연: 밤 싸움·강적·두목을 이긴 공, 깃발을 지켜 낸 공을 적는다
    this.welcome([].concat(enc.sky === 'night' ? noteDeed('night') : [], enc.kind === 'elite' ? noteDeed('elite') : [], enc.kind === 'boss' ? noteDeed('boss') : [], enc.kind === 'boss' && r.flags >= 3 ? noteDeed('safe') : []));
  }
  // 새로 인연을 맺은 영물은 그 자리에서 군대에 합류한다 (알림은 다른 알림이 끝난 뒤에 차례로 뜬다)
  welcome(list) { if (!list || !list.length) return; for (const bt of list) { addCard('u_' + bt.id); this.joinQ.push(bt); } this.sync(); }
  // 요괴가 쓰러질 때: 두목의 마지막 한마디, 처음 보는 것에 놀란 병사의 한마디
  onDeath(e) {
    const r = this.r;
    if (e.boss && this.enc && BOSS[this.enc.key]) { this.say([[null, BOSS[this.enc.key].fall, { x: e.x, y: e.y, h: 96 }]]); return; }
    const kind = DOK.includes(e.utype) ? 'dok' : GHOST.includes(e.utype) && e.last ? 'ghost' : null;
    if (kind && !r.seen[kind] && !this.talk) { r.seen[kind] = 1; this.say(FIRST_SIGHT[kind]); }
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
    const busy = !!(this.over || this.sub || this.menu);   // 다른 화면이 떠 있으면 알림은 멈춰 기다린다
    if (this.toastT > 0) this.toastT -= dt; if (this.note) { if (!busy) { this.note.t -= dt; if (this.note.t <= 0) this.note = null; } }
    else if (!this.deedSeen) { this.deedSeen = true; this.welcome(noteDeed()); }   // 지난 원정까지 쌓인 공으로 이미 채운 인연
    else if (this.joinQ.length && !busy && (this.phase === 'march' || this.phase === 'prep')) { const bt = this.joinQ.shift(), nm = UNITS[bt.id].name; this.note = { s: `${nm} — 영물의 인연`, sub: `${nm} 패가 덱에 들어왔습니다 · 앞으로 전리품과 장터에도 나옵니다`, col: TEAL, t: 4.4, ch: 'bond', beast: bt.id }; sfx('star'); }
    const live = !this.menu && !this.over && !this.sub && this.phase !== 'over' && this.phase !== 'stop';
    if (live) this.input(i);
    const aiming = this.aim && (this.aim.live || (this.aim.drag && i.y < BAR_Y - 8)), want = (this.order && this.order.moved) || aiming ? 0.12 : 1;
    this.slow += (want - this.slow) * Math.min(1, dt * 16);
    if (!this.menu && !this.sub && this.phase !== 'stop') {
      const ts = this.slow * (this.phase === 'over' ? 0.3 : 1);
      for (let k = 0; k < this.speed; k++) {
        if (this.phase === 'march') { const dx = MARCH_V * dt * ts, ahead = b.march(dx, dt * ts); view.scroll += dx; view.fx.shift(dx); this.left -= dx; if (this.left <= 0 && (ahead < 6 || this.left < -700)) { this.arrive(); break; } }
        b.step(dt * ts);
        if (this.phase === 'prep') { this.prepT -= dt * ts; if (this.prepT <= 0) { b.startWave(this.enc.enemy, waveSetup(this.enc)); this.phase = 'fight'; } }
        this.talkTick(dt * ts);
        if (this.phase === 'fight' && this.enc.boss && !this.bossSaid && BOSS[this.enc.key] && this.speaker('B')) { this.bossSaid = true; this.say([['B', BOSS[this.enc.key].enter]]); }
        settleBattle(b);
        for (const e of view.handle(b, sfx)) { if (e.type === 'waveClear' && this.phase === 'fight') this.waveClear(e); else if (e.type === 'bannerDown' && this.phase !== 'over') this.bannerDown(); else if (e.type === 'synergy') this.toast(`진법 발동 — ${e.name}: ${e.desc}`, 2.8); else if (e.type === 'chase') this.note = { s: '뒤에서 어둠이 밀려온다!', sub: '쫓기던 요괴들이 더 몰려옵니다 — 서둘러 물리치세요', col: RED, t: 2.2 }; else if (e.type === 'death') this.onDeath(e); else if (e.type === 'loot') { if (e.x !== undefined) juice.fly({ draw: (gg, x, y, s) => cardFace(gg, { id: e.id, up: e.up }, x - 46 * s, y - 62 * s, 92 * s, 124 * s), x0: clamp(e.x, 150, 1130), y0: clamp(e.y - 56, HUD_H + 90, BAR_Y - 80), x1: SPOT.pouch[0], y1: SPOT.pouch[1], s0: 1, s1: 0.22, arc: 90, dur: 0.6, hold: 0.55, onArrive: () => { this.lootT = 1; } }); else this.lootT = 1; if (!r.seen.loot && !this.talk) { r.seen.loot = 1; this.toast(`요괴 무리를 ${NUM[b.mods.lootEvery] || b.mods.lootEvery} 물리칠 때마다 패를 한 장 노획합니다 (주머니 ${b.mods.pouch}장까지)`, 4.5); } } else if (e.type === 'lootFull') this.toast(`주머니가 가득 차 패를 줍지 못했습니다 (${b.mods.pouch}장) — 아끼지 말고 쓰세요`, 3.6); else if (e.type === 'squadLost' && !e.again && !r.seen.bench) { r.seen.bench = 1; this.toast('전멸한 부대는 이 싸움이 끝나야 다시 세울 수 있습니다', 4); } else if (e.type === 'combo') this.note = { s: '합동기 — ' + e.name, sub: '', col: '#b8742a', t: 1.8 }; }
      }
      view.fx.update(dt * Math.max(0.35, ts));
      if (this.phase === 'clear') { this.grade.t += dt; if (this.grade.t > 1.5) this.afterWave(); }
      if (this.phase === 'over') { this.endT -= dt; if (this.endT <= 0 && !this.gone) { this.gone = true; nav.go('end', { win: false }); } }
      if (this.first && this.phase === 'fight' && this.toastT <= 0) { if (this.hints === 0 && b.waveT > 1.5) { this.toast('아래 병력 패를 전장으로 끌어다 놓으면 부대가 섭니다 (사기를 냅니다)', 5); this.hints = 1; } else if (this.hints === 1 && b.waveT > 9) { this.toast('전술 패는 한 번 쓰면 사라집니다 — 전장의 노획과 전리품·장터·주막에서 다시 채웁니다', 6); this.hints = 2; } else if (this.hints === 2 && b.waveT > 18) { this.toast('부대를 끌면 이동, 요괴 위에 놓으면 집중 공격 · 끄는 동안 시간이 느려집니다', 5); this.hints = 3; } }
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
    if (!this.over && !this.menu && !this.sub && !juice.show && !(this.enc && this.enc.boss && this.phase === 'fight') && this.phase !== 'clear') this.drawTalk(g);
    view.fx.drawNums(g);   // 피해 숫자는 인형·효과·말풍선 위에
    if (this.slow < 0.9) { g.globalAlpha = (1 - this.slow) * 0.2; g.fillStyle = NAVY; g.fillRect(0, 0, W, H); g.globalAlpha = 1; }
    if (this.fade > 0) { // 고개가 바뀔 때: 종이가 하얗게 바랬다가 새 풍경으로
      const f0 = this.fade; this.fade = Math.max(0, this.fade - dt * 1.4); if (f0 > 0.5 && this.fade <= 0.5) view.setTheme(chapterOf(r.ch).theme, r.ch * 31 + 7);
      g.globalAlpha = 1 - Math.abs(this.fade - 0.5) * 2; g.fillStyle = '#f8f0dc'; g.fillRect(0, HUD_H, W, BAR_Y - HUD_H); g.globalAlpha = 1;
    }
    this.drawHud(g, b);
    // 마당이 바뀔 때: 싸움터가 곧 인형극 무대다. 막이 닫힌 채 마당 이름이 걸리고, 곧 막이 열린다 (그동안 곁의 표시는 숨긴다)
    const cur = this.curtain, open = cur ? clamp((cur.t - 1.1) / 1.0, 0, 1) : 1;
    if (cur) {
      cur.t += dt; const fadeOut = clamp((3.0 - cur.t) / 0.5, 0, 1);
      g.save(); g.globalAlpha = fadeOut; drawFrame(g, 20, HUD_H + 14, W - 40, BAR_Y - HUD_H - 34, open, this.T);
      const k = clamp(cur.t / 0.3, 0, 1) * clamp((1.9 - cur.t) / 0.4, 0, 1); if (k > 0) { g.globalAlpha = k; rr(g, 444, 256, 400, 96, 8, 'rgba(8,6,10,0.4)'); rr(g, 440, 250, 400, 96, 8, '#f3e7c8', INK, 3); rr(g, 448, 258, 384, 80, 5, null, 'rgba(122,74,44,0.75)', 1.6); text(g, cur.n || '', 640, 276, { size: 20, font: FONT_B, fill: '#7a4a2c' }); text(g, cur.s, 640, 312, { size: 40, font: FONT_B, fill: INK, maxW: 360 }); }
      g.restore(); if (cur.t > 3.0) this.curtain = null;
    }
    if (!cur || cur.t > 2.5) { g.save(); if (cur) g.globalAlpha = clamp((cur.t - 2.5) / 0.4, 0, 1); this.drawSide(g, b); g.restore(); }
    if (this.phase === 'prep' && (!cur || cur.t > 2.5)) this.drawPreview(g, b);
    if (this.phase === 'fight' && this.enc && this.enc.boss && b.waveT < 7 && !this.aim) this.drawBossTip(g, this.enc, clamp((4.5 - b.waveT) / 0.8, 0, 1), 112);   // 싸움이 시작되면 위쪽(두목 체력 아래)으로 옮겨 부대를 가리지 않는다
    this.drawBar(g, b, i, live);
    if (cur && open < 1) { g.fillStyle = `rgba(20,17,24,${0.5 * (1 - open)})`; g.fillRect(0, BAR_Y, W, H - BAR_Y); }
    this.drawNotes(g, b);
    if (this.over) this.over.frame(g, dt);
    if (this.menu && !this.sub) this.drawMenu(g);
    if (this.sub) this.sub.frame(g, dt);
    juice.frame(g, dt);
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
    panel(g, 0, 0, W, HUD_H, 'hud');
    for (let k = 0; k < 3; k++) icon.flag(g, 24 + k * 26, 30, 1.15, k < r.flags ? RED : '#566078');
    const hp = b.bannerHp(); text(g, '군기', 104, 21, { size: 14, fill: '#8fb6e6', align: 'left' }); bar(g, 104, 32, 120, 14, hp, hp < 0.35 ? '#e4826a' : '#8fb6e6');
    // 노정: 이번 고개에서 만날 것들
    const n = rd.stops.length, x0 = 330, x1 = 900, sx = k => x0 + k * (x1 - x0) / (n - 1), cy = 34;
    text(g, chapterOf(r.ch).short, 300, cy, { size: 18, font: FONT_B, fill: C.cream, align: 'right' });
    line(g, [x0, cy, x1, cy], 'rgba(8,12,26,0.55)', 6); line(g, [x0, cy, x1, cy], '#56648a', 2.4);
    const prog = this.phase === 'march' ? clamp(1 - this.left / MARCH, 0, 1) : 1, mx = rd.i === 0 ? sx(0) - 26 * (1 - prog) : sx(rd.i - 1) + (sx(rd.i) - sx(rd.i - 1)) * prog;
    line(g, [x0, cy, Math.max(x0, mx), cy], C.gilt, 2.8);
    rd.stops.forEach((s, k) => {
      const x = sx(k), past = k < rd.i || (k === rd.i && rd.state === 'reward'), cur = k === rd.i && this.phase !== 'march';
      g.save(); if (past) g.globalAlpha = 0.4;
      if (s.type === 'fork') { seal(g, x, cy - 12.5, 24, STOP[s.a.type].ch, STOP[s.a.type].col); seal(g, x, cy + 12.5, 24, STOP[s.b.type].ch, STOP[s.b.type].col); }
      else { const v = STOP[s.type], sz = cur ? 38 : s.type === 'boss' ? 36 : 31; if (cur) ell(g, x, cy, 22 + Math.sin(T * 5) * 1.5, 22 + Math.sin(T * 5) * 1.5, null, OCHRE, 2.4); seal(g, x, cy, sz, v.ch, v.col); }
      g.restore(); if (past) icon.check(g, x, cy, 0.9, true);
    });
    icon.flag(g, mx, cy - 18 + Math.abs(Math.sin(T * 6)) * (this.phase === 'march' ? 3 : 0), 0.9, OCHRE);
    // 오른쪽: 엽전, 보물, 빠르기, 멈춤
    panel(g, 928, 14, 128, 36, 'tag'); icon.coin(g, 948, 32, 11); text(g, String(r.gold), 1004, 33, { size: 20, font: FONT_B, maxW: 80 });
    if (iconBtn(g, 'relics', 1066, 13, 62, 38, (gg, x, y) => { if (r.relics.length) relicIcon(gg, r.relics[r.relics.length - 1], x - 12, y, 0.52); else symbol(gg, 'treasure', x - 12, y, 22, SUB); text(gg, String(r.relics.length), x + 15, y + 1, { size: 19, font: FONT_B }); })) this.sub = new RelicView({ onClose: () => { this.sub = null; } });
    if (iconBtn(g, 'speed', 1138, 13, 58, 38, (gg, x, y) => text(gg, '×' + this.speed, x, y + 1, { size: 22, font: FONT_B, fill: this.speed > 1 ? RED : INK }), { on: this.speed > 1 })) this.speed = this.speed === 1 ? 2 : 1;
    if (iconBtn(g, 'menu', 1206, 13, 60, 38, icon.menu)) this.menu = true;
    // 싸움 중: 전공 조건과 두목 체력
    if (b.sky !== 'day' && (fight || this.phase === 'prep')) { const lit = b.sky === 'night' && b.torch > 0; g.globalAlpha = 0.95; panel(g, 284, 74, lit ? 100 : 60, 28, 'tag'); g.globalAlpha = 1; text(g, lit ? `횃불 ${Math.ceil(b.torch)}초` : SKY[b.sky].name, lit ? 334 : 314, 89, { size: 15, fill: lit ? '#d9702a' : b.sky === 'night' ? '#3d3560' : '#2f6f9a', maxW: 90 }); if (tapped('sky', 284, 74, 100, 28)) this.toast(`${SKY[b.sky].name} — ${SKY[b.sky].desc}`, 4); }
    if (fight && this.enc) {
      const e = this.enc, cl = b.chaseLeft();
      if (cl < 40) { g.globalAlpha = 0.95; panel(g, 1016, 74, 126, 28, 'tag'); g.globalAlpha = 1; text(g, cl > 0 ? `본대 ${Math.ceil(cl)}초` : '본대 도착!', 1079, 89, { size: 15, fill: cl < 12 ? RED : INK }); }
      // 전공 조건: 한도를 넘기면 분수 대신 넘긴 값만 붉게 쓴다 (✕ 가 이미 실패를 알린다)
      const lostOk = b.waveLost <= e.starDeaths, timeOk = b.waveT <= e.starTime;
      [[lostOk ? `잃은 병사 ${b.waveLost}/${e.starDeaths}` : `잃은 병사 ${b.waveLost}명`, lostOk], [timeOk ? `시간 ${Math.ceil(b.waveT)}/${e.starTime}초` : `시간 ${Math.ceil(b.waveT)}초`, timeOk]].forEach(([s, ok], k) => { const x = 16 + k * 134; g.globalAlpha = 0.95; panel(g, x, 74, 130, 28, 'tag'); g.globalAlpha = 1; if (ok) icon.check(g, x + 15, 88, 0.7, true); else text(g, '✕', x + 15, 89, { size: 15, fill: RED }); text(g, s, x + 74, 89, { size: 15, fill: ok ? INK : RED, maxW: 100 }); });
      const left = b.count(1) + b.pending; g.globalAlpha = 0.95; panel(g, 1150, 74, 114, 28, 'tag'); g.globalAlpha = 1; text(g, `요괴 ${left}`, 1207, 89, { size: 15, fill: RED });
      const boss = b.units.find(u => !u.dead && u.def.boss);
      if (boss && !this.aim) { panel(g, 388, 72, 504, 34, 'tag'); text(g, boss.def.name, 404, 90, { size: 22, font: FONT_B, fill: RED, align: 'left', maxW: 170 }); bar(g, 584, 80, 296, 18, boss.hp / boss.maxHp, boss.open > 0 ? '#d9a41e' : RED, { back: '#d9cdb0' }); if (boss.tails !== undefined) for (let n = 1; n < 9; n++) { const tx = 584 + 296 * n / 9; line(g, [tx, 79, tx, 99], INK, 2); } if (boss.tails !== undefined) { if (this.tailsSeen !== boss.tails) { this.tailsSeen = boss.tails; this.tailT = 1.6; } const k = this.tailT > 0 ? (this.tailT -= 1 / 60) : 0, sc = 1 + 0.25 * Math.max(0, k - 1.2) / 0.4; g.save(); g.translate(944, 89); g.scale(sc, sc); panel(g, -48, -17, 96, 34, 'tag'); text(g, `꼬리 ${boss.tails}`, 0, 1, { size: 19, font: FONT_B, fill: RED }); g.restore(); } }
        // 알림 칸: 두목 체력 아래 한 칸에 지금 할 일을 하나만 쓴다 (빈틈 > 꼬리 > 홀림). 불투명한 한지 바탕에 짙은 글씨
        if (boss && !this.aim && b.waveT >= 7) {
          const charmed = b.units.some(u => !u.dead && u.team === 0 && u.charm > 0), tk = boss.tails !== undefined && this.tailT > 0;
          const mirror = boss.ai && boss.ai.mirror && !boss.ai.mirror.dead;
          const note = boss.open > 0 ? ['빈틈! 지금 몰아쳐라', '#8a2a14', true] : mirror ? ['업경대 — 때린 만큼 되돌아온다. 먼저 깨뜨려라', '#7a1f1c', false] : tk ? ['꼬리가 떨어졌다 — 더 사나워진다', RED, false] : charmed ? ['홀림 — 홀린 부대를 끌어서 깨워라', '#8a2f6a', false] : null;
          if (note) { g.font = `400 19px ${FONT_B}`; const w = g.measureText(note[0]).width + 40, x0 = 640 - w / 2; rr(g, x0 + 2, 111, w, 32, 8, 'rgba(30,24,20,0.3)'); rr(g, x0, 108, w, 32, 8, '#fbf3df', note[1], 2.6); if (note[2]) { g.globalAlpha = 0.5 + 0.5 * Math.sin(this.T * 10); rr(g, x0 - 3, 105, w + 6, 38, 10, null, '#f0b020', 3); g.globalAlpha = 1; } text(g, note[0], 640, 125, { size: 19, font: FONT_B, fill: note[1] }); }
        }
    }
  }
  // 왼쪽 가장자리: 전장의 영웅(기력과 다음 고유기), 합동기, 진법
  drawSide(g, b) {
    let y = 110; const heroes = b.units.filter(u => !u.dead && u.team === 0 && u.def.hero);
    for (const u of heroes) {
      const sk = HERO_SKILLS[u.type][u.skillI], gz = clamp(u.gauge, 0, 1);
      g.globalAlpha = 0.95; panel(g, 12, y, 212, 40, 'tag'); g.globalAlpha = 1;
      ell(g, 34, y + 20, 16, 16, '#efd9a8', INK, 1.4); ell(g, 34, y + 20, 13.4, 13.4, null, 'rgba(201,150,46,0.8)', 1); g.save(); g.beginPath(); g.arc(34, y + 20, 15, 0, TAU); g.clip(); portrait(g, u.type, 34, y + 58, 0.72); g.restore();
      text(g, u.def.name, 58, y + 12, { size: 14, align: 'left' }); text(g, sk.name, 216, y + 12, { size: 16, align: 'right', fill: gz > 0.9 ? RED : '#4a4034', font: FONT_B, maxW: 112 });
      bar(g, 58, y + 22, 156, 11, gz, gz > 0.9 ? '#f0d264' : OCHRE, { back: '#d9cdb0' });
      if (tapped('hc' + u.type, 12, y, 212, 40)) this.toast(u.type === this.r.hero ? `병법 '${HERO_TRAIT[u.type].name}' — ${HERO_TRAIT[u.type].desc}` : `${u.def.name}의 고유기 (기력이 차면 자동): ${HERO_SKILLS[u.type].map(s => s.name).join(' → ')}`, 5);
      y += 44;
    }
    const pair = b.heroPair(), combo = pair && COMBOS[pair.key];
    if (combo) { g.globalAlpha = 0.93; rr(g, 12, y, 212, 30, 7, '#fbf1cf', '#b8742a', 1.8); g.globalAlpha = 1; text(g, '합동기 · ' + combo.name, 20, y + 10, { size: 13, align: 'left', fill: '#b8742a', font: FONT_B }); bar(g, 20, y + 18, 196, 8, b.combo, '#d9702a', { back: '#d9cdb0' }); if (tapped('combo', 12, y, 212, 30)) this.toast(`합동기 ${combo.name} — ${combo.desc}`, 4); y += 34; }
    let k = 0;
    for (const sy of SYNERGIES) {
      const [n, need] = sy.n(b.synN), on = n >= need; if (!n) continue;
      const x = 12 + (k % 2) * 108, yy = y + Math.floor(k / 2) * 28; k++;
      g.globalAlpha = on ? 0.96 : 0.8; rr(g, x, yy, 104, 24, 6, on ? TEAL : PAPER, INK, 1.5); if (on) rr(g, x + 2.6, yy + 2.6, 98.8, 18.8, 3.6, null, 'rgba(226,184,90,0.7)', 0.9); g.globalAlpha = 1;
      text(g, on ? sy.name : `${sy.name} ${n}/${need}`, x + 52, yy + 13, { size: 13.5, fill: on ? C.cream : SUB, maxW: 94 });
      if (tapped('sy' + sy.id, x, yy, 104, 24)) this.toast(`진법 ${sy.name} (${sy.need}) — ${sy.desc}`, 3.5);
    }
  }
  // 싸움터에 닿았을 때: 다가오는 요괴와 지형·하늘을 알려 준다
  drawPreview(g, b) {
    const e = this.enc, m = new Map(); for (const [t, , , o] of e.enemy) m.set(t, (m.get(t) || 0) + 1);
    const types = [...m.keys()].slice(0, 8), rows = Math.ceil(types.length / 2), ter = TERRAINS[e.terrain] || TERRAINS.open, sky = SKY[e.sky] || SKY.day, h = 58 + rows * 46 + (ter.tip ? 56 : 26) + (e.sky !== 'day' ? 90 : 0), x = 944, y = 112;
    g.globalAlpha = 0.95; panel(g, x, y, 312, h); g.globalAlpha = 1;
    text(g, '다가오는 요괴', x + 18, y + 28, { size: 21, font: FONT_B, align: 'left', fill: RED });
    ell(g, x + 262, y + 28, 19, 19, PAPER, RED, 2.4); text(g, String(Math.max(1, Math.ceil(this.prepT))), x + 262, y + 29, { size: 22, font: FONT_B, fill: RED }); text(g, '개전까지', x + 237, y + 29, { size: 14.5, align: 'right', fill: '#4a4034', weight: 400 }); text(g, '초', x + 292, y + 30, { size: 15, fill: RED });
    types.forEach((t, k) => { const px = x + 18 + (k % 2) * 146, py = y + 52 + Math.floor(k / 2) * 46, d = UNITS[t]; rr(g, px, py, 38, 40, 5, '#efd9cf', INK, 1.2); g.save(); g.beginPath(); g.rect(px + 1, py + 1, 36, 38); g.clip(); portrait(g, t, px + 19, py + 38, d.boss ? 0.3 : d.large || d.mounted ? 0.5 : 0.6); g.restore(); text(g, d.name, px + 44, py + 13, { size: 14, align: 'left', maxW: 96 }); text(g, d.boss ? '두목' : `${m.get(t)}무리`, px + 44, py + 30, { size: 13, align: 'left', fill: SUB, weight: 400 }); });
    let yy = y + 60 + rows * 46;
    text(g, `지형 · ${ter.name}`, x + 18, yy, { size: 16, align: 'left', font: FONT_B }); if (ter.tip) { textBlock(g, ter.tip, x + 18, yy + 23, 278, 19, { size: 14.5, align: 'left', fill: '#4a4034', weight: 400 }); yy += 56; } else yy += 26;
    if (e.sky !== 'day') { text(g, `하늘 · ${sky.name}`, x + 18, yy, { size: 16, align: 'left', font: FONT_B, fill: e.sky === 'night' ? '#3d3560' : '#2f6f9a' }); textBlock(g, sky.desc, x + 18, yy + 23, 278, 19, { size: 14.5, align: 'left', fill: '#4a4034', weight: 400 }); }
    if (e.boss) this.drawBossTip(g, e, 1); else if (this.toastT <= 0) text(g, '진형을 고칠 시간입니다 — 부대를 끌어 옮기고 패를 미리 내세요', 640, 540, { size: 18, stroke: PAPER, lw: 5, maxW: 600 });
  }
  // 두목의 수: 이 두목과 어떻게 싸워야 하는지 (싸움이 시작된 뒤에도 잠시 남는다)
  drawBossTip(g, e, a, y = 440) {
    const d = UNITS[e.key]; if (!d || !d.tip || a <= 0) return;
    g.save(); g.globalAlpha = a * 0.95; panel(g, 300, y, 640, 112); g.globalAlpha = a; rr(g, 300, y, 8, 112, 4, RED);
    text(g, `${d.name} — 이렇게 싸운다`, 324, y + 22, { size: 19, font: FONT_B, align: 'left', fill: RED }); textBlock(g, d.tip, 324, y + 47, 598, 21, { size: 15.5, align: 'left', weight: 400 }); g.restore();
  }
  // 손패 한 칸
  handCard(g, n, x, y, w, h, b, i, live) {
    const c = b.hand[n], an = this.slotAnim[n] || (this.slotAnim[n] = { c: null, t: 9, last: null, burn: 9 });
    // 전술 패를 쓰면 그 자리에서 타서 사라진다 (병력 패는 전장으로 나간다)
    if (an.c !== c) { if (!c && an.c && !isUnit(an.c) && !b.drawPile.includes(an.c)) { an.last = an.c; an.burn = 0; } an.c = c; an.t = 0; if (c && this.T > 0.5) sfx('card'); } an.t += this.dt; an.burn += this.dt;
    if (!c) {
      rr(g, x + 3, y + 3, w - 6, h - 6, 8, 'rgba(6,10,22,0.3)'); g.setLineDash([7, 6]); rr(g, x + 3, y + 3, w - 6, h - 6, 8, null, 'rgba(164,175,204,0.55)', 1.4); g.setLineDash([]);
      if (an.burn < 0.5 && an.last) {
        const q = an.burn / 0.5, cut = y + h * (1 - q);
        g.save(); g.beginPath(); g.rect(x - 4, y - 4, w + 8, cut - y + 4); g.clip(); g.globalAlpha = 1 - q * 0.5; cardFace(g, an.last, x, y - q * 10, w, h, {}); g.restore();
        g.fillStyle = `rgba(255,150,50,${0.9 * (1 - q)})`; g.fillRect(x + 4, cut - 3, w - 8, 4); g.fillStyle = `rgba(40,30,30,${0.5 * (1 - q)})`; g.fillRect(x + 4, cut + 1, w - 8, 3);
        for (let k = 0; k < 7; k++) { const px = x + 10 + ((k * 37 + n * 13) % (w - 20)), py = cut - ((an.burn * 90 + k * 23) % 46); ell(g, px, py, 1.8, 1.8, k % 2 ? '#ffb03a' : '#5a4a44'); }
        return;
      }
      if (b.drawPile.length > 0) {
        const f = clamp(1 - b.slotT[n] / (REFILL * b.mods.drawRate), 0, 1); g.beginPath(); g.arc(x + w / 2, y + h / 2 - 6, 22, -Math.PI / 2, -Math.PI / 2 + TAU * f); inkStroke(g, C.gilt, 4.4);
        // 상쇠는 뽑기를 기다리지 않고 빈 자리에서 바로 신명풀이를 할 수 있다
        if (b.mods.scavAny) { const ok = b.canScavenge(n); text(g, '신명풀이', x + w / 2, y + h - 40, { size: 14.5, font: FONT_B, fill: ok ? C.cream : C.dim }); text(g, `눌러서 사기 ${b.scavCost()}`, x + w / 2, y + h - 21, { size: 12.5, fill: ok ? C.gilt : C.dim }); if (live && tapped('scav' + n, x, y, w, h)) { if (b.scavenge(n)) this.aim = null; else { sfx('deny'); this.toast(`사기가 ${b.scavCost()} 있어야 패를 얻습니다`, 1.6); } } }
        else text(g, '뽑는 중', x + w / 2, y + h - 24, { size: 14, fill: C.dim });
        return;
      }
      // 패가 떨어졌다: 사기를 내고 돌이라도 줍는다 (상쇠는 아무 전술 패나)
      const cost = b.scavCost(), any = b.mods.scavAny, ok = b.canScavenge(n);
      g.globalAlpha = ok ? 1 : 0.5; cardIcon(g, any ? 'pangut' : 'sling', x + w / 2, y + 46, 1.05); g.globalAlpha = 1;
      text(g, any ? '신명풀이' : '돌 줍기', x + w / 2, y + 88, { size: 17, font: FONT_B, fill: ok ? C.cream : C.dim }); text(g, `사기 ${cost}`, x + w / 2, y + 110, { size: 14, fill: ok ? C.gilt : C.dim });
      if (live && tapped('scav' + n, x, y, w, h)) { if (b.scavenge(n)) this.aim = null; else { sfx('deny'); this.toast(`사기가 ${cost} 있어야 ${any ? '패를 얻습니다' : '돌을 줍습니다'}`, 1.6); } }
      return;
    }
    const why = b.whyNot(n), can = why === '', a = this.aim, armed = a && a.slot === n;
    if (live && i.pressed && inRect(i, x, y, w, h)) { if (!can) this.deny(n); else if (armed && a.armed) this.aim = null; else { this.aim = { slot: n, card: c, drag: true, armed: false, live: false }; this.order = null; sfx('click'); } }
    const k = clamp(an.t / 0.22, 0, 1), up = armed ? (a.drag && i.y < BAR_Y - 8 ? 0 : -12) : 0, yy = y + up + (1 - easeOutBack(k)) * 46;
    g.save(); g.globalAlpha = k * (armed && a.drag && i.y < BAR_Y - 8 ? 0.35 : 1);
    if (armed) rr(g, x - 4, yy - 4, w + 8, h + 8, 12, null, OCHRE, 4);
    cardFace(g, c, x, yy, w, h, { cost: b.free > 0 ? 0 : b.costOf(c), dim: !can, free: b.free > 0 });
    if (why === 'cap' || why === 'hero') { rr(g, x + 10, yy + h / 2 - 14, w - 20, 28, 6, 'rgba(31,42,68,0.86)'); text(g, why === 'cap' ? '부대 가득' : CARDS[c.id].kind === 'lead' ? '출전 중' : '영웅 없음', x + w / 2, yy + h / 2 + 1, { size: 17, font: FONT_B, fill: C.cream }); }
    // 같은 전술 패가 주머니에 몇 장 남았는지 (이 한 장 포함)
    if (!isUnit(c) && CARDS[c.id].kind !== 'curse') { const left = this.stock[c.id] || 1; rr(g, x + 5, yy + h - 26, 36, 20, 5, left > 1 ? 'rgba(31,42,68,0.9)' : '#8a2a26'); text(g, '×' + left, x + 23, yy + h - 15.5, { size: 14.5, fill: C.cream }); }
    g.restore();
    text(g, String(n + 1), x + w - 11, y + h - 7, { size: 14.5, fill: '#4a4034' });
  }
  drawBar(g, b, i, live) {
    panel(g, 0, BAR_Y, W, H - BAR_Y, 'tray');
    text(g, '사기', 16, 590, { size: 21, font: FONT_B, align: 'left', fill: C.cream }); text(g, '무리 격파 +1', 62, 592, { size: 15, fill: C.cream, align: 'left', weight: 400 }); text(g, b.morale.toFixed(0) + ' / 10', 226, 591, { size: 15, fill: C.gilt, align: 'right' });
    for (let k = 0; k < 10; k++) { const f = clamp(b.morale - k, 0, 1), cx = 34 + (k % 5) * 42, cy = 618 + Math.floor(k / 5) * 32; icon.coin(g, cx, cy, 13, f >= 1); if (f > 0 && f < 1) { g.save(); g.beginPath(); g.rect(cx - 13, cy + 13 - 26 * f, 26, 26 * f); g.clip(); icon.coin(g, cx, cy, 13, true); g.restore(); } }
    const n = b.squadCount(), full = n >= b.cap;
    icon.people(g, 26, 690, 0.95, full ? RED : '#5f84c4'); text(g, `부대 ${n} / ${b.cap}`, 44, 691, { size: 17, align: 'left', fill: full ? '#f39a82' : C.cream });
    // 주머니: 남은 전술 패 / 한도. 그 옆의 점은 노획까지 물리칠 무리
    const stock = this.stock = {}; let pn = 0; for (const c of this.r.deck) if (!isUnit(c) && CARDS[c.id].kind !== 'curse') { stock[c.id] = (stock[c.id] || 0) + 1; pn++; }
    const cap = b.mods.pouch, lf = this.lootT > 0 ? (this.lootT = Math.max(0, this.lootT - this.dt * 1.6)) : 0;
    g.save(); g.translate(150, 690); g.scale(1 + lf * 0.35, 1 + lf * 0.35); icon.sack(g, 0, 0, 0.86); g.restore();
    text(g, `${pn}/${cap}`, 164, 691, { size: 16, font: FONT_B, align: 'left', fill: pn === 0 ? '#f39a82' : pn >= cap ? C.gilt : C.cream });
    for (let k = 0; k < b.mods.lootEvery; k++) ell(g, 213 + k * 10, 691, 3.6, 3.6, k < b.lootN ? C.gilt : 'rgba(6,10,22,0.45)', 'rgba(154,166,196,0.6)', 1);
    if (tapped('pouch', 140, 676, 100, 30)) this.toast(`주머니 — 전술 패 ${pn}장 (전장에서는 ${cap}장까지 줍습니다). 요괴 무리를 ${NUM[b.mods.lootEvery] || b.mods.lootEvery} 물리칠 때마다 한 장 노획`, 4.5);
    for (let k = 0; k < HAND; k++) this.handCard(g, k, 248 + k * 136, 574, 128, 138, b, i, live);
    if (button(g, 'allhold', 936, 574, 162, 62, '전군 대기', { style: 'indigo', size: 24, r: 10 }) && live) this.allOrder(true);
    if (button(g, 'allgo', 1106, 574, 162, 62, '전군 돌격', { style: 'red', size: 24, r: 10 }) && live) this.allOrder(false);
    if (button(g, 'redraw', 936, 646, 162, 62, '패 갈기 · 사기 1', { style: b.canRedraw() ? 'paper' : 'grey', size: 19, r: 10 }) && live) { if (b.redraw()) this.aim = null; else { sfx('deny'); if (!b.drawPile.length) this.toast('더미에 남은 패가 없습니다 — 손에 든 것이 전부입니다', 2); } }
    if (button(g, 'deck', 1106, 646, 162, 62, `덱 ${this.r.deck.length}장`, { style: this.r.items.length ? 'teal' : 'paper', size: 22, r: 10 }) && !this.over) this.sub = new DeckView({ P: b.power * b.mods.cardPow, onChange: () => this.sync(), onClose: () => { this.sub = null; this.sync(); } });
  }
  drawNotes(g, b) {
    const nt = this.over || this.sub ? null : this.note, gr = this.grade;
    if (nt) {
      const k = clamp(Math.min(nt.t / 0.3, 1), 0, 1); if (nt.t0 === undefined) nt.t0 = nt.t;
      g.save(); g.globalAlpha = k; g.translate(0, (1 - easeOutBack(k)) * -20); // 싸움을 알리는 그림: 먹물이 떨어지고 그 위에 붓으로 그린 기호가 찍힌다 (먹물은 머리 띠 아래 전장 안에서 끝난다)
      if (nt.ch) { g.save(); g.beginPath(); g.rect(0, HUD_H + 5, W, H); g.clip(); inkMark(g, nt.ch, 404, 116, 86, { k: (nt.t0 - nt.t) / 0.5, col: nt.chCol, v: nt.ch === 'boss' ? 2 : nt.ch === 'elite' ? 1 : 0 }); g.restore(); }
      brushTitle(g, 692, 100, 430, 68, nt.s, nt.col, 37); if (nt.sub) { rr(g, 452, 140, 480, 34, 8, 'rgba(248,240,220,0.97)', INK, 1.6); text(g, nt.sub, 692, 158, { size: 17, maxW: 456 }); }
      if (nt.beast) { panel(g, 246, 106, 96, 76, 'tag'); g.save(); g.beginPath(); g.rect(249, 109, 90, 70); g.clip(); const bk = { magpie: 1.3, sapsal: 1.35, samjoko: 1.12, tiger: 0.88, haetae: 0.82 }[nt.beast] || 1, by = { magpie: 196, samjoko: 198 }[nt.beast] || 176; portrait(g, nt.beast, 294, by, bk, this.T); g.restore(); }
      g.restore();
    }
    if (gr && this.phase === 'clear') {
      const t = gr.t, kk = clamp((t - 0.25) / 0.16, 0, 1), sc = 2.2 - 1.2 * kk;
      // 굵은 먹 띠를 한 번에 긋고 그 위에 흰 글씨, 붓이 빠진 자리에 전공 등급을 붓글씨로 찍는다
      const bk = clamp(t / 0.16, 0, 1); g.save(); g.beginPath(); g.rect(360, 220, 40 + 620 * bk, 170); g.clip(); drawInk(g, 'bar', 668, 302, 1.12, -0.022, 1, MEOK, 0); g.restore();
      g.globalAlpha = clamp((t - 0.06) / 0.14, 0, 1); text(g, '물리쳤다!', 548, 300, { size: 64, font: FONT_B, fill: '#f6efdc' }); g.globalAlpha = 1;
      if (t > 0.25) { if (!gr.stamped && kk >= 1) { gr.stamped = true; sfx('star'); this.view.fx.shake = 6; this.view.fx.splat(826, 300, 1.5, MEOK, 0.5); } g.save(); g.globalAlpha = kk; g.translate(826, 298); g.scale(sc, sc); ell(g, 0, 0, 56, 56, '#f8f0dc', 'rgba(38,42,54,0.5)', 1.6); drawInk(g, 'enso', 0, 0, 0.74, 0.3, 1, MEOK, gr.grade % 3); inkGlyph(g, GRADE[gr.grade], 0, 2, 74, { col: JU, halo: false, rot: -0.04 }); g.restore(); g.globalAlpha = kk; rr(g, 798, 214, 56, 26, 6, '#fbf3df', INK, 1.6); text(g, '전공', 826, 228, { size: 17, font: FONT_B, fill: INK }); g.globalAlpha = 1; }
      if (t > 0.5) { panel(g, 540, 360, 200, 44, 'tag'); icon.coin(g, 574, 382, 14); text(g, `엽전 +${gr.gold}`, 652, 383, { size: 23, font: FONT_B }); }
    }
    if (this.phase === 'over') { const ok = clamp((1.8 - this.endT) / 1.2, 0, 1); g.fillStyle = `rgba(23,21,28,${ok * 0.66})`; g.fillRect(0, 0, W, H); drawInk(g, 'blot', 640, 300, 2.2, 0.4, ok * 0.9, MEOK, 1); inkGlyph(g, 'lose', 640, 268, 210, { col: '#b8301f', halo: false, alpha: ok }); text(g, '깃발을 모두 잃었습니다', 640, 420, { size: 46, font: FONT_B, fill: C.cream, stroke: INK, lw: 8 }); }
    if (this.toastT > 0 && !this.over && !this.sub && !this.menu) { g.globalAlpha = clamp(this.toastT / 0.3, 0, 1); rr(g, 290, 502, 700, 46, 9, 'rgba(31,42,68,0.2)'); rr(g, 290, 499, 700, 46, 9, PAPER, INK, 2.2); rr(g, 293.4, 502.4, 693.2, 39.2, 6, null, 'rgba(201,150,46,0.7)', 0.9); text(g, this.toastS, 640, 523, { size: 19, maxW: 670 }); g.globalAlpha = 1; }
  }
  drawMenu(g) {
    const r = this.r;
    g.fillStyle = 'rgba(24,32,54,0.8)'; g.fillRect(0, 0, W, H);
    panel(g, 300, 96, 680, 536); brushTitle(g, 640, 102, 280, 62, '잠시 멈춤', INDIGO, 34);
    text(g, `${chapterOf(r.ch).name}  ·  이긴 싸움 ${r.wins}  ·  ${UNITS[r.hero].name}의 병법 '${HERO_TRAIT[r.hero].name}'`, 640, 172, { size: 18, fill: SUB, maxW: 470 });
    if (button(g, 'm1', 450, 200, 380, 66, '계속하기', { size: 32 })) this.menu = false;
    if (button(g, 'm2', 450, 278, 380, 56, `덱 살피기 · ${r.deck.length}장`, { style: 'paper', size: 25 })) this.sub = new DeckView({ P: this.b.power * this.b.mods.cardPow, onChange: () => this.sync(), onClose: () => { this.sub = null; this.sync(); } });
    if (button(g, 'm3', 450, 344, 380, 56, `지닌 보물 · ${r.relics.length}`, { style: 'paper', size: 25 })) this.sub = new RelicView({ onClose: () => { this.sub = null; } });
    if (button(g, 'm4', 450, 410, 380, 56, audio.muted ? '소리 켜기' : '소리 끄기', { style: 'paper', size: 25 })) setMuted(!audio.muted);
    if (button(g, 'm5', 450, 476, 380, 56, '처음 화면으로', { style: 'paper', size: 25 })) nav.go('title');
    text(g, '패 끌기 = 병력 세우기·전술 쓰기  ·  부대 끌기 = 이동  ·  요괴 위에 놓기 = 집중 공격', 640, 554, { size: 16, fill: '#4a4034', maxW: 644 });
    text(g, '키보드  ·  1~5 패 고르기  ·  Q 전군 대기  ·  E 전군 돌격', 640, 580, { size: 16, fill: '#4a4034', weight: 400 });
    text(g, 'R 패 갈기  ·  F 빠르기  ·  스페이스 멈춤', 640, 604, { size: 16, fill: '#4a4034', weight: 400 });
  }
}
