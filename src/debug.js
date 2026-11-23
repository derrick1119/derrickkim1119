// 개발용 진입: ?debug=1&ch=1&i=3&type=shop  (i = 노정의 몇 번째 칸, type = 그 칸을 바꿔치기)
//   &state=at 그 칸에 바로 도착 · &scene=end&win=1 · &scene=meta&merit=60
//   &cards=thunder,volley!,u_knight (! = 강화) · &items=gun,axe (무기 보관함) · &relics=drum,yut · &gold=300 · &speed=2
import { nav } from './nav.js';
import { G, meta, newRun, genRoad, addCard, unitCards, save } from './state.js';
import { UNITS } from './data/units.js';
import { isUnit } from './data/cards.js';

const PLAN = ['u_spear', 'u_priest', 'thunder', 'u_knight', 'wall', 'u_wizard', 'cry', 'u_xbow', 'caltrop', 'u_shield'];
export function debugBoot(q) {
  const ch = Number(q.get('ch') || 0), i = Number(q.get('i') || 0), scene = q.get('scene') || 'run';
  const r = newRun(q.get('hero') || 'commander'); r.ch = ch; r.road = genRoad(ch); r.road.i = i; r.cap = Math.min(9, r.cap + ch);
  const n = Math.round((ch * 6 + i) * 0.7);
  for (let k = 0; k < n; k++) { r.wins++; addCard(PLAN[k % PLAN.length]); if (k % 3 === 2) { const c = unitCards()[k % unitCards().length]; c.lv = Math.min(14, (c.lv || 1) + 1); } }
  for (const c of r.deck) if (isUnit(c)) c.lv = Math.min(14, (c.lv || 1) + ch);
  r.gold = Number(q.get('gold') || 150);
  if (q.get('relics')) r.relics = q.get('relics').split(',');
  if (q.get('items')) r.items = q.get('items').split(',');
  if (q.get('cards')) for (const id of q.get('cards').split(',')) addCard(id.replace(/[!+ ]/g, ''), { up: /[!+ ]$/.test(id) });
  if (q.get('wpn')) q.get('wpn').split(',').forEach(kv => { const [t, w] = kv.split(':'); const c = r.deck.find(x => x.id === 'u_' + t && !x.wpn); if (c) c.wpn = w; });
  if (q.get('type')) r.road.stops[i] = { type: q.get('type') };
  if (q.get('ev')) r.pending = { kind: 'event', id: q.get('ev') };
  if (q.get('state')) r.road.state = q.get('state');
  if (q.get('merit')) meta.merit = Number(q.get('merit'));
  save();
  nav.now(scene, scene === 'end' ? { win: q.get('win') === '1' } : scene === 'prologue' ? { hero: q.get('hero') || 'commander' } : undefined);
  if (q.get('speed')) setTimeout(() => { if (nav.cur) nav.cur.speed = Number(q.get('speed')); }, 200);
  window.__game.G = G; window.__game.UNITS = UNITS; window.__game.save = save;
}
