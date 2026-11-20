// 원정 전체 시뮬레이션: 갈림길·사건·장터·전리품을 무작위로 고르며 세 고개를 돈다
// node tools/campaign.mjs [runs] [mode: casual|bot|auto] [all]   ("all" = 공적 해금을 모두 연 상태)
import { Battle } from '../src/sim/battle.js';
import { G, meta, UNLOCKS, newRun, openNodes, enterNode, finishNode, battleSetup, rollRewards, applyReward, goldFor, buyItem, autoPlace, cap, used } from '../src/state.js';
import { eventView } from '../src/data/events.js';

const runs = Number(process.argv[2] || 20), mode = process.argv[3] || 'casual';
if (process.argv[4] === 'all') for (const u of UNLOCKS) meta.unlocked[u.id] = true;
const pick = a => a[(Math.random() * a.length) | 0];
function command(b) {
  if (mode === 'auto') return;
  const foes = b.units.filter(u => !u.dead && u.team === 1 && u.hidden <= 0), mine = b.units.filter(u => !u.dead && u.team === 0);
  if (!foes.length || !mine.length) return;
  if (mode === 'casual') { // 굼뜨고 부정확하게 스킬을 쓴다
    if (b.rand() < 0.45) return;
    if (b.morale >= 5) { const hurt = mine.filter(u => u.hp < u.maxHp * 0.5); if (hurt.length >= 3 && b.rand() < 0.5) { const u = pick(hurt); b.cast('grail', u.x, u.y); } else { const u = pick(foes); if (b.clusterScore(u, 80) >= 2) b.cast('rain', u.x, u.y); } }
    if (b.heroCd <= -2 && b.hero()) { const u = pick(foes); b.cast(b.heroSkill, u.x, u.y); }
  } else { // 스킬을 알맞은 곳에 바로바로 쓴다
    if (b.morale >= 4) { let best = null, bs = 2.5; for (const u of foes) { const s = b.clusterScore(u, 80); if (s > bs) { bs = s; best = u; } } let hurt = null, hs = 2.5; for (const u of mine) { let n = 0; b.near(u.x, u.y, 100, o => { if (o.team === 0 && !o.dead && o.hp < o.maxHp * 0.6) n++; }); if (n > hs) { hs = n; hurt = u; } } if (hurt) b.cast('grail', hurt.x, hurt.y); else if (best) b.cast('rain', best.x, best.y); }
    if (b.heroCd <= 0 && b.hero()) { let best = null, bs = 2; for (const u of foes) { const s = b.clusterScore(u, 80) + (u.def.boss ? 3 : 0); if (s > bs) { bs = s; best = u; } } if (best) b.cast(b.heroSkill, best.x, best.y); }
  }
}
const st = {}, bump = (k, win) => { const s = st[k] || (st[k] = [0, 0]); s[0]++; if (!win) s[1]++; };
let clears = 0, totalT = 0, nB = 0, nodes = 0; const reach = [0, 0, 0, 0];
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
      const e = r.enc, b = new Battle(battleSetup((Math.random() * 1e9) | 0));
      let steps = 0; while (!b.over && steps++ < 30 * 200) { b.step(1 / 30); b.events.length = 0; if (steps % (mode === 'casual' ? 60 : 12) === 0) command(b); }
      totalT += b.time; nB++; bump(`${e.ch + 1}고개 ${e.kind === 'boss' ? '두목' : e.kind === 'elite' ? '강적' : '싸움' + (e.row + 1)}`, b.winner === 0);
      r.nextMorale = 0;
      if (b.winner === 0) {
        const grade = 1 + (b.lost <= e.starDeaths ? 1 : 0) + (b.time <= e.starTime ? 1 : 0); r.gold += goldFor(grade, e.kind); r.merit += grade; r.wins++;
        applyReward(pick(rollRewards(e.kind))); finishNode();
      } else r.crowns--;
    } else if (p.kind === 'event') { const cs = eventView(p).choices.filter(c => !c.cost || r.gold >= c.cost), c = p.id === 'rest' && r.gold >= 90 ? cs[cs.length - 1] : pick(cs); const out = c.pick(); if (!Array.isArray(out)) throw new Error('사건 결과 형식'); finishNode(); }
    else if (p.kind === 'shop') { for (let n = 0; n < 3; n++) { const can = p.items.map((it, i) => i).filter(i => !p.items[i].sold && p.items[i].price <= r.gold); if (!can.length) break; buyItem(pick(can)); } finishNode(); }
    else if (p.kind === 'reward') { applyReward(pick(rollRewards('treasure'))); finishNode(); }
  }
  reach[Math.min(3, r.ch)]++; if (r.done) clears++;
}
console.log(`mode=${mode} runs=${runs}  평정률 ${(clears / runs * 100).toFixed(0)}%  원정당 싸움 ${(nB / runs).toFixed(1)}회 · 칸 ${(nodes / runs).toFixed(1)}개  평균 싸움 ${(totalT / nB).toFixed(0)}초`);
console.log('패배율:', Object.keys(st).sort().map(k => `${k} ${Math.round(st[k][1] / st[k][0] * 100)}%(${st[k][0]})`).join('  '));
console.log('도달:', ['첫째 고개', '둘째 고개', '셋째 고개', '평정'].map((n, i) => `${n}×${reach[i]}`).join('  '));
