/* Chapter 7 「아직은」 — years thirty to thirty-five: the year Ana is ill. A STUB for now: the title, the years going
   by, and the end card. The chapter itself replaces this file.
   What it can use, made for it in chapter 6:
     - the star mobile: T.mobile.draw / .shadows / .thing (src/scenes/mobile.js), to hang it again by the lake and
       turn its shadows on the ceiling of the hospital room;
     - Nora's laugh, kept for a dream in chapter 6 (X.gift('sound')): T.state.dream.sound. A dream's makings live in
       T.state, which is not saved, so a chapter opened by itself (a saved game, the chapter list) gets it again here,
       the way chapter 3 gets back the scent from chapter 2;
     - F.styles.nora (Nora, a child), F.baby (a newborn), F.styles.baker (빵집 아저씨, the baker's husband, in his
       seventies, with the apron the figures now draw from style.apron), and the speakers 'v4' (빵집 아저씨) and
       'nora' (노라) in ui.js. */
(function () {
  'use strict';
  const T = window.TYT, F = T.F;

  T.stage('ch7', {
    chapter: 7, title: ['7장', '아직은'], end: ['7장 끝', '8장 「다 지킨 약속」'], next: 'ch8', pad: 2, nextColor: '#161d2a',
    plot: { stage: 4, stones: 4, board: true, table: true, tree: 1, swing: 1, swingW: 1, garden: 1, patch: 3, fruit: 1, season: 'spring' },
    flags: { bramGone: true, rosaGone: true },
    onHill(g, h, S) { if (h === 3 && S.ps && S.ps.patch >= 3 && !S.ps.patchHide) T.plot.fence(g); },
    script: async function (X) {
      const PL = T.plot, S = X.S;
      T.state.dream = Object.assign({ sound: true }, T.state.dream || {});   /* Nora's laugh, from chapter 6 */
      const [px, py] = X.place.plot();
      X.cam(px + 60, py, 1); X.camSnap();
      X.actor('leo', { x: PL.TABLE_X - 66, style: F.leoAt(3), face: { old: true } });
      X.actor('bean', { dog: true, s: 220, x: PL.TABLE_X + 118, sit: 1, wag: 0.5, flip: true });
      void S;
      X.title();
      await X.wait(4.4);
      await X.years(30, 35, { age: 71, season: 'spring' });
      await X.wait(1);
      X.end();
    },
  });
})();
