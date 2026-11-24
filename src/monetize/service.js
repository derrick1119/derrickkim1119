// 수익화 서비스: 보상형 광고를 띄우고, 인앱 결제를 받고, 끝나면 규칙(game.fx.monetize)에 알린다.
// 광고·결제를 실제로 하는 쪽은 공급자(providers/)다. 앱(안드로이드·iOS)에서는 native.js(AdMob·RevenueCat),
// 그 밖(웹·개발)에서는 mock.js(가짜 광고·가짜 결제)를 쓴다.
//
// 공급자의 모양
//   name: string
//   init(o): Promise<void>
//   ads.showRewarded(placement): Promise<{rewarded: boolean, error?: string}>
//   store.getProducts(ids): Promise<Record<id, {price: string}>>   스토어가 정한 현지 가격 문자열
//   store.purchase(id): Promise<{ok: boolean, txId?: string, expiresAt?: number, cancelled?: boolean, error?: string}>
//   store.restore(): Promise<{id: string, expiresAt?: number}[]>    영구 상품·구독(소모형은 복원되지 않는다)
//   consent?: { required(): boolean, showOptions(): Promise<void> }  광고 개인정보 설정(유럽 등)
import { Emitter } from '../core/emitter.js';
import { PRODUCTS } from '../features/monetize/catalog.js';

export class Monetize extends Emitter {
  /**
   * @param {import('../core/game.js').Game} game
   * @param {object} provider
   */
  constructor(game, provider) {
    super();
    this.game = game;
    this.provider = provider;
    this.prices = {};
    this.busy = false;
    /** 광고·결제 화면이 떠 있는 동안 게임을 멈추고 소리를 줄이는 쪽(UI 가 넣는다). */
    this.hooks = { pause: () => {}, resume: () => {} };
  }

  get fx() {
    return this.game.fx.monetize;
  }

  async init() {
    try {
      await this.provider.init?.({ testMode: this.provider.testMode });
    } catch (err) {
      console.warn('수익화 공급자를 시작하지 못했습니다.', err);
    }
    // 보호자 승인(iOS 구매 요청) 등으로 나중에 끝난 구매
    this.provider.store.onDeferred?.((r) => {
      const result = this.fx?.applyPurchase(r.id, r.txId || null, { expiresAt: r.expiresAt });
      if (result && !result.duplicate) this.emit('purchased', { id: r.id, result });
    });
    this.refreshPrices();
  }

  async refreshPrices() {
    try {
      this.prices = (await this.provider.store.getProducts(PRODUCTS.map((p) => p.id))) || {};
      this.emit('prices', this.prices);
    } catch (err) {
      console.warn('상품 가격을 받지 못했습니다.', err);
    }
  }

  /** 상품 가격(스토어 현지 가격, 없으면 원화 표시 가격). */
  price(id) {
    const p = this.prices[id]?.price;
    if (p) return p;
    // 앱에서는 스토어가 정한 현지 통화로만 보여 준다(받기 전엔 '…')
    if (this.provider.name !== 'mock') return '…';
    const def = PRODUCTS.find((x) => x.id === id);
    return def ? `₩${def.krw.toLocaleString('ko-KR')}` : '';
  }

  /**
   * 보상형 광고 한 편. 프리패스가 있으면 광고 없이 바로 보상.
   * @param {string} placement 광고 자리(catalog PLACEMENTS)
   * @param {object} [ctx] 보상 계산에 필요한 것(report, gained, reward)
   * @returns {Promise<{ok: boolean, reason?: string, result?: object}>}
   */
  async watch(placement, ctx = {}) {
    const fx = this.fx;
    if (!fx || this.busy) return { ok: false, reason: 'busy' };
    const check = fx.canWatch(placement);
    if (!check.ok) return { ok: false, reason: check.reason };
    let rewarded = fx.hasFreePass();
    let error = null;
    if (!rewarded) {
      this.busy = true;
      this.hooks.pause();
      try {
        const res = await this.provider.ads.showRewarded(placement);
        rewarded = !!res?.rewarded;
        error = res?.error || null;
      } catch (err) {
        error = String(err?.message || err);
      } finally {
        this.busy = false;
        this.hooks.resume();
      }
    }
    if (!rewarded) return { ok: false, reason: error ? 'error' : 'cancelled' };
    fx.recordView(placement);
    const result = fx.reward(placement, ctx);
    this.emit('rewarded', { placement, result });
    return { ok: true, result };
  }

  /**
   * 인앱 상품을 산다.
   * @returns {Promise<{ok: boolean, reason?: string, result?: object}>}
   */
  async buy(id) {
    const fx = this.fx;
    if (!fx || this.busy) return { ok: false, reason: 'busy' };
    if (!fx.canBuy(id)) return { ok: false, reason: 'unavailable' };
    this.busy = true;
    this.hooks.pause();
    let res;
    try {
      res = await this.provider.store.purchase(id);
    } catch (err) {
      res = { ok: false, error: String(err?.message || err) };
    } finally {
      this.busy = false;
      this.hooks.resume();
    }
    if (!res?.ok) return { ok: false, reason: res?.cancelled ? 'cancelled' : res?.pending ? 'pending' : 'error', error: res?.error };
    const result = fx.applyPurchase(id, res.txId || null, { expiresAt: res.expiresAt });
    this.emit('purchased', { id, result });
    return { ok: true, result };
  }

  /** 구매 복원(영구 상품·구독). */
  async restore() {
    const fx = this.fx;
    if (!fx) return { ok: false };
    try {
      const list = await this.provider.store.restore();
      const restored = fx.restore(list);
      this.emit('restored', restored);
      return { ok: !list?.error, restored, error: list?.error };
    } catch (err) {
      return { ok: false, error: String(err?.message || err) };
    }
  }

  /** 광고 개인정보 설정을 다시 열 수 있어야 하는지(유럽 등 동의 지역). */
  get privacyOptionsRequired() {
    return !!this.provider.consent?.required?.();
  }

  async showPrivacyOptions() {
    await this.provider.consent?.showOptions?.();
  }
}
