// 수익화 규칙(DOM 없음): 보상형 광고의 하루 한도와 보상, 본부 지원 도장, 관측 부스터,
// 인앱 상품의 지급·복원, 한정 제안, 꾸미기. 광고를 실제로 띄우고 결제를 받는 일은
// src/monetize/(공급자)가 맡고, 끝나면 여기 API 를 부른다(game.fx.monetize).
import './strings.js';
import { defineFeature, clean } from '../../core/features.js';
import { reportGrant } from '../../core/balance.js';
import { pickWeighted } from '../../core/rng.js';
import {
  PLACEMENTS,
  BOOST,
  SUPPLY,
  LADDER,
  WEEKLY,
  PIECES_PER_COSTUME,
  PIECE_COSTUME,
  COSMETICS,
  COSMETIC_KINDS,
  COSMETIC_BY_KEY,
  DEFAULT_LOOK,
  cosmeticKey,
  PRODUCTS,
  PRODUCT_BY_ID,
  SEASON,
  OFFERS,
} from './catalog.js';

export * from './catalog.js';

const HOUR = 3600 * 1000;
const DAY = 24 * HOUR;

/** 기기 현지 날짜 'YYYY-MM-DD'. */
export function dayOf(ms) {
  const d = new Date(ms);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
const dayGap = (a, b) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / DAY);

/** 광고·상품 보상의 단위: 지금 형태에서 보통 보고서 한 건의 연구비. */
export function grantUnit(game) {
  return Math.max(5, reportGrant({ formIndex: game.formIndex, progress: 0.5, isNew: false, aiLevel: game.state.gadgets.ai || 0 }));
}

const initial = () => ({
  day: null,
  views: {},
  stamps: 0,
  claimed: [],
  week: { streak: 0, last: null },
  weeklyReady: false,
  totalViews: 0,
  cadet: { gen: 1, views: {} },
  boostUntil: 0,
  shinyUntil: 0,
  shinyNext: 0,
  lessonTickets: 0,
  pieces: 0,
  owned: [],
  look: { ...DEFAULT_LOOK },
  products: {},
  tx: [],
  freePass: false,
  seasonUntil: 0,
  seasonDay: null,
  offers: { starterAt: 0, form: {} },
  reportBoostGen: 0,
  lastOffline: null,
  lastDaily: null,
});

const isKey = (k) => typeof k === 'string' && !!COSMETIC_BY_KEY[k];
const placementIds = Object.keys(PLACEMENTS);

function sanitize(raw, init) {
  const r = clean.obj(raw);
  const out = { ...init };
  out.day = clean.str(r.day, null, null, 10);
  if (out.day && !/^\d{4}-\d{2}-\d{2}$/.test(out.day)) out.day = null;
  const views = clean.obj(r.views);
  out.views = {};
  for (const id of placementIds) {
    const n = clean.int(views[id], 0, 0, 999);
    if (n) out.views[id] = n;
  }
  out.stamps = clean.int(r.stamps, 0, 0, 9999);
  out.claimed = clean.arr(r.claimed, (x) => (LADDER.some((s) => s.at === x) ? x : undefined), LADDER.length);
  const w = clean.obj(r.week);
  out.week = { streak: clean.int(w.streak, 0, 0, 999), last: typeof w.last === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(w.last) ? w.last : null };
  out.weeklyReady = clean.bool(r.weeklyReady, false);
  out.totalViews = clean.int(r.totalViews, 0);
  const c = clean.obj(r.cadet);
  const cv = clean.obj(c.views);
  out.cadet = { gen: clean.int(c.gen, 1, 1), views: {} };
  for (const id of placementIds) {
    const n = clean.int(cv[id], 0, 0, 99);
    if (n) out.cadet.views[id] = n;
  }
  out.boostUntil = clean.num(r.boostUntil, 0, 0);
  out.shinyUntil = clean.num(r.shinyUntil, 0, 0);
  out.shinyNext = clean.int(r.shinyNext, 0, 0, 20);
  out.lessonTickets = clean.int(r.lessonTickets, 0, 0, 20);
  out.pieces = clean.int(r.pieces, 0, 0, 999);
  out.owned = [...new Set(clean.arr(r.owned, (k) => (isKey(k) ? k : undefined), COSMETICS.length))];
  const look = clean.obj(r.look);
  out.look = { ...DEFAULT_LOOK };
  for (const kind of COSMETIC_KINDS) {
    const id = look[kind];
    const key = cosmeticKey(kind, id);
    if (isKey(key) && (COSMETIC_BY_KEY[key].source === 'default' || out.owned.includes(key))) out.look[kind] = id;
  }
  const prods = clean.obj(r.products);
  out.products = {};
  for (const p of PRODUCTS) {
    const n = clean.int(prods[p.id], 0, 0, 9999);
    if (n) out.products[p.id] = n;
  }
  out.tx = clean.arr(r.tx, (x) => (typeof x === 'string' && x.length <= 120 ? x : undefined), 60);
  out.freePass = clean.bool(r.freePass, false);
  out.seasonUntil = clean.num(r.seasonUntil, 0, 0);
  out.seasonDay = typeof r.seasonDay === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(r.seasonDay) ? r.seasonDay : null;
  const of = clean.obj(r.offers);
  const form = {};
  for (const [k, v] of Object.entries(clean.obj(of.form))) {
    if (/^[0-7]$/.test(k) && typeof v === 'number' && Number.isFinite(v)) form[k] = v;
  }
  out.offers = { starterAt: clean.num(of.starterAt, 0, 0), form };
  out.reportBoostGen = clean.int(r.reportBoostGen, 0, 0);
  const lo = clean.obj(r.lastOffline);
  out.lastOffline = typeof lo.gained === 'number' && lo.gained > 0 ? { gained: clean.num(lo.gained, 0, 0), doubled: clean.bool(lo.doubled, false) } : null;
  const ld = clean.obj(r.lastDaily);
  out.lastDaily = typeof ld.reward === 'number' && ld.reward > 0 ? { reward: clean.int(ld.reward, 0), day: clean.str(ld.day, null, null, 10), doubled: clean.bool(ld.doubled, false) } : null;
  return out;
}

