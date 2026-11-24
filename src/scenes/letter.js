/* Take Your Time — the epilogue: a letter of the player's own.
   The world of the game rests on one belief: what the living do for the departed reaches them. At the very end it is
   handed to the player. After the three of them have said it to Lily, the view goes below, to the living world at
   night: a window, a desk, a blank sheet and a pencil, and nobody there. The player may write a line or two to
   someone (someone who went first, or someone still near), or go on without writing; either is just as fine.
   A letter, sent, is folded by the wind from the open window into a paper bird, which goes out under the sash and
   up into the clouds. At dawn the postman of the wind post office catches it, looks at it without
   reading it out, and lets it into a pigeonhole. Then a postcard of it can be kept, and the end card comes as before.
   Nothing is sent anywhere: the last letter is kept on the device (T.store 'tyt-letter'), and the postcard is drawn
   here and saved from here. Once a letter has gone up, a small paper bird rests on the hospital window sill on the
   title screen.
     T.letter.epilogue(X, o) -> Promise   called at the end of ch9_welcome.js, before X.end(); o.tuneEnd is when
                                          (performance.now()) the music box tune under the last line will be over
     T.letter.sill(g, a)                  room.js, on the title: the paper bird on the sill (a: the title's alpha)
     T.letter.last()                      the letter kept, { text, at }, or null
   The words are typed in a real <textarea> laid over the paper (Korean input, phone keyboards, screen readers),
   set in a fuller cut of the hand font, assets/fonts/hand-letter.woff2 ('TYT Letter', every Hangul syllable),
   loaded only when the epilogue opens; until it has loaded, the subset hand and the system's take over. On a narrow
   or short screen the textarea moves into a card at the top of the screen instead. index.html#letter plays the
   epilogue on its own (for working on it). */
