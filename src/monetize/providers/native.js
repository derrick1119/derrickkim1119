// 앱(안드로이드·iOS) 공급자: AdMob 보상형 광고 + RevenueCat 인앱 결제.
// src/monetize/index.js 가 Capacitor 네이티브 앱에서만 동적으로 불러온다(웹에서는 이 파일이 실행되지 않는다).
// 공급자의 모양은 ../service.js 맨 위 설명을 따른다. 어떤 메서드도 밖으로 예외를 던지지 않는다:
// 실패하면 콘솔에 남기고 "광고 없음 / 결제 실패 / 빈 목록"으로 돌려준다.
//
// 시작 순서(init)
//   1) RevenueCat 설정(빠름) — 이것만 기다린다. 게임 첫 화면을 붙잡지 않도록 광고 준비는 뒤에서 한다.
//   2) 뒤에서: 광고 동의(UMP) 확인 → 필요하면 동의 창 → iOS 면 앱 추적 투명성(ATT) 알림 →
//      AdMob 시작(12세 이상: 어린이 대상 아님, 광고 등급 T) → 보상형 광고 한 편 미리 불러오기
import { Capacitor } from '@capacitor/core';
import { AdMob, AdmobConsentDebugGeography, AdmobConsentStatus, MaxAdContentRating, RewardAdPluginEvents } from '@capacitor-community/admob';
import { LOG_LEVEL, PRODUCT_CATEGORY, Purchases } from '@revenuecat/purchases-capacitor';
import { PRODUCTS, PRODUCT_BY_ID } from '../../features/monetize/catalog.js';
import { GOOGLE_TEST_REWARDED, MONETIZE_CONFIG } from '../config.js';

const TAG = '[수익화·앱]';
/** 광고 동의·SDK 시작을 기다리는 최대 시간(첫 실행에 동의 창이 떠 있으면 그동안은 "준비 중"). */
const READY_WAIT_MS = 8000;
/** 미리 불러온 광고의 유효 시간. Google 은 1시간 뒤 만료로 본다. 여유를 두고 다시 불러온다. */
const AD_MAX_AGE_MS = 50 * 60 * 1000;
/** show 를 부른 뒤 광고 화면이 뜨거나(Showed) 실패할 때까지 기다리는 최대 시간. */
const SHOW_START_TIMEOUT_MS = 15000;
/** 닫힘(Dismissed)이 보상(Rewarded)보다 먼저 오는 경우를 잠깐 기다린다. */
const DISMISS_GRACE_MS = 600;
/** 보상을 받은 뒤 닫힘 이벤트가 끝내 오지 않을 때의 안전장치. */
const AFTER_REWARD_MAX_MS = 120000;
/** 미리 불러오기 실패 뒤 다시 시도하는 간격(ms). */
const PRELOAD_RETRY_MS = [15000, 30000, 60000, 120000, 300000];
/** 결제 대기(부모 승인·현금 결제 등) 기록. 승인되어 거래가 들어오면 onDeferred 로 알린다. */
const PENDING_KEY = 'shh-ufo:native-pending';
const PENDING_MAX_AGE_MS = 7 * 86400000;

const RC_CANCELLED = '1';
const RC_ALREADY_PURCHASED = '6';
const RC_PAYMENT_PENDING = '20';

const errText = (err) => String(err?.message || err?.errorMessage || err || 'unknown');
const errCode = (err) => (err?.code === undefined || err?.code === null ? '' : String(err.code));
/** 안드로이드 정기 결제 상품 ID 는 "상품ID:요금제ID" 꼴이다. 카탈로그 ID 로 맞춘다. */
const baseId = (id) => String(id || '').split(':')[0];
const toMillis = (v) => {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  const t = Date.parse(v || '');
  return Number.isFinite(t) ? t : 0;
};
const placeholderKey = (key) => !key || typeof key !== 'string' || /^REPLACE/i.test(key);

