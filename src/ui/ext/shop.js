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
import { FORMS, ACHIEVEMENTS } from '../../data/content.js';
import { formatInt } from '../../core/format.js';
import { t, tList, formatDuration } from '../../i18n/index.js';
import { iconURL } from '../../render/iconcache.js';
import { h, icon, img, grantTag } from '../dom.js';
import { addIcons } from '../icons.js';
import { registerHud, registerBind } from '../hooks.js';
import { PRODUCT_BY_ID, COSMETIC_KINDS, COSMETIC_BY_KEY, DEFAULT_LOOK, SEASON, SETS, cosmeticKey } from '../../features/monetize/catalog.js';

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
  bow: '<path d="M12 12 4.2 7.4c-.9-.5-2 .1-2 1.1v7c0 1 1.1 1.6 2 1.1L12 12l7.8 4.6c.9.5 2-.1 2-1.1v-7c0-1-1.1-1.6-2-1.1L12 12z"/><circle cx="12" cy="12" r="2.2"/>',
  sets: '<rect x="3.5" y="9" width="11" height="11" rx="2.4"/><path d="M8 9V6.4A2.4 2.4 0 0 1 10.4 4h7.2A2.4 2.4 0 0 1 20 6.4v7.2a2.4 2.4 0 0 1-2.4 2.4H14.5"/>',
  trophy: '<path d="M7.5 4h9v5a4.5 4.5 0 0 1-9 0V4z"/><path d="M7.5 6H4.5v1.5A3 3 0 0 0 7.6 10.4M16.5 6h3v1.5a3 3 0 0 1-3.1 2.9M12 13.5v3.5M8.5 20h7l-1-3h-5z"/>',
  eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>',
});

/** 이용약관·개인정보처리방침 주소. 앱 출시 전에 채운다(비어 있으면 설정 화면을 안내). */
// 이용약관·개인정보처리방침 주소는 src/monetize/links.js 한 곳에서 정한다(설정 화면과 같은 값)
export const LEGAL_LINKS = POLICY_LINKS;

const SECTIONS = ['featured', 'grant', 'style'];
const GRANT_PACKS = ['shh.grant.s', 'shh.grant.m', 'shh.grant.l', 'shh.grant.xl'];
const KIND_ICON = { outfit: 'shirt', paint: 'roller', beam: 'beamcone', deco: 'bow', look: 'sets' };
const SOURCE_LABEL = { season: 'fromSeason', starter: 'fromStarter', ladder: 'fromLadder', freepass: 'fromFreepass', achievement: 'fromAch', set: 'inSet' };
const STYLE_TABS = ['sets', ...COSMETIC_KINDS];
const CALM_SECONDS = 2.5; // 한정 제안 창: 이만큼 잠잠해야 띄운다
const POPUP_GAP_MS = 90 * 1000; // 한정 제안 창 사이 최소 간격

const S = (k, p) => t(`shop.${k}`, p);
const fxOf = (ui) => ui.game.fx?.monetize || null;
const pkey = (id) => id.replace(/\./g, '_');
const productName = (id) => t(`monetize.product.${pkey(id)}.name`);
const cosName = (kind, id) => t(`monetize.cosmetic.${kind}.${id}`);
const setName = (id) => t(`monetize.cosmetic.set.${id}`);

