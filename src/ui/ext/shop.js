// 상점·한정 제안·시즌 패스·프리패스·꾸미기 옷장 화면.
//   · 계기판의 연구비 캡슐이 상점 버튼이 된다(작은 수레 표시 + 한정 제안 남은 시간 딱지 + 시즌 상자 점).
//   · 상점 창: 추천(한정 제안·시즌 패스·프리패스) / 연구비 / 꾸미기, 아래에 구매 복원과 접는 결제 안내.
//   · 시즌 패스 화면, 한정 제안 창(제안마다 한 번, 플레이가 잠잠할 때만), 구매 완료 화면.
// 결제는 ui.monetize(src/monetize/service.js), 규칙과 지급은 game.fx.monetize(src/features/monetize)가 맡는다.
// 상점이나 그 안의 창이 떠 있는 동안에는 세계를 멈춘다(구경하다가 들키는 일이 없게).
//
// 다른 화면에서 열기:  import { openShop, openSeasonPass } from './shop.js';
//   openShop(ui)            추천 탭
//   openShop(ui, 'grant')   연구비 탭 · 'style' 꾸미기 탭
//   openSeasonPass(ui)      시즌 패스 화면
//   restorePurchases(ui)    구매 복원(설정 화면용)
import './shopStrings.js';
import { POLICY_LINKS } from '../../monetize/links.js';
import { FORMS } from '../../data/content.js';
import { formatInt } from '../../core/format.js';
import { t, tList, formatDuration } from '../../i18n/index.js';
import { iconURL } from '../../render/iconcache.js';
import { h, icon, img, grantTag } from '../dom.js';
import { addIcons } from '../icons.js';
import { registerHud, registerBind } from '../hooks.js';
import { PRODUCT_BY_ID, COSMETIC_KINDS, COSMETIC_BY_KEY, DEFAULT_LOOK, SEASON, cosmeticKey } from '../../features/monetize/catalog.js';

addIcons({
  cart: '<path d="M2.8 4.5h2.6l2.2 9.7a1.7 1.7 0 0 0 1.7 1.3h7.6a1.7 1.7 0 0 0 1.6-1.2L20.6 8H6.4"/><circle cx="9.7" cy="19.4" r="1.5"/><circle cx="17" cy="19.4" r="1.5"/>',
  clock: '<circle cx="12" cy="13" r="7.8"/><path d="M12 8.6V13l2.9 1.9M9.5 2.8h5"/>',
  shirt: '<path d="M8.6 4 4 6.6l1.9 4.1 2.1-1V20h8V9.7l2.1 1L20 6.6 15.4 4c-.5 1.5-1.8 2.4-3.4 2.4S9.1 5.5 8.6 4z"/>',
  roller: '<rect x="3.5" y="4" width="13.5" height="5.6" rx="1.8"/><path d="M17 6.8h2.6v4.6H12v2.8"/><rect x="10.3" y="14.2" width="3.4" height="6.3" rx="1.2"/>',
  beamcone: '<ellipse cx="12" cy="5" rx="4.2" ry="1.9"/><path d="M7.8 5.4 4 19.5h16L16.2 5.4"/><path d="M8.8 13h6.4"/>',
  restore: '<path d="M4.6 12.5A7.5 7.5 0 1 0 7 6.6"/><path d="M4.4 3.8v4.4h4.4"/>',
  shelf: '<path d="M4 6.5h16M4 13h16M4 19.5h16M6 6.5v13M18 6.5v13"/><rect x="8.5" y="8.5" width="3.5" height="4.5" rx="1"/>',
  gift: '<rect x="4" y="9" width="16" height="11" rx="2"/><path d="M3 9h18v3H3zM12 9v11M12 9c-1.5-3.5-5.5-4-5.5-1.5S10 9 12 9zM12 9c1.5-3.5 5.5-4 5.5-1.5S14 9 12 9z"/>',
  crown: '<path d="M4 17.5 3 8l5 4 4-6.5 4 6.5 5-4-1 9.5H4z"/><path d="M4.5 20.5h15"/>',
});

/** 이용약관·개인정보처리방침 주소. 앱 출시 전에 채운다(비어 있으면 설정 화면을 안내). */
// 이용약관·개인정보처리방침 주소는 src/monetize/links.js 한 곳에서 정한다(설정 화면과 같은 값)
export const LEGAL_LINKS = POLICY_LINKS;

const SECTIONS = ['featured', 'grant', 'style'];
const GRANT_PACKS = ['shh.grant.s', 'shh.grant.m', 'shh.grant.l', 'shh.grant.xl'];
const KIND_ICON = { outfit: 'shirt', paint: 'roller', beam: 'beamcone' };
const SOURCE_LABEL = { season: 'fromSeason', starter: 'fromStarter', ladder: 'fromLadder', freepass: 'fromFreepass' };
const CALM_SECONDS = 2.5; // 한정 제안 창: 이만큼 잠잠해야 띄운다
const POPUP_GAP_MS = 90 * 1000; // 한정 제안 창 사이 최소 간격

const S = (k, p) => t(`shop.${k}`, p);
const fxOf = (ui) => ui.game.fx?.monetize || null;
const pkey = (id) => id.replace(/\./g, '_');
const productName = (id) => t(`monetize.product.${pkey(id)}.name`);
const cosName = (kind, id) => t(`monetize.cosmetic.${kind}.${id}`);
const priceOf = (ui, id) => ui.monetize?.price(id) || '';
const reduced = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** 남은 시간 '47:59:12' / '9:05'. */
function clock(sec) {
  const s = Math.max(0, Math.ceil(sec));
  const hh = Math.floor(s / 3600);
  const mm = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  const p = (n) => String(n).padStart(2, '0');
  return hh > 0 ? `${hh}:${p(mm)}:${p(ss)}` : `${mm}:${p(ss)}`;
}

/** 지금 살 수 있는 한정 제안(곧 끝나는 것부터). */
function activeOffers(fx) {
  return [fx.starterOffer(), fx.formOffer()].filter((o) => o && fx.canBuy(o.id)).sort((a, b) => a.until - b.until);
}
const offerKey = (o) => `${o.id}:${o.form ?? ''}`;

