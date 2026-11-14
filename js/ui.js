// THE LAMP 2 — 화면 UI (DOM): 타이틀 · 스테이지 선택 · HUD · 일시정지 · 클리어
import { LEVELS, CHAPTERS } from './levels.js';
import { SKINS } from './render.js';
import { t, has, getLang } from './i18n.js';

const $ = (id) => document.getElementById(id);

// 전구 겉모습: 모은 빛꽃 수로 열린다
export const SKIN_NEED = { warm: 0, day: 8, moon: 16, dawn: 26 };

export function fmtTime(sec) {
  sec = Math.max(0, sec);
  const m = Math.floor(sec / 60), s = sec - m * 60;
  return m + ':' + (s < 10 ? '0' : '') + s.toFixed(1);
}

export function totalFlowers(save) {
  let n = 0;
  for (const id in save.levels) n += save.levels[id].flowers || 0;
  return n;
}

export function unlocked(save, i) {
  return i === 0 || !!(save.levels[LEVELS[i - 1].id] && save.levels[LEVELS[i - 1].id].done);
}

// 아직 깨지 않은 첫 스테이지 (모두 깼으면 -1)
export function nextIndex(save) {
  for (let i = 0; i < LEVELS.length; i++) if (!(save.levels[LEVELS[i].id] && save.levels[LEVELS[i].id].done)) return i;
  return -1;
}

export class UI {
  constructor(save, h) {
    this.save = save;
    this.h = h;
    this.touch = !!(window.matchMedia && window.matchMedia('(hover: none) and (pointer: coarse)').matches);
    if (this.touch) document.body.classList.add('touch');
    this.cache = {};
    this.tipKey = null;

    $('btnStart').onclick = () => h.start();
    $('btnStages').onclick = () => { h.click(); this.show('select'); };
    $('btnHow').onclick = () => { h.click(); this.show('how'); };
    for (const b of document.querySelectorAll('[data-back]')) b.onclick = () => { h.click(); this.show('title'); };
    $('btnSound').onclick = $('btnSound2').onclick = () => h.sound();
    $('btnLang').onclick = () => h.lang();
    $('btnFull').onclick = () => h.fullscreen();
    if (!document.documentElement.requestFullscreen) $('btnFull').classList.add('hidden');
    $('btnPause').onclick = () => h.pause();
    $('btnResume').onclick = () => h.pause();
    $('btnCheckpoint').onclick = () => h.checkpoint();
    $('btnRestart').onclick = () => h.restart();
    $('btnQuit').onclick = () => h.stages();
    $('btnNext').onclick = () => h.next();
    $('btnRetry').onclick = () => h.restart();
    $('btnClearStages').onclick = () => h.stages();
    this.applyLang();
  }

  setTouch() {
    if (this.touch) return;
    this.touch = true;
    document.body.classList.add('touch');
    $('howKeys').textContent = t('how.keys.touch');
    this.tipKey = null;
  }

  applyLang() {
    document.documentElement.lang = getLang();
    for (const el of document.querySelectorAll('[data-t]')) el.textContent = t(el.dataset.t);
    $('howKeys').textContent = t(this.touch ? 'how.keys.touch' : 'how.keys.pc');
    $('lightLabel').textContent = t('btn.light');
    $('jumpLabel').textContent = t('btn.jump');
    this.setSound(this.save.sound);
    this.refreshTitle();
    this.renderStages();
    this.cache = {};
  }

  setSound(on) { $('btnSound').textContent = $('btnSound2').textContent = t(on ? 'btn.sound.on' : 'btn.sound.off'); }

  refreshTitle() {
    const n = nextIndex(this.save);
    const fresh = Object.keys(this.save.levels).length === 0;
    $('btnStart').textContent = fresh ? t('btn.start') : n < 0 ? t('btn.stages') : `${t('btn.continue')} · ${LEVELS[n].id}`;
    $('titleFlowers').textContent = `${totalFlowers(this.save)}/${LEVELS.length * 3}`;
  }

  show(name) {
    for (const n of ['title', 'select', 'how']) $('screen-' + n).classList.toggle('hidden', n !== name);
    if (name === 'title') this.refreshTitle();
    if (name === 'select') this.renderStages();
  }

  levelTitle(lv) { return `${lv.id} · ${t('lv.' + lv.id)}`; }

