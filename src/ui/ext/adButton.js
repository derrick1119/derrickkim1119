// 보상형 광고 버튼(모든 광고 자리가 함께 쓴다).
// 광고 표시 + 문구 + "오늘 n번 남음"(프리패스면 "프리패스로 바로 받기"). 누르면 광고를 보고, 끝까지 보면 onReward.
// 한도를 다 썼거나 광고를 쓸 수 없으면 버튼을 만들지 않는다(null) — 화면에 "못 누르는 광고 버튼"을 남기지 않는다.
import { t } from '../../i18n/index.js';
import { h, icon } from '../dom.js';
import { addIcons } from '../icons.js';

addIcons({
  ad: '<rect x="3" y="5" width="18" height="14" rx="3.5"/><path d="M10 9.2v5.6l4.8-2.8z"/>',
  rocket: '<path d="M12 3c3.2 2.2 4.8 5.4 4.8 9v3.2H7.2V12c0-3.6 1.6-6.8 4.8-9z"/><circle cx="12" cy="9.5" r="1.7"/><path d="M7.2 13 4.8 16v3l2.4-1.4M16.8 13l2.4 3v3l-2.4-1.4M10 18.6c.5 1.4 1.2 2.1 2 2.1s1.5-.7 2-2.1"/>',
  stamp: '<path d="M9 4h6v3.2c0 1.6-1.3 2.4-1.3 4.1V13h-3.4v-1.7C10.3 9.6 9 8.8 9 7.2V4z"/><path d="M5 13h14v3H5zM6.5 19.5h11"/>',
  gift: '<rect x="4" y="9" width="16" height="11" rx="2"/><path d="M3 9h18v3H3zM12 9v11M12 9c-1.5-3.5-5.5-4-5.5-1.5S10 9 12 9zM12 9c1.5-3.5 5.5-4 5.5-1.5S14 9 12 9z"/>',
});

/**
 * @param {import('../ui.js').UI} ui
 * @param {string} placement 광고 자리(catalog PLACEMENTS)
 * @param {{label: string, ctx?: object|(() => object), cls?: string, onReward?: (result: object) => void, onFail?: (reason: string) => void, showLeft?: boolean}} o
 * @returns {HTMLButtonElement|null}
 */
export function adButton(ui, placement, o) {
  const m = ui.monetize;
  const fx = ui.game.fx.monetize;
  if (!m || !fx) return null;
  const check = fx.canWatch(placement);
  if (!check.ok) return null;
  const free = fx.hasFreePass();
  const sub = free ? t('monetize.ad.free') : o.showLeft === false ? null : t('monetize.ad.left', { n: check.left });
  const b = h(
    'button',
    { class: `btn mz-adbtn ${o.cls || ''}`.trim(), type: 'button', 'data-placement': placement, onClick: () => run() },
    h('span', { class: 'mz-adico' }, icon(free ? 'gift' : 'ad', 20)),
    h('span', { class: 'mz-adtext' }, h('b', { text: o.label }), sub && h('small', { text: sub })),
  );
  async function run() {
    if (b.disabled) return;
    b.disabled = true;
    b.classList.add('loading');
    const res = await m.watch(placement, typeof o.ctx === 'function' ? o.ctx() : o.ctx || {});
    b.classList.remove('loading');
    if (res.ok) {
      ui.audio.sfx('success');
      ui.haptics.fire('good');
      o.onReward?.(res.result);
      return;
    }
    b.disabled = false;
    const key = res.reason === 'cap' ? 'cap' : res.reason === 'cadet' ? 'cadetCap' : res.reason === 'error' ? 'notReady' : res.reason === 'cancelled' ? 'cancelled' : null;
    if (key) ui.toast(t(`monetize.ad.${key}`), 'info');
    o.onFail?.(res.reason);
  }
  return b;
}