// ───────── 화면별 상태 ─────────

const ctls = new WeakMap();
function ctl(ui) {
  let c = ctls.get(ui);
  if (!c) {
    c = { hold: 0, prevBusy: false, buying: false, queue: [], thanks: [], shown: new Set(), calmT: 0, lastPopup: -Infinity, shop: null, season: null, popup: null, hud: null, legalOpen: false };
    ctls.set(ui, c);
  }
  return c;
}

/** 상점 창들이 떠 있는 동안 세계를 멈춘다. 돌려받은 함수를 부르면 푼다(여러 창이 겹쳐도 마지막 창이 닫힐 때 푼다). */
function hold(ui) {
  const c = ctl(ui);
  const g = ui.game;
  if (c.hold++ === 0) {
    c.prevBusy = g.busy;
    g.busy = true;
  }
  let done = false;
  return () => {
    if (done) return;
    done = true;
    c.hold = Math.max(0, c.hold - 1);
    if (c.hold === 0 && g.phase === 'play') g.busy = c.prevBusy;
  };
}

/**
 * 창을 연다. 층마다 쌓임 맥락을 따로 만들어, 아래 창의 머리띠(z-index)가 위 창의 어두운 막 위로 비치지 않게 한다.
 */
function openModal(ui, content, opts) {
  const entry = ui.modals.open(content, opts);
  if (entry?.layer) entry.layer.style.isolation = 'isolate';
  return entry;
}

/**
 * 짧은 알림. 게임 알림(ui.toast)은 창 아래에 깔리므로, 창이 떠 있으면 맨 위 창 안에 띄운다.
 * @param {'info'|'good'|'warn'|'grant'} [kind]
 */
function flash(ui, text, kind = 'info', extra = null) {
  const top = ui.modals.stack?.[ui.modals.stack.length - 1];
  if (!top?.layer) {
    ui.toast(text, kind, extra);
    return;
  }
  top.layer.querySelector('.sh-flash')?.remove();
  const el = h('div', { class: `sh-flash ${kind}`, role: 'status' }, h('span', { text }), extra);
  top.layer.append(el);
  setTimeout(() => el.remove(), 2600);
}

/** 창 머리띠(제목 + 닫기). */
function head(title, onClose, autofocus = false) {
  return h(
    'header',
    { class: 'modal-head' },
    h('h2', { text: title }),
    h('button', { class: 'icon-btn', type: 'button', 'aria-label': t('common.close'), 'data-autofocus': autofocus || null, onClick: onClose }, icon('close', 20)),
  );
}

/** 3D 아이콘이 아직 비어 있으면(꾸미기 촬영기가 오기 전) 색 견본으로 대신 보여 준다. */
const blankMemo = new Map();
function watchBlank(src, wrap) {
  const known = blankMemo.get(src);
  if (known !== undefined) {
    wrap.classList.toggle('blank', known);
    return;
  }
  wrap.classList.add('blank');
  const probe = new Image();
  probe.onload = () => {
    let blank = true;
    try {
      const cv = document.createElement('canvas');
      cv.width = cv.height = 24;
      const cx = cv.getContext('2d');
      cx.drawImage(probe, 0, 0, 24, 24);
      const d = cx.getImageData(0, 0, 24, 24).data;
      for (let i = 3; i < d.length; i += 4) {
        if (d[i] > 8) {
          blank = false;
          break;
        }
      }
    } catch {
      blank = false;
    }
    blankMemo.set(src, blank);
    wrap.classList.toggle('blank', blank);
  };
  probe.src = src;
}

/** 꾸미기 그림: 3D 아이콘 + (비어 있을 때) 색 견본과 종류 아이콘. */
function cosPic(key, size, cls = '') {
  const [kind, id] = key.split(':');
  const src = iconURL('cosmetic', key, size);
  const wrap = h('span', { class: `sh-cpic ${cls}`.trim(), dataset: { k: key, kind }, 'aria-hidden': 'true' }, h('i', { class: 'sh-swatch' }, icon(KIND_ICON[kind] || 'star', Math.round(size * 0.42))), img(src, size));
  watchBlank(src, wrap);
  if (id === DEFAULT_LOOK[kind]) wrap.classList.add('default');
  return wrap;
}

/** 연구비 상자 그림(보석 1~4개). */
function gems(n, tier = n) {
  return h('span', { class: 'sh-gems', dataset: { n, tier }, 'aria-hidden': 'true' }, Array.from({ length: n }, () => icon('grant', 30)));
}

/** 상품 그림. */
function productArt(ui, id, size = 72) {
  const p = PRODUCT_BY_ID[id];
  const g = p?.give || {};
  if (id === 'shh.formpack') {
    const f = fxOf(ui)?.formOffer();
    return h('span', { class: 'sh-art form', 'aria-hidden': 'true' }, img(iconURL('form', f ? f.form : ui.game.formIndex, size), size));
  }
  if (GRANT_PACKS.includes(id)) return h('span', { class: 'sh-art grant', 'aria-hidden': 'true' }, gems(GRANT_PACKS.indexOf(id) + 1));
  if (g.cosmetics?.length) {
    const key = id === 'shh.season' ? 'outfit:star' : g.cosmetics[0];
    return h('span', { class: `sh-art cos ${id === 'shh.season' ? 'season' : id === 'shh.freepass' ? 'free' : id === 'shh.starter' ? 'starter' : ''}`.trim(), 'aria-hidden': 'true' }, cosPic(key, size));
  }
  return h('span', { class: 'sh-art', 'aria-hidden': 'true' }, icon('gift', Math.round(size * 0.5)));
}

