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
    desc: '균형 잡힌 근접 보병', tip: '두루 쓰기 좋은 주력 보병. 배후를 치면 피해가 크게 늘어납니다.' },
  shield: { name: '등패수', role: '방어', side: 0, cost: 2, n: 4, hp: 240, atk: 9, as: 1.1, range: 0, spd: 52, r: 12, shield: true,
    desc: '등패로 화살을 막는 전열', tip: '정면 화살·돌 피해 -70%, 근접 -25%. 배후·범위 공격엔 약합니다.' },
  spear: { name: '창병', role: '대돌격', side: 0, cost: 2, n: 5, hp: 105, atk: 14, as: 1.05, range: 0, spd: 60, r: 11,
    desc: '멧돼지와 거대 요괴의 천적', tip: '돌진형 적 2배, 거대 적 1.5배 피해. 정면 돌격을 받아칩니다.' },
  knight: { name: '기마 무사', role: '돌격', side: 0, cost: 3, n: 3, hp: 250, atk: 22, as: 1.1, range: 0, spd: 128, r: 15, mounted: true, charge: { mult: 3.6, dist: 110, kb: 34 }, prefer: 'soft',
    desc: '달려가 부딪히는 기병', tip: '충분히 달리면 첫 타격 3.6배 + 넉백. 우회해 후방을 덮치세요.' },
  xbow: { name: '궁수', role: '원거리', side: 0, cost: 2, n: 5, hp: 62, atk: 17, as: 1.5, range: 235, spd: 56, r: 11, proj: 'bolt', soft: true,
    desc: '각궁으로 멀리서 쏜다', tip: '사거리가 긴 주력 화력. 근접에 약하니 전열 뒤에 [대기]시키세요.' },
  wizard: { name: '도사', role: '광역', side: 0, cost: 3, n: 3, hp: 58, atk: 25, as: 2.5, range: 215, spd: 50, r: 11, proj: 'fireball', aoe: 46, soft: true, prefer: 'cluster',
    desc: '불 부적을 던지는 도사', tip: '범위 피해라 방패를 무시합니다. 뭉친 적에게 특히 강합니다.' },
  priest: { name: '무녀', role: '치유', side: 0, cost: 2, n: 3, hp: 62, atk: 0, heal: 30, as: 1.6, range: 175, spd: 54, r: 11, soft: true, support: true,
    desc: '부채춤으로 아군을 돌본다', tip: '가장 다친 아군을 치유. 불여우·멧돼지가 먼저 노리니 지켜주세요.' },
  cannon: { name: '화차', role: '공성', side: 0, cost: 3, n: 2, hp: 105, atk: 55, as: 4.4, range: 440, minRange: 100, spd: 34, r: 12, proj: 'shell', aoe: 56, soft: true, prefer: 'cluster',
    desc: '신기전을 쏟아붓는 수레', tip: '전장 대부분에 닿는 범위 포격. 장전이 느리고 가까이는 못 쏩니다.' },
  berserk: { name: '철퇴 장사', role: '난전', side: 0, cost: 3, n: 4, hp: 155, atk: 20, as: 1.2, range: 0, spd: 70, r: 12, frenzy: true,
    desc: '여럿을 후려치는 철퇴', tip: '한 번에 최대 3명 타격. 체력이 절반 아래면 공격 속도 +50%.' },
  // ───── 영물: 원정을 거듭하며 인연을 맺으면 합류한다 (state.js 의 BEASTS) ─────
  magpie: { name: '까치', role: '길조', side: 0, beast: true, cost: 2, n: 6, hp: 30, atk: 8, as: 0.62, range: 0, spd: 150, r: 8, prefer: 'soft', dodge: 0.25, omen: 0.5,
    desc: '반가운 소식을 물어 오는 새', tip: '적 후방을 쫍니다. 전장에 있으면 무리를 물리칠 때마다 사기 +0.5.' },
  sapsal: { name: '삽살개', role: '벽사', side: 0, beast: true, cost: 2, n: 4, hp: 105, atk: 13, as: 0.8, range: 0, spd: 98, r: 10, bane: 1.6, seal: true,
    desc: '귀신 쫓는 털북숭이 개', tip: '망령·저승 요괴에게 1.6배 피해. 쓰러뜨린 망령은 못 일어납니다.' },
  haetae: { name: '해태', role: '수호', side: 0, beast: true, cost: 3, n: 2, hp: 330, atk: 20, as: 1.25, range: 0, spd: 60, r: 14, armor: 0.15, fireproof: true, aura: { ward: 0.15, r: 125 },
    desc: '불을 삼키는 신령한 짐승', tip: '화상 면역. 곁의 아군이 받는 피해 -15%. 전열 가운데에 세우세요.' },
  samjoko: { name: '삼족오', role: '원거리', side: 0, beast: true, cost: 3, n: 3, hp: 70, atk: 22, as: 1.55, range: 240, spd: 62, r: 10, proj: 'sunfire', soft: true, burnHit: { t: 3, k: 0.4 }, sun: true,
    desc: '해 속에 사는 세 발 까마귀', tip: '햇불로 3초 화상을 입힙니다. 전장에 있으면 밤의 불이익이 사라집니다.' },
  tiger: { name: '호랑이', role: '침투', side: 0, beast: true, cost: 3, n: 2, hp: 280, atk: 30, as: 0.95, range: 0, spd: 130, r: 14, leap: true, backstab: 2.0, pounce: { r: 60, stun: 1.2 }, prefer: 'soft',
    desc: '산을 다스리는 산군', tip: '요괴 후방에 뛰어들어 주변을 1.2초 기절시키고 뒤를 뭅니다.' },
  // ───── 영웅 ─────
  commander: { name: '장군', role: '영웅', side: 0, hero: true, cost: 0, n: 1, hp: 920, atk: 30.8, as: 0.847, range: 0, spd: 80, r: 14, aura: { dmg: 0.12, r: 130 },
    desc: '언월도를 든 근접 영웅', tip: '주변 아군 피해 +12%. 고유기: 회전 베기 → 호통 → 선봉 돌파' },
  bishop: { name: '고승', role: '영웅', side: 0, hero: true, cost: 0, n: 1, hp: 640, atk: 0, heal: 55, healN: 2, as: 1.4, range: 195, spd: 58, r: 13, soft: true, support: true,
    desc: '법력으로 지키는 치유 영웅', tip: '두 명씩 치유. 고유기: 자비의 물결 → 금강 결계 → 항마진언' },
  archmage: { name: '신선', role: '영웅', side: 0, hero: true, cost: 0, n: 1, hp: 560, atk: 46, as: 2.2, range: 245, spd: 54, r: 13, proj: 'fireball', aoe: 54, soft: true, prefer: 'cluster',
    desc: '구름을 탄 도술 영웅', tip: '강한 범위 도술. 고유기: 연쇄 번개 → 서리 안개 → 삼매진화' },
  blade: { name: '검객', role: '영웅', side: 0, hero: true, cost: 0, n: 1, hp: 700, atk: 24, as: 0.52, range: 0, spd: 112, r: 12, prefer: 'soft', dodge: 0.3,
    desc: '쌍검을 든 떠돌이 검객', tip: '후방을 노리고 공격 열에 셋을 흘립니다. 고유기: 질풍 베기 → 검무 → 그림자 베기' },
  hunter: { name: '명궁', role: '영웅', side: 0, hero: true, cost: 0, n: 1, hp: 600, atk: 66, as: 1.3, range: 300, spd: 60, r: 13, proj: 'bolt', soft: true, pierce: true,
    desc: '범을 잡던 대궁의 명수', tip: '방패를 꿰뚫는 묵직한 화살. 고유기: 관통시 → 연발 → 급소 저격' },
  sangsoe: { name: '상쇠', role: '영웅', side: 0, hero: true, cost: 0, n: 1, hp: 860, atk: 26, as: 1.2, range: 200, spd: 62, r: 13, proj: 'note', soft: true, aura: { haste: 0.3, r: 170 },
    desc: '꽹과리로 판을 이끄는 풍물패 상쇠', tip: '주변 아군 공격 속도 +30%. 고유기: 자진모리 → 신명(사기 +1.5) → 휘모리' },
  chief: { name: '두령', role: '영웅', side: 0, hero: true, cost: 0, n: 1, hp: 1480, atk: 33, as: 1.1, range: 0, spd: 66, r: 15, armor: 0.2, taunt: 80,
    desc: '쌍도끼를 든 녹림의 두령', tip: '주변 적을 끌어모으고 근접 피해를 덜 받습니다. 고유기: 땅울림 → 도발 → 메치기' },
  // ───── 본진 ─────
  banner: { name: '군기 수레', role: '본진', side: 0, cost: 0, n: 1, hp: 520, atk: 0, as: 9, range: 0, spd: 0, r: 20, structure: true, banner: true,
    desc: '서낭대와 큰북을 실은 수레', tip: '서낭님을 모신 수레. 군대와 함께 걷습니다.' },
  // ───── 패로 불러내는 것 ─────
  stake: { name: '목책', role: '방벽', side: 0, cost: 0, n: 1, hp: 120, atk: 0, as: 9, range: 0, spd: 0, r: 12, structure: true, stake: true,
    desc: '길을 막는다', tip: '요괴의 길을 막는 말뚝.' },
  // 의병: 의병 봉기 패로만 불려 온다 (흰옷에 죽창, 병력 패가 아니다)
  militia: { name: '의병', role: '의병', side: 0, cost: 0, n: 8, hp: 74, atk: 10, as: 1.0, range: 0, spd: 66, r: 10,
    desc: '죽창을 든 의병', tip: '농기구와 죽창을 들고 일어선 백성들.' },
  decoy: { name: '허수아비', role: '미끼', side: 0, cost: 0, n: 1, hp: 190, atk: 0, as: 9, range: 0, spd: 0, r: 13, structure: true, decoy: true,
    desc: '적의 눈길을 끈다', tip: '주변 적이 허수아비를 먼저 공격합니다.' },
  // ───── 적군 ─────
  goblin: { name: '졸개 도깨비', role: '무리', side: 1, n: 7, hp: 50, atk: 8, as: 0.8, range: 0, spd: 76, r: 9,
    desc: '약하지만 수가 많다', tip: '약하지만 떼로 몰려옵니다. 범위 공격과 철퇴 장사가 잘 듣습니다.' },
  orc: { name: '방망이 도깨비', role: '보병', side: 1, n: 4, hp: 150, atk: 18, as: 1.15, range: 0, spd: 60, r: 12,
    desc: '튼튼한 근접 도깨비', tip: '단단하고 아픈 정면 싸움꾼. 등패수로 받아내고 화력을 집중하세요.' },
  garcher: { name: '돌팔매 도깨비', role: '원거리', side: 1, n: 5, hp: 46, atk: 12, as: 1.6, range: 215, spd: 58, r: 9, proj: 'stone', soft: true,
    desc: '뒤에서 돌을 던진다', tip: '등패수를 앞세워 돌을 받아내거나 기마 무사를 우회시켜 덮치세요.' },
  rshield: { name: '솥뚜껑 도깨비', role: '방어', side: 1, n: 4, hp: 235, atk: 10, as: 1.1, range: 0, spd: 50, r: 12, shield: true,
    desc: '솥뚜껑으로 화살을 막는다', tip: '정면 화살은 거의 막습니다. 배후를 치거나 도사·화차·화살비를 쓰세요.' },
  rassassin: { name: '불여우', role: '침투', side: 1, n: 3, hp: 78, atk: 19, as: 0.75, range: 0, spd: 104, r: 11, leap: true, backstab: 2.2,
    desc: '후방으로 도약해 기습', tip: '싸움이 붙으면 후방으로 뛰어듭니다. 궁수 곁에 [대기] 부대를 두세요.' },
  treant: { name: '장승', role: '거대', side: 1, n: 2, hp: 430, atk: 22, as: 1.8, range: 0, spd: 36, r: 15, large: true, splash: 34,
    desc: '느리지만 매우 단단하다', tip: '느리고 단단한 거대 요괴. 창병(1.5배)과 원거리로 미리 깎으세요.' },
  sapling: { name: '아기 장승', role: '소환', side: 1, n: 3, hp: 90, atk: 10, as: 1.2, range: 0, spd: 58, r: 10,
    desc: '당산 할배가 불러낸 작은 장승', tip: '당산 할배가 계속 불러냅니다. 본체를 빨리 쓰러뜨리세요.' },
  bomber: { name: '도깨비불', role: '자폭', side: 1, n: 4, hp: 44, atk: 0, as: 1, range: 0, spd: 96, r: 9, bomber: { dmg: 125, r: 58 },
    desc: '다가와서 터진다', tip: '뭉친 부대에 다가와 터집니다. 닿기 전에 잡으면 요괴들이 휘말립니다!' },
  wolf: { name: '멧돼지', role: '돌격', side: 1, n: 3, hp: 205, atk: 19, as: 1.1, range: 0, spd: 124, r: 14, mounted: true, charge: { mult: 3.2, dist: 110, kb: 30 }, prefer: 'soft',
    desc: '측면으로 우회해 들이받는다', tip: '측면을 돌아 후방을 노립니다. 창병을 [대기]시켜 궁수를 지키세요.' },
  shaman: { name: '북 도깨비', role: '지원', side: 1, n: 2, hp: 95, atk: 0, heal: 36, as: 1.7, range: 180, spd: 52, r: 11, soft: true, support: true, aura: { haste: 0.25, r: 115 },
    desc: '북소리로 치유하고 광분시킨다', tip: '주변 요괴 치유·공격 속도 증가. 기마 무사나 화력으로 먼저 잡으세요.' },
  skel: { name: '망령 병사', role: '망령', side: 1, n: 5, hp: 78, atk: 13, as: 1.0, range: 0, spd: 58, r: 11, revive: 0.55,
    desc: '한 번 되살아난다', tip: '3초 뒤 한 번 되살아납니다. 정화 굿 범위 안에서는 못 일어납니다.' },
  skelarcher: { name: '망령 궁수', role: '망령', side: 1, n: 4, hp: 50, atk: 13, as: 1.6, range: 225, spd: 54, r: 11, proj: 'arrow', soft: true, revive: 0.55,
    desc: '되살아나는 궁수', tip: '원거리 망령. 한 번 되살아나므로 끝까지 마무리하세요.' },
  catapult: { name: '투석기', role: '공성', side: 1, n: 1, hp: 300, atk: 140, as: 6.5, range: 900, spd: 0, r: 20, structure: true, soft: true, lob: { r: 62, delay: 2.2 },
    desc: '붉은 원에 바위가 떨어진다', tip: '붉은 원은 부대를 끌어 피하세요. 기마 무사로 부수면 가장 확실합니다.' },
  necro: { name: '저승사자', role: '소환', side: 1, n: 1, hp: 190, atk: 16, as: 1.8, range: 215, spd: 46, r: 12, proj: 'dark', soft: true, raise: { cd: 5, max: 7 },
    desc: '쓰러진 자를 망령으로 일으킨다', tip: '쓰러진 자를 망령 병사로 일으킵니다. 가장 먼저 잡으세요.' },
  dueok: { name: '두억시니', role: '난폭', side: 1, n: 2, hp: 310, atk: 32, as: 1.7, range: 0, spd: 52, r: 14, large: true, stunHit: { p: 0.3, t: 0.8 },
    desc: '머리를 내리찍는 난폭한 귀신', tip: '맞으면 셋에 하나꼴로 기절(영웅은 절반만). 창병·화력으로 빨리 잡으세요.' },
  yagwang: { name: '야광귀', role: '도둑', side: 1, n: 4, hp: 58, atk: 7, as: 1.0, range: 0, spd: 116, r: 9, prefer: 'soft', steal: 0.1,
    desc: '신발을 훔쳐 가는 밤 귀신', tip: '때릴 때마다 사기 0.1을 훔칩니다. 후방에 [대기] 부대를 두세요.' },
  bulga: { name: '불가사리', role: '거대', side: 1, n: 1, hp: 470, atk: 26, as: 1.5, range: 0, spd: 46, r: 16, large: true, iron: { cut: 0.6, fire: 1.6 },
    desc: '쇠를 먹고 자라는 짐승', tip: '칼·화살은 열에 여섯만 통하고, 불·도술(도사·화살비·벼락·삼족오)에 약합니다.' },
  jangsan: { name: '장산범', role: '홀림', side: 1, n: 1, hp: 260, atk: 26, as: 1.0, range: 0, spd: 104, r: 13, taunt: 150, dodge: 0.2, prefer: 'soft',
    desc: '사람 목소리를 흉내 내는 흰 범', tip: '주변 아군을 홀려 저만 쫓게 하고, 공격 다섯에 하나를 흘립니다. [대기]로 버티세요.' },
  geuseun: { name: '그슨대', role: '거대', side: 1, n: 1, hp: 430, atk: 22, as: 1.4, range: 0, spd: 46, r: 15, large: true, grow: { every: 4, atk: 0.14, hp: 0.07, max: 8 },
    desc: '올려다볼수록 커지는 그림자', tip: '살려 둘수록 커지고 세집니다. 화력을 모아 먼저 쓰러뜨리세요.' },
  // ───── 새 요괴 열둘 (싸우는 버릇은 sim/battle.js: cloak·drain·eat·lure·veil·drag·venom·split·heat·fear·grudge·devour) ─────
  gamtu: { name: '감투 도깨비', role: '숨음', side: 1, n: 4, hp: 120, atk: 15, as: 1.05, range: 0, spd: 66, r: 11, cloak: 150,
    desc: '도깨비감투를 써서 모습을 감춘다', tip: '멀리서는 보이지 않아 궁수·도사가 노리지 못하고, 때리는 순간에만 잠깐 드러납니다. 근접 부대나 범위 패로 잡으세요.' },
  bat: { name: '밤박쥐', role: '흡혈', side: 1, n: 6, hp: 34, atk: 7, as: 0.7, range: 0, spd: 132, r: 8, prefer: 'soft', drain: 0.6,
    desc: '떼로 날아와 피를 빤다', tip: '문 만큼 피를 빨아 낫고 무른 후열을 노립니다. 화살비 같은 범위 패로 한꺼번에 떨어뜨리세요.' },
  yeongno: { name: '영노', role: '포식', side: 1, n: 2, hp: 270, atk: 22, as: 1.35, range: 0, spd: 50, r: 14, large: true, eat: { proj: 0.5, atk: 0.07, max: 6 },
    desc: '무엇이든 받아먹는 탈판의 괴물', tip: '화살·돌은 절반만 들고, 받아먹을 때마다 공격력이 오릅니다(여섯 번까지). 근접 부대와 도술로 잡으세요.' },
  changgwi: { name: '창귀', role: '앞잡이', side: 1, n: 3, hp: 82, atk: 11, as: 1.1, range: 0, spd: 72, r: 11, lure: { cd: 6, r: 300, t: 3.5, amt: 0.2 },
    desc: '범에게 잡아먹혀 범을 섬기는 넋', tip: '몇 초마다 아군 하나를 불러내, 둘레의 요괴가 모두 그 부대를 노립니다(받는 피해 +20%). 창귀부터 잡으세요.' },
  foxhag: { name: '여우 할미', role: '둔갑', side: 1, n: 2, hp: 125, atk: 21, as: 1.1, range: 0, spd: 64, r: 11, veil: 0.25,
    desc: '할미로 둔갑한 늙은 여우', tip: '둔갑이 풀리기 전에는 피해를 4분의 1만 받습니다. 먼저 덤벼들어 본색을 드러낸 뒤에 몰아치세요.' },
  mulgwi: { name: '물귀신', role: '끌어감', side: 1, n: 3, hp: 125, atk: 12, as: 1.25, range: 0, spd: 56, r: 11, drag: { d: 16, t: 1.4, slow: 0.3 },
    desc: '물속으로 끌고 들어가는 귀신', tip: '붙잡은 아군을 요괴 무리 쪽으로 끌고 가 굼뜨게 만듭니다. 다가오기 전에 원거리로 잡으세요.' },
  myodusa: { name: '묘두사', role: '독', side: 1, n: 3, hp: 95, atk: 13, as: 1.0, range: 0, spd: 86, r: 11, venom: { t: 2.5, slow: 0.25 },
    desc: '고양이 머리를 한 뱀', tip: '물린 아군은 잠깐 힘이 빠지고 굼떠집니다. 정화 굿·독경처럼 해로운 효과를 씻는 패가 잘 듣습니다.' },
  jine: { name: '왕지네', role: '분열', side: 1, n: 1, hp: 340, atk: 20, as: 1.05, range: 0, spd: 64, r: 15, large: true, split: { type: 'jinebit', n: 3 },
    desc: '마디마다 살아 움직이는 큰 지네', tip: '쓰러지면 새끼 지네 셋으로 갈라집니다. 범위 공격으로 한꺼번에 쓸어 버리세요.' },
  jinebit: { name: '새끼 지네', role: '소환', side: 1, n: 3, hp: 55, atk: 9, as: 0.8, range: 0, spd: 92, r: 8,
    desc: '왕지네에서 떨어져 나온 마디', tip: '왕지네가 쓰러질 때 나옵니다. 약하지만 재빠릅니다.' },
  gangcheol: { name: '강철이', role: '가뭄', side: 1, n: 1, hp: 400, atk: 25, as: 1.4, range: 0, spd: 48, r: 16, large: true, heat: { r: 80, dps: 5.5 },
    desc: '지나는 곳마다 가뭄이 드는 불짐승', tip: '곁에 선 아군이 타들어 갑니다(비가 오면 식습니다). 원거리로 깎고, 근접 부대는 오래 붙여 두지 마세요.' },
  dalgyal: { name: '달걀귀신', role: '공포', side: 1, n: 2, hp: 150, atk: 12, as: 1.25, range: 0, spd: 54, r: 12, fear: { r: 105, every: 4.5, t: 0.8 },
    desc: '얼굴 없는 하얀 귀신', tip: '몇 초마다 둘레의 아군이 질겁해 잠깐 굳고 힘이 빠집니다(영웅은 꿈쩍 않습니다). 원거리로 먼저 잡으세요.' },
  songaksi: { name: '손각시', role: '원한', side: 1, n: 2, hp: 140, atk: 16, as: 1.05, range: 0, spd: 62, r: 11, grudge: { stun: 1.6, r: 80, weak: 3 },
    desc: '시집 못 가고 죽은 처녀 귀신', tip: '쓰러뜨린 부대는 오싹해 잠깐 굳고, 둘레의 아군은 힘이 빠집니다. 원거리나 패로 마무리하세요.' },
  agwi: { name: '아귀', role: '굶주림', side: 1, n: 3, hp: 130, atk: 15, as: 1.0, range: 0, spd: 58, r: 12, devour: { r: 56, heal: 0.3, atk: 0.12, max: 4 },
    desc: '굶주림이 끝나지 않는 귀신', tip: '쓰러진 자를 주워 먹고 낫고 세집니다(네 번까지). 싸움이 길어지기 전에 잡으세요.' },
  // ───── 보스 ─────
  warchief: { name: '푸른 김서방', role: '보스', side: 1, boss: true, n: 1, hp: 1900, atk: 44, as: 1.6, range: 0, reach: 14, spd: 52, r: 26, large: true, splash: 46, abil: ['slam', 'warcry'],
    desc: '터를 잃고 쫓겨 온 도깨비 두목', tip: '영웅과 씨름할 때 몰아쳐 왼다리를 걸면 넘어집니다(못 걸면 메다꽂힘). 붉은 원은 피하세요. 체력이 절반이면 온 무리가 광분합니다.' },
  elder: { name: '당산 할배', role: '보스', side: 1, boss: true, n: 1, hp: 2300, atk: 48, as: 2.0, range: 0, reach: 18, spd: 30, r: 30, large: true, splash: 44, abil: ['roots', 'saplings'],
    desc: '베어진 숲의 그루터기에서 깨어난 신령', tip: '초록 원(뿌리 감옥)을 피하세요. 아기 장승은 오래 두면 장승이 되니 나오는 대로 치우세요.' },
  skelking: { name: '어둑시니', role: '보스', side: 1, boss: true, n: 1, hp: 2800, atk: 44, as: 1.7, range: 0, reach: 18, spd: 50, r: 26, large: true, splash: 40, abil: ['brand', 'summon'],
    desc: '올려다볼수록 커지는 어둠', tip: '어둠 속에선 커집니다. 횃불 패·삼족오·불로 줄이세요. 보라 원(낙인)은 피하고, 후방 망령에 대비해 예비대를 두세요.' },
};
// 고개마다의 두목과 소품 (data/bosses.js)
Object.assign(UNITS, BOSS_UNITS);
for (const k of Object.keys(UNITS)) UNITS[k].id = k;

