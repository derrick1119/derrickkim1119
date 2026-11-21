import { UNITS, PLAYER_TYPES, HEROES } from './units.js';

// 패: 싸움 중 손패에서 사기를 내고 쓴다 (전술 패 + 병력 패 + 영웅 패)
// kind: attack(공격) / support(지원) / tactic(책략) / hero(영웅 전용) / curse(부정)
// v = 기본 수치, up = 강화했을 때 덮어쓰는 수치 (upCost = 강화 시 줄어드는 비용)
export const CARDS = {
  sling: { name: '돌팔매', ch: '石', kind: 'attack', cost: 1, r: 62, target: true, rare: 0, v: { dmg: 100 }, up: { dmg: 150 }, desc: v => `좁은 범위에 피해 ${v.dmg}` },
  rain: { name: '화살비', ch: '矢', kind: 'attack', cost: 3, r: 88, target: true, rare: 0, v: { tick: 36 }, up: { tick: 48 }, desc: v => `범위에 화살 다섯 번 (한 번에 ${v.tick}). 방패 무시` },
  firerain: { name: '불화살 세례', ch: '火', kind: 'attack', cost: 4, r: 94, target: true, rare: 1, v: { tick: 34, burn: 16 }, up: { tick: 42, burn: 26 }, desc: v => `화살 다섯 번 (한 번에 ${v.tick}) + 3초 화상 (초당 ${v.burn})` },
  thunder: { name: '벼락', ch: '雷', kind: 'attack', cost: 2, r: 84, target: true, rare: 1, v: { dmg: 320, stun: 2 }, up: { dmg: 440, stun: 2.5 }, desc: v => `범위에서 가장 튼튼한 적 하나에게 피해 ${v.dmg}, 기절 ${v.stun}초` },
  volley: { name: '총통 일제사격', ch: '砲', kind: 'attack', cost: 5, r: 114, target: true, rare: 2, v: { dmg: 370, stun: 1 }, up: { dmg: 480, stun: 1.5 }, desc: v => `1.4초 뒤 넓은 범위에 피해 ${v.dmg}, 기절 ${v.stun}초` },
  caltrop: { name: '마름쇠', ch: '鐵', kind: 'tactic', cost: 2, r: 96, target: true, rare: 1, v: { dur: 12, slow: 50, dps: 18 }, up: { dur: 16, slow: 65, dps: 24 }, desc: v => `${v.dur}초 동안 범위 안 적의 속도 -${v.slow}%, 초당 피해 ${v.dps}` },
  heal: { name: '약손', ch: '藥', kind: 'support', cost: 1, r: 84, target: true, rare: 0, v: { heal: 28 }, up: { heal: 40 }, desc: v => `범위 내 아군 체력 ${v.heal}% 즉시 회복` },
  grail: { name: '정화 굿', ch: '淨', kind: 'support', cost: 3, r: 105, target: true, rare: 0, v: { heal: 48 }, up: { heal: 62 }, desc: v => `3초에 걸쳐 체력 ${v.heal}% 회복, 해로운 효과 제거. 망령의 부활을 막는다` },
  wall: { name: '방패 진', ch: '陣', kind: 'support', cost: 2, r: 112, target: true, rare: 1, v: { guard: 50, dur: 8 }, up: { guard: 62, dur: 10 }, desc: v => `범위 내 아군이 ${v.dur}초간 받는 피해 -${v.guard}%` },
  horn: { name: '진군의 북', ch: '鼓', kind: 'support', cost: 2, target: false, rare: 0, v: { dur: 9 }, up: { dur: 13 }, desc: v => `${v.dur}초간 전군 이동·공격 속도 증가. 기마 무사는 즉시 돌격 준비` },
  cry: { name: '함성', ch: '喊', kind: 'support', cost: 2, r: 124, target: true, rare: 1, v: { dmg: 40, dur: 9 }, up: { dmg: 55, dur: 11 }, desc: v => `범위 내 아군이 ${v.dur}초간 주는 피해 +${v.dmg}%` },
  ambush: { name: '매복', ch: '伏', kind: 'tactic', cost: 3, r: 44, target: true, rare: 1, v: { n: 5, life: 24 }, up: { n: 7, life: 30 }, desc: v => `그 자리에 환도 무사 ${v.n}명이 나타나 ${v.life}초간 싸운다` },
  archers: { name: '원군 궁수', ch: '弓', kind: 'tactic', cost: 3, r: 44, target: true, rare: 1, v: { n: 4, life: 24 }, up: { n: 6, life: 30 }, desc: v => `그 자리에 궁수 ${v.n}명이 나타나 ${v.life}초간 싸운다` },
  stakes: { name: '목책 세우기', ch: '柵', kind: 'tactic', cost: 2, r: 40, target: true, rare: 0, v: { hp: 340, life: 36 }, up: { hp: 520, life: 50 }, desc: v => `그 자리에 말뚝 넷을 세워 ${v.life}초간 길을 막는다 (하나에 체력 ${v.hp})` },
  scout: { name: '척후', ch: '斥', kind: 'tactic', cost: 1, target: false, rare: 0, v: { gain: 3, expose: 20 }, up: { gain: 4, expose: 30 }, desc: v => `다음 물결이 시작될 때 사기 +${v.gain}, 그 요괴들은 처음 8초간 받는 피해 +${v.expose}%. 미리 써 두는 패` },
  torch: { name: '횃불', ch: '炬', kind: 'support', cost: 1, target: false, rare: 0, v: { dur: 30, range: 12 }, up: { dur: 45, range: 20 }, desc: v => `${v.dur}초간 밤의 불이익을 걷어내고 아군 원거리 사거리 +${v.range}%` },
  decoy: { name: '허수아비', ch: '虛', kind: 'tactic', cost: 1, r: 130, target: true, rare: 1, v: { hp: 560, life: 9 }, up: { hp: 1000, life: 12 }, desc: v => `${v.life}초 동안 주변 적의 눈길을 끄는 허수아비 (체력 ${v.hp})` },
  // ── 영웅 전용 ──
  strike: { name: '언월 강타', ch: '擊', kind: 'hero', hero: 'commander', cost: 3, r: 85, target: true, v: { dmg: 330, stun: 2 }, up: { dmg: 440, stun: 2.5 }, desc: v => `장군이 뛰어들어 범위 피해 ${v.dmg}, 기절 ${v.stun}초` },
  order: { name: '호령', ch: '令', kind: 'hero', hero: 'commander', cost: 1, target: false, v: { dur: 9 }, up: { dur: 13 }, desc: v => `장군 주변 아군이 ${v.dur}초간 공격 속도 +30%, 피해 +20%` },
  sanctuary: { name: '법력 결계', ch: '結', kind: 'hero', hero: 'bishop', cost: 3, r: 140, target: true, v: { barrier: 200 }, up: { barrier: 290 }, desc: v => `범위 내 아군에게 보호막 ${v.barrier}과 체력 15% 회복` },
  sutra: { name: '독경', ch: '經', kind: 'hero', hero: 'bishop', cost: 2, target: false, v: { regen: 4, dur: 6 }, up: { regen: 6, dur: 7 }, desc: v => `전군의 해로운 효과 제거, ${v.dur}초간 초당 체력 ${v.regen}% 회복` },
  meteor: { name: '불벼락', ch: '霹', kind: 'hero', hero: 'archmage', cost: 4, r: 95, target: true, v: { dmg: 500 }, up: { dmg: 660 }, desc: v => `1.1초 뒤 불벼락이 떨어져 피해 ${v.dmg}과 화상` },
  flash: { name: '일섬', ch: '閃', kind: 'hero', hero: 'blade', cost: 2, r: 46, target: true, v: { dmg: 230, mark: 25 }, up: { dmg: 310, mark: 35 }, desc: v => `검객이 그곳까지 베며 지나간다. 스친 적에게 피해 ${v.dmg}, 5초간 받는 피해 +${v.mark}%` },
  veil: { name: '안개 걸음', ch: '霧', kind: 'hero', hero: 'blade', cost: 1, target: false, v: { dur: 4 }, up: { dur: 6 }, desc: v => `검객이 ${v.dur}초간 모든 공격을 흘려 내고 공격 속도 +30%` },
  mark: { name: '표적', ch: '標', kind: 'hero', hero: 'hunter', cost: 1, r: 100, target: true, v: { amt: 30, dur: 10 }, up: { amt: 45, dur: 12 }, desc: v => `범위 내 적이 ${v.dur}초간 받는 피해 +${v.amt}%` },
  snare: { name: '올가미', ch: '捕', kind: 'hero', hero: 'hunter', cost: 2, r: 85, target: true, v: { dmg: 130, root: 3.5 }, up: { dmg: 190, root: 5 }, desc: v => `범위 내 적에게 피해 ${v.dmg}, ${v.root}초간 발을 묶는다` },
  pangut: { name: '판굿', ch: '興', kind: 'hero', hero: 'sangsoe', cost: 2, target: false, v: { free: 1 }, up: { free: 2 }, desc: v => `손패를 모두 새로 뽑고, 다음에 내는 패 ${v.free}장은 공짜` },
  deong: { name: '덩더쿵', ch: '響', kind: 'hero', hero: 'sangsoe', cost: 3, target: false, v: { stun: 2, dur: 7 }, up: { stun: 2.8, dur: 9 }, desc: v => `모든 적이 ${v.stun}초간 넋을 잃고(두목은 느려짐), 전군 ${v.dur}초간 공격 속도 +30%` },
  bulwark: { name: '버티기', ch: '壁', kind: 'hero', hero: 'chief', cost: 2, target: false, v: { guard: 75, dur: 8 }, up: { guard: 88, dur: 10 }, desc: v => `두령이 ${v.dur}초간 받는 피해 -${v.guard}%, 주변 적이 모두 두령에게 달려든다` },
  raid: { name: '산채 패거리', ch: '黨', kind: 'hero', hero: 'chief', cost: 3, r: 46, target: true, v: { n: 5, life: 18 }, up: { n: 6, life: 22 }, desc: v => `철퇴 장사 ${v.n}명이 ${v.life}초간 달려와 싸운다` },
  blink: { name: '축지법', ch: '縮', kind: 'hero', hero: 'archmage', cost: 1, r: 92, target: true, v: { heal: 18 }, up: { heal: 30 }, desc: v => `범위 내 아군을 뒤쪽으로 순간이동, 체력 ${v.heal}% 회복` },
  // ── 부정 ──
  doubt: { name: '잡념', ch: '念', kind: 'curse', cost: 1, target: false, v: {}, up: {}, desc: () => '쓸모없는 패. 사기 1을 내면 버릴 수 있다' },
};
// ── 병력 패·영웅 패: 내면 그 자리에 부대가 선다. 부대가 전멸하면 그 싸움이 끝난 뒤에야 돌아온다 ──
const UNIT_CH = { sword: '刀', shield: '牌', spear: '槍', xbow: '弓', priest: '巫', knight: '騎', wizard: '道', berserk: '槌', cannon: '車', magpie: '鵲', sapsal: '犬', haetae: '守', samjoko: '烏', tiger: '虎' };
for (const t of PLAYER_TYPES) CARDS['u_' + t] = { name: UNITS[t].name, ch: UNIT_CH[t] || UNITS[t].name[0], kind: 'unit', unit: t, cost: UNITS[t].cost, rare: UNITS[t].cost > 2 ? 1 : 0, target: true, r: 46, v: {}, up: {}, desc: () => UNITS[t].desc };
for (const h of HEROES) CARDS['h_' + h] = { name: UNITS[h].name, ch: '英', kind: 'lead', unit: h, cost: 4, target: true, r: 46, v: {}, up: {}, desc: () => UNITS[h].desc };
for (const k of Object.keys(CARDS)) CARDS[k].id = k;
export const KIND = { unit: { name: '병력', col: '#3f5f8a' }, lead: { name: '영웅', col: '#a8322a' }, attack: { name: '공격', col: '#b8382a' }, support: { name: '지원', col: '#2f6f5c' }, tactic: { name: '책략', col: '#5a4a8a' }, hero: { name: '영웅기', col: '#b8742a' }, curse: { name: '부정', col: '#5a5346' } };
export const isUnit = c => CARDS[c.id].kind === 'unit' || CARDS[c.id].kind === 'lead';
export const MAX_LV = 6;
export const cardVals = c => Object.assign({}, CARDS[c.id].v, c.up ? CARDS[c.id].up : {});
export const cardCost = c => Math.max(0, CARDS[c.id].cost - (c.up && CARDS[c.id].upCost || 0));
export const cardName = c => CARDS[c.id].name + (isUnit(c) ? ((c.lv || 1) > 1 ? ' ' + c.lv + '단' : '') : c.up ? '+' : '');
export const cardDesc = c => CARDS[c.id].desc(cardVals(c));
// 한 묶음에 든 장수: 흔한 패는 셋, 귀한 패는 하나
export const packN = id => CARDS[id].hero ? 2 : [3, 2, 1][CARDS[id].rare || 0];
// 시작 덱은 영웅마다 다르다: 이끄는 영웅의 병법(HERO_TRAIT)에 맞춘 병력과 전술 패. 전술 패는 쓰면 사라진다
const START = {
  commander: { units: ['sword', 'shield', 'xbow', 'sword', 'xbow', 'spear'], cards: ['sling', 'sling', 'rain', 'heal', 'horn', 'cry', 'strike', 'order'] },
  blade: { units: ['sword', 'xbow', 'shield', 'xbow'], cards: ['sling', 'sling', 'rain', 'heal', 'scout', 'flash', 'flash', 'veil', 'veil'] },
  hunter: { units: ['shield', 'xbow', 'shield', 'xbow', 'spear'], cards: ['sling', 'sling', 'rain', 'rain', 'heal', 'scout', 'mark', 'mark', 'snare'] },
  bishop: { units: ['sword', 'shield', 'xbow', 'spear', 'priest'], cards: ['sling', 'sling', 'rain', 'heal', 'heal', 'wall', 'horn', 'sanctuary', 'sutra'] },
  archmage: { units: ['shield', 'xbow', 'shield', 'xbow'], cards: ['sling', 'sling', 'rain', 'rain', 'thunder', 'caltrop', 'heal', 'meteor', 'blink'] },
  sangsoe: { units: ['sword', 'shield', 'xbow', 'xbow', 'spear'], cards: ['sling', 'sling', 'rain', 'heal', 'horn', 'horn', 'cry', 'pangut', 'deong'] },
  chief: { units: ['sword', 'shield', 'xbow', 'sword', 'xbow'], cards: ['sling', 'sling', 'sling', 'rain', 'heal', 'decoy', 'bulwark', 'raid'] },
};
export function starterDeck(hero) {
  const st = START[hero] || START.commander, ids = ['h_' + hero].concat(st.units.map(u => 'u_' + u), st.cards);
  return ids.map(id => ({ id, up: false, lv: 1 }));
}
