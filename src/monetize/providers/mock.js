// 개발용 가짜 공급자: 웹·미리보기에서 광고·결제 흐름을 실제처럼 시험한다.
// 가짜 광고는 5초 카운트다운 뒤 "보상 받기", 가짜 결제는 확인 창 하나. 돈은 오가지 않는다.
// 구매 기록(영구 상품·구독)은 이 기기 localStorage 에 남겨 "구매 복원"을 시험할 수 있게 한다.
import { t } from '../../i18n/index.js';
import { h } from '../../ui/dom.js';
import { iconURL } from '../../render/iconcache.js';
import { PRODUCT_BY_ID } from '../../features/monetize/catalog.js';

const KEY = 'shh-ufo:mock-purchases';
const AD_SECONDS = 5;

function loadOwned() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(raw) ? raw.filter((x) => x && typeof x.id === 'string' && PRODUCT_BY_ID[x.id]) : [];
  } catch {
    return [];
  }
}
function saveOwned(list) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list.slice(-50)));
  } catch {
    /* 무시 */
  }
}

/** 화면 맨 위에 덮는 판. 닫힐 때 결과를 돌려준다. */
function overlay(build) {
  return new Promise((resolve) => {
    const host = document.getElementById('stage') || document.body;
    const root = h('div', { class: 'mz-overlay', role: 'dialog', 'aria-modal': 'true' });
    const done = (v) => {
      root.classList.add('out');
      setTimeout(() => root.remove(), 180);
      resolve(v);
    };
    root.append(build(done));
    host.append(root);
    root.querySelector('button')?.focus({ preventScroll: true });
  });
}

export function createMockProvider() {
  return {
    name: 'mock',
    testMode: true,
    async init() {},
    ads: {
      showRewarded(placement) {
        return overlay((done) => {
          let left = AD_SECONDS;
          const count = h('b', { class: 'mz-count', text: t('monetize.ad.seconds', { n: left }) });
          const claim = h('button', { class: 'btn primary', type: 'button', disabled: '', onClick: () => done({ rewarded: true }) }, t('monetize.ad.testDone'));
          const skip = h('button', { class: 'btn ghost', type: 'button', onClick: () => done({ rewarded: false }) }, t('monetize.ad.testSkip'));
          const timer = setInterval(() => {
            left--;
            count.textContent = left > 0 ? t('monetize.ad.seconds', { n: left }) : '✓';
            if (left <= 0) {
              clearInterval(timer);
              claim.removeAttribute('disabled');
              claim.focus({ preventScroll: true });
            }
          }, 1000);
          return h(
            'div',
            { class: 'mz-ad', 'data-placement': placement },
            h('span', { class: 'mz-tag', text: t('monetize.ad.test') }),
            h('div', { class: 'mz-screen' }, h('img', { src: iconURL('form', 2, 120), width: 120, height: 120, alt: '' }), h('p', { text: t('monetize.ad.testBody') }), count),
            h('div', { class: 'row' }, skip, claim),
          );
        });
      },
    },
    store: {
      async getProducts(ids) {
        const out = {};
        for (const id of ids) {
          const p = PRODUCT_BY_ID[id];
          if (p) out[id] = { price: `₩${p.krw.toLocaleString('ko-KR')}` };
        }
        return out;
      },
      purchase(id) {
        const p = PRODUCT_BY_ID[id];
        if (!p) return Promise.resolve({ ok: false, error: 'unknown product' });
        const key = id.replace(/\./g, '_');
        return overlay((done) =>
          h(
            'div',
            { class: 'mz-buy' },
            h('span', { class: 'mz-tag', text: t('monetize.mock.title') }),
            h('h3', { text: t(`monetize.product.${key}.name`) }),
            h('b', { class: 'mz-price', text: `₩${p.krw.toLocaleString('ko-KR')}` }),
            h('p', { class: 'mz-note', text: t('monetize.mock.note') }),
            h(
              'div',
              { class: 'row' },
              h('button', { class: 'btn ghost', type: 'button', onClick: () => done({ ok: false, cancelled: true }) }, t('monetize.mock.cancel')),
              h(
                'button',
                {
                  class: 'btn primary',
                  type: 'button',
                  onClick: () => {
                    const txId = `mock-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
                    let expiresAt;
                    if (p.type === 'subscription') expiresAt = Date.now() + (p.give.season || 30) * 86400000;
                    if (p.type !== 'consumable') {
                      const owned = loadOwned().filter((x) => x.id !== id);
                      owned.push({ id, expiresAt });
                      saveOwned(owned);
                    }
                    done({ ok: true, txId, expiresAt });
                  },
                },
                t('monetize.mock.buy'),
              ),
            ),
          ),
        );
      },
      async restore() {
        return loadOwned();
      },
    },
    consent: { required: () => false, showOptions: async () => {} },
  };
}
