// 화면 UI (DOM): 타이틀 · 공방 · HUD · 레벨업 · 결과
import { NIGHTS, UPG, EVO, META } from './config.js';
import { t, upgName, upgDesc, getLang } from './i18n.js';
import { iconCanvas } from './icons.js';

const $ = (id) => document.getElementById(id);
const PHASE = ['-62%', '-38%', '100%', '38%', '0%']; // 달 모양 (그림자 위치)

export function fmtTime(sec) {
  sec = Math.max(0, Math.floor(sec));
  return Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0');
}

function family(id) {
  if (EVO[id]) return 'evo';
  const d = UPG[id];
  return d ? d.type : 'bonus';
}

export class UI {
  constructor(save, h) {
    this.save = save;
    this.h = h;
    this.touch = window.matchMedia && window.matchMedia('(hover: none) and (pointer: coarse)').matches;
    this.night = Math.min(save.unlocked, NIGHTS.length) - 1;
    this.cache = {};
    this.levelOpen = false;
    this.levelLock = 0;
    this.tipKey = null;

    $('btnStart').onclick = () => h.start(this.night);
    $('btnWorkshop').onclick = () => { h.click(); this.show('workshop'); };
    $('btnHow').onclick = () => { h.click(); this.show('how'); };
    for (const b of document.querySelectorAll('[data-back]')) b.onclick = () => { h.click(); this.show(this.backTo || 'title'); };
    $('btnSound').onclick = $('btnSound2').onclick = () => h.sound();
    $('btnLang').onclick = () => h.lang();
    $('btnFull').onclick = () => h.fullscreen();
    if (!document.documentElement.requestFullscreen) $('btnFull').classList.add('hidden');
    $('btnPause').onclick = () => h.pause();
    $('btnResume').onclick = () => h.pause();
    $('btnQuit').onclick = () => h.quit();
    $('btnRetry').onclick = () => h.retry();
    $('btnNext').onclick = () => h.next();
    $('btnMenu').onclick = () => h.menu();
    $('btnResWorkshop').onclick = () => { h.click(); this.backTo = 'result'; $('overlay-result').classList.add('hidden'); this.show('workshop'); };
    $('btnReroll').onclick = () => h.reroll();
    const lamp = $('btnLamp');
    lamp.addEventListener('touchstart', (e) => { e.preventDefault(); e.stopPropagation(); h.toggle(); }, { passive: false });
    lamp.addEventListener('mousedown', (e) => { e.preventDefault(); e.stopPropagation(); if (!this.touchUsed) h.toggle(); });
    lamp.addEventListener('touchend', () => { this.touchUsed = true; });

    this.applyLang();
  }

  // ---------- 문구 ----------
  applyLang() {
    document.documentElement.lang = getLang();
    for (const el of document.querySelectorAll('[data-t]')) el.textContent = t(el.dataset.t);
    $('howKeys').textContent = t(this.touch ? 'how.keys.touch' : 'how.keys.pc');
    this.setSound(this.save.sound);
    this.renderNights();
    this.renderWorkshop();
    this.cache = {};
  }

  setSound(on) {
    $('btnSound').textContent = $('btnSound2').textContent = t(on ? 'btn.sound.on' : 'btn.sound.off');
  }

  nightName(i) { return t('night.' + NIGHTS[i].id); }

  // ---------- 화면 전환 ----------
  show(name) {
    for (const n of ['title', 'how', 'workshop']) $('screen-' + n).classList.toggle('hidden', n !== name);
    if (name === 'result') { $('overlay-result').classList.remove('hidden'); this.backTo = null; }
    if (name === 'title') { this.backTo = null; this.renderNights(); $('titleLumen').textContent = this.save.lumen; }
    if (name === 'workshop') this.renderWorkshop();
  }

