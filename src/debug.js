// 개발용 진입: ?debug=1&stage=5&fight=1 / &scene=reward|hero|end
import { nav } from './nav.js';
import { G, newRun, autoPlace, save } from './state.js';
import { UNITS } from './data/units.js';

const PLAN = ['spear', 'priest', 'xbow', 'wizard', 'knight', 'sword', 'berserk', 'cannon', 'xbow', 'priest', 'knight'];
export function debugBoot(q) {
  const stage = Number(q.get('stage') || 0), hero = q.get('hero') || 'commander';
  const r = newRun(hero);
  for (let i = 0; i < stage; i++) { r.stage = i + 1; const type = PLAN[i % PLAN.length]; const s = { uid: r.nextId++, type, col: 0, row: 0, placed: false, hold: false }; r.squads.push(s); autoPlace(s, 0); if (i % 2) { const t = r.squads[1 + (i % (r.squads.length - 1))].type; r.lvl[t] = (r.lvl[t] || 1) + 1; } }
  r.gold = Number(q.get('gold') || 120);
  if (q.get('relics')) r.relics = q.get('relics').split(',');
  const scene = q.get('scene') || 'battle';
  if (scene === 'reward') r.rewardPending = { boss: q.get('boss') === '1' };
  nav.now(scene, scene === 'end' ? { win: q.get('win') === '1' } : undefined);
  if (q.get('fight')) setTimeout(() => { const s = nav.cur; if (s && s.startFight) { s.banner = 0; s.startFight(); if (q.get('speed')) s.speed = Number(q.get('speed')); } }, 300);
  window.__game.G = G; window.__game.UNITS = UNITS; window.__game.save = save;
}
