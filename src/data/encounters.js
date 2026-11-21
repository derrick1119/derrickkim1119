// 싸움 편성 생성기: 고개와 깊이에 맞춰 요괴 부대를 뽑아 진형을 짠다
// enemy 항목: [병종, 열(0~5), 줄(0=전열, 2=후열), 옵션{n, hold, flank:'L'|'R', wait}]
import { UNITS } from './units.js';
import { CHAPTERS, N_CH } from './stages.js';

export const ROWS = 5; // 고개 하나의 갈림길 줄 수 (그 위가 두목)
const THREAT = { goblin: 2, orc: 3, garcher: 2.5, rshield: 3.2, rassassin: 3, treant: 4.2, bomber: 3, wolf: 3.6, shaman: 3.4, skel: 3.2, skelarcher: 3, catapult: 4.2, necro: 5, yagwang: 3.2, dueok: 4.8, bulga: 5.6, jangsan: 4.8, geuseun: 5.2 };
const ROLE = { goblin: 'front', orc: 'front', rshield: 'front', treant: 'front', skel: 'front', rassassin: 'mid', bomber: 'mid', wolf: 'flank', shaman: 'back', garcher: 'back', skelarcher: 'back', necro: 'back', catapult: 'siege', yagwang: 'mid', dueok: 'front', bulga: 'front', jangsan: 'flank', geuseun: 'front' };
const LIMIT = { catapult: 2, necro: 2, shaman: 2, wolf: 2, rassassin: 2, bomber: 2, treant: 3, rshield: 3, yagwang: 2, dueok: 2, bulga: 1, jangsan: 1, geuseun: 1 };
const MAPS = ['meadow', 'ruins', 'pillars', 'forest', 'river', 'graveyard', 'fort', 'moat'];
// 편성에서 가장 눈에 띄는 요괴가 싸움 이름을 정한다
const FEATURE = ['necro', 'geuseun', 'bulga', 'jangsan', 'catapult', 'dueok', 'wolf', 'bomber', 'treant', 'shaman', 'skel', 'rassassin', 'rshield', 'garcher', 'orc', 'goblin'];
const NAMES = { necro: ['저승사자의 명부', '저승사자 일행'], catapult: ['바위 세례', '투석 패거리'], skel: ['되살아나는 자들', '망령 무리'], wolf: ['멧돼지 몰이', '멧돼지 몰이패'], bomber: ['푸른 불빛', '도깨비불 떼'], treant: ['걸어오는 장승', '장승 행렬'], shaman: ['둥둥 북소리', '북 도깨비 패'], rassassin: ['여우 울음', '불여우 무리'], rshield: ['솥뚜껑 방벽', '솥뚜껑 패거리'], garcher: ['돌팔매질', '돌팔매 패'], orc: ['방망이 패거리', '방망이 패'], goblin: ['고갯마루의 불청객', '도깨비 떼'], geuseun: ['커지는 그림자', '그슨대와 그림자들'], bulga: ['쇠 먹는 짐승', '불가사리 무리'], jangsan: ['부르는 목소리', '장산범 무리'], dueok: ['내리찍는 주먹', '두억시니 패'], yagwang: ['신발 도둑', '야광귀 떼'] };
export const AFFIX = {
  rage: { name: '광분', desc: '공격 속도 +20%', foe: { as: 1.2 } },
  iron: { name: '철갑', desc: '체력 +30%', foe: { hp: 1.3 } },
  swift: { name: '날쌘', desc: '이동 속도 +30%', foe: { spd: 1.3 } },
  regen: { name: '재생', desc: '초마다 체력 1.5% 회복', foe: { regen: 0.015 } },
  fierce: { name: '흉포', desc: '공격력 +20%', foe: { atk: 1.2 } },
};
const SPREAD = { 1: [2.5], 2: [1.5, 3.5], 3: [0.75, 2.5, 4.25], 4: [0.25, 1.75, 3.25, 4.75] };