/** 상품이 주는 것 목록(카드·한정 제안 창). */
function giveList(ui, id) {
  const fx = fxOf(ui);
  const pv = fx.preview(id);
  if (!pv) return null;
  const rows = [];
  if (pv.grant) rows.push(h('li', { class: 'sh-give grant' }, grantTag(formatInt(pv.grant)), h('span', { text: S('give.grant') })));
  if (pv.slot) rows.push(h('li', { class: 'sh-give' }, icon('shelf', 18), h('span', { text: S('give.slot', { n: pv.slot }) })));
  if (pv.boost) rows.push(h('li', { class: 'sh-give' }, icon('bolt', 18), h('span', { text: S('give.boost', { n: Math.round(pv.boost / 3600) }) })));
  for (const key of pv.cosmetics) {
    const [kind, cid] = key.split(':');
    rows.push(h('li', { class: 'sh-give cos' }, cosPic(key, 28, 'mini'), h('span', { text: S(`give.${kind}`, { name: cosName(kind, cid) }) })));
  }
  return h('ul', { class: 'sh-gives' }, rows);
}

// ───────── 결제 ─────────

function setBuying(ui, on, btn) {
  for (const b of ui.root?.querySelectorAll('.sh-buy') || []) {
    b.disabled = on;
    b.classList.toggle('loading', on && b === btn);
    if (b === btn) b.setAttribute('aria-busy', String(on));
  }
}

/** 상품을 산다: 결제 → 성공이면 구매 완료 화면, 취소면 조용히, 실패면 알림. */
async function purchase(ui, id, btn) {
  const c = ctl(ui);
  const m = ui.monetize;
  const fx = fxOf(ui);
  if (!m || !fx || c.buying || m.busy) return null;
  if (!fx.canBuy(id)) {
    ui.audio.sfx('deny');
    flash(ui, S('result.unavailable'), 'warn');
    return null;
  }
  c.buying = true;
  setBuying(ui, true, btn);
  ui.audio.sfx('click');
  let res;
  try {
    res = await m.buy(id);
  } catch (err) {
    console.warn('결제', err);
    res = { ok: false, reason: 'error' };
  }
  c.buying = false;
  setBuying(ui, false, btn);
  if (res?.ok) {
    ui.haptics.fire('good');
    showThanks(ui, id, res.result || {});
    c.shop?.refresh();
    return res;
  }
  if (res?.reason === 'cancelled' || res?.reason === 'busy') return res;
  ui.audio.sfx('deny');
  flash(ui, S(res?.reason === 'unavailable' ? 'result.unavailable' : 'result.error'), 'warn');
  return res;
}

/** 가격 버튼. */
function buyButton(ui, id, { cls = '', label, onDone } = {}) {
  const b = h(
    'button',
    {
      class: `btn sh-buy ${cls}`.trim(),
      type: 'button',
      dataset: { product: id, fk: `buy:${id}` },
      onClick: async () => {
        if (b.disabled) return;
        const res = await purchase(ui, id, b);
        onDone?.(res);
      },
    },
    h('span', { class: 'sh-buy-label', text: label ?? priceOf(ui, id) }),
    h('i', { class: 'sh-spin', 'aria-hidden': 'true' }),
  );
  if (ctl(ui).buying) b.disabled = true;
  return b;
}

/** 구매 복원(상점 아래·설정 화면에서 부른다). */
export async function restorePurchases(ui, btn = null) {
  const m = ui.monetize;
  if (!m || btn?.disabled) return null;
  const label = btn?.querySelector('span');
  if (btn) {
    btn.disabled = true;
    if (label) label.textContent = S('restore.busy');
  }
  let res;
  try {
    res = await m.restore();
  } catch {
    res = { ok: false };
  }
  if (btn) {
    btn.disabled = false;
    if (label) label.textContent = S('restore.btn');
  }
  if (!res?.ok) flash(ui, S('restore.fail'), 'warn');
  else if (!res.restored?.length) flash(ui, S('restore.none'), 'info');
  else {
    ui.audio.sfx('success');
    flash(ui, S('restore.done', { n: res.restored.length }), 'good');
  }
  ui.save();
  return res;
}

function openLegal(ui, which) {
  const url = LEGAL_LINKS[which];
  if (url) window.open(url, '_blank', 'noopener');
  else flash(ui, S('legal.soon'), 'info');
}

/** 이용약관 · 개인정보처리방침(· 광고 개인정보 설정) 줄. */
function legalLinks(ui) {
  const links = [
    h('button', { class: 'link-btn', type: 'button', onClick: () => openLegal(ui, 'terms') }, S('legal.terms')),
    h('button', { class: 'link-btn', type: 'button', onClick: () => openLegal(ui, 'privacy') }, S('legal.privacy')),
  ];
  if (ui.monetize?.privacyOptionsRequired) {
    links.push(h('button', { class: 'link-btn', type: 'button', onClick: () => ui.monetize.showPrivacyOptions() }, S('legal.adPrivacy')));
  }
  return h('div', { class: 'sh-links' }, links);
}

/** 접는 결제 안내. */
function legalFold(ui) {
  const c = ctl(ui);
  const fold = h(
    'details',
    { class: 'fold sh-legal', open: c.legalOpen || null },
    h('summary', null, icon('doc', 18), S('legal.title')),
    h('ul', { class: 'sh-legal-list' }, tList('shop.legal.lines').map((line) => h('li', { text: line }))),
    legalLinks(ui),
  );
  fold.addEventListener('toggle', () => {
    c.legalOpen = fold.open;
  });
  return fold;
}

// ───────── 상점 창 ─────────

/**
 * 상점을 연다. 이미 열려 있으면 그 탭으로 바꾼다.
 * @param {import('../ui.js').UI} ui
 * @param {'featured'|'grant'|'style'} [section]
 * @returns {object|null} 모달 항목(entry) 또는 열 수 없으면 null
 */