  renderNights() {
    const box = $('nights');
    box.textContent = '';
    NIGHTS.forEach((n, i) => {
      const b = document.createElement('button');
      const locked = i >= this.save.unlocked, best = this.save.best[i];
      b.className = 'night' + (i === this.night ? ' sel' : '') + (locked ? ' locked' : '') + (best && best.win ? ' cleared' : '');
      b.setAttribute('aria-label', this.nightName(i));
      const m = document.createElement('span');
      m.className = 'moon';
      m.style.setProperty('--ph', PHASE[i]);
      b.appendChild(m);
      b.onclick = () => { this.h.click(); if (!locked) this.night = i; this.infoNight = i; this.renderNights(); };
      box.appendChild(b);
    });
    const i = this.infoNight ?? this.night;
    this.infoNight = null;
    const n = NIGHTS[i], info = $('nightInfo');
    info.textContent = '';
    const name = document.createElement('b');
    name.textContent = `${t('night.n', { n: n.id })} · ${this.nightName(i)}`;
    info.appendChild(name);
    const parts = [];
    if (i >= this.save.unlocked) parts.push(t('night.locked'));
    else {
      parts.push(`${t('hud.dawn')} ${fmtTime(n.duration)}`);
      if (n.requireBoss) parts.push(t('night.rule.boss'));
      else if (n.snuffers) parts.push(t('night.rule.snuff'));
      const best = this.save.best[i];
      if (best) parts.push(best.win ? t('night.cleared') : t('night.best', { t: fmtTime(best.time) }));
    }
    info.appendChild(document.createTextNode(parts.join(' · ')));
    $('titleLumen').textContent = this.save.lumen;
  }

  renderWorkshop() {
    const grid = $('metaGrid'), save = this.save;
    grid.textContent = '';
    $('wsLumen').textContent = save.lumen;
    for (const id in META) {
      const def = META[id], lvl = save.meta[id] || 0;
      const el = document.createElement('div');
      el.className = 'meta';
      el.appendChild(iconCanvas(id, lvl > 0 ? 'weapon' : 'passive', 46));
      const nm = document.createElement('div'); nm.className = 'nm'; nm.textContent = t('meta.' + id);
      const ds = document.createElement('div'); ds.className = 'ds'; ds.textContent = t('meta.' + id + '.d');
      const foot = document.createElement('div'); foot.className = 'foot';
      const pips = document.createElement('div'); pips.className = 'pips';
      for (let i = 0; i < def.max; i++) { const p = document.createElement('i'); if (i < lvl) p.className = 'on'; pips.appendChild(p); }
      const buy = document.createElement('button'); buy.className = 'buy';
      if (lvl >= def.max) { buy.textContent = t('btn.max'); buy.disabled = true; }
      else {
        const cost = def.cost[lvl];
        const gem = document.createElement('i'); gem.className = 'gem';
        buy.appendChild(gem);
        buy.appendChild(document.createTextNode(String(cost)));
        buy.disabled = save.lumen < cost;
        buy.onclick = () => this.h.buy(id);
      }
      foot.appendChild(pips); foot.appendChild(buy);
      el.appendChild(nm); el.appendChild(ds); el.appendChild(foot);
      grid.appendChild(el);
    }
  }

  // ---------- HUD ----------
  hud(on) { $('hud').classList.toggle('hidden', !on); if (!on) this.hideTip(); }

  set(key, val, fn) {
    if (this.cache[key] === val) return;
    this.cache[key] = val;
    fn(val);
  }

