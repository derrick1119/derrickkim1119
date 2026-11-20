/* 데이 & 나이트 — 장면들 (3/3): 4장 동굴과 기억, 5장 밤의 영역, 최종장, 결말 */
(function (root) {
  'use strict';
  const DN = (root.DN = root.DN || {});
  const U = DN.U, L = DN.LEVELS, H = DN.LevelHelp;
  const TAU = Math.PI * 2;

  /* ═════════ 4장 — 잊힌 동굴: 최초의 불씨 ═════════
   * 기억 조각은 낮에도 밤에도 없다. 빛의 가장자리, 황혼에만 드러난다. */
  const FY = 560, MURAL_X = 3150;
  const SHARD_LINES = [
    ['…눈이 내리고 있었다. 아주 추운 겨울밤이었다.', '이건… 누구의 기억이지?'],
    ['…어둠 속에서 아이 하나가 떨고 있었다. 불이라는 것이 아직 없던 때.', '왜 이렇게, 아는 것 같지.'],
    ['…누군가 하늘에서 내려왔다. 손에 작은 해를 쥐고.', '…손에, 작은 해를.'],
  ];
  function shard(id, x, y) {
    return { id, kind: 'shard', x, y, r: 54, when: 'dusk', glint: true, remote: true,
      if: (G) => G.S.duskSight,
      tap: async (g, self) => {
        const G = g.G;
        self.visible = false; self.gone = true;
        const n = (G.flags.shards || 0);
        g.flag('shards', n + 1);
        g.sfx('memory');
        G.sparkle(self.x, self.y, [255, 220, 150], 26, 80);
        await g.wait(0.5);
        await g.talk([['narr', SHARD_LINES[n][0]], ['day', SHARD_LINES[n][1]]]);
        if (n === 0) await g.say('narr', '기억 조각을 볼 수 있게 되었다. 동굴 안에 두 개가 더 있다.');
        if (n === 2) g.toast('벽화가 또렷해졌어요. 동굴 가장 깊은 곳으로 가 보세요.', 6000);
      } };
  }

  L.ch4 = {
    id: 'ch4', title: '4장 · 잊힌 동굴', sub: '최초의 불씨',
    width: 3800, theme: 'cave', night: true,
    sky: { none: true },
    backdrop: [
      { kind: 'cavewall', par: 0.6, seed: 71 },
      { kind: 'mural', par: 1 },
    ],
    fore: { kind: 'stalactites' },
    layers: [
      { id: 'k_back', style: 'rock', walk: false, tone: 0.3, pts: H.band(-200, 4100, 440, 14, 402) },
      { id: 'floor', style: 'rock', tone: 0.8, pts: H.band(-200, 920, FY, 4, 404).concat(H.gap(1150, 1330, FY), H.band(1500, 4100, FY, 4, 406)) },
      H.shadow('sh_pit', 1150, 1330, FY),
      { id: 'k_f', style: 'rock', walk: false, tone: 1, pts: H.band(-200, 4100, 672, 10, 405) },
    ],
    props: [
      { type: 'stalagmite', layer: 'k_back', x: 300, h: 60 }, { type: 'crystal', layer: 'k_back', x: 640, col: '#9fb6e8' }, { type: 'stalagmite', layer: 'k_back', x: 1000, h: 46 },
      { type: 'crystal', layer: 'k_back', x: 1560, s: 1.2, col: '#b7a0e0' }, { type: 'stalagmite', layer: 'k_back', x: 2300, h: 70 }, { type: 'crystal', layer: 'k_back', x: 2700, col: '#9fd0e8' },
      { type: 'stalagmite', layer: 'floor', x: 380, h: 40 }, { type: 'crystal', layer: 'floor', x: 900, s: 0.8, col: '#9fd0e8' }, { type: 'post', layer: 'floor', x: 1460, h: 100, arm: 0 },
      { type: 'stalagmite', layer: 'floor', x: 2200, h: 44 }, { type: 'crystal', layer: 'floor', x: 2560, col: '#e0c090' }, { type: 'post', layer: 'floor', x: 3380, h: 140, arm: 0 },
      { type: 'stalagmite', layer: 'floor', x: 3640, h: 56 },
    ],
    start: { layer: 'floor', x: 140 },
    things: [
      shard('sh_a', 640, 392),
      shard('sh_b', 1262, 352),
      shard('sh_c', 1730, 444),
      H.hook('hk_pit', 'floor', 1460, 126),
      H.soot('e1', 'floor', 1740, 40, 'eater'),
      H.soot('s1', 'floor', 2060, 36), H.soot('s2', 'floor', 2420, 34),
      H.hook('hk_mural', 'floor', 3380, 166),
      // 벽화 한구석: 가장자리가 닿아야 드러난다
      Object.assign(H.clue({ id: 'mural', x: MURAL_X + 320, y: 250, r: 70, when: 'dusk', glint: true, remote: true,
        if: (G) => G.flags.sawMural && !G.S.clues.includes('mural') }, 'mural', [
        ['narr', '빛의 가장자리가 벽화 한구석을 스치자, 긁혀 지워진 자리에서 세 번째 소녀가 떠올랐다.'],
        ['hari', '여기 한 명 더 있었네. 빛나는 사람도, 까만 사람도 아닌…'],
        ['day', '낮에도 밤에도 보이지 않고, 그 사이에서만 보여. …노을 언덕의 의자가, 세 개였지.'],
      ])),
      { id: 'emberspot', kind: 'spot', layer: 'floor', x: MURAL_X, dy: 40, r: 70,
        if: (G) => G.flags.sawMural && !G.flags.emberDone,
        tap: async (g) => {
          const G = g.G;
          if ((G.flags.shards || 0) < 3) {
            await g.say('day', '벽화가 흐려서 잘 보이지 않아. 기억 조각이 더 있을 거야.');
            return;
          }
          g.flag('emberDone');
          const sp = G.addThing({ id: 'esp', kind: 'spirit', spirit: 'ember', layer: 'floor', x: MURAL_X + 40, dy: 10, tired: 0.4, alpha: 0, scale: 1.3 });
          g.sfx('chime');
          await Promise.all([g.tween(sp, 'alpha', 1, 1.4), g.tween(sp, 'dy', 60, 1.4)]);
          await g.talk([
            ['narr', '벽화 아래, 아주 작고 아주 오래된 불씨 하나가 깨어났다.'],
            ['ember', '…왔구나. 오래 걸렸네, 데이.'],
            ['day', '나를 알아?'],
            ['ember', '알다마다. 나는 네 손에서 떨어져 나왔는걸.'],
            ['ember', '네 등불 속의 그 해의 조각. 그건 내 나머지 반쪽이야.'],
            ['hari', '…언니? 얼굴이 하얘.'],
            ['ember', '기억은 네가 스스로 맡겨 두었지. 이제 돌려받을 때가 됐어.'],
          ]);
          g.sfx('memory');
          await g.fade(true, 1400, true);
          g.scene('memory');
        } },
    ],
    triggers: [
      { x: 1040, run: async (g) => { await g.say('hari', '바닥이 꺼졌어. 저기 그림자가 걸쳐 있긴 한데…'); } },
      { x: 1600, run: async (g) => { await g.say('hari', '저 앞에 빛 먹는 놈이 자고 있어. 그 위에서도 뭔가 반짝이는데.'); } },
      { x: 2860, run: async (g) => {
        const G = g.G;
        await g.walk(G.day, 'floor', 3030);
        await g.cam(MURAL_X + 60, 2);
        g.flag('sawMural');
        await g.talk([
          ['narr', '동굴의 가장 깊은 벽. 누군가 오래전에 그림을 남겼다.'],
          ['narr', '빛나는 소녀가, 웅크린 아이에게 불씨를 건네고 있다.'],
          ['hari', '♪ 첫 불은 산 아래 굴에서, 빛나는 손이 건넸지… 이거야. 노래 그대로야.'],
          ['hari', '근데 이 사람… 데이 언니랑 닮았어.'],
          ['day', '…'],
        ]);
        g.camFree();
      } },
    ],
    intro: async (g) => {
      const G = g.G;
      await g.wait(2.4);
      await g.talk([
        ['narr', '산 아래 굴. 하리의 할아버지가 노래로만 전해 준 곳.'],
        ['hari', '점등인은 누구나 한 번은 여기 와 본대. 첫 불이 켜진 자리니까.'],
        ['day', '첫 불… 나이트는 왜 나더러 여길 찾으라고 한 걸까.'],
        ['narr', '그때, 등불 빛의 가장자리에서 무언가 반짝였다. 빛 속에도 어둠 속에도 없는 것이.'],
      ]);
      g.learn('duskSight');
      g.toast('벽에서 반짝이는 자리에 빛의 가장자리를 맞춰 보세요. 가장자리를 끌면 빛의 크기가 바뀝니다.', 12000);
    },
    drawMural: (ctx, G, b, ox, pal, t, pass) => {
      const n = G.flags.shards || 0;
      const a = 0.22 + n * 0.2;
      const x0 = MURAL_X - 250 - ox;
      ctx.save();
      ctx.translate(x0, 0);
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      const ochre = `rgba(214,150,84,${a})`, red = `rgba(178,82,58,${a})`, pale = `rgba(246,230,196,${a})`;
      // 해와 햇살
      ctx.strokeStyle = ochre; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(70, 150, 26, 0, TAU); ctx.stroke();
      for (let i = 0; i < 10; i++) { const an = i * TAU / 10; ctx.beginPath(); ctx.moveTo(70 + Math.cos(an) * 34, 150 + Math.sin(an) * 34); ctx.lineTo(70 + Math.cos(an) * 46, 150 + Math.sin(an) * 46); ctx.stroke(); }
      // 눈발
      ctx.fillStyle = pale;
      for (let i = 0; i < 26; i++) { ctx.beginPath(); ctx.arc(150 + (i * 97) % 380, 130 + (i * 53) % 180, 1.8, 0, TAU); ctx.fill(); }
      const girl = (gx, gy, col, s) => {
        ctx.strokeStyle = col; ctx.lineWidth = 3 * s;
        ctx.beginPath(); ctx.arc(gx, gy - 86 * s, 11 * s, 0, TAU); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(gx, gy - 74 * s); ctx.lineTo(gx - 22 * s, gy); ctx.lineTo(gx + 22 * s, gy); ctx.closePath(); ctx.stroke();
        for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(gx - 9 * s, gy - 92 * s + i * 3); ctx.quadraticCurveTo(gx - 32 * s, gy - 60 * s, gx - 26 * s - i * 3, gy - 20 * s); ctx.stroke(); }
      };
      // 빛나는 소녀, 건네는 팔, 불씨
      girl(200, 330, pale, 1.1);
      ctx.strokeStyle = pale; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(212, 268); ctx.lineTo(262, 262); ctx.stroke();
      ctx.fillStyle = `rgba(255,170,80,${Math.min(1, a + 0.25)})`;
      ctx.beginPath(); ctx.moveTo(272, 268); ctx.quadraticCurveTo(262, 252, 274, 238); ctx.quadraticCurveTo(286, 254, 272, 268); ctx.fill();
      if (n >= 3 && DN.Render.collect) DN.Render.glows.push({ x: (x0 + 273) * DN.Render.scale, y: 254 * DN.Render.scale, r: 44 * DN.Render.scale, rgb: [255, 170, 80], a: 0.4 + 0.1 * Math.sin(t * 3) });
      // 아이
      ctx.strokeStyle = red; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(330, 282, 9, 0, TAU); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(330, 292); ctx.lineTo(316, 330); ctx.lineTo(346, 330); ctx.closePath(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(324, 300); ctx.lineTo(292, 270); ctx.stroke();
      // 밤하늘의 별들 (하나에는 가위표)
      ctx.strokeStyle = pale; ctx.lineWidth = 2;
      for (let i = 0; i < 9; i++) {
        const sx = 300 + i * 26, sy = 130 + (i * 37) % 50;
        ctx.beginPath(); ctx.moveTo(sx - 5, sy); ctx.lineTo(sx + 5, sy); ctx.moveTo(sx, sy - 5); ctx.lineTo(sx, sy + 5); ctx.stroke();
      }
      ctx.strokeStyle = red; ctx.beginPath(); ctx.moveTo(398, 150); ctx.lineTo(412, 164); ctx.moveTo(412, 150); ctx.lineTo(398, 164); ctx.stroke();
      // 어두운 소녀 (멀리서 지켜본다)
      girl(470, 330, `rgba(70,58,96,${a + 0.25})`, 0.9);
      // 긁혀 지워진 자리. 세 번째 소녀는 황혼의 띠 안에서만 떠오른다
      if (pass === 'dusk') girl(570, 330, 'rgba(236,180,226,0.95)', 0.9);
      else {
        ctx.strokeStyle = `rgba(30,22,28,${a * 1.2})`; ctx.lineWidth = 2;
        for (let i = 0; i < 9; i++) { ctx.beginPath(); ctx.moveTo(542 + i * 7, 236 + (i % 3) * 6); ctx.lineTo(556 + i * 7, 330 - (i % 2) * 10); ctx.stroke(); }
      }
      ctx.restore();
    },
  };

  /* ── 기억 속: 첫 번째 겨울 ── */
  L.memory = {
    id: 'memory', title: '아주 오래전', sub: '첫 번째 겨울',
    width: 1900, theme: 'snow', night: true, startClosed: true,
    sky: { stars: 1, cloudAlpha: 0.2 },
    backdrop: [
      { kind: 'mountains', par: 0.15, base: 360, amp: 150, freq: 0.003, fade: 0.5, seed: 81 },
    ],
    layers: [
      { id: 'm_far', walk: false, style: 'snow', tone: 0.1, pts: H.band(-200, 2200, 330, 14, 501) },
      { id: 'm_mid', walk: false, style: 'snow', tone: 0.45, pts: H.band(-200, 2200, 440, 10, 502) },
      { id: 'road', style: 'snow', tone: 0.85, pts: H.band(-200, 2200, 560, 6, 503) },
      { id: 'm_f', style: 'snow', walk: false, tone: 1, pts: H.band(-200, 2200, 668, 9, 504) },
    ],
    props: [
      { type: 'pine', layer: 'm_far', x: 300, s: 0.9 }, { type: 'pine', layer: 'm_far', x: 1500, s: 1 },
      { type: 'pine', layer: 'm_mid', x: 380, s: 1.1 }, { type: 'lonetree', layer: 'm_mid', x: 1520, s: 0.8 }, { type: 'pine', layer: 'road', x: 640, s: 1 },
    ],
    start: { layer: 'road', x: 220, h: 92 },
    hari: false,
    things: [
      H.soot('f1', 'road', 1090, 40), H.soot('f2', 'road', 1340, 36),
      { id: 'child', kind: 'npc', who: 'child', layer: 'road', x: 1230, dir: -1, shiver: true },
      { id: 'firstLight', kind: 'none', layer: 'road', x: 1210, up: 24, light: { r: 200, flag: 'firstFire' }, visible: false },
    ],
    triggers: [
      { x: 960, run: async (g) => {
        const G = g.G;
        g.toastOff();
        await g.talk([
          ['child', '…추워. …캄캄해. 아무도, 없어…?'],
          ['narr', '아이의 두려움이, 어둠 속에서 검게 뭉치고 있었다. 세상의 첫 번째 그을음이었다.'],
          ['day', '밤은 나이트의 것. 서로의 시간을 넘보지 않기로 약속했어. 그래서 내 빛은, 덮어 두었는데.'],
          ['day', '…이 아이는 아침까지 버티지 못해.'],
        ]);
        g.flag('nudgeLantern');
        g.toast('등불 단추를 눌러, 덮어 둔 빛을 여세요.', 20000);
        await g.until(() => G.lan.r > 30);
        g.flag('nudgeLantern', false);
        g.toastOff();
        await g.say('narr', '약속을 어기는 빛이, 밤 한가운데에 켜졌다.');
      } },
      { x: 1160, if: (G) => G.lan.r > 30, run: async (g) => {
        const G = g.G, child = G.thing('child');
        await g.walk(G.day, 'road', 1178);
        g.face(G.day, 1);
        child.shiver = false;
        await g.say('child', '…낮이다. 낮이 왔어.');
        await g.choose([{ t: '불씨를 건넨다.', v: 1 }]);
        g.sfx('chime');
        for (let i = 0; i < 30; i++) {
          G.particles.push({ x: G.day.x + 20, y: G.day.y - 44, vx: 30 + Math.random() * 30, vy: -20 + Math.random() * 30, g: 0, life: 0, max: 0.9 + Math.random() * 0.5, r: 1.5 + Math.random() * 2, col: [255, 214, 140], add: true });
        }
        await g.wait(1.1);
        const sp = G.addThing({ id: 'first', kind: 'spirit', spirit: 'ember', layer: 'road', x: 1210, dy: 22, tired: 0, scale: 1.2, alpha: 0 });
        await g.tween(sp, 'alpha', 1, 1);
        g.flag('firstFire');
        await g.talk([
          ['narr', '등불을 거두어도 꺼지지 않는 빛. 밤에 켜진, 세상의 첫 번째 불이었다.'],
          ['child', '…따뜻해.'],
        ]);
        g.sfx('dark');
        await g.tween(G, 'starAmount', 0.93, 2.4);
        await g.talk([
          ['narr', '그 순간 하늘에서, 별 하나가 소리 없이 꺼졌다.'],
          ['narr', '데이는 그것을 보았다. 그리고 견딜 수 없었다.'],
          ['narr', '그래서 그 기억을 약속의 증인에게 맡기고, 잊었다.'],
        ]);
        await g.fade(true, 1500, true);
        g.scene('cavemouth');
      } },
    ],
    intro: async (g) => {
      await g.wait(2.6);
      await g.talk([
        ['narr', '불이라는 것이 아직 없던 때. 밤하늘은 별로 가득했고, 땅은 캄캄했다.'],
        ['narr', '어린 데이는 교대를 마치고 돌아가던 길에, 어둠 속의 작은 소리를 들었다.'],
      ]);
      g.toast('소리가 나는 쪽으로 가 보세요.', 6000);
    },
    update: (g, dt) => {
      const G = g.G;
      if (Math.random() < dt * 40) {   // 눈
        G.particles.push({ x: G.cam.x + Math.random() * (DN.Render.W + 200) - 100, y: -10, vx: -14 + Math.random() * 10, vy: 46 + Math.random() * 40, g: 0, life: 0, max: 9, r: 1 + Math.random() * 1.6, col: [236, 240, 255], add: true });
      }
    },
  };

  /* ── 동굴 어귀: 고백 ── */
  L.cavemouth = {
    id: 'cavemouth', width: 2000, theme: 'hill', night: true,
    sky: { stars: 0.02 },
    backdrop: [
      { kind: 'mountains', par: 0.12, base: 380, amp: 170, freq: 0.0026, fade: 0.6, seed: 91 },
    ],
    layers: [
      { id: 'e_far', walk: false, tone: 0.1, pts: H.band(-200, 2300, 330, 14, 601) },
      { id: 'e_c', walk: false, tone: 0.35, pts: H.band(-200, 2300, 400, 8, 602) },
      { id: 'road', tone: 0.8, pts: H.band(-200, 2300, 560, 8, 603) },
      { id: 'e_f', walk: false, tone: 1, pts: H.band(-200, 2300, 668, 9, 604) },
    ],
    props: [
      { type: 'cavehole', layer: 'road', x: 150 }, { type: 'pine', layer: 'e_c', x: 520, s: 1 }, { type: 'tree', layer: 'e_c', x: 1700, seed: 4 },
      { type: 'lonetree', layer: 'road', x: 840, s: 0.9 }, { type: 'pine', layer: 'e_far', x: 1000, s: 0.9 },
    ],
    start: { layer: 'road', x: 330 },
    triggers: [
      { x: 900, run: async (g) => {
        const G = g.G;
        await g.walk(G.day, 'road', 960);
        g.face(G.day, 1);
        await g.cam(1150, 2);
        await H.summonNight(g, 'e_c', 1380, 1);
        await g.talk([
          ['narr', '동굴 밖은 아직 밤이었다. 빛이 닿지 않는 능선 위에, 나이트가 등을 보인 채 서 있다.'],
          ['night', '봤구나.'],
          ['night', '수천 년이야. 언니는 잊었고, 나는 잊지 못했어.'],
        ]);
        if (g.run2) await g.say('night', '몇 번째인지 알아? 언니는 매번 여기서 그 얼굴을 해. 나는 전부 기억하는데.');
        const v = await g.choose([
          { t: '내가 먼저 약속을 깼어. 미안해, 나이트. 잊어버려서, 더 미안해.', v: 1 },
          { t: '…그 아이를 살리려던 거였어.', v: 0 },
        ]);
        if (v) {
          g.S.C.night = true; g.S.B += 2;
          await g.wait(0.8);
          g.face(G.night, -1);
          g.sfx('star');
          await g.talk([
            ['narr', '나이트가 처음으로 뒤돌아보았다.'],
            ['night', '…그 말을 듣는 데, 이렇게 오래 걸렸네.'],
          ]);
        } else {
          await g.say('night', '알아. 그래서 더 화를 낼 수가 없었어.');
        }
        await g.talk([
          ['night', '내 하늘로 와. 말로는 안 돼. 직접 봐.'],
          ['night', '낮의 것은 밤에 들어올 수 없어. 밤의 것도 낮에 설 수 없고.'],
          ['night', '그러니까 그 사이를 밟고 와. 언니 빛의, 가장자리를.'],
        ]);
        g.learn('duskWalk');
        await g.say('narr', '황혼 걸음을 배웠다. 걸어 둔 등불의 빛 가장자리를 디딜 수 있다.');
        await g.daybreak(3.4);
        await g.fade(true, 1200);
        g.next();
      } },
    ],
    intro: async (g) => {
      await g.wait(1.6);
      await g.talk([
        ['day', '…내가 했어.'],
        ['day', '첫 불씨를 준 건, 나였어. 약속을 먼저 깬 건… 나이트가 아니야.'],
        ['hari', '언니? 왜 그래? 벽화 앞에서 뭘 본 거야?'],
      ]);
      const v = await g.choose([
        { t: '들어 줘, 하리. 인간에게 처음 불을 준 건 나야. 그 불이 밤을 조금씩 지워 왔어.', v: 1 },
        { t: '…아무것도 아니야. 가자.', v: 0 },
      ]);
      if (v) {
        g.S.C.hari = true; g.S.bond++;
        await g.talk([
          ['hari', '…그럼 언니가 준 불 덕분에, 그 아이는 살았겠네.'],
          ['hari', '나쁜 일이기만 한 건 아니잖아. 그치만… 밤한테는, 미안한 일이다.'],
        ]);
      } else {
        await g.say('narr', '하리는 더 묻지 않았다. 다만 등불 든 손을 한참 바라보았다.');
      }
      g.toast('동굴 밖으로 나가세요.', 5000);
    },
  };

  /* ═════════ 5장 — 밤의 영역: 나이트의 하늘 ═════════
   * 밤의 섬은 어둠 속에서만 단단하다. 빛을 들고는 한 걸음도 디딜 수 없다.
   * 섬과 섬을 잇는 것은 낮도 밤도 아닌 것 — 걸어 둔 등불의 빛 가장자리뿐이다. */
  const hung = (layer, x, len, col, seed) => ({ type: 'hung', layer, x, len, col, seed });
  const isle = (id, tone, pts, thick) => ({ id, style: 'glass', zone: 'night', thick: thick || 110, tone, pts });

  L.ch5 = {
    id: 'ch5', title: '5장 · 밤의 영역', sub: '나이트의 하늘',
    width: 3700, theme: 'realm', night: true, startClosed: true, openOnHang: true,
    sky: { stars: 0.03, cloudAlpha: 0.25, lastStar: { x: 3300, y: 150, par: 1, r: 3.6, a: 0.8 } },
    backdrop: [],
    layers: [
      isle('n_far1', 0.1, [[300, 250], [520, 236], [760, 250]], 70), isle('n_far2', 0.15, [[1700, 240], [1950, 222], [2200, 240]], 80),
      isle('n1', 0.9, [[-100, 556], [200, 548], [500, 552], [820, 560]], 120),
      isle('n2', 0.8, [[1140, 520], [1400, 512], [1650, 516], [1900, 524]]),
      isle('n3', 0.7, [[2200, 470], [2400, 462], [2600, 464], [2760, 470]]),
      isle('n4', 0.6, [[3000, 430], [3200, 422], [3400, 424], [3600, 432]]),
    ],
    props: [
      hung('n1', 120, 250, '#ffd08a', 1), hung('n1', 420, 330, '#ffb070', 2), hung('n1', 700, 200, '#ffe9a6', 3),
      hung('n2', 1300, 300, '#ff9ade', 5), hung('n2', 1800, 240, '#a9ebc8', 6),
      hung('n3', 2300, 320, '#ffd08a', 7), hung('n3', 2640, 220, '#ffe9a6', 8),
      hung('n4', 3080, 180, '#ffd08a', 11), hung('n4', 3500, 280, '#ffb070', 12),
      hung('n_far1', 500, 110, '#ffd08a', 13), hung('n_far2', 1950, 130, '#ffe9a6', 14),
    ],
    start: { layer: 'n1', x: 150 },
    things: [
      { id: 'hk1', kind: 'hook', x: 980, y: 430, r: 46 },
      { id: 'hk2', kind: 'hook', x: 1520, y: 330, r: 46 },
      { id: 'hk3', kind: 'hook', x: 2050, y: 380, r: 46 },
      { id: 'hk4', kind: 'hook', x: 2880, y: 300, r: 46 },
      // 빼앗겨 온 가로등 하나: 꺼지지 않는 작은 낮이 밤의 섬에 구멍을 낸다
      { id: 'stolen', kind: 'streetlight', layer: 'n2', x: 1520, lit: true, light: { r: 84 }, up: 40 },
      { id: 'nightsit', kind: 'girl', who: 'night', layer: 'n4', x: 3300, dir: -1, alpha: 0.62, anyZone: true },
    ],
    triggers: [
      { x: 560, layers: ['n1'], run: async (g) => {
        await g.talk([
          ['hari', '섬이 끊겼어. 건너편까지는 한참인데… 그림자 다리도 없고.'],
          ['day', '나이트가 그랬지. 사이를 밟고 오라고. 저 위에 빈 고리가 있어.'],
        ]);
        g.toast('고리에 등불을 걸고, 빛의 가장자리가 두 섬에 닿을 만큼 넓혀 보세요. 가장자리는 디딜 수 있습니다.', 14000);
      } },
      { x: 1180, layers: ['n2'], run: async (g) => {
        g.toastOff();
        await g.talk([
          ['hari', '저기 매달린 것들… 저건 가로등이야. 저건 우리 마을 등이고. 전부 여기 걸려 있었구나.'],
          ['day', '그런데 별처럼 박히지 못해. 매달려서, 밤의 섬에 구멍만 내고 있어.'],
          ['narr', '인간의 빛은 별이 되지 못한다.'],
        ]);
      } },
      { x: 2240, layers: ['n3'], run: async (g) => {
        await g.talk([
          ['hari', '이상하다. 여긴 온통 캄캄한데, 하나도 안 무서워.'],
          ['day', '…그을음이 없으니까. 여기엔 어둠을 무서워하는 사람이 없었던 거야.'],
        ]);
      } },
      { x: 3120, layers: ['n4'], run: async (g) => {
        const G = g.G;
        g.toastOff();
        await g.walk(G.player, 'n4', 3190);
        await g.talk([
          ['narr', '밤의 가장 깊은 곳. 꺼져 가는 별 하나 아래에, 나이트가 앉아 있다.'],
          ['night', '…왔네. 가장자리를 밟고.'],
          ['night', '봐. 빼앗아 온 빛들을 다 걸어 봤어. 하나도 별이 되지 않아.'],
          ['night', '인간의 빛은 너무 가깝고, 너무 급해.\n별은 아주 멀리서, 아주 오래 기다려야 빛나는 건데.'],
          ['day', '나이트, 너 몸이… 비쳐 보여.'],
          ['night', '마지막 별이 꺼지면 나도 꺼져. 원래 그런 거야.'],
          ['night', '말로는 안 돼, 언니. 내 밤을 걸어 봐. 한 번만.'],
        ]);
        await g.fade(true, 1500);
        g.scene('nightwalk');
      } },
    ],
    intro: async (g) => {
      const G = g.G;
      await g.wait(2.4);
      await g.talk([
        ['narr', '밤의 영역. 낮의 것은 들어올 수 없는, 나이트의 하늘.'],
        ['day', '…등불을 덮어야 해. 여기서는 내 빛이 발밑의 섬을 지워 버려.'],
        ['day', '그리고… 힘이 빠져. 낮의 것은, 여기서 오래 버티지 못해.'],
        ['hari', '언니, 등불 줘. 이번엔 내가 들게.'],
      ]);
      const v = await g.choose([
        { t: '부탁할게, 하리. 네가 이끌어 줘.', v: 1 },
        { t: '아니야, 괜찮아. 내가…', v: 0 },
      ]);
      if (v) { g.S.bond++; await g.say('hari', '응! 점등인의 손녀를 믿어 봐.'); }
      else await g.say('hari', '고집쟁이. 비틀거리면서. …줘 봐. 내가 들 수 있어.');
      g.sfx('join');
      if (G.hari) { G.setLead(G.hari, G.day); G.day.alpha = 0.86; }
      await g.say('narr', '하리가 등불을 들었다. 이제 하리가 앞장선다.');
      g.toast('하리를 움직여 밤의 가장 깊은 곳으로 가세요.', 7000);
    },
  };

  /* ── 나이트의 밤: 별이 하나씩 꺼지는 수천 년 ──
   * 나이트는 빛 속에 서지 못한다. 인간의 빛이 늘어날수록, 걸을 수 있는 밤이 줄어든다. */
  const ERA = [
    [260, '첫 불씨가 켜진 밤. 나이트는 별 하나가 꺼지는 것을 보았다.\n언니가 한 일이라는 것은, 금방 알았다.'],
    [1050, '화롯불이 생겼다. 사람들은 밤에도 모여 앉아 이야기를 했다.\n별 열 개가 꺼졌다. 나이트는 길을 돌아서 갔다.'],
    [1900, '촛불. 등잔. 등대. 별 백 개가 꺼졌다.\n나이트는 아무 말도 하지 않았다. 약속이었으니까.'],
    [2750, '가로등이 골목마다 섰다. 밤길이 환해졌다.\n별 천 개가 꺼졌다.'],
    [3520, '네온. 전광판. 잠들지 않는 도시.\n나이트는 세는 것을 그만두었다.'],
  ];
  const WA = 566, WB = 420;        // 아랫길과 윗길. 불빛 하나가 두 길을 한꺼번에 덮지 않도록 넉넉히 띄운다
  const dip = (x) => [[x - 230, WB], [x - 110, 496], [x, 582], [x + 110, 496], [x + 230, WB]];
  const lamp = (id, layer, x, r, era, up) => ({ id, kind: 'none', layer, x, up: up || 40, light: { r, flag: 'era' + era }, visible: false });

  L.nightwalk = {
    id: 'nightwalk', title: '나이트의 밤', sub: '수천 년',
    width: 4500, theme: 'hill', night: true, startAs: 'night', noLantern: true,
    sky: { stars: 1, cloudAlpha: 0.15, lastStar: { x: 4150, y: 130, par: 1, r: 3.6, a: 0 } },
    backdrop: [
      { kind: 'mountains', par: 0.1, base: 400, amp: 150, freq: 0.0022, fade: 0.55, seed: 111 },
      { kind: 'lights', par: 0.1, base: 300, amp: 110, n: 150, seed: 12 },
    ],
    layers: [
      { id: 'w_far', walk: false, tone: 0.1, pts: H.band(-200, 4800, 400, 14, 701) },
      // 윗길은 군데군데 아랫길로 내려와 만난다
      { id: 'w_b', tone: 0.5, pts: [[-200, WB]].concat(dip(650), dip(1500), dip(2350), dip(3200), [[3500, WB], [4800, WB]]) },
      { id: 'w_a', tone: 0.85, pts: [[-200, WA], [4800, WA]], kind: 'poly' },
      { id: 'w_f', walk: false, tone: 1, pts: H.band(-200, 4800, 670, 9, 704) },
    ],
    props: [
      { type: 'pine', layer: 'w_far', x: 200, s: 0.9 }, { type: 'pine', layer: 'w_far', x: 2300, s: 1 },
      { type: 'tree', layer: 'w_b', x: 300, seed: 3 },
      { type: 'hearth', layer: 'w_a', x: 1000, lit: 'era0' },
      { type: 'house', layer: 'w_b', x: 1860, lit: 'era1' }, { type: 'house', layer: 'w_b', x: 1960, lit: 'era1', roof: '#8f6f88' }, { type: 'house', layer: 'w_a', x: 1200, lit: 'era1' },
      { type: 'lighthouse', layer: 'w_far', x: 2600, s: 0.7, lit: 'era2' }, { type: 'house', layer: 'w_a', x: 2700, lit: 'era2' }, { type: 'lamp', layer: 'w_a', x: 2790, lit: 'era2' }, { type: 'lamp', layer: 'w_b', x: 2060, lit: 'era2' },
      { type: 'streetlight', layer: 'w_b', x: 3560, lit: 'era3' }, { type: 'streetlight', layer: 'w_b', x: 3680, lit: 'era3' }, { type: 'house', layer: 'w_b', x: 3620, lit: 'era3' }, { type: 'streetlight', layer: 'w_a', x: 2900, lit: 'era3' },
      { type: 'neon', layer: 'w_a', x: 3880, lit: 'era4', col: '#ff5ac8' }, { type: 'neon', layer: 'w_a', x: 4000, lit: 'era4', col: '#5ad2ff', w: 80 }, { type: 'streetlight', layer: 'w_a', x: 3780, lit: 'era4' },
      { type: 'neon', layer: 'w_b', x: 3800, lit: 'era4', col: '#ffd45a', w: 76 }, { type: 'neon', layer: 'w_b', x: 3960, lit: 'era4', col: '#ff5ac8' },
      { type: 'lonetree', layer: 'w_a', x: 4300, s: 1 },
    ],
    start: { layer: 'w_a', x: 120 },
    hari: false,
    things: [
      lamp('l0', 'w_a', 1000, 88, 0), lamp('l1', 'w_b', 1910, 140, 1), lamp('l1b', 'w_a', 1200, 80, 1),
      lamp('l2', 'w_a', 2750, 90, 2), lamp('l2b', 'w_b', 2060, 80, 2),
      lamp('l3', 'w_b', 3620, 150, 3), lamp('l3b', 'w_a', 2900, 84, 3),
      lamp('l4', 'w_a', 3900, 200, 4), lamp('l4b', 'w_b', 3880, 190, 4),
      // 마지막에 남은 일
      { id: 'gather', sky: true, x: 4150, y: 130, par: 1, r: 120, if: (G) => G.flags.cornered && !G.flags.gathered,
        tap: async (g) => {
          const G = g.G;
          g.toastOff();
          g.flag('gathered');
          g.sfx('dark');
          for (let i = 0; i < 5; i++) g.flag('era' + i, false);
          await g.tween(G, 'farLights', 0, 2.2);
          await g.talk([
            ['narr', '나이트는 손을 뻗었다. 화롯불이, 등대가, 가로등이, 네온이 — 한꺼번에 꺼졌다.'],
            ['narr', '인간 세계에서 모든 빛이 사라진 날이었다.'],
          ]);
        } },
    ],
    triggers: ERA.map(([x, text], i) => ({ x, run: async (g) => {
      g.toastOff();
      g.flag('era' + i);
      g.sfx(i === 0 ? 'chime' : 'dark');
      await g.say('narr', text);
    } })).concat([
      { x: 4080, if: (G) => G.flags.gathered, run: async (g) => {
        const G = g.G;
        await g.walk(G.night, 'w_a', 4140);
        await g.talk([
          ['narr', '수천 년 동안 나이트는 한 번도 언니에게 말하지 않았다.\n낮은 언니의 것이었으니까. 서로의 시간을 넘보지 않기로 했으니까.'],
        ]);
        await g.fade(true, 1400);
        // 지금
        G.day = G.addAgent({ id: 'day', kind: 'day', layer: 'w_a', x: 3990, dir: 1 });
        if (G.S.hari) G.hari = G.addAgent({ id: 'hari', kind: 'hari', layer: 'w_a', x: 3920, dir: 1, pole: true });
        g.face(G.night, -1);
        G.night.alpha = 0.62;
        await g.fade(false, 1600);
        await g.talk([
          ['narr', '— 지금.'],
          ['night', '…이게 내 밤이야, 언니.'],
        ]);
        const v = await H.duskChoice(g, {
          weight: 2,
          hostile: '그래도 네가 한 일은 잘못이야. 빛을 돌려놔.',
          understand: '…이렇게 오래, 혼자였구나.',
          trust: '이제 혼자 세지 않아도 돼. 남은 밤은 같이 걷자.',
        });
        await g.say('night', {
          hostile: '…끝까지 그 말이네. 알았어.',
          understand: '혼자인 건 괜찮았어. 아무도 모르는 게, 싫었지.',
          trust: '…같이. 언니가 그 말을 하는 날이 올 줄은 몰랐어.',
        }[v]);
        await g.talk([
          ['night', '황혼의 언덕으로 와. 우리가 처음 약속했던 곳.'],
          ['hari', '저도 갈래요. 불을 쓰는 건 인간이니까, 약속에 인간도 있어야죠.'],
        ]);
        await g.fade(true, 1300);
        g.next();
      } },
    ]),
    intro: async (g) => {
      await g.wait(2.6);
      await g.say('narr', '첫 번째 밤. 하늘에는 셀 수 없이 많은 별이 있었다.');
      g.toast('나이트가 되어, 수천 년의 밤을 걸어가세요. 나이트는 빛 속에 설 수 없습니다.', 9000);
    },
    setup: (g) => { g.G.farLights = 0; },
    update: (g, dt) => {
      const G = g.G, p = G.player;
      if (!p) return;
      const k = U.clamp((p.x - 260) / 3500, 0, 1);
      G.starAmount = Math.min(G.starAmount, Math.max(Math.pow(1 - k, 1.6), 0.004));   // 한 번 꺼진 별은 돌아오지 않는다
      if (!G.flags.gathered) G.farLights = Math.max(G.farLights, k);
      G.lastStar.a = U.approach(G.lastStar.a, k > 0.86 ? 0.85 : 0, 1, dt);
      // 더는 걸을 밤이 없다
      if (G.flags.era4 && !G.flags.cornered && !G.busy && !p.path.length && p.x > 3560) {
        G.flags.cornered = true;
        G.run(async (g2) => {
          await g2.talk([
            ['narr', '더는 걸을 밤이 없었다. 어디를 디뎌도 빛이었다.'],
            ['narr', '머리 위에는 별 하나. 그것이 꺼지면, 나이트도 꺼진다.'],
          ]);
          g2.toast('마지막 별을 눌러, 빛을 거두세요.', 20000);
        });
      }
    },
  };

  /* ═════════ 최종장 — 황혼의 언덕: 새 약속 ═════════ */
  // dy: 결말 장면에서는 글이 아래에 깔리므로 언덕을 조금 올려 그린다
  const hillLayers = (dy) => {
    const up = (pts) => pts.map(([x, y]) => [x, y + (dy || 0)]);
    return [
      { id: 'f_far', walk: false, tone: 0.1, pts: up([[-200, 470], [300, 452], [800, 474], [1300, 486], [1800, 468], [2300, 450], [2900, 474]]) },
      { id: 'road', tone: 0.55, pts: up([[-200, 590], [300, 584], [700, 560], [1000, 500], [1180, 466], [1300, 458], [1420, 466], [1600, 500], [1900, 560], [2300, 584], [2900, 590]]) },
      { id: 'f_f', walk: false, tone: 1, pts: up([[-200, 676], [600, 684], [1300, 672], [2000, 686], [2900, 676]]) },
    ];
  };
  const hillBackdrop = (dy) => ([
    { kind: 'mountains', par: 0.1, base: 440 + (dy || 0), amp: 150, freq: 0.0024, fade: 0.6, seed: 131 },
    { kind: 'lights', par: 0.1, base: 396 + (dy || 0), amp: 60, n: 110, seed: 14 },
  ]);
  const END_DY = -92;
  const CHAIR = { day: 1256, mid: 1300, night: 1344, y: 458 - 14 };

  L.finale = {
    id: 'finale', title: '최종장 · 황혼의 언덕', sub: '새 약속',
    width: 2600, theme: 'hill', tod: [[0, 0.6], [1000, 1]],
    sky: { sun: { x: 1420, y: 372, r: 60, par: 0.1, col: '#ffc98a' }, stars: 0.03 },
    backdrop: hillBackdrop(),
    layers: hillLayers(),
    props: [
      { type: 'chairs', layer: 'road', x: CHAIR.mid, gap: 44, s: 1.3, third: 'third' },
      { type: 'lonetree', layer: 'road', x: 1160, s: 1.25 },
      { type: 'tree', layer: 'road', x: 300, seed: 4 }, { type: 'fence', layer: 'road', x: 480, n: 6 },
    ],
    start: { layer: 'road', x: 150 },
    things: [
      { id: 'hk_tree', kind: 'hook', x: 1180, y: 330, r: 46, if: (G) => G.flags.setLantern },
    ],
    triggers: [
      { x: 1190, run: async (g) => {
        const G = g.G;
        g.toastOff();
        await g.walk(G.day, 'road', 1226);
        g.face(G.day, 1);
        await g.cam(1300, 1.6);
        await g.say('narr', '언덕 꼭대기에는 의자가 세 개. 마지막 노을이 지고 있다.');
        await g.tween(G.sun, 'a', 0, 1.4);
        await g.nightfall(3.4);
        G.night = G.addAgent({ id: 'night', kind: 'night', layer: 'road', x: 1640, dir: -1, alpha: 0 });
        await g.tween(G.night, 'alpha', 1, 2);
        await g.talk([
          ['narr', '밤이 오자, 빛이 닿지 않는 저편에 나이트가 서 있었다.'],
          ['night', '거기까지야, 언니. 나는 언니 빛 속에 설 수 없어.'],
          ['day', '나도 네 어둠을 다 밝히고 싶지 않아. …그러면, 그 사이에서 만나자.'],
        ]);
        g.flag('setLantern');
        g.toast('나무의 고리에 등불을 걸고, 빛의 가장자리가 가운데 의자를 지나도록 크기를 맞추세요.', 20000);
      } },
    ],
    setup: (g) => { g.G.farLights = 0; },
    intro: async (g) => {
      await g.wait(2.4);
      await g.talk([
        ['narr', '황혼의 언덕. 낮과 밤이 만나는, 단 하나의 자리.'],
        ['day', '저 위야. 매일 나이트와 손을 맞대던 곳.'],
        ['hari', '언니, 떨려?'],
        ['day', '…응. 수천 년 만에 처음으로.'],
      ]);
    },
    update: (g) => {
      const G = g.G, ter = G.terrain;
      if (!G.flags.setLantern || G.flags.seated || G.busy || G.lan.mode !== 'hung' || G.pointer) return;
      // 데이의 의자는 낮에, 나이트의 의자는 밤에, 가운데 의자는 그 가장자리에
      if (ter.zoneAt(CHAIR.mid, CHAIR.y) !== 'dusk' || ter.zoneAt(CHAIR.day, CHAIR.y) !== 'day' || ter.zoneAt(CHAIR.night, CHAIR.y) !== 'night') return;
      G.flags.seated = true;
      G.run(L.finale.promise);
    },
    promise: async (g) => {
      const G = g.G;
      g.toastOff();
      g.sfx('bell');
      await g.walk(G.day, 'road', CHAIR.day - 10);
      g.face(G.day, 1);
      await g.walk(G.night, 'road', CHAIR.night + 12, { force: true, speed: 110 });
      g.face(G.night, -1);
      await g.talk([
        ['narr', '빛의 가장자리가 가운데 의자 위에 놓였다. 쌍둥이가 처음으로, 같은 시간에 마주 섰다.'],
        ['night', '언니.'],
        ['day', '나이트.'],
        ['hari', '…저도 있어요. 인간도 약속에 끼워 주세요. 불을 쓰는 건 우리니까.'],
      ]);
      const em = G.addThing({ id: 'witness', kind: 'spirit', spirit: 'ember', layer: 'road', x: CHAIR.mid, dy: 20, tired: 0.2, alpha: 0, scale: 1.2 });
      g.sfx('chime');
      await Promise.all([g.tween(em, 'alpha', 1, 1.2), g.tween(em, 'dy', 84, 1.2)]);
      await g.talk([
        ['ember', '약속에는 증인이 있어야지. 옛 증인은 잠들었으니, 오늘은 내가 타고 있을게.'],
        ['ember', '먼저, 빛들을 어디에 둘지 정해. 다들 기다리고 있어.'],
      ]);
      // 빛의 마지막 배치 (축 A 확정)
      const init = {};
      for (const sp of DN.Story.SPIRITS) init[sp.k] = G.S.A[sp.k] || sp.wish;
      const placed = await DN.UI.place(DN.Story.SPIRITS, init);
      Object.assign(G.S.A, placed);
      const ax = DN.Story.axes(G.S);
      await g.say('narr', {
        human: '빛은 거의 모두 인간의 밤으로 돌아간다.',
        night: '빛은 거의 모두 나이트의 하늘에 남는다.',
        balance: '빛은 인간의 밤과 나이트의 하늘에, 나뉘어 놓인다.',
      }[ax.A]);
      if (ax.allClues) {
        await g.talk([
          ['narr', '그때, 빛의 가장자리에 놓인 가운데 의자가 희미하게 빛났다.'],
          ['day', '…낮도 밤도 아닌 자리. 의자가 셋인 까닭을, 이제 알 것 같아.'],
        ]);
      }
      await g.say('night', '이제 말해, 언니. 우리, 어떻게 할까.');
      const w = await g.choose([
        { t: '새 약속을 하자. 낮과 밤, 그리고 그 사이를 함께 정하는 약속.', v: 'promise' },
        { t: '함께 있고 싶어. 해가 지지 않으면, 헤어지지 않아도 되잖아.', v: 'together' },
      ]);
      G.S.wish = w;
      if (w === 'together' && DN.Story.axes(G.S).B !== 'trust') {
        await g.say('night', '…그건 약속이 아니야, 언니. 그건 그냥, 놓지 않겠다는 거지.');
      }
      g.finish();
    },
  };

  /* ═════════ 결말의 마지막 장면 ═════════ */
  L.ending = {
    id: 'ending', width: 2600, theme: 'hill', tod: 1, camCenter: 1300,
    sky: { stars: 0.03 },
    backdrop: hillBackdrop(END_DY),
    layers: hillLayers(END_DY),
    props: [
      { type: 'chairs', layer: 'road', x: 1300, gap: 44, s: 1.3, third: 'third' },
      { type: 'lonetree', layer: 'road', x: 1520, s: 1.1 },
    ],
    setup: (g) => {
      const G = g.G, c = G.endingCfg || {};
      G.todOverride = c.tod === undefined ? 1 : c.tod;
      G.tod = G.todOverride;
      G.starAmount = c.stars || 0;
      G.farLights = c.lights || 0;
      const has = (w) => (c.who || []).includes(w);
      const tod = G.todOverride;
      if (tod < 1.6 || tod > 2.6) G.sun = { x: tod > 2.6 ? 1160 : 1420, y: (tod < 0.6 ? 150 : 372) + END_DY, r: 60, par: 1, a: 1, col: tod > 2.6 ? '#ffe2c0' : '#ffc98a' };
      if (c.third) G.flags.third = true;
      const put = (who, x, dir, opt) => G.addThing(Object.assign({ id: 'e_' + who, kind: 'girl', who, layer: 'road', x, dir }, opt));
      if (has('day')) put('day', c.apart ? 1196 : 1242, 1, c.dayAsNight ? { layer: 'f_far', x: 1640, dir: -1, alpha: 0.9 } : {});
      if (c.dayFar) put('day', 1700, -1, { layer: 'f_far', alpha: 0.5 });
      if (has('night')) put('night', c.apart ? 1410 : 1362, -1, {});
      if (has('dusk')) put('day', 1300, 1, { id: 'e_dusk', variant: 'dusk' });
      if (has('hari')) G.addThing({ id: 'e_hari', kind: 'npc', who: 'hari', layer: 'road', x: c.hariAlone ? 1290 : c.hariFront ? 1300 : 1150, dir: 1, pole: true });
      if (c.hariFront || c.hariAlone) G.addThing({ id: 'e_lamp', kind: 'lamp', layer: 'road', x: 1440, dy: 0, lit: c.hariFront });
    },
    update: (g, dt) => {
      const G = g.G, c = G.endingCfg || {};
      if (c.frozen) G.time -= dt * 0.92;        // 시간이 거의 멈춘다
      if (c.fadeAll) G.todOverride = Math.max(1, G.todOverride - dt * 0.02);
    },
  };
})(typeof globalThis !== 'undefined' ? globalThis : window);