  renderStages() {
    const box = $('stageList'), save = this.save;
    box.textContent = '';
    const total = totalFlowers(save), next = nextIndex(save);
    $('selFlowers').textContent = `${total}/${LEVELS.length * 3}`;
    for (const ch of CHAPTERS) {
      const sec = document.createElement('div'); sec.className = 'chapter';
      const h3 = document.createElement('h3'); h3.textContent = `${ch.id}. ${t(ch.key)}`;
      const row = document.createElement('div'); row.className = 'row';
      LEVELS.forEach((lv, i) => {
        if (lv.chapter !== ch.id) return;
        const rec = save.levels[lv.id], open = unlocked(save, i);
        const b = document.createElement('button');
        b.className = 'stage' + (open ? '' : ' locked') + (i === next ? ' next' : '');
        const no = document.createElement('span'); no.className = 'no'; no.textContent = lv.id;
        const nm = document.createElement('span'); nm.className = 'nm'; nm.textContent = t('lv.' + lv.id);
        const meta = document.createElement('span'); meta.className = 'smeta';
        const fl = document.createElement('span'); fl.className = 'fl3';
        for (let k = 0; k < 3; k++) { const d = document.createElement('i'); if (rec && rec.flowers > k) d.className = 'on'; fl.appendChild(d); }
        meta.appendChild(fl);
        if (rec && rec.done) meta.appendChild(document.createTextNode(fmtTime(rec.best)));
        b.appendChild(no); b.appendChild(nm); b.appendChild(meta);
        if (rec && rec.flawless) { const f = document.createElement('span'); f.className = 'flaw'; f.title = t('clear.flawless'); b.appendChild(f); }
        if (open) b.onclick = () => this.h.play(i);
        else b.title = t('sel.locked');
        row.appendChild(b);
      });
      sec.appendChild(h3); sec.appendChild(row);
      box.appendChild(sec);
    }
    const sk = $('skinList');
    sk.textContent = '';
    for (const id in SKINS) {
      const need = SKIN_NEED[id] || 0, open = total >= need;
      const b = document.createElement('button');
      b.className = 'skin' + (save.skin === id ? ' sel' : '') + (open ? '' : ' locked');
      const dot = document.createElement('i'); dot.style.background = SKINS[id].core; dot.style.color = SKINS[id].core;
      b.appendChild(dot);
      b.appendChild(document.createTextNode(open ? t('skin.' + id) : t('sel.need', { n: need })));
      if (open) b.onclick = () => this.h.skin(id);
      sk.appendChild(b);
    }
  }

  // ---------- HUD ----------
  hud(on) { $('hud').classList.toggle('hidden', !on); if (!on) this.hideTip(); this.cache = {}; }

  set(key, val, fn) {
    if (this.cache[key] === val) return;
    this.cache[key] = val;
    fn(val);
  }

  updateHud(w) {
    const b = w.bulb;
    this.set('name', w.level.id + getLang(), () => { $('stageName').textContent = this.levelTitle(w.level); });
    this.set('got', w.got, (v) => { [...$('flowers').children].forEach((el, i) => el.classList.toggle('on', i < v)); });
    this.set('time', Math.floor(w.time * 10), (v) => { $('time').textContent = fmtTime(v / 10); });
    this.set('crack', b.cracked && w.state === 'play', (v) => { const el = $('crack'); el.classList.toggle('hidden', !v); el.textContent = t('hud.cracked'); });
    this.set('on', b.on, (v) => $('btnLight').classList.toggle('on', v));
  }

  tip(key) {
    const k = has(key) ? key : key + (this.touch ? '.touch' : '.pc');
    if (this.tipKey === k) return;
    this.tipKey = k;
    const el = $('tip');
    el.classList.remove('hidden');
    el.textContent = t(k);
    el.style.animation = 'none'; void el.offsetWidth; el.style.animation = '';
  }

  hideTip() {
    if (!this.tipKey) return;
    this.tipKey = null;
    $('tip').classList.add('hidden');
  }

  showPause(w) { $('pauseStage').textContent = this.levelTitle(w.level); $('overlay-pause').classList.remove('hidden'); }
  hidePause() { $('overlay-pause').classList.add('hidden'); }

  showClear(r) {
    $('overlay-clear').firstElementChild.classList.toggle('win', true);
    $('clearTitle').textContent = t(r.final ? 'clear.final' : 'clear.title');
    $('clearSub').textContent = r.final ? t('clear.final.sub') : this.levelTitle(r.level);
    const fl = [...$('clearFlowers').children];
    fl.forEach((el, i) => { el.className = ''; void el.offsetWidth; if (i < r.got) el.className = 'on'; });
    const grid = $('clearGrid');
    grid.textContent = '';
    grid.className = 'res-grid three';
    const cell = (label, val) => {
      const d = document.createElement('div');
      const bb = document.createElement('b'); bb.textContent = val;
      d.appendChild(bb); d.appendChild(document.createTextNode(label));
      grid.appendChild(d);
    };
    cell(t('clear.time'), fmtTime(r.time));
    cell(t('clear.flowers'), `${r.got}/3`);
    cell(t('clear.breaks'), r.breaks);
    const bd = $('clearBadges');
    bd.textContent = '';
    const badge = (key, cls) => { const s = document.createElement('span'); if (cls) s.className = cls; s.textContent = t(key); bd.appendChild(s); };
    if (r.got === 3) badge('clear.all', 'gold');
    if (r.flawless) badge('clear.flawless');
    if (r.newBest) badge('clear.best', 'gold');
    $('btnNext').classList.toggle('hidden', !r.hasNext);
    $('btnRetry').classList.toggle('primary', !r.hasNext);
    $('overlay-clear').classList.remove('hidden');
  }

  hideClear() { $('overlay-clear').classList.add('hidden'); }
}