export default defineFeature({
  id: 'monetize',
  initial,
  sanitize,
  install(game) {
    const slot = () => {
      if (!game.state.ext) game.state.ext = {};
      if (!game.state.ext.monetize) game.state.ext.monetize = initial();
      return game.state.ext.monetize;
    };
    const now = () => game.now();
    const changed = () => {
      game.emit('monetize:change');
      game.emit('change');
    };

    /** 날짜가 바뀌었으면 오늘의 시청 횟수·도장을 새로 시작한다. */
    function rollover() {
      const s = slot();
      const today = dayOf(now());
      if (s.day === today) return s;
      s.day = today;
      s.views = {};
      s.stamps = 0;
      s.claimed = [];
      return s;
    }

    function cadet() {
      const s = slot();
      if (s.cadet.gen !== game.state.gen) s.cadet = { gen: game.state.gen, views: {} };
      return s.cadet;
    }

    /** 연구비를 단위 배수만큼 준다(연구비 보정 적용). */
    function giveGrant(units, source) {
      const amount = game.grantFor(grantUnit(game) * units, source);
      game.state.grant += amount;
      return amount;
    }

    function addBoost(seconds) {
      const s = slot();
      const base = Math.max(now(), s.boostUntil);
      s.boostUntil = Math.min(now() + BOOST.max * 1000, base + seconds * 1000);
      return s.boostUntil;
    }

    function addCosmetic(key) {
      const s = slot();
      if (!isKey(key) || s.owned.includes(key)) return false;
      s.owned.push(key);
      game.emit('monetize:cosmetic', { key });
      return true;
    }

    function addPieces(n) {
      const s = slot();
      s.pieces += n;
      const made = [];
      const key = cosmeticKey('outfit', PIECE_COSTUME);
      while (s.pieces >= PIECES_PER_COSTUME && !s.owned.includes(key)) {
        s.pieces -= PIECES_PER_COSTUME;
        addCosmetic(key);
        made.push(key);
      }
      return made;
    }

    /** 단계 보상(도장·주간·상품 공통)을 준다. */
    function applyReward(rw, source) {
      const out = {};
      if (rw.grant) out.grant = giveGrant(rw.grant, source);
      if (rw.boost) out.boostUntil = addBoost(rw.boost);
      if (rw.shinyNext) {
        slot().shinyNext += rw.shinyNext;
        out.shinyNext = rw.shinyNext;
      }
      if (rw.lessonTicket) {
        slot().lessonTickets += rw.lessonTicket;
        out.lessonTicket = rw.lessonTicket;
      }
      if (rw.piece) {
        out.piece = rw.piece;
        out.made = addPieces(rw.piece);
      }
      return out;
    }

    function canWatch(id) {
      const p = PLACEMENTS[id];
      if (!p) return { ok: false, reason: 'unknown', left: 0 };
      const s = rollover();
      const used = s.views[id] || 0;
      if (used >= p.cap) return { ok: false, reason: 'cap', left: 0 };
      if (p.perCadet && (cadet().views[id] || 0) >= p.perCadet) return { ok: false, reason: 'cadet', left: 0 };
      return { ok: true, reason: null, left: p.cap - used };
    }

    // 새 대원·형태: 한정 제안
    game.on('generation', () => {
      const s = slot();
      if (!s.offers.starterAt && game.state.gen >= OFFERS.starterFromGen && !s.products['shh.starter']) {
        s.offers.starterAt = now();
        game.emit('monetize:offer', { id: 'shh.starter' });
      }
    });
    game.on('formUp', ({ form }) => {
      const s = slot();
      if (form < OFFERS.formPackFromForm || s.offers.form[form] !== undefined) return;
      s.offers.form[form] = now() + OFFERS.formPackHours * HOUR;
      game.emit('monetize:offer', { id: 'shh.formpack', form });
    });
    game.on('replaced', () => game.emit('monetize:change'));

    const api = {
      grantUnit: () => grantUnit(game),
      today: () => rollover().day,

      // ───── 광고 ─────
      canWatch,
      /** 광고를 끝까지 봤다(또는 프리패스로 건너뛰었다): 횟수·도장을 올린다. */
      recordView(id) {
        const check = canWatch(id);
        if (!check.ok) return null;
        const s = rollover();
        s.views[id] = (s.views[id] || 0) + 1;
        const c = cadet();
        c.views[id] = (c.views[id] || 0) + 1;
        s.stamps++;
        s.totalViews++;
        const reached = LADDER.filter((st) => st.at === s.stamps).map((st) => st.at);
        // 하루 20개를 처음 채운 날: 주간 연속 기록
        if (s.stamps === WEEKLY.need) {
          const w = s.week;
          w.streak = w.last && dayGap(w.last, s.day) === 1 ? w.streak + 1 : 1;
          w.last = s.day;
          if (w.streak >= WEEKLY.days) s.weeklyReady = true;
        }
        for (const at of reached) game.emit('monetize:ladder', { at });
        changed();
        return { stamps: s.stamps, reached };
      },

      /**
       * 광고 자리의 보상을 준다(recordView 다음에 부른다).
       * @param {string} id 자리
       * @param {object} [ctx] report(보고서) · gained(자리 비움 성장) · reward(출석 보급품)
       */
      reward(id, ctx = {}) {
        const s = slot();
        let out = { id };
        switch (id) {
          case 'supply': {
            const pick = pickWeighted(game.rng, SUPPLY.rewards, (r) => r.weight).id;
            out.kind = pick;
            if (pick === 'grant') out.amount = giveGrant(SUPPLY.grantUnits, 'supply');
            else if (pick === 'fuel') {
              game.state.run.fuel = Math.min(100, game.state.run.fuel + SUPPLY.fuel);
              out.amount = SUPPLY.fuel;
            } else {
              s.shinyUntil = now() + SUPPLY.shinySeconds * 1000;
              out.until = s.shinyUntil;
            }
            break;
          }
          case 'boost':
            out.until = addBoost(BOOST.perAd);
            break;
          case 'cloak':
            game.state.run.cloakCd = 0;
            game.emit('cloakReady');
            break;
          case 'report': {
            const rep = ctx.report;
            if (!rep || s.reportBoostGen === rep.gen) return { id, ok: false };
            s.reportBoostGen = rep.gen;
            out.amount = Math.round((rep.grant || 0) * 2);
            game.state.grant += out.amount;
            break;
          }
          case 'coverUp':
            out.ok = game.coverUp();
            break;
          case 'reroll':
            out.offer = game.fx.lessons?.reroll?.() || null;
            break;
          case 'offline': {
            const g = ctx.gained || s.lastOffline?.gained || 0;
            if (g > 0 && !(s.lastOffline && s.lastOffline.doubled)) {
              out.grown = game.grantGrowth(g);
              out.amount = g;
              s.lastOffline = { gained: g, doubled: true };
            }
            break;
          }
          case 'daily': {
            const r = ctx.reward || s.lastDaily?.reward || 0;
            if (r > 0 && !(s.lastDaily && s.lastDaily.doubled)) {
              game.state.grant += r;
              out.amount = r;
              s.lastDaily = { reward: r, day: dayOf(now()), doubled: true };
            }
            break;
          }
          case 'retry':
          default:
            break;
        }
        out.ok = out.ok !== false;
        game.emit('monetize:reward', out);
        changed();
        return out;
      },

      /** 자리 비움·출석 보상을 기억해 둔다(×2 광고용). */
      noteOffline(gained) {
        slot().lastOffline = gained > 0 ? { gained, doubled: false } : null;
      },
      noteDaily(reward) {
        slot().lastDaily = reward > 0 ? { reward, day: dayOf(now()), doubled: false } : null;
      },

      // ───── 본부 지원 도장 ─────
      stamps: () => rollover().stamps,
      ladder() {
        const s = rollover();
        return LADDER.map((st) => ({ ...st, reached: s.stamps >= st.at, claimed: s.claimed.includes(st.at) }));
      },
      claimable: () => api.ladder().filter((st) => st.reached && !st.claimed).length + (slot().weeklyReady ? 1 : 0),
      claim(at) {
        const s = rollover();
        const st = LADDER.find((x) => x.at === at);
        if (!st || s.stamps < at || s.claimed.includes(at)) return null;
        s.claimed.push(at);
        const out = applyReward(st.reward, 'ladder');
        changed();
        return out;
      },
      week: () => ({ ...slot().week, ready: slot().weeklyReady, days: WEEKLY.days, need: WEEKLY.need }),
      claimWeekly() {
        const s = slot();
        if (!s.weeklyReady) return null;
        s.weeklyReady = false;
        s.week.streak = 0;
        const out = applyReward(WEEKLY.reward, 'ladder');
        changed();
        return out;
      },
      lessonTickets: () => slot().lessonTickets,
      /** 교훈 카드 선택권을 하나 쓴다(희귀 이상 세 장 중 하나). */
      useLessonTicket() {
        const s = slot();
        if (s.lessonTickets <= 0 || !game.fx.lessons?.offerBonus?.()) return false;
        s.lessonTickets--;
        changed();
        return true;
      },

      // ───── 부스터·반짝이 ─────
      boostLeft: () => Math.max(0, (slot().boostUntil - now()) / 1000),
      boostActive: () => slot().boostUntil > now(),
      shinyBuffLeft: () => Math.max(0, (slot().shinyUntil - now()) / 1000),

      // ───── 인앱 상품 ─────
      hasFreePass: () => slot().freePass,
      seasonActive: () => slot().seasonUntil > now(),
      seasonLeft: () => Math.max(0, (slot().seasonUntil - now()) / 1000),
      /** 시즌 패스 일일 보상을 오늘 받을 수 있는지. */
      seasonClaimable: () => api.seasonActive() && slot().seasonDay !== dayOf(now()),
      claimSeason() {
        if (!api.seasonClaimable()) return null;
        const s = slot();
        s.seasonDay = dayOf(now());
        const amount = giveGrant(SEASON.dailyGrantUnits, 'season');
        changed();
        return { grant: amount };
      },
      bought: (id) => slot().products[id] || 0,
      /** 살 수 있는지(한 번만 사는 상품을 이미 샀으면 false). */
      canBuy(id) {
        const p = PRODUCT_BY_ID[id];
        if (!p) return false;
        if ((p.type === 'once' || p.type === 'nonconsumable') && api.bought(id)) return false;
        if (p.type === 'subscription' && api.seasonActive()) return false;
        if (id === 'shh.formpack' && !api.formOffer()) return false;
        if (id === 'shh.starter' && !api.starterOffer() && !api.bought(id)) return false;
        return true;
      },
      /** 상품이 지금 주는 것(진행도 비례 연구비 포함) — 상점 카드에 보여 준다. */
      preview(id) {
        const p = PRODUCT_BY_ID[id];
        if (!p) return null;
        const g = p.give;
        return {
          grant: g.grant ? game.grantFor(grantUnit(game) * g.grant, 'shop') : 0,
          boost: g.boost || 0,
          slot: g.slot || 0,
          cosmetics: g.cosmetics || [],
          freePass: !!g.freePass,
          season: g.season || 0,
        };
      },
      /**
       * 결제가 끝난 상품을 지급한다. 같은 거래(txId)는 두 번 지급하지 않는다.
       * @param {string} id 상품
       * @param {string} [txId] 거래 ID
       * @param {{expiresAt?: number}} [o] 구독 만료 시각(ms)
       */
      applyPurchase(id, txId = null, o = {}) {
        const p = PRODUCT_BY_ID[id];
        const s = slot();
        if (!p) return null;
        if (txId && s.tx.includes(txId)) return { duplicate: true };
        if (txId) {
          s.tx.push(txId);
          if (s.tx.length > 50) s.tx.splice(0, s.tx.length - 50);
        }
        s.products[id] = (s.products[id] || 0) + 1;
        const g = p.give;
        const out = { id };
        if (g.grant) out.grant = giveGrant(g.grant, 'shop');
        if (g.boost) out.boostUntil = addBoost(g.boost);
        if (g.slot) out.slot = game.fx.collection?.giftSlot?.() ? g.slot : 0;
        if (g.freePass) s.freePass = true;
        if (g.season) s.seasonUntil = Math.max(o.expiresAt || 0, Math.max(now(), s.seasonUntil) + g.season * DAY);
        if (g.cosmetics) out.cosmetics = g.cosmetics.filter((k) => addCosmetic(k));
        if (id === 'shh.formpack') {
          const f = api.formOffer();
          if (f) s.offers.form[f.form] = -1; // 그 형태의 기념 팩은 한 번만
        }
        game.emit('monetize:purchase', out);
        changed();
        return out;
      },
      /**
       * 스토어에서 복원한 영구 상품·구독을 다시 반영한다(다른 기기·재설치).
       * @param {{id: string, expiresAt?: number}[]} list
       */
      restore(list) {
        const s = slot();
        const restored = [];
        for (const item of list || []) {
          const p = PRODUCT_BY_ID[item?.id];
          if (!p) continue;
          if (p.type === 'nonconsumable' || p.type === 'once') {
            if (!s.products[p.id]) {
              s.products[p.id] = 1;
              if (p.give.freePass) s.freePass = true;
              if (p.give.slot && p.type !== 'once') game.fx.collection?.giftSlot?.();
              restored.push(p.id);
            }
            for (const k of p.give.cosmetics || []) addCosmetic(k);
          } else if (p.type === 'subscription' && item.expiresAt > now()) {
            s.seasonUntil = Math.max(s.seasonUntil, item.expiresAt);
            for (const k of p.give.cosmetics || []) addCosmetic(k);
            restored.push(p.id);
          }
        }
        changed();
        return restored;
      },

      // ───── 한정 제안 ─────
      starterOffer() {
        const s = slot();
        if (!s.offers.starterAt || s.products['shh.starter']) return null;
        const until = s.offers.starterAt + OFFERS.starterHours * HOUR;
        return until > now() ? { id: 'shh.starter', until } : null;
      },
      formOffer() {
        const s = slot();
        let best = null;
        for (const [form, until] of Object.entries(s.offers.form)) {
          if (until > now() && (!best || until > best.until)) best = { id: 'shh.formpack', form: Number(form), until };
        }
        return best;
      },

      // ───── 꾸미기 ─────
      look: () => ({ ...DEFAULT_LOOK, ...slot().look }),
      pieces: () => ({ have: slot().pieces, need: PIECES_PER_COSTUME, costume: PIECE_COSTUME }),
      owns(kind, id) {
        const key = cosmeticKey(kind, id);
        return isKey(key) && (COSMETIC_BY_KEY[key].source === 'default' || slot().owned.includes(key));
      },
      cosmetics: (kind) => COSMETICS.filter((c) => !kind || c.kind === kind).map((c) => ({ ...c, owned: api.owns(c.kind, c.id), equipped: api.look()[c.kind] === c.id })),
      equip(kind, id) {
        if (!COSMETIC_KINDS.includes(kind) || !api.owns(kind, id)) return false;
        slot().look[kind] = id;
        game.emit('monetize:look', api.look());
        changed();
        return true;
      },
      /** 상품 ID 로 그 꾸미기를 파는 상품을 찾는다. */
      productFor(kind, id) {
        const key = cosmeticKey(kind, id);
        return PRODUCTS.find((p) => (p.give.cosmetics || []).includes(key)) || null;
      },
    };
    return api;
  },
  modify(key, value, ctx, game) {
    const s = game.state.ext?.monetize;
    if (!s) return value;
    const t = game.now();
    if (key === 'gainMult') {
      let v = value;
      if (s.boostUntil > t) v *= BOOST.mult;
      if (s.seasonUntil > t) v *= SEASON.gainMult;
      return v;
    }
    if (key === 'shinyChance') {
      // 다음 표본 반짝이 확정(도장 보상): 표본이 생길 때 한 번 쓴다
      if (ctx?.spawn && s.shinyNext > 0) {
        s.shinyNext--;
        return 1;
      }
      if (s.shinyUntil > t) return value * SUPPLY.shinyMult;
    }
    return value;
  },
});
