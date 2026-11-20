// 원정 전체 시뮬레이션: 갈림길·사건·장터·전리품을 무작위로 고르며 세 고개를 돈다
// node tools/campaign.mjs [runs] [mode: casual|bot|auto] [all]   ("all" = 공적 해금을 모두 연 상태)
import { Battle, HAND } from '../src/sim/battle.js';
import { G, meta, UNLOCKS, newRun, openNodes, enterNode, finishNode, battleSetup, rollRewards, rollCards, applyReward, addCard, removeCard, upgradeCard, equip, goldFor, buyItem, autoPlace, cap, used } from '../src/state.js';
import { eventView } from '../src/data/events.js';
import { CARDS } from '../src/data/cards.js';
import { canEquip } from '../src/data/weapons.js';

const runs = Number(process.argv[2] || 20), mode = process.argv[3] || 'casual';
if (process.argv[4] === 'all') for (const u of UNLOCKS) meta.unlocked[u.id] = true;
const pick = a => a[(Math.random() * a.length) | 0];
const used_ = {}, seen_ = {};
// 패 한 장을 쓸 만한 자리. 능숙한 봇은 가장 좋은 자리를, 서툰 봇은 대충 고른다
function spotFor(b, c, foes, mine, sharp) {
  const d = CARDS[c.id], r = d.r || 80, kind = c.id;
  const cluster = (list, rad, w) => { let best = null, bs = -1; for (const u of sharp ? list : [pick(list), pick(list)]) { let s = 0; b.near(u.x, u.y, rad + 20, o => { if (o.team === u.team && !o.dead && Math.hypot(o.x - u.x, o.y - u.y) <= rad) s += w ? w(o) : 1; }); if (s > bs) { bs = s; best = u; } } return best ? { u: best, s: bs } : null; };
  if (kind === 'sling' || kind === 'rain' || kind === 'firerain' || kind === 'volley' || kind === 'caltrop' || kind === 'meteor' || kind === 'strike') { const q = cluster(foes, r, o => o.def.boss ? 3 : o.def.large ? 1.5 : 1); const need = kind === 'sling' ? 1.5 : kind === 'volley' || kind === 'meteor' ? 3 : 2.5; return q && q.s >= (sharp ? need : need - 0.5) ? q.u : null; }
  if (kind === 'thunder') { let best = null; for (const u of foes) if (!best || u.hp > best.hp) best = u; return best && best.hp > 150 ? best : null; }
  if (kind === 'heal' || kind === 'grail' || kind === 'sanctuary') { const q = cluster(mine, r, o => o.hp < o.maxHp * 0.65 ? 1 : 0); return q && q.s >= (kind === 'heal' ? 2 : 3) ? q.u : null; }
  if (kind === 'wall' || kind === 'cry') { const q = cluster(mine, r, o => o.target ? 1 : 0); return q && q.s >= 4 ? q.u : null; }
  if (kind === 'horn' || kind === 'order') return b.time > 3 && mine.filter(u => u.target).length >= 4 ? mine[0] : null;
  if (kind === 'sutra') return mine.filter(u => u.hp < u.maxHp * 0.7).length >= 5 ? mine[0] : null;
  if (kind === 'ambush') { const soft = foes.filter(u => u.def.soft && !u.def.structure); const u = soft.length ? pick(soft) : pick(foes); return { x: u.x, y: u.y - 30 }; }
  if (kind === 'archers') { const u = mine.find(q => q.def.soft) || mine[0]; return { x: u.x + 60, y: u.y }; }
  if (kind === 'decoy') { const q = cluster(foes, 110); return q && q.s >= 3 ? { x: q.u.x, y: q.u.y + 60 } : null; }
  if (kind === 'blink') return null;
  if (kind === 'doubt') return b.morale >= 6 ? mine[0] : null;
  return null;
}
function command(b) {
  if (mode === 'auto') return;
  const foes = b.units.filter(u => !u.dead && u.team === 1 && u.hidden <= 0), mine = b.units.filter(u => !u.dead && u.team === 0 && !u.temp);
  if (!foes.length || !mine.length) return;
  const sharp = mode !== 'casual';
  if (!sharp && b.rand() < 0.4) return;
  // 서툰 봇은 사기가 넉넉히 쌓였을 때만, 능숙한 봇은 되는 대로 쓴다
  for (let i = 0; i < HAND; i++) {
    const c = b.hand[i]; if (!c || !b.canPlay(i)) continue;
    if (!sharp && b.morale < b.costOf(c) + 1.5) continue;
    const t = spotFor(b, c, foes, mine, sharp); if (!t) continue;
    if (b.play(i, t.x, t.y)) { used_[c.id] = (used_[c.id] || 0) + 1; return; }
  }
  // 손이 막혔으면 갈아 본다
  if (sharp && b.morale >= 9.5 && b.canRedraw()) b.redraw();
}
// 봇의 덱 관리: 패는 가끔 건너뛰고, 새 무기는 맞는 부대에 바로 끼운다
function takeCard(kind) { const cs = rollCards(kind); if (G.run.deck.length >= 16 && Math.random() < 0.6) return; const c = pick(cs); if (c && Math.random() < 0.8) addCard(c.id, c.up); }
function autoEquip() { const r = G.run; for (const wid of [...r.items]) { const s = r.squads.find(q => canEquip(q.type, wid) && !q.wpn); if (s) equip(s.uid, wid); } }
const st = {}, bump = (k, win) => { const s = st[k] || (st[k] = [0, 0]); s[0]++; if (!win) s[1]++; };
let clears = 0, totalT = 0, nB = 0, nodes = 0, deckN = 0, wpnN = 0; const reach = [0, 0, 0, 0];
for (let k = 0; k < runs; k++) {
  const r = newRun(['commander', 'bishop', 'archmage'][k % 3].replace(/bishop|archmage/, h => meta.unlocked[h] ? h : 'commander'));
  for (let guard = 0; r.crowns > 0 && !r.done && guard < 400; guard++) {
    if (!r.pending) { // 엽전이 넉넉하면 장터 쪽으로, 깃발이 하나뿐이면 강적을 피한다
      const open = openNodes(), w = open.map(id => { const t = r.map.nodes[id].type; return t === 'shop' ? (r.gold >= 90 ? 4 : 0.6) : t === 'elite' ? (r.crowns <= 1 ? 0.2 : 1) : 1; });
      let x = Math.random() * w.reduce((a, b) => a + b, 0), id = open[0]; for (let i = 0; i < open.length; i++) { if ((x -= w[i]) < 0) { id = open[i]; break; } }
      enterNode(id); nodes++; }
    const p = r.pending;
    if (p.kind === 'battle') {
      for (const s of r.squads) if (!s.placed) autoPlace(s);
      if (used() > cap()) throw new Error('군량 초과');
      autoEquip();
      const e = r.enc, b = new Battle(battleSetup((Math.random() * 1e9) | 0));
      let steps = 0; while (!b.over && steps++ < 30 * 200) { b.step(1 / 30); b.events.length = 0; if (steps % (mode === 'casual' ? 45 : 10) === 0) command(b); }
      totalT += b.time; nB++; bump(`${e.ch + 1}고개 ${e.kind === 'boss' ? '두목' : e.kind === 'elite' ? '강적' : '싸움' + (e.row + 1)}`, b.winner === 0);
      r.nextMorale = 0;
      if (b.winner === 0) {
        const grade = 1 + (b.lost <= e.starDeaths ? 1 : 0) + (b.time <= e.starTime ? 1 : 0); r.gold += goldFor(grade, e.kind); r.merit += grade; r.wins++;
        applyReward(pick(rollRewards(e.kind))); takeCard(e.kind); finishNode();
      } else r.crowns--;
    } else if (p.kind === 'event') {
      const cs = eventView(p).choices.filter(c => !c.cost || r.gold >= c.cost), c = p.id === 'rest' && r.gold >= 90 ? cs[cs.length - 1] : pick(cs);
      if (c.deck) { const i = r.deck.findIndex(x => !x.up && x.id !== 'doubt'); if (i >= 0) upgradeCard(i); } else { const out = c.pick(); if (!Array.isArray(out)) throw new Error('사건 결과 형식'); }
      finishNode();
    } else if (p.kind === 'shop') {
      for (let n = 0; n < 3; n++) { const can = p.items.map((it, i) => i).filter(i => !p.items[i].sold && p.items[i].price <= r.gold); if (!can.length) break; const i = pick(can); if (p.items[i].kind === 'burn') { const k2 = r.deck.findIndex(c => c.id === 'doubt'); removeCard(k2 >= 0 ? k2 : r.deck.findIndex(c => c.id === 'sling')); } buyItem(i); }
      finishNode();
    } else if (p.kind === 'reward') { applyReward(pick(rollRewards('treasure'))); finishNode(); }
  }
  reach[Math.min(3, r.ch)]++; if (r.done) clears++; deckN += r.deck.length; wpnN += r.squads.filter(s => s.wpn).length;
  for (const c of r.deck) seen_[c.id] = (seen_[c.id] || 0) + 1;
}
console.log(`mode=${mode} runs=${runs}  평정률 ${(clears / runs * 100).toFixed(0)}%  원정당 싸움 ${(nB / runs).toFixed(1)}회 · 칸 ${(nodes / runs).toFixed(1)}개  평균 싸움 ${(totalT / nB).toFixed(0)}초  끝날 때 덱 ${(deckN / runs).toFixed(1)}장 · 바꿔 든 무기 ${(wpnN / runs).toFixed(1)}개`);
console.log('패배율:', Object.keys(st).sort().map(k => `${k} ${Math.round(st[k][1] / st[k][0] * 100)}%(${st[k][0]})`).join('  '));
console.log('도달:', ['첫째 고개', '둘째 고개', '셋째 고개', '평정'].map((n, i) => `${n}×${reach[i]}`).join('  '));
console.log('싸움당 쓴 패:', Object.keys(used_).sort((a, b) => used_[b] - used_[a]).map(k => `${CARDS[k].name} ${(used_[k] / nB).toFixed(2)}`).join('  '));
