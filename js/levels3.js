/* 데이 & 나이트 — 장면들 (3/3): 4장 동굴과 기억, 5장 밤의 영역, 최종장, 결말 */
(function (root) {
  'use strict';
  const DN = (root.DN = root.DN || {});
  const U = DN.U, L = DN.LEVELS, H = DN.LevelHelp;
  const TAU = Math.PI * 2;

  /* ═════════ 4장 — 잊힌 동굴: 최초의 불씨 ═════════ */
  const MURAL_X = 3150;
  const SHARD_LINES = [
    ['…눈이 내리고 있었다. 아주 추운 겨울밤이었다.', '이건… 누구의 기억이지?'],
    ['…어둠 속에서 아이 하나가 떨고 있었다. 불이라는 것이 아직 없던 때.', '왜 이렇게, 아는 것 같지.'],
    ['…누군가 하늘에서 내려왔다. 손에 작은 해를 쥐고.', '…손에, 작은 해를.'],
  ];
  function shard(id, layer, x) {
    return { id, kind: 'shard', layer, x, dy: 34, r: 56,
      tap: async (g, self) => {
        const G = g.G;
        self.visible = false; self.gone = true;
        const n = (G.flags.shards || 0);
        g.flag('shards', n + 1);
        g.sfx('memory');
        G.sparkle(self.x, G.terrain.yAt(layer, self.x) - 34, [255, 220, 150], 26, 80);
        await g.wait(0.5);
        await g.talk([['narr', SHARD_LINES[n][0]], ['day', SHARD_LINES[n][1]]]);
        if (n === 0) await g.say('narr', '기억 조각을 볼 수 있게 되었다. 동굴 안에 두 개가 더 있다.');
        if (n === 2) g.toast('벽화가 또렷해졌어요. 동굴 가장 깊은 곳으로 가 보세요.', 6000);
      } };
  }

  L.ch4 = {
    id: 'ch4', title: '4장 · 잊힌 동굴', sub: '최초의 불씨',
    width: 3800, theme: 'cave', tod: 2, lightR: 300,
    sky: { none: true },
    backdrop: [
      { kind: 'cavewall', par: 0.6, seed: 71 },
      { kind: 'mural', par: 1 },
    ],
    fore: { kind: 'stalactites' },
    layers: [
      { id: 'k_c', style: 'rock', tone: 0.25, pts: H.band(-200, 4100, 385, 7, 402) },
      { id: 'k_b', style: 'rock', tone: 0.55, pts: H.band(-200, 4100, 476, 7, 403),
        knobs: [{ c: 560, w: 230, lo: 0, hi: 116 }, { c: 1560, w: 220, lo: -118, hi: 0 }] },
      { id: 'k_a', style: 'rock', tone: 0.82, pts: H.band(-200, 4100, 566, 7, 404),
        knobs: [{ c: 980, w: 200, lo: -116, hi: 0 }, { c: 1560, w: 220, lo: -116, hi: 0 }, { c: 2480, w: 200, lo: -116, hi: 0 }] },
      { id: 'k_f', style: 'rock', walk: false, tone: 1, pts: H.band(-200, 4100, 670, 10, 405) },
    ],
    blocks: [
      { layer: 'k_a', x0: 760, x1: 850, prop: 'rocks' },
      { layer: 'k_b', x0: 1140, x1: 1230, prop: 'rocks' },
      { layer: 'k_b', x0: 2640, x1: 2730, prop: 'rocks' },
    ],
    props: [
      { type: 'stalagmite', layer: 'k_c', x: 300, h: 60 }, { type: 'crystal', layer: 'k_c', x: 640, col: '#9fb6e8' }, { type: 'stalagmite', layer: 'k_c', x: 1100, h: 46 },
      { type: 'crystal', layer: 'k_c', x: 1300, s: 1.2, col: '#b7a0e0' }, { type: 'stalagmite', layer: 'k_c', x: 2300, h: 70 }, { type: 'crystal', layer: 'k_c', x: 2760, col: '#9fd0e8' },
      { type: 'crystal', layer: 'k_b', x: 260, s: 0.9, col: '#b7a0e0' }, { type: 'stalagmite', layer: 'k_b', x: 1340, h: 36 }, { type: 'crystal', layer: 'k_b', x: 2150, col: '#9fb6e8' },
      { type: 'stalagmite', layer: 'k_b', x: 2900, h: 50 }, { type: 'crystal', layer: 'k_b', x: 3560, s: 1.1, col: '#e0c090' },
      { type: 'stalagmite', layer: 'k_a', x: 380, h: 40 }, { type: 'crystal', layer: 'k_a', x: 1230, s: 0.8, col: '#9fd0e8' }, { type: 'stalagmite', layer: 'k_a', x: 2200, h: 44 },
      { type: 'crystal', layer: 'k_a', x: 2840, col: '#e0c090' }, { type: 'stalagmite', layer: 'k_a', x: 3620, h: 56 },
    ],
    start: { layer: 'k_a', x: 140 },
    things: [
      shard('sh_a', 'k_b', 960),
      shard('sh_b', 'k_c', 1760),
      shard('sh_c', 'k_b', 2400),
      H.clue({ id: 'mural', layer: 'k_a', x: 3470, dy: 250, r: 70, standX: 3400, touch: 90, touchY: 300, if: (G) => G.flags.sawMural && !G.S.clues.includes('mural') }, 'mural', [
        ['narr', '벽화 한구석. 누군가 긁어 지운 자리에, 세 번째 소녀의 윤곽이 희미하게 남아 있다.'],
        ['hari', '여기 한 명 더 있었나 봐. 빛나는 사람도, 까만 사람도 아닌…'],
        ['day', '…노을 언덕의 의자가, 세 개였지.'],
      ]),
      { id: 'emberspot', kind: 'spot', layer: 'k_a', x: MURAL_X, dy: 40, r: 70,
        if: (G) => G.flags.sawMural && !G.flags.emberDone,
        tap: async (g) => {
          const G = g.G;
          if ((G.flags.shards || 0) < 3) {
            await g.say('day', '벽화가 흐려서 잘 보이지 않아. 기억 조각이 더 있을 거야.');
            return;
          }
          g.flag('emberDone');
          const sp = G.addThing({ id: 'esp', kind: 'spirit', spirit: 'ember', layer: 'k_a', x: MURAL_X + 40, dy: 10, tired: 0.4, alpha: 0, scale: 1.3 });
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
      { x: 660, layers: ['k_a'], run: async (g) => { await g.say('hari', '돌이 무너져 있어. 저 위 바위턱으로 돌아가자.'); } },
      { x: 1280, layers: ['k_a'], run: async (g) => {
        await g.talk([
          ['hari', '저기 맨 위에 뭔가 반짝여. 두 단이나 올라가야 하는데…'],
          ['day', '한 단씩 올리면 돼. 서 있는 바위는 못 움직이니까, 물러섰다가 다시.'],
        ]);
      } },
      { x: 2860, layers: ['k_a'], run: async (g) => {
        const G = g.G;
        await g.walk(G.day, 'k_a', 3030);
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
      await g.wait(2.4);
      await g.talk([
        ['narr', '산 아래 굴. 하리의 할아버지가 노래로만 전해 준 곳.'],
        ['hari', '점등인은 누구나 한 번은 여기 와 본대. 첫 불이 켜진 자리니까.'],
        ['day', '첫 불… 나이트는 왜 나더러 여길 찾으라고 한 걸까.'],
      ]);
      g.toast('동굴 안에서 반짝이는 기억 조각 셋을 찾으세요.', 7000);
    },
    drawMural: (ctx, G, b, ox, pal, t) => {
      const n = G.flags.shards || 0;
      const a = 0.2 + n * 0.2;
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
      // 빛나는 소녀
      const girl = (gx, gy, col, s, hair) => {
        ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = 3 * s;
        ctx.beginPath(); ctx.arc(gx, gy - 86 * s, 11 * s, 0, TAU); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(gx, gy - 74 * s); ctx.lineTo(gx - 22 * s, gy); ctx.lineTo(gx + 22 * s, gy); ctx.closePath(); ctx.stroke();
        if (hair) for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(gx - 9 * s, gy - 92 * s + i * 3); ctx.quadraticCurveTo(gx - 32 * s, gy - 60 * s, gx - 26 * s - i * 3, gy - 20 * s); ctx.stroke(); }
      };
      girl(200, 330, pale, 1.1, true);
      // 건네는 팔과 불씨
      ctx.strokeStyle = pale; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(212, 268); ctx.lineTo(262, 262); ctx.stroke();
      ctx.fillStyle = `rgba(255,170,80,${Math.min(1, a + 0.25)})`;
      ctx.beginPath(); ctx.moveTo(272, 268); ctx.quadraticCurveTo(262, 252, 274, 238); ctx.quadraticCurveTo(286, 254, 272, 268); ctx.fill();
      if (n >= 3) DN.Render.glows.push({ x: (x0 + 273) * DN.Render.scale, y: 254 * DN.Render.scale, r: 44 * DN.Render.scale, rgb: [255, 170, 80], a: 0.4 + 0.1 * Math.sin(t * 3) });
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
      girl(470, 330, `rgba(60,50,80,${a + 0.2})`, 0.9, true);
      // 긁혀 지워진 세 번째 소녀
      ctx.globalAlpha = 0.5;
      girl(570, 330, `rgba(200,150,190,${a * 0.5})`, 0.9, true);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = `rgba(30,22,28,${a * 1.2})`; ctx.lineWidth = 2;
      for (let i = 0; i < 9; i++) { ctx.beginPath(); ctx.moveTo(542 + i * 7, 236 + (i % 3) * 6); ctx.lineTo(556 + i * 7, 330 - (i % 2) * 10); ctx.stroke(); }
      ctx.restore();
    },
  };

  /* ── 기억 속: 첫 번째 겨울 ── */
  L.memory = {
    id: 'memory', title: '아주 오래전', sub: '첫 번째 겨울',
    width: 1800, theme: 'snow', tod: 2, lockLantern: true, lightR: 210,
    sky: { stars: 1, cloudAlpha: 0.2 },
    backdrop: [
      { kind: 'mountains', par: 0.15, base: 360, amp: 150, freq: 0.003, fade: 0.5, seed: 81 },
    ],
    layers: [
      { id: 'm_far', walk: false, tone: 0.1, pts: H.band(-200, 2100, 330, 14, 501) },
      { id: 'm_b', style: 'snow', tone: 0.5, pts: H.band(-200, 2100, 470, 7, 502), knobs: [{ c: 820, w: 230, lo: 0, hi: 116 }] },
      { id: 'm_a', style: 'snow', tone: 0.85, pts: H.band(-200, 2100, 560, 7, 503) },
      { id: 'm_f', style: 'snow', walk: false, tone: 1, pts: H.band(-200, 2100, 668, 9, 504) },
    ],
    blocks: [{ layer: 'm_a', x0: 1010, x1: 1100, prop: 'rocks' }],
    props: [
      { type: 'pine', layer: 'm_far', x: 300, s: 0.9 }, { type: 'pine', layer: 'm_far', x: 1500, s: 1 },
      { type: 'pine', layer: 'm_b', x: 380, s: 1.1 }, { type: 'lonetree', layer: 'm_b', x: 1420, s: 0.8 }, { type: 'pine', layer: 'm_a', x: 640, s: 1 },
    ],
    start: { layer: 'm_a', x: 220, h: 96 },
    hari: false,
    things: [
      { id: 'child', kind: 'npc', who: 'child', layer: 'm_b', x: 1240, dir: -1, shiver: true },
    ],
    triggers: [
      { x: 1150, layers: ['m_b'], run: async (g) => {
        const G = g.G, child = G.thing('child');
        g.toastOff();
        await g.walk(G.day, 'm_b', 1178);
        g.face(G.day, 1);
        await g.talk([
          ['child', '…추워. …캄캄해. 아무도, 없어…?'],
          ['day', '밤은 나이트의 것. 서로의 시간을 넘보지 않기로 약속했어.'],
          ['day', '…하지만 이 아이는 아침까지 버티지 못해.'],
        ]);
        await g.choose([{ t: '불씨를 건넨다.', v: 1 }]);
        g.sfx('chime');
        for (let i = 0; i < 30; i++) {
          G.particles.push({ x: G.day.x + 20, y: G.day.y - 44, vx: 44 + Math.random() * 30, vy: -20 + Math.random() * 30, g: 0, life: 0, max: 0.9 + Math.random() * 0.5, r: 1.5 + Math.random() * 2, col: [255, 214, 140], add: true });
        }
        await g.wait(1.1);
        const sp = G.addThing({ id: 'first', kind: 'spirit', spirit: 'ember', layer: 'm_b', x: 1214, dy: 22, tired: 0, scale: 1.2, alpha: 0 });
        await g.tween(sp, 'alpha', 1, 1);
        child.shiver = false;
        g.flag('firstFire');
        await g.talk([
          ['narr', '밤에 켜진, 세상의 첫 번째 빛이었다.'],
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
      // 눈
      if (Math.random() < dt * 40) {
        G.particles.push({ x: G.cam.x + Math.random() * (DN.Render.W + 200) - 100, y: -10, vx: -14 + Math.random() * 10, vy: 46 + Math.random() * 40, g: 0, life: 0, max: 9, r: 1 + Math.random() * 1.6, col: [236, 240, 255], add: true });
      }
    },
    drawOver: (ctx, G, env, camX) => {
      if (!G.flags.firstFire) return;
      const y = G.terrain.yAt('m_b', 1214) - 22;
      DN.Render.lights.push({ x: 1214 - camX, y, r: 230, a: 0.95, warm: 1 });
    },
  };

  /* ── 동굴 어귀: 고백 ── */
  L.cavemouth = {
    id: 'cavemouth', width: 2000, theme: 'hill', tod: 2.7,
    sky: { stars: 0.02 },
    backdrop: [
      { kind: 'mountains', par: 0.12, base: 380, amp: 170, freq: 0.0026, fade: 0.6, seed: 91 },
    ],
    layers: [
      { id: 'e_far', walk: false, tone: 0.1, pts: H.band(-200, 2300, 330, 14, 601) },
      { id: 'e_c', tone: 0.35, pts: H.band(-200, 2300, 400, 8, 602) },
      { id: 'e_a', tone: 0.8, pts: H.band(-200, 2300, 560, 8, 603) },
      { id: 'e_f', walk: false, tone: 1, pts: H.band(-200, 2300, 668, 9, 604) },
    ],
    props: [
      { type: 'cavehole', layer: 'e_a', x: 150 }, { type: 'pine', layer: 'e_c', x: 520, s: 1 }, { type: 'tree', layer: 'e_c', x: 1700, seed: 4 },
      { type: 'lonetree', layer: 'e_a', x: 840, s: 0.9 }, { type: 'pine', layer: 'e_far', x: 1000, s: 0.9 },
    ],
    start: { layer: 'e_a', x: 330 },
    triggers: [
      { x: 900, layers: ['e_a'], run: async (g) => {
        const G = g.G;
        await g.walk(G.day, 'e_a', 960);
        g.face(G.day, 1);
        await g.cam(1150, 2);
        await H.summonNight(g, 'e_c', 1330, 1);
        await g.talk([
          ['narr', '동굴 밖은 새벽이었다. 능선 위에, 나이트가 등을 보인 채 서 있다.'],
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
          ['night', '내 하늘로 와. 말로는 안 돼.'],
          ['night', '직접 봐. 언니가 준 불씨가, 내 밤에 무슨 일을 했는지.'],
        ]);
        await g.tween(G.night, 'alpha', 0, 2);
        await g.fade(true, 1200);
        g.next();
      } },
    ],
    intro: async (g) => {
      const G = g.G;
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

  /* ═════════ 5장 — 밤의 영역: 나이트의 하늘 ═════════ */
  const hung = (layer, x, len, col, seed) => ({ type: 'hung', layer, x, len, col, seed });

  L.ch5 = {
    id: 'ch5', title: '5장 · 밤의 영역', sub: '나이트의 하늘',
    width: 3500, theme: 'realm', tod: 2, lightR: 230,
    sky: { stars: 0.03, cloudAlpha: 0.25, lastStar: { x: 3080, y: 150, par: 1, r: 3.6, a: 0.8 } },
    backdrop: [],
    layers: [
      { id: 'n_far1', walk: false, style: 'glass', thick: 70, tone: 0.1, pts: [[300, 250], [520, 236], [760, 250]] },
      { id: 'n_far2', walk: false, style: 'glass', thick: 80, tone: 0.15, pts: [[1700, 300], [1950, 282], [2200, 300]] },
      { id: 'n2', style: 'glass', thick: 84, tone: 0.5,
        pts: [[640, 444], [820, 430], [1050, 424], [1280, 432], [1480, 448]],
        knobs: [{ c: 790, w: 220, lo: 0, hi: 134 }] },
      { id: 'n4', style: 'glass', thick: 100, tone: 0.45,
        pts: [[2200, 462], [2400, 444], [2700, 430], [3100, 430], [3360, 446]],
        knobs: [{ c: 2330, w: 210, lo: 0, hi: 128 }] },
      { id: 'n1', style: 'glass', thick: 120, tone: 0.9,
        pts: [[-100, 556], [200, 548], [500, 552], [830, 566]] },
      { id: 'n3', style: 'glass', thick: 110, tone: 0.85,
        pts: [[1400, 560], [1600, 548], [1900, 540], [2200, 548], [2440, 562]],
        knobs: [{ c: 1530, w: 210, lo: -126, hi: 0 }] },
    ],
    props: [
      hung('n1', 120, 250, '#ffd08a', 1), hung('n1', 420, 330, '#ffb070', 2), hung('n1', 700, 200, '#ffe9a6', 3),
      hung('n2', 900, 190, '#ffc680', 4), hung('n2', 1160, 300, '#ff9ade', 5), hung('n2', 1400, 240, '#a9ebc8', 6),
      hung('n3', 1650, 320, '#ffd08a', 7), hung('n3', 1900, 220, '#ffe9a6', 8), hung('n3', 2150, 360, '#ff9ade', 9), hung('n3', 2350, 260, '#ffc680', 10),
      hung('n4', 2600, 180, '#ffd08a', 11), hung('n4', 2800, 280, '#ffb070', 12),
      hung('n_far1', 500, 110, '#ffd08a', 13), hung('n_far2', 1950, 130, '#ffe9a6', 14),
    ],
    start: { layer: 'n1', x: 150 },
    things: [
      { id: 'nightsit', kind: 'girl', who: 'night', layer: 'n4', x: 3080, dir: -1, alpha: 0.62 },
    ],
    triggers: [
      { x: 960, layers: ['n2'], run: async (g) => {
        await g.talk([
          ['hari', '저기 매달린 것들… 저건 가로등이야. 저건 우리 마을 등이고.'],
          ['hari', '전부 여기 걸려 있었구나.'],
          ['day', '그런데 빛나지 않아. 별처럼 박히지 못하고, 매달려만 있어.'],
          ['narr', '인간의 빛은 별이 되지 못한다.'],
        ]);
      } },
      { x: 1700, layers: ['n3'], run: async (g) => {
        await g.talk([
          ['hari', '이상하다. 여긴 온통 캄캄한데, 하나도 안 무서워.'],
          ['day', '…그을음이 없으니까. 여기엔 어둠을 무서워하는 사람이 없었던 거야.'],
        ]);
      } },
      { x: 2940, layers: ['n4'], run: async (g) => {
        const G = g.G;
        g.toastOff();
        await g.walk(G.player, 'n4', 2980);
        await g.talk([
          ['narr', '밤의 가장 깊은 곳. 꺼져 가는 별 하나 아래에, 나이트가 앉아 있다.'],
          ['night', '…왔네.'],
          ['night', '봐. 다 걸어 봤어. 하나도 별이 되지 않아.'],
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
        ['day', '…힘이 빠져. 여기서는 내 빛이 닿지 않아.'],
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

  /* ── 나이트의 밤: 별이 하나씩 꺼지는 수천 년 ── */
  const ERA = [
    [260, '첫 불씨가 켜진 밤. 나이트는 별 하나가 꺼지는 것을 보았다.\n언니가 한 일이라는 것은, 금방 알았다.'],
    [1000, '화롯불이 생겼다. 사람들은 밤에도 모여 앉아 이야기를 했다.\n별 열 개가 꺼졌다.'],
    [1750, '촛불. 등잔. 등대. 별 백 개가 꺼졌다.\n나이트는 아무 말도 하지 않았다. 약속이었으니까.'],
    [2500, '가로등이 골목마다 섰다. 밤길이 환해졌다.\n별 천 개가 꺼졌다.'],
    [3250, '네온. 전광판. 잠들지 않는 도시.\n나이트는 세는 것을 그만두었다.'],
  ];
  L.nightwalk = {
    id: 'nightwalk', title: '나이트의 밤', sub: '수천 년',
    width: 4400, theme: 'hill', tod: 2, startAs: 'night', noLantern: true,
    sky: { stars: 1, cloudAlpha: 0.15, lastStar: { x: 4050, y: 130, par: 1, r: 3.6, a: 0 } },
    backdrop: [
      { kind: 'mountains', par: 0.1, base: 400, amp: 150, freq: 0.0022, fade: 0.55, seed: 111 },
      { kind: 'lights', par: 0.1, base: 300, amp: 110, n: 150, seed: 12 },
    ],
    layers: [
      { id: 'w_far', walk: false, tone: 0.1, pts: H.band(-200, 4700, 400, 14, 701) },
      { id: 'w_b', tone: 0.5, pts: H.band(-200, 4700, 478, 7, 702), knobs: [{ c: 1350, w: 220, lo: 0, hi: 116 }] },
      { id: 'w_a', tone: 0.85, pts: H.band(-200, 4700, 566, 7, 703), knobs: [{ c: 2950, w: 220, lo: -116, hi: 0 }] },
      { id: 'w_f', walk: false, tone: 1, pts: H.band(-200, 4700, 670, 9, 704) },
    ],
    blocks: [
      { layer: 'w_a', x0: 1560, x1: 1650, prop: 'rocks' },
      { layer: 'w_b', x0: 3160, x1: 3250, prop: 'bramble' },
    ],
    props: [
      { type: 'pine', layer: 'w_far', x: 200, s: 0.9 }, { type: 'pine', layer: 'w_far', x: 2300, s: 1 },
      { type: 'tree', layer: 'w_b', x: 300, seed: 3 }, { type: 'hearth', layer: 'w_a', x: 820, lit: 'era1' }, { type: 'house', layer: 'w_b', x: 1040, lit: 'era1' },
      { type: 'house', layer: 'w_a', x: 1180, lit: 'era1' }, { type: 'house', layer: 'w_b', x: 1780, lit: 'era2', roof: '#8f6f88' }, { type: 'lamp', layer: 'w_b', x: 1880, lit: 'era2' },
      { type: 'lighthouse', layer: 'w_far', x: 2100, s: 0.7, lit: 'era2' }, { type: 'house', layer: 'w_a', x: 1960, lit: 'era2' }, { type: 'lamp', layer: 'w_a', x: 2080, lit: 'era2' },
      { type: 'streetlight', layer: 'w_b', x: 2520, lit: 'era3' }, { type: 'streetlight', layer: 'w_b', x: 2700, lit: 'era3' }, { type: 'house', layer: 'w_b', x: 2610, lit: 'era3' },
      { type: 'streetlight', layer: 'w_a', x: 2440, lit: 'era3' }, { type: 'streetlight', layer: 'w_a', x: 2640, lit: 'era3' }, { type: 'house', layer: 'w_a', x: 2760, lit: 'era3', w: 54 },
      { type: 'neon', layer: 'w_b', x: 3330, lit: 'era4', col: '#ff5ac8' }, { type: 'neon', layer: 'w_b', x: 3480, lit: 'era4', col: '#5ad2ff', w: 80 }, { type: 'streetlight', layer: 'w_b', x: 3580, lit: 'era4' },
      { type: 'neon', layer: 'w_a', x: 3300, lit: 'era4', col: '#ffd45a', w: 76 }, { type: 'streetlight', layer: 'w_a', x: 3420, lit: 'era4' }, { type: 'neon', layer: 'w_a', x: 3560, lit: 'era4', col: '#ff5ac8' },
      { type: 'lonetree', layer: 'w_a', x: 4160, s: 1 },
    ],
    start: { layer: 'w_a', x: 120 },
    hari: false,
    triggers: ERA.map(([x, text], i) => ({ x, run: async (g) => {
      g.toastOff();
      g.flag('era' + i);
      g.sfx(i === 0 ? 'chime' : 'dark');
      await g.say('narr', text);
    } })).concat([
      { x: 3960, layers: ['w_a'], run: async (g) => {
        const G = g.G;
        await g.walk(G.night, 'w_a', 4020);
        await g.talk([
          ['narr', '그리고 하나가 남았다.'],
          ['narr', '수천 년 동안 나이트는 한 번도 언니에게 말하지 않았다.\n낮은 언니의 것이었으니까. 서로의 시간을 넘보지 않기로 했으니까.'],
        ]);
        await g.fade(true, 1400);
        // 지금
        G.day = G.addAgent({ id: 'day', kind: 'day', layer: 'w_a', x: 3880, dir: 1, lantern: true });
        G.lantern.has = true; G.lantern.on = true;
        if (G.S.hari) G.hari = G.addAgent({ id: 'hari', kind: 'hari', layer: 'w_a', x: 3810, dir: 1, follow: null, pole: true });
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
      g.toast('나이트가 되어, 수천 년의 밤을 걸어가세요.', 7000);
    },
    setup: (g) => { g.G.farLights = 0; },
    update: (g, dt) => {
      const G = g.G, p = G.player;
      if (!p) return;
      const k = U.clamp((p.x - 260) / 3600, 0, 1);
      G.starAmount = Math.min(G.starAmount, Math.max(Math.pow(1 - k, 1.6), 0.004));   // 한 번 꺼진 별은 돌아오지 않는다
      G.farLights = Math.max(G.farLights, k);                                          // 한 번 켜진 불은 꺼지지 않는다
      G.lastStar.a = U.approach(G.lastStar.a, k > 0.86 ? 0.85 : 0, 1, dt);
    },
  };

  /* ═════════ 최종장 — 황혼의 언덕: 새 약속 ═════════ */
  const hillLayers = () => ([
    { id: 'f_far', walk: false, tone: 0.1, pts: [[-200, 470], [300, 452], [800, 474], [1300, 486], [1800, 468], [2300, 450], [2900, 474]] },
    { id: 'f_b', tone: 0.5, pts: [[-200, 500], [300, 492], [700, 486], [1000, 474], [1200, 462], [1300, 458], [1400, 462], [1600, 474], [1900, 488], [2300, 494], [2900, 500]],
      knobs: [{ c: 760, w: 230, lo: 0, hi: 118 }, { c: 1840, w: 230, lo: 0, hi: 118, hint: false }] },
    { id: 'f_a', tone: 0.85, pts: [[-200, 590], [400, 584], [900, 590], [1300, 596], [1700, 590], [2200, 584], [2900, 590]] },
    { id: 'f_f', walk: false, tone: 1, pts: [[-200, 676], [600, 684], [1300, 672], [2000, 686], [2900, 676]] },
  ]);
  const hillBackdrop = () => ([
    { kind: 'mountains', par: 0.1, base: 440, amp: 150, freq: 0.0024, fade: 0.6, seed: 131 },
    { kind: 'lights', par: 0.1, base: 396, amp: 60, n: 110, seed: 14 },
  ]);

  L.finale = {
    id: 'finale', title: '최종장 · 황혼의 언덕', sub: '새 약속',
    width: 2600, theme: 'hill', tod: 1,
    sky: { sun: { x: 1420, y: 372, r: 60, par: 0.1, col: '#ffc98a' }, stars: 0.03 },
    backdrop: hillBackdrop(),
    layers: hillLayers(),
    props: [
      { type: 'chairs', layer: 'f_b', x: 1300, gap: 44, s: 1.3, third: 'third' },
      { type: 'lonetree', layer: 'f_b', x: 1520, s: 1.1 },
      { type: 'tree', layer: 'f_a', x: 300, seed: 4 }, { type: 'fence', layer: 'f_a', x: 480, n: 6 },
    ],
    start: { layer: 'f_a', x: 150 },
    triggers: [
      { x: 1180, layers: ['f_b'], run: async (g) => {
        const G = g.G, ter = G.terrain;
        g.toastOff();
        await g.walk(G.day, 'f_b', 1232);
        g.face(G.day, 1);
        await g.cam(1300, 1.6);
        await g.say('narr', '언덕 꼭대기에는 의자가 세 개. 맞은편 아래에, 나이트가 서 있다.');
        // 나이트 쪽 언덕은 나이트가 끌어내린다
        const k = ter.layer('f_b').knobs[1];
        G.flags.nightDrag = true;
        await g.tween(k, 'v', 118, 2.4, U.easeInOut);
        G.flags.nightDrag = false;
        ter.resample(ter.layer('f_b'));
        await g.say('narr', '나이트가 제 쪽 언덕을 끌어내렸다. 처음으로, 둘이 같은 언덕을 움직였다.');
        await g.walk(G.night, 'f_b', 1368, { speed: 110 });
        g.face(G.night, -1);
        await g.talk([
          ['narr', '쌍둥이가 처음으로, 같은 시간에 마주 섰다.'],
          ['night', '언니.'],
          ['day', '나이트.'],
          ['hari', '…저도 있어요. 인간도 약속에 끼워 주세요. 불을 쓰는 건 우리니까.'],
        ]);
        const em = G.addThing({ id: 'witness', kind: 'spirit', spirit: 'ember', layer: 'f_b', x: 1300, dy: 20, tired: 0.2, alpha: 0, scale: 1.2 });
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
            ['narr', '그때, 가운데 의자가 희미하게 빛났다.'],
            ['day', '…의자가 셋인 까닭을, 이제 알 것 같아.'],
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
      } },
    ],
    setup: (g) => {
      const G = g.G;
      G.night = G.addAgent({ id: 'night', kind: 'night', layer: 'f_a', x: 2180, dir: -1, rides: true });
      G.farLights = 0;
      if (DN.Story.axes(G.S).allClues && G.S.C && (G.S.C.hari || G.S.C.night)) G.flags.thirdHint = true;
    },
    intro: async (g) => {
      await g.wait(2.4);
      await g.talk([
        ['narr', '황혼의 언덕. 낮과 밤이 만나는, 단 하나의 자리.'],
        ['day', '저 위야. 매일 나이트와 손을 맞대던 곳.'],
        ['hari', '언니, 떨려?'],
        ['day', '…응. 수천 년 만에 처음으로.'],
      ]);
      g.toast('언덕을 끌어내려 꼭대기로 오르세요.', 6000);
    },
    update: (g) => {
      const G = g.G;
      if (G.flags.nightDrag) { G.terrain.resample(G.terrain.layer('f_b')); }
    },
  };

  /* ═════════ 결말의 마지막 장면 ═════════ */
  L.ending = {
    id: 'ending', width: 2600, theme: 'hill', tod: 1, camCenter: 1300,
    sky: { stars: 0.03 },
    backdrop: hillBackdrop(),
    layers: hillLayers(),
    props: [
      { type: 'chairs', layer: 'f_b', x: 1300, gap: 44, s: 1.3, third: 'third' },
      { type: 'lonetree', layer: 'f_b', x: 1520, s: 1.1 },
    ],
    setup: (g) => {
      const G = g.G, c = G.endingCfg || {};
      G.todOverride = c.tod === undefined ? 1 : c.tod;
      G.tod = G.todOverride;
      G.starAmount = c.stars || 0;
      G.farLights = c.lights || 0;
      const has = (w) => (c.who || []).includes(w);
      const tod = G.todOverride;
      if (tod < 1.6 || tod > 2.6) G.sun = { x: tod > 2.6 ? 1160 : 1420, y: tod < 0.6 ? 150 : 372, r: 60, par: 1, a: 1, col: tod > 2.6 ? '#ffe2c0' : '#ffc98a' };
      if (c.bright) { G.darkMul = 0.25; }
      if (c.third) G.flags.third = true;
      const put = (who, x, dir, opt) => G.addThing(Object.assign({ id: 'e_' + who, kind: 'girl', who, layer: 'f_b', x, dir }, opt));
      if (has('day')) put('day', c.apart ? 1196 : 1242, 1, c.dayAsNight ? { layer: 'f_far', x: 1640, dir: -1, alpha: 0.9 } : {});
      if (c.dayFar) put('day', 1700, -1, { layer: 'f_far', alpha: 0.5 });
      if (has('night')) put('night', c.apart ? 1410 : 1362, -1, {});
      if (has('dusk')) put('day', 1300, 1, { id: 'e_dusk', variant: 'dusk', h: 108 });
      if (has('hari')) G.addThing({ id: 'e_hari', kind: 'npc', who: 'hari', layer: 'f_b', x: c.hariAlone ? 1290 : c.hariFront ? 1300 : 1150, dir: 1, pole: true });
      if (c.hariFront || c.hariAlone) G.addThing({ id: 'e_lamp', kind: 'lamp', layer: 'f_b', x: 1440, lit: c.hariFront });
    },
    update: (g, dt) => {
      const G = g.G, c = G.endingCfg || {};
      if (c.frozen) G.time -= dt * 0.92;        // 시간이 거의 멈춘다
      if (c.fadeAll) G.todOverride = Math.max(1, G.todOverride - dt * 0.02);
    },
  };
})(typeof globalThis !== 'undefined' ? globalThis : window);
