// 전술 패: 전투 중 손패에서 사기를 내고 쓰는 카드
// kind: attack(공격) / support(지원) / tactic(책략) / hero(영웅 전용) / curse(부정)
// v = 기본 수치, up = 강화했을 때 덮어쓰는 수치 (upCost = 강화 시 줄어드는 비용)
export const CARDS = {
  sling: { name: '돌팔매', ch: '돌', kind: 'attack', cost: 1, r: 62, target: true, rare: 0, v: { dmg: 70 }, up: { dmg: 110 }, desc: v => `좁은 범위에 피해 ${v.dmg}` },
  rain: { name: '화살비', ch: '화', kind: 'attack', cost: 3, r: 88, target: true, rare: 0, v: { tick: 26 }, up: { tick: 36 }, desc: v => `범위에 화살 다섯 번 (한 번에 ${v.tick}). 방패 무시` },
  firerain: { name: '불화살 세례', ch: '불', kind: 'attack', cost: 4, r: 94, target: true, rare: 1, v: { tick: 26, burn: 12 }, up: { tick: 32, burn: 20 }, desc: v => `화살 다섯 번 (한 번에 ${v.tick}) + 3초 화상 (초당 ${v.burn})` },
  thunder: { name: '벼락', ch: '뢰', kind: 'attack', cost: 2, r: 84, target: true, rare: 1, v: { dmg: 230, stun: 1.5 }, up: { dmg: 330, stun: 2 }, desc: v => `범위에서 가장 튼튼한 적 하나에게 피해 ${v.dmg}, 기절 ${v.stun}초` },
  volley: { name: '총통 일제사격', ch: '포', kind: 'attack', cost: 5, r: 114, target: true, rare: 2, v: { dmg: 270, stun: 0.6 }, up: { dmg: 360, stun: 1 }, desc: v => `1.4초 뒤 넓은 범위에 피해 ${v.dmg}, 기절 ${v.stun}초` },
  caltrop: { name: '마름쇠', ch: '쇠', kind: 'tactic', cost: 2, r: 96, target: true, rare: 1, v: { dur: 10, slow: 45, dps: 12 }, up: { dur: 14, slow: 60, dps: 16 }, desc: v => `${v.dur}초 동안 범위 안 적의 속도 -${v.slow}%, 초당 피해 ${v.dps}` },
  heal: { name: '약손', ch: '약', kind: 'support', cost: 1, r: 84, target: true, rare: 0, v: { heal: 20 }, up: { heal: 32 }, desc: v => `범위 내 아군 체력 ${v.heal}% 즉시 회복` },
  grail: { name: '정화 굿', ch: '굿', kind: 'support', cost: 3, r: 105, target: true, rare: 0, v: { heal: 36 }, up: { heal: 50 }, desc: v => `3초에 걸쳐 체력 ${v.heal}% 회복, 해로운 효과 제거. 망령의 부활을 막는다` },
  wall: { name: '방패 진', ch: '진', kind: 'support', cost: 2, r: 112, target: true, rare: 1, v: { guard: 40, dur: 6 }, up: { guard: 55, dur: 8 }, desc: v => `범위 내 아군이 ${v.dur}초간 받는 피해 -${v.guard}%` },
  horn: { name: '진군의 북', ch: '북', kind: 'support', cost: 2, target: false, rare: 0, v: { dur: 6 }, up: { dur: 10 }, desc: v => `${v.dur}초간 전군 이동·공격 속도 증가. 기마 무사는 즉시 돌격 준비` },
  cry: { name: '함성', ch: '함', kind: 'support', cost: 2, r: 124, target: true, rare: 1, v: { dmg: 30, dur: 7 }, up: { dmg: 45, dur: 9 }, desc: v => `범위 내 아군이 ${v.dur}초간 주는 피해 +${v.dmg}%` },
  ambush: { name: '매복', ch: '복', kind: 'tactic', cost: 3, r: 44, target: true, rare: 1, v: { n: 4, life: 20 }, up: { n: 6, life: 25 }, desc: v => `그 자리에 환도 무사 ${v.n}명이 나타나 ${v.life}초간 싸운다` },
  archers: { name: '원군 궁수', ch: '궁', kind: 'tactic', cost: 3, r: 44, target: true, rare: 1, v: { n: 3, life: 20 }, up: { n: 5, life: 25 }, desc: v => `그 자리에 궁수 ${v.n}명이 나타나 ${v.life}초간 싸운다` },
  decoy: { name: '허수아비', ch: '허', kind: 'tactic', cost: 1, r: 130, target: true, rare: 1, v: { hp: 420, life: 7 }, up: { hp: 800, life: 10 }, desc: v => `${v.life}초 동안 주변 적의 눈길을 끄는 허수아비 (체력 ${v.hp})` },
  // ── 영웅 전용 ──
  strike: { name: '언월 강타', ch: '격', kind: 'hero', hero: 'commander', cost: 3, r: 85, target: true, v: { dmg: 250, stun: 1.5 }, up: { dmg: 340, stun: 2 }, desc: v => `장군이 뛰어들어 범위 피해 ${v.dmg}, 기절 ${v.stun}초` },
  order: { name: '호령', ch: '령', kind: 'hero', hero: 'commander', cost: 1, target: false, v: { dur: 6 }, up: { dur: 10 }, desc: v => `장군 주변 아군이 ${v.dur}초간 공격 속도 +30%, 피해 +20%` },
  sanctuary: { name: '법력 결계', ch: '결', kind: 'hero', hero: 'bishop', cost: 3, r: 140, target: true, v: { barrier: 150 }, up: { barrier: 230 }, desc: v => `범위 내 아군에게 보호막 ${v.barrier}과 체력 15% 회복` },
  sutra: { name: '독경', ch: '경', kind: 'hero', hero: 'bishop', cost: 2, target: false, v: { regen: 3, dur: 5 }, up: { regen: 5, dur: 6 }, desc: v => `전군의 해로운 효과 제거, ${v.dur}초간 초당 체력 ${v.regen}% 회복` },
  meteor: { name: '불벼락', ch: '벼', kind: 'hero', hero: 'archmage', cost: 4, r: 95, target: true, v: { dmg: 380 }, up: { dmg: 520 }, desc: v => `1.1초 뒤 불벼락이 떨어져 피해 ${v.dmg}과 화상` },
  blink: { name: '축지법', ch: '축', kind: 'hero', hero: 'archmage', cost: 1, r: 92, target: true, v: { heal: 12 }, up: { heal: 25 }, desc: v => `범위 내 아군을 뒤쪽으로 순간이동, 체력 ${v.heal}% 회복` },
  // ── 부정 ──
  doubt: { name: '잡념', ch: '념', kind: 'curse', cost: 1, target: false, v: {}, up: {}, desc: () => '쓸모없는 패. 사기 1을 내면 버릴 수 있다' },
};
for (const k of Object.keys(CARDS)) CARDS[k].id = k;
export const KIND = { attack: { name: '공격', col: '#b8382a' }, support: { name: '지원', col: '#2f6f5c' }, tactic: { name: '책략', col: '#2f4d7e' }, hero: { name: '영웅', col: '#b8742a' }, curse: { name: '부정', col: '#5a4a7a' } };
export const cardVals = c => Object.assign({}, CARDS[c.id].v, c.up ? CARDS[c.id].up : {});
export const cardCost = c => Math.max(0, CARDS[c.id].cost - (c.up && CARDS[c.id].upCost || 0));
export const cardName = c => CARDS[c.id].name + (c.up ? '+' : '');
export const cardDesc = c => CARDS[c.id].desc(cardVals(c));
export function starterDeck(hero) {
  const ids = ['sling', 'sling', 'sling', 'rain', 'heal', 'heal', 'horn'].concat(Object.keys(CARDS).filter(k => CARDS[k].hero === hero));
  return ids.map(id => ({ id, up: false }));
}