export function openShop(ui, section = 'featured') {
  const fx = fxOf(ui);
  if (!fx || !ui.started || ui.titleCb) return null;
  const c = ctl(ui);
  if (!SECTIONS.includes(section)) section = 'featured';
  if (c.shop) {
    c.shop.go(section);
    return c.shop.entry;
  }
  // 계기판에서 열 때는 관측 중일 때만(다른 창 안에서 부르는 것은 허용)
  if (!ui.modals.active && (ui.transitioning || ui.game.phase !== 'play' || ui.game.busy)) return null;

  const release = hold(ui);
  let current = section;
  const tabs = SECTIONS.map((id) =>
    h('button', { class: 'seg', type: 'button', 'aria-pressed': String(id === current), 'data-autofocus': id === current || null, dataset: { sec: id }, onClick: () => go(id) }, S(`tabs.${id}`)),
  );
  const body = h('div', { class: 'sh-body' });
  const root = h(
    'div',
    { class: 'shop' },
    head(S('title'), () => entry.close()),
    h('div', { class: 'segment sh-tabs', role: 'group', 'aria-label': S('title') }, tabs),
    body,
  );

  function sectionNodes() {
    if (current === 'grant') return grantSection(ui);
    if (current === 'style') return styleSection(ui, { go });
    return featuredSection(ui, { go });
  }

  function render(keepScroll = true) {
    const top = body.scrollTop;
    const fk = document.activeElement && body.contains(document.activeElement) ? document.activeElement.dataset?.fk : null;
    body.replaceChildren(...sectionNodes().filter(Boolean), footer());
    body.dataset.sec = current;
    if (keepScroll) body.scrollTop = top;
    if (fk) body.querySelector(`[data-fk="${CSS.escape(fk)}"]`)?.focus({ preventScroll: true });
  }

  let raf = 0;
  const refresh = () => {
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      if (!c.buying) render();
    });
  };

  function go(id, focusSel) {
    if (!SECTIONS.includes(id)) return;
    const changed = id !== current;
    current = id;
    for (const b of tabs) b.setAttribute('aria-pressed', String(b.dataset.sec === id));
    render(!changed);
    if (changed) body.scrollTop = 0;
    if (focusSel) body.querySelector(focusSel)?.scrollIntoView({ block: 'center', behavior: reduced() ? 'auto' : 'smooth' });
    if (changed) ui.audio.sfx('click');
  }

  function footer() {
    const restoreBtn = h('button', { class: 'btn ghost sh-restore', type: 'button', onClick: () => restorePurchases(ui, restoreBtn) }, icon('restore', 18), h('span', { text: S('restore.btn') }));
    return h('div', { class: 'sh-foot' }, restoreBtn, legalFold(ui));
  }

  // 남은 시간 글자는 1초마다 고친다. 제안이 끝났으면 다시 그린다.
  const tick = setInterval(() => {
    const now = ui.game.now();
    let ended = false;
    for (const el of root.querySelectorAll('[data-until]')) {
      const left = (Number(el.dataset.until) - now) / 1000;
      if (left <= 0) ended = true;
      el.textContent = S('offer.left', { t: clock(left) });
    }
    if (ended) refresh();
  }, 1000);
  const offs = [ui.game.on('monetize:change', refresh), ui.monetize?.on('prices', refresh), ui.monetize?.on('restored', refresh)];

  const entry = openModal(ui, root, {
    cls: 'modal-shop',
    label: S('title'),
    onClose: () => {
      clearInterval(tick);
      if (raf) cancelAnimationFrame(raf);
      for (const off of offs) off?.();
      c.shop = null;
      release();
    },
  });
  c.shop = { entry, go, refresh };
  render(false);
  ui.audio.sfx('open');
  return entry;
}

// ── 추천 ──

function timerChip(until, now) {
  return h('span', { class: 'sh-timer' }, icon('clock', 15), h('b', { dataset: { until }, text: S('offer.left', { t: clock((until - now) / 1000) }) }));
}

function offerWhy(o) {
  if (o.id === 'shh.formpack') return S('offer.formWhy', { name: t(`form.${FORMS[o.form]?.id}.name`) });
  return S('offer.starterWhy');
}

function offerCard(ui, o) {
  return h(
    'article',
    { class: 'sh-card sh-offer', dataset: { product: o.id } },
    h('div', { class: 'sh-band' }, h('span', { class: 'sh-ribbon', text: S('offer.kicker') }), timerChip(o.until, ui.game.now())),
    h('div', { class: 'sh-main' }, productArt(ui, o.id, 64), h('div', { class: 'sh-text' }, h('h3', { text: productName(o.id) }), h('p', { text: offerWhy(o) }))),
    giveList(ui, o.id),
    buyButton(ui, o.id, { cls: 'wide' }),
  );
}

function perkLine(iconName, text) {
  return h('li', null, icon(iconName, 16), h('span', { text }));
}

function seasonCard(ui) {
  const fx = fxOf(ui);
  const active = fx.seasonActive();
  const openPass = () => openSeasonPass(ui);
  let foot;
  if (active) {
    // 이용 중: 오늘의 상자(또는 받았다는 말)를 크게, 자세히는 가벼운 글자 버튼으로
    const days = Math.max(1, Math.ceil(fx.seasonLeft() / 86400));
    foot = [
      h('div', { class: 'sh-status' }, icon('check', 18), h('span', { text: S('season.active') }), h('b', { text: S('season.daysLeft', { n: days }) })),
      fx.seasonClaimable() ? claimButton(ui, 'wide') : h('p', { class: 'note sh-center', text: S('season.claimed') }),
      h('button', { class: 'link-btn sh-more-link', type: 'button', dataset: { fk: 'season-more' }, onClick: openPass }, S('season.more'), icon('arrow', 16)),
    ];
  } else {
    const more = h('button', { class: 'btn sh-more', type: 'button', dataset: { fk: 'season-more' }, onClick: openPass }, S('season.more'), icon('arrow', 18));
    foot = h('div', { class: 'sh-row sh-price-row' }, h('b', { class: 'sh-price', text: S('perMonth', { price: priceOf(ui, 'shh.season') }) }), more);
  }
  return h(
    'article',
    { class: `sh-card sh-season ${active ? 'on' : ''}`.trim() },
    h(
      'div',
      { class: 'sh-main' },
      productArt(ui, 'shh.season', 64),
      h('div', { class: 'sh-text' }, h('h3', null, h('span', { text: productName('shh.season') }), h('small', { class: 'sh-tag', text: S('season.tag') })), h('p', { text: S('season.lead') })),
    ),
    h('ul', { class: 'sh-perks' }, perkLine('bolt', S('season.perkGrowth')), perkLine('gift', S('season.perkDaily')), perkLine('crown', `${S('season.perkCape')} · ${S('season.perkBeam')}`)),
    foot,
  );
}