/** 모습 묶음 → 촬영기 키('look:outfit=..;paint=..;beam=..;deco=..;form=2'). beamOn = 빔을 켠 모습. */
function lookKey(look, form = 2, beamOn = false) {
  const parts = COSMETIC_KINDS.map((k) => `${k}=${look[k] ?? DEFAULT_LOOK[k]}`);
  parts.push(`form=${form}`);
  if (beamOn) parts.push('beamOn=1');
  return `look:${parts.join(';')}`;
}
/** 세트를 모두 갖춘 모습. */
function setLook(set) {
  const look = { ...DEFAULT_LOOK };
  for (const key of set.items.map((x) => (typeof x === 'string' ? x : x.key))) {
    const [kind, id] = key.split(':');
    look[kind] = id;
  }
  return look;
}
/** 업적 진행(지금 값, 목표). */
function achProgress(ui, id) {
  const a = ACHIEVEMENTS.find((x) => x.id === id);
  if (!a) return null;
  let v = 0;
  try {
    v = Number(a.stat(ui.game.state)) || 0;
  } catch {
    v = 0;
  }
  return { have: Math.min(v, a.goal), need: a.goal, done: !!ui.game.state.ach?.[id] };
}
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
    c = { hold: 0, prevBusy: false, buying: false, queue: [], thanks: [], shown: new Set(), calmT: 0, lastPopup: -Infinity, shop: null, season: null, popup: null, hud: null, preview: null, styleTab: 'sets', legalOpen: false };
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
  const cut = key.indexOf(':');
  const kind = key.slice(0, cut);
  const id = key.slice(cut + 1);
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
  const set = SETS.find((x) => x.product === id);
  if (set) return h('span', { class: 'sh-art cos set', 'aria-hidden': 'true' }, cosPic(lookKey(setLook(set)), size));
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
  c.shop = { entry, go, refresh, render };
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

