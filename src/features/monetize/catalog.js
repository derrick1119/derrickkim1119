// 수익화 표: 보상형 광고 자리, 본부 지원 도장 사다리, 인앱 상품, 꾸미기.
// 수치만 담는다(문구는 strings.js). 보상 크기는 "지금 형태의 보통 보고서 연구비"(grantUnit)를 단위로 잡아
// 진행도와 상관없이 광고 한 편의 값이 비슷하게 느껴지게 한다.

/**
 * 보상형 광고 자리. 모두 선택(보면 이득, 안 봐도 손해 없음).
 * cap = 하루 한도, perCadet = 대원 한 명당 한도(없으면 무제한), cooldown = 같은 자리 다시 보기까지(초)
 */
export const PLACEMENTS = {
  supply: { cap: 20, cooldown: 0 }, // 본부 보급 풍선(하늘에 떠오른 캡슐)
  boost: { cap: 9, cooldown: 0 }, // 관측 부스터: 성장 ×2, 20분(최대 3시간 쌓기)
  cloak: { cap: 10, cooldown: 0 }, // 구름 은폐 즉시 충전
  report: { cap: 10, cooldown: 0 }, // 보고서 연구비 ×3
  coverUp: { cap: 5, perCadet: 1, cooldown: 0 }, // 본부 긴급 무마(들킨 일 없던 일로)
  reroll: { cap: 5, cooldown: 0 }, // 교훈 카드 다시 뽑기
  retry: { cap: 5, cooldown: 0 }, // 임무 미니게임 한 번 더
  offline: { cap: 1, cooldown: 0 }, // 자리 비움 보상 ×2
  daily: { cap: 1, cooldown: 0 }, // 출석 보급품 ×2
};

/** 관측 부스터 한 편의 길이(초)와 쌓을 수 있는 최대(초). */
export const BOOST = { perAd: 20 * 60, max: 3 * 3600, mult: 2 };

/** 본부 보급 풍선: 등장 간격(초)과 열었을 때의 보상 가중치. */
export const SUPPLY = {
  every: [120, 180],
  firstAfter: 75, // 대원이 도착하고 이만큼 지난 뒤 첫 풍선
  life: 26, // 하늘에 떠 있는 시간(초)
  rewards: [
    { id: 'grant', weight: 5 }, // 연구비 보고서 0.8건치
    { id: 'fuel', weight: 3 }, // 연료 +50%
    { id: 'shiny', weight: 2 }, // 60초 동안 반짝이 확률 3배
  ],
  grantUnits: 0.8,
  fuel: 50,
  shinySeconds: 60,
  shinyMult: 3,
};

/**
 * 본부 지원 도장: 광고 한 편 = 도장 1개. 하루에 모은 개수에 따라 단계 보상(매일 0시 초기화).
 * reward: grant(units) · shinyNext(다음 표본 반짝이 확정) · lessonTicket(희귀 이상 교훈 카드 선택권)
 *         boost(초) · piece(꾸미기 조각)
 */
export const LADDER = [
  { at: 3, reward: { grant: 2 } },
  { at: 7, reward: { shinyNext: 1, grant: 2 } },
  { at: 12, reward: { lessonTicket: 1 } },
  { at: 20, reward: { boost: 3600, grant: 4 } },
  { at: 30, reward: { piece: 1, grant: 6 } },
];
/** 7일 연속 20개 이상이면 주간 보너스. */
export const WEEKLY = { days: 7, need: 20, reward: { piece: 2, grant: 15 } };
/**
 * 조각 꾸미기: 조각을 이만큼 모으면 아래 차례대로 하나씩 완성된다(「본부 우수 요원」 → 「꼬마 기사」 → 「천사 고리」).
 * 모두 가졌으면 조각 하나가 연구비 PIECE_GRANT_UNITS 단위로 바뀐다.
 */
export const PIECES_PER_COSTUME = 7;
export const PIECE_SERIES = ['outfit:agent', 'outfit:knight', 'deco:halo'];
export const PIECE_COSTUME = 'agent'; // 첫 조각 의상(예전 이름)
export const PIECE_GRANT_UNITS = 3;

/**
 * 테마 세트: 의상 + 도색 + 빔 + 장식 네 가지가 한 벌. 세트로만 판다(product).
 */
export const SETS = [
  { id: 'cat', product: 'shh.set.cat', krw: 5900, items: ['outfit:cat', 'paint:calico', 'beam:peach', 'deco:catears'] },
  { id: 'dino', product: 'shh.set.dino', krw: 5900, items: ['outfit:dino', 'paint:jungle', 'beam:lime', 'deco:spikes'] },
  { id: 'bee', product: 'shh.set.bee', krw: 5900, items: ['outfit:bee', 'paint:honey', 'beam:honey', 'deco:wings'] },
  { id: 'wizard', product: 'shh.set.wizard', krw: 5900, items: ['outfit:wizard', 'paint:magic', 'beam:violet', 'deco:stars'] },
  { id: 'winter', product: 'shh.set.winter', krw: 5900, items: ['outfit:winter', 'paint:snow', 'beam:ice', 'deco:antlers'] },
  { id: 'pirate', product: 'shh.set.pirate', krw: 5900, items: ['outfit:pirate', 'paint:pirate', 'beam:ocean', 'deco:flag'] },
];
export const SET_BY_ID = Object.freeze(Object.assign(Object.create(null), Object.fromEntries(SETS.map((x) => [x.id, x]))));