function freeCard(ui) {
  const fx = fxOf(ui);
  const owned = fx.hasFreePass();
  return h(
    'article',
    { class: `sh-card sh-free ${owned ? 'on' : ''}`.trim() },
    h(
      'div',
      { class: 'sh-main' },
      productArt(ui, 'shh.freepass', 64),
      h('div', { class: 'sh-text' }, h('h3', null, h('span', { text: productName('shh.freepass') }), h('small', { class: 'sh-tag', text: S('once') })), h('p', { text: S('free.lead') })),
    ),
    h('ul', { class: 'sh-perks' }, perkLine('check', S('free.line1')), perkLine('check', S('free.line2')), perkLine('gift', S('free.line3'))),
    owned ? h('div', { class: 'sh-status' }, icon('check', 18), h('span', { text: S('free.ownedNote') })) : fx.canBuy('shh.freepass') ? buyButton(ui, 'shh.freepass', { cls: 'wide' }) : null,
  );
}

function featuredSection(ui) {
  const fx = fxOf(ui);
  const c = ctl(ui);
  const out = [];
  for (const o of activeOffers(fx)) {
    // 상점에서 이미 본 제안은 창으로 다시 띄우지 않는다
    c.shown.add(offerKey(o));
    c.queue = c.queue.filter((q) => offerKey(q) !== offerKey(o));
    out.push(offerCard(ui, o));
  }
  out.push(seasonCard(ui), freeCard(ui));
  return out;
}

// ── 연구비 ──

/** 작은 상자 대비 원화당 연구비 보너스(%). 표에 적힌 값으로만 계산한다. */
function bonusOf(id) {
  const base = PRODUCT_BY_ID[GRANT_PACKS[0]];
  const p = PRODUCT_BY_ID[id];
  if (!p || !base || p === base) return 0;
  return Math.max(0, Math.round(((p.give.grant / p.krw) / (base.give.grant / base.krw) - 1) * 100));
}

function grantSection(ui) {
  const fx = fxOf(ui);
  return [
    h('p', { class: 'panel-hint sh-hint' }, icon('grant', 16), h('span', { text: S('grant.hint') })),
    h(
      'div',
      { class: 'sh-grants' },
      GRANT_PACKS.map((id, i) => {
        const bonus = bonusOf(id);
        return h(
          'article',
          { class: 'sh-grant', dataset: { tier: i + 1, product: id } },
          bonus > 0 ? h('span', { class: 'sh-bonus', text: S('grant.bonus', { n: bonus }) }) : h('span', { class: 'sh-bonus base', text: S('grant.base') }),
          h('span', { class: 'sh-art grant' }, gems(i + 1)),
          h('b', { class: 'sh-gname', text: productName(id) }),
          grantTag(formatInt(fx.preview(id).grant), 'sh-gamt'),
          buyButton(ui, id, { cls: 'wide' }),
        );
      }),
    ),
  ];
}

// ── 꾸미기 ──

function equipToggle(ui, c) {
  const fx = fxOf(ui);
  if (c.equipped) {
    if (c.id === DEFAULT_LOOK[c.kind]) return;
    fx.equip(c.kind, DEFAULT_LOOK[c.kind]);
    ui.audio.sfx('click');
  } else if (fx.equip(c.kind, c.id)) {
    ui.audio.sfx('buy');
    ui.haptics.fire('tap');
    flash(ui, S('style.equippedToast', { name: cosName(c.kind, c.id) }), 'good');
  }
  ui.save();
}

function cosTile(ui, c, go) {
  const fx = fxOf(ui);
  const name = cosName(c.kind, c.id);
  let state;
  let label;
  let extra = null;
  let onClick;
  if (c.owned) {
    state = c.equipped ? 'on' : 'own';
    label = S(c.equipped ? 'style.equipped' : 'style.equip');
    onClick = () => equipToggle(ui, c);
  } else if (c.source === 'shop') {
    const p = fx.productFor(c.kind, c.id);
    state = 'buy';
    label = p ? priceOf(ui, p.id) : '';
    onClick = (e) => p && purchase(ui, p.id, e.currentTarget);
  } else {
    state = 'lock';
    label = S(`style.${SOURCE_LABEL[c.source] || 'fromSeason'}`);
    if (c.source === 'season') onClick = () => openSeasonPass(ui);
    else if (c.source === 'freepass') onClick = () => go('featured', '.sh-free');
    else if (c.source === 'starter') {
      onClick = () => {
        if (fx.starterOffer()) go('featured', '.sh-offer[data-product="shh.starter"]');
        else flash(ui, S('style.starterHint'), 'info');
      };
    } else if (c.source === 'ladder') {
      const pc = fx.pieces();
      label = S('style.pieces', { a: pc.have, b: pc.need });
      extra = h('span', { class: 'sh-pbar' }, h('i', { style: { '--p': `${Math.min(100, (pc.have / pc.need) * 100).toFixed(0)}%` } }));
      onClick = () => flash(ui, S('style.ladderHint', { a: pc.have, b: pc.need }), 'info');
    }
  }
  const stateIcon = state === 'on' ? icon('check', 14) : state === 'lock' ? icon(c.source === 'ladder' ? 'star' : 'lock', 13) : null;
  const b = h(
    'button',
    {
      class: `sh-cos ${state === 'buy' ? 'sh-buy' : ''}`.trim(),
      type: 'button',
      dataset: { state, fk: `cos:${c.kind}:${c.id}` },
      'aria-pressed': c.owned ? String(!!c.equipped) : null,
      'aria-label': `${name} · ${label}`,
      onClick: (e) => onClick?.(e),
    },
    cosPic(cosmeticKey(c.kind, c.id), 56),
    h('b', { class: 'sh-cname', text: name }),
    h('span', { class: 'sh-cstate' }, stateIcon, h('span', { text: label }), state === 'buy' ? h('i', { class: 'sh-spin', 'aria-hidden': 'true' }) : null),
    extra,
  );
  if (state === 'buy' && ctl(ui).buying) b.disabled = true;
  return b;
}

