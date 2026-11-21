/* Take Your Time — settings: a small sheet of paper over the game. Volume, full screen, starting over. */
(function () {
  'use strict';
  const T = window.TYT, A = T.audio;
  const saved = T.store.get('tyt-set') || {};
  A.setVolume('music', saved.music == null ? 1 : saved.music);
  A.setVolume('fx', saved.fx == null ? 1 : saved.fx);
  const wrap = document.getElementById('wrap'), mute = document.getElementById('mute');
  const el = (tag, css, text) => { const e = document.createElement(tag); if (css) e.style.cssText = css; if (text) e.textContent = text; return e; };

  const gear = el('button', 'position:absolute;z-index:2;width:40px;height:40px;padding:0;border:0;border-radius:50%;background:rgba(22,29,42,.38);color:#f3ead8;cursor:pointer;opacity:.7;display:grid;place-items:center');
  gear.type = 'button'; gear.id = 'gear'; gear.setAttribute('aria-label', '설정');
  gear.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M4 7h9M19 7h1M4 17h1M11 17h9"/><circle cx="16" cy="7" r="2.4"/><circle cx="8" cy="17" r="2.4"/></svg>';
  wrap.appendChild(gear);
  const place = () => { gear.style.left = mute.offsetLeft - 48 + 'px'; gear.style.top = mute.offsetTop + 'px'; };
  window.addEventListener('resize', () => setTimeout(place, 0));
  [0, 300, 1200].forEach((ms) => setTimeout(place, ms));

  const veil = el('div', 'position:absolute;inset:0;z-index:5;display:none;place-items:center;background:rgba(14,20,32,.62)');
  veil.setAttribute('role', 'dialog'); veil.setAttribute('aria-label', '설정');
  const box = el('div', 'box-sizing:border-box;width:min(88vw,420px);max-height:92vh;overflow:auto;padding:20px 24px 16px;border-radius:14px;background:#f7eddb;color:#33405c;font:16px/1.6 "TYT Batang",serif;box-shadow:0 18px 60px rgba(0,0,0,.45)');
  const labels = [];   /* [element, Korean text]: said again in the other language when it changes */
  const say = (e, ko) => { labels.push([e, ko]); e.textContent = T.tr(ko); return e; };
  box.appendChild(say(el('div', 'font-size:21px;letter-spacing:.3em;margin-bottom:6px'), '설정'));
  const slider = (label, kind) => {
    const row = el('label', 'display:block;margin:12px 0');
    row.appendChild(say(el('div', ''), label));
    const r = el('input', 'width:100%;accent-color:#c9573f;height:28px');
    r.type = 'range'; r.min = 0; r.max = 100; r.value = Math.round(A.vol[kind] * 100);
    r.addEventListener('input', () => { A.unlock(); A.setVolume(kind, r.value / 100); keep(); });
    r.addEventListener('change', () => { if (kind === 'fx') A.sfx('touch'); else A.note({ m: 69, vel: 0.4, voice: 'felt' }); });
    row.appendChild(r); box.appendChild(row);
  };
  const keep = () => T.store.set('tyt-set', { music: A.vol.music, fx: A.vol.fx, lang: T.lang });
  /* language: two plain buttons, each written in its own language */
  const langRow = el('div', 'display:flex;gap:8px;margin:8px 0 2px');
  const langBtn = {};
  [['ko', '한국어'], ['en', 'English']].forEach((q) => {
    const b = el('button', 'flex:1;padding:9px 8px;border-radius:10px;cursor:pointer;font:inherit', q[1]);
    b.type = 'button'; b.lang = q[0];
    b.addEventListener('click', () => { T.setLang(q[0]); keep(); relabel(); T.restyle(T.P.look); });
    langBtn[q[0]] = b; langRow.appendChild(b);
  });
  box.appendChild(langRow);
  function relabel() {
    labels.forEach((q) => { q[0].textContent = T.tr(q[1]); });
    Object.keys(langBtn).forEach((k) => { const on = k === T.lang; langBtn[k].style.cssText += ';border:2px solid #33405c;background:' + (on ? '#33405c' : 'transparent') + ';color:' + (on ? '#fff6e4' : '#33405c'); langBtn[k].setAttribute('aria-pressed', on ? 'true' : 'false'); });
    gear.setAttribute('aria-label', T.tr('설정')); veil.setAttribute('aria-label', T.tr('설정'));
    A.setMuted(A.muted);
  }
  slider('음악', 'music');
  slider('효과음과 주변 소리', 'fx');
  const btn = (text, fn, quiet) => {
    const b = el('button', 'display:block;width:100%;margin:10px 0 0;padding:11px 12px;border:0;border-radius:10px;cursor:pointer;font:inherit;' + (quiet ? 'background:transparent;color:#8a5a50;text-decoration:underline' : 'background:#33405c;color:#fff6e4'));
    say(b, text);
    b.type = 'button'; b.addEventListener('click', () => fn(b)); box.appendChild(b); return b;
  };
  if (document.documentElement.requestFullscreen) btn('전체 화면 켜기 / 끄기', () => { try { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen(); } catch (_) { /* not allowed here */ } });
  btn('닫고 계속하기', () => show(false));
  let armed = false;
  const wipe = btn('저장을 지우고 처음부터', (b) => {
    if (!armed) { armed = true; b.textContent = T.tr('정말 지울까요? 한 번 더 누르면 지워져요'); return; }
    const st = T.state;
    T.clearGame();
    Object.keys(st.done).forEach((id) => { st.done[id] = false; });
    st.count = 0; st.order = []; st.together = false; st.chapter = 0; st.cp = null;
    A.pad(null);
    show(false);
    T.director.go('room', { style: 'fade', color: '#161d2a', out: 0.8, in: 1.2, args: { title: true } });
  }, true);
  veil.appendChild(box); wrap.appendChild(veil);
  function show(on) {
    veil.style.display = on ? 'grid' : 'none';
    T.paused = on; armed = false; wipe.textContent = T.tr('저장을 지우고 처음부터');
    if (!on) document.getElementById('stage').focus();
  }
  gear.addEventListener('click', () => show(veil.style.display === 'none'));
  veil.addEventListener('click', (e) => { if (e.target === veil) show(false); });
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape') show(veil.style.display === 'none'); });
  relabel();
  T.settings = { show };
})();
