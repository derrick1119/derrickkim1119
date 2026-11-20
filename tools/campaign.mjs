// 원정 전체 시뮬레이션: 행군하며 물결·갈림길·사건·장터·주막을 차례로 지나 세 고개를 넘는다
// node tools/campaign.mjs [runs] [mode: casual|bot|auto] [all]   ("all" = 공적 해금을 모두 연 상태)
import { Battle, HAND } from '../src/sim/battle.js';
import { G, meta, UNLOCKS, newRun, battleSetup, waveSetup, mods, powerNow, curStop, chooseFork, encounterHere, advance, rollRewards, applyReward, upgradeCard, canUp, removeCard, equip, goldFor, genShop, buyItem, pickEvent, unitCards, act } from '../src/state.js';
import { eventView } from '../src/data/events.js';
import { CARDS, isUnit } from '../src/data/cards.js';
import { UNITS } from '../src/data/units.js';
import { canEquip } from '../src/data/weapons.js';
import { VIEW, MID_Y } from '../src/config.js';

const runs = Number(process.argv[2] || 20), mode = process.argv[3] || 'casual';
if (process.argv[4] === 'all') for (const u of UNLOCKS) meta.unlocked[u.id] = true;
const pick = a => a[(Math.random() * a.length) | 0];
const used_ = {};
// 패 한 장을 쓸 만한 자리. 능숙한 봇은 가장 좋은 자리를, 서툰 봇은 대충 고른다
function spotFor(b, c, foes, mine, sharp) {
  const d = CARDS[c.id], r = d.r || 80, kind = c.id;
  if (isUnit(c)) { const u = UNITS[d.unit], back = u.soft, ys = [VIEW.y0 + 60, MID_Y - 70, MID_Y, MID_Y + 70, VIEW.y1 - 60]; return { x: back ? 200 + b.rand() * 120 : Math.min(b.deployMaxX(), 430 + b.rand() * 120), y: pick(ys) }; }
  const cluster = (list, rad, w) => { let best = null, bs = -1; for (const u of sharp ? list : [pick(list), pick(list)]) { let s = 0; b.near(u.x, u.y, rad + 20, o => { if (o.team === u.team && !o.dead && Math.hypot(o.x - u.x, o.y - u.y) <= rad) s += w ? w(o) : 1; }); if (s > bs) { bs = s; best = u; } } return best ? { u: best, s: bs } : null; };
  if (kind === 'sling' || kind === 'rain' || kind === 'firerain' || kind === 'volley' || kind === 'caltrop' || kind === 'meteor' || kind === 'strike') { if (!foes.length) return null; const q = cluster(foes, r, o => o.def.boss ? 3 : o.def.large ? 1.5 : 1); const need = kind === 'sling' ? 1.5 : kind === 'volley' || kind === 'meteor' ? 3 : 2.5; return q && q.s >= (sharp ? need : need - 0.5) ? q.u : null; }
  if (kind === 'thunder') { let best = null; for (const u of foes) if (!best || u.hp > best.hp) best = u; return best && best.hp > 150 ? best : null; }
  if (!mine.length) return null;
  if (kind === 'heal' || kind === 'grail' || kind === 'sanctuary') { const q = cluster(mine, r, o => o.hp < o.maxHp * 0.65 ? 1 : 0); return q && q.s >= (kind === 'heal' ? 2 : 3) ? q.u : null; }
  if (kind === 'wall' || kind === 'cry') { const q = cluster(mine, r, o => o.target ? 1 : 0); return q && q.s >= 4 ? q.u : null; }
  if (kind === 'horn' || kind === 'order') return foes.length && mine.filter(u => u.target).length >= 4 ? mine[0] : null;
  if (kind === 'sutra') return mine.filter(u => u.hp < u.maxHp * 0.7).length >= 5 ? mine[0] : null;
  if (!foes.length) return null;
  if (kind === 'ambush') { const soft = foes.filter(u => u.def.soft && !u.def.structure); const u = soft.length ? pick(soft) : pick(foes); return { x: u.x - 30, y: u.y }; }
  if (kind === 'archers') { const u = mine.find(q => q.def.soft) || mine[0]; return { x: u.x, y: u.y + 60 }; }
  if (kind === 'decoy') { const q = cluster(foes, 110); return q && q.s >= 3 ? { x: q.u.x - 70, y: q.u.y } : null; }
  if (kind === 'doubt') return b.morale >= 6 ? mine[0] : null;
  return null;
}
function command(b) {
  if (mode === 'auto') { for (let i = 0; i < HAND; i++) { const c = b.hand[i]; if (c && isUnit(c) && b.canPlay(i)) { const t = spotFor(b, c, [], [], true); b.play(i, t.x, t.y); return; } } return; } // 무조작: 병력만 낸다
  const foes = b.units.filter(u => !u.dead && u.team === 1 && u.hidden <= 0 && u.x < VIEW.x1), mine = b.units.filter(u => !u.dead && u.team === 0 && !u.temp && !u.def.structure);
  const sharp = mode !== 'casual';
  if (!sharp && b.rand() < 0.4) return;
  for (let i = 0; i < HAND; i++) {
    const c = b.hand[i]; if (!c || !b.canPlay(i)) continue;
    if (!sharp && !isUnit(c) && b.morale < b.costOf(c) + 1.5) continue;
    const t = spotFor(b, c, foes, mine, sharp); if (!t) continue;
    if (b.play(i, t.x, t.y)) { used_[c.id] = (used_[c.id] || 0) + 1; return; }
  }
  // 손이 막혔으면 갈아 본다
  if (sharp && b.morale >= 9.5 && b.canRedraw()) b.redraw();
}
function autoEquip() { const r = G.run; for (const wid of [...r.items]) { const c = unitCards().find(q => canEquip(CARDS[q.id].unit, wid) && !q.wpn); if (c) equip(c.uid, wid); } }
function sync(b) { const r = G.run; autoEquip(); b.mods = mods(); b.cap = r.cap; b.power = powerNow(); b.syncDeck(r.deck); }
function takeReward(kind) { const opts = rollRewards(kind), r = G.run; let o = pick(opts); if (r.deck.length >= 24 && o.kind === 'card' && Math.random() < 0.6) { r.gold += 15; return; } applyReward(o); }
const dmg = [0, 0, 0], dmgN = [0, 0, 0];
const st = {}, bump = (k, fails) => { const s = st[k] || (st[k] = [0, 0]); s[0]++; s[1] += fails; };
let clears = 0, totalT = 0, nB = 0, deckN = 0, unitN = 0, lvN = 0; const reach = [0, 0, 0, 0];
for (let k = 0; k < runs; k++) {
  const r = newRun(['commander', 'bishop', 'archmage'][k % 3].replace(/bishop|archmage/, h => meta.unlocked[h] ? h : 'commander'));
  const b = new Battle(battleSetup((Math.random() * 1e9) | 0));
  const tick = n => { for (let j = 0; j < n; j++) { b.step(1 / 30); if (j % (mode === 'casual' ? 45 : 10) === 0) command(b); } b.events.length = 0; };
  for (let guard = 0; r.flags > 0 && !r.done && guard < 200; guard++) {
    b.beginMarch(); for (let j = 0; j < 8; j++) { b.march(90, 0.3); tick(9); }
    let s = curStop(); if (s.type === 'fork') { const a = s.a.type, w = a === 'elite' ? (r.flags <= 1 ? 0.25 : 0.55) : 0.5; chooseFork(Math.random() < w ? 'a' : 'b'); s = curStop(); }
    if (s.type === 'battle' || s.type === 'elite' || s.type === 'boss') {
      const e = encounterHere(); sync(b); const hp0 = b.bannerHp(); b.startWave(e.enemy, waveSetup(e));
      let steps = 0, cleared = false, downs = 0;
      while (!cleared && r.flags > 0 && steps++ < 30 * 260) {
        b.step(1 / 30); if (steps % (mode === 'casual' ? 45 : 10) === 0) command(b);
        for (const ev of b.events) { if (ev.type === 'waveClear') cleared = ev; else if (ev.type === 'bannerDown') { r.flags--; downs++; if (r.flags > 0) b.raiseBanner(); } }
        b.events.length = 0;
      }
      if (!cleared && r.flags > 0) { r.flags = 0; downs++; } // 끝나지 않는 싸움은 패배로 친다
      nB++; bump(`${e.ch + 1}고개 ${e.kind === 'boss' ? '두목' : e.kind === 'elite' ? '강적' : '싸움' + (r.road.i + 1)}`, downs);
      if (!cleared) break;
      dmg[e.ch] += downs ? 1 : Math.max(0, hp0 - (b.bannerHp() - 0.06) - (hp0 > 0.94 ? hp0 - 0.94 : 0)); dmgN[e.ch]++;
      totalT += cleared.time;
      const grade = 1 + (cleared.lost <= e.starDeaths ? 1 : 0) + (cleared.time <= e.starTime ? 1 : 0); r.gold += goldFor(grade, e.kind); r.merit += grade; r.wins++; r.kills = b.kills; r.lost = b.lost; r.nextMorale = 0;
      takeReward(e.kind);
    } else if (s.type === 'event') { const cs = eventView({ id: pickEvent() }).choices.filter(c => !c.cost || r.gold >= c.cost), c = pick(cs), out = c.pick(); if (!Array.isArray(out)) throw new Error('사건 결과 형식'); }
    else if (s.type === 'shop') { const items = genShop(); for (let n = 0; n < 3; n++) { const can = items.filter(it => !it.sold && it.price <= r.gold); if (!can.length) break; const it = pick(can); if (it.kind === 'burn') { const c = r.deck.find(c => c.id === 'doubt') || r.deck.find(c => c.id === 'sling'); if (c) removeCard(c.uid); } else if (it.kind === 'trainPick') { const c = unitCards().find(canUp); if (c) upgradeCard(c.uid); } buyItem(it); } }
    else if (s.type === 'rest') { b.repair(1); const x = Math.random(); if (r.flags < 3 && x < 0.6) act.flag(1); else { const c = pick(r.deck.filter(canUp)); if (c) upgradeCard(c.uid); } }
    else if (s.type === 'treasure') takeReward('treasure');
    sync(b);
    if (advance()) break;
  }
  reach[Math.min(3, r.ch)]++; if (r.done) clears++; deckN += r.deck.length; unitN += unitCards().length; lvN += unitCards().reduce((a, c) => a + (c.lv || 1), 0) / unitCards().length;
}
console.log(`mode=${mode} runs=${runs}  평정률 ${(clears / runs * 100).toFixed(0)}%  원정당 싸움 ${(nB / runs).toFixed(1)}회  이긴 싸움 평균 ${(totalT / Math.max(1, nB)).toFixed(0)}초  끝날 때 덱 ${(deckN / runs).toFixed(1)}장 (병력 ${(unitN / runs).toFixed(1)}장, 평균 Lv ${(lvN / runs).toFixed(1)})`);
console.log('깃발 잃은 횟수/싸움:', Object.keys(st).sort().map(k => `${k} ${(st[k][1] / st[k][0]).toFixed(2)}(${st[k][0]})`).join('  '));
console.log('싸움당 군기 수레 피해:', dmg.map((d, i) => `${i + 1}고개 ${(d / Math.max(1, dmgN[i]) * 100).toFixed(0)}%`).join('  '));
console.log('도달:', ['첫째 고개', '둘째 고개', '셋째 고개', '평정'].map((n, i) => `${n}×${reach[i]}`).join('  '));
console.log('싸움당 쓴 패:', Object.keys(used_).sort((a, b) => used_[b] - used_[a]).slice(0, 16).map(k => `${CARDS[k].name} ${(used_[k] / nB).toFixed(2)}`).join('  '));
