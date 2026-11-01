'use strict';
/* =========================================================
 * 서든어택: 남겨진 자들 — 게임 데이터
 * ========================================================= */

const CEASEFIRE_DAY = 25;      // 이 날 아침이 오면 휴전 → 승리
const WINTER_DAY = 10;         // 이 날부터 혹한
const NIGHT_HOURS = 9;         // 21:00 ~ 06:00

const ITEMS = {
  can:       { name: '통조림',     icon: '🥫', w: 1, val: 4 },
  raw:       { name: '식재료',     icon: '🥕', w: 1, val: 2 },
  meal:      { name: '조리식',     icon: '🍲', w: 1, val: 5 },
  water:     { name: '식수',       icon: '💧', w: 1, val: 2 },
  bandage:   { name: '붕대',       icon: '🩹', w: 1, val: 5 },
  medicine:  { name: '의약품',     icon: '💊', w: 1, val: 10 },
  herb:      { name: '약초',       icon: '🌿', w: 1, val: 2 },
  parts:     { name: '부품',       icon: '⚙️', w: 1, val: 3 },
  wood:      { name: '목재',       icon: '🪵', w: 2, val: 1 },
  fuel:      { name: '연료',       icon: '🛢️', w: 2, val: 4 },
  ammo:      { name: '탄약',       icon: '🔸', w: 1, val: 4 },
  knife:     { name: '전투 나이프', icon: '🔪', w: 1, val: 6 },
  pistol:    { name: '권총',       icon: '🔫', w: 2, val: 16 },
  rifle:     { name: '돌격소총',   icon: '🪖', w: 4, val: 30 },
  coffee:    { name: '커피',       icon: '☕', w: 1, val: 5 },
  cigarette: { name: '담배',       icon: '🚬', w: 1, val: 5 },
  valuables: { name: '귀중품',     icon: '💍', w: 1, val: 12 },
};

const ITEM_ORDER = ['can', 'meal', 'raw', 'water', 'medicine', 'bandage', 'herb', 'parts', 'wood', 'fuel',
  'ammo', 'knife', 'pistol', 'rifle', 'coffee', 'cigarette', 'valuables'];

const WEAPONS = {
  rifle:  { power: 3.5, gun: true },
  pistol: { power: 2.2, gun: true },
  knife:  { power: 1.0, gun: false },
};

const SURVIVOR_DEFS = {
  taeho: {
    id: 'taeho', name: '강태호', age: 34, role: '전직 저격수', trait: 'sniper', traitName: '명사수',
    traitDesc: '전투력 +2, 살상으로 인한 사기 하락이 적음',
    color: '#6f8f3c',
    bio: '용병 기업의 계약 저격수였다. 계약이 끝난 날, 회사는 그를 두고 철수했다.',
  },
  seojin: {
    id: 'seojin', name: '윤서진', age: 29, role: '전직 의무병', trait: 'medic', traitName: '응급처치',
    traitDesc: '붕대·의약품 치료 효과 2배',
    color: '#b84a4a',
    bio: '야전병원에서 수백 명을 살렸지만, 지금은 자기 자신을 지키는 것도 버겁다.',
  },
  mingyu: {
    id: 'mingyu', name: '박민규', age: 41, role: '보급창고 정비병', trait: 'engineer', traitName: '손재주',
    traitDesc: '건설·제작 행동력 1 감소',
    color: '#c08a2e',
    bio: '제3보급창고에서 장비를 고치던 정비병. 부품 하나면 뭐든 만든다고 큰소리친다.',
  },
  sora: {
    id: 'sora', name: '한소라', age: 24, role: '정찰병', trait: 'scout', traitName: '날렵함',
    traitDesc: '배낭 +4칸, 도주·은신 확률 +20%',
    color: '#4a7fb8',
    bio: '부대가 괴멸한 뒤 혼자 폐허를 떠돌았다. 소리 없이 움직이는 법을 안다.',
  },
  doyun: {
    id: 'doyun', name: '최도윤', age: 19, role: '신병', trait: 'cheerful', traitName: '분위기 메이커',
    traitDesc: '매일 아침 동료 전원 사기 +3',
    color: '#8a5bb8',
    bio: '입대 2주 만에 전쟁이 터졌다. 총보다 기타를 더 잘 다룬다.',
  },
};

