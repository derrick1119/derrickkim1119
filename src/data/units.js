// 유닛 정의. hp/atk 는 레벨 1 기준, as = 공격 간격(초), range 0 = 근접
// 주요 특성 플래그
//  shield   : 정면 화살 피해 -70%, 정면 근접 피해 -25%
//  antiCav  : 돌진형(탈것) 적에게 2배 피해, brace 는 정면 돌격을 받아낸다
//  charge   : 일정 거리 이상 달린 뒤 첫 타격이 강력 + 넉백
//  soft     : 후방 지원 병종 (돌격·침투 병종이 우선 노림)
//  aoe      : 범위 피해 (방패 무시)
import { BOSS_UNITS } from './bosses.js';
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
  // ───── 영물: 원정을 거듭하며 인연을 맺으면 합류한다 (state.js 의 BEASTS) ─────
  magpie: { name: '까치', role: '길조', side: 0, beast: true, cost: 2, n: 6, hp: 30, atk: 8, as: 0.62, range: 0, spd: 150, r: 8, prefer: 'soft', dodge: 0.25, omen: 0.5,
    desc: '반가운 소식을 물어 오는 새', tip: '날쌔게 날아가 후방의 요괴를 쫍니다. 까치가 전장에 있는 동안 요괴 무리를 물리칠 때마다 사기를 0.5 더 얻습니다.' },
  sapsal: { name: '삽살개', role: '벽사', side: 0, beast: true, cost: 2, n: 4, hp: 105, atk: 13, as: 0.8, range: 0, spd: 98, r: 10, bane: 1.6, seal: true,
    desc: '귀신 쫓는 털북숭이 개', tip: '망령과 저승 요괴에게 1.6배 피해. 삽살개가 물어 쓰러뜨린 망령은 되살아나지 못합니다.' },
  haetae: { name: '해태', role: '수호', side: 0, beast: true, cost: 3, n: 2, hp: 330, atk: 20, as: 1.25, range: 0, spd: 60, r: 14, armor: 0.15, fireproof: true, aura: { ward: 0.15, r: 125 },
    desc: '불을 삼키는 신령한 짐승', tip: '화상에 걸리지 않고, 곁에 선 아군이 받는 피해 -15%. 전열 한가운데에 세우세요.' },
  samjoko: { name: '삼족오', role: '원거리', side: 0, beast: true, cost: 3, n: 3, hp: 70, atk: 22, as: 1.55, range: 240, spd: 62, r: 10, proj: 'sunfire', soft: true, burnHit: { t: 3, k: 0.4 }, sun: true,
    desc: '해 속에 사는 세 발 까마귀', tip: '햇불을 쏘아 3초 화상을 입힙니다. 삼족오가 전장에 있는 동안은 밤의 불이익이 사라집니다.' },
  tiger: { name: '호랑이', role: '침투', side: 0, beast: true, cost: 3, n: 2, hp: 280, atk: 30, as: 0.95, range: 0, spd: 130, r: 14, leap: true, backstab: 2.0, pounce: { r: 60, stun: 1.2 }, prefer: 'soft',
    desc: '산을 다스리는 산군', tip: '싸움이 붙으면 요괴 후방으로 뛰어들어 주변을 1.2초 기절시키고 뒤를 뭅니다. 돌팔매·북 도깨비의 천적.' },
  // ───── 영웅 ─────
  commander: { name: '장군', role: '영웅', side: 0, hero: true, cost: 0, n: 1, hp: 920, atk: 30.8, as: 0.847, range: 0, spd: 80, r: 14, aura: { dmg: 0.12, r: 130 },
    desc: '언월도를 든 근접 영웅', tip: '주변 아군 피해 +12%. 기력이 차면 회전 베기 → 호통 → 선봉 돌파를 차례로 씁니다.' },
  bishop: { name: '고승', role: '영웅', side: 0, hero: true, cost: 0, n: 1, hp: 640, atk: 0, heal: 55, healN: 2, as: 1.4, range: 195, spd: 58, r: 13, soft: true, support: true,
    desc: '법력으로 지키는 치유 영웅', tip: '두 명을 동시에 치유. 기력이 차면 자비의 물결 → 금강 결계 → 항마진언을 차례로 씁니다.' },
  archmage: { name: '신선', role: '영웅', side: 0, hero: true, cost: 0, n: 1, hp: 560, atk: 46, as: 2.2, range: 245, spd: 54, r: 13, proj: 'fireball', aoe: 54, soft: true, prefer: 'cluster',
    desc: '구름을 탄 도술 영웅', tip: '강력한 범위 도술. 기력이 차면 연쇄 번개 → 서리 안개 → 삼매진화를 차례로 씁니다.' },
  blade: { name: '검객', role: '영웅', side: 0, hero: true, cost: 0, n: 1, hp: 700, atk: 24, as: 0.52, range: 0, spd: 112, r: 12, prefer: 'soft', dodge: 0.3,
    desc: '쌍검을 든 떠돌이 검객', tip: '빠르게 베며 적 후방을 노리고, 공격 열 중 셋을 흘려 냅니다. 기력이 차면 질풍 베기 → 검무 → 그림자 베기를 차례로 씁니다.' },
  hunter: { name: '명궁', role: '영웅', side: 0, hero: true, cost: 0, n: 1, hp: 600, atk: 66, as: 1.3, range: 300, spd: 60, r: 13, proj: 'bolt', soft: true, pierce: true,
    desc: '범을 잡던 대궁의 명수', tip: '멀리서 쏘는 한 발 한 발이 묵직하고 방패를 꿰뚫습니다. 기력이 차면 관통시 → 연발 → 급소 저격을 차례로 씁니다.' },
  sangsoe: { name: '상쇠', role: '영웅', side: 0, hero: true, cost: 0, n: 1, hp: 860, atk: 26, as: 1.2, range: 200, spd: 62, r: 13, proj: 'note', soft: true, aura: { haste: 0.3, r: 170 },
    desc: '꽹과리로 판을 이끄는 풍물패 상쇠', tip: '주변 아군 공격 속도 +20%. 기력이 차면 자진모리 → 신명(사기 +1) → 휘모리를 차례로 씁니다.' },
  chief: { name: '두령', role: '영웅', side: 0, hero: true, cost: 0, n: 1, hp: 1480, atk: 33, as: 1.1, range: 0, spd: 66, r: 15, armor: 0.2, taunt: 80,
    desc: '쌍도끼를 든 녹림의 두령', tip: '가까운 적이 두령에게 몰리고, 근접 피해를 덜 받습니다. 기력이 차면 땅울림 → 도발 → 메치기를 차례로 씁니다.' },
  // ───── 본진 ─────
  banner: { name: '군기 수레', role: '본진', side: 0, cost: 0, n: 1, hp: 520, atk: 0, as: 9, range: 0, spd: 0, r: 20, structure: true, banner: true,
    desc: '서낭대와 큰북을 실은 수레', tip: '서낭신을 모신 깃대와 북을 실었습니다. 부서지면 깃발 하나를 잃고, 셋을 다 잃으면 신이 떠납니다. 싸움이 끝날 때마다 수리됩니다.' },
  // ───── 패로 불러내는 것 ─────
  stake: { name: '목책', role: '방벽', side: 0, cost: 0, n: 1, hp: 120, atk: 0, as: 9, range: 0, spd: 0, r: 12, structure: true, stake: true,
    desc: '길을 막는다', tip: '요괴의 길을 막는 말뚝.' },
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
    desc: '당산 할배가 불러낸 작은 장승', tip: '당산 할배가 계속 불러냅니다. 본체를 빨리 쓰러뜨리세요.' },
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
  dueok: { name: '두억시니', role: '난폭', side: 1, n: 2, hp: 310, atk: 32, as: 1.7, range: 0, spd: 52, r: 14, large: true, stunHit: { p: 0.3, t: 0.8 },
    desc: '머리를 내리찍는 난폭한 귀신', tip: '맞으면 세 번에 한 번꼴로 기절합니다(영웅은 절반만). 창병과 화력을 모아 오래 맞서지 말고 빨리 쓰러뜨리세요.' },
  yagwang: { name: '야광귀', role: '도둑', side: 1, n: 4, hp: 58, atk: 7, as: 1.0, range: 0, spd: 116, r: 9, prefer: 'soft', steal: 0.1,
    desc: '신발을 훔쳐 가는 밤 귀신', tip: '때릴 때마다 사기를 0.1씩 훔쳐 갑니다. 오래 두면 사기가 바닥나니 후방에 [대기] 부대를 두어 빨리 잡으세요.' },
  bulga: { name: '불가사리', role: '거대', side: 1, n: 1, hp: 470, atk: 26, as: 1.5, range: 0, spd: 46, r: 16, large: true, iron: { cut: 0.6, fire: 1.6 },
    desc: '쇠를 먹고 자라는 짐승', tip: '칼과 화살은 열에 여섯만 통합니다. 불과 도술(도사·화살비·벼락·삼족오의 화상)에는 크게 다칩니다.' },
  jangsan: { name: '장산범', role: '홀림', side: 1, n: 1, hp: 260, atk: 26, as: 1.0, range: 0, spd: 104, r: 13, taunt: 150, dodge: 0.2, prefer: 'soft',
    desc: '사람 목소리를 흉내 내는 흰 범', tip: '목소리로 홀려 주변 아군이 저만 쫓게 만들고, 공격 다섯 중 하나를 흘립니다. 범위 공격으로 잡거나 [대기]로 진형을 지키세요.' },
  geuseun: { name: '그슨대', role: '거대', side: 1, n: 1, hp: 430, atk: 22, as: 1.4, range: 0, spd: 46, r: 15, large: true, grow: { every: 4, atk: 0.14, hp: 0.07, max: 8 },
    desc: '올려다볼수록 커지는 그림자', tip: '살려 둘수록 점점 커지고 세집니다. 보이는 대로 화력을 모아 먼저 쓰러뜨리세요.' },
  // ───── 보스 ─────
  warchief: { name: '푸른 김서방', role: '보스', side: 1, boss: true, n: 1, hp: 1900, atk: 44, as: 1.6, range: 0, reach: 14, spd: 52, r: 26, large: true, splash: 46, abil: ['slam', 'warcry'],
    desc: '터를 잃고 쫓겨 온 도깨비 두목', tip: '영웅을 붙잡고 씨름을 겁니다 — 그동안 김서방을 몰아쳐 왼다리를 걸면 넘어집니다(못 걸면 메다꽂힙니다). 붉은 원은 피하세요. 체력이 절반이 되면 무리 전체가 광분합니다.' },
  elder: { name: '당산 할배', role: '보스', side: 1, boss: true, n: 1, hp: 2300, atk: 48, as: 2.0, range: 0, reach: 18, spd: 30, r: 30, large: true, splash: 44, abil: ['roots', 'saplings'],
    desc: '베어진 숲의 그루터기에서 깨어난 신령', tip: '뿌리 감옥(초록 원)을 피하세요. 아기 장승은 오래 두면 다 자라 장승이 됩니다 — 불려 나오는 대로 먼저 치우세요.' },
  skelking: { name: '어둑시니', role: '보스', side: 1, boss: true, n: 1, hp: 2800, atk: 44, as: 1.7, range: 0, reach: 18, spd: 50, r: 26, large: true, splash: 40, abil: ['brand', 'summon'],
    desc: '올려다볼수록 커지는 어둠', tip: '어둠 속에서는 점점 커집니다 — 횃불 패·삼족오·불로 줄이세요. 어둠의 낙인(보라 원)을 피하고, 후방에 불려 나오는 망령에 대비해 예비대를 남겨두세요.' },
};
// 고개마다의 두목과 소품 (data/bosses.js)
Object.assign(UNITS, BOSS_UNITS);
for (const k of Object.keys(UNITS)) UNITS[k].id = k;