function styleSection(ui, { go }) {
  const fx = fxOf(ui);
  const out = [h('p', { class: 'panel-hint sh-hint' }, icon('shirt', 16), h('span', { text: S('style.hint') }))];
  for (const kind of COSMETIC_KINDS) {
    out.push(
      h('h3', { class: 'sec sh-sec' }, icon(KIND_ICON[kind], 18), h('span', { text: t(`monetize.cosmetic.kind.${kind}`) })),
      h('div', { class: 'sh-cos-grid' }, fx.cosmetics(kind).map((c) => cosTile(ui, c, go))),
    );
  }
  return out;
}

// ───────── 시즌 패스 ─────────

function claimButton(ui, cls = '') {
  return h(
    'button',
    {
      class: `btn primary sh-claim ${cls}`.trim(),
      type: 'button',
      dataset: { fk: 'season-claim' },
      onClick: () => {
        const r = fxOf(ui).claimSeason();
        if (!r) return;
        ui.audio.sfx('coin');
        ui.haptics.fire('good');
        flash(ui, S('season.claimToast', { n: formatInt(r.grant) }), 'grant');
        ui.save();
      },
    },
    icon('gift', 18),
    S('season.claim'),
  );
}

/** 시즌 패스 화면: 혜택, 이용 중이면 남은 날과 오늘의 상자, 아니면 구독 버튼과 갱신·해지 안내. */
export function openSeasonPass(ui) {
  const fx = fxOf(ui);
  if (!fx || !ui.started) return null;
  const c = ctl(ui);
  if (c.season) return c.season;
  const release = hold(ui);
  const body = h('div', { class: 'sh-pass-body' });
  const root = h('div', { class: 'sh-pass' }, head(productName('shh.season'), () => entry.close(), true), body);

  function render() {
    const active = fx.seasonActive();
    const daily = ui.game.grantFor(fx.grantUnit() * SEASON.dailyGrantUnits, 'season');
    const perk = (iconName, tone, title, desc, pic) =>
      h('li', { class: `sh-perk ${tone}` }, pic || h('span', { class: 'sh-perk-ico' }, icon(iconName, 20)), h('div', null, h('b', { text: title }), h('small', { text: desc })));
    const nodes = [
      h(
        'div',
        { class: 'sh-pass-hero' },
        h('span', { class: 'sh-pass-stars', 'aria-hidden': 'true' }),
        cosPic('outfit:star', 96, 'hero'),
        cosPic('beam:gold', 48, 'hero-beam'),
        h('div', { class: 'sh-pass-lead' }, h('small', { class: 'sh-tag', text: S('season.tag') }), h('p', { text: S('season.lead') })),
      ),
      h(
        'ul',
        { class: 'sh-perk-list' },
        perk('bolt', 'growth', S('season.perkGrowth'), S('season.perkGrowthDesc')),
        perk('gift', 'daily', S('season.perkDaily'), S('season.perkDailyDesc', { n: formatInt(daily) })),
        perk('shirt', 'cape', S('season.perkCape'), S('season.perkCapeDesc'), cosPic('outfit:star', 36, 'perk')),
        perk('beamcone', 'beam', S('season.perkBeam'), S('season.perkBeamDesc'), cosPic('beam:gold', 36, 'perk')),
      ),
    ];
    if (active) {
      const days = Math.max(1, Math.ceil(fx.seasonLeft() / 86400));
      nodes.push(
        h('div', { class: 'sh-status big' }, icon('check', 20), h('span', { text: S('season.active') }), h('b', { text: S('season.daysLeft', { n: days }) })),
        fx.seasonClaimable() ? claimButton(ui, 'wide') : h('p', { class: 'note sh-center', text: S('season.claimed') }),
        h('p', { class: 'sh-fine', text: S('season.manage') }),
      );
    } else {
      const price = priceOf(ui, 'shh.season');
      nodes.push(
        h('div', { class: 'sh-pass-price' }, h('b', { class: 'sh-price big', text: price }), h('span', { text: S('month') })),
        fx.canBuy('shh.season') ? buyButton(ui, 'shh.season', { cls: 'primary wide', label: S('season.subscribe', { price }) }) : null,
        h('p', { class: 'sh-fine', text: S('season.renew') }),
        h('p', { class: 'sh-fine', text: S('season.manage') }),
      );
    }
    nodes.push(legalLinks(ui));
    body.replaceChildren(...nodes.filter(Boolean));
  }

  let raf = 0;
  const refresh = () => {
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      if (!c.buying) render();
    });
  };
  const offs = [ui.game.on('monetize:change', refresh), ui.monetize?.on('prices', refresh)];
  render();
  const entry = openModal(ui, root, {
    cls: 'modal-season',
    label: productName('shh.season'),
    onClose: () => {
      if (raf) cancelAnimationFrame(raf);
      for (const off of offs) off?.();
      c.season = null;
      release();
    },
  });
  c.season = entry;
  ui.audio.sfx('open');
  return entry;
}

// ───────── 한정 제안 창 ─────────

function enqueueOffer(ui, o) {
  const c = ctl(ui);
  if (!o?.id) return;
  const key = offerKey(o);
  if (c.shown.has(key) || c.queue.some((q) => offerKey(q) === key)) return;
  c.queue.push({ id: o.id, form: o.form });
}