const STARTING_CREW = ['taeho', 'seojin', 'mingyu'];

const START_INV = {
  can: 4, raw: 3, meal: 0, water: 6, bandage: 1, medicine: 0, herb: 1, parts: 6, wood: 5,
  fuel: 0, ammo: 0, knife: 0, pistol: 0, rifle: 0, coffee: 1, cigarette: 1, valuables: 0,
};

/* 건설(build) / 제작(craft) 목록 */
const RECIPES = [
  { id: 'bed', cat: 'build', name: '야전 침대', icon: '🛏️', cost: { wood: 3, parts: 1 }, ap: 2, max: 4,
    desc: '침대에서 자면 피로·체력 회복이 크게 늘어납니다.' },
  { id: 'stove', cat: 'build', name: '간이 조리대', icon: '🔥', cost: { parts: 3, wood: 2 }, ap: 2, max: 1,
    desc: '식재료를 조리식으로 만들 수 있습니다.' },
  { id: 'collector', cat: 'build', name: '빗물 집수기', icon: '🪣', cost: { parts: 3, wood: 1 }, ap: 2, max: 2, roof: true,
    desc: '매일 아침 식수 +2.' },
  { id: 'garden', cat: 'build', name: '옥상 텃밭', icon: '🌱', cost: { wood: 3, water: 2, parts: 2 }, ap: 2, max: 2, roof: true,
    desc: '매일 식수 1을 써서 식재료 +1/단계, 이틀마다 약초 +1.' },
  { id: 'barricade', cat: 'build', name: '바리케이드 보강', icon: '🧱', cost: { wood: 4, parts: 2 }, ap: 2, max: 3,
    desc: '약탈자에 대한 방어력 +2 / 단계.' },
  { id: 'workbench', cat: 'build', name: '작업대 개량', icon: '🛠️', cost: { parts: 5, wood: 2 }, ap: 3, max: 2,
    desc: '권총·탄약·의약품·무전기 제작이 가능해집니다.' },
  { id: 'heater', cat: 'build', name: '드럼통 난로', icon: '♨️', cost: { parts: 4, wood: 1 }, ap: 2, max: 1,
    desc: `겨울(${WINTER_DAY}일차~)에 매일 연료 1 또는 목재 2를 태워 보온합니다.` },
  { id: 'radio', cat: 'build', name: '군용 무전기', icon: '📻', cost: { parts: 6 }, ap: 2, max: 1, req: { workbench: 2 },
    desc: '매일 약탈 경보를 받고, 방송을 들으며 사기 +2.' },

  { id: 'cook', cat: 'craft', name: '조리하기', icon: '🍲', cost: { raw: 2, water: 1, wood: 1 }, give: { meal: 3 }, ap: 1,
    req: { stove: 1 }, desc: '식재료로 조리식 3인분을 만듭니다.' },
  { id: 'mkbandage', cat: 'craft', name: '붕대 만들기', icon: '🩹', cost: { herb: 2 }, give: { bandage: 1 }, ap: 1,
    desc: '약초를 짓이겨 천에 감습니다.' },
  { id: 'mkmedicine', cat: 'craft', name: '약초 의약품', icon: '💊', cost: { herb: 3, water: 1 }, give: { medicine: 1 }, ap: 2,
    req: { workbench: 2 }, desc: '조잡하지만 병을 낫게 할 수 있습니다.' },
  { id: 'mkknife', cat: 'craft', name: '전투 나이프', icon: '🔪', cost: { parts: 2 }, give: { knife: 1 }, ap: 1,
    desc: '가장 기본적인 자위 수단.' },
  { id: 'mkammo', cat: 'craft', name: '탄약 재장전', icon: '🔸', cost: { parts: 2, fuel: 1 }, give: { ammo: 3 }, ap: 1,
    req: { workbench: 2 }, desc: '탄피에 화약을 다시 채웁니다.' },
  { id: 'mkpistol', cat: 'craft', name: '권총 조립', icon: '🔫', cost: { parts: 7, wood: 1 }, give: { pistol: 1 }, ap: 3,
    req: { workbench: 2 }, desc: '부품을 긁어모아 권총 한 자루를 조립합니다.' },
];

