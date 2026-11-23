import { UNITS, PLAYER_TYPES, HEROES } from './units.js';
import { AXIS_CARDS } from './cards_axis.js';
import { branchOf } from './branches.js';

// 패: 싸움 중 손패에서 사기를 내고 쓴다 (전술 패 + 병력 패 + 영웅 패)
// kind: attack(공격) / support(지원) / tactic(책략) / hero(영웅 전용) / curse(부정)
// v = 기본 수치, up = 강화했을 때 덮어쓰는 수치 (upCost = 강화 시 줄어드는 비용)
export const CARDS = {
  sling: { name: '돌팔매', kind: 'attack', cost: 1, r: 62, target: true, rare: 0, v: { dmg: 100 }, up: { dmg: 150 }, desc: v => `좁은 범위에 피해 ${v.dmg}` },
  rain: { name: '화살비', kind: 'attack', cost: 3, r: 88, target: true, rare: 0, v: { tick: 36 }, up: { tick: 48 }, desc: v => `피해 ${v.tick} × 5발, 방패 무시` },
  firerain: { name: '불화살 세례', kind: 'attack', cost: 4, r: 94, target: true, rare: 1, v: { tick: 34, burn: 16 }, up: { tick: 42, burn: 26 }, desc: v => `피해 ${v.tick} × 5발 + 3초 화상 (초당 ${v.burn})` },
  thunder: { name: '벼락', kind: 'attack', cost: 2, r: 84, target: true, rare: 1, v: { dmg: 320, stun: 2 }, up: { dmg: 440, stun: 2.5 }, desc: v => `범위 안 가장 튼튼한 적에게 피해 ${v.dmg}, 기절 ${v.stun}초` },
  volley: { name: '총통 일제사격', kind: 'attack', cost: 5, r: 114, target: true, rare: 2, v: { dmg: 370, stun: 1 }, up: { dmg: 480, stun: 1.5 }, desc: v => `1.4초 뒤 범위 피해 ${v.dmg}, 기절 ${v.stun}초` },
  caltrop: { name: '마름쇠', kind: 'tactic', cost: 2, r: 96, target: true, rare: 1, v: { dur: 12, slow: 50, dps: 18 }, up: { dur: 16, slow: 65, dps: 24 }, desc: v => `${v.dur}초간 범위 안 적 속도 -${v.slow}%, 초당 피해 ${v.dps}` },
  heal: { name: '약손', kind: 'support', cost: 1, r: 84, target: true, rare: 0, v: { heal: 28 }, up: { heal: 40 }, desc: v => `범위 내 아군 체력 ${v.heal}% 즉시 회복` },
  grail: { name: '정화 굿', kind: 'support', cost: 3, r: 105, target: true, rare: 0, v: { heal: 48 }, up: { heal: 62 }, desc: v => `3초간 체력 ${v.heal}% 회복, 해로운 효과 제거. 망령 부활 방지` },
  wall: { name: '방패 진', kind: 'support', cost: 2, r: 112, target: true, rare: 1, v: { guard: 50, dur: 8 }, up: { guard: 62, dur: 10 }, desc: v => `범위 내 아군이 ${v.dur}초간 받는 피해 -${v.guard}%` },
  horn: { name: '진군의 북', kind: 'support', cost: 2, target: false, rare: 0, v: { dur: 9 }, up: { dur: 13 }, desc: v => `${v.dur}초간 전군 이동·공격 속도 증가, 기마는 즉시 돌격 준비` },
  cry: { name: '함성', kind: 'support', cost: 2, r: 124, target: true, rare: 1, v: { dmg: 40, dur: 9 }, up: { dmg: 55, dur: 11 }, desc: v => `범위 내 아군이 ${v.dur}초간 주는 피해 +${v.dmg}%` },
  ambush: { name: '매복', kind: 'tactic', cost: 3, r: 44, target: true, rare: 1, v: { n: 5, life: 24 }, up: { n: 7, life: 30 }, desc: v => `환도 무사 ${v.n}명이 나타나 ${v.life}초간 참전` },
  archers: { name: '원군 궁수', kind: 'tactic', cost: 3, r: 44, target: true, rare: 1, v: { n: 4, life: 24 }, up: { n: 6, life: 30 }, desc: v => `궁수 ${v.n}명이 나타나 ${v.life}초간 참전` },
  stakes: { name: '목책 세우기', kind: 'tactic', cost: 2, r: 40, target: true, rare: 0, v: { hp: 340, life: 36 }, up: { hp: 520, life: 50 }, desc: v => `말뚝 넷으로 ${v.life}초간 길을 막는다 (각 체력 ${v.hp})` },
  scout: { name: '척후', kind: 'tactic', cost: 1, target: false, rare: 0, v: { gain: 3, expose: 20 }, up: { gain: 4, expose: 30 }, desc: v => `다음 물결에 사기 +${v.gain}, 8초간 적이 받는 피해 +${v.expose}%` },
  torch: { name: '횃불', kind: 'support', cost: 1, target: false, rare: 0, v: { dur: 30, range: 12 }, up: { dur: 45, range: 20 }, desc: v => `${v.dur}초간 밤의 불이익 해제, 원거리 사거리 +${v.range}%` },
  decoy: { name: '허수아비', kind: 'tactic', cost: 1, r: 130, target: true, rare: 1, v: { hp: 560, life: 9 }, up: { hp: 1000, life: 12 }, desc: v => `${v.life}초간 주변 적의 눈길을 끈다 (체력 ${v.hp})` },
  // ── 빌드 축의 시동 패 (axis: data/branches.js 의 AXES) ──
  salvo: { name: '일제 사격', kind: 'support', axis: 'volley', cost: 2, target: false, rare: 1, v: { dur: 8, amt: 15 }, up: { dur: 11, amt: 25 }, desc: v => `원거리 아군이 ${v.dur}초간 공격 속도 +30%, 피해 +${v.amt}%` },
  masangjae: { name: '마상재', kind: 'support', axis: 'charge', cost: 2, target: false, rare: 1, v: { dur: 8, amt: 30 }, up: { dur: 11, amt: 45 }, desc: v => `돌격하는 아군이 바로 돌격 준비, ${v.dur}초간 피해 +${v.amt}%·받는 피해 -20%` },
  counter: { name: '반격 태세', kind: 'support', axis: 'wall', cost: 2, r: 110, target: true, rare: 1, v: { dur: 8, back: 40 }, up: { dur: 10, back: 60 }, desc: v => `범위 내 아군이 ${v.dur}초간 받는 피해 -30%, 근접으로 맞은 피해의 ${v.back}%를 되돌려 준다` },
  jincheon: { name: '비격진천뢰', kind: 'attack', axis: 'powder', cost: 4, r: 108, target: true, rare: 2, v: { dmg: 520, stun: 2 }, up: { dmg: 680, stun: 2.5 }, desc: v => `2.4초 뒤 터져 범위 피해 ${v.dmg}, 기절 ${v.stun}초, 화상` },
  reload: { name: '화약 재기', kind: 'support', axis: 'powder', cost: 1, target: false, rare: 0, v: { dur: 8, amt: 30 }, up: { dur: 11, amt: 45 }, desc: v => `화차·도사가 곧바로 다시 쏘고, ${v.dur}초간 피해 +${v.amt}%` },
  bujeok: { name: '불 부적', kind: 'support', axis: 'talisman', cost: 2, r: 110, target: true, rare: 1, v: { dur: 10, burn: 14 }, up: { dur: 13, burn: 20 }, desc: v => `범위 내 아군이 ${v.dur}초간 때리면 3초 화상 (초당 ${v.burn})` },
  daedong: { name: '대동굿', kind: 'support', axis: 'gut', cost: 2, target: false, rare: 1, v: { dur: 15, gain: 1 }, up: { dur: 20, gain: 1.5 }, desc: v => `${v.dur}초간 요괴 무리를 물리칠 때마다 사기 +${v.gain} 더` },
  uibyeong: { name: '의병 봉기', kind: 'tactic', axis: 'militia', cost: 2, r: 50, target: true, rare: 0, v: { n: 8, life: 20 }, up: { n: 10, life: 26 }, desc: v => `의병 ${v.n}명이 일어나 ${v.life}초간 싸운다 (환도 무사보다 약하다)` },
  gyeokmun: { name: '격문', kind: 'support', axis: 'militia', cost: 3, target: false, rare: 1, v: { n: 1 }, up: { n: 2 }, desc: v => `이번 싸움에서 전멸한 부대 패 ${v.n}장이 손으로 돌아온다` },
  // ── 영웅 전용 ──
  strike: { name: '언월 강타', kind: 'hero', hero: 'commander', cost: 3, r: 85, target: true, v: { dmg: 330, stun: 2 }, up: { dmg: 440, stun: 2.5 }, desc: v => `장군이 뛰어들어 범위 피해 ${v.dmg}, 기절 ${v.stun}초` },
  order: { name: '호령', kind: 'hero', hero: 'commander', cost: 1, target: false, v: { dur: 9 }, up: { dur: 13 }, desc: v => `장군 주변 아군 ${v.dur}초간 공격 속도 +30%, 피해 +20%` },
  sanctuary: { name: '법력 결계', kind: 'hero', hero: 'bishop', cost: 3, r: 140, target: true, v: { barrier: 200 }, up: { barrier: 290 }, desc: v => `범위 내 아군 보호막 ${v.barrier}, 체력 15% 회복` },
  sutra: { name: '독경', kind: 'hero', hero: 'bishop', cost: 2, target: false, v: { regen: 4, dur: 6 }, up: { regen: 6, dur: 7 }, desc: v => `전군 해로운 효과 제거, ${v.dur}초간 초당 체력 ${v.regen}% 회복` },
  meteor: { name: '불벼락', kind: 'hero', hero: 'archmage', cost: 4, r: 95, target: true, v: { dmg: 500 }, up: { dmg: 660 }, desc: v => `1.1초 뒤 범위 피해 ${v.dmg}, 화상` },
  flash: { name: '일섬', kind: 'hero', hero: 'blade', cost: 2, r: 46, target: true, v: { dmg: 230, mark: 25 }, up: { dmg: 310, mark: 35 }, desc: v => `돌진하며 베어 피해 ${v.dmg}, 5초간 받는 피해 +${v.mark}%` },
  veil: { name: '안개 걸음', kind: 'hero', hero: 'blade', cost: 1, target: false, v: { dur: 4 }, up: { dur: 6 }, desc: v => `검객이 ${v.dur}초간 모든 공격을 흘리고 공격 속도 +30%` },
  mark: { name: '표적', kind: 'hero', hero: 'hunter', cost: 1, r: 100, target: true, v: { amt: 30, dur: 10 }, up: { amt: 45, dur: 12 }, desc: v => `범위 내 적이 ${v.dur}초간 받는 피해 +${v.amt}%` },
  snare: { name: '올가미', kind: 'hero', hero: 'hunter', cost: 2, r: 85, target: true, v: { dmg: 130, root: 3.5 }, up: { dmg: 190, root: 5 }, desc: v => `범위 내 적에게 피해 ${v.dmg}, ${v.root}초간 발 묶기` },
  pangut: { name: '판굿', kind: 'hero', hero: 'sangsoe', cost: 2, target: false, v: { free: 1 }, up: { free: 2 }, desc: v => `손패를 모두 새로 뽑고, 다음 패 ${v.free}장은 공짜` },
  deong: { name: '덩더쿵', kind: 'hero', hero: 'sangsoe', cost: 3, target: false, v: { stun: 2, dur: 7 }, up: { stun: 2.8, dur: 9 }, desc: v => `모든 적 ${v.stun}초 기절(두목은 감속), 전군 ${v.dur}초간 공격 속도 +30%` },
  bulwark: { name: '버티기', kind: 'hero', hero: 'chief', cost: 2, target: false, v: { guard: 75, dur: 8 }, up: { guard: 88, dur: 10 }, desc: v => `두령이 ${v.dur}초간 받는 피해 -${v.guard}%, 주변 적을 끌어모은다` },
  raid: { name: '산채 패거리', kind: 'hero', hero: 'chief', cost: 3, r: 46, target: true, v: { n: 5, life: 18 }, up: { n: 6, life: 22 }, desc: v => `철퇴 장사 ${v.n}명이 ${v.life}초간 달려와 참전` },
  blink: { name: '축지법', kind: 'hero', hero: 'archmage', cost: 1, r: 92, target: true, v: { heal: 18 }, up: { heal: 30 }, desc: v => `범위 내 아군을 뒤로 순간이동, 체력 ${v.heal}% 회복` },
  // ── 부정 ──
  doubt: { name: '잡념', kind: 'curse', cost: 1, target: false, v: {}, up: {}, desc: () => '쓸모없는 패. 사기 1로 버릴 수 있다' },
};
// ── 병력 패·영웅 패: 내면 그 자리에 부대가 선다. 부대가 전멸하면 그 싸움이 끝난 뒤에야 돌아온다 ──
// 병력 패의 낙관: 병종의 갈래를 그린 그림 기호 (render/symbols.js) — 칼·방패·창·활·연꽃(치유)·말·불(도술)·화포·발자국(영물)
const UNIT_SYM = { sword: 'sword', shield: 'shield', spear: 'spear', xbow: 'bow', priest: 'support', knight: 'horse', wizard: 'flame', berserk: 'sword', cannon: 'cannon', magpie: 'bond', sapsal: 'bond', haetae: 'bond', samjoko: 'bond', tiger: 'bond' };
for (const t of PLAYER_TYPES) CARDS['u_' + t] = { name: UNITS[t].name, sym: UNIT_SYM[t] || 'sword', kind: 'unit', unit: t, cost: UNITS[t].cost, rare: UNITS[t].cost > 2 ? 1 : 0, target: true, r: 46, v: {}, up: {}, desc: () => UNITS[t].desc };
for (const h of HEROES) CARDS['h_' + h] = { name: UNITS[h].name, kind: 'lead', unit: h, cost: 4, target: true, r: 46, v: {}, up: {}, desc: () => UNITS[h].desc };
Object.assign(CARDS, AXIS_CARDS);   // 빌드 축의 패 (data/cards_axis.js)
for (const k of Object.keys(CARDS)) CARDS[k].id = k;
// sym = 패 그림 귀퉁이에 찍는 낙관의 그림 기호 (render/symbols.js): 화살·연꽃·두루마리·투구·소용돌이. 병력 패는 병종마다 따로 가진다(UNIT_SYM)
export const KIND = { unit: { name: '병력', col: '#3f5f8a', sym: 'sword' }, lead: { name: '영웅', col: '#a8322a', sym: 'helm' }, attack: { name: '공격', col: '#b8382a', sym: 'attack' }, support: { name: '지원', col: '#2f6f5c', sym: 'support' }, tactic: { name: '책략', col: '#5a4a8a', sym: 'trick' }, hero: { name: '영웅기', col: '#b8742a', sym: 'helm' }, curse: { name: '부정', col: '#5a5346', sym: 'curse' } };
export const isUnit = c => CARDS[c.id].kind === 'unit' || CARDS[c.id].kind === 'lead';
export const MAX_LV = 14;   // 고개를 넘을 때마다 한 단계씩 단련되므로 열두 고개를 넘는 동안 넉넉해야 한다
export const cardVals = c => Object.assign({}, CARDS[c.id].v, c.up ? CARDS[c.id].up : {});
export const cardCost = c => Math.max(0, CARDS[c.id].cost - (c.up && CARDS[c.id].upCost || 0));
// 승급한 병력 패는 갈래의 이름으로 불린다 (창병 → 낭선수)
export const cardName = c => (c.br && branchOf(c.br) ? branchOf(c.br).name : CARDS[c.id].name) + (isUnit(c) ? ((c.lv || 1) > 1 ? ' ' + c.lv + '단' : '') : c.up ? '+' : '');
export const cardDesc = c => CARDS[c.id].desc(cardVals(c));
// 한 묶음에 든 장수: 흔한 패만 두 장, 나머지는 한 장 (패는 귀하다)
export const packN = id => CARDS[id].hero ? 1 : [2, 1, 1][CARDS[id].rare || 0];
// 시작 덱은 영웅마다 다르다: 이끄는 영웅의 병법(HERO_TRAIT)에 맞춘 병력과 전술 패. 전술 패는 쓰면 사라진다
const START = {
  // 처음엔 영웅과 병력 패 셋, 전술 패 셋쯤: 길에서 패와 병사를 모아 점점 큰 군대를 꾸린다
  commander: { units: ['sword', 'shield', 'xbow'], cards: ['sling', 'rain', 'horn'] },
  blade: { units: ['sword', 'xbow'], cards: ['sling', 'flash', 'heal'] },
  hunter: { units: ['shield', 'xbow', 'xbow'], cards: ['sling', 'mark', 'rain'] },
  bishop: { units: ['sword', 'shield', 'priest'], cards: ['sling', 'heal', 'sanctuary'] },
  archmage: { units: ['shield', 'xbow'], cards: ['sling', 'rain', 'thunder', 'meteor'] },
  sangsoe: { units: ['sword', 'shield', 'xbow'], cards: ['sling', 'horn', 'pangut'] },
  chief: { units: ['sword', 'shield', 'xbow'], cards: ['sling', 'rain', 'raid'] },
};
export function starterDeck(hero) {
  const st = START[hero] || START.commander, ids = ['h_' + hero].concat(st.units.map(u => 'u_' + u), st.cards);
  return ids.map(id => ({ id, up: false, lv: 1 }));
}