/** 플레이가 잠잠한지: 들킴·임무·미니게임·창·패널·시선 경고·안내 카드가 없을 때. */
function isCalm(ui) {
  const g = ui.game;
  return (
    ui.started &&
    !ui.titleCb &&
    g.phase === 'play' &&
    !g.busy &&
    !ui.transitioning &&
    !ui.modals.active &&
    !ui.panel &&
    !ui.minigame &&
    ui.gaze?.hidden !== false &&
    ui.coach?.hidden !== false &&
    !ui.monetize?.busy &&
    !ui.root?.querySelector('.prog-arrive, .prog-pop') &&
    !ui.stage?.querySelector('.mz-overlay')
  );
}

function pumpOffers(ui, dt) {
  const c = ctl(ui);
  const fx = fxOf(ui);
  if ((!c.queue.length && !c.thanks.length) || !isCalm(ui)) {
    c.calmT = 0;
    return;
  }
  c.calmT += dt;
  // 상점 밖에서 끝난 결제(승인 대기였던 결제 등)는 잠잠해지면 바로 알려 준다
  if (c.thanks.length && c.calmT >= 0.6) {
    const r = c.thanks.shift();
    c.calmT = 0;
    showThanks(ui, r.id, r);
    return;
  }
  if (c.calmT < CALM_SECONDS || performance.now() - c.lastPopup < POPUP_GAP_MS) return;
  c.calmT = 0;
  const next = c.queue.shift();
  const live = activeOffers(fx).find((o) => offerKey(o) === offerKey(next));
  if (!live || c.shown.has(offerKey(live))) return;
  c.shown.add(offerKey(live));
  c.lastPopup = performance.now();
  showOffer(ui, live);
}

/** 한정 제안 창(닫기 쉽게: 바깥·Esc·X·나중에). */
export function showOffer(ui, o) {
  const fx = fxOf(ui);
  if (!fx || !o) return null;
  const c = ctl(ui);
  const release = hold(ui);
  const name = productName(o.id);
  const price = priceOf(ui, o.id);
  const body = h(
    'div',
    { class: 'sh-pop' },
    h(
      'div',
      { class: 'sh-pop-top' },
      h('span', { class: 'sh-ribbon', text: S('offer.kicker') }),
      timerChip(o.until, ui.game.now()),
      h('button', { class: 'icon-btn sh-pop-x', type: 'button', 'aria-label': t('common.close'), onClick: () => entry.close() }, icon('close', 18)),
    ),
    h('div', { class: 'sh-pop-art' }, h('i', { class: 'sh-rays', 'aria-hidden': 'true' }), productArt(ui, o.id, 104)),
    h('h2', { text: name }),
    h('p', { class: 'sh-why', text: offerWhy(o) }),
    giveList(ui, o.id),
    buyButton(ui, o.id, {
      cls: 'primary wide',
      label: S('buyAt', { price }),
      onDone: (res) => {
        if (res?.ok) entry.close();
      },
    }),
    h('button', { class: 'link-btn sh-later', type: 'button', 'data-autofocus': '', onClick: () => entry.close() }, S('offer.later')),
    h('p', { class: 'sh-fine sh-center', text: S('offer.note') }),
  );
  const tick = setInterval(() => {
    const now = ui.game.now();
    for (const el of body.querySelectorAll('[data-until]')) {
      const left = (Number(el.dataset.until) - now) / 1000;
      el.textContent = S('offer.left', { t: clock(left) });
      if (left <= 0) entry.close();
    }
  }, 1000);
  const entry = openModal(ui, body, {
    cls: 'modal-offer',
    label: name,
    onClose: () => {
      clearInterval(tick);
      c.popup = null;
      release();
    },
  });
  c.popup = entry;
  ui.audio.sfx('open');
  return entry;
}

// ───────── 구매 완료 ─────────