(function () {
  'use strict';
  const T = window.TYT, P = T.P, F = T.F;
  const TAU = Math.PI * 2;
  const STORE = 'tyt-letter', MAX = 60, BREAKS = 2;
  const FONT_URL = 'assets/fonts/hand-letter.woff2', FAMILY = 'TYT Letter';
  const HAND = '"' + FAMILY + '", "TYT Hand", "Nanum Pen Script", cursive';
  const SERIF = '"TYT Batang", "Gowun Batang", "Noto Serif KR", serif';
  const INK = '#363a4f', SHEET = '#f4ecdc', BACK = '#e6dccb';
  const LHK = 1.45;   /* line height, in sizes of the hand */
  const BOT = 'Thank you, and take care.';   /* what the test driver writes (navigator.webdriver only) */

  /* ---------- the hand to write in: loaded when the epilogue opens ---------- */
  let fontP = null;
  function loadFont() {
    if (fontP) return fontP;
    if (!window.FontFace || !document.fonts) return (fontP = Promise.resolve(false));
    try {
      const ff = new FontFace(FAMILY, 'url(' + FONT_URL + ') format("woff2")', { display: 'swap' });
      fontP = ff.load().then((f) => { document.fonts.add(f); if (P.clearLayout) P.clearLayout(); return true; }, () => false);
    } catch (e) { fontP = Promise.resolve(false); }
    return fontP;
  }
  const realWait = (ms) => new Promise((res) => setTimeout(res, ms));

  /* ---------- what is kept: only the last letter, only here ---------- */
  let kept;
  function last() {
    if (kept === undefined) { const v = T.store.get(STORE); kept = v && typeof v.text === 'string' && v.text ? v : null; }
    return kept;
  }
  function keep(text) { kept = { text, at: Date.now() }; T.store.set(STORE, kept); }

  /* ---------- lines of handwriting ----------
     Broken the way the textarea breaks them (word-break: keep-all; overflow-wrap: anywhere), so that the words on
     the paper after sending sit where they were typed */
  let mg = null;
  function measure() { if (!mg) mg = document.createElement('canvas').getContext('2d'); return mg; }
  function wrap(g, text, width) {
    const out = [];
    for (const para of text.split('\n')) {
      let line = '';
      for (const word of para.split(' ')) {
        const cand = line ? line + ' ' + word : word;
        if (g.measureText(cand).width <= width || !line && !word) { line = cand; continue; }
        if (line) out.push(line);
        line = '';
        if (g.measureText(word).width <= width) { line = word; continue; }
        for (const ch of Array.from(word)) {   /* a word longer than the line: anywhere */
          if (line && g.measureText(line + ch).width > width) { out.push(line); line = ch; } else line += ch;
        }
      }
      out.push(line);
    }
    return out;
  }
  /* the sheet's box for the words (in the paper's own frame), and the size of hand that fits them in it */
  const PAPER = { cx: 0, cy: 660, w: 700, h: 250, rot: -0.012 };
  const BOX = { x0: -305, x1: 305, y0: 548, h: 214 };
  const SIZES = [44, 40, 36, 33, 30];
  function fit(text) {
    const g = measure();
    for (const s of SIZES) {
      g.font = s + 'px ' + HAND;
      const lines = wrap(g, text || ' ', BOX.x1 - BOX.x0);
      if (lines.length * s * LHK <= BOX.h + 0.5 || s === SIZES[SIZES.length - 1]) return { size: s, lines };
    }
    return null;
  }
  function inkLines(g, text, x, y, a) {
    const f = fit(text), lh = f.size * LHK;
    g.save(); g.globalAlpha *= a; g.font = f.size + 'px ' + HAND; g.fillStyle = INK; g.textBaseline = 'alphabetic'; g.textAlign = 'left';
    f.lines.forEach((ln, i) => g.fillText(ln, x, y + (lh - f.size) / 2 + f.size * 0.8 + i * lh));
    g.restore();
  }

  /* ---------- the paper bird ----------
     Folded from the sheet: a paper crane, its tail and its neck pointing up, the head turned down at the tip, the wings
     from the middle of its back. Faces +x; s 1 is about 120 long. o: { up (the wings: -0.5 down … 1 up), a, rot, flip,
     tone (the paper) }. birdPts(up) is its outline, which the folded sheet turns into */
  const wingTip = (up) => [-6 + 6 * (1 - up), -6 - 56 * up];
  function birdPts(up) {
    return [[-62, -38], [-24, -6], [-14, -6], wingTip(up), [14, -6], [26, -6], [50, -42], [60, -32], [44, -32], [18, 6], [0, 13], [-18, 6], [-58, -33]];
  }
  function bird(g, x, y, s, o = {}) {
    const up = o.up == null ? 0.55 : o.up, paper = o.tone || SHEET;
    const lit = T.shade(paper, 0.07), mid = T.shade(paper, -0.09), dark = T.shade(paper, -0.22);
    const q = birdPts(up), wt = q[3], wf = [wt[0] + 4, wt[1] + 3 * (up > 0 ? 1 : -1)];
    g.save(); g.translate(x, y); if (o.rot) g.rotate(o.rot); g.scale(o.flip ? -s : s, s);
    if (o.a != null && o.a < 1) g.globalAlpha *= o.a;
    const tri = (pts, c) => { g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.closePath(); g.fillStyle = c; g.fill(); };
    tri([[-10, -7], wf, [17, -7]], dark);   /* the far wing, behind */
    tri([q[0], q[1], [-20, 0]], lit); tri([q[0], [-20, 0], q[11], q[12]], mid);   /* the tail */
    tri([q[1], [0, -8], q[5], q[9], q[10], q[11]], lit); tri([q[11], q[10], q[9], [0, 3]], mid);   /* the body */
    tri([q[5], q[6], q[8], q[9]], lit); tri([[24, -1], q[8], q[9]], mid);   /* the neck */
    tri([q[6], q[7], q[8]], mid);   /* the head, folded down */
    const mr = [0, -6];
    tri([q[2], wt, mr], mid); tri([mr, wt, q[4]], T.shade(paper, -0.02));   /* the near wing, and its fold */
    g.strokeStyle = 'rgba(80,70,90,0.3)'; g.lineWidth = 1.1 / Math.max(0.4, s); g.lineJoin = 'round';
    g.beginPath(); g.moveTo(mr[0], mr[1]); g.lineTo(wt[0], wt[1]); g.moveTo(q[0][0], q[0][1]); g.lineTo(-20, 0); g.moveTo(24, -1); g.lineTo(q[6][0], q[6][1]); g.stroke();
    g.restore();
  }
  /* n points round a rectangle, clockwise from its top left: what the folded sheet starts from */
  function rectPts(x, y, w, h, n) {
    const per = 2 * (w + h), out = [];
    for (let i = 0; i < n; i++) {
      let d = (i / n) * per;
      if (d < w) { out.push([x + d, y]); continue; } d -= w;
      if (d < h) { out.push([x + w, y + d]); continue; } d -= h;
      if (d < w) { out.push([x + w - d, y + h]); continue; } d -= w;
      out.push([x, y + h - d]);
    }
    return out;
  }

  /* ---------- down below, one night: the room ---------- */
  const WIN = { x0: -400, x1: 400, y0: 56, y1: 470, rail: 298 };   /* the frame; under the rail the sash is raised, open */
  const GL = { x0: -380, x1: 380, y0: 76, y1: 452 };                /* the glass, and the open air under the rail */
  const DESK = 520, LAMP = [-500, 470], MOON = [-292, 122], CLOUD = [262, 116];   /* the bird goes into the cloud at the top right */
  function room() {
    const V = { dark: true, quiet: true, lookAs: 'roomNight', phase: 'still', lamp: { k: 0 }, words: { a: 0 }, ink: { a: 0 }, text: '', fold: null, bird: null, fly: { k: 0 },
      cam: { x: 0, y: 450, z: 1 }, gust: { k: 0 }, glint: { k: 0 }, focus: 0, L: null, gen: -1, t: 0 };
    V.light = () => (V.lamp.k > 0.3 ? [LAMP[0] + 60, LAMP[1] + 60, 660] : [MOON[0] - 60, 240, 420]);
    V.build = () => { V.L = null; };
    const W = () => T.view.W;
    const mugX = () => Math.min(W() / 2 - 120, 500);

    function bakeOut() {
      const w = GL.x1 - GL.x0, h = GL.y1 - GL.y0;
      return T.bake(GL.x0, GL.y0, w, h, (g) => {
        const sky = g.createLinearGradient(0, GL.y0, 0, GL.y1);
        sky.addColorStop(0, '#0f1638'); sky.addColorStop(0.55, '#1f2958'); sky.addColorStop(0.86, '#33407a'); sky.addColorStop(1, '#46508a');
        g.fillStyle = sky; g.fillRect(GL.x0, GL.y0, w, h);
        const r = T.rng(808);
        for (let i = 0; i < 90; i++) {   /* the stars, thinning towards the glow of the town */
          const x = GL.x0 + r() * w, y = GL.y0 + Math.pow(r(), 1.6) * (h - 80), s = 0.6 + r() * 1.3;
          g.globalAlpha = 0.35 + 0.5 * r() * (1 - (y - GL.y0) / h); g.fillStyle = '#fff6e8'; g.beginPath(); g.arc(x, y, s, 0, TAU); g.fill();
        }
        g.globalAlpha = 1;
        /* the moon, a thin one, and the light round it */
        P.glow(g, MOON[0], MOON[1], 150, '#c8d4ff', 0.28);
        g.save(); g.beginPath(); g.arc(MOON[0], MOON[1], 22, 0, TAU); g.clip();
        g.fillStyle = '#fff4dc'; g.fillRect(MOON[0] - 24, MOON[1] - 24, 48, 48);
        g.fillStyle = sky; g.beginPath(); g.arc(MOON[0] + 9, MOON[1] - 6, 19, 0, TAU); g.fill(); g.restore();
        /* clouds lit by it: a bank across the top on the right (where the bird goes in), a long low one over the
           roofs; the middle of the sky is left clear, for the words */
        P.cumulus(g, CLOUD[0] - 46, CLOUD[1] + 26, 190, 811, { lit: '#c6cbec', shade: '#4a5288', a: 0.95, sun: -1 });
        P.cumulus(g, CLOUD[0] + 80, CLOUD[1] + 16, 150, 812, { lit: '#d2d4f0', shade: '#525a90', a: 0.9, sun: -1 });
        P.cumulus(g, CLOUD[0] - 170, CLOUD[1] + 4, 110, 815, { lit: '#a9b0de', shade: '#3e4880', a: 0.7, sun: -1 });
        P.cumulus(g, -20, 424, 360, 814, { lit: '#6e78b0', shade: '#2c3666', a: 0.4, sun: -1 });
        /* the town asleep, a few windows still lit */
        const hill = (y0, c, seed, amp) => { const rr = T.rng(seed); g.fillStyle = c; g.beginPath(); g.moveTo(GL.x0, GL.y1); for (let x = GL.x0; x <= GL.x1 + 20; x += 40) g.lineTo(x, y0 + Math.sin(x * 0.01 + seed) * amp + rr() * 6); g.lineTo(GL.x1, GL.y1); g.closePath(); g.fill(); };
        hill(400, '#26305e', 821, 10);
        const rr = T.rng(822);
        g.fillStyle = '#171d3c';
        for (let x = GL.x0 - 10; x < GL.x1; ) {
          const bw = 40 + rr() * 60, bh = 26 + rr() * 34, y = GL.y1 - bh;
          g.beginPath(); g.moveTo(x, GL.y1); g.lineTo(x, y); g.lineTo(x + bw / 2, y - 12 - rr() * 14); g.lineTo(x + bw, y); g.lineTo(x + bw, GL.y1); g.closePath(); g.fill();
          if (rr() < 0.4) g.fillRect(x + bw * 0.7, y - 18, 6, 14);
          for (let k = 0; k < 2; k++) if (rr() < 0.32) { g.fillStyle = '#ffcf86'; g.fillRect(x + 8 + rr() * (bw - 20), y + 8 + rr() * (bh - 18), 5, 6); g.fillStyle = '#171d3c'; }
          x += bw + rr() * 6;
        }
      }, 2);
    }
    function bakeRoom() {
      const Wv = W(), x0 = -Wv / 2 - 40, w = Wv + 80;
      return T.bake(x0, -20, w, 940, (g) => {
        /* the wall, moonlit */
        const wg = g.createLinearGradient(0, -20, 0, DESK); wg.addColorStop(0, '#191c36'); wg.addColorStop(1, '#2a2d50');
        g.fillStyle = wg; g.fillRect(x0, -20, w, DESK + 30);
        const r = T.rng(831);
        for (let x = x0 + 30; x < x0 + w; x += 64) { g.fillStyle = 'rgba(160,160,220,0.035)'; g.fillRect(x, -20, 22, DESK + 20); }   /* a faint stripe in the paper */
        for (let i = 0; i < 60; i++) { g.fillStyle = 'rgba(200,200,255,0.03)'; g.fillRect(x0 + r() * w, r() * DESK, 3, 3); }
        /* the window: the frame round the glass, the rail of the raised sash, the sill */
        g.save(); g.globalCompositeOperation = 'destination-out'; g.fillStyle = '#000'; g.fillRect(GL.x0, GL.y0, GL.x1 - GL.x0, GL.y1 - GL.y0); g.restore();
        const fr = '#8a87a8', frL = '#a9a6c6', frD = '#5f5c80';
        P.fill(g, P.rr(WIN.x0, WIN.y0, WIN.x1 - WIN.x0, 22, 2), fr);
        P.fill(g, P.rr(WIN.x0, WIN.y0, 22, WIN.y1 - WIN.y0, 2), fr);
        P.fill(g, P.rr(WIN.x1 - 22, WIN.y0, 22, WIN.y1 - WIN.y0, 2), fr);
        g.fillStyle = frD; g.fillRect(GL.x0, GL.y0, GL.x1 - GL.x0, 4); g.fillRect(GL.x0, GL.y0, 4, GL.y1 - GL.y0); g.fillRect(GL.x1 - 4, GL.y0, 4, GL.y1 - GL.y0);
        P.fill(g, P.rr(GL.x0 - 4, WIN.rail - 2, GL.x1 - GL.x0 + 8, 18, 2), fr);   /* the raised sash's bottom rail */
        g.fillStyle = frL; g.fillRect(GL.x0, WIN.rail - 2, GL.x1 - GL.x0, 3);
        g.fillStyle = frD; g.fillRect(GL.x0, WIN.rail + 14, GL.x1 - GL.x0, 3);
        P.fill(g, P.rr(-24, WIN.rail + 2, 48, 9, 3), '#b8a070');   /* its lift */
        P.fill(g, P.rr(-432, 450, 864, 22, 3), '#9592b2');   /* the sill */
        g.fillStyle = '#b4b1cf'; g.fillRect(-430, 450, 860, 3);
        const ss = g.createLinearGradient(0, 472, 0, 500); ss.addColorStop(0, 'rgba(8,10,24,0.45)'); ss.addColorStop(1, 'rgba(8,10,24,0)');
        g.fillStyle = ss; g.fillRect(-440, 472, 880, 28);
        /* the rod the curtains hang from */
        P.line(g, -500, 40, 500, 40, 5, '#6a6688'); P.fill(g, P.circle(-504, 40, 7), '#7a7698'); P.fill(g, P.circle(504, 40, 7), '#7a7698');
        /* the desk */
        const dg = g.createLinearGradient(0, DESK, 0, 920); dg.addColorStop(0, '#3a2a2e'); dg.addColorStop(1, '#4a3434');
        g.fillStyle = dg; g.fillRect(x0, DESK, w, 940 - DESK);
        for (let i = 0; i < 46; i++) {   /* the grain */
          const y = DESK + 6 + r() * (900 - DESK), xs = x0 + r() * w, len = 200 + r() * 500;
          g.strokeStyle = r() < 0.5 ? 'rgba(10,6,12,0.16)' : 'rgba(255,214,180,0.05)'; g.lineWidth = 1 + r() * 1.6;
          g.beginPath(); g.moveTo(xs, y); g.bezierCurveTo(xs + len * 0.3, y + (r() - 0.5) * 6, xs + len * 0.6, y + (r() - 0.5) * 6, xs + len, y + (r() - 0.5) * 4); g.stroke();
        }
        g.fillStyle = '#5c4444'; g.fillRect(x0, DESK, w, 3);
        const js = g.createLinearGradient(0, DESK - 26, 0, DESK); js.addColorStop(0, 'rgba(8,10,24,0)'); js.addColorStop(1, 'rgba(8,10,24,0.35)');
        g.fillStyle = js; g.fillRect(x0, DESK - 26, w, 26);
        /* moonlight from the open sash, laid across the desk */
        g.fillStyle = 'rgba(170,186,255,0.07)'; g.beginPath(); g.moveTo(-330, DESK + 4); g.lineTo(350, DESK + 4); g.lineTo(450, 660); g.lineTo(-270, 660); g.closePath(); g.fill();
        /* the lamp, unlit: a round foot, a stem, a cloth shade */
        const lx = LAMP[0];
        P.fill(g, P.ellipse(lx, 580, 52, 12), 'rgba(6,6,16,0.35)');
        P.fill(g, P.soft([[lx - 34, 578], [lx - 40, 552], [lx - 22, 528], [lx - 9, 516], [lx + 9, 516], [lx + 22, 528], [lx + 40, 552], [lx + 34, 578]]), '#8f8a9e');
        g.fillStyle = 'rgba(255,255,255,0.1)'; g.fillRect(lx - 24, 530, 6, 36);
        P.fill(g, P.rr(lx - 4, 494, 8, 24, 2), '#6e6a80');
        P.fill(g, P.poly([[lx - 46, 432], [lx + 46, 432], [lx + 76, 500], [lx - 76, 500]]), '#7d7488');
        g.strokeStyle = 'rgba(30,24,44,0.25)'; g.lineWidth = 1.2; for (let k = -3; k <= 3; k++) { g.beginPath(); g.moveTo(lx + k * 13, 433); g.lineTo(lx + k * 21.5, 499); g.stroke(); }
        /* a mug of tea gone cold, and the pencil, waiting */
        const mx = mugX();
        P.fill(g, P.ellipse(mx, 592, 44, 10), 'rgba(6,6,16,0.32)');
        g.strokeStyle = '#8b8296'; g.lineWidth = 9; g.beginPath(); g.arc(mx + 36, 556, 17, -1.2, 1.2); g.stroke();
        P.fill(g, P.rr(mx - 34, 522, 68, 70, 12), '#a79eb2');
        g.fillStyle = 'rgba(255,255,255,0.12)'; g.fillRect(mx - 24, 530, 7, 52);
        P.fill(g, P.ellipse(mx, 523, 34, 8), '#8d84a0'); P.fill(g, P.ellipse(mx, 525, 29, 6), '#4a3036');
        g.save(); g.translate(452, 762); g.rotate(-0.32);
        P.fill(g, P.rr(-92, 6, 184, 8, 4), 'rgba(6,6,16,0.3)');
        P.fill(g, P.rr(-60, -6, 132, 12, 2), '#d1a23a'); g.fillStyle = '#e8bd52'; g.fillRect(-60, -6, 132, 4);
        P.fill(g, P.rr(72, -6, 12, 12, 1), '#a8a394'); P.fill(g, P.rr(84, -6, 12, 12, 4), '#d47f84');
        P.fill(g, P.poly([[-60, -6], [-84, 0], [-60, 6]]), '#e0c69a'); P.fill(g, P.poly([[-76, -2], [-88, 0], [-76, 2]]), '#34343e');
        g.restore();
      }, 1.6);
    }
    function ensure() { if (!V.L || V.gen !== T.gen) { V.L = { out: bakeOut(), room: bakeRoom() }; V.gen = T.gen; } }

    /* a sheer curtain each side; the right one, by the open sash, moves in the air */
    function curtain(g, xa, xb, side, sway, t) {
      const top = 36, bot = 470, n = 6;
      for (let i = 0; i < n; i++) {
        const u0 = i / n, u1 = (i + 1) / n, inner = side > 0 ? 1 - u0 : u0;
        const lift = sway * Math.pow(inner, 1.4) * 46, wob = Math.sin(t * 1.3 + i * 1.7) * 3 * (0.3 + sway);
        const xa0 = T.lerp(xa, xb, u0), xa1 = T.lerp(xa, xb, u1);
        g.beginPath(); g.moveTo(xa0, top); g.lineTo(xa1, top);
        g.quadraticCurveTo(xa1 - side * lift * 0.4 + wob, (top + bot) / 2, xa1 - side * lift + wob, bot - lift * 0.3);
        g.lineTo(xa0 - side * lift * 0.9 + wob, bot - lift * 0.28);
        g.quadraticCurveTo(xa0 - side * lift * 0.35 + wob, (top + bot) / 2, xa0, top);
        g.closePath();
        g.fillStyle = T.rgba(i % 2 ? '#b9b4d8' : '#a9a4cc', 0.34);
        g.fill();
      }
    }
    /* the sheet on the desk: flat (the words on it once written), or folding.
       fold { a: the top half down over the words, b: the left half over, c: into the bird } */
    function sheet(g) {
      const p = PAPER, w = p.w, h = p.h, f = V.fold;
      g.save(); g.translate(p.cx, p.cy); g.rotate(p.rot);
      const rect = (x, y, rw, rh, c) => { g.fillStyle = c; g.fillRect(x, y, rw, rh); };
      const words = (a) => { if (V.text) inkLines(g, V.text, BOX.x0 - p.cx, BOX.y0 - p.cy, a); };
      if (!f) {
        g.fillStyle = 'rgba(6,6,18,0.32)'; g.fillRect(-w / 2 + 6, -h / 2 + 8, w, h);
        rect(-w / 2, -h / 2, w, h, SHEET);
        g.fillStyle = 'rgba(255,255,255,0.18)'; g.fillRect(-w / 2, -h / 2, w, 3);
        if (V.focus > 0.01) { g.strokeStyle = T.rgba('#ffd9a0', 0.5 * V.focus); g.lineWidth = 3; g.strokeRect(-w / 2 - 5, -h / 2 - 5, w + 10, h + 10); }
      } else if (f.c <= 0) {
        const ca = Math.cos(Math.PI * f.a), cb = Math.cos(Math.PI * f.b);
        g.fillStyle = 'rgba(6,6,18,0.3)'; g.fillRect(-w / 2 + 6, 8 - (ca > 0 ? h / 2 * ca : 0), w, h / 2 + (ca > 0 ? h / 2 * ca : 0));
        if (f.b <= 0) {
          /* the lower half lies still; the upper half comes over it */
          g.save(); g.beginPath(); g.rect(-w / 2, 0, w, h / 2); g.clip(); rect(-w / 2, 0, w, h / 2, SHEET); words(1); g.restore();
          g.save(); g.scale(1, ca);
          if (ca > 0) { g.beginPath(); g.rect(-w / 2, -h / 2, w, h / 2); g.clip(); rect(-w / 2, -h / 2, w, h / 2, T.mix(SHEET, '#8a8098', 0.25 * (1 - ca))); words(1); }
          else rect(-w / 2, -h / 2, w, h / 2, T.mix(BACK, '#8a8098', 0.3 * (1 + ca)));
          g.restore();
        } else {
          /* folded once (the back of the upper half on top); now the left half over the right */
          rect(0, 0, w / 2, h / 2, BACK);
          g.save(); g.scale(cb, 1);
          rect(-w / 2, 0, w / 2, h / 2, cb > 0 ? T.mix(BACK, '#8a8098', 0.25 * (1 - cb)) : T.mix(SHEET, '#8a8098', 0.3 * (1 + cb)));
          g.restore();
          g.strokeStyle = 'rgba(80,70,90,0.25)'; g.lineWidth = 1; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, h / 2); g.stroke();
        }
      } else {
        /* the folded quarter turns into the bird: its corners go out to the tail, a wing, the head */
        const k = T.ease.io(f.c), B = birdPts(0.55), s = 1.5, bx = -p.cx + V.rest[0], by = -p.cy + V.rest[1];
        const Q = rectPts(0, 0, w / 2, h / 2, B.length);
        const pts = Q.map((q, i) => [T.lerp(q[0], bx + B[i][0] * s, k), T.lerp(q[1], by + B[i][1] * s, k)]);
        g.fillStyle = 'rgba(6,6,18,0.26)'; g.beginPath(); g.ellipse(T.lerp(w / 4, bx, k), T.lerp(h / 2 + 4, by + 24, k), T.lerp(w / 4, 70, k), T.lerp(10, 9, k), 0, 0, TAU); g.fill();
        g.globalAlpha = 1 - T.clamp((k - 0.82) / 0.18);
        g.beginPath(); pts.forEach((q, i) => (i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1]))); g.closePath(); g.fillStyle = T.mix(BACK, SHEET, k); g.fill();
        g.strokeStyle = 'rgba(80,70,90,0.3)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); g.lineTo(pts[10][0], pts[10][1]); g.lineTo(pts[6][0], pts[6][1]); g.stroke();
        g.globalAlpha = 1;
        if (k > 0.75) { g.rotate(-p.rot); bird(g, bx, by, s, { up: 0.55, a: T.clamp((k - 0.75) / 0.25) }); }
      }
      g.restore();
    }
    /* where the bird is on its way out: up off the desk, out under the sash, and away to the cloud by the moon */
    const bez = (a, b, c, d, u) => { const v = 1 - u; return v * v * v * a + 3 * v * v * u * b + 3 * v * u * u * c + u * u * u * d; };
    function flyAt(k) {
      const r0 = V.rest;
      if (k < 0.38) {
        const u = T.ease.io(k / 0.38);
        return { x: bez(r0[0], r0[0] + 40, 70, 112, u), y: bez(r0[1], 520, 430, 384, u), s: T.lerp(1.5, 1.05, u), out: u > 0.97 };
      }
      const u = (k - 0.38) / 0.62, e = T.ease.out(u);
      return { x: bez(112, 176, 214, CLOUD[0] - 8, e), y: bez(384, 320, 220, CLOUD[1] + 10, e), s: T.lerp(1.05, 0.2, Math.pow(e, 0.7)), out: true };
    }

    V.update = function (dt) {
      V.t += dt;
      const ta = ui.ta, focused = !!(ta && document.activeElement === ta && ui.mode === 'desk');
      V.focus += ((focused ? 1 : 0) - V.focus) * Math.min(1, dt * 5);
      if (V.bird && V.fly.on) {
        const q = flyAt(V.fly.k), b = V.bird;
        b.x = q.x; b.y = q.y; b.s = q.s; b.out = q.out;
        b.ph += dt * (7 + 3 * (1 - V.fly.k));
        b.up = 0.3 + 0.62 * (0.5 + 0.5 * Math.sin(b.ph));
        b.a = 1 - T.clamp((V.fly.k - 0.9) / 0.1);
      }
      if (ui.kind === 'write') ui.place();
    };
    function drawBird(g) {
      const b = V.bird;
      if (!b || b.a <= 0.01) return;
      const t = V.t;
      if (V.fly.on) {   /* the wind carrying it: a few pale strokes trailing */
        g.save(); g.strokeStyle = T.rgba('#dfe6ff', 0.22 * b.a); g.lineWidth = 1.6 * Math.max(0.4, b.s); g.lineCap = 'round';
        for (let i = 0; i < 3; i++) { const o = (i - 1) * 16 * b.s, l = 60 * b.s; g.beginPath(); g.moveTo(b.x - l * 1.6, b.y + o + 20 * b.s); g.quadraticCurveTo(b.x - l, b.y + o + Math.sin(t * 3 + i) * 6 * b.s, b.x - l * 0.3, b.y + o + 6 * b.s); g.stroke(); }
        g.restore();
      }
      P.glow(g, b.x, b.y, 50 * b.s, '#fff4dc', 0.14 * b.a);
      bird(g, b.x, b.y, b.s, { up: b.up, a: b.a, rot: b.rot || 0 });
    }

    V.draw = function (g, t) {
      ensure();
      const Wv = W(), c = V.cam, lk = T.ease.io(V.lamp.k);
      g.fillStyle = '#141830'; g.fillRect(-Wv / 2, 0, Wv, 900);
      g.save();
      if (c.z !== 1 || c.x !== 0 || c.y !== 450) { g.translate(0, 450); g.scale(c.z, c.z); g.translate(-c.x, -c.y); }
      /* outside: the night, the moon and its clouds, the town; the bird once it has gone out */
      T.blit(g, V.L.out);
      const r = T.rng(844);
      for (let i = 0; i < 10; i++) {   /* a few stars that twinkle */
        const x = GL.x0 + 20 + r() * (GL.x1 - GL.x0 - 40), y = GL.y0 + 10 + r() * 180, tw = 0.5 + 0.5 * Math.sin(t * (0.8 + r()) + i * 2);
        g.globalAlpha = 0.25 + 0.6 * tw; g.fillStyle = '#fffaf0'; g.beginPath(); g.arc(x, y, 1.4, 0, TAU); g.fill();
      }
      g.globalAlpha = 1;
      if (V.bird && V.bird.out) { g.save(); g.beginPath(); g.rect(GL.x0, GL.y0, GL.x1 - GL.x0, GL.y1 - GL.y0); g.clip(); drawBird(g); g.restore(); }
      if (V.glint.k > 0.01) { P.glow(g, CLOUD[0], CLOUD[1], 90, '#ffe8c8', 0.55 * V.glint.k); P.glow(g, CLOUD[0], CLOUD[1], 26, '#ffffff', 0.6 * V.glint.k); }
      /* the glass of the raised sash: a faint sheen, the lamp in it */
      g.save(); g.beginPath(); g.rect(GL.x0, GL.y0, GL.x1 - GL.x0, WIN.rail - GL.y0); g.clip();
      g.fillStyle = 'rgba(180,190,255,0.05)'; g.fillRect(GL.x0, GL.y0, GL.x1 - GL.x0, WIN.rail - GL.y0);
      g.strokeStyle = 'rgba(230,236,255,0.06)'; g.lineWidth = 26; g.beginPath(); g.moveTo(-300, WIN.rail); g.lineTo(-150, GL.y0); g.moveTo(-210, WIN.rail); g.lineTo(-110, GL.y0); g.stroke();
      if (lk > 0.01) P.glow(g, -330, 250, 90, '#ffcf90', 0.22 * lk);
      g.restore();
      /* the room */
      T.blit(g, V.L.room);
      const sway = 0.35 + 0.25 * Math.sin(t * 0.7) + 0.15 * Math.sin(t * 1.9) + V.gust.k * 0.9;
      curtain(g, -472, -372, -1, 0.12 + 0.06 * Math.sin(t * 0.6), t);
      curtain(g, 372, 472, 1, sway, t);
      /* the lamp, lit */
      if (lk > 0.01) {
        const lx = LAMP[0];
        g.save(); g.globalAlpha = lk;
        const sg = g.createLinearGradient(0, 432, 0, 500); sg.addColorStop(0, '#f6d29a'); sg.addColorStop(1, '#ffe8bc');
        g.fillStyle = sg; g.beginPath(); g.moveTo(lx - 46, 432); g.lineTo(lx + 46, 432); g.lineTo(lx + 76, 500); g.lineTo(lx - 76, 500); g.closePath(); g.fill();
        g.restore();
        P.glow(g, lx, 508, 120, '#ffd48a', 0.7 * lk);
        P.glow(g, lx, 420, 200, '#ffb860', 0.18 * lk);
      }
      /* the steam off the tea, while the lamp shows it */
      if (lk > 0.05) {
        const mx = mugX();
        g.save(); g.strokeStyle = T.rgba('#fff2e0', 0.12 * lk); g.lineWidth = 5; g.lineCap = 'round';
        for (let i = 0; i < 2; i++) { const ph = t * 0.6 + i * 2.2; g.beginPath(); g.moveTo(mx - 6 + i * 12, 515); g.bezierCurveTo(mx - 14 + Math.sin(ph) * 10 + i * 10, 485, mx + 8 + Math.sin(ph + 1) * 10, 470, mx + Math.sin(ph + 2) * 12, 440); g.stroke(); }
        g.restore();
      }
      if (!V.bird || V.fold) sheet(g);
      if (V.bird && !V.bird.out) {
        const b = V.bird;
        if (!V.fly.on || V.fly.k < 0.1) { g.fillStyle = T.rgba('#060612', 0.26 * (1 - V.fly.k * 8)); g.beginPath(); g.ellipse(V.rest[0], V.rest[1] + 26, 70, 9, 0, 0, TAU); g.fill(); }
        drawBird(g);
      }
      /* the lamp's warmth over all of it, and the words on the sheet over that (the ink keeps its colour) */
      if (lk > 0.01) {
        g.save(); g.globalCompositeOperation = 'screen';
        const lg = g.createRadialGradient(LAMP[0] + 120, 600, 40, LAMP[0] + 220, 620, 980);
        lg.addColorStop(0, T.rgba('#ffb36a', 0.42 * lk)); lg.addColorStop(0.45, T.rgba('#d88a5a', 0.16 * lk)); lg.addColorStop(1, 'rgba(120,60,40,0)');
        g.fillStyle = lg; g.fillRect(-Wv / 2 - 60, -20, Wv + 120, 960);
        g.restore();
      }
      const ia = ui.kind === 'write' && ui.mode === 'card' ? 1 : V.ink.a;   /* typed in the card above: it shows on the sheet as it goes */
      if (V.text && !V.fold && !V.bird && ia > 0.01) {
        g.save(); g.translate(PAPER.cx, PAPER.cy); g.rotate(PAPER.rot); inkLines(g, V.text, BOX.x0 - PAPER.cx, BOX.y0 - PAPER.cy, ia); g.restore();
      }
      g.restore();
      /* what is said about letters, written in the night through the glass */
      const wa = V.words.a;
      if (wa > 0.005) {
        P.text(g, '편지는 바람을 타고 간대요.', 0, 176, { font: 'serif', size: 34, color: '#f3ead8', alpha: wa, glow: 'rgba(8,12,30,0.95)' });
        P.text(g, '먼저 간 사람에게도, 곁에 있는 사람에게도.', 0, 230, { font: 'serif', size: 25, color: '#d9d2e8', alpha: 0.92 * wa, glow: 'rgba(8,12,30,0.95)' });
      }
    };
    V.want = () => ui.want();
    V.key = (key) => ui.key(key);
    V.pointer = (type) => { if (ui.kind !== 'write') return false; if (type === 'down' && ui.ta && ui.mode === 'desk') ui.focus(); return true; };
    V.hintAt = () => null;
    return V;
  }

  /* ---------- the wind post office, at dawn ---------- */
  const POSTMAN = () => Object.assign({}, F.styles.post, { hair: '#ebe6dc', beard: '#ebe6dc' });
  function satchel(g, j) {
    const h = j.hip, sh = j.shoulder, u = j.u;
    P.line(g, sh[0] + 4 * u * j.sx, sh[1], h[0] - 9 * u * j.sx, h[1] - 2 * u, 2.2 * u, '#6b4a34');
    P.fill(g, P.rr(h[0] - 16 * u, h[1] - 6 * u, 15 * u, 12 * u, 2.5 * u), '#8a5a3b'); P.fill(g, P.rr(h[0] - 16 * u, h[1] - 6 * u, 15 * u, 4 * u, 2 * u), '#a87050');
    P.fill(g, P.rr(h[0] - 12 * u, h[1] - 9 * u, 9 * u, 5 * u, 1), '#fbf3e0');
  }
  let dawnL = null;
  function dawnLook() {
    if (!dawnL && T.look) dawnL = Object.assign({}, T.look.get('sky'), { g0: '#6a6cba', g1: '#f09aa4', g2: '#ffc48a', gA: 0.5, glow: '#ffcc9c', glowA: 0.36, core: '#fff0e0', coreA: 0.24, vig: 0.24, vigC: '#3a2c58', lit: '#ffe6cc', litA: 0.34, dx: -0.7, dy: -0.7 });
    return dawnL;
  }
  const LAND = 712;
  function office() {
    const pm = { id: 'post', style: POSTMAN(), s: 146, at: 'desk', flip: true, lean: 0.08, face: { old: true, mouth: 'smile' } };
    const po = T.place('post', { actors: [pm] });
    const B = { k: 0, x: 0, y: 0, s: 0.95, up: 0.5, ph: 0, a: 1, phase: 'away', hop: 0, glow: { k: 0 }, from: null };
    let hand = null;
    pm.prop = (g, j) => { satchel(g, j); hand = [j.handF[0], j.handF[1]]; };
    pm.state = 'watch';
    pm.pose = (q, t) => {
      const dir = q.flip ? -1 : 1, G0 = po.layout();
      if (pm.state === 'watch') { q.headTilt = -0.12 + Math.sin(t * 0.5) * 0.05; }
      else if (pm.state === 'reach') { const c = catchAt(G0); q.armF = { hand: F.local(q, c[0], c[1]) }; q.headTilt = -0.2; }
      else if (pm.state === 'hold') { q.armF = { hand: F.local(q, q.x + dir * 30, q.y - 8) }; q.armB = { hand: F.local(q, q.x + dir * 24, q.y - 3) }; q.headTilt = 0.42; q.face = Object.assign({}, q.face, { eye: 'happy' }); }
      else if (pm.state === 'lift') { q.armF = { hand: F.local(q, q.x + dir * 30, q.y - 96) }; q.headTilt = -0.4; }
      else if (pm.state === 'done') { q.headTilt = -0.1; q.face = Object.assign({}, q.face, { eye: 'happy' }); }
    };
    const catchAt = (G0) => [G0.BX + 26, LAND - 150];
    const hole = () => { const G0 = po.layout(), c = G0.cub[32]; return { x: c[0], y: c[1], w: G0.cw - 8, h: G0.ch - 8 }; };   /* the bottom row, third along */
    const V = { dark: false, quiet: false, mood: 'still', chord: 3, lookAs: dawnLook(), lightDir: [-0.72, -0.69], veil: { k: 0 }, B, pm, po };
    V.light = () => [-T.view.W * 0.4, 620, 720];
    V.build = () => { if (po.build) po.build(); };
    V.enter = (S) => { if (po.enter) po.enter(S); };
    /* the way in: up out of the cloud sea at the left, round past the landing, and down to his hand */
    function pathAt(k) {
      const W = T.view.W, G0 = po.layout(), c = hand || catchAt(G0);
      const pts = [[-W / 2 - 80, 800], [-W * 0.36, 560], [G0.LX + 20, 380], [G0.BX - 150, 300], [G0.BX - 60, 440], c];
      const n = pts.length - 1, f = Math.min(n - 1e-6, T.clamp(k) * n), i = Math.floor(f), u = f - i;
      const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(n, i + 2)], u2 = u * u, u3 = u2 * u;
      const cr = (j) => 0.5 * (2 * p1[j] + (-p0[j] + p2[j]) * u + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * u2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * u3);
      return [cr(0), cr(1)];
    }
    V.update = function (dt, S) {
      po.update(dt, S);
      po.layout().loops.forEach((L) => { if (L.mark === 'star') L.mark = 'flower'; });   /* Lily's went to her father long ago */
      B.ph += dt * 9;
      if (B.phase === 'in') { const q = pathAt(B.k); B.x = q[0]; B.y = q[1] + Math.sin(B.ph * 0.35) * 6 * (1 - B.k); B.up = 0.3 + 0.62 * (0.5 + 0.5 * Math.sin(B.ph)); B.s = T.lerp(0.95, 0.62, B.k); }
      else if (B.phase === 'held' && hand) { B.x = hand[0] + (pm.flip ? -6 : 6); B.y = hand[1] - 12; B.up = 0.55 + 0.04 * Math.sin(B.ph * 0.2); B.s = 0.62; }
      else if (B.phase === 'hop') {
        const h = hole(), e = T.ease.io(B.hop), from = B.from;
        B.x = T.lerp(from[0], h.x, e); B.y = T.lerp(from[1], h.y + h.h / 2 - 11, e) - Math.sin(e * Math.PI) * 38;
        B.up = 0.3 + 0.62 * (0.5 + 0.5 * Math.sin(B.ph)); B.s = T.lerp(0.62, 0.3, e);
      } else if (B.phase === 'kept') { const h = hole(); B.x = h.x; B.y = h.y + h.h / 2 - 11; B.up = 0.55; B.s = 0.3; }
    };
    V.draw = function (g, t, S) {
      po.draw(g, t, S);
      const sp = T.par(0.6), W = T.view.W;
      /* the bird, in the place's own frame */
      if (B.phase !== 'away') {
        g.save(); g.translate(sp[0], sp[1]);
        if (B.phase === 'kept') {
          const h = hole();
          P.glow(g, h.x, h.y, 64, '#ffe2b0', 0.22 + 0.6 * B.glow.k);   /* a little light stays on in it */
          g.save(); g.beginPath(); g.rect(h.x - h.w / 2, h.y - h.h / 2, h.w, h.h); g.clip(); bird(g, B.x, B.y, B.s, { up: B.up, flip: true }); g.restore();
        } else {
          P.glow(g, B.x, B.y, 80 * B.s, '#ffe8c4', 0.42);
          bird(g, B.x, B.y, B.s, { up: B.up, flip: B.phase === 'held' && pm.flip, rot: B.phase === 'in' ? Math.sin(B.ph * 0.3) * 0.08 : 0 });
        }
        g.restore();
      }
      /* first light: the night still in the top of the sky, the sun coming up out of the cloud on the left */
      g.save();
      g.globalCompositeOperation = 'multiply';
      const gr = g.createLinearGradient(0, 0, 0, 900);
      gr.addColorStop(0, 'rgba(140,142,210,0.5)'); gr.addColorStop(0.45, 'rgba(240,210,224,0.22)'); gr.addColorStop(1, 'rgba(255,232,214,0.12)');
      g.fillStyle = gr; g.fillRect(-W / 2, 0, W, 900);
      g.restore();
      P.glow(g, -W * 0.42, 690, 900, '#ffb07c', 0.42);   /* the sun coming up out of the cloud */
      P.glow(g, -W * 0.42, 700, 170, '#fff0d0', 0.6);
      P.glow(g, -W * 0.42, 704, 46, '#ffffff', 0.7);
      if (V.veil.k > 0.005) { g.fillStyle = T.rgba('#0f1522', 0.62 * V.veil.k); g.fillRect(-W / 2, 0, W, 900); }
    };
    V.want = () => ui.want();
    V.key = (key) => ui.key(key);
    V.pointer = () => ui.kind === 'keep';
    V.hintAt = () => null;
    V.hole = hole;
    return V;
  }

  /* ---------- the paper and the buttons over the canvas ----------
     One overlay at a time: 'write' (the textarea, send, skip) or 'keep' (the postcard, save, go on).
     While one is open the game does not hear the keys typed into it (a capture listener stops them on the
     way), Escape skips or goes on, and Ctrl/Cmd+Enter sends. */
  const ui = { kind: null, root: null, ta: null, mode: 'desk', key: () => false, want: () => null };
  let cssOn = false;
  function addCss() {
    if (cssOn) return;
    cssOn = true;
    const s = document.createElement('style');
    s.textContent = [
      '.tyt-l{position:absolute;inset:0;z-index:3;pointer-events:none}',
      '.tyt-l .pane{position:absolute;pointer-events:auto;opacity:0;transition:opacity .5s ease}',
      '.tyt-l.on .pane{opacity:1}',
      '.tyt-l .paper{box-sizing:border-box}',
      '.tyt-l textarea{display:block;box-sizing:border-box;width:100%;height:100%;margin:0;padding:0;border:0;border-radius:0;outline:none;resize:none;overflow:hidden;background:transparent;color:' + INK + ';caret-color:#c9573f;font-family:' + HAND + ';white-space:pre-wrap;word-break:keep-all;overflow-wrap:anywhere;-webkit-tap-highlight-color:transparent}',
      '.tyt-l textarea::placeholder{color:rgba(70,72,96,.4);opacity:1}',
      '.tyt-l .ctl{display:flex;flex-direction:column;align-items:center}',
      '.tyt-l .row{display:flex;flex-direction:row-reverse;flex-wrap:wrap;gap:10px 14px;align-items:center;justify-content:center}',
      '.tyt-l button{font:16px/1.2 ' + SERIF + ';min-height:44px;padding:10px 22px;border-radius:999px;cursor:pointer;-webkit-tap-highlight-color:transparent}',
      '.tyt-l .go{border:0;background:#c9573f;color:#fff6e4;box-shadow:0 4px 14px rgba(0,0,0,.28)}',
      '.tyt-l .go:disabled{background:rgba(140,106,100,.75);color:rgba(255,246,228,.62);cursor:default;box-shadow:none}',
      '.tyt-l .pass{border:1px solid rgba(243,234,216,.42);background:rgba(14,20,32,.46);color:#f3ead8}',
      '.tyt-l button:focus-visible{outline:2px solid #d7a23c;outline-offset:3px}',
      '.tyt-l .note{margin:8px 0 0;text-align:center;font:12.5px/1.4 ' + SERIF + ';color:rgba(243,234,216,.62);text-shadow:0 1px 6px rgba(8,12,22,.9)}',
      '.tyt-l .sr{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap}',
      '.tyt-l.card .paper{background:#f7f0e2;border-radius:8px;box-shadow:0 12px 40px rgba(0,0,0,.55);padding:12px 16px}',
      '.tyt-l.card .paper:focus-within{box-shadow:0 0 0 2px #d7a23c,0 12px 40px rgba(0,0,0,.55)}',
      '.tyt-l.card textarea{overflow-y:auto}',
      '.tyt-l.card .pass{background:rgba(14,20,32,.8)}',
      '.tyt-l .lead{margin:0 0 8px;font:13px/1.5 ' + SERIF + ';color:rgba(54,58,79,.72)}',
      '.tyt-l.card .note{margin:6px 0 0;text-align:right;color:rgba(54,58,79,.55);text-shadow:none}',
      '.tyt-k{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;padding:16px;box-sizing:border-box}',
      '.tyt-k .pane{position:static}',
      '.tyt-k .row{flex-direction:row}',
      '.tyt-k img{display:block;max-width:min(78vw,440px);max-height:calc(100vh - 150px);width:auto;height:auto;border-radius:3px;box-shadow:0 14px 48px rgba(0,0,0,.5);transform:rotate(-1.2deg);-webkit-touch-callout:default;user-select:auto}',
      '.tyt-k.big img{max-width:94vw;max-height:calc(100vh - 110px);transform:none}',
      '.tyt-k .hint{margin:0;font:14px/1.4 ' + SERIF + ';color:#f3ead8;text-shadow:0 1px 6px rgba(8,12,22,.9);text-align:center}',
      '@media (prefers-reduced-motion:reduce){.tyt-l .pane{transition:none}}',
    ].join('\n');
    document.head.appendChild(s);
  }
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  let watch = 0, keyFn = null, vvFn = null;
  function close(now) {
    const root = ui.root;
    window.removeEventListener('keydown', keyFn, true);
    window.removeEventListener('resize', vvFn);
    if (window.visualViewport) { window.visualViewport.removeEventListener('resize', vvFn); window.visualViewport.removeEventListener('scroll', vvFn); }
    clearInterval(watch);
    ui.kind = null; ui.root = null; ui.ta = null; ui.want = () => null; ui.key = () => false;
    if (!root) return;
    root.classList.remove('on');
    const st = document.getElementById('stage');
    if (st && root.contains(document.activeElement)) st.focus({ preventScroll: true });
    if (now) root.remove(); else setTimeout(() => root.remove(), 600);
  }
  /* open an overlay for scene S; it closes itself if the story is left while it is up */
  function open(kind, S, root, onEsc) {
    addCss();
    if (ui.root) close(true);
    ui.kind = kind; ui.root = root;
    document.getElementById('wrap').appendChild(root);
    keyFn = (e) => {
      if (!ui.root || T.paused) return;   /* the settings sheet is open over everything: its keys are its own */
      const inside = ui.root.contains(e.target);
      if (e.isComposing || e.keyCode === 229) { if (inside) e.stopPropagation(); return; }   /* a syllable still being put together */
      if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); onEsc(); return; }
      if (kind === 'write' && e.key === 'Enter' && (e.ctrlKey || e.metaKey) && !e.isComposing) { e.preventDefault(); e.stopImmediatePropagation(); ui.send(); return; }
      if (inside) { e.stopPropagation(); return; }   /* typing, and the buttons: the game does not hear it */
      if (kind === 'write' && e.key.length === 1 && e.key !== ' ' && !e.ctrlKey && !e.metaKey && !e.altKey) { ui.focus(); e.stopPropagation(); }   /* typed with the focus elsewhere: onto the paper */
    };
    window.addEventListener('keydown', keyFn, true);
    watch = setInterval(() => { if (T.director.cur !== S) close(true); }, 300);
    requestAnimationFrame(() => requestAnimationFrame(() => { if (ui.root === root) root.classList.add('on'); }));
  }

  /* the writing: resolves with the text, or null for going on without writing */
  function write(S, V) {
    return new Promise((res) => {
      const root = el('div', 'tyt-l');
      root.setAttribute('role', 'group');
      const hd = el('h2', 'sr', T.tr('편지 쓰기')); hd.id = 'tyt-l-hd';
      const ds = el('p', 'sr', T.tr('편지는 바람을 타고 간대요.') + ' ' + T.tr('먼저 간 사람에게도, 곁에 있는 사람에게도.') + ' ' + T.tr('쓴 글은 이 기기에만 남아요')); ds.id = 'tyt-l-ds';
      root.setAttribute('aria-labelledby', hd.id);
      const paper = el('div', 'pane paper');
      const lab = el('label', 'sr', T.tr('편지 한 줄')); lab.htmlFor = 'tyt-l-ta';
      /* on a short screen the card covers the window: what is said about letters comes with it, small, at its head */
      const lead = el('p', 'lead'); lead.setAttribute('aria-hidden', 'true'); lead.hidden = true;
      lead.append(T.tr('편지는 바람을 타고 간대요.'), document.createElement('br'), T.tr('먼저 간 사람에게도, 곁에 있는 사람에게도.'));
      const ta = el('textarea'); ta.id = 'tyt-l-ta';
      ta.maxLength = MAX; ta.rows = 3; ta.spellcheck = false; ta.autocomplete = 'off'; ta.setAttribute('autocorrect', 'off'); ta.setAttribute('autocapitalize', 'sentences');
      ta.placeholder = T.tr('한 줄, 적어 보세요'); ta.setAttribute('aria-describedby', ds.id); ta.lang = T.lang === 'en' ? 'en' : 'ko';
      paper.append(lead, lab, ta);
      const ctl = el('div', 'pane ctl'), row = el('div', 'row');
      const go = el('button', 'go', T.tr('보내기')); go.type = 'button'; go.disabled = true; go.setAttribute('aria-keyshortcuts', 'Control+Enter Meta+Enter');
      const pass = el('button', 'pass', T.tr('쓰지 않고 넘어가기')); pass.type = 'button';
      row.append(go, pass);
      const note = el('p', 'note', T.tr('쓴 글은 이 기기에만 남아요'));
      ctl.append(row, note);
      root.append(hd, ds, paper, ctl);
      ui.ta = ta;
      let done = false;
      const finish = (text) => { if (done) return; done = true; close(); res(text); };
      const clean = () => ta.value.replace(/^\s+|\s+$/g, '');
      ui.send = () => { const tx = clean(); if (tx) finish(tx); };
      ui.focus = () => { try { ta.focus({ preventScroll: true }); } catch (e) { ta.focus(); } };
      go.addEventListener('click', () => ui.send());
      pass.addEventListener('click', () => finish(null));
      ta.addEventListener('input', () => {
        const v = ta.value, parts = v.split('\n');
        if (parts.length > BREAKS + 1) {   /* two breaks at most: a line or two, or three short ones */
          const pos = ta.selectionStart;
          ta.value = parts.slice(0, BREAKS + 1).join('\n') + ' ' + parts.slice(BREAKS + 1).join(' ');
          ta.selectionStart = ta.selectionEnd = Math.min(pos, ta.value.length);
        }
        go.disabled = !clean();
        V.text = ta.value; ui.place(true);
      });
      /* where it all goes: on the paper on the desk, or (narrow and short screens) in a card at the top */
      let lastKey = '';
      ui.place = (force) => {
        const Vw = T.view, wrapEl = document.getElementById('wrap'), vv = window.visualViewport;
        const cw = wrapEl.clientWidth, chh = wrapEl.clientHeight, fit = Vw.fit;
        const deskW = (BOX.x1 - BOX.x0) * fit, desk = deskW >= 380 && Vw.H * fit >= 470;
        const f = fit_(ta.value), key = [cw, chh, fit, desk, f.size, vv ? vv.height + ':' + vv.offsetTop : ''].join('|');
        if (key === lastKey && !force) return;
        lastKey = key;
        ui.mode = desk ? 'desk' : 'card';
        root.classList.toggle('card', !desk);
        const ps = paper.style, cs = ctl.style;
        if (desk) {
          lead.hidden = true; note.hidden = false; if (note.parentNode !== ctl) ctl.appendChild(note);
          const px = (x) => Vw.left + (x + Vw.W / 2) * fit, py = (y) => Vw.top + y * fit;
          ps.left = px(BOX.x0) + 'px'; ps.top = py(BOX.y0) + 'px'; ps.width = deskW + 'px'; ps.height = BOX.h * fit + 'px';
          ps.padding = '0'; ps.transformOrigin = (PAPER.cx - BOX.x0) * fit + 'px ' + (PAPER.cy - BOX.y0) * fit + 'px'; ps.transform = 'rotate(' + PAPER.rot + 'rad)';
          ta.style.fontSize = f.size * fit + 'px'; ta.style.lineHeight = f.size * LHK * fit + 'px'; ta.style.height = '100%';
          cs.left = px(-300) + 'px'; cs.width = 600 * fit + 'px'; cs.top = py(PAPER.cy + PAPER.h / 2 + 16) + 'px';
        } else {
          /* a tall narrow screen has an empty band above the picture: the card goes there if it fits (two lines if
             three will not); otherwise near the top, or just under the top of what the keyboard leaves */
          const top0 = vv ? vv.offsetTop : 0, vh = vv ? vv.height : chh, kb = vh < chh * 0.8;
          const w = Math.min(cw - 24, 560), base = Math.max(19, Math.min(26, w * 0.056)), size = base * f.size / 44, lh = size * LHK;
          ps.left = (cw - w) / 2 + 'px'; ps.width = w + 'px'; ps.height = 'auto'; ps.padding = ''; ps.transform = 'none';
          cs.left = (cw - w) / 2 + 'px'; cs.width = w + 'px';
          ta.style.fontSize = size + 'px'; ta.style.lineHeight = lh + 'px';
          if (note.parentNode !== paper) paper.appendChild(note);
          note.hidden = kb;
          const block = (n) => { ta.style.height = lh * n + 'px'; return paper.offsetHeight + 10 + ctl.offsetHeight; };
          let top = null;
          lead.hidden = true;
          if (!kb) for (const n of [3, 2]) { const b = block(n); if (Vw.top >= b + 16) { top = (Vw.top - b) / 2; break; } }
          if (top == null) { lead.hidden = kb; const b = block(vh < 300 || chh < 520 ? 2 : 3); top = top0 + (kb ? 8 : Math.max(10, Math.min(60, (vh - b) * 0.25))); }
          ps.top = top + 'px'; cs.top = top + paper.offsetHeight + 10 + 'px';
        }
      };
      ui.want = () => (done ? null : 'key:Enter');
      /* Enter with the focus off the paper: the test driver writes its line and sends; anyone else is put on the paper */
      ui.key = (k) => {
        if (k !== 'Enter' && k !== ' ') return true;
        if (navigator.webdriver && !ta.value) { ta.value = BOT; V.text = BOT; go.disabled = false; ui.send(); } else ui.focus();
        return true;
      };
      open('write', S, root, () => finish(null));
      vvFn = () => ui.place(true);
      window.addEventListener('resize', vvFn);
      if (window.visualViewport) { window.visualViewport.addEventListener('resize', vvFn); window.visualViewport.addEventListener('scroll', vvFn); }
      ui.place(true);
      ui.focus();
    });
  }
  const fit_ = (text) => fit(text);

  /* ---------- the postcard ---------- */
  const PW = 1080, PH = 1350;
  function postcard(text) {
    const c = document.createElement('canvas'); c.width = PW; c.height = PH;
    const g = c.getContext('2d'), r = T.rng(1350);
    const bg = g.createLinearGradient(0, 0, 0, PH); bg.addColorStop(0, '#efe6f0'); bg.addColorStop(0.3, '#f8f0e2'); bg.addColorStop(1, '#f5ecdc');
    g.fillStyle = bg; g.fillRect(0, 0, PW, PH);
    /* first light at the top, and a little cloud */
    const sky = g.createLinearGradient(0, 0, 0, 500); sky.addColorStop(0, 'rgba(150,150,214,0.42)'); sky.addColorStop(0.55, 'rgba(244,190,196,0.3)'); sky.addColorStop(1, 'rgba(255,226,206,0)');
    g.fillStyle = sky; g.fillRect(0, 0, PW, 500);
    for (let i = 0; i < 14; i++) { const x = 560 + i * 36 + r() * 30, y = 420 - Math.sin(i / 13 * Math.PI) * 50 + r() * 16, rad = 40 + r() * 34; const cg = g.createRadialGradient(x, y, rad * 0.2, x, y, rad); cg.addColorStop(0, 'rgba(255,255,255,0.75)'); cg.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = cg; g.fillRect(x - rad, y - rad, rad * 2, rad * 2); }
    for (let i = 0; i < 3000; i++) { g.fillStyle = 'rgba(110,90,80,' + (0.025 + r() * 0.05) + ')'; g.fillRect(r() * PW, r() * PH, 1.5, 1.5); }   /* the tooth of the paper */
    /* the postmark of the wind post office, and the day */
    const d = new Date(), date = d.getFullYear() + '. ' + (d.getMonth() + 1) + '. ' + d.getDate();
    g.save(); g.translate(214, 214); g.rotate(-0.14);
    g.strokeStyle = 'rgba(176,82,70,0.62)'; g.lineWidth = 4; g.beginPath(); g.arc(0, 0, 92, 0, TAU); g.stroke();
    g.lineWidth = 1.6; g.beginPath(); g.arc(0, 0, 78, 0, TAU); g.stroke();
    g.fillStyle = 'rgba(176,82,70,0.72)'; g.textAlign = 'center'; g.textBaseline = 'middle';
    const pm = T.tr('바람 우체국'); let fs = 30; g.font = fs + 'px ' + SERIF; while (g.measureText(pm).width > 136 && fs > 16) { fs--; g.font = fs + 'px ' + SERIF; }
    g.fillText(pm, 0, -14); g.font = '22px ' + SERIF; g.fillText(date, 0, 26);
    g.lineWidth = 2.4; g.strokeStyle = 'rgba(176,82,70,0.42)';
    for (let k = -1; k <= 1; k++) { g.beginPath(); for (let x = 104; x <= 330; x += 6) { const y = k * 30 + Math.sin(x * 0.06) * 6; if (x === 104) g.moveTo(x, y); else g.lineTo(x, y); } g.stroke(); }
    g.restore();
    /* the bird on the wind */
    g.save(); g.strokeStyle = 'rgba(150,150,200,0.34)'; g.lineWidth = 3; g.lineCap = 'round';
    for (let i = 0; i < 3; i++) { const o = i * 22; g.beginPath(); g.moveTo(560, 330 + o); g.bezierCurveTo(640, 300 + o, 700, 300 + o * 0.6, 760, 258 + o * 0.5); g.stroke(); }
    g.restore();
    const gl = g.createRadialGradient(860, 230, 10, 860, 230, 190); gl.addColorStop(0, 'rgba(255,246,226,0.85)'); gl.addColorStop(1, 'rgba(255,246,226,0)');
    g.fillStyle = gl; g.fillRect(670, 40, 380, 380);
    bird(g, 860, 232, 2.6, { up: 0.82, rot: -0.12 });
    /* the words, in the hand */
    const X0 = 118, WD = 844;
    let size = 92, lines;
    for (; size > 44; size -= 4) { g.font = size + 'px ' + HAND; lines = wrap(g, text, WD); if (lines.length <= 5 && lines.length * size * 1.42 <= 640) break; }
    g.font = size + 'px ' + HAND; lines = wrap(g, text, WD);
    const lh = size * 1.42, y0 = 760 - (lines.length * lh) / 2;
    g.textAlign = 'left'; g.textBaseline = 'alphabetic';
    lines.forEach((ln, i) => {
      const base = y0 + i * lh + size * 0.95;
      g.strokeStyle = 'rgba(110,120,170,0.16)'; g.lineWidth = 2; g.beginPath(); g.moveTo(X0 - 10, base + 16); g.lineTo(X0 + WD + 10, base + 16); g.stroke();
      g.fillStyle = INK; g.fillText(ln, X0, base);
    });
    /* and the name of the game, small, at the foot */
    g.strokeStyle = 'rgba(58,63,92,0.22)'; g.lineWidth = 2; g.beginPath(); g.moveTo(420, 1158); g.lineTo(660, 1158); g.stroke();
    g.textAlign = 'center'; g.fillStyle = '#3a3f5c';
    g.font = '62px "TYT Hand", "Nanum Pen Script", cursive'; g.fillText(T.tr('천천히 와'), PW / 2, 1236);
    g.fillStyle = '#6b6684'; g.font = '21px ' + SERIF;
    const sub = T.tr('TAKE YOUR TIME'), tr = /^[A-Z ]+$/.test(sub) ? 9 : 2, cs = Array.from(sub), ws = cs.map((ch) => g.measureText(ch).width), tw = ws.reduce((a, b) => a + b, 0) + tr * (cs.length - 1);
    let x = PW / 2 - tw / 2; g.textAlign = 'left'; cs.forEach((ch, i) => { g.fillText(ch, x, 1280); x += ws[i] + tr; });
    g.strokeStyle = 'rgba(120,100,90,0.2)'; g.lineWidth = 2; g.strokeRect(36, 36, PW - 72, PH - 72);
    return c;
  }
  /* where a download will not do (iPhone, iPad, the browsers inside apps), the picture is shown large to press on */
  function pressOnly() {
    const ua = navigator.userAgent || '';
    const ios = /iP(hone|ad|od)/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const inApp = /KAKAOTALK|Instagram|FBAN|FBAV|Line\/|NAVER|DaumApps|; wv\)/i.test(ua);
    return ios || inApp || !('download' in document.createElement('a'));
  }
  /* the keepsake: the postcard, kept or not; resolves when the player goes on */
  async function keepsake(S, text) {
    await Promise.race([Promise.all([loadFont(), document.fonts ? document.fonts.load('62px "TYT Hand"', '천천히 와') : null]), realWait(2500)]);
    let url = '';
    try { url = postcard(text).toDataURL('image/png'); } catch (e) { T.report(e, 'postcard'); }
    if (!url) return;
    await new Promise((res) => {
      const root = el('div', 'tyt-l tyt-k');
      root.setAttribute('role', 'group'); root.setAttribute('aria-label', T.tr('엽서로 간직하기'));
      const img = el('img', 'pane'); img.src = url; img.alt = T.tr('보낸 편지를 담은 엽서');
      const row = el('div', 'pane row');
      const save = el('button', 'go', T.tr('그림으로 저장')); save.type = 'button';
      const on = el('button', 'pass', T.tr('이어서 보기')); on.type = 'button';
      row.append(save, on);
      const hint = el('p', 'pane hint', T.tr('그림을 길게 눌러 저장할 수 있어요')); hint.hidden = true;
      root.append(img, row, hint);
      let done = false;
      const go = () => { if (done) return; done = true; close(); res(); };
      save.addEventListener('click', () => {
        if (pressOnly()) { root.classList.add('big'); hint.hidden = false; T.announce(T.tr('그림을 길게 눌러 저장할 수 있어요')); return; }
        const a = document.createElement('a'); a.href = url; a.download = 'take-your-time-letter.png';
        document.body.appendChild(a); a.click(); a.remove();
      });
      on.addEventListener('click', go);
      ui.want = () => (done ? null : 'key:Enter');
      ui.key = (k) => { if (k === 'Enter' || k === ' ') go(); return true; };
      open('keep', S, root, go);
      setTimeout(() => { if (ui.root === root) { try { save.focus({ preventScroll: true }); } catch (e) { save.focus(); } } }, 60);
    });
  }

  /* ---------- the epilogue ---------- */
  async function epilogue(X, o = {}) {
    const S = X.S, A = X.A, TALK = X.TALK;
    loadFont();
    const V = room();
    /* down below: the last picture goes dark, and a room at night comes up out of it */
    X.view(V, { color: '#0f1522', out: 2.4, hold: 0.7, in: 2.6 });
    await X.wait(2.4 + 0.7 + 0.9);
    A.ambience(0.2, 0.16, 0);
    T.announce(T.lang === 'en' ? 'Down below, one night. A desk by an open window; on it, a blank sheet of paper and a pencil.' : '저 아래, 어느 밤. 열린 창가의 책상 위에 빈 종이 한 장과 연필이 놓여 있다.');
    X.age('저 아래, 어느 밤');
    await X.wait(2.4);
    A.sfx('knit', 0.2);
    await X.tween(V.lamp, 'k', 1, 1.1, T.ease.out);
    await X.wait(1.8);
    T.announce(T.tr('편지는 바람을 타고 간대요.') + ' ' + T.tr('먼저 간 사람에게도, 곁에 있는 사람에게도.'));
    await X.tween(V.words, 'a', 1, 1.6);
    await X.wait(0.8);
    V.phase = 'write';
    const text = await write(S, V);
    V.phase = 'after';
    const quietEnd = () => { if (performance.now() > (o.tuneEnd || 0)) A.motif({ voice: 'box', vel: 0.28, beat: 0.86 }); };
    if (!text) {
      /* going on without writing is just as fine: the sheet stays as it was, and the night */
      V.text = '';
      await X.tween(V.words, 'a', 0, 1.4);
      await X.wait(1.2);
      quietEnd();
      return;
    }
    keep(text);
    V.text = text;
    X.tween(V.words, 'a', 0, 1.2);
    await X.tween(V.ink, 'a', 1, 0.35);
    T.announce(T.lang === 'en' ? 'A breath of wind comes in at the open window. The sheet folds itself, and again, into a paper bird.' : '열린 창으로 바람이 들어온다. 종이가 저절로 접히고 또 접혀, 종이새가 된다.');
    await X.wait(0.9);
    /* a breath of wind through the open sash: the curtain lifts, and the sheet folds itself up */
    A.sfx('wind');
    X.tween(V.gust, 'k', 1, 0.9).then(() => X.tween(V.gust, 'k', 0, 2.6));
    await X.wait(0.8);
    V.rest = [PAPER.cx + 10, PAPER.cy - 8];
    V.fold = { a: 0, b: 0, c: 0 };
    A.sfx('paper'); await X.tween(V.fold, 'a', 1, 1.0, T.ease.io);
    await X.wait(0.15);
    A.sfx('paper'); await X.tween(V.fold, 'b', 1, 0.8, T.ease.io);
    await X.wait(0.15);
    A.sfx('page'); await X.tween(V.fold, 'c', 1, 1.0, T.ease.io);
    V.fold = null;
    V.bird = { x: V.rest[0], y: V.rest[1], s: 1.5, up: 0.55, ph: 0, a: 1, out: false };
    await X.wait(0.9);
    /* and the wind takes it: out under the sash, up through the night, into the cloud at the top of the window */
    T.announce(T.lang === 'en' ? 'The paper bird flies out of the window, up through the night, into the clouds.' : '종이새가 창밖으로 날아가 밤하늘을 지나 구름 속으로 들어간다.');
    A.sfx('wind', 0.6); X.notes(3, { voice: 'glass', vel: 0.24 });
    V.fly.on = true;
    if (!T.reduceMotion) { X.tween(V.cam, 'x', 160, 4.6, T.ease.io); X.tween(V.cam, 'y', 236, 4.6, T.ease.io); X.tween(V.cam, 'z', 1.85, 4.6, T.ease.io); }
    await X.tween(V.fly, 'k', 1, 5.2, T.ease.lin);
    A.sfx('star', 0.8);
    X.tween(V.glint, 'k', 1, 0.5).then(() => X.tween(V.glint, 'k', 0, 1.6));
    await X.wait(1.4);

    /* first light at the wind post office: it comes in among the others, and the postman takes it */
    const PO = office(), B = PO.B, pm = PO.pm;
    await X.view(PO, { color: '#fbe3d6', out: 1.4, hold: 0.4, in: 1.8 });
    A.ambience(0.3, 0.32, 0.08);
    T.announce(T.lang === 'en' ? 'First light at the wind post office. The paper bird comes in among the other letters, and the old postman holds up his hand.' : '새벽, 바람 우체국. 종이새가 다른 편지들 사이로 날아들고, 늙은 집배원이 손을 든다.');
    await X.wait(0.8);
    B.phase = 'in'; B.k = 0;
    const G0 = PO.po.layout();
    X.wait(2.6).then(() => { pm.state = 'reach'; if (!T.reduceMotion) X.vcam(G0.BX + 60, 548, 1.7, 3.4); });
    await X.tween(B, 'k', 1, 5.2, T.ease.out);
    B.phase = 'held'; pm.state = 'hold';
    A.sfx('paper', 0.3); A.sfx('join');
    T.announce(T.lang === 'en' ? 'He takes the paper bird in his hands and looks at it a while, without opening it.' : '집배원이 종이새를 받아 들고, 펼치지 않은 채 한참 들여다본다.');
    await X.wait(1.8);
    await TALK.say('post', '꼭 전해 주겠네.');
    await X.wait(0.4);
    pm.flip = false; pm.state = 'lift';
    await X.wait(0.7);
    B.from = [B.x, B.y]; B.hop = 0; B.phase = 'hop';
    A.sfx('paper', 0.5);
    await X.tween(B, 'hop', 1, 1.2, T.ease.lin);
    B.phase = 'kept'; B.glow.k = 1; X.tween(B.glow, 'k', 0, 2.6);
    T.announce(T.lang === 'en' ? 'It goes into a pigeonhole of its own.' : '종이새가 우편함 칸 하나에 들어가 앉는다.');
    A.promise();
    pm.state = 'done';
    await X.wait(0.9);
    pm.flip = true;
    await X.wait(1.2);
    X.vcam(0, 450, 1, 3.2);
    await X.wait(2.4);
    /* a postcard of it, to keep or not */
    X.tween(PO.veil, 'k', 1, 0.8);
    await keepsake(S, text);
    A.bed(null);
    await X.wait(0.6);
    quietEnd();
  }

  /* ---------- the title: a paper bird on the sill, once a letter has gone up ---------- */
  function sill(g, a) {
    if (a < 0.01 || !last()) return;
    const p = T.par(0.34), x = -356 + p[0], y = 553 + p[1];
    g.save(); g.globalAlpha = a * 0.62;
    P.glow(g, x, y - 6, 40, '#c8d2ff', 0.1);
    g.fillStyle = 'rgba(4,6,14,0.35)'; g.beginPath(); g.ellipse(x - 2, y + 10, 24, 3.5, 0, 0, TAU); g.fill();
    bird(g, x, y, 0.4, { up: 0.55, flip: true, tone: '#d4d0e2' });
    g.restore();
  }

  T.letter = { epilogue, sill, last, loadFont };

  /* ---------- index.html#letter: the epilogue on its own, after a moment on the hill at night ---------- */
  T.stage('letterdemo', {
    chapter: 0, title: ['', ''], end: ['끝', '천천히 와', 'TAKE YOUR TIME'], endHand: true, endDim: 0.93, pad: 4, mood: 'still',
    plot: { stage: 4, stones: 4, board: true, cross: [1, 1, 1, 1, 0], table: true, tree: 1, swing: 1, swingW: 1, garden: 1, patch: 3, fruit: 1, season: 'late autumn' },
    flags: { bramGone: true, rosaGone: true },
    script: async function (X) {
      const ps = X.S.ps, [px, py] = X.place.plot();
      ps.night = 1;
      X.cam(px + 260, py + 60, 1.4); X.camSnap();
      X.bed(null);
      await X.wait(1.5);
      await epilogue(X, {});
      X.end();
    },
  });
  const run0 = T.run;
  T.run = function (first, args) { return (location.hash || '') === '#letter' ? run0('letterdemo', {}) : run0(first, args); };
})();
