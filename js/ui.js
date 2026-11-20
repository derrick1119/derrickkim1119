/* 데이 & 나이트 — 화면 위 글과 단추 (대화, 선택, 메뉴, 결말) */
(function (root) {
  'use strict';
  const DN = (root.DN = root.DN || {});
  const UI = (DN.UI = {});
  const $ = (s) => document.querySelector(s);

  const WHO = {
    day:        { name: '데이', cls: 'day' },
    night:      { name: '나이트', cls: 'night' },
    hari:       { name: '하리', cls: 'hari' },
    keeper:     { name: '등대지기', cls: 'folk' },
    child:      { name: '아이', cls: 'folk' },
    narr:       { name: '', cls: 'narr' },
    hearth:     { name: '화롯불 정령', cls: 'spirit', tag: '#ffb070' },
    lighthouse: { name: '등대 정령', cls: 'spirit', tag: '#ffe9a6' },
    neon:       { name: '네온 정령', cls: 'spirit', tag: '#ff9ade' },
    street:     { name: '가로등 정령', cls: 'spirit', tag: '#ffc680' },
    hospital:   { name: '야간등 정령', cls: 'spirit', tag: '#a9ebc8' },
    ember:      { name: '첫 불씨', cls: 'spirit', tag: '#ffd27a' },
    dusk:       { name: '황혼', cls: 'dusk' },
    unknown:    { name: '???', cls: 'dusk' },
  };
  UI.WHO = WHO;

  let el = {};
  let pending = null;   // 진행 중인 대사 {full, shown, done, resolve}
  let toastTimer = 0;

  UI.init = function (game) {
    UI.game = game;
    for (const id of ['toast', 'card', 'hud', 'catch', 'dlg', 'choices', 'place', 'fade', 'title', 'menu', 'ending', 'gallery']) el[id] = $('#' + id);
    el.who = $('#dlg .who'); el.txt = $('#dlg .txt');
    el.lantern = $('#btn-lantern'); el.menuBtn = $('#btn-menu');

    const advance = (e) => { if (e) e.preventDefault(); UI.advance(); };
    el.catch.addEventListener('pointerdown', advance);
    el.dlg.addEventListener('pointerdown', advance);
    window.addEventListener('keydown', (e) => {
      if (e.key === ' ' || e.key === 'Enter') { if (pending) { e.preventDefault(); UI.advance(); } }
    });
    el.lantern.addEventListener('click', () => game.toggleLantern());
    el.recall = $('#btn-recall');
    el.recall.addEventListener('click', () => { if (!game.busy) game.recall(); });
    el.menuBtn.addEventListener('click', () => UI.openMenu());
    el.menu.addEventListener('click', (e) => {
      const act = e.target && e.target.dataset && e.target.dataset.act;
      if (!act) return;
      if (act === 'sound') { DN.Audio.setMuted(!DN.Audio.muted); e.target.textContent = DN.Audio.muted ? '소리 켜기' : '소리 끄기'; return; }
      el.menu.classList.remove('on');
      game.paused = false;
      if (act === 'restart') game.restartChapter();
      if (act === 'title') game.toTitle();
    });
    el.title.addEventListener('click', (e) => {
      const act = e.target && e.target.dataset && e.target.dataset.act;
      if (!act) return;
      DN.Audio.unlock();
      if (act === 'gallery') UI.openGallery();
      else game.titleAction(act);
    });
    el.gallery.addEventListener('click', (e) => {
      if (e.target && e.target.dataset && e.target.dataset.act === 'close') el.gallery.classList.remove('on');
    });
  };

  /* ───────── 대화 ───────── */
  UI.say = function (who, text) {
    const W = WHO[who] || WHO.narr;
    if (DN.AUTO) { UI.lastLine = text; return Promise.resolve(); }
    return new Promise((resolve) => {
      el.dlg.className = 'on ' + W.cls;
      el.dlg.style.setProperty('--tag', W.tag || '');
      el.who.textContent = W.name;
      el.txt.textContent = '';
      el.catch.classList.add('on');
      pending = { full: text, shown: 0, done: false, resolve, acc: 0 };
      DN.Audio.blip(who);
    });
  };

  UI.tick = function (dt) {
    if (!pending || pending.done) return;
    pending.acc += dt * 46;
    const n = Math.min(pending.full.length, Math.floor(pending.acc));
    if (n !== pending.shown) { pending.shown = n; el.txt.textContent = pending.full.slice(0, n); }
    if (n >= pending.full.length) { pending.done = true; el.dlg.classList.add('done'); }
  };

  UI.advance = function () {
    if (!pending) return;
    if (!pending.done) {
      pending.shown = pending.full.length; pending.done = true;
      el.txt.textContent = pending.full; el.dlg.classList.add('done');
      return;
    }
    const p = pending; pending = null;
    el.dlg.classList.remove('done');
    p.resolve();
    // 다음 대사가 바로 이어지지 않으면 상자를 닫는다
    setTimeout(() => { if (!pending) { el.dlg.classList.remove('on'); el.catch.classList.remove('on'); } }, 30);
  };
  UI.talking = () => !!pending;

  /** opts: [{t: 글, v: 값, sub: 작은 글, extra: 2회차에 열린 선택}] */
  UI.choose = function (opts) {
    if (DN.AUTO) {
      const pick = DN.AUTO.choose ? DN.AUTO.choose(opts) : opts[0];
      return Promise.resolve(pick.v);
    }
    return new Promise((resolve) => {
      el.choices.innerHTML = '';
      for (const o of opts) {
        const b = document.createElement('button');
        b.type = 'button';
        b.textContent = o.t;
        if (o.extra) b.classList.add('extra');
        if (o.sub) { const s = document.createElement('small'); s.textContent = o.sub; b.appendChild(s); }
        b.addEventListener('click', () => {
          el.choices.classList.remove('on');
          DN.Audio.sfx('pick');
          resolve(o.v);
        });
        el.choices.appendChild(b);
      }
      el.choices.classList.add('on');
    });
  };

  /* ───────── 알림 ───────── */
  UI.toast = function (text, ms) {
    if (DN.AUTO) return;
    clearTimeout(toastTimer);
    el.toast.textContent = text;
    el.toast.classList.add('on');
    toastTimer = setTimeout(() => el.toast.classList.remove('on'), ms || 5200);
  };
  UI.toastOff = function () { clearTimeout(toastTimer); el.toast.classList.remove('on'); };

  UI.card = function (title, sub, ms) {
    if (DN.AUTO) return Promise.resolve();
    $('#card .t').textContent = title; $('#card .s').textContent = sub || '';
    el.card.classList.add('on');
    return new Promise((res) => setTimeout(() => { el.card.classList.remove('on'); setTimeout(res, 700); }, ms || 2600));
  };

  UI.fade = function (on, ms, white) {
    if (on) el.fade.classList.toggle('white', !!white);   // 걷힐 때는 덮였던 색 그대로
    UI.faded = on;
    if (DN.AUTO) { el.fade.classList.toggle('on', on); return Promise.resolve(); }
    el.fade.style.transitionDuration = (ms || 900) + 'ms';
    el.fade.classList.toggle('on', on);
    return new Promise((res) => setTimeout(res, (ms || 900) + 40));
  };

  /* ───────── 조작 단추 ───────── */
  UI.hud = function (st) {
    el.hud.classList.toggle('hide', !st.show);
    el.lantern.classList.toggle('gone', !st.lantern);
    el.lantern.classList.toggle('on', !!st.on);
    el.lantern.classList.toggle('off', !st.on);
    el.lantern.classList.toggle('nudge', !!st.nudge);
    el.recall.classList.toggle('gone', !st.recall);
  };
  UI.lanternShake = function () {
    el.lantern.classList.remove('shake'); void el.lantern.offsetWidth; el.lantern.classList.add('shake');
  };

  /* ───────── 첫 화면 / 메뉴 ───────── */
  UI.showTitle = function (meta, canContinue) {
    el.title.classList.add('on');
    $('#title [data-act="continue"]').style.display = canContinue ? '' : 'none';
    $('#title [data-act="gallery"]').style.display = meta.endings.length ? '' : 'none';
    $('#title .run').textContent = meta.runs > 0 ? `${meta.runs + 1}번째 노을 — 약속이 또 깨졌다.` : '';
  };
  UI.hideTitle = function () { el.title.classList.remove('on'); };

  UI.openMenu = function () {
    if (UI.game.mode !== 'play') return;
    UI.game.paused = true;
    el.menu.classList.add('on');
  };

  /* ───────── 최종장: 빛 배치 ───────── */
  UI.place = function (spirits, init) {
    const cur = Object.assign({}, init);
    if (DN.AUTO) {
      if (DN.AUTO.place) Object.assign(cur, DN.AUTO.place(spirits, cur));
      return Promise.resolve(cur);
    }
    return new Promise((resolve) => {
      const rows = $('#place .rows');
      rows.innerHTML = '';
      const knob = $('#place .scale .bar i');
      const refresh = () => {
        let h = 0;
        for (const s of spirits) {
          const r = rows.querySelector(`[data-k="${s.k}"]`);
          r.className = 'row ' + cur[s.k];
          r.querySelector('small').textContent = cur[s.k] === 'human' ? '← 인간의 밤으로' : '나이트의 하늘로 →';
          if (cur[s.k] === 'human') h++;
        }
        knob.style.left = (100 - (h / spirits.length) * 100) * 0.9 + 5 + '%';
      };
      for (const s of spirits) {
        const r = document.createElement('div');
        r.dataset.k = s.k;
        const b = document.createElement('button');
        b.type = 'button'; b.className = 'nm';
        b.style.setProperty('--c', s.col);
        b.innerHTML = `${s.name}<small></small>`;
        b.addEventListener('click', () => { cur[s.k] = cur[s.k] === 'human' ? 'night' : 'human'; DN.Audio.sfx('pick'); refresh(); });
        r.appendChild(b); rows.appendChild(r);
      }
      refresh();
      el.place.classList.add('on');
      $('#place .go').onclick = () => { el.place.classList.remove('on'); DN.Audio.sfx('pick'); resolve(cur); };
    });
  };

  /* ───────── 결말 ───────── */
  UI.ending = function (E, meta, total) {
    if (DN.AUTO) return Promise.resolve(DN.AUTO.afterEnding || 'title');
    return new Promise((resolve) => {
      $('#ending .kind').textContent = `엔딩 · ${E.kind}`;
      $('#ending h2').textContent = E.name;
      $('#ending .desc').textContent = E.desc;
      $('#ending .count').textContent = `찾아낸 결말 ${meta.endings.length} / ${total}`;
      $('#ending [data-act="again"]').textContent = E.id === 'repeat' ? '다시, 처음 노을로' : '다시 여정을 떠난다';
      el.ending.classList.add('on');
      el.ending.onclick = (e) => {
        const act = e.target && e.target.dataset && e.target.dataset.act;
        if (!act) return;
        el.ending.classList.remove('on');
        resolve(act);
      };
    });
  };

  UI.openGallery = function () {
    const meta = UI.game.meta;
    const list = $('#gallery .list');
    list.innerHTML = '';
    for (const E of DN.ENDINGS) {
      const got = meta.endings.includes(E.id);
      const d = document.createElement('div');
      d.className = 'it' + (got ? '' : ' locked') + (E.kind === '히든' ? ' hidden-kind' : '');
      d.innerHTML = `<b></b><i></i><p></p>`;
      d.querySelector('b').textContent = got ? E.name : '？？？';
      d.querySelector('i').textContent = E.kind;
      d.querySelector('p').textContent = got ? E.desc : E.hint;
      list.appendChild(d);
    }
    el.gallery.classList.add('on');
  };

  UI.closeAll = function () {
    for (const k of ['menu', 'place', 'gallery', 'ending', 'choices']) el[k].classList.remove('on');
    el.dlg.classList.remove('on'); el.catch.classList.remove('on');
    pending = null;
  };
})(typeof globalThis !== 'undefined' ? globalThis : window);