// 두목은 고개마다 정해져 있지만, 거느린 패거리는 원정마다 다르다 (with = 알림에 붙는 한마디)
const BK = (key, time, starDeaths, starTime, ...packs) => ({ key, name: UNITS[key].name, enemyName: UNITS[key].name, map: 'arena', time, starDeaths, starTime, packs: packs.map(p => ({ with: p[0], enemy: [[key, 2.5, p[1] || 1], ...p.slice(2)] })) });
export const BOSSES = {
  gumiho: BK('gumiho', 130, 8, 75,
    ['불여우 둘을 데리고 왔다', 1, ['rassassin', 1, 0, { n: 2 }], ['rassassin', 4, 0, { n: 2 }], ['goblin', 2.5, 0, { n: 6 }], ['garcher', 2.5, 2, { n: 4 }]],
    ['도깨비불을 띄웠다', 1, ['goblin', 1, 0, { n: 5 }], ['goblin', 4, 0, { n: 5 }], ['bomber', 2.5, 0, { n: 2 }], ['garcher', 2.5, 2, { n: 4 }]]),
  dueokboss: BK('dueokboss', 135, 8, 78,
    ['방망이 패를 거느렸다', 1, ['orc', 1, 0], ['orc', 4, 0], ['garcher', 0.5, 2, { n: 4 }], ['garcher', 4.5, 2, { n: 4 }]],
    ['솥뚜껑 패를 앞세웠다', 1, ['rshield', 1, 0, { n: 3 }], ['rshield', 4, 0, { n: 3 }], ['goblin', 2.5, 0, { n: 6 }], ['garcher', 2.5, 2, { n: 4 }]]),
  warchief: BK('warchief', 135, 8, 78,
    ['방망이 패를 거느렸다', 1, ['orc', 1, 0], ['orc', 4, 0], ['goblin', 2.5, 0, { n: 6 }], ['garcher', 0.5, 2, { n: 4 }], ['garcher', 4.5, 2, { n: 4 }]],
    ['솥뚜껑 패를 앞세웠다', 1, ['rshield', 1, 0, { n: 3 }], ['rshield', 4, 0, { n: 3 }], ['goblin', 2.5, 0, { n: 6 }], ['garcher', 0.5, 2, { n: 4 }], ['garcher', 4.5, 2, { n: 4 }]],
    ['북 도깨비가 장단을 친다', 1, ['orc', 1, 0], ['orc', 4, 0], ['goblin', 2.5, 0, { n: 6 }], ['shaman', 2.5, 2, { n: 2 }], ['garcher', 4.5, 2, { n: 4 }]]),
  tigerboss: BK('tigerboss', 135, 9, 80,
    ['멧돼지를 몰고 왔다', 1, ['wolf', 0.5, 0, { n: 2 }], ['wolf', 4.5, 0, { n: 2 }], ['orc', 2.5, 0], ['garcher', 1.5, 2, { n: 4 }], ['garcher', 3.5, 2, { n: 4 }]],
    ['불여우가 뒤따른다', 1, ['rassassin', 1, 0, { n: 3 }], ['rassassin', 4, 0, { n: 3 }], ['orc', 2.5, 0], ['garcher', 2.5, 2, { n: 5 }]]),
  serpent: BK('serpent', 140, 9, 85,
    ['장승 둘이 곁을 지킨다', 1, ['treant', 1, 0, { n: 1 }], ['treant', 4, 0, { n: 1 }], ['goblin', 2.5, 0, { n: 6 }], ['shaman', 2.5, 2, { n: 2 }], ['garcher', 1, 2, { n: 4 }]],
    ['도깨비불이 떠다닌다', 1, ['rshield', 1, 0, { n: 3 }], ['rshield', 4, 0, { n: 3 }], ['bomber', 2.5, 0, { n: 3 }], ['garcher', 1, 2, { n: 4 }], ['garcher', 4, 2, { n: 4 }]]),
  elder: BK('elder', 140, 9, 85,
    ['졸개 떼가 뒤따른다', 1, ['treant', 1, 0, { n: 1 }], ['treant', 4, 0, { n: 1 }], ['shaman', 2.5, 2, { n: 2 }], ['garcher', 0.5, 2, { n: 4 }], ['garcher', 4.5, 2, { n: 4 }], ['goblin', 2.5, 0, { n: 6 }]],
    ['멧돼지를 몰고 왔다', 1, ['treant', 1, 0, { n: 1 }], ['treant', 4, 0, { n: 1 }], ['shaman', 2.5, 2, { n: 2 }], ['garcher', 0.5, 2, { n: 4 }], ['garcher', 4.5, 2, { n: 3 }], ['wolf', 2.5, 0, { n: 2 }]],
    ['도깨비불을 띄웠다', 1, ['treant', 1, 0, { n: 1 }], ['treant', 4, 0, { n: 1 }], ['shaman', 2.5, 2, { n: 2 }], ['garcher', 0.5, 2, { n: 4 }], ['garcher', 4.5, 2, { n: 3 }], ['bomber', 2.5, 0, { n: 3 }]]),
  bulgaboss: BK('bulgaboss', 145, 9, 88,
    ['솥뚜껑 패와 투석기를 세웠다', 1, ['rshield', 1, 0, { n: 3 }], ['rshield', 4, 0, { n: 3 }], ['orc', 2.5, 0], ['catapult', 2.5, 2], ['garcher', 0.5, 2, { n: 4 }]],
    ['새끼 불가사리가 따라왔다', 1, ['bulga', 1, 0], ['dueok', 4, 0, { n: 1 }], ['bomber', 2.5, 0, { n: 3 }], ['garcher', 2.5, 2, { n: 5 }]]),
  plague: BK('plague', 145, 10, 90,
    ['야광귀를 풀어놓았다', 2, ['skel', 1, 0, { n: 4 }], ['skel', 4, 0, { n: 4 }], ['orc', 2.5, 0], ['yagwang', 2.5, 1, { n: 4 }], ['shaman', 1, 2, { n: 2 }]],
    ['그슨대가 앞을 막는다', 2, ['orc', 1, 0], ['orc', 4, 0], ['geuseun', 2.5, 0], ['bomber', 2.5, 1, { n: 3 }], ['garcher', 1, 2, { n: 4 }]]),
  imugi: BK('imugi', 150, 10, 92,
    ['솥뚜껑 패가 물가를 막았다', 1, ['rshield', 1, 0, { n: 3 }], ['rshield', 4, 0, { n: 3 }], ['shaman', 2.5, 2, { n: 2 }], ['garcher', 0.5, 2, { n: 4 }], ['garcher', 4.5, 2, { n: 4 }], ['wolf', 5, 1, { n: 2 }]],
    ['장승과 장산범이 따른다', 1, ['treant', 1, 0, { n: 1 }], ['treant', 4, 0, { n: 1 }], ['jangsan', 5, 1], ['shaman', 2.5, 2, { n: 2 }], ['garcher', 1, 2, { n: 4 }], ['garcher', 4, 2, { n: 4 }]]),
  skelking: BK('skelking', 150, 10, 95,
    ['저승사자가 곁에 섰다', 1, ['skel', 1, 0, { n: 4 }], ['skel', 2.5, 0, { n: 4 }], ['skel', 4, 0, { n: 4 }], ['rshield', 0, 0, { n: 2 }], ['skelarcher', 1, 2, { n: 3 }], ['skelarcher', 4, 2, { n: 3 }], ['necro', 2.5, 2], ['rassassin', 5, 2, { n: 2 }]],
    ['그슨대를 거느렸다', 1, ['skel', 1, 0, { n: 4 }], ['geuseun', 2.5, 0], ['skel', 4, 0, { n: 4 }], ['skelarcher', 1, 2, { n: 3 }], ['skelarcher', 4, 2, { n: 3 }], ['necro', 2.5, 2], ['rassassin', 5, 2, { n: 1 }]],
    ['바위를 날려 보낸다', 1, ['skel', 1, 0, { n: 4 }], ['skel', 2.5, 0, { n: 5 }], ['skel', 4, 0, { n: 4 }], ['rshield', 0, 0, { n: 2 }], ['skelarcher', 1, 2, { n: 3 }], ['skelarcher', 4, 2, { n: 3 }], ['catapult', 2.5, 2], ['rassassin', 5, 2, { n: 2 }]]),
  reaper: BK('reaper', 150, 10, 95,
    ['망령 병사가 줄지어 섰다', 2, ['skel', 1, 0, { n: 4 }], ['skel', 2.5, 0, { n: 5 }], ['skel', 4, 0, { n: 4 }], ['skelarcher', 1, 2, { n: 3 }], ['skelarcher', 4, 2, { n: 3 }], ['necro', 5, 2]],
    ['그슨대와 솥뚜껑 패를 세웠다', 2, ['rshield', 1, 0, { n: 3 }], ['geuseun', 2.5, 0], ['rshield', 4, 0, { n: 3 }], ['skelarcher', 1, 2, { n: 4 }], ['skelarcher', 4, 2, { n: 4 }]]),
  yeomra: BK('yeomra', 160, 11, 100,
    ['시왕의 군사가 늘어섰다', 1, ['skel', 1, 0, { n: 4 }], ['skel', 4, 0, { n: 4 }], ['dueok', 2.5, 0, { n: 2 }], ['skelarcher', 1, 2, { n: 3 }], ['skelarcher', 4, 2, { n: 3 }], ['necro', 2.5, 2], ['geuseun', 5, 1]],
    ['옥졸과 투석기를 세웠다', 1, ['rshield', 1, 0, { n: 3 }], ['rshield', 4, 0, { n: 3 }], ['skel', 2.5, 0, { n: 5 }], ['skelarcher', 1, 2, { n: 4 }], ['catapult', 2.5, 2], ['rassassin', 5, 2, { n: 2 }]]),
};