  updateHud(g) {
    const p = g.p, s = g.stat;
    this.set('xp', Math.round((p.xp / p.xpNeed) * 200), (v) => { $('xpFill').style.width = v / 2 + '%'; });
    this.set('lvl', p.level, (v) => { $('lvl').textContent = 'Lv ' + v; });
    const f = p.oil / s.maxOil;
    this.set('oilw', Math.round(f * 100), (v) => { $('oilFill').style.width = v + '%'; });
    this.set('oilt', Math.ceil(p.oil), (v) => { $('oilTxt').textContent = v; });
    this.set('oilc', (f < 0.28 ? 'low ' : '') + (p.lit ? '' : 'dark'), (v) => { $('oil').className = 'oil ' + v; });
    const held = g.held;
    this.set('held', held, (v) => {
      $('clockLabel').textContent = t(v ? 'hud.held' : 'hud.dawn');
      $('clock').parentElement.parentElement.classList.toggle('held', v);
      this.cache.clock = null;
    });
    this.set('clock', Math.ceil(g.night.duration - g.clock), (v) => { $('clock').textContent = held ? '' : fmtTime(v); });
    this.set('nf', Math.round((g.clock / g.night.duration) * 200), (v) => { $('nightFill').style.width = v / 2 + '%'; });
    this.set('lamps', g.litCount + '/' + g.lamps.length, (v) => { $('lamps').textContent = v; });
    this.set('kills', g.kills, (v) => { $('kills').textContent = v; });
    const b = g.boss && !g.boss.dead ? g.boss : null;
    this.set('boss', !!b, (v) => { $('bossbar').classList.toggle('hidden', !v); $('bossName').textContent = getLang() === 'ko' ? '월 식' : 'ECLIPSE'; });
    if (b) {
      this.set('bossw', Math.round((b.hp / b.maxHp) * 200), (v) => { $('bossFill').style.width = v / 2 + '%'; });
      this.set('bossc', b.shield > 0 ? 'shield' : b.vuln > 0 ? 'vuln' : '', (v) => { $('bossbar').className = v; });
    }
    const full = !p.lit && p.charge >= 1;
    this.set('lampc', (p.lit ? 'lit' : 'dark') + (full ? ' full' : ''), (v) => {
      $('btnLamp').className = 'lamp-btn ' + v;
      $('lampLabel').textContent = t(p.lit ? 'hud.lamp.on' : 'hud.lamp.off');
    });
    if (!p.lit) this.set('charge', Math.round(p.charge * 50), (v) => { $('btnLamp').style.setProperty('--charge', v / 50); });
  }

  toast(key, vars, cls) {
    const box = $('toasts');
    while (box.children.length >= 2) box.firstChild.remove();
    const el = document.createElement('div');
    el.className = 'toast' + (cls ? ' ' + cls : '');
    el.textContent = t(key, vars);
    box.appendChild(el);
    setTimeout(() => el.remove(), 2900);
  }

  clearToasts() { $('toasts').textContent = ''; }

  tip(key) {
    if (this.tipKey === key) return;
    this.tipKey = key;
    const el = $('tip');
    el.classList.remove('hidden');
    el.textContent = t(key);
    el.style.animation = 'none'; void el.offsetWidth; el.style.animation = '';
  }

  hideTip() {
    if (!this.tipKey) return;
    this.tipKey = null;
    $('tip').classList.add('hidden');
  }

  // ---------- 레벨업 ----------
  showLevel(g) {
    this.levelOpen = true;
    this.levelLock = performance.now() + 380; // 실수로 바로 고르지 않도록
    $('overlay-level').classList.remove('hidden');
    $('lvTitle').textContent = t('lv.title');
    $('lvSub').textContent = `Lv ${g.p.level} · ${t('lv.sub')}`;
    const box = $('cards');
    box.textContent = '';
    g.choices.forEach((c, i) => {
      const fam = c.kind === 'evo' ? 'evo' : c.kind === 'bonus' ? 'bonus' : family(c.id);
      const b = document.createElement('button');
      b.className = 'card ' + fam;
      const key = document.createElement('span'); key.className = 'key'; key.textContent = i + 1;
      const tag = document.createElement('span'); tag.className = 'tag'; tag.textContent = t('tag.' + fam);
      const ic = document.createElement('span'); ic.className = 'ic'; ic.appendChild(iconCanvas(c.id, fam === 'bonus' ? 'weapon' : fam, 60));
      const body = document.createElement('span'); body.className = 'body';
      const nm = document.createElement('span'); nm.className = 'nm'; nm.textContent = upgName(c.id);
      const lv = document.createElement('span'); lv.className = 'lv';
      const cur = g.up[c.id] || 0;
      lv.textContent = c.kind === 'upg' ? (cur === 0 ? t('lv.new') : t('lv.level', { a: cur, b: cur + 1 })) : t('tag.' + fam);
      const ds = document.createElement('span'); ds.className = 'ds'; ds.textContent = upgDesc(c.id, c.level);
      body.appendChild(nm); body.appendChild(lv); body.appendChild(ds);
      b.appendChild(key); b.appendChild(tag); b.appendChild(ic); b.appendChild(body);
      b.onclick = () => this.h.pick(i);
      box.appendChild(b);
    });
    const rr = $('btnReroll');
    rr.textContent = t('btn.reroll', { n: g.p.rerolls });
    rr.disabled = g.p.rerolls <= 0;
    rr.classList.toggle('hidden', g.p.rerolls <= 0 && (this.save.meta.reroll || 0) === 0 && g.p.level > 2);
  }