// ───── 영웅의 고유기: 기력이 찰 때마다 차례로 자동 발동한다 ─────
export const HERO_SKILLS = {
  commander: [{ id: 'whirl', name: '회전 베기', desc: '주변의 적을 크게 베어 밀쳐 낸다' }, { id: 'roar', name: '호통', desc: '주변 적은 약해지고 아군은 피해 +20%' }, { id: 'leap', name: '선봉 돌파', desc: '적이 가장 몰린 곳으로 뛰어들어 내려친다' }],
  bishop: [{ id: 'wave', name: '자비의 물결', desc: '주변 아군의 체력을 크게 회복' }, { id: 'ward', name: '금강 결계', desc: '주변 아군에게 보호막' }, { id: 'smite', name: '항마진언', desc: '적 무리에 빛을 내리쳐 기절 — 망령에게 1.5배' }],
  archmage: [{ id: 'chain', name: '연쇄 번개', desc: '적 다섯을 잇달아 꿰는 번개' }, { id: 'frost', name: '서리 안개', desc: '적 무리를 느리게 하는 안개' }, { id: 'fire', name: '삼매진화', desc: '적이 가장 몰린 곳에 큰 불덩이' }],
  blade: [{ id: 'dash', name: '질풍 베기', desc: '적 무리를 꿰뚫고 지나가며 벤다' }, { id: 'flurry', name: '검무', desc: '주변의 적을 여섯 번 벤다' }, { id: 'shadow', name: '그림자 베기', desc: '적 후방의 뒤로 나타나 크게 베고 기절' }],
  hunter: [{ id: 'pierce', name: '관통시', desc: '한 줄로 선 적을 모두 꿰뚫는 화살' }, { id: 'burst', name: '연발', desc: '가까운 적 여섯에게 잇달아 쏜다' }, { id: 'snipe', name: '급소 저격', desc: '가장 큰 적에게 큰 피해와 기절' }],
  sangsoe: [{ id: 'jajin', name: '자진모리', desc: '주변 아군 공격 속도 +30%' }, { id: 'sinmyeong', name: '신명', desc: '사기 +1.5, 주변 아군 회복' }, { id: 'hwimori', name: '휘모리', desc: '주변 적의 넋을 빼 기절시킨다' }],
  chief: [{ id: 'quake', name: '땅울림', desc: '땅을 내리쳐 주변 적에게 피해와 감속' }, { id: 'provoke', name: '도발', desc: '적을 끌어모으고 받는 피해 -50%' }, { id: 'throw', name: '메치기', desc: '눈앞의 적을 집어 던져 기절' }],
};
// 이끄는 영웅의 병법: 패를 얻고 쓰는 방식이 영웅마다 다르다 (원정을 시작한 영웅의 것만 적용된다)
export const HERO_TRAIT = {
  commander: { name: '군세', desc: '부대 한도 +1. 전멸한 부대를 싸움마다 한 번은 바로 다시 세울 수 있다.', play: '많은 병력으로 밀어붙인다' },
  blade: { name: '단기필마', desc: '부대 한도 -1. 대신 영웅의 공격력·체력 +40%. 검객이 요괴 무리를 직접 끝낼 때마다 영웅기 패 한 장을 되찾는다 (싸움마다 3장까지).', play: '영웅 혼자 베고 다니며 패를 번다' },
  hunter: { name: '사냥꾼의 눈', desc: '요괴 무리 셋을 물리칠 때마다 패를 노획한다 (다른 영웅은 다섯마다).', play: '전장에서 패를 가장 빨리 줍는다' },
  bishop: { name: '공양', desc: '싸움마다 지원 패 석 장까지는 써도 사라지지 않고 다음 싸움에 돌아온다.', play: '지원 패를 되풀이해 쓰며 버틴다' },
  archmage: { name: '도술', desc: '전술 패 위력 +30%·사기 1 덜 냄(최소 1), 주머니 +3. 싸움이 시작될 때마다 공격 패 한 장을 빚는다. 대신 부대 한도 -1.', play: '적은 병력, 강한 패' },
  sangsoe: { name: '신명', desc: '손에 빈 자리가 있으면 언제든 사기 2로 아무 전술 패나 강화판(+)으로 한 장 얻어 값 없이 낸다 (다른 영웅은 패가 다 떨어졌을 때만 돌팔매).', play: '사기를 패로 바꿔 쓴다' },
  chief: { name: '약탈', desc: '요괴 무리를 물리칠 때마다 엽전 +6. 장터의 전술 패가 반값.', play: '엽전으로 패를 사 모은다' },
};
// 영웅의 낙관: 저마다 손에 든 것을 그린 그림 기호 (render/symbols.js) — 언월도·쌍검·활·염주·깃털 부채·꽹과리·쌍도끼
export const HERO_SEAL = { commander: 'glaive', blade: 'twin', hunter: 'bow', bishop: 'beads', archmage: 'fan', sangsoe: 'gong', chief: 'axes' };
// 영웅마다 두르는 빛깔 (고유기 이름·이펙트)
export const HERO_COL = { commander: '#c8402f', bishop: '#b8862a', archmage: '#2f4d7e', blade: '#5a4a8a', hunter: '#8a5a2c', sangsoe: '#2f6f5c', chief: '#8a2a26' };
// 영웅 둘이 함께 전장에 있으면 합동기 기력이 따로 찬다. 합동기는 두 영웅이 저마다 한 몫씩 보탠다
export const COMBO_PART = {
  commander: { word: '돌격', desc: '전군 속도·피해 +25%' }, bishop: { word: '금강', desc: '전군 보호막과 회복' }, archmage: { word: '뇌격', desc: '적 여섯에게 벼락과 기절' },
  blade: { word: '일섬', desc: '가장 센 적 셋을 벤다' }, hunter: { word: '화망', desc: '모든 적에게 화살비와 감속' }, sangsoe: { word: '신명', desc: '사기 +2, 전군 회복' }, chief: { word: '철벽', desc: '전군 받는 피해 -35%' },
};
const COMBO_NAME = { 'bishop+commander': '금강 돌격', 'archmage+commander': '뇌격진', 'archmage+bishop': '연화 폭풍', 'blade+commander': '선봉 일섬', 'chief+commander': '철벽 돌격', 'hunter+sangsoe': '신명 화망', 'blade+hunter': '일섬 화망' };
export const COMBOS = {};
// ───── 진법: 전장에 선 부대 구성에 따라 켜진다 ─────
const INF = ['sword', 'shield', 'spear', 'berserk'], RNG = ['xbow', 'wizard', 'cannon'];
export const BEAST_TYPES = ['magpie', 'sapsal', 'haetae', 'samjoko', 'tiger'];
export const SYN_CLASS = t => INF.includes(t) ? 'inf' : RNG.includes(t) ? 'rng' : t === 'knight' ? 'cav' : t === 'priest' || t === 'bishop' ? 'heal' : BEAST_TYPES.includes(t) ? 'beast' : '';
export const SYNERGIES = [
  { id: 'phalanx', name: '방진', need: '보병 3', desc: '보병이 받는 피해 -15%', n: c => [c.inf, 3] },
  { id: 'volley', name: '일제 사격', need: '원거리 2', desc: '원거리 공격 속도 +15%', n: c => [c.rng, 2] },
  { id: 'cav', name: '기동대', need: '기마 2', desc: '돌격 피해 +25%', n: c => [c.cav, 2] },
  { id: 'rite', name: '굿판', need: '치유 2', desc: '치유량 +25%', n: c => [c.heal, 2] },
  { id: 'three', name: '삼군', need: '보병·원거리·기마', desc: '모든 아군 피해 +8%', n: c => [(c.inf ? 1 : 0) + (c.rng ? 1 : 0) + (c.cav ? 1 : 0), 3] },
  { id: 'spirit', name: '서낭의 가호', need: '영물 2', desc: '영물이 주는 피해 +15%', n: c => [c.beast, 2] },
];

export const PLAYER_TYPES = ['sword', 'shield', 'spear', 'xbow', 'priest', 'knight', 'wizard', 'berserk', 'cannon'].concat(BEAST_TYPES);
export const HEROES = ['commander', 'blade', 'hunter', 'bishop', 'archmage', 'sangsoe', 'chief'];
for (let i = 0; i < HEROES.length; i++) for (let j = i + 1; j < HEROES.length; j++) {
  const pr = [HEROES[i], HEROES[j]].sort(), key = pr.join('+');
  COMBOS[key] = { id: key, parts: pr, name: COMBO_NAME[key] || `${COMBO_PART[HEROES[j]].word} ${COMBO_PART[HEROES[i]].word}`, desc: `${COMBO_PART[pr[0]].desc} · ${COMBO_PART[pr[1]].desc}` };
}
export const LVL_GROWTH = 0.2;
export function lvlMult(lvl) { return 1 + LVL_GROWTH * (lvl - 1); }