const BUILD_NAMES = {
  bed: '침대', stove: '조리대', collector: '집수기', garden: '텃밭', barricade: '바리케이드',
  workbench: '작업대', heater: '난로', radio: '무전기',
};

/* 은신처 잔해 */
const RUBBLE = [
  { id: 'r1', room: 'workshop', name: '무너진 철제 선반', ap: 2, loot: { wood: 2, parts: 2 } },
  { id: 'r2', room: 'storage', name: '콘크리트 더미', ap: 2, loot: { parts: 2, water: 1 } },
  { id: 'r3', room: 'entrance', name: '옥상 계단 잔해', ap: 3, loot: { wood: 3 }, unlocksRoof: true },
  { id: 'r4', room: 'kitchen', name: '부서진 찬장', ap: 1, loot: { wood: 2, can: 1 } },
  { id: 'r5', room: 'storage', name: '찌그러진 사물함', ap: 1, loot: { bandage: 1, cigarette: 1 } },
];

/* 은신처 방 구성 (단면도) */
const SHELTER_ROOMS = [
  { id: 'roof', floor: 2, name: '옥상' },
  { id: 'workshop', floor: 1, name: '작업장' },
  { id: 'kitchen', floor: 1, name: '주방' },
  { id: 'entrance', floor: 1, name: '입구' },
  { id: 'bedroom', floor: 0, name: '지하 침실' },
  { id: 'storage', floor: 0, name: '창고' },
  { id: 'infirmary', floor: 0, name: '의무실' },
];