  hideLevel() {
    this.levelOpen = false;
    $('overlay-level').classList.add('hidden');
  }

  canPick() { return this.levelOpen && performance.now() >= this.levelLock; }

  // ---------- 일시정지 ----------
  showPause(g) {
    const box = $('pauseBuild');
    box.textContent = '';
    const add = (id, lvl, fam) => {
      const s = document.createElement('span');
      if (fam === 'dark') s.className = 'dark';
      s.appendChild(document.createTextNode(upgName(id) + ' '));
      const b = document.createElement('b'); b.textContent = lvl;
      s.appendChild(b);
      box.appendChild(s);
    };
    for (const id in g.up) if (g.up[id] > 0) add(id, g.evo && UPG[id] && g.up[id] >= UPG[id].max ? 'MAX' : 'Lv' + g.up[id], family(id));
    for (const id in g.evo) add(id, '★', 'evo');
    $('overlay-pause').classList.remove('hidden');
  }

  hidePause() { $('overlay-pause').classList.add('hidden'); }

  // ---------- 결과 ----------
  showResult(r) {
    const box = $('overlay-result').firstElementChild;
    box.classList.toggle('win', r.won);
    $('resTitle').textContent = t(r.won ? 'res.win' : 'res.lose');
    $('resSub').textContent = t(r.won ? 'res.win.sub' : 'res.lose.sub');
    const grid = $('resGrid');
    grid.textContent = '';
    const cell = (label, val, best) => {
      const d = document.createElement('div');
      if (best) d.className = 'best';
      const b = document.createElement('b'); b.textContent = val;
      d.appendChild(b); d.appendChild(document.createTextNode(label));
      grid.appendChild(d);
    };
    cell(t('res.time'), fmtTime(r.time));
    cell(t('res.kills'), r.kills);
    cell(t('res.level'), r.level);
    cell(t('res.lamps'), r.lamps + '/' + r.lampTotal);
    cell(t('res.score') + (r.newBest ? ' · ' + t('res.newbest') : ''), r.score.toLocaleString(), r.newBest);
    cell(this.nightName(r.night), t('night.n', { n: r.night + 1 }));
    // 루멘이 차오르는 연출
    const el = $('resLumen'), t0 = performance.now();
    const tick = (now) => {
      const k = Math.min(1, (now - t0) / 900);
      el.textContent = '+' + Math.round(r.lumen * (1 - Math.pow(1 - k, 3)));
      if (k < 1 && !$('overlay-result').classList.contains('hidden')) requestAnimationFrame(tick);
      else el.textContent = '+' + r.lumen;
    };
    requestAnimationFrame(tick);
    const un = $('resUnlock');
    un.classList.toggle('hidden', r.unlocked == null);
    if (r.unlocked != null) un.textContent = t('res.unlock', { n: this.nightName(r.unlocked) });
    $('btnNext').classList.toggle('hidden', !r.hasNext);
    $('btnRetry').classList.toggle('primary', !r.hasNext);
    $('overlay-result').classList.remove('hidden');
  }

  hideResult() { $('overlay-result').classList.add('hidden'); }
}
