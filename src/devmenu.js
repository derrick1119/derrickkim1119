/* Take Your Time — the test menu. NOT FOR RELEASE.
   A "TEST" button beside the settings gear opens a sheet of buttons: jump straight to any chapter
   or scene, run the game faster, or have the puzzle in hand play itself.
   To take it out, delete this file's <script> line from index.html (nothing else refers to it);
   `python3 tools/bundle.py --release` leaves it out of the single-file build by itself. */
(function () {
  'use strict';
  const T = window.TYT;
  const wrap = document.getElementById('wrap'), mute = document.getElementById('mute');
  if (!T || !wrap || !mute) return;
  const el = (tag, css, text) => { const e = document.createElement(tag); if (css) e.style.cssText = css; if (text) e.textContent = text; return e; };

  /* [heading, [[label, #name], …]] — the names are the ones main.js understands */
  const GROUPS = [
    ['프롤로그', [['제목 화면', 'title'], ['병실 (처음)', 'hub'], ['마지막 대화', 'final'], ['약속 목록 (끝)', 'ending']]],
    ['프롤로그의 기억', [['스튜', 'stew'], ['산책', 'walk'], ['그네', 'swing'], ['첫 집', 'home']]],
    ['1장 「항구」', [['아나의 부엌', 'kitchen'], ['구름바다', 'sea'], ['부두', 'quay'], ['마을 길', 'street'], ['언덕길', 'hills'], ['엄마 집', 'house'], ['언덕 꼭대기', 'top']]],
    ['2장부터', [['2장 약속 목록', 'ch2'], ['3장 꿈', 'ch3'], ['4장 이웃들', 'ch4'], ['5장 꽃길', 'ch5'], ['6장 다 지킨 약속', 'ch6'], ['마지막 장 마중', 'ch7']]],
  ];
  const NAMES = { room: '프롤로그 병실', ending: '프롤로그 끝', stew: '기억: 스튜', walk: '기억: 산책', swing: '기억: 그네', home: '기억: 첫 집', kitchen: '1장 아나의 부엌', harbor: '1장 항구', ch2: '2장', ch3: '3장', ch4: '4장', ch5: '5장', ch6: '6장', ch7: '마지막 장' };

  /* ---------- the button ---------- */
  const open = el('button', 'position:absolute;z-index:2;height:40px;padding:0 14px;border:0;border-radius:20px;background:rgba(201,87,63,.86);color:#fff6e4;cursor:pointer;font:700 13px/40px system-ui,sans-serif;letter-spacing:.08em', 'TEST');
  open.type = 'button'; open.id = 'dev'; open.setAttribute('aria-label', '테스트 메뉴');
  wrap.appendChild(open);
  const place = () => { open.style.left = mute.offsetLeft - 48 - open.offsetWidth - 8 + 'px'; open.style.top = mute.offsetTop + 'px'; };
  window.addEventListener('resize', () => setTimeout(place, 0));
  [0, 300, 1200].forEach((ms) => setTimeout(place, ms));

  /* ---------- the sheet ---------- */
  const veil = el('div', 'position:absolute;inset:0;z-index:6;display:none;place-items:center;background:rgba(14,20,32,.66)');
  veil.id = 'devsheet'; veil.setAttribute('role', 'dialog'); veil.setAttribute('aria-label', '테스트 메뉴');
  const box = el('div', 'box-sizing:border-box;width:min(96vw,860px);max-height:96vh;overflow:auto;padding:10px 16px 8px;border-radius:14px;background:#f7eddb;color:#33405c;font:15px/1.5 "TYT Batang",serif;box-shadow:0 18px 60px rgba(0,0,0,.45)');
  veil.appendChild(box); wrap.appendChild(veil);
  const head = el('div', 'display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:4px');
  head.appendChild(el('div', 'font-size:17px;letter-spacing:.2em', '테스트 메뉴'));
  const now = el('div', 'font-size:13px;color:#8a5a50');
  head.appendChild(now);
  head.appendChild(el('div', 'font-size:12px;color:#6b6258;flex:1;min-width:150px', '출시 전에 빼는 화면. 누르면 그 장면의 처음으로 갑니다.'));
  box.appendChild(head);
  const pill = 'min-height:36px;padding:3px 11px;border:1.5px solid #33405c;border-radius:10px;background:transparent;color:#33405c;cursor:pointer;font:inherit;font-size:14px';
  const row = () => { const r = el('div', 'display:flex;flex-wrap:wrap;gap:6px;margin:2px 0 6px'); box.appendChild(r); return r; };
  const button = (parent, text, fn, css) => { const b = el('button', pill + (css || ''), text); b.type = 'button'; b.addEventListener('click', () => fn(b)); parent.appendChild(b); return b; };
  GROUPS.forEach((gq) => {
    box.appendChild(el('div', 'font-size:12px;letter-spacing:.12em;color:#8a5a50', gq[0]));
    const r = row();
    gq[1].forEach((q) => { const b = button(r, q[0], () => { show(false); T.jump(q[1]); }); b.dataset.jump = q[1]; });
  });
  /* speed */
  box.appendChild(el('div', 'font-size:12px;letter-spacing:.12em;color:#8a5a50', '빠르기 · 도구'));
  const speeds = row(), speedBtn = [];
  [1, 2, 4].forEach((n) => { const b = button(speeds, n + '배', () => { T.speed = n; paint(); }); b.dataset.speed = n; speedBtn.push([n, b]); });
  /* the puzzle in hand, played by itself: the same hint the game would show, pressed for you */
  let solving = null;
  function solve() {
    if (solving) return;
    let idle = 0, ticks = 0;
    solving = setInterval(() => {
      const s = T.director.cur;
      let k = null, active = false;
      try {
        active = !!(s && (s.game || (s.view && (s.view.ring || s.view.rh))));
        if (s && s.game && s.game.next) k = s.game.next();
        else if (s && s.want) { const w = s.want(); if (w && w.indexOf('key:') === 0) k = w.slice(4); }
        if (k && s.key) s.key(k);
      } catch (e) { active = false; idle = 99; }
      idle = active ? 0 : idle + 1;
      if (idle > 10 || ++ticks > 700) { clearInterval(solving); solving = null; }
    }, 140);
  }
  button(speeds, '지금 퍼즐 대신 풀기', () => { show(false); solve(); }, ';margin-left:10px').id = 'devsolve';
  const artBtn = button(speeds, '', () => { T.setArt(T.ART === 'concept' ? 'classic' : 'concept'); paint(); }, ';margin-left:10px');
  artBtn.id = 'devart';
  button(head, '닫기', () => show(false), ';background:#33405c;color:#fff6e4').id = 'devclose';

  function paint() {
    const s = T.director.cur, key = Object.keys(T.scenes).find((k) => T.scenes[k] === s);
    now.textContent = '지금: ' + (NAMES[key] || key || '') + (key === 'harbor' && T.state.cp ? ' (' + T.state.cp + ')' : '');
    artBtn.textContent = '프롤로그 그림체: ' + (T.ART === 'concept' ? '컨셉' : '이전') + ' (바꾸기)';
    speedBtn.forEach((q) => { const on = (T.speed || 1) === q[0]; q[1].style.background = on ? '#33405c' : 'transparent'; q[1].style.color = on ? '#fff6e4' : '#33405c'; });
  }
  function show(on) {
    veil.style.display = on ? 'grid' : 'none';
    T.paused = on;
    if (on) paint();
  }
  open.addEventListener('click', () => show(veil.style.display === 'none'));
  veil.addEventListener('click', (e) => { if (e.target === veil) show(false); });
  window.addEventListener('keydown', (e) => {
    if (e.key === '`') show(veil.style.display === 'none');
    else if (e.key === 'Escape' && veil.style.display !== 'none') show(false);
  });
})();