/** p 가 ms 안에 끝나지 않으면 fallback 으로(없으면 에러로) 끝낸다. */
function withTimeout(p, ms, fallback) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => (fallback === undefined ? reject(new Error('timeout')) : resolve(fallback)), ms);
    Promise.resolve(p).then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      },
    );
  });
}

function loadPending() {
  try {
    const raw = JSON.parse(localStorage.getItem(PENDING_KEY) || '[]');
    const now = Date.now();
    return Array.isArray(raw) ? raw.filter((x) => x && PRODUCT_BY_ID[x.id] && now - x.at < PENDING_MAX_AGE_MS) : [];
  } catch {
    return [];
  }
}
function savePending(list) {
  try {
    localStorage.setItem(PENDING_KEY, JSON.stringify(list.slice(-20)));
  } catch {
    /* 무시 */
  }
}

export function createNativeProvider(config = MONETIZE_CONFIG) {
  const platform = Capacitor.getPlatform(); // 'android' | 'ios'
  const testMode = !!config.testMode;
  const adCfg = config.admob || {};
  const rcCfg = config.revenuecat || {};
  const ENT = { freepass: 'freepass', season: 'season', ...(rcCfg.entitlements || {}) };
  const debug = (...a) => {
    if (testMode) console.info(TAG, ...a);
  };
  const warn = (...a) => console.warn(TAG, ...a);

  // ───────────────────────── 광고(AdMob) ─────────────────────────
  const unitId = testMode ? GOOGLE_TEST_REWARDED[platform] : adCfg.rewarded?.[platform] || GOOGLE_TEST_REWARDED[platform];
  const ads = {
    canRequest: false,
    privacyRequired: false,
    blockReason: 'starting',
    /** @type {Promise<boolean>|null} 동의·SDK 시작이 끝나면 true(광고를 요청할 수 있음) */
    ready: null,
    /** @type {{adId: string, placement: string, at: number}|null} 미리 불러온 광고 */
    loaded: null,
    /** @type {Promise<boolean>|null} 불러오는 중 */
    loading: null,
    showing: false,
    initialized: false,
    /** 지금 띄운 광고 한 편의 이벤트 받는 곳 */
    session: null,
    lastPlacement: 'any',
    retry: 0,
    retryTimer: null,
    userId: '',
  };

  async function gatherConsent() {
    const opts = { tagForUnderAgeOfConsent: false };
    if (adCfg.testDeviceIds?.length) opts.testDeviceIdentifiers = adCfg.testDeviceIds;
    if (testMode && adCfg.debugGeography && AdmobConsentDebugGeography[adCfg.debugGeography] !== undefined) {
      opts.debugGeography = AdmobConsentDebugGeography[adCfg.debugGeography];
    }
    let info = await AdMob.requestConsentInfo(opts);
    if (info?.isConsentFormAvailable && info.status === AdmobConsentStatus.REQUIRED) {
      info = await AdMob.showConsentForm();
    }
    return info;
  }

  function readConsent(info) {
    if (!info) return;
    // PrivacyOptionsRequirementStatus 는 플러그인이 내보내지 않아 문자열로 비교한다
    ads.privacyRequired = info.privacyOptionsRequirementStatus === 'REQUIRED';
    ads.canRequest = !!info.canRequestAds;
    ads.blockReason = ads.canRequest ? '' : 'consent';
  }

  async function startAds() {
    // 1) 동의(UMP): 유럽·영국·스위스·미국 일부 주 등 동의가 필요한 곳에서만 창이 뜬다.
    try {
      readConsent(await gatherConsent());
    } catch (err) {
      // 오프라인 등으로 동의 정보를 받지 못함. 지난번에 받아 둔 동의(TCF 문자열)는 SDK 가 스스로 따른다.
      warn('광고 동의 정보를 받지 못했습니다. 광고 요청은 계속 시도합니다.', errText(err));
      ads.canRequest = true;
      ads.blockReason = '';
    }
    if (!ads.canRequest) {
      debug('동의가 없어 광고를 요청하지 않습니다.');
      return false;
    }
    return bootSdk();
  }

  /** 동의를 받은 뒤: ATT → SDK 시작 → 이벤트 듣기 → 미리 불러오기. 한 번만 한다. */
  async function bootSdk() {
    if (ads.initialized) {
      preload();
      return true;
    }
    // 2) iOS 앱 추적 투명성: 아직 묻지 않았을 때만. (AdMob 의 IDFA 안내 메시지를 켰다면 UMP 가 이미 물었다)
    if (platform === 'ios' && adCfg.requestTracking !== false) {
      try {
        const { status } = await AdMob.trackingAuthorizationStatus();
        if (status === 'notDetermined') await AdMob.requestTrackingAuthorization();
      } catch (err) {
        warn('앱 추적 허용 여부를 묻지 못했습니다.', errText(err));
      }
    }
    // 3) SDK 시작: 12세 이상(어린이 대상 아님, 동의 연령 미만 아님), 광고 내용 등급은 T(청소년)까지
    const init = () =>
      AdMob.initialize({
        tagForChildDirectedTreatment: false,
        tagForUnderAgeOfConsent: false,
        maxAdContentRating: MaxAdContentRating.Teen,
        initializeForTesting: (adCfg.testDeviceIds?.length || 0) > 0,
        testingDevices: adCfg.testDeviceIds || [],
      });
    try {
      await init();
    } catch (err) {
      warn('AdMob 시작에 실패해 한 번 더 시도합니다.', errText(err));
      try {
        await new Promise((r) => setTimeout(r, 3000));
        await init();
      } catch (err2) {
        warn('AdMob 을 시작하지 못했습니다.', errText(err2));
        ads.canRequest = false;
        ads.blockReason = 'init';
        return false;
      }
    }
    ads.initialized = true;
    await listen();
    preload('any');
    return true;
  }

  async function listen() {
    const on = (event, fn) =>
      AdMob.addListener(event, (data) => {
        try {
          fn(data);
        } catch (err) {
          warn('광고 이벤트 처리 중 오류', err);
        }
      }).catch((err) => warn('광고 이벤트를 듣지 못했습니다.', event, errText(err)));
    await Promise.all([
      on(RewardAdPluginEvents.Showed, () => ads.session?.onShowed()),
      on(RewardAdPluginEvents.Rewarded, (item) => ads.session?.onReward(item)),
      on(RewardAdPluginEvents.Dismissed, () => ads.session?.onDismiss()),
      on(RewardAdPluginEvents.FailedToShow, (e) => ads.session?.onFail(e)),
    ]);
  }

  /** 보상형 광고 한 편을 불러 둔다. 이미 쓸 만한 것이 있으면 그대로. */
  function load(placement) {
    if (ads.loading) return ads.loading;
    const fresh = ads.loaded && Date.now() - ads.loaded.at < AD_MAX_AGE_MS;
    const fits = !adCfg.ssv?.enabled || ads.loaded?.placement === placement;
    if (fresh && fits) return Promise.resolve(true);
    ads.loaded = null;
    const opts = { adId: unitId, isTesting: testMode };
    if (adCfg.npa) opts.npa = true; // 비개인 맞춤 광고만
    if (adCfg.ssv?.enabled) {
      // 서버 확인 콜백의 custom_data: 어떤 자리의 광고인지와 일회용 값
      const nonce = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
      opts.ssv = { customData: JSON.stringify({ placement, nonce }) };
      if (ads.userId) opts.ssv.userId = ads.userId;
    }
    ads.loading = withTimeout(AdMob.prepareRewardVideoAd(opts), adCfg.loadTimeoutMs || 10000)
      .then((info) => {
        ads.loaded = { adId: info?.adUnitId || unitId, placement, at: Date.now() };
        ads.retry = 0;
        debug('보상형 광고 준비됨', placement);
        return true;
      })
      .catch((err) => {
        warn('보상형 광고를 불러오지 못했습니다.', errText(err));
        return false;
      })
      .finally(() => {
        ads.loading = null;
      });
    return ads.loading;
  }

  /** 다음 광고를 미리 불러 둔다. 실패하면 점점 길게 쉬었다가 다시. */
  function preload(placement = ads.lastPlacement) {
    clearTimeout(ads.retryTimer);
    if (!ads.canRequest || ads.showing) return;
    load(placement).then((ok) => {
      if (ok || ads.showing) return;
      const wait = PRELOAD_RETRY_MS[Math.min(ads.retry++, PRELOAD_RETRY_MS.length - 1)];
      ads.retryTimer = setTimeout(() => preload(placement), wait);
    });
  }

  /** 불러 둔 광고를 띄우고 보상 여부를 돌려준다(닫힌 뒤에 끝난다). */
  function present() {
    return new Promise((resolve) => {
      let shown = false;
      let earned = false;
      let dismissed = false;
      let done = false;
      const timers = [];
      const finish = (res) => {
        if (done) return;
        done = true;
        timers.forEach(clearTimeout);
        ads.session = null;
        resolve(res);
      };
      ads.session = {
        onShowed() {
          shown = true;
        },
        onReward() {
          if (earned) return;
          earned = true;
          shown = true;
          if (dismissed) finish({ rewarded: true });
          else timers.push(setTimeout(() => finish({ rewarded: true }), AFTER_REWARD_MAX_MS));
        },
        onDismiss() {
          if (dismissed) return;
          dismissed = true;
          if (earned) finish({ rewarded: true });
          else timers.push(setTimeout(() => finish(earned ? { rewarded: true } : { rewarded: false }), DISMISS_GRACE_MS));
        },
        onFail(err) {
          if (earned) finish({ rewarded: true });
          else finish({ rewarded: false, error: errText(err) });
        },
      };
      const session = ads.session;
      timers.push(
        setTimeout(() => {
          if (!shown && !dismissed) finish({ rewarded: false, error: 'show-timeout' });
        }, SHOW_START_TIMEOUT_MS),
      );
      const adId = ads.loaded?.adId;
      ads.loaded = null; // 한 번 띄운 광고는 다시 쓰지 않는다
      AdMob.showRewardVideoAd(adId ? { adId } : {}).then(
        (item) => session.onReward(item),
        (err) => (errCode(err) === 'REWARDED_AD_CANCELLED' ? session.onDismiss() : session.onFail(err)),
      );
    });
  }

  // ───────────────────────── 결제(RevenueCat) ─────────────────────────
  const store = {
    configured: false,
    /** @type {Record<string, object>} 카탈로그 ID → RevenueCat StoreProduct */
    products: {},
    listeners: new Set(),
    /** 들을 쪽이 생기기 전에 들어온 대기 결제 완료 */
    queue: [],
    reported: new Set(),
  };
  const SUB_IDS = PRODUCTS.filter((p) => p.type === 'subscription').map((p) => p.id);
  const RESTORABLE = new Set(PRODUCTS.filter((p) => p.type === 'nonconsumable' || p.type === 'once').map((p) => p.id));

  async function configurePurchases() {
    const apiKey = rcCfg.apiKey?.[platform];
    if (placeholderKey(apiKey)) {
      warn('RevenueCat 키가 아직 없습니다(src/monetize/config.js). 인앱 결제를 끕니다.');
      return false;
    }
    try {
      await Purchases.setLogLevel({ level: testMode ? LOG_LEVEL.DEBUG : LOG_LEVEL.WARN }).catch(() => {});
      await withTimeout(Purchases.configure({ apiKey }), 8000);
      store.configured = true;
      Purchases.getAppUserID()
        .then((r) => {
          ads.userId = r?.appUserID || '';
        })
        .catch(() => {});
      Purchases.addCustomerInfoUpdateListener((info) => checkPending(info)).catch(() => {});
      Purchases.getCustomerInfo()
        .then((r) => checkPending(r?.customerInfo))
        .catch(() => {});
      return true;
    } catch (err) {
      warn('RevenueCat 을 시작하지 못했습니다.', errText(err));
      return false;
    }
  }

  /** 카탈로그 ID 들의 StoreProduct 를 받아 store.products 에 채운다. */
  async function fetchProducts(ids) {
    if (!store.configured) return;
    const subs = ids.filter((id) => SUB_IDS.includes(id));
    const inapp = ids.filter((id) => !SUB_IDS.includes(id));
    const calls = [];
    if (inapp.length) calls.push(Purchases.getProducts({ productIdentifiers: inapp, type: PRODUCT_CATEGORY.NON_SUBSCRIPTION }));
    if (subs.length) calls.push(Purchases.getProducts({ productIdentifiers: subs, type: PRODUCT_CATEGORY.SUBSCRIPTION }));
    const results = await Promise.allSettled(calls);
    for (const r of results) {
      if (r.status !== 'fulfilled') {
        warn('상품 정보를 받지 못했습니다.', errText(r.reason));
        continue;
      }
      for (const product of r.value?.products || []) {
        const id = baseId(product.identifier);
        if (!PRODUCT_BY_ID[id]) continue;
        // 안드로이드 정기 결제에 요금제가 여럿이면 설정한 기본 요금제를 고른다
        const plan = String(product.identifier).split(':')[1];
        const prev = store.products[id];
        if (prev && plan && rcCfg.seasonBasePlan && plan !== rcCfg.seasonBasePlan) continue;
        store.products[id] = product;
      }
    }
  }

  /** 정기 결제의 만료 시각(ms). 권한(entitlement)을 먼저 보고, 없으면 상품별 만료일. */
  function subscriptionExpiry(info, id) {
    const ent = info?.entitlements?.active?.[ENT.season] || info?.entitlements?.all?.[ENT.season];
    let best = ent && baseId(ent.productIdentifier) === id ? toMillis(ent.expirationDateMillis ?? ent.expirationDate) : 0;
    for (const [pid, date] of Object.entries(info?.allExpirationDates || {})) {
      if (baseId(pid) === id) best = Math.max(best, toMillis(date));
    }
    return best || undefined;
  }

  /** 이 상품의 가장 최근 비구독 거래(영구·소모형). */
  function latestTransaction(info, id, since = 0) {
    let best = null;
    for (const t of info?.nonSubscriptionTransactions || []) {
      if (baseId(t?.productIdentifier) !== id) continue;
      const at = toMillis(t.purchaseDate);
      if (at < since) continue;
      if (!best || at > toMillis(best.purchaseDate)) best = t;
    }
    return best;
  }

  /** 지금 가진 영구 상품·유효한 구독. */
  function ownedFrom(info) {
    const out = new Map();
    for (const t of info?.nonSubscriptionTransactions || []) {
      const id = baseId(t?.productIdentifier);
      if (RESTORABLE.has(id)) out.set(id, { id });
    }
    for (const pid of info?.allPurchasedProductIdentifiers || []) {
      const id = baseId(pid);
      if (RESTORABLE.has(id)) out.set(id, { id });
    }
    // 대시보드에서 직접 준 권한(프로모션 등)도 반영
    if (info?.entitlements?.active?.[ENT.freepass] && PRODUCT_BY_ID['shh.freepass']) out.set('shh.freepass', { id: 'shh.freepass' });
    const now = Date.now();
    for (const id of SUB_IDS) {
      const expiresAt = subscriptionExpiry(info, id);
      if (expiresAt && expiresAt > now) out.set(id, { id, expiresAt });
    }
    return [...out.values()];
  }

  // 결제 대기(iOS 「구입 요청」·안드로이드 현금 결제 등): 나중에 승인되어 거래가 들어오면 알린다.
  function emitDeferred(res) {
    if (store.reported.has(res.txId)) return;
    store.reported.add(res.txId);
    if (!store.listeners.size) {
      store.queue.push(res);
      return;
    }
    for (const fn of store.listeners) {
      try {
        fn(res);
      } catch (err) {
        warn('대기 결제 처리 중 오류', err);
      }
    }
  }
  function checkPending(info) {
    if (!info) return;
    const pending = loadPending();
    if (!pending.length) return;
    const left = [];
    for (const p of pending) {
      const def = PRODUCT_BY_ID[p.id];
      let res = null;
      if (def.type === 'subscription') {
        const expiresAt = subscriptionExpiry(info, p.id);
        if (expiresAt && expiresAt > Date.now()) {
          const sub = Object.entries(info.subscriptionsByProductIdentifier || {}).find(([k]) => baseId(k) === p.id)?.[1];
          res = { id: p.id, txId: sub?.storeTransactionId || `${p.id}:${toMillis(sub?.purchaseDate) || expiresAt}`, expiresAt };
        }
      } else {
        // 대기 시작 10분 전 이후의 거래만(예전에 산 같은 상품과 헷갈리지 않게)
        const t = latestTransaction(info, p.id, p.at - 600000);
        if (t) res = { id: p.id, txId: t.transactionIdentifier || `${p.id}:${toMillis(t.purchaseDate)}` };
      }
      if (res) emitDeferred(res);
      else left.push(p);
    }
    if (left.length !== pending.length) savePending(left);
  }

  // ───────────────────────── 공급자 ─────────────────────────
  return {
    name: 'native',
    testMode,

    async init() {
      try {
        // 광고 준비는 기다리지 않는다(첫 실행의 동의 창·ATT 알림이 게임 시작을 막지 않게)
        ads.ready = startAds().catch((err) => {
          warn('광고를 준비하지 못했습니다.', errText(err));
          ads.blockReason = 'init';
          return false;
        });
        await configurePurchases();
        debug('시작', { platform, testMode, unitId, store: store.configured });
      } catch (err) {
        warn('앱 공급자 시작 중 오류', errText(err));
      }
    },

    ads: {
      async showRewarded(placement) {
        if (ads.showing) return { rewarded: false, error: 'busy' };
        ads.showing = true;
        clearTimeout(ads.retryTimer);
        ads.lastPlacement = placement || 'any';
        try {
          const ok = await withTimeout(ads.ready || Promise.resolve(false), READY_WAIT_MS, false);
          if (!ok || !ads.canRequest) return { rewarded: false, error: ads.blockReason || 'not-ready' };
          if (!(await load(ads.lastPlacement))) return { rewarded: false, error: 'no-fill' };
          return await present();
        } catch (err) {
          warn('보상형 광고를 띄우지 못했습니다.', errText(err));
          return { rewarded: false, error: errText(err) };
        } finally {
          ads.showing = false;
          // 다음 한 편을 미리(광고 화면이 완전히 닫힌 뒤에)
          setTimeout(() => preload(ads.lastPlacement), 1000);
        }
      },
    },

    store: {
      async getProducts(ids) {
        const out = {};
        try {
          await fetchProducts((ids || []).filter((id) => PRODUCT_BY_ID[id]));
          for (const id of ids || []) {
            const p = store.products[id];
            if (p?.priceString) out[id] = { price: p.priceString };
          }
        } catch (err) {
          warn('상품 가격을 받지 못했습니다.', errText(err));
        }
        return out;
      },

      async purchase(id) {
        const def = PRODUCT_BY_ID[id];
        if (!def) return { ok: false, error: 'unknown product' };
        if (!store.configured) return { ok: false, error: 'store-unavailable' };
        try {
          if (!store.products[id]) await fetchProducts([id]);
          const product = store.products[id];
          if (!product) return { ok: false, error: 'product-unavailable' };
          const startedAt = Date.now();
          const res = await Purchases.purchaseStoreProduct({ product });
          const info = res?.customerInfo;
          const tx = res?.transaction;
          const out = { ok: true, txId: tx?.transactionIdentifier || undefined };
          if (def.type === 'subscription') {
            out.expiresAt = subscriptionExpiry(info, id);
            if (!out.txId) {
              const sub = Object.entries(info?.subscriptionsByProductIdentifier || {}).find(([k]) => baseId(k) === id)?.[1];
              out.txId = sub?.storeTransactionId || `${id}:${toMillis(sub?.purchaseDate) || startedAt}`;
            }
          } else if (!out.txId) {
            const t = latestTransaction(info, id, startedAt - 600000);
            out.txId = t?.transactionIdentifier || undefined;
          }
          return out;
        } catch (err) {
          const code = errCode(err);
          if (code === RC_CANCELLED || err?.userCancelled) return { ok: false, cancelled: true };
          if (code === RC_PAYMENT_PENDING) {
            // 부모 승인(구입 요청)·현금 결제 대기 등: 승인되면 onDeferred 로 지급한다
            savePending([...loadPending().filter((p) => p.id !== id), { id, at: Date.now() }]);
            return { ok: false, pending: true, error: 'pending' };
          }
          if (code === RC_ALREADY_PURCHASED && def.type === 'nonconsumable') {
            // 이미 가진 영구 상품(재설치 등): 그 거래로 다시 반영(같은 거래는 규칙이 두 번 주지 않는다).
            // 스타터 팩(once)은 내용물을 다시 주지 않도록 여기서 빼고 「구매 복원」으로만 되살린다.
            try {
              const { customerInfo } = await Purchases.getCustomerInfo();
              const t = latestTransaction(customerInfo, id);
              if (t || ownedFrom(customerInfo).some((x) => x.id === id)) return { ok: true, txId: t?.transactionIdentifier || `${id}:owned` };
            } catch {
              /* 아래로 */
            }
          }
          warn('결제 실패', id, code, errText(err));
          return { ok: false, error: errText(err) };
        }
      },

      async restore() {
        if (!store.configured) {
          const out = [];
          out.error = 'store-unavailable';
          return out;
        }
        try {
          const { customerInfo } = await Purchases.restorePurchases();
          checkPending(customerInfo);
          return ownedFrom(customerInfo);
        } catch (err) {
          warn('구매 복원 실패', errText(err));
          // 약속한 모양(배열)은 지키되, 실패했다는 것을 남긴다
          const out = [];
          out.error = errText(err);
          return out;
        }
      },

      /**
       * (선택) 결제 대기였던 거래가 나중에 승인되면 알린다: cb({id, txId, expiresAt?}).
       * 수익화 서비스가 fx.applyPurchase(id, txId, {expiresAt}) 로 지급하면 된다(같은 거래는 두 번 주지 않는다).
       * @returns {() => void} 듣기 그만
       */
      onDeferred(cb) {
        if (typeof cb !== 'function') return () => {};
        store.listeners.add(cb);
        const queued = store.queue.splice(0);
        for (const res of queued) {
          try {
            cb(res);
          } catch (err) {
            warn('대기 결제 처리 중 오류', err);
          }
        }
        return () => store.listeners.delete(cb);
      },
    },

    consent: {
      required: () => ads.privacyRequired,
      async showOptions() {
        try {
          await AdMob.showPrivacyOptionsForm();
          // 바뀐 동의를 다시 읽는다(광고를 끌 수도, 다시 켤 수도 있다)
          readConsent(await AdMob.requestConsentInfo({ tagForUnderAgeOfConsent: false }));
          if (ads.canRequest) {
            if (ads.initialized) preload();
            else ads.ready = bootSdk().catch(() => false);
          }
        } catch (err) {
          warn('광고 개인정보 설정을 열지 못했습니다.', errText(err));
        }
      },
    },
  };
}