/* 야간 수색 지역 — 서든어택의 대표 맵을 전쟁 이후의 폐허로 재해석 */
const LOCATIONS = [
  {
    id: 'warehouse', name: '웨어하우스', sub: '버려진 물류창고', unlockDay: 1, danger: 1,
    x: 22, y: 30,
    desc: '철골만 남은 물류창고. 목재와 부품이 많지만 떠돌이 약탈자들이 가끔 드나든다.',
    enemy: { name: '떠돌이 약탈자', power: 2, base: 0.06, drop: { can: 1, ammo: 1 } },
    rooms: [
      { name: '정문 하역장', loot: { wood: [2, 4], parts: [0, 2], water: [0, 1] } },
      { name: '컨테이너 야적장', loot: { wood: [1, 3], parts: [2, 3], fuel: [0, 1] } },
      { name: '관리 사무실', locked: true, loot: { coffee: [0, 2], cigarette: [0, 2], valuables: [0, 1], bandage: [0, 1] } },
      { name: '2층 캣워크', loot: { parts: [1, 3], can: [1, 2], knife: [0, 1] } },
    ],
  },
  {
    id: 'provence', name: '프로방스', sub: '포격을 피한 주택가', unlockDay: 1, danger: 0,
    x: 70, y: 22,
    desc: '돌담 사이 골목이 남아 있는 마을. 피난을 떠나지 못한 노부부와 부상자가 숨어 지낸다. 적은 없다 — 하지만 양심이 시험받는다.',
    enemy: null,
    rooms: [
      { name: '무너진 빵집', loot: { raw: [2, 4], wood: [1, 2] } },
      { name: '분수 광장', loot: { water: [1, 3], herb: [1, 2] } },
      { name: '노부부의 집', owned: true, loot: { can: [2, 3], medicine: [1, 1], raw: [1, 2], coffee: [0, 1] } },
      { name: '성당 지하', special: 'wounded', loot: { herb: [1, 2], bandage: [0, 1] } },
    ],
  },
  {
    id: 'dragonroad', name: '드래곤로드', sub: '용 장식이 남은 상가 거리', unlockDay: 1, danger: 1.5,
    x: 54, y: 70,
    desc: '붉은 용 장식이 걸린 옛 상가 거리. 밤마다 암시장이 열리지만, 거리 갱단이 구역을 지배한다.',
    enemy: { name: '거리 갱단', power: 2.6, base: 0.08, drop: { cigarette: 1, ammo: 1 } },
    rooms: [
      { name: '불탄 노점', loot: { raw: [1, 3], can: [1, 2] } },
      { name: '셔터 내린 약국', locked: true, loot: { medicine: [0, 2], bandage: [1, 2], herb: [0, 1] } },
      { name: '암시장', special: 'trader', loot: {} },
      { name: '뒷골목', loot: { parts: [1, 3], wood: [1, 2], cigarette: [0, 1] } },
    ],
  },
  {
    id: 'crossport', name: '크로스포트', sub: '멈춰 선 항구', unlockDay: 4, danger: 2,
    x: 82, y: 70,
    desc: '화물선이 멈춰 선 항구. 밀수꾼들이 연료와 식량을 쌓아 두었다. 말이 통하는 상대일지도.',
    enemy: { name: '밀수꾼', power: 3, base: 0.1, negotiable: true, drop: { fuel: 1, ammo: 2 } },
    rooms: [
      { name: '부두 창고', loot: { wood: [2, 4], parts: [1, 2], fuel: [0, 1] } },
      { name: '화물 컨테이너', locked: true, loot: { can: [2, 4], fuel: [1, 2], parts: [1, 2] } },
      { name: '등대', loot: { water: [1, 3], can: [0, 2], cigarette: [0, 1], herb: [0, 1] } },
      { name: '밀수선 선실', loot: { fuel: [1, 2], ammo: [1, 3], valuables: [0, 1], pistol: [0, 1] } },
    ],
  },
  {
    id: 'depot', name: '제3보급창고', sub: '용병 보급기지', unlockDay: 7, danger: 3,
    x: 18, y: 78,
    desc: '용병 기업이 버리고 간 보급기지. 물자는 넘쳐나지만, 철수 명령을 받지 못한 잔존병들이 아직 지키고 있다.',
    enemy: { name: '잔존 용병', power: 4.5, base: 0.12, drop: { ammo: 3, can: 1 } },
    rooms: [
      { name: '철조망 입구', loot: { parts: [1, 2], wood: [0, 2] } },
      { name: '검문소', guard: true, loot: { ammo: [1, 2], cigarette: [0, 1] } },
      { name: '보급품 적재소', loot: { can: [2, 4], water: [1, 3], ammo: [1, 3], parts: [1, 3] } },
      { name: '무기고', locked: true, loot: { rifle: [1, 1], ammo: [2, 3], pistol: [0, 1] } },
      { name: '의무 텐트', loot: { medicine: [1, 3], bandage: [1, 3] } },
    ],
  },
];

const TRADER_STOCK = { can: 4, water: 3, medicine: 2, bandage: 2, ammo: 4, parts: 4, pistol: 1, coffee: 2, fuel: 2 };
const WANDERER_STOCK = { can: 2, raw: 3, medicine: 1, parts: 3, wood: 4, cigarette: 2, ammo: 2 };

/* 생존자 독백 */
const THOUGHTS = {
  hungry: ['배가 너무 고파…', '마지막으로 제대로 먹은 게 언제였지.', '통조림 냄새라도 맡고 싶다.'],
  thirsty: ['목이 타들어 간다.', '물… 물 한 모금만.'],
  tired: ['눈을 뜨고 있기도 힘들어.', '잠깐만, 아주 잠깐만 눈 좀 붙이자.'],
  hurt: ['상처가 욱신거린다.', '이대로 버틸 수 있을까.'],
  sick: ['열이 나… 몸이 떨려.', '약이 필요해.'],
  sad: ['우리가 살아남을 이유가 있을까.', '그날 밤 일이 자꾸 떠올라.', '다들 내가 짐이라고 생각하겠지.'],
  ok: ['오늘도 살아남았다.', '휴전 소식은 아직인가.', '총성이 조금 멀어진 것 같다.', '조금만 더 버티자.', '이 벽이 우리를 지켜줄 거야.'],
  good: ['오늘은 왠지 괜찮을 것 같아.', '우리, 해낼 수 있어.', '전쟁이 끝나면 바다를 보러 가야지.'],
};