/**
 * 꾸미기. kind: outfit(피포 의상) · paint(기체 도색) · beam(빔 색) · deco(기체 장식). 능력치 없음.
 * source: default · shop(낱개 상품) · set(테마 세트 상품, set = 세트 id) · starter · season · freepass
 *         ladder(본부 지원 도장 조각, PIECE_SERIES 차례) · achievement(업적을 이루면 공짜, ach = 업적 id)
 */
const setOf = (key) => SETS.find((x) => x.items.includes(key))?.id;
const C = (kind, id, source, extra = {}) => ({ id, kind, source, ...(source === 'set' ? { set: setOf(`${kind}:${id}`) } : {}), ...extra });
export const COSMETICS = [
  // 피포 의상
  C('outfit', 'none', 'default'),
  C('outfit', 'cadet', 'starter'), // 견습 비행사 모자와 고글 목도리
  C('outfit', 'agent', 'ladder'), // 본부 우수 요원: 선글라스 + 넥타이 + 배지
  C('outfit', 'star', 'season'), // 시즌 1: 별빛 망토와 왕관
  C('outfit', 'flower', 'achievement', { ach: 'archive_10' }), // 꽃 화관
  C('outfit', 'party', 'achievement', { ach: 'clear_1' }), // 생일 파티
  C('outfit', 'knight', 'ladder'), // 꼬마 기사
  C('outfit', 'bunny', 'shop'), // 토끼 귀 털모자
  C('outfit', 'raincoat', 'shop'), // 노란 우비
  C('outfit', 'chef', 'shop'), // 우주 요리사
  C('outfit', 'astro', 'shop'), // 꼬마 우주복
  C('outfit', 'frog', 'shop'), // 개구리 모자
  C('outfit', 'cat', 'set'), // 냥냥 후드
  C('outfit', 'dino', 'set'), // 공룡 후드
  C('outfit', 'bee', 'set'), // 꿀벌
  C('outfit', 'wizard', 'set'), // 꼬마 마법사
  C('outfit', 'winter', 'set'), // 겨울 니트
  C('outfit', 'pirate', 'set'), // 우주 해적 선장
  // 기체 도색
  C('paint', 'navy', 'default'),
  C('paint', 'gold', 'freepass'), // 본부 프리패스 감사 선물
  C('paint', 'chrome', 'achievement', { ach: 'form_carrier' }), // 크롬 은빛
  C('paint', 'sunset', 'shop'),
  C('paint', 'mint', 'shop'),
  C('paint', 'galaxy', 'shop'),
  C('paint', 'berry', 'shop'), // 딸기우유
  C('paint', 'candy', 'shop'), // 사탕
  C('paint', 'aurora', 'shop'), // 오로라
  C('paint', 'calico', 'set'),
  C('paint', 'jungle', 'set'),
  C('paint', 'honey', 'set'),
  C('paint', 'magic', 'set'),
  C('paint', 'snow', 'set'),
  C('paint', 'pirate', 'set'),
  // 빔 색
  C('beam', 'cyan', 'default'),
  C('beam', 'gold', 'season'),
  C('beam', 'aurora', 'achievement', { ach: 'specimens_1000' }),
  C('beam', 'pink', 'shop'),
  C('beam', 'rainbow', 'shop'),
  C('beam', 'sunset', 'shop'),
  C('beam', 'candy', 'shop'),
  C('beam', 'peach', 'set'),
  C('beam', 'lime', 'set'),
  C('beam', 'honey', 'set'),
  C('beam', 'violet', 'set'),
  C('beam', 'ice', 'set'),
  C('beam', 'ocean', 'set'),
  // 기체 장식
  C('deco', 'none', 'default'),
  C('deco', 'crown', 'achievement', { ach: 'form_galaxy' }), // 왕관
  C('deco', 'halo', 'ladder'), // 천사 고리
  C('deco', 'bow', 'shop'), // 리본
  C('deco', 'propeller', 'shop'), // 프로펠러
  C('deco', 'catears', 'set'),
  C('deco', 'spikes', 'set'),
  C('deco', 'wings', 'set'),
  C('deco', 'stars', 'set'),
  C('deco', 'antlers', 'set'),
  C('deco', 'flag', 'set'),
];
export const COSMETIC_KINDS = ['outfit', 'paint', 'beam', 'deco'];
export const DEFAULT_LOOK = { outfit: 'none', paint: 'navy', beam: 'cyan', deco: 'none' };
export const cosmeticKey = (kind, id) => `${kind}:${id}`;
export const COSMETIC_BY_KEY = Object.freeze(Object.assign(Object.create(null), Object.fromEntries(COSMETICS.map((c) => [cosmeticKey(c.kind, c.id), c]))));