function featuredSection(ui, { go } = {}) {
  const fx = fxOf(ui);
  const c = ctl(ui);
  const out = [];
  for (const o of activeOffers(fx)) {
    // 상점에서 이미 본 제안은 창으로 다시 띄우지 않는다
    c.shown.add(offerKey(o));
    c.queue = c.queue.filter((q) => offerKey(q) !== offerKey(o));
    out.push(offerCard(ui, o));
  }
  out.push(seasonCard(ui));
  const set = todaySet(fx);
  if (set) out.push(setCard(ui, set, { compact: true, go }));
  out.push(freeCard(ui));
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

/** 가지지 않은 꾸미기 칸의 상태 글자(가격 · 세트 · 업적 진행 · 조각 등). */
function lockLabel(ui, c) {
  const fx = fxOf(ui);
  if (c.source === 'shop') {
    const p = fx.productFor(c.kind, c.id);
    return { state: 'buy', label: p ? priceOf(ui, p.id) : '' };
  }
  if (c.source === 'set') return { state: 'set', label: S('style.inSet') };
  if (c.source === 'achievement') {
    const pr = achProgress(ui, c.ach);
    return { state: 'lock', label: pr ? S('style.achShort', { a: formatInt(pr.have), b: formatInt(pr.need) }) : S('style.fromAch'), progress: pr ? pr.have / pr.need : 0 };
  }
  if (c.source === 'ladder') {
    const pc = fx.pieces();
    const key = cosmeticKey(c.kind, c.id);
    if (pc.target === key) return { state: 'lock', label: S('style.pieces', { a: pc.have, b: pc.need }), progress: pc.have / pc.need };
    return { state: 'lock', label: S('style.fromLadder') };
  }
  return { state: 'lock', label: S(`style.${SOURCE_LABEL[c.source] || 'fromSeason'}`) };
}

function cosTile(ui, c, go) {
  const name = cosName(c.kind, c.id);
  let state;
  let label;
  let extra = null;
  let onClick;
  if (c.owned) {
    state = c.equipped ? 'on' : 'own';
    label = S(c.equipped ? 'style.equipped' : 'style.equip');
    onClick = () => equipToggle(ui, c);
  } else {
    const l = lockLabel(ui, c);
    state = l.state;
    label = l.label;
    if (l.progress != null) extra = h('span', { class: 'sh-pbar' }, h('i', { style: { '--p': `${Math.min(100, l.progress * 100).toFixed(0)}%` } }));
    // 가지지 않은 것은 먼저 미리 보기(내 기체에 입혀 본 모습 + 얻는 법)
    onClick = () => openCosPreview(ui, c, go);
  }
  const stateIcon =
    state === 'on' ? icon('check', 14) : state === 'set' ? icon('sets', 13) : state === 'lock' ? icon(c.source === 'ladder' ? 'star' : c.source === 'achievement' ? 'trophy' : 'lock', 13) : null;
  const b = h(
    'button',
    {
      class: 'sh-cos',
      type: 'button',
      dataset: { state, fk: `cos:${c.kind}:${c.id}`, source: c.source },
      'aria-pressed': c.owned ? String(!!c.equipped) : null,
      'aria-label': `${name} · ${label}`,
      onClick: (e) => onClick?.(e),
    },
    cosPic(cosmeticKey(c.kind, c.id), 56),
    h('b', { class: 'sh-cname', text: name }),
    h('span', { class: 'sh-cstate' }, stateIcon, h('span', { text: label })),
    extra,
  );
  return b;
}

/** 세트를 한 번에 입는다. */
function wearSet(ui, set) {
  const fx = fxOf(ui);
  let any = false;
  for (const key of set.items.map((x) => x.key || x)) {
    const [kind, id] = key.split(':');
    if (fx.owns(kind, id)) any = fx.equip(kind, id) || any;
  }
  if (!any) return;
  ui.audio.sfx('buy');
  ui.haptics.fire('good');
  flash(ui, S('style.equippedToast', { name: setName(set.id) }), 'good');
  ui.save();
}

/** 테마 세트 카드: 네 가지를 모두 갖춘 기체 그림, 들어 있는 것, 가격(또는 한 번에 장착). */
function setCard(ui, set, { compact = false, go } = {}) {
  const fx = fxOf(ui);
  const look = fx.look();
  const owned = set.bought || set.items.every((x) => x.owned);
  const worn = owned && set.items.every((x) => look[x.kind] === x.id);
  const items = h(
    'ul',
    { class: 'sh-set-items' },
    set.items.map((x) =>
      h(
        'li',
        { dataset: { kind: x.kind } },
        cosPic(x.key, 40, 'mini'),
        h('span', null, h('small', { text: t(`monetize.cosmetic.kind.${x.kind}`) }), h('b', { text: cosName(x.kind, x.id) })),
      ),
    ),
  );
  let foot;
  if (owned) {
    foot = h(
      'button',
      { class: `btn ${worn ? 'ghost' : 'primary'} wide sh-wear`, type: 'button', dataset: { fk: `wear:${set.id}` }, disabled: worn ? '' : null, onClick: () => wearSet(ui, set) },
      icon(worn ? 'check' : 'shirt', 18),
      S(worn ? 'style.setWorn' : 'style.wearSet'),
    );
  } else foot = buyButton(ui, set.product, { cls: 'wide' });
  return h(
    'article',
    { class: `sh-card sh-set ${owned ? 'on' : ''} ${compact ? 'compact' : ''}`.trim(), dataset: { set: set.id, product: set.product } },
    h(
      'div',
      { class: 'sh-set-top' },
      h(
        'span',
        { class: 'sh-set-art', dataset: { set: set.id }, 'aria-hidden': 'true' },
        cosPic(lookKey(setLook(set), 2, true), compact ? 104 : 124, 'set'),
        owned ? h('i', { class: 'sh-set-own' }, icon('check', 14)) : null,
      ),
      h(
        'div',
        { class: 'sh-text' },
        compact ? h('small', { class: 'sh-kicker', text: S('style.todaySet') }) : null,
        h('h3', { text: setName(set.id) }),
        h('p', { text: S('style.setLead') }),
        compact ? h('button', { class: 'link-btn sh-more-link', type: 'button', onClick: () => go?.('style') }, S('style.moreStyle'), icon('arrow', 16)) : null,
      ),
    ),
    compact ? null : items,
    foot,
  );
}

/** 오늘의 테마 세트(날마다 바뀐다. 이미 산 세트는 건너뛴다). 다 샀으면 null. */
function todaySet(fx) {
  const sets = fx.sets().filter((x) => !x.bought && !x.items.every((i) => i.owned));
  if (!sets.length) return null;
  const day = Math.floor(Date.parse(`${fx.today()}T00:00:00Z`) / 86400000) || 0;
  return sets[((day % sets.length) + sets.length) % sets.length];
}

function styleSection(ui, { go }) {
  const fx = fxOf(ui);
  const c = ctl(ui);
  const cur = STYLE_TABS.includes(c.styleTab) ? c.styleTab : 'sets';
  const chips = h(
    'div',
    { class: 'sh-chips', role: 'group', 'aria-label': S('tabs.style') },
    STYLE_TABS.map((id) => {
      const list = id === 'sets' ? fx.sets() : fx.cosmetics(id);
      const have = id === 'sets' ? list.filter((x) => x.bought || x.items.every((i) => i.owned)).length : list.filter((x) => x.owned).length;
      return h(
        'button',
        {
          class: 'sh-chip',
          type: 'button',
          'aria-pressed': String(id === cur),
          dataset: { fk: `chip:${id}`, tab: id },
          onClick: () => {
            if (c.styleTab === id) return;
            c.styleTab = id;
            ui.audio.sfx('click');
            c.shop?.render?.(false);
          },
        },
        icon(id === 'sets' ? 'sets' : KIND_ICON[id], 16),
        h('span', { text: S(`style.chips.${id}`) }),
        h('small', { text: `${have}/${list.length}` }),
      );
    }),
  );
  const out = [h('p', { class: 'panel-hint sh-hint' }, icon('shirt', 16), h('span', { text: S('style.hint') })), chips];
  if (cur === 'sets') out.push(h('div', { class: 'sh-sets' }, fx.sets().map((set) => setCard(ui, set, { go }))));
  else out.push(h('div', { class: 'sh-cos-grid', dataset: { kind: cur } }, fx.cosmetics(cur).map((x) => cosTile(ui, x, go))));
  return out;
}

/**
 * 꾸미기 미리 보기: 지금 내 기체(형태·다른 꾸미기 그대로)에 이것만 바꿔 입힌 모습과, 얻는 법.
 * 산 뒤에는 그 자리에서 장착할 수 있다.
 */
function openCosPreview(ui, item, go) {
  const fx = fxOf(ui);
  const c = ctl(ui);
  if (!fx || c.preview) return null;
  const release = hold(ui);
  const name = cosName(item.kind, item.id);
  const body = h('div', { class: 'sh-pv' });
  const close = () => entry.close();

  function how() {
    const cur = fx.cosmetics(item.kind).find((x) => x.id === item.id) || item;
    if (cur.owned) {
      return h(
        'button',
        {
          class: `btn ${cur.equipped ? 'ghost' : 'primary'} wide sh-pv-equip`,
          type: 'button',
          disabled: cur.equipped ? '' : null,
          onClick: () => {
            equipToggle(ui, cur);
            close();
          },
        },
        icon(cur.equipped ? 'check' : 'shirt', 18),
        S(cur.equipped ? 'style.equipped' : 'style.equipNow'),
      );
    }
    switch (item.source) {
      case 'shop': {
        const p = fx.productFor(item.kind, item.id);
        return p ? buyButton(ui, p.id, { cls: 'wide', label: S('buyAt', { price: priceOf(ui, p.id) }) }) : null;
      }
      case 'set': {
        const set = fx.sets().find((x) => x.id === item.set);
        if (!set) return null;
        return [
          h('p', { class: 'sh-pv-why' }, icon('sets', 16), h('span', { text: S('style.setContains', { name: setName(set.id) }) })),
          h(
            'ul',
            { class: 'sh-set-items small' },
            set.items.map((x) => h('li', { dataset: { kind: x.kind }, class: x.key === cosmeticKey(item.kind, item.id) ? 'me' : null }, cosPic(x.key, 34, 'mini'), h('b', { text: cosName(x.kind, x.id) }))),
          ),
          buyButton(ui, set.product, { cls: 'wide', label: S('style.buySet', { name: setName(set.id), price: priceOf(ui, set.product) }) }),
        ];
      }
      case 'achievement': {
        const pr = achProgress(ui, item.ach);
        return h(
          'div',
          { class: 'sh-pv-ach' },
          h('p', { class: 'sh-pv-why' }, icon('trophy', 16), h('span', { text: S('style.achHint', { name: t(`ach.${item.ach}.name`) }) })),
          h('small', { text: t(`ach.${item.ach}.desc`) }),
          pr ? h('div', { class: 'sh-pv-bar' }, h('span', { class: 'sh-pbar' }, h('i', { style: { '--p': `${Math.min(100, (pr.have / pr.need) * 100).toFixed(0)}%` } })), h('b', { text: `${formatInt(pr.have)}/${formatInt(pr.need)}` })) : null,
        );
      }
      case 'ladder': {
        const pc = fx.pieces();
        const key = cosmeticKey(item.kind, item.id);
        const mine = pc.target === key;
        const target = pc.target ? pc.target.split(':') : null;
        return h(
          'div',
          { class: 'sh-pv-ach' },
          h('p', { class: 'sh-pv-why' }, icon('star', 16), h('span', { text: S('style.ladderHint', { a: pc.have, b: pc.need }) })),
          mine
            ? h('div', { class: 'sh-pv-bar' }, h('span', { class: 'sh-pbar' }, h('i', { style: { '--p': `${Math.min(100, (pc.have / pc.need) * 100).toFixed(0)}%` } })), h('b', { text: `${pc.have}/${pc.need}` }))
            : target
              ? h('small', { text: S('style.ladderAfter', { name: cosName(target[0], target[1]) }) })
              : null,
        );
      }
      case 'season':
        return h('button', { class: 'btn primary wide', type: 'button', onClick: () => openSeasonPass(ui) }, icon('crown', 18), S('season.more'));
      case 'freepass':
        return h('button', { class: 'btn primary wide', type: 'button', onClick: () => (close(), go?.('featured', '.sh-free')) }, S('style.fromFreepass'), icon('arrow', 18));
      case 'starter':
        return fx.starterOffer()
          ? h('button', { class: 'btn primary wide', type: 'button', onClick: () => (close(), go?.('featured', '.sh-offer[data-product="shh.starter"]')) }, S('style.fromStarter'), icon('arrow', 18))
          : h('p', { class: 'sh-pv-why', text: S('style.starterHint') });
      default:
        return null;
    }
  }

  function render() {
    const look = { ...fx.look(), [item.kind]: item.id };
    const form = Math.max(0, Math.min(7, ui.game.formIndex | 0));
    const key = cosmeticKey(item.kind, item.id);
    body.replaceChildren(
      h(
        'div',
        { class: `sh-pv-stage ${item.kind === 'outfit' ? 'two' : ''}`.trim() },
        h('span', { class: 'sh-pv-ship' }, cosPic(lookKey(look, form, item.kind === 'beam'), 196, 'pv')),
        item.kind === 'outfit' ? h('span', { class: 'sh-pv-close' }, cosPic(key, 96, 'pv')) : null,
      ),
      h('p', { class: 'sh-pv-note' }, icon('eye', 15), h('span', { text: S('style.previewNote') })),
      h('div', { class: 'sh-pv-how' }, how()),
    );
  }

  const root = h('div', { class: 'sh-pv-wrap' }, head(name, close, true), h('p', { class: 'sh-pv-kind', text: t(`monetize.cosmetic.kind.${item.kind}`) }), body);
  const off = ui.game.on('monetize:change', () => requestAnimationFrame(render));
  const offPrice = ui.monetize?.on?.('prices', render);
  const entry = openModal(ui, root, {
    cls: 'modal-cos-preview',
    label: name,
    onClose: () => {
      off?.();
      offPrice?.();
      c.preview = null;
      release();
    },
  });
  c.preview = entry;
  render();
  ui.audio.sfx('open');
  return entry;
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
  const set = SETS.find((x) => x.product === id) || null;
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
    // 테마 세트: 네 가지를 한 번에 입고 닫기
    set
      ? h(
          'button',
          {
            class: 'btn primary wide sh-th-wear',
            type: 'button',
            'data-autofocus': '',
            onClick: () => {
              wearSet(ui, set);
              entry.close();
            },
          },
          icon('shirt', 18),
          S('style.wearSet'),
        )
      : null,
    h('button', { class: `btn ${set ? 'ghost' : 'primary'} wide`, type: 'button', 'data-autofocus': set ? null : '', onClick: () => entry.close() }, S('thanks.ok')),
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
