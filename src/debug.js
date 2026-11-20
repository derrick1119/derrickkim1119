// 개발용 진입: ?debug=1&ch=1&row=2&kind=elite&fight=1 / &scene=map|event|shop|reward|meta|end
import { nav } from './nav.js';
import { G, meta, newRun, genMap, genShop, enterNode, autoPlace, save } from './state.js';
import { UNITS } from './data/units.js';

const PLAN = ['spear', 'priest', 'xbow', 'wizard', 'knight', 'sword', 'berserk', 'cannon', 'xbow', 'priest', 'knight'];
export function debugBoot(q) {
  const ch = Number(q.get('ch') || 0), row = Number(q.get('row') || 0), kind = q.get('kind') || 'battle', scene = q.get('scene') || 'battle';
  const r = newRun(q.get('hero') || 'commander'); r.ch = ch; r.map = genMap(ch);
  const n = Math.round((ch * 6 + row) * 0.75);
  for (let i = 0; i < n; i++) { r.wins++; const s = { uid: r.nextId++, type: PLAN[i % PLAN.length], col: 0, row: 0, placed: false, hold: false }; r.squads.push(s); autoPlace(s); if (i % 2) { const t = r.squads[1 + (i % (r.squads.length - 1))].type; r.lvl[t] = (r.lvl[t] || 1) + 1; } }
  r.gold = Number(q.get('gold') || 150);
  if (q.get('relics')) r.relics = q.get('relics').split(',');
  if (q.get('items')) r.items = q.get('items').split(',');
  if (q.get('cards')) for (const id of q.get('cards').split(',')) r.deck.push({ id: id.replace(/[!+ ]/g, ''), up: /[!+ ]$/.test(id) });
  if (q.get('wpn')) q.get('wpn').split(',').forEach(kv => { const [t, w] = kv.split(':'); const sq = r.squads.find(x => x.type === t && !x.wpn); if (sq) sq.wpn = w; });
  const node = r.map.nodes.find(x => kind === 'boss' ? x.type === 'boss' : x.r === row); node.type = kind === 'boss' ? 'boss' : kind;
  if (scene === 'battle') enterNode(node.id);
  else if (scene === 'event') { r.map.cur = node.id; r.pending = { kind: 'event', id: q.get('id') || 'fox', train: 'sword' }; }
  else if (scene === 'shop') { r.map.cur = node.id; r.pending = { kind: 'shop', items: genShop() }; }
  else if (scene === 'reward') { r.map.cur = node.id; r.pending = { kind: 'battle' }; r.rewardPending = { kind }; }
  else if (scene === 'map' && row > 0) { let id = r.map.nodes.find(x => x.r === 0).id; r.map.cur = id; r.map.done.push(id); }
  if (q.get('merit')) meta.merit = Number(q.get('merit'));
  nav.now(scene, scene === 'end' ? { win: q.get('win') === '1' } : undefined);
  if (q.get('fight')) setTimeout(() => { const s = nav.cur; if (s && s.startFight) { s.banner = 0; s.startFight(); if (q.get('speed')) s.speed = Number(q.get('speed')); } }, 300);
  window.__game.G = G; window.__game.UNITS = UNITS; window.__game.save = save;
}
