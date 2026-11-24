// Plays one part of the game and writes every line in order.
// node cap.js <root> pro <out.json>   — title → prologue → chapter 1 (keyboard only)
// node cap.js <root> chN <out.json>   — one stage chapter, driven by its want()
const { chromium } = require('playwright');
const fs = require('fs');
const [root, part, out, maxS = '1500'] = process.argv.slice(2);
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1280, height: 720 }, locale: 'ko-KR' });
  await ctx.addInitScript({ path: __dirname + '/hook.js' });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('file://' + root + '/index.html' + (part === 'pro' ? '' : '#' + part));
  await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(600);
  const sceneNow = () => p.evaluate(() => Object.keys(TYT.scenes).find((k) => TYT.scenes[k] === TYT.director.cur));
  const t0 = Date.now(); let seen = [];
  if (part === 'pro') {
    await p.evaluate(() => { TYT.speed = 3; });
    while (Date.now() - t0 < +maxS * 1000) {
      const st = await p.evaluate(() => { const s = TYT.scenes.harbor, cur = Object.keys(TYT.scenes).find((k) => TYT.scenes[k] === TYT.director.cur); return { cur, leave: cur === 'harbor' && s.canLeave, game: cur === 'harbor' && s.game ? s.game.next() : null }; });
      if (seen[seen.length - 1] !== st.cur) seen.push(st.cur);
      if (st.leave || (st.cur && /^ch[2-9]$/.test(st.cur))) break;
      await p.keyboard.press(st.game || 'Enter');
      await p.waitForTimeout(st.game ? 150 : 240);
    }
    await p.waitForTimeout(4000);
  } else {
    await p.evaluate((part) => {
      TYT.speed = 4; window.__end = null;
      const KEY = { talk: 'Enter', any: 'Enter', tap: 'Enter', next: 'Enter', lamp: 'Enter', up: 'ArrowUp', right: 'ArrowRight', left: 'ArrowLeft', paint: ' ', mote: 'Enter', hold: 'ArrowRight' };
      const fire = (k) => { window.dispatchEvent(new KeyboardEvent('keydown', { key: k })); window.dispatchEvent(new KeyboardEvent('keyup', { key: k })); };
      setInterval(() => {
        const s = TYT.director.cur, name = Object.keys(TYT.scenes).find((k) => TYT.scenes[k] === s);
        if (name !== part) { if (window.__end == null) window.__end = TYT.time; fire('Enter'); return; }
        const g = s.game; TYT.speed = g && g.bands ? 1 : 4;
        const w = s.want && s.want(); if (!w || w === 'busy') return;
        if (w === 'next') { if (window.__end == null) window.__end = TYT.time; }
        fire(w.startsWith('key:') ? w.slice(4) : KEY[w] || 'Enter');
      }, 110);
    }, part);
    while (Date.now() - t0 < +maxS * 1000) { if (await p.evaluate('window.__end != null')) break; await p.waitForTimeout(1000); }
    // after the chapter: let what follows it (end card, next title) show for a little while
    await p.waitForTimeout(part === 'ch9' ? 60000 : 8000);
    seen = [part, await sceneNow()];
  }
  const lines = await p.evaluate(() => window.__lines);
  fs.writeFileSync(out, JSON.stringify({ part, through: seen, seconds: Math.round((Date.now() - t0) / 1000), errors: errs, lines }, null, 0));
  console.log(JSON.stringify({ part, through: seen.join('>'), lines: lines.length, says: lines.filter((l) => l.t === 'say').length, errors: errs.length, seconds: Math.round((Date.now() - t0) / 1000) }));
  await b.close();
})();
