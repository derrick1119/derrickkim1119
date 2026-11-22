// 원정 전체 시뮬레이션: 행군하며 물결·갈림길·사건·장터·주막을 차례로 지나 세 고개를 넘는다
// node tools/campaign.mjs [runs] [mode: casual|bot|auto] [all]   ("all" = 공적 해금을 모두 연 상태)
import { Battle, HAND } from '../src/sim/battle.js';
import { G, meta, UNLOCKS, BEASTS, heroOpen, settleBattle, lootTable, grantLoot, tacticCards, newRun, battleSetup, waveSetup, mods, powerNow, curStop, chooseFork, encounterHere, advance, rollRewards, applyReward, upgradeCard, canUp, removeCard, equip, goldFor, genShop, buyItem, pickEvent, unitCards, act } from '../src/state.js';
import { eventView } from '../src/data/events.js';
import { CARDS, isUnit } from '../src/data/cards.js';
import { UNITS, HEROES } from '../src/data/units.js';
import { canEquip } from '../src/data/weapons.js';
import { VIEW, MID_Y } from '../src/config.js';
import { N_CH } from '../src/data/stages.js';

const runs = Number(process.argv[2] || 20), mode = process.argv[3] || 'casual';
if (process.argv[4] === 'all') { for (const u of UNLOCKS) meta.unlocked[u.id] = true; for (const b of BEASTS) meta.unlocked[b.id] = true; }
const pick = a => a[(Math.random() * a.length) | 0];
const used_ = {};
// 패 한 장을 쓸 만한 자리. 능숙한 봇은 가장 좋은 자리를, 서툰 봇은 대충 고른다
function spotFor(b, c, foes, mine, sharp) {
  const d = CARDS[c.id], r = d.r || 80, kind = c.id;
  if (isUnit(c)) { const u = UNITS[d.unit], back = u.soft, ys = [VIEW.y0 + 60, MID_Y - 70, MID_Y, MID_Y + 70, VIEW.y1 - 60]; return { x: back ? 200 + b.rand() * 120 : Math.min(b.deployMaxX(), 430 + b.rand() * 120), y: pick(ys) }; }
  const cluster = (list, rad, w) => { let best = null, bs = -1; for (const u of sharp ? list : [pick(list), pick(list)]) { let s = 0; b.near(u.x, u.y, rad + 20, o => { if (o.team === u.team && !o.dead && Math.hypot(o.x - u.x, o.y - u.y) <= rad) s += w ? w(o) : 1; }); if (s > bs) { bs = s; best = u; } } return best ? { u: best, s: bs } : null; };
  if (kind === 'sling' || kind === 'rain' || kind === 'firerain' || kind === 'volley' || kind === 'caltrop' || kind === 'meteor' || kind === 'strike') { if (!foes.length) return null; const q = cluster(foes, r, o => o.def.boss ? 3 : o.def.large ? 1.5 : 1); const need = kind === 'sling' ? 1.5 : kind === 'volley' || kind === 'meteor' ? 3 : 2.5; return q && q.s >= (sharp ? need : need - 0.5) ? q.u : null; }
  if (kind === 'thunder') { let best = null; for (const u of foes) if (!best || u.hp > best.hp) best = u; return best && best.hp > 150 ? best : null; }
  if (kind === 'scout') return !b.scout && b.morale >= 3 ? { x: 0, y: 0 } : null;
  if (!mine.length) return null;
  if (kind === 'heal' || kind === 'grail' || kind === 'sanctuary') { const q = cluster(mine, r, o => o.hp < o.maxHp * 0.65 ? 1 : 0); return q && q.s >= (kind === 'heal' ? 2 : 3) ? q.u : null; }
  if (kind === 'wall' || kind === 'cry') { const q = cluster(mine, r, o => o.target ? 1 : 0); return q && q.s >= 4 ? q.u : null; }
  if (kind === 'horn' || kind === 'order') return foes.length && mine.filter(u => u.target).length >= 4 ? mine[0] : null;
  if (kind === 'mark' || kind === 'snare' || kind === 'flash') { if (!foes.length) return null; const q = cluster(foes, r || 60, o => o.def.boss ? 3 : o.def.large ? 1.5 : 1); return q && q.s >= 2 ? q.u : null; }
  if (kind === 'deong') return foes.length >= 6 ? mine[0] : null;
  if (kind === 'pangut') return foes.length && b.morale >= 5 ? mine[0] : null;
  if (kind === 'veil' || kind === 'bulwark') { const h = mine.find(u => u.def.hero && u.hp < u.maxHp * 0.6 && u.target); return h || null; }
  if (kind === 'raid') { if (foes.length < 4) return null; const q = cluster(foes, 90, () => 1); return q ? { x: Math.max(VIEW.x0 + 80, q.u.x - 90), y: q.u.y } : null; }
  if (kind === 'sutra') return mine.filter(u => u.hp < u.maxHp * 0.7).length >= 5 ? mine[0] : null;
  if (kind === 'torch') return b.sky === 'night' && b.torch <= 0 && foes.length ? mine[0] : null;
  if (kind === 'stakes') { const f = foes.filter(u => !u.def.range); if (f.length < 3) return null; let x = 1e9, y = 0; for (const u of f) if (u.x < x) { x = u.x; y = u.y; } return x < 900 ? { x: x - 60, y } : null; }
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
  // 두목의 수에 맞서기: 소품(종·여의주·업경대·명부 든 사자)이 서면 원거리 부대를 붙이고, 홀린 부대는 깨운다. 서툰 봇은 셋에 한 번만 알아챈다
  if (sharp || b.rand() < 0.34) { const p = b.squads.find(q => q.team === 1 && q.alive > 0 && q.def.prop && !(q.units[0].ai && q.units[0].ai.rest > b.time)); for (const q of b.playerSquads()) { if (q.units.some(u => u.charm > 0)) b.orderAuto(q); if ((q.def.range && !q.def.heal) || (p && sharp && !q.hero && p.type !== 'bell' && Math.hypot(q.cx - p.cx, q.cy - p.cy) < 260)) { if (p) { if (q.order.target !== p) b.orderFocus(q, p); } else if (q.order.kind === 'focus' && q.order.target && q.order.target.def.prop) b.orderAuto(q); } } }
  // 병력을 먼저 세운다. 전술은 병력 낼 사기를 남겨 두고 쓴다 (부대가 한도까지 찼으면 마음껏)
  for (let i = 0; i < HAND; i++) { const c = b.hand[i]; if (c && isUnit(c) && b.canPlay(i)) { const t = spotFor(b, c, foes, mine, sharp); if (b.play(i, t.x, t.y)) { used_[c.id] = (used_[c.id] || 0) + 1; return; } } }
  const keep = b.squadCount() >= b.cap ? 0 : sharp ? 2 : 2.5;
  for (let i = 0; i < HAND; i++) {
    const c = b.hand[i]; if (!c || isUnit(c) || !b.canPlay(i)) continue;
    if (b.morale < b.costOf(c) + keep) continue;
    const t = spotFor(b, c, foes, mine, sharp); if (!t) continue;
    if (b.play(i, t.x, t.y)) { used_[c.id] = (used_[c.id] || 0) + 1; return; }
  }
  // 패가 떨어졌으면 사기가 넉넉할 때 줍는다. 손이 막혔으면 갈아 본다
  if (foes.length && b.morale >= (b.mods.scavAny ? 4.5 : sharp ? 5 : 7)) for (let i = 0; i < HAND; i++) if (b.canScavenge(i)) { b.scavenge(i); return; }
  if (sharp && b.morale >= 9.5 && b.canRedraw()) b.redraw();
}
function autoEquip() { const r = G.run; for (const wid of [...r.items]) { const c = unitCards().find(q => canEquip(CARDS[q.id].unit, wid) && !q.wpn); if (c) equip(c.uid, wid); } }
function sync(b) { const r = G.run; settleBattle(b); autoEquip(); b.mods = mods(); b.cap = r.cap; b.power = powerNow(); b.lootTable = lootTable(); b.mastery = r.mastery || {}; b.syncDeck(r.deck); }
// 전리품: 전술 패가 모자라면 패 묶음·보급을 먼저 집는다
function takeReward(kind) { const opts = rollRewards(kind), low = tacticCards().length < 7; let o = (low && opts.find(q => q.kind === 'supply' || (q.kind === 'card' && !isUnit(q)))) || pick(opts); applyReward(o); }
const dmg = new Array(N_CH).fill(0), dmgN = new Array(N_CH).fill(0), lossCh = Array.from({ length: N_CH }, () => ({ battle: [0, 0], elite: [0, 0], boss: [0, 0] }));
const st = {}, bump = (k, fails) => { const s = st[k] || (st[k] = [0, 0]); s[0]++; s[1] += fails; };
let stockN = 0, stockB = 0, chaseN = 0, clears = 0, totalT = 0, nB = 0, deckN = 0, unitN = 0, lvN = 0; const reach = new Array(N_CH + 1).fill(0);
for (let k = 0; k < runs; k++) {
  const HS = (process.env.HERO ? [process.env.HERO] : HEROES).filter(h => process.env.HERO || heroOpen(h)), r = newRun(HS[k % HS.length]);
  const b = new Battle(battleSetup((Math.random() * 1e9) | 0));
  const tick = n => { for (let j = 0; j < n; j++) { b.step(1 / 30); if (j % (mode === 'casual' ? 45 : 10) === 0) command(b); } b.events.length = 0; settleBattle(b); };
  r.alive = true;   // 한 싸움에서 전군이 무너지면 원정이 끝난다
  for (let guard = 0; r.alive && !r.done && guard < 400; guard++) {
    b.beginMarch(); for (let j = 0; j < 8; j++) { b.march(90, 0.3); tick(9); }
    let s = curStop(); if (s.type === 'fork') { const a = s.a.type, w = a === 'elite' ? 0.45 : 0.5; chooseFork(Math.random() < w ? 'a' : 'b'); s = curStop(); }
    if (s.type === 'battle' || s.type === 'elite' || s.type === 'boss') {
      const e = encounterHere(); sync(b); const lost0 = b.lost; b.prepWave(waveSetup(e)); tick(105); b.startWave(e.enemy, waveSetup(e));
      let steps = 0, cleared = false, downs = 0;
      while (!cleared && r.alive && steps++ < 30 * 260) {
        b.step(1 / 30); if (steps % (mode === 'casual' ? 45 : 10) === 0) command(b);
        settleBattle(b);
        for (const ev of b.events) { if (ev.type === 'waveClear') cleared = ev; else if (ev.type === 'armyDown') { r.alive = false; downs++; } else if (ev.type === 'porterDown') act.gold(30 + Math.min(10, r.ch) * 8); else if (ev.type === 'rescue') act.recruit(); }
        b.events.length = 0;
      }
      if (!cleared && r.alive) { r.alive = false; downs++; } // 끝나지 않는 싸움은 패배로 친다
      if (!cleared && steps >= 30 * 260) bump('끝나지 않음', 1); bump('지형 ' + e.terrain, downs); bump('하늘 ' + e.sky, downs); chaseN += b.chaseN;
      { const q = lossCh[e.ch][e.kind]; q[0]++; q[1] += downs; }
      nB++; bump(`${e.ch + 1}고개 ${e.kind === 'boss' ? '두목' : e.kind === 'elite' ? '강적' : '싸움' + (r.road.i + 1)}`, downs);
      if (!cleared) break;
      dmg[e.ch] += b.lost - lost0; dmgN[e.ch]++;
      totalT += cleared.time;
      const grade = 1 + (cleared.lost <= e.starDeaths ? 1 : 0) + (cleared.time <= e.starTime ? 1 : 0); r.gold += goldFor(grade, e.kind); r.merit += grade; r.wins++; r.kills = b.kills; r.lost = b.lost; r.nextMorale = 0;
      if (e.kind !== 'battle') grantLoot(e.kind === 'boss' ? 3 : 2); stockN += tacticCards().length; stockB++;
      takeReward(e.kind);
    } else if (s.type === 'event') { const cs = eventView({ id: pickEvent() }).choices.filter(c => !c.cost || r.gold >= c.cost), c = pick(cs), out = c.pick(); if (!Array.isArray(out)) throw new Error('사건 결과 형식'); }
    else if (s.type === 'shop') { const items = genShop(); for (let n = 0; n < 3; n++) { const can = items.filter(it => !it.sold && it.price <= r.gold); if (!can.length) break; const low = tacticCards().length < 8, it = (low && can.find(q => q.kind === 'supply' || (q.kind === 'card' && !isUnit(q)))) || pick(can); if (it.kind === 'trainPick') { const c = unitCards().find(canUp); if (c) upgradeCard(c.uid); } buyItem(it); } }
    else if (s.type === 'rest') { const x = Math.random(); if (x < 0.3) act.morale(4); else if (tacticCards().length < 6) act.supply(3); else { const c = pick(r.deck.filter(canUp)); if (c) upgradeCard(c.uid); } }
    else if (s.type === 'treasure') takeReward('treasure');
    sync(b);
    if (advance()) break;
  }
  if (process.env.TRACE) console.log(`#${k + 1} ${r.hero} ${r.done ? '평정' : r.ch + 1 + '고개'}  이긴 싸움 ${r.wins}  한도 ${r.cap}  덱 ${r.deck.length}  엽전 ${r.gold}  보물 ${r.relics.join(',')}  무기 ${r.deck.filter(c => c.wpn).map(c => c.wpn).join(',')}  사건 ${(r.evSeen || []).join(',')}`);
  reach[Math.min(N_CH, r.ch)]++; if (r.done) clears++; deckN += r.deck.length; unitN += unitCards().length; lvN += unitCards().reduce((a, c) => a + (c.lv || 1), 0) / unitCards().length;
}
console.log(`mode=${mode} runs=${runs}  평정률 ${(clears / runs * 100).toFixed(0)}%  원정당 싸움 ${(nB / runs).toFixed(1)}회  이긴 싸움 평균 ${(totalT / Math.max(1, nB)).toFixed(0)}초  끝날 때 덱 ${(deckN / runs).toFixed(1)}장 (병력 ${(unitN / runs).toFixed(1)}장, 평균 Lv ${(lvN / runs).toFixed(1)})`);
console.log('원정이 끝난 비율/싸움:', Object.keys(st).filter(k => !/고개/.test(k)).sort().map(k => `${k} ${(st[k][1] / st[k][0]).toFixed(2)}(${st[k][0]})`).join('  '));
console.log('싸움당 잃은 병사:', dmg.map((d, i) => `${i + 1}고개 ${(d / Math.max(1, dmgN[i])).toFixed(1)}`).join('  '));
console.log('본대가 따라붙은 횟수/싸움', (chaseN / nB).toFixed(2), ' 싸움 뒤 남은 전술 패 평균', (stockN / Math.max(1, stockB)).toFixed(1));
console.log('도달:', reach.map((n, i) => `${i < N_CH ? i + 1 : '평정'}×${n}`).join(' '));
console.log('고개별 패배 [싸움/강적/두목]:', lossCh.map((c, i) => `${i + 1}[${['battle', 'elite', 'boss'].map(k => c[k][0] ? (c[k][1] / c[k][0]).toFixed(2) : '-').join('/')}]`).join(' '));
console.log('싸움당 쓴 패:', Object.keys(used_).sort((a, b) => used_[b] - used_[a]).slice(0, 16).map(k => `${CARDS[k].name} ${(used_[k] / nB).toFixed(2)}`).join('  '));
