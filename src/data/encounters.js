// 싸움 편성 생성기: 고개와 깊이에 맞춰 요괴 부대를 뽑아 진형을 짠다
// enemy 항목: [병종, 열(0~5), 줄(0=전열, 2=후열), 옵션{n, hold, flank:'L'|'R', wait}]
import { UNITS } from './units.js';
import { pickTerrain, pickSky } from './terrain.js';

export const ROWS = 5; // 고개 하나의 갈림길 줄 수 (그 위가 두목)
const THREAT = { goblin: 2, orc: 3, garcher: 2.5, rshield: 3.2, rassassin: 3, treant: 4.2, bomber: 3, wolf: 3.6, shaman: 3.4, skel: 3.2, skelarcher: 3, catapult: 4.2, necro: 5 };
const ROLE = { goblin: 'front', orc: 'front', rshield: 'front', treant: 'front', skel: 'front', rassassin: 'mid', bomber: 'mid', wolf: 'flank', shaman: 'back', garcher: 'back', skelarcher: 'back', necro: 'back', catapult: 'siege' };
const LIMIT = { catapult: 2, necro: 2, shaman: 2, wolf: 2, rassassin: 2, bomber: 2, treant: 3, rshield: 3 };
const POOLS = [
  { w: { goblin: 5, orc: 4, garcher: 4, rshield: 3, rassassin: 2 }, maps: ['meadow', 'ruins', 'pillars'], lvl: 1 },
  { w: { goblin: 2, orc: 3, garcher: 3, rshield: 2, treant: 4, bomber: 3, wolf: 3, shaman: 3, rassassin: 2 }, maps: ['forest', 'river', 'pillars', 'ruins'], lvl: 2 },
  { w: { skel: 5, skelarcher: 4, necro: 2, catapult: 2, rassassin: 2, rshield: 2, shaman: 2, wolf: 2, bomber: 2, orc: 1 }, maps: ['graveyard', 'fort', 'moat', 'pillars'], lvl: 3 },
];
// 편성에서 가장 눈에 띄는 요괴가 싸움 이름을 정한다
const FEATURE = ['necro', 'catapult', 'wolf', 'bomber', 'treant', 'shaman', 'skel', 'rassassin', 'rshield', 'garcher', 'orc', 'goblin'];
const NAMES = { necro: ['저승사자의 명부', '저승사자 일행'], catapult: ['바위 세례', '투석 패거리'], skel: ['되살아나는 자들', '망령 무리'], wolf: ['멧돼지 몰이', '멧돼지 몰이패'], bomber: ['푸른 불빛', '도깨비불 떼'], treant: ['걸어오는 장승', '장승 행렬'], shaman: ['둥둥 북소리', '북 도깨비 패'], rassassin: ['여우 울음', '불여우 무리'], rshield: ['솥뚜껑 방벽', '솥뚜껑 패거리'], garcher: ['돌팔매질', '돌팔매 패'], orc: ['방망이 패거리', '방망이 패'], goblin: ['고갯마루의 불청객', '도깨비 떼'] };
export const AFFIX = {
  rage: { name: '광분', desc: '공격 속도 +20%', foe: { as: 1.2 } },
  iron: { name: '철갑', desc: '체력 +30%', foe: { hp: 1.3 } },
  swift: { name: '날쌘', desc: '이동 속도 +30%', foe: { spd: 1.3 } },
  regen: { name: '재생', desc: '초마다 체력 1.5% 회복', foe: { regen: 0.015 } },
  fierce: { name: '흉포', desc: '공격력 +20%', foe: { atk: 1.2 } },
};
const SPREAD = { 1: [2.5], 2: [1.5, 3.5], 3: [0.75, 2.5, 4.25], 4: [0.25, 1.75, 3.25, 4.75] };

export const BOSSES = [
  { name: '푸른 김서방', enemyName: '도깨비 두목 푸른 김서방', map: 'arena', lvl: 1, time: 130, starDeaths: 8, starTime: 75, key: 'warchief',
    enemy: [['warchief', 2.5, 1], ['orc', 1, 0], ['orc', 4, 0], ['goblin', 2.5, 0, { n: 6 }], ['garcher', 0.5, 2, { n: 4 }], ['garcher', 4.5, 2, { n: 4 }]] },
  { name: '당산 할배', enemyName: '잊힌 숲의 당산 할배', map: 'grove', lvl: 2, time: 140, starDeaths: 9, starTime: 85, key: 'elder',
    enemy: [['elder', 2.5, 1], ['treant', 1, 0, { n: 1 }], ['treant', 4, 0, { n: 1 }], ['shaman', 2.5, 2, { n: 2 }], ['garcher', 0.5, 2, { n: 4 }], ['garcher', 4.5, 2, { n: 4 }], ['goblin', 2.5, 0, { n: 6 }]] },
  { name: '어둑시니', enemyName: '잊힌 것들의 그림자 어둑시니', map: 'throne', lvl: 3, time: 150, starDeaths: 10, starTime: 95, key: 'skelking',
    enemy: [['skelking', 2.5, 1], ['skel', 1, 0, { n: 4 }], ['skel', 2.5, 0, { n: 4 }], ['skel', 4, 0, { n: 4 }], ['rshield', 0, 0, { n: 2 }], ['skelarcher', 1, 2, { n: 3 }], ['skelarcher', 4, 2, { n: 3 }], ['necro', 2.5, 2], ['rassassin', 5, 2, { n: 2 }]] },
];

