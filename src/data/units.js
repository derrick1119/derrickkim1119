// 유닛 정의. hp/atk 는 레벨 1 기준, as = 공격 간격(초), range 0 = 근접
// 주요 특성 플래그
//  shield   : 정면 화살 피해 -70%, 정면 근접 피해 -25%
//  antiCav  : 돌진형(탈것) 적에게 2배 피해, brace 는 정면 돌격을 받아낸다
//  charge   : 일정 거리 이상 달린 뒤 첫 타격이 강력 + 넉백
//  soft     : 후방 지원 병종 (돌격·침투 병종이 우선 노림)
//  aoe      : 범위 피해 (방패 무시)
export const UNITS = {
  // ───── 아군 ─────
  sword: { name: '환도 무사', role: '보병', side: 0, cost: 2, n: 6, hp: 112, atk: 14, as: 0.95, range: 0, spd: 64, r: 11,
    desc: '균형 잡힌 근접 보병', tip: '어디에나 쓰기 좋은 주력 보병. 적의 배후를 잡으면 피해가 크게 늘어납니다.' },
  shield: { name: '등패수', role: '방어', side: 0, cost: 2, n: 4, hp: 240, atk: 9, as: 1.1, range: 0, spd: 52, r: 12, shield: true,
    desc: '등패로 화살을 막는 전열', tip: '정면에서 오는 화살·돌 피해 -70%, 근접 피해 -25%. 뒤를 잡히거나 범위 공격에는 약합니다.' },
  spear: { name: '창병', role: '대돌격', side: 0, cost: 2, n: 5, hp: 105, atk: 14, as: 1.05, range: 0, spd: 60, r: 11,
    desc: '멧돼지와 거대 요괴의 천적', tip: '돌진형 적에게 2배, 거대 적에게 1.5배 피해. 정면으로 들어오는 돌격을 받아칩니다.' },
  knight: { name: '기마 무사', role: '돌격', side: 0, cost: 3, n: 3, hp: 250, atk: 22, as: 1.1, range: 0, spd: 128, r: 15, mounted: true, charge: { mult: 3.6, dist: 110, kb: 34 }, prefer: 'soft',
    desc: '달려가 부딪히는 기병', tip: '충분히 달린 뒤의 첫 타격은 3.6배 + 넉백. 전열을 우회시켜 적 후방을 덮치세요.' },
  xbow: { name: '궁수', role: '원거리', side: 0, cost: 2, n: 5, hp: 62, atk: 17, as: 1.5, range: 235, spd: 56, r: 11, proj: 'bolt', soft: true,
    desc: '각궁으로 멀리서 쏜다', tip: '사거리가 긴 주력 화력. 근접전에 약하니 전열 뒤에 [대기]로 세워두세요.' },
  wizard: { name: '도사', role: '광역', side: 0, cost: 3, n: 3, hp: 58, atk: 25, as: 2.5, range: 215, spd: 50, r: 11, proj: 'fireball', aoe: 46, soft: true, prefer: 'cluster',
    desc: '불 부적을 던지는 도사', tip: '부적이 터지는 범위 피해는 방패를 무시합니다. 뭉친 적에게 특히 강합니다.' },
  priest: { name: '무녀', role: '치유', side: 0, cost: 2, n: 3, hp: 62, atk: 0, heal: 30, as: 1.6, range: 175, spd: 54, r: 11, soft: true, support: true,
    desc: '부채춤으로 아군을 돌본다', tip: '가장 다친 아군을 치유합니다. 불여우와 멧돼지가 가장 먼저 노리니 지켜주세요.' },
  cannon: { name: '화차', role: '공성', side: 0, cost: 3, n: 2, hp: 105, atk: 55, as: 4.4, range: 440, minRange: 100, spd: 34, r: 12, proj: 'shell', aoe: 56, soft: true, prefer: 'cluster',
    desc: '신기전을 쏟아붓는 수레', tip: '전장 대부분이 사거리인 범위 포격. 장전이 느리고 가까운 적은 쏘지 못합니다.' },
  berserk: { name: '철퇴 장사', role: '난전', side: 0, cost: 3, n: 4, hp: 155, atk: 20, as: 1.2, range: 0, spd: 70, r: 12, frenzy: true,
    desc: '여럿을 후려치는 철퇴', tip: '한 번에 최대 3명을 타격. 체력이 절반 아래면 공격 속도 +50%.' },
  // ───── 영웅 ─────
  commander: { name: '장군', role: '영웅', side: 0, hero: true, cost: 0, n: 1, hp: 920, atk: 30.8, as: 0.847, range: 0, spd: 80, r: 14, aura: { dmg: 0.12, r: 130 },
    desc: '언월도를 든 근접 영웅', tip: '주변 아군 피해 +12%. 전용 패 [언월 강타]·[호령]을 들고 시작합니다.' },
  bishop: { name: '고승', role: '영웅', side: 0, hero: true, cost: 0, n: 1, hp: 640, atk: 0, heal: 55, healN: 2, as: 1.4, range: 195, spd: 58, r: 13, soft: true, support: true,
    desc: '법력으로 지키는 치유 영웅', tip: '두 명을 동시에 치유. 전용 패 [법력 결계]·[독경]을 들고 시작합니다.' },
  archmage: { name: '신선', role: '영웅', side: 0, hero: true, cost: 0, n: 1, hp: 560, atk: 46, as: 2.2, range: 245, spd: 54, r: 13, proj: 'fireball', aoe: 54, soft: true, prefer: 'cluster',
    desc: '구름을 탄 도술 영웅', tip: '강력한 범위 도술. 전용 패 [불벼락]·[축지법]을 들고 시작합니다.' },
  // ───── 패로 불러내는 것 ─────
  decoy: { name: '허수아비', role: '미끼', side: 0, cost: 0, n: 1, hp: 190, atk: 0, as: 9, range: 0, spd: 0, r: 13, structure: true, decoy: true,
    desc: '적의 눈길을 끈다', tip: '주변 적이 허수아비를 먼저 공격합니다.' },
  // ───── 적군 ─────
  goblin: { name: '졸개 도깨비', role: '무리', side: 1, n: 7, hp: 50, atk: 8, as: 0.8, range: 0, spd: 76, r: 9,
    desc: '약하지만 수가 많다', tip: '하나하나는 약하지만 떼로 몰려옵니다. 범위 공격과 철퇴 장사가 효과적입니다.' },
  orc: { name: '방망이 도깨비', role: '보병', side: 1, n: 4, hp: 150, atk: 18, as: 1.15, range: 0, spd: 60, r: 12,
    desc: '튼튼한 근접 도깨비', tip: '단단하고 아픈 정면 싸움꾼. 등패수로 받아내고 화력을 집중하세요.' },
  garcher: { name: '돌팔매 도깨비', role: '원거리', side: 1, n: 5, hp: 46, atk: 12, as: 1.6, range: 215, spd: 58, r: 9, proj: 'stone', soft: true,
    desc: '뒤에서 돌을 던진다', tip: '등패수를 앞세워 돌을 받아내거나 기마 무사를 우회시켜 덮치세요.' },
  rshield: { name: '솥뚜껑 도깨비', role: '방어', side: 1, n: 4, hp: 235, atk: 10, as: 1.1, range: 0, spd: 50, r: 12, shield: true,
    desc: '솥뚜껑으로 화살을 막는다', tip: '정면 화살이 거의 통하지 않습니다. 배후를 치거나 도사·화차·화살비를 쓰세요.' },
  rassassin: { name: '불여우', role: '침투', side: 1, n: 3, hp: 78, atk: 19, as: 0.75, range: 0, spd: 104, r: 11, leap: true, backstab: 2.2,
    desc: '후방으로 도약해 기습', tip: '전투 직후 후방 병종에게 순식간에 나타납니다. 궁수 곁에 [대기] 부대를 두어 막으세요.' },
  treant: { name: '장승', role: '거대', side: 1, n: 2, hp: 430, atk: 22, as: 1.8, range: 0, spd: 36, r: 15, large: true, splash: 34,
    desc: '느리지만 매우 단단하다', tip: '느리고 단단한 거대 요괴. 창병(1.5배)과 원거리 화력으로 다가오기 전에 깎으세요.' },
  sapling: { name: '아기 장승', role: '소환', side: 1, n: 3, hp: 90, atk: 10, as: 1.2, range: 0, spd: 58, r: 10,
    desc: '목신이 불러낸 작은 장승', tip: '목신이 계속 불러냅니다. 본체를 빨리 쓰러뜨리세요.' },
  bomber: { name: '도깨비불', role: '자폭', side: 1, n: 4, hp: 44, atk: 0, as: 1, range: 0, spd: 96, r: 9, bomber: { dmg: 125, r: 58 },
    desc: '다가와서 터진다', tip: '뭉친 부대에 다가와 터집니다. 닿기 전에 잡으면 그 자리에서 터져 적도 휘말립니다!' },
  wolf: { name: '멧돼지', role: '돌격', side: 1, n: 3, hp: 205, atk: 19, as: 1.1, range: 0, spd: 124, r: 14, mounted: true, charge: { mult: 3.2, dist: 110, kb: 30 }, prefer: 'soft',
    desc: '측면으로 우회해 들이받는다', tip: '측면을 돌아 후방을 노립니다. 창병을 [대기]시켜 궁수를 지키세요.' },
  shaman: { name: '북 도깨비', role: '지원', side: 1, n: 2, hp: 95, atk: 0, heal: 36, as: 1.7, range: 180, spd: 52, r: 11, soft: true, support: true, aura: { haste: 0.25, r: 115 },
    desc: '북소리로 치유하고 광분시킨다', tip: '주변 적의 공격 속도를 올리고 치유합니다. 기마 무사나 집중 공격으로 먼저 잡으세요.' },
  skel: { name: '망령 병사', role: '망령', side: 1, n: 5, hp: 78, atk: 13, as: 1.0, range: 0, spd: 58, r: 11, revive: 0.55,
    desc: '한 번 되살아난다', tip: '쓰러져도 3초 뒤 한 번 되살아납니다. 정화 굿 범위 안에서는 되살아나지 못합니다.' },
  skelarcher: { name: '망령 궁수', role: '망령', side: 1, n: 4, hp: 50, atk: 13, as: 1.6, range: 225, spd: 54, r: 11, proj: 'arrow', soft: true, revive: 0.55,
    desc: '되살아나는 궁수', tip: '원거리 망령. 한 번 되살아나므로 끝까지 마무리하세요.' },
  catapult: { name: '투석기', role: '공성', side: 1, n: 1, hp: 300, atk: 140, as: 6.5, range: 900, spd: 0, r: 20, structure: true, soft: true, lob: { r: 62, delay: 2.2 },
    desc: '붉은 원에 바위가 떨어진다', tip: '붉은 원이 보이면 부대를 끌어 피하세요! 기마 무사를 보내 부수는 것이 가장 확실합니다.' },
  necro: { name: '저승사자', role: '소환', side: 1, n: 1, hp: 190, atk: 16, as: 1.8, range: 215, spd: 46, r: 12, proj: 'dark', soft: true, raise: { cd: 5, max: 7 },
    desc: '쓰러진 자를 망령으로 일으킨다', tip: '쓰러진 자리에서 망령 병사를 일으킵니다. 살려두면 끝이 없으니 최우선으로 잡으세요.' },
  // ───── 보스 ─────
  warchief: { name: '두억시니', role: '보스', side: 1, boss: true, n: 1, hp: 1900, atk: 44, as: 1.6, range: 0, reach: 14, spd: 52, r: 26, large: true, splash: 46, abil: ['slam', 'warcry'],
    desc: '땅을 내려찍는 도깨비 두목', tip: '붉은 원이 보이면 부대를 빼세요. 체력이 절반이 되면 무리 전체가 광분합니다.' },
  elder: { name: '당산 목신', role: '보스', side: 1, boss: true, n: 1, hp: 2600, atk: 48, as: 2.0, range: 0, reach: 18, spd: 30, r: 30, large: true, splash: 44, abil: ['roots', 'saplings'],
    desc: '숲을 깨우는 천년 고목', tip: '뿌리 감옥(초록 원)을 피하고, 아기 장승이 쌓이기 전에 본체에 화력을 집중하세요.' },
  skelking: { name: '어둑시니', role: '보스', side: 1, boss: true, n: 1, hp: 2800, atk: 44, as: 1.7, range: 0, reach: 18, spd: 50, r: 26, large: true, splash: 40, abil: ['brand', 'summon'],
    desc: '볼수록 커지는 어둠', tip: '어둠의 낙인(보라 원)을 피하고, 후방에 불려 나오는 망령에 대비해 예비대를 남겨두세요.' },
};
for (const k of Object.keys(UNITS)) UNITS[k].id = k;

export const PLAYER_TYPES = ['sword', 'shield', 'spear', 'xbow', 'priest', 'knight', 'wizard', 'berserk', 'cannon'];
export const HEROES = ['commander', 'bishop', 'archmage'];
export const LVL_GROWTH = 0.2;
export function lvlMult(lvl) { return 1 + LVL_GROWTH * (lvl - 1); }