/**
 * 인앱 상품. id = 스토어 상품 ID(앱스토어·구글플레이·RevenueCat 에 같은 ID 로 만든다).
 * type: consumable(여러 번) · once(한 번만 살 수 있는 소모형) · nonconsumable(영구) · subscription(정기 구독)
 * krw = 스토어 가격을 받기 전·개발용 표시 가격(실제 가격은 스토어가 정한다)
 * give: grant(units) · boost(초) · slot(진열장 칸) · cosmetics([kind:id]) · freePass · season(일)
 */
export const PRODUCTS = [
  { id: 'shh.starter', type: 'once', krw: 1500, give: { grant: 25, slot: 1, cosmetics: ['outfit:cadet'] } },
  { id: 'shh.freepass', type: 'nonconsumable', krw: 9900, give: { freePass: true, cosmetics: ['paint:gold'] } },
  { id: 'shh.season', type: 'subscription', krw: 6500, give: { season: 30, cosmetics: ['outfit:star', 'beam:gold'] } },
  { id: 'shh.grant.s', type: 'consumable', krw: 1200, give: { grant: 8 } },
  { id: 'shh.grant.m', type: 'consumable', krw: 5900, give: { grant: 45 } },
  { id: 'shh.grant.l', type: 'consumable', krw: 12000, give: { grant: 100 } },
  { id: 'shh.grant.xl', type: 'consumable', krw: 33000, give: { grant: 300 } },
  { id: 'shh.formpack', type: 'consumable', krw: 3900, give: { grant: 30, boost: 3 * 3600 } },
  ...SETS.map((x) => ({ id: x.product, type: 'nonconsumable', krw: x.krw, give: { cosmetics: [...x.items] } })),
  { id: 'shh.outfit.bunny', type: 'nonconsumable', krw: 2500, give: { cosmetics: ['outfit:bunny'] } },
  { id: 'shh.outfit.raincoat', type: 'nonconsumable', krw: 2500, give: { cosmetics: ['outfit:raincoat'] } },
  { id: 'shh.outfit.chef', type: 'nonconsumable', krw: 3300, give: { cosmetics: ['outfit:chef'] } },
  { id: 'shh.outfit.astro', type: 'nonconsumable', krw: 4900, give: { cosmetics: ['outfit:astro'] } },
  { id: 'shh.outfit.frog', type: 'nonconsumable', krw: 2500, give: { cosmetics: ['outfit:frog'] } },
  { id: 'shh.paint.sunset', type: 'nonconsumable', krw: 2500, give: { cosmetics: ['paint:sunset'] } },
  { id: 'shh.paint.mint', type: 'nonconsumable', krw: 2500, give: { cosmetics: ['paint:mint'] } },
  { id: 'shh.paint.galaxy', type: 'nonconsumable', krw: 4900, give: { cosmetics: ['paint:galaxy'] } },
  { id: 'shh.paint.berry', type: 'nonconsumable', krw: 2500, give: { cosmetics: ['paint:berry'] } },
  { id: 'shh.paint.candy', type: 'nonconsumable', krw: 2500, give: { cosmetics: ['paint:candy'] } },
  { id: 'shh.paint.aurora', type: 'nonconsumable', krw: 3300, give: { cosmetics: ['paint:aurora'] } },
  { id: 'shh.beam.pink', type: 'nonconsumable', krw: 2500, give: { cosmetics: ['beam:pink'] } },
  { id: 'shh.beam.rainbow', type: 'nonconsumable', krw: 3300, give: { cosmetics: ['beam:rainbow'] } },
  { id: 'shh.beam.sunset', type: 'nonconsumable', krw: 2500, give: { cosmetics: ['beam:sunset'] } },
  { id: 'shh.beam.candy', type: 'nonconsumable', krw: 2500, give: { cosmetics: ['beam:candy'] } },
  { id: 'shh.deco.bow', type: 'nonconsumable', krw: 2500, give: { cosmetics: ['deco:bow'] } },
  { id: 'shh.deco.propeller', type: 'nonconsumable', krw: 3300, give: { cosmetics: ['deco:propeller'] } },
];
export const PRODUCT_BY_ID = Object.freeze(Object.assign(Object.create(null), Object.fromEntries(PRODUCTS.map((p) => [p.id, p]))));

/** 시즌 패스 효과. */
export const SEASON = { gainMult: 1.25, dailyGrantUnits: 3 };
/** 한정 제안: 스타터 팩(3대째부터 48시간), 새 형태 기념 팩(형태마다 24시간). */
export const OFFERS = { starterFromGen: 3, starterHours: 48, formPackHours: 24, formPackFromForm: 1 };
/** 관측실 진열장 칸 최대(collection 기능과 같은 값). */
export const MAX_SLOTS = 8;