function countUp(el, to, ms = 900) {
  if (reduced()) {
    el.textContent = `+${formatInt(to)}`;
    return;
  }
  el.textContent = '+0';
  const start = performance.now() + 260;
  const step = (now) => {
    if (!el.isConnected) return;
    const k = Math.min(1, Math.max(0, (now - start) / ms));
    el.textContent = `+${formatInt(to * (1 - Math.pow(1 - k, 3)))}`;
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

const CONFETTI = ['#ffcf26', '#2563eb', '#d42a40', '#16a75a', '#6d3fe0', '#3fe0ff', '#ff8a3d'];
function confetti(n = 22) {
  return h(
    'div',
    { class: 'sh-confetti', 'aria-hidden': 'true' },
    Array.from({ length: n }, (_, i) => {
      const a = (i / n) * Math.PI * 2 + Math.random() * 0.4;
      const r = 70 + Math.random() * 90;
      return h('i', {
        style: {
          '--x': `${Math.cos(a) * r}px`,
          '--y': `${Math.sin(a) * r * 0.75 - 30}px`,
          '--r': `${Math.round(Math.random() * 540 - 270)}deg`,
          '--d': `${Math.round(Math.random() * 120)}ms`,
          '--c': CONFETTI[i % CONFETTI.length],
        },
      });
    }),
  );
}

function thanksRow(iconName, text) {
  return h('li', { class: 'sh-th-row' }, h('span', { class: 'sh-th-ico' }, icon(iconName, 18)), h('span', { text }));
}

function cosRow(ui, key) {
  const fx = fxOf(ui);
  const [kind, id] = key.split(':');
  const name = cosName(kind, id);
  const equipBtn = h(
    'button',
    {
      class: 'btn ghost sh-equip',
      type: 'button',
      onClick: () => {
        if (!fx.equip(kind, id)) return;
        ui.audio.sfx('buy');
        ui.haptics.fire('tap');
        equipBtn.disabled = true;
        equipBtn.className = 'btn sh-equip done';
        equipBtn.replaceChildren(icon('check', 16), S('thanks.equipped'));
        ui.save();
      },
    },
    S('thanks.equip'),
  );
  if (fx.look()[kind] === id) {
    equipBtn.disabled = true;
    equipBtn.className = 'btn sh-equip done';
    equipBtn.replaceChildren(icon('check', 16), S('thanks.equipped'));
  }
  return h('li', { class: 'sh-th-cos' }, cosPic(key, 48), h('div', null, h('b', { text: name }), h('small', { text: t(`monetize.cosmetic.kind.${kind}`) })), equipBtn);
}

/** 구매 완료: 받은 것 요약(연구비 숫자가 차오르고 동전이 계기판으로 날아간다), 새 꾸미기는 바로 장착. */
export function showThanks(ui, id, r = {}) {
  const fx = fxOf(ui);
  const p = PRODUCT_BY_ID[id];
  if (!fx || !p) return null;
  const g = p.give;
  const release = hold(ui);
  let amount = null;
  if (r.grant) {
    amount = grantTag('+0', 'big sh-th-amount');
    countUp(amount.querySelector('b'), r.grant);
  }
  const rows = [];
  if (r.boostUntil) rows.push(thanksRow('bolt', S('thanks.boost', { t: formatDuration(fx.boostLeft()) })));
  if (g.slot) rows.push(thanksRow('shelf', r.slot ? S('thanks.slot', { n: r.slot }) : S('thanks.slotFull')));
  if (g.freePass) rows.push(thanksRow('gift', S('thanks.freePass')));
  if (g.season) rows.push(thanksRow('star', S('thanks.season')));
  const cos = (r.cosmetics || []).filter((k) => COSMETIC_BY_KEY[k]).map((k) => cosRow(ui, k));
  const body = h(
    'div',
    { class: 'sh-thanks' },
    confetti(),
    h('span', { class: 'kicker good', text: S('thanks.kicker') }),
    h('div', { class: 'sh-th-art' }, h('i', { class: 'sh-rays', 'aria-hidden': 'true' }), productArt(ui, id, 88)),
    h('h2', { text: productName(id) }),
    h('p', { class: 'sh-th-body', text: S('thanks.body') }),
    amount && h('div', { class: 'sh-th-grant' }, amount),
    rows.length ? h('ul', { class: 'sh-th-list' }, rows) : null,
    cos.length ? h('ul', { class: 'sh-th-coslist' }, cos) : null,
    h('button', { class: 'btn primary wide', type: 'button', 'data-autofocus': '', onClick: () => entry.close() }, S('thanks.ok')),
  );
  const entry = openModal(ui, body, { cls: 'modal-thanks', label: S('thanks.kicker'), onClose: release });
  ui.audio.sfx('achievement');
  return entry;
}

// ───────── 계기판: 연구비 캡슐 = 상점 버튼 ─────────

function onPill(ui) {
  if (!ui.started || ui.modals.active) return;
  if (ui.transitioning || ui.game.busy || ui.game.phase !== 'play') {
    ui.audio.sfx('deny');
    return;
  }
  openShop(ui);
}

registerHud({
  id: 'shop',
  order: 85,
  mount(ui, host) {
    const c = ctl(ui);
    c.hud = null;
    if (!fxOf(ui) || !ui.monetize) return;
    const hud = host.parentElement || ui.hud;
    const old = hud?.querySelector('.grant-pill');
    if (!old) return;
    // 캡슐 안의 .ico 는 연구비 메달 모양을 입으므로, 수레·시계는 따로 이름을 붙인다
    const glyph = (name, size) => {
      const el = icon(name, size);
      el.className = 'sh-ico';
      return el;
    };
    const dot = h('i', { class: 'sh-dot', hidden: '' });
    const cart = h('span', { class: 'sh-cart', 'aria-hidden': 'true' }, glyph('cart', 17), dot);
    const timerText = h('span');
    const timer = h('span', { class: 'sh-hud-timer', 'aria-hidden': 'true', hidden: '' }, glyph('clock', 11), timerText);
    // 원래 캡슐(연구비 아이콘·숫자)을 진짜 버튼으로 바꾼다. 숫자 요소(ui.grantText)는 그대로 옮긴다.
    const btn = h('button', { class: `${old.className} sh-pill`, type: 'button', 'aria-label': S('hudLabel', { n: formatInt(ui.game.state.grant) }), onClick: () => onPill(ui) });
    while (old.firstChild) btn.append(old.firstChild);
    btn.append(cart, timer);
    old.replaceWith(btn);
    c.hud = { btn, dot, timer, timerText, t: 0, label: '' };
  },
  update(ui, dt) {
    const c = ctl(ui);
    const fx = fxOf(ui);
    if (!fx) return;
    pumpOffers(ui, dt);
    const hud = c.hud;
    if (!hud) return;
    hud.t -= dt;
    if (hud.t > 0) return;
    hud.t = 0.25;
    const soon = activeOffers(fx)[0];
    if (soon) {
      const txt = clock((soon.until - ui.game.now()) / 1000);
      if (hud.timerText.textContent !== txt) hud.timerText.textContent = txt;
    }
    if (hud.timer.hidden === !!soon) hud.timer.hidden = !soon;
    const claim = fx.seasonClaimable();
    if (hud.dot.hidden === claim) hud.dot.hidden = !claim;
    const label = `${S('hudLabel', { n: formatInt(ui.game.state.grant) })}${soon ? ` · ${S('hudOffer')}` : ''}`;
    if (label !== hud.label) {
      hud.label = label;
      hud.btn.setAttribute('aria-label', label);
    }
  },
});

registerBind({
  id: 'shop',
  order: 70,
  bind(ui) {
    const { game } = ui;
    if (!fxOf(ui)) return;
    game.on('monetize:offer', (o) => enqueueOffer(ui, o));
    // 상점 흐름 밖에서 지급된 구매(승인 대기 뒤 완료 등): 구매 완료 화면을 띄운다(창이 떠 있으면 그 위에 바로)
    game.on('monetize:purchase', (r) => {
      const c = ctl(ui);
      if (c.buying || !r?.id || !PRODUCT_BY_ID[r.id]) return;
      if (c.shop || c.season || c.popup) showThanks(ui, r.id, r);
      else c.thanks.push(r);
    });
    game.on('replaced', () => {
      const c = ctl(ui);
      c.queue = [];
      c.calmT = 0;
    });
  },
});