// 고개마다의 세기: [첫 싸움 예산, 칸마다 더]. 요괴의 단계는 고개 번호 + 1 (아군 병력도 고개마다 한 단계씩 단련된다).
// 뒤 고개로 갈수록 머릿수보다는 단계로 세진다. 밸런스는 tools/campaign.mjs 로 맞춘다
const CURVE = [[13, 1.1], [16, 1.2], [19.5, 1.4], [23, 1.4], [26.5, 1.5], [29, 1.5], [29, 1.5], [32, 1.5], [34, 1.5], [35, 1.5], [36, 1.5], [37.5, 1.5]];
export function budgetFor(ch, row, kind, eliteMul = 1) { const c = CURVE[Math.min(N_CH - 1, ch)]; return (c[0] + row * c[1]) * (kind === 'elite' ? 1.28 * eliteMul : 1); }

const sky = (C, R) => { const x = R(); return x < C.sky[0] ? 'day' : x < C.sky[0] + C.sky[1] ? 'night' : 'rain'; };
export function genEncounter(ch, row, kind, R, eliteMul = 1) {
  // 본대: 싸움을 너무 오래 끌면 뒤따라온 요괴 본대가 차례로 들이닥친다
  const C = CHAPTERS[Math.min(N_CH - 1, ch)], lvl = ch + 1, late = Math.min(ch, 4);
  const chase = { at: 0, every: 11, types: C.chase };
  if (kind === 'boss') { const b = BOSSES[C.boss], pk = b.packs[(R() * b.packs.length) | 0]; chase.at = b.starTime + 30; return Object.assign({ ch, row, kind, boss: true, tip: UNITS[b.key].tip, foe: {}, terrain: 'arena', sky: C.bossSky, chase }, b, { packs: undefined, enemy: pk.enemy, with: pk.with, lvl }); }
  const pool = { w: C.pool };
  let budget = budgetFor(ch, row, kind, eliteMul);
  const first = ch === 0 && row === 0;
  const avail = Object.keys(pool.w).filter(t => !(first && (t === 'rshield' || t === 'rassassin' || t === 'yagwang')));
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
  const units = enemy.reduce((a, e) => a + ((e[3] && e[3].n) || UNITS[e[0]].n), 0), starTime = Math.round(46 + units * 0.9 + late * 6 + (kind === 'elite' ? 12 : 0));
  chase.at = starTime + 22;
  return {
    terrain: first ? 'open' : C.terr[(R() * C.terr.length) | 0], sky: first ? 'day' : sky(C, R), chase,
    ch, row, kind, boss: false, lvl, map: MAPS[(R() * MAPS.length) | 0], enemy, key,
    name: (kind === 'elite' ? '강적 · ' : '') + NAMES[key][0], enemyName: NAMES[key][1], tip: UNITS[key].tip,
    affix: affixId, foe: affixId ? Object.assign({}, AFFIX[affixId].foe) : {},
    time: 110 + late * 10 + (kind === 'elite' ? 10 : 0), starDeaths: 4 + late * 2 + Math.floor(row / 2), starTime,
  };
}