// 깊이(0 = 첫 싸움) → 요괴 예산. 밸런스는 tools/campaign.mjs 로 맞춘다.
export function budgetFor(ch, row, kind, hard) { return (10.5 + ch * 5 + row * 1.3) * (kind === 'elite' ? 1.15 : 1) * (1 + 0.05 * hard); }

export function genEncounter(ch, row, kind, R, hard = 0) {
  // 본대: 싸움을 너무 오래 끌면 뒤따라온 요괴 본대가 차례로 들이닥친다
  const chase = { at: 0, every: 11, types: [['goblin', 'orc'], ['orc', 'wolf', 'bomber'], ['skel', 'skelarcher', 'orc']][ch] };
  if (kind === 'boss') { const b = BOSSES[ch]; chase.at = b.starTime + 30; return Object.assign({ ch, row, kind, boss: true, tip: UNITS[b.key].tip, foe: {}, terrain: 'arena', sky: ch === 2 ? 'night' : 'day', chase }, b); }
  const pool = POOLS[ch];
  let budget = budgetFor(ch, row, kind, hard);
  const first = ch === 0 && row === 0;
  const avail = Object.keys(pool.w).filter(t => !(first && (t === 'rshield' || t === 'rassassin')));
  const picks = [], cnt = {};
  for (let guard = 0; budget >= 1.8 && picks.length < 10 && guard < 80; guard++) {
    let cand = avail.filter(t => THREAT[t] <= budget + 0.6 && (cnt[t] || 0) < (LIMIT[t] || 4));
    const fronts = picks.filter(t => ROLE[t] === 'front').length;
    if (fronts === 0 || fronts < picks.length * 0.34) { const f = cand.filter(t => ROLE[t] === 'front'); if (f.length) cand = f; }
    if (!cand.length) break;
    let x = R() * cand.reduce((a, t) => a + pool.w[t], 0), t = cand[0];
    for (const c of cand) { if ((x -= pool.w[c]) < 0) { t = c; break; } }
    picks.push(t); cnt[t] = (cnt[t] || 0) + 1; budget -= THREAT[t];
  }
  // 줄 배치: 전열 / 중열 / 후열, 넘치면 중열로
  const rows = [[], [], []], flank = [];
  for (const t of picks) { const role = ROLE[t]; if (role === 'flank') flank.push(t); else rows[role === 'front' ? 0 : role === 'mid' ? 1 : 2].push(t); }
  while (rows[0].length > 4) rows[1].push(rows[0].pop());
  while (rows[2].length > 4) rows[1].push(rows[2].pop());
  while (rows[1].length > 4) rows[rows[0].length < 4 ? 0 : 2].push(rows[1].pop());
  const enemy = [];
  rows.forEach((list, r) => { const cols = SPREAD[Math.min(4, list.length)] || []; list.slice(0, 4).forEach((t, i) => enemy.push([t, cols[i], r])); });
  flank.forEach((t, i) => enemy.push([t, i ? 5 : 0, 1, { flank: i ? 'R' : 'L', wait: i ? 5 : 0 }]));
  const key = FEATURE.find(t => picks.includes(t)) || 'goblin';
  const affixId = kind === 'elite' ? Object.keys(AFFIX)[(R() * Object.keys(AFFIX).length) | 0] : null;
  const units = enemy.reduce((a, e) => a + ((e[3] && e[3].n) || UNITS[e[0]].n), 0), starTime = Math.round(46 + units * 0.9 + ch * 6 + (kind === 'elite' ? 12 : 0));
  chase.at = starTime + 22;
  return {
    terrain: first ? 'open' : pickTerrain(ch, R), sky: first ? 'day' : pickSky(ch, R), chase,
    ch, row, kind, boss: false, lvl: pool.lvl, map: pool.maps[(R() * pool.maps.length) | 0], enemy, key,
    name: (kind === 'elite' ? '강적 · ' : '') + NAMES[key][0], enemyName: NAMES[key][1], tip: UNITS[key].tip,
    affix: affixId, foe: affixId ? Object.assign({}, AFFIX[affixId].foe) : {},
    time: 110 + ch * 10 + (kind === 'elite' ? 10 : 0), starDeaths: 4 + ch * 2 + Math.floor(row / 2), starTime,
  };
}
