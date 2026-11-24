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
/** 조각을 이만큼 모으면 「본부 우수 요원」 의상 한 벌. */
export const PIECES_PER_COSTUME = 7;
export const PIECE_COSTUME = 'agent';

/**
 * 꾸미기. kind: outfit(피포 의상) · paint(기체 도색) · beam(빔 색). 능력치 없음.
 * source: shop(상품) · starter · season · ladder(조각) · default
 */
export const COSMETICS = [
  { id: 'none', kind: 'outfit', source: 'default' },
  { id: 'cadet', kind: 'outfit', source: 'starter' }, // 견습 비행사 모자와 고글 목도리
  { id: 'agent', kind: 'outfit', source: 'ladder' }, // 본부 우수 요원: 선글라스 + 넥타이 + 배지
  { id: 'star', kind: 'outfit', source: 'season' }, // 시즌 1: 별빛 망토와 왕관
  { id: 'bunny', kind: 'outfit', source: 'shop' }, // 토끼 귀 털모자
  { id: 'raincoat', kind: 'outfit', source: 'shop' }, // 노란 우비
  { id: 'chef', kind: 'outfit', source: 'shop' }, // 우주 요리사
  { id: 'astro', kind: 'outfit', source: 'shop' }, // 꼬마 우주복
  { id: 'navy', kind: 'paint', source: 'default' },
  { id: 'sunset', kind: 'paint', source: 'shop' },
  { id: 'mint', kind: 'paint', source: 'shop' },
  { id: 'galaxy', kind: 'paint', source: 'shop' },
  { id: 'gold', kind: 'paint', source: 'freepass' }, // 본부 프리패스 감사 선물
  { id: 'cyan', kind: 'beam', source: 'default' },
  { id: 'pink', kind: 'beam', source: 'shop' },
  { id: 'gold', kind: 'beam', source: 'season' },
  { id: 'rainbow', kind: 'beam', source: 'shop' },
];
export const COSMETIC_KINDS = ['outfit', 'paint', 'beam'];
export const DEFAULT_LOOK = { outfit: 'none', paint: 'navy', beam: 'cyan' };
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
  { id: 'shh.outfit.bunny', type: 'nonconsumable', krw: 2500, give: { cosmetics: ['outfit:bunny'] } },
  { id: 'shh.outfit.raincoat', type: 'nonconsumable', krw: 2500, give: { cosmetics: ['outfit:raincoat'] } },
  { id: 'shh.outfit.chef', type: 'nonconsumable', krw: 3300, give: { cosmetics: ['outfit:chef'] } },
  { id: 'shh.outfit.astro', type: 'nonconsumable', krw: 4900, give: { cosmetics: ['outfit:astro'] } },
  { id: 'shh.paint.sunset', type: 'nonconsumable', krw: 2500, give: { cosmetics: ['paint:sunset'] } },
  { id: 'shh.paint.mint', type: 'nonconsumable', krw: 2500, give: { cosmetics: ['paint:mint'] } },
  { id: 'shh.paint.galaxy', type: 'nonconsumable', krw: 4900, give: { cosmetics: ['paint:galaxy'] } },
  { id: 'shh.beam.pink', type: 'nonconsumable', krw: 2500, give: { cosmetics: ['beam:pink'] } },
  { id: 'shh.beam.rainbow', type: 'nonconsumable', krw: 3300, give: { cosmetics: ['beam:rainbow'] } },
];
export const PRODUCT_BY_ID = Object.freeze(Object.assign(Object.create(null), Object.fromEntries(PRODUCTS.map((p) => [p.id, p]))));

/** 시즌 패스 효과. */
export const SEASON = { gainMult: 1.25, dailyGrantUnits: 3 };
/** 한정 제안: 스타터 팩(3대째부터 48시간), 새 형태 기념 팩(형태마다 24시간). */
export const OFFERS = { starterFromGen: 3, starterHours: 48, formPackHours: 24, formPackFromForm: 1 };
/** 관측실 진열장 칸 최대(collection 기능과 같은 값). */
export const MAX_SLOTS = 8;