// ───── 영웅의 고유기: 기력이 찰 때마다 차례로 자동 발동한다 ─────
export const HERO_SKILLS = {
  commander: [{ id: 'whirl', name: '회전 베기', desc: '주변의 적을 크게 베어 밀쳐 낸다' }, { id: 'roar', name: '호통', desc: '주변 적은 약해지고 아군은 피해 +20%' }, { id: 'leap', name: '선봉 돌파', desc: '적이 가장 몰린 곳에 뛰어들어 내려친다' }],
  bishop: [{ id: 'wave', name: '자비의 물결', desc: '주변 아군의 체력을 크게 회복' }, { id: 'ward', name: '금강 결계', desc: '주변 아군에게 보호막' }, { id: 'smite', name: '항마진언', desc: '적 무리 피해·기절, 망령에게 1.5배' }],
  archmage: [{ id: 'chain', name: '연쇄 번개', desc: '적 다섯을 잇달아 꿰는 번개' }, { id: 'frost', name: '서리 안개', desc: '적 무리를 느리게 하는 안개' }, { id: 'fire', name: '삼매진화', desc: '적이 가장 몰린 곳에 큰 불덩이' }],
  blade: [{ id: 'dash', name: '질풍 베기', desc: '적 무리를 꿰뚫고 지나가며 벤다' }, { id: 'flurry', name: '검무', desc: '주변의 적을 여섯 번 벤다' }, { id: 'shadow', name: '그림자 베기', desc: '적 후방에 나타나 크게 베고 기절' }],
  hunter: [{ id: 'pierce', name: '관통시', desc: '한 줄로 선 적을 모두 꿰뚫는 화살' }, { id: 'burst', name: '연발', desc: '가까운 적 여섯에게 잇달아 쏜다' }, { id: 'snipe', name: '급소 저격', desc: '가장 큰 적에게 큰 피해와 기절' }],
  sangsoe: [{ id: 'jajin', name: '자진모리', desc: '주변 아군 공격 속도 +30%' }, { id: 'sinmyeong', name: '신명', desc: '사기 +1.5, 주변 아군 회복' }, { id: 'hwimori', name: '휘모리', desc: '주변 적의 넋을 빼 기절시킨다' }],
  chief: [{ id: 'quake', name: '땅울림', desc: '땅을 내리쳐 주변 적에게 피해와 감속' }, { id: 'provoke', name: '도발', desc: '적을 끌어모으고 받는 피해 -50%' }, { id: 'throw', name: '메치기', desc: '눈앞의 적을 집어 던져 기절' }],
};
// 이끄는 영웅의 병법: 패를 얻고 쓰는 방식이 영웅마다 다르다 (원정을 시작한 영웅의 것만 적용된다)
export const HERO_TRAIT = {
  commander: { name: '군세', desc: '부대 한도 +1. 싸움마다 한 번, 전멸한 부대를 바로 다시 세운다.', play: '많은 병력으로 밀어붙인다' },
  blade: { name: '단기필마', desc: '부대 한도 -1, 영웅 공격력·체력 +40%. 검객이 무리를 끝내면 영웅기 패 한 장을 되찾는다 (싸움마다 3장까지).', play: '영웅 혼자 베고 다니며 패를 번다' },
  hunter: { name: '사냥꾼의 눈', desc: '요괴 무리 셋을 물리칠 때마다 패를 노획한다 (다른 영웅은 다섯).', play: '전장에서 패를 가장 빨리 줍는다' },
  bishop: { name: '공양', desc: '싸움마다 지원 패 석 장까지는 써도 다음 싸움에 돌아온다.', play: '지원 패를 되풀이해 쓰며 버틴다' },
  archmage: { name: '도술', desc: '전술 패 위력 +30%·드는 사기 -1(최소 1), 주머니 +3. 싸움을 시작하면 공격 패 한 장을 빚는다. 부대 한도 -1.', play: '적은 병력, 강한 패' },
  sangsoe: { name: '신명', desc: '손에 빈 자리가 나면 언제든 사기 2로 아무 전술 패나 강화판(+)으로 얻어 공짜로 낸다 (다른 영웅은 패가 바닥나야 돌팔매만).', play: '사기를 패로 바꿔 쓴다' },
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
// 부대의 병사 수는 단련할수록 는다: 1단은 정원의 6할, 5단쯤 정원, 8단부터 1.3배 (영웅·수레처럼 하나뿐인 것은 그대로)
export const squadN = (n, lvl = 1) => n <= 1 ? n : Math.max(2, Math.round(n * Math.min(1.3, 0.62 + 0.1 * (lvl - 1))));
export function lvlMult(lvl) { return 1 + LVL_GROWTH * (lvl - 1); }
