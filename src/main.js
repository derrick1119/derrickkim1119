/* Take Your Time — boot. Waits for the two typefaces, then opens on the hospital room. */
(function () {
  'use strict';
  const T = window.TYT;

  /* #name jumps, for looking at one scene while working on it */
  function jump(name) {
    const st = T.state;
    const mark = (n) => { ['drawing', 'book', 'leash', 'photo'].slice(0, n).forEach((id) => { st.done[id] = true; }); st.count = n; };
    if (name === 'hub') return ['room', {}];
    if (name === 'night') { mark(2); return ['room', {}]; }
    if (name === 'dawn') { mark(4); return ['room', {}]; }
    if (name === 'final') { mark(4); st.together = true; return ['room', { final: true }]; }
    if (['home', 'stew', 'swing', 'walk', 'ending', 'kitchen'].includes(name)) return [name, {}];
    if (['sea', 'quay', 'street', 'hills', 'house', 'top'].includes(name)) return ['harbor', { cp: name }];
    if (/^ch[2-7]$/.test(name) && T.scenes[name]) return [name, {}];
    return null;
  }

  function start(saved) {
    T.P.clearLayout();
    const st = T.state;
    let first = ['room', { title: true }];
    if (saved && saved.chapter === 1) first = saved.cp ? ['harbor', { cp: saved.cp }] : ['kitchen', {}];
    else if (saved && saved.chapter > 1 && T.scenes['ch' + saved.chapter]) first = ['ch' + saved.chapter, {}];
    else if (saved && saved.done && saved.count > 0) {
      Object.assign(st.done, saved.done); st.count = saved.count; st.together = !!saved.together;
      first = ['room', st.together ? { final: true } : {}];
    }
    const j = jump((location.hash || '').replace('#', ''));
    if (j) first = j;
    T.run(first[0], first[1]);
  }

  function boot() {
    /* keep a viewer's place if the page is republished under them */
    const hot = window.claude && window.claude.hot;
    if (hot && hot.snapshot) hot.snapshot(() => ({ done: T.state.done, count: T.state.count, together: T.state.together, chapter: T.state.chapter, cp: T.state.cp }));
    if (hot && hot.ready) hot.ready(start); else start((hot && hot.data) || {});
  }

  const fonts = document.fonts && document.fonts.load
    ? Promise.all([document.fonts.load('40px "TYT Hand"', '천천히 와'), document.fonts.load('40px "TYT Batang"', '천천히 와')])
    : Promise.resolve();
  Promise.race([fonts, new Promise((res) => setTimeout(res, 3500))]).then(boot, boot);
})();
