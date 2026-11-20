// 무기: 부대에 끼우면 인형이 든 무기와 싸우는 방식이 함께 바뀐다
// cls: short(단병기) / pole(장병기) / blunt(둔기) / bow(활) / talisman(부적) / ritual(무구)
// base 는 병종이 처음부터 가진 기본 무기 (전리품으로 나오지 않는다)
// hold: slash(휘두르기) / thrust(찌르기) / shoot(쏘기) / cast(치켜들기),  hand: R(오른손) / L(왼손) / C(양손·가슴 앞)
export const WEAPONS = {
  // 단병기
  hwando: { name: '환도', cls: 'short', base: true, spr: 'hwando', a: 0.3, mode: 'slash', desc: '기본 칼. 무난하다' },
  twin: { name: '쌍검', cls: 'short', spr: 'twin', a: 0.3, mode: 'slash', hand: 'B', desc: '공격 속도 +35%, 공격력 -15%', mod: d => { d.as /= 1.35; d.atk *= 0.85; } },
  axe: { name: '도끼', cls: 'short', spr: 'axe', a: 0.35, mode: 'slash', desc: '공격력 +15%, 방패의 피해 감소를 무시', mod: d => { d.atk *= 1.15; d.pierce = true; } },
  flail: { name: '편곤', cls: 'short', spr: 'flail', a: 0.35, mode: 'slash', desc: '공격마다 20% 확률로 0.8초 기절', mod: d => { d.stunHit = { p: 0.2, t: 0.8 }; } },
  // 장병기
  spear: { name: '장창', cls: 'pole', base: true, spr: 'spear', a: 0.1, mode: 'thrust', desc: '긴 리치. 돌진형 적에게 2배, 정면 돌격을 받아친다', mod: d => { d.reach = (d.reach || 0) + 14; d.antiCav = true; d.brace = true; } },
  lance: { name: '기창', cls: 'pole', base: true, spr: 'lance', a: 0.42, mode: 'thrust', desc: '말 위에서 쓰는 긴 창' },
  dangpa: { name: '당파', cls: 'pole', spr: 'dangpa', a: 0.1, mode: 'thrust', desc: '세 갈래 창. 리치 +10, 받는 근접 피해 -20%, 돌격을 받아친다', mod: d => { d.reach = (d.reach || 0) + 10; d.brace = true; d.armor = 0.2; } },
  hyeopdo: { name: '협도', cls: 'pole', spr: 'hyeopdo', a: 0.2, mode: 'slash', desc: '리치 +10, 한 번에 2명 타격', mod: d => { d.reach = (d.reach || 0) + 10; d.cleave = Math.max(d.cleave || 0, 2); } },
  woldo: { name: '언월도', cls: 'pole', spr: 'woldo', a: 0.22, mode: 'slash', desc: '공격력 +30%, 2명 타격, 리치 +8, 공격 속도 -18%', mod: d => { d.atk *= 1.3; d.as *= 1.18; d.reach = (d.reach || 0) + 8; d.cleave = Math.max(d.cleave || 0, 2); } },
  // 둔기
  mace: { name: '철퇴', cls: 'blunt', base: true, spr: 'mace', a: 0.4, mode: 'slash', desc: '한 번에 3명 타격', mod: d => { d.cleave = Math.max(d.cleave || 0, 3); } },
  bigaxe: { name: '큰 도끼', cls: 'blunt', spr: 'bigaxe', a: 0.4, mode: 'slash', desc: '공격력 +35%, 2명 타격, 방패 무시', mod: d => { d.atk *= 1.35; d.cleave = Math.max(d.cleave || 0, 2); d.pierce = true; } },
  thresher: { name: '쇠도리깨', cls: 'blunt', spr: 'thresher', a: 0.4, mode: 'slash', desc: '3명 타격, 25% 확률로 0.8초 기절, 공격 속도 -15%', mod: d => { d.cleave = Math.max(d.cleave || 0, 3); d.stunHit = { p: 0.25, t: 0.8 }; d.as *= 1.15; } },
  // 활
  bow: { name: '각궁', cls: 'bow', base: true, spr: 'bow', a: 0, mode: 'shoot', hand: 'L', desc: '기본 활' },
  crossbow: { name: '쇠뇌', cls: 'bow', spr: 'crossbow', a: 1.0, mode: 'shoot', hand: 'C', desc: '피해 +45%, 사거리 +10%, 공격 속도 -30%', mod: d => { d.atk *= 1.45; d.range *= 1.1; d.as *= 1.3; } },
  firebow: { name: '불화살 활', cls: 'bow', spr: 'firebow', a: 0, mode: 'shoot', hand: 'L', desc: '맞은 적에게 3초 화상, 피해 -10%', mod: d => { d.atk *= 0.9; d.burnHit = { t: 3, k: 0.4 }; d.proj = 'firearrow'; } },
  pyeonjeon: { name: '편전', cls: 'bow', spr: 'pyeonjeon', a: 0, mode: 'shoot', hand: 'L', desc: '사거리 +25%, 피해 -10%', mod: d => { d.range *= 1.25; d.atk *= 0.9; } },
  gun: { name: '조총', cls: 'bow', spr: 'gun', a: 1.05, mode: 'shoot', hand: 'C', desc: '피해 +130%, 방패 관통, 공격 속도 -55%', mod: d => { d.atk *= 2.3; d.as *= 1.55; d.pierce = true; d.proj = 'bullet'; } },
  // 부적
  firetal: { name: '불 부적', cls: 'talisman', base: true, spr: 'firetal', a: 0.2, mode: 'cast', desc: '터지며 범위 피해' },
  featherfan: { name: '깃털 부채', cls: 'talisman', base: true, spr: 'featherfan', a: 0.35, mode: 'cast', desc: '신선의 부채. 터지며 범위 피해' },
  icetal: { name: '얼음 부적', cls: 'talisman', spr: 'icetal', a: 0.2, mode: 'cast', desc: '범위 피해 -20%, 맞은 적은 2.5초간 속도 -35%', mod: d => { d.atk *= 0.8; d.slowHit = { amt: 0.35, t: 2.5 }; d.proj = 'iceball'; } },
  bolttal: { name: '벼락 부적', cls: 'talisman', spr: 'bolttal', a: 0.2, mode: 'cast', desc: '범위 대신 한 명에게 피해 +130%, 0.4초 기절', mod: d => { d.atk *= 2.3; d.aoe = 0; d.proj = 'spark'; d.stunHit = { p: 1, t: 0.4 }; d.prefer = null; } },
  // 무구
  fans: { name: '부채', cls: 'ritual', base: true, spr: 'fans', a: 0.5, mode: 'cast', hand: 'B', desc: '가장 다친 아군을 치유' },
  staff: { name: '석장', cls: 'ritual', base: true, spr: 'staff', a: 0, mode: 'cast', cast: 0.22, desc: '고승의 지팡이. 두 명을 치유' },
  bells: { name: '방울', cls: 'ritual', spr: 'bells', a: 0.2, mode: 'cast', cast: 0.7, desc: '한 명을 더 치유, 치유량 -25%', mod: d => { d.healN = (d.healN || 1) + 1; d.heal *= 0.75; } },
  bowl: { name: '정화수', cls: 'ritual', spr: 'bowl', a: 0, mode: 'cast', cast: 0.3, desc: '치유할 때 해로운 효과를 씻고 보호막 25', mod: d => { d.healCleanse = 25; } },
};
for (const k of Object.keys(WEAPONS)) WEAPONS[k].id = k;
// 병종별 쓸 수 있는 무기 종류와 기본 무기
export const ARMS = {
  sword: { cls: ['short'], base: 'hwando' }, shield: { cls: ['short'], base: 'hwando' }, spear: { cls: ['pole'], base: 'spear' }, knight: { cls: ['pole', 'short'], base: 'lance' },
  berserk: { cls: ['blunt', 'short'], base: 'mace' }, xbow: { cls: ['bow'], base: 'bow' }, wizard: { cls: ['talisman'], base: 'firetal' }, priest: { cls: ['ritual'], base: 'fans' },
  commander: { cls: ['pole', 'short'], base: 'woldo' }, bishop: { cls: ['ritual'], base: 'staff' }, archmage: { cls: ['talisman'], base: 'featherfan' },
};
export const CLS_NAME = { short: '단병기', pole: '장병기', blunt: '둔기', bow: '활', talisman: '부적', ritual: '무구' };
export const canEquip = (type, wid) => !!(ARMS[type] && WEAPONS[wid] && ARMS[type].cls.includes(WEAPONS[wid].cls) && (!WEAPONS[wid].base || ARMS[type].base === wid));
export const weaponOf = s => s.wpn || (ARMS[s.type] ? ARMS[s.type].base : null);
export const LOOT_WEAPONS = Object.keys(WEAPONS).filter(k => !WEAPONS[k].base);
