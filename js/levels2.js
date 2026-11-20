/* 데이 & 나이트 — 장면들 (2/3): 2장 항구, 3장 대도시 */
(function (root) {
  'use strict';
  const DN = (root.DN = root.DN || {});
  const U = DN.U, L = DN.LEVELS, H = DN.LevelHelp;

  /* ═════════ 2장 — 항구: 길 잃은 배들 ═════════ */
  const PIER = 3700, LH_X = 4060;

  L.ch2 = {
    id: 'ch2', title: '2장 · 항구', sub: '길 잃은 배들',
    width: 4700, theme: 'harbor',
    tod: [[0, 0.75], [1300, 1], [2300, 1.7], [3000, 2]],
    sky: { lastStar: { x: PIER, y: 96, par: 1, r: 3.4 } },
    backdrop: [
      { kind: 'mountains', par: 0.1, base: 300, amp: 110, freq: 0.002, fade: 0.75, seed: 61 },
      { kind: 'mountains', par: 0.2, base: 330, amp: 60, freq: 0.0045, fade: 0.5, seed: 67 },
    ],
    layers: [
      { id: 'h_far', walk: false, tone: 0.05, pts: H.band(-200, 5000, 248, 16, 201) },
      { id: 'h_d', tone: 0.26, pts: H.band(-200, 5000, 322, 6, 202),
        knobs: [{ c: 2700, w: 230, lo: 0, hi: 116 }, { c: 3250, w: 230, lo: 0, hi: 116 }] },
      { id: 'h_c', tone: 0.52, pts: H.band(-200, 5000, 408, 6, 203),
        knobs: [{ c: 2150, w: 230, lo: 0, hi: 116 }] },
      // 부두 길: 오른쪽 끝은 안벽
      { id: 'h_b', tone: 0.82, pts: H.band(-200, 2300, 494, 5, 204).concat([[2440, 494], [2500, 497], [2512, 640], [2522, 790]]) },
      // 바다: 배만 다닌다. 별을 본 뒤에야 물결을 움직일 수 있다
      { id: 'w1', style: 'water', water: true, tone: 0.15, lock: 'boatsOn', pts: H.band(-200, 5000, 545, 3, 205, 300) },
      { id: 'w2', style: 'water', water: true, tone: 0.55, lock: 'boatsOn', pts: H.band(-200, 5000, 605, 3, 206, 300),
        knobs: [{ c: 3960, w: 190, lo: -78, hi: 0 }] },
      { id: 'w3', style: 'water', water: true, tone: 0.95, lock: 'boatsOn', pts: H.band(-200, 5000, 662, 3, 207, 300),
        knobs: [{ c: 3620, w: 170, lo: -76, hi: 0 }, { c: 4340, w: 170, lo: -76, hi: 0 }] },
    ],
    blocks: [
      { layer: 'h_c', x0: 2880, x1: 2970, prop: 'rocks' },
    ],
    props: [
      { type: 'pine', layer: 'h_far', x: 500, s: 0.8 }, { type: 'pine', layer: 'h_far', x: 1900, s: 0.9 }, { type: 'pine', layer: 'h_far', x: 3300, s: 0.8 },
      { type: 'tree', layer: 'h_d', x: 400, seed: 2 }, { type: 'pine', layer: 'h_d', x: 1250, s: 1 }, { type: 'tree', layer: 'h_d', x: 2200, seed: 6, autumn: true }, { type: 'pine', layer: 'h_d', x: 3700, s: 1.1 },
      { type: 'house', layer: 'h_c', x: 380, roof: '#5f7f96' }, { type: 'house', layer: 'h_c', x: 520, roof: '#b4664a', w: 40 }, { type: 'tree', layer: 'h_c', x: 1100, seed: 9 },
      { type: 'fence', layer: 'h_c', x: 1700, n: 8 }, { type: 'pine', layer: 'h_c', x: 3460, s: 0.9 },
      { type: 'lighthouse', layer: 'h_c', x: LH_X, lit: 'A_lit_lighthouse' },
      { type: 'house', layer: 'h_c', x: LH_X + 96, w: 40, h: 26, roof: '#b9523f', lit: 'A_lit_lighthouse' },
      { type: 'house', layer: 'h_b', x: 300, roof: '#5f7f96', w: 50 }, { type: 'lamp', layer: 'h_b', x: 420 },
      { type: 'crate', layer: 'h_b', x: 640 }, { type: 'crate', layer: 'h_b', x: 662, s: 0.8 },
      { type: 'house', layer: 'h_b', x: 1000, roof: '#b4664a', w: 56, h: 32 }, { type: 'lamp', layer: 'h_b', x: 1120 },
      { type: 'sundial', layer: 'h_b', x: 1500 }, { type: 'crate', layer: 'h_b', x: 1840 }, { type: 'house', layer: 'h_b', x: 1960, roof: '#8a7a5a' },
      { type: 'lamp', layer: 'h_b', x: 2330 }, { type: 'crate', layer: 'h_b', x: 2410, s: 0.9 },
      { type: 'pier', layer: 'w1', x: 2500, w: 130, dy: -44 },
      { type: 'boat', layer: 'w1', x: 700, s: 0.8, hull: '#6f8296', seed: 1 }, { type: 'boat', layer: 'w1', x: 1640, s: 0.85, dir: -1, seed: 4 },
      { type: 'boat', layer: 'w2', x: 1180, s: 0.9, hull: '#7a6a8a', seed: 2 }, { type: 'boat', layer: 'w2', x: 2260, s: 0.9, seed: 7 },
      { type: 'pier', layer: 'w1', x: PIER - 150, w: 170, dy: -8 },
    ],
    start: { layer: 'h_b', x: 130 },
    things: [
      { id: 'keeper', kind: 'npc', who: 'keeper', layer: 'h_b', x: 900, dir: -1 },
      H.clue({ id: 'hour', layer: 'h_b', x: 1500, dy: 50 }, 'hour', [
        ['narr', '낡은 해시계. 낮의 눈금과 밤의 눈금 사이에, 닳아서 읽을 수 없는 세 번째 눈금이 있다.'],
        ['hari', '여기 뭐라고 새겨져 있었나 봐. …"낮도 밤도 아닌 시간"?'],
        ['day', '낮도 밤도 아닌 시간이라. 교대할 때 말고는 그런 건 없는데.'],
      ]),
      { id: 'lh', kind: 'spot', layer: 'h_c', x: LH_X, standX: LH_X - 70, dy: 150, r: 110, touch: 40, touchY: 200,
        if: (G) => !G.flags.lhTalked,
        tap: async (g) => {
          const G = g.G;
          g.flag('lhTalked');
          const sp = G.addThing({ id: 'lsp', kind: 'spirit', spirit: 'lighthouse', layer: 'h_c', x: LH_X, dy: 162, tired: 0.85, alpha: 0, scale: 0.8 });
          g.sfx('chime');
          await g.tween(sp, 'alpha', 1, 1.4);
          await g.talk([
            ['narr', '등대의 불은 꺼져 있다. 유리방 안쪽에, 희미한 빛 하나가 웅크리고 있다.'],
            ['lighthouse', '…배들이 헤매고 있지. 알아. 여기서는 다 보여.'],
            ['lighthouse', '백 년이야. 백 년 동안 하룻밤도 눈을 감지 못했어.\n내가 한 번 깜빡이면, 누군가 암초에 부딪히니까.'],
            ['day', '그럼 더더욱 나와야지. 지금 저 배들은—'],
            ['lighthouse', '데이. 불을 꺼봐야 보이는 것도 있어.'],
            ['day', '불을… 끄라고? 내가?'],
          ]);
          if (g.run2) await g.say('lighthouse', '전에도 너는 한참 망설였지. 괜찮아. 어둠은 너를 해치지 않아.');
          g.give('off');
          await g.say('narr', '등불을 끌 수 있게 되었다.');
          g.flag('nudgeLantern');
          g.toast('오른쪽 아래의 등불 단추를 눌러 불을 꺼 보세요.', 20000);
          await g.until(() => !G.lantern.on);
          g.flag('nudgeLantern', false);
          g.toastOff();
          await g.wait(0.8);
          await g.say('hari', '어, 어두워…! 데이 언니, 어디 있어?');
          const v = await g.choose([
            { t: '여기 있어. 손 잡아. 불이 없어도 나는 옆에 있어.', v: 1 },
            { t: '잠깐만 참아. 금방 눈이 익을 거야.', v: 0 },
          ]);
          if (v) { g.S.bond++; await g.say('hari', '…응. 손이 따뜻하네. 불 같아.'); }
          else await g.say('hari', '으응… 알았어.');
          g.flag('starSeen');
          g.sfx('star');
          await g.wait(2.2);
          await g.talk([
            ['narr', '눈이 어둠에 익자, 하늘 한구석에 희미한 점 하나가 떠올랐다.'],
            ['hari', '어…? 별이다. 진짜 별이야!\n할아버지 이야기에만 나오는 건 줄 알았는데.'],
            ['day', '등불을 켜고 있을 때는 보이지 않았어. …저 별빛이 물 위에 길을 내고 있네.'],
            ['lighthouse', '옛 뱃사람들은 저걸 보고 돌아왔지. 물결만 잔잔히 이어 주면, 배들은 알아서 찾아올 거야.'],
          ]);
          g.flag('boatsOn');
          g.toast('등불을 끈 채로, 물결을 위로 끌어 배들이 별빛 아래 선창까지 올 물길을 이어 주세요.', 14000);
        } },
    ],
    triggers: [
      { x: 800, layers: ['h_b'], run: async (g) => {
        await g.walk(g.day, 'h_b', 836);
        await g.talk([
          ['keeper', '등불을 든 아가씨라니. 이 밤에 불이 붙는 등은 처음 보는구먼.'],
          ['keeper', '나는 저 곶의 등대지기요. 해가 지니 등대가 꺼졌어. 사십 년 만에 처음 있는 일이야.'],
          ['keeper', '배 세 척이 아직 바다에 있소. 등대 없이는 암초를 못 피해.'],
          ['hari', '어떡해요…!'],
          ['keeper', '옛날 뱃사람들은 별을 보고 길을 찾았다지. 허나 요즘 하늘엔 별이 없으니.'],
          ['day', '등대의 빛을 찾아올게요.'],
          ['keeper', '곶으로 가려면 뒤쪽 벼랑길을 타시오. 부디 조심하고.'],
        ]);
      } },
      { x: 2400, layers: ['h_b'], run: async (g) => {
        await g.say('day', '부두는 여기서 끝이야. 등대는 저 벼랑길 너머에 있어.');
        g.toast('뒤쪽 벼랑길을 끌어내려 건너가세요.', 6000);
      } },
      { x: 2790, layers: ['h_c'], run: async (g) => {
        await g.say('hari', '길이 무너졌어. 더 위쪽 길로 돌아가야겠다.');
      } },
    ],
    setup: (g) => {
      const G = g.G;
      G.boats = [
        G.addAgent({ id: 'b1', kind: 'boat', layer: 'w2', x: 4210, dir: -1, speed: 66, seed: 3, slot: 0 }),
        G.addAgent({ id: 'b2', kind: 'boat', layer: 'w3', x: 3440, dir: 1, speed: 66, seed: 5, hull: '#6f8296', slot: 1 }),
        G.addAgent({ id: 'b3', kind: 'boat', layer: 'w3', x: 4560, dir: -1, speed: 66, seed: 8, hull: '#7a6a8a', slot: 2 }),
      ];
    },
    intro: async (g) => {
      await g.wait(2.4);
      await g.talk([
        ['narr', '사흘을 걸어 닿은 바닷가. 해가 기울고 있다.'],
        ['hari', '바다다! 나 바다 처음 봐. …근데 배들이 다 묶여 있네.'],
        ['day', '밤에 나갔다가 돌아오지 못할까 봐서겠지. 빛이 없으니까.'],
      ]);
    },
    update: (g, dt) => {
      const G = g.G, ter = G.terrain, dark = !G.lantern.on;
      if (!G.lastStar) return;
      G.lastStar.a = U.approach(G.lastStar.a, G.flags.starSeen ? (dark ? 1 : 0.1) : 0, 1.4, dt);
      if (!G.flags.boatsOn || G.flags.boatsDone) return;
      let home = 0;
      for (const b of G.boats) {
        if (b.home) { home++; continue; }
        if (!dark) { b.path = []; b.plan = -1; continue; }   // 등불이 밝으면 별이 보이지 않는다
        if (b.plan === ter.version) continue;
        b.plan = ter.version;
        const r = ter.reach(b.layer, b.x, { water: true });
        const gx = PIER - b.slot * 50, goal = ter.node('w1', gx);
        if (r.prev[goal] !== -2) {
          b.path = ter.path(r, goal);
          b.done = () => { b.home = true; b.dir = -1; g.sfx('join'); G.sparkle(b.x, b.y - 30, [210, 225, 255], 18, 60); };
        } else {
          b.path = ter.path(r, ter.nearest(r, gx, ter.yAt('w1', gx)).node);
          b.done = null;
        }
      }
      if (home === G.boats.length && !G.busy) {
        G.flags.boatsDone = true;
        G.run(L.ch2.afterBoats);
      }
    },
    afterBoats: async (g) => {
      const G = g.G, sp = G.thing('lsp');
      g.toastOff();
      await g.wait(1.2);
      await g.talk([
        ['narr', '세 척의 배가 별빛 아래로 돌아왔다.'],
        ['hari', '다 왔어! 전부 무사해!'],
        ['lighthouse', '봤지? 사람들은 원래 별을 보고 길을 찾았어. 내가 생기기 전에는.'],
        ['lighthouse', '내가 너무 밝아서, 다들 잊어버린 거야. 하늘을 보는 법을.'],
      ]);
      const r = await H.spiritChoice(g, 'lighthouse', {
        human: '그래도 돌아와 줘. 안개 낀 밤에는 네가 필요해.',
        night: '이제 쉬어. 별이 대신 길을 알려 줄 거야.',
      });
      if (r.v === 'self') await g.say('lighthouse', '나더러 고르라고… 그렇다면, 눈을 좀 감고 싶어. 백 년 치만큼.');
      if (r.where === 'human') {
        if (r.v !== 'self') await g.say('lighthouse', '…그래. 안개 낀 밤에만 켤게. 맑은 밤에는, 별에게 맡기고.');
        g.flag('A_lit_lighthouse');
        g.sfx('on');
        sp.tired = 0.3;
      } else {
        if (r.v !== 'self') await g.say('lighthouse', '고마워. 처음으로, 눈을 감아 볼게.');
        g.sfx('star');
        await Promise.all([g.tween(sp, 'dy', 620, 3.4), g.tween(sp, 'alpha', 0, 3.4)]);
        sp.visible = false;
      }
      // 황혼 타임 #2
      await g.tod(2.7, 3);
      await g.cam(4250, 2);
      await H.summonNight(g, 'h_d', 4420, -1);
      await g.talk([
        ['narr', '새벽이 가까워 온다. 벼랑 위에서, 나이트가 별을 올려다보고 있다.'],
        ['night', '그건 건드리지 마.'],
        ['day', '나이트! 저 별은—'],
        ['night', '하나 남았어. 수천 개 가운데, 저거 하나.'],
      ]);
      if (g.run2) await g.say('night', '…언니는 매번 여기서 저 별을 올려다보더라. 처음 보는 것처럼.');
      const v = await H.duskChoice(g, {
        hostile: '별 하나 때문에 인간 세상을 전부 어둡게 만든 거야?',
        understand: '…왜 하나밖에 안 남은 거야?',
        trust: '건드리지 않을게. 약속해.',
      });
      await g.say('night', {
        hostile: '…"하나 때문에"라고. 그래.',
        understand: '밤이 밝아졌으니까. 별은 어둠 속에서만 빛나.',
        trust: '…언니의 약속은, 글쎄. 그래도 고마워.',
      }[v]);
      await g.talk([
        ['night', '저게 꺼지면, 나는—'],
        ['narr', '나이트는 말을 맺지 않았다.'],
      ]);
      await g.tween(G.night, 'alpha', 0, 2);
      await g.say('hari', '별이 하나뿐이라니. …원래는 얼마나 많았을까?');
      await g.fade(true, 1200);
      g.next();
    },
    drawOver: (ctx, G, env, camX) => {
      // 별빛이 물 위에 내리는 길
      const a = G.lastStar ? G.lastStar.a : 0;
      if (a < 0.05 || !G.flags.starSeen) return;
      const x = PIER - camX, y1 = G.terrain.yAt('w1', PIER);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const gr = ctx.createLinearGradient(0, 96, 0, y1 + 40);
      gr.addColorStop(0, `rgba(200,215,255,${0.16 * a})`); gr.addColorStop(1, `rgba(200,215,255,${0.03 * a})`);
      ctx.fillStyle = gr;
      ctx.beginPath(); ctx.moveTo(x - 3, 96); ctx.lineTo(x + 3, 96); ctx.lineTo(x + 70, y1 + 40); ctx.lineTo(x - 120, y1 + 40); ctx.closePath(); ctx.fill();
      for (let i = 0; i < 14; i++) {
        const tw = 0.5 + 0.5 * Math.sin(G.time * 2.4 + i * 1.7);
        ctx.fillStyle = `rgba(225,235,255,${0.75 * a * tw})`;
        ctx.beginPath(); ctx.ellipse(x - 110 + ((i * 53) % 170), y1 + 4 + ((i * 29) % 30), 5, 1.2, 0, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    },
  };

  /* ═════════ 3장 — 대도시: 별 없는 하늘 ═════════ */
  L.ch3 = {
    id: 'ch3', title: '3장 · 대도시', sub: '별 없는 하늘',
    width: 4300, theme: 'city',
    tod: [[0, 1], [900, 1.25], [1250, 2]],
    sky: { cloudAlpha: 0.35 },
    backdrop: [
      { kind: 'skyline', par: 0.12, base: 430, amp: 300, fade: 0.62, seed: 5 },
      { kind: 'skyline', par: 0.26, base: 470, amp: 210, fade: 0.34, seed: 9 },
    ],
    layers: [
      { id: 'r_c', kind: 'poly', style: 'roof', tone: 0.18,
        pts: [[-200, 790], [596, 790], [600, 360], [840, 360], [844, 790], [1896, 790], [1900, 330], [2140, 330], [2144, 790],
              [2596, 790], [2600, 390], [2860, 390], [2864, 790], [3796, 790], [3800, 330], [4060, 330], [4064, 790], [4600, 790]] },
      { id: 'r_b', kind: 'poly', style: 'roof', tone: 0.48,
        pts: [[-200, 790], [196, 790], [200, 440], [520, 440], [524, 790], [896, 790], [900, 470], [1300, 470], [1304, 790],
              [1496, 790], [1500, 430], [1760, 430], [1764, 790], [2196, 790], [2200, 450], [2500, 450], [2504, 790],
              [3376, 790], [3380, 420], [3700, 420], [3704, 790], [4600, 790]],
        knobs: [{ c: 1100, w: 202, lo: 0, hi: 100 }, { c: 3540, w: 162, lo: 0, hi: 96 }] },
      { id: 'r_a', kind: 'poly', style: 'roof', tone: 0.76,
        pts: [[-200, 790], [376, 790], [380, 648], [560, 560], [800, 560], [804, 500], [1040, 500], [1044, 790],
              [1180, 790], [1184, 540], [1420, 540], [1424, 790], [1796, 790], [1800, 560], [2100, 560], [2290, 648], [2294, 790],
              [2596, 790], [2600, 648], [2800, 560], [3000, 560], [3120, 500], [3124, 470], [3460, 470], [3464, 790], [4600, 790]],
        knobs: [{ c: 922, w: 120, lo: 0, hi: 70 }, { c: 1302, w: 120, lo: -50, hi: 40 }, { c: 3292, w: 170, lo: 0, hi: 42 }] },
      // 건물 사이에 드리운 그림자: 등불을 꺼야 밟을 수 있다
      { id: 'sh1', shadow: true, pts: [[1392, 560], [1610, 586], [1828, 560]] },
      { id: 'st', kind: 'poly', style: 'street', tone: 1, pts: [[-200, 648], [4600, 648]] },
    ],
    blocks: [
      { layer: 'st', x0: 760, x1: 900, prop: 'cars' },
      { layer: 'st', x0: 2010, x1: 2150, prop: 'cars' },
      { layer: 'st', x0: 3560, x1: 3700, prop: 'cars' },
    ],
    props: [
      { type: 'tank', layer: 'r_c', x: 700 }, { type: 'antenna', layer: 'r_c', x: 2000 }, { type: 'antenna', layer: 'r_c', x: 2780, s: 0.8 }, { type: 'tank', layer: 'r_c', x: 3990, s: 0.9 },
      { type: 'tank', layer: 'r_b', x: 300 }, { type: 'neon', layer: 'r_b', x: 420, w: 70, col: '#5ad2ff', lit: 'cityLit' }, { type: 'antenna', layer: 'r_b', x: 1240 },
      { type: 'tank', layer: 'r_b', x: 1640, s: 0.9 }, { type: 'neon', layer: 'r_b', x: 2330, w: 80, col: '#ffd45a', lit: 'cityLit' }, { type: 'antenna', layer: 'r_b', x: 3420, s: 0.9 },
      { type: 'antenna', layer: 'r_a', x: 600, s: 0.8 }, { type: 'tank', layer: 'r_a', x: 990, s: 0.9 },
      { type: 'neon', layer: 'r_a', x: 1330, w: 84, col: '#ff5ac8', lit: 'A_lit_neon' },
      { type: 'antenna', layer: 'r_a', x: 2060 }, { type: 'tank', layer: 'r_a', x: 2890, s: 0.85 },
      { type: 'cross', layer: 'r_a', x: 3190, lit: 'A_lit_hospital' }, { type: 'antenna', layer: 'r_a', x: 3430, s: 0.8 },
      { type: 'streetlight', layer: 'st', x: 250, lit: 'A_lit_street' }, { type: 'streetlight', layer: 'st', x: 1130, lit: 'A_lit_street' },
      { type: 'streetlight', layer: 'st', x: 1650, lit: 'A_lit_street' }, { type: 'subway', layer: 'st', x: 2460 },
      { type: 'clock', layer: 'st', x: 2370 }, { type: 'streetlight', layer: 'st', x: 2560, lit: 'A_lit_street' },
      { type: 'streetlight', layer: 'st', x: 3880, lit: 'A_lit_street' },
    ],
    start: { layer: 'st', x: 120 },
    things: [
      { id: 'neon', kind: 'spirit', spirit: 'neon', layer: 'r_a', x: 1352, dy: 30, tired: 0.2 },
      { id: 'street', kind: 'spirit', spirit: 'street', layer: 'st', x: 2460, dy: 12, tired: 0.7, scale: 0.85 },
      { id: 'hosp', kind: 'spirit', spirit: 'hospital', layer: 'r_a', x: 3330, dy: 30, tired: 0.6 },
      { id: 'hungry', kind: 'soot', type: 'hungry', layer: 'r_a', x: 1960, rad: 40, awake: 0.12 },
      H.clue({ id: 'clock', run2: true, layer: 'st', x: 2370, dy: 70 }, 'clock', [
        ['narr', '멈춘 시계. 바늘은 해 질 녘을 가리킨 채 서 있다.'],
        ['narr', '열두 숫자 사이에, 지워진 눈금이 하나 더 있다. 낮의 끝과 밤의 처음 사이.'],
        ['day', '여기에도… 세 번째 자리.'],
      ]),
    ],
    triggers: [
      { x: 640, layers: ['st'], run: async (g) => {
        await g.say('day', '길이 막혔어. 지붕 위로 건너가자.');
        g.toast('건물을 위아래로 끌어 옥상 높이를 맞추면 건너갈 수 있어요.', 9000);
      } },
      // 네온
      { x: 1250, run: async (g) => {
        const G = g.G, sp = G.thing('neon');
        g.toastOff();
        await g.tod(2, 2.5);
        g.todFree();
        await g.talk([
          ['narr', '마지막 햇빛이 지자, 수백만 개의 창문이 한꺼번에 눈을 감았다.\n한 번도 어두워진 적 없던 도시가, 처음으로 밤을 만났다.'],
          ['narr', '꺼진 간판 뒤에서, 분홍빛 하나가 까칠하게 깜빡인다.'],
          ['neon', '뭐야, 날 찾으러 왔어? 안 가. 절대 안 가.'],
          ['neon', '밤새도록 깜빡였어. 그런데 아무도 날 "보지" 않아.\n지나가면서 눈이 부시다고만 하지.'],
          ['neon', '나이트 옆은 조용해. 거기서 처음으로 알았어. 내가 무슨 색인지.'],
        ]);
        if (g.run2) await g.say('neon', '…잠깐. 너 저번에도 왔었지? 아닌가. 낯이 익은데.');
        const r = await H.spiritChoice(g, 'neon', {
          human: '그래도 돌아가야 해. 이 도시는 네 빛에 익숙해.',
          night: '알겠어. 네 색으로 있어.',
        });
        if (r.v === 'self') await g.say('neon', '내 맘대로? 하, 그럼 당연히 안 가지. …고마워. 물어봐 줘서.');
        else if (r.where === 'human') { await g.say('neon', '…쳇. 알았어. 대신 좀 덜 깜빡일 거야.'); g.flag('A_lit_neon'); }
        else await g.say('neon', '…진짜? 의외네, 낮의 언니.');
        await g.talk([
          ['neon', '아, 가는 길은 알려 줄게. 불을 끄고 그림자를 밟아 봐.'],
          ['neon', '밤은 생각보다 단단하거든.'],
        ]);
        g.give('shadow');
        if (r.where === 'night') { await Promise.all([g.tween(sp, 'dy', 560, 3), g.tween(sp, 'alpha', 0, 3)]); sp.visible = false; }
        await g.say('narr', '그림자 걸음을 배웠다. 등불을 끄면, 그림자 위를 걸을 수 있다.');
        g.toast('등불을 끄고, 옥상 끝에서 이어지는 그림자를 밟아 건너세요.', 9000);
      } },
      { x: 1440, layers: ['sh1'], run: async (g) => {
        g.toastOff();
        await g.say('hari', '그, 그림자 위를 걷는 거야? 떨어지면 어떡해…');
        const v = await g.choose([
          { t: '내 손 잡아. 내가 먼저 밟을게.', v: 1 },
          { t: '눈 감고 따라와.', v: 0 },
        ]);
        if (v) { g.S.bond++; await g.say('hari', '…어, 진짜 단단하네! 물 위를 걷는 것 같아.'); }
        else await g.say('hari', '으으… 알았어. 꼭 잡고 갈게.');
      } },
      { x: 1830, layers: ['r_a'], run: async (g) => {
        await g.talk([
          ['day', '저 그을음은 다른 것들과 달라. 빛을 먹고 커지는 놈이야.'],
          ['day', '등불을 켜면 깨어나서 길을 막을 거야. 끈 채로, 조용히 지나가자.'],
        ]);
      } },
      // 가로등
      { x: 2390, layers: ['st'], run: async (g) => {
        const G = g.G, sp = G.thing('street');
        await g.talk([
          ['narr', '지하철 입구 계단 밑에, 주황빛 하나가 쪼그려 앉아 있다.'],
          ['street', '…나는 길을 밝히려던 게 아니었어.'],
          ['street', '사람들이 밤을 무서워하지 않게 해 주고 싶었지.\n그런데 그러다 보니, 아무도 밤을 모르게 됐어.'],
          ['street', '모르는 건, 더 무서운 법인데.'],
        ]);
        if (g.run2) await g.say('street', '이상하네. 네 발소리를 아는 것 같아. 여러 번 들은 것처럼.');
        const r = await H.spiritChoice(g, 'street', {
          human: '그래도 어두운 골목은 위험해. 돌아와 줘.',
          night: '그럼 쉬어. 사람들도 밤을 다시 배워야겠지.',
        });
        if (r.v === 'self') await g.say('street', '…그럼 여기 조금 더 앉아 있을게. 밤이 어떻게 생겼는지, 나도 본 적이 없거든.');
        else if (r.where === 'human') { await g.say('street', '…알았어. 대신 조금 낮게 켤게. 발밑만 보이게.'); g.flag('A_lit_street'); }
        else await g.say('street', '응. …고마워. 나도 한번, 밤을 보고 싶었어.');
        if (r.where === 'night') { await Promise.all([g.tween(sp, 'dy', 640, 3), g.tween(sp, 'alpha', 0, 3)]); sp.visible = false; }
      } },
      // 병원 야간등
      { x: 3250, layers: ['r_a'], run: async (g) => {
        const G = g.G, sp = G.thing('hosp');
        await g.talk([
          ['narr', '병원 옥상. 초록빛 작은 불이 창문 쪽으로 자꾸만 몸을 기울인다.'],
          ['hospital', '저, 저기요. 혹시… 저 좀 데려다주실 수 있나요?'],
          ['hospital', '저도 지쳤어요. 정말로요.\n하지만 삼 층 끝 방에, 밤마다 무서워하는 아이가 있어요.'],
          ['hospital', '제가 없으면 그 애는 잠들지 못해요. 저는 돌아가고 싶어요.'],
          ['day', '…돌아가고 싶어 하는 빛도 있구나.'],
          ['hari', '모든 빛이 똑같은 건 아닌가 봐.'],
        ]);
        if (g.run2) await g.say('hospital', '어… 전에도 뵌 적 있지 않나요? 그때도 제 얘길 끝까지 들어 주셨던 것 같은데.');
        const r = await H.spiritChoice(g, 'hospital', {
          human: '가. 그 아이 곁으로.',
          night: '너도 쉬어야 해. 아이는… 어둠에 익숙해질 거야.',
        });
        if (r.where === 'human') {
          await g.say('hospital', '고맙습니다! 작게, 아주 작게만 켜 있을게요. 별님들께 방해되지 않게.');
          g.flag('A_lit_hospital'); g.sfx('on');
          await Promise.all([g.tween(sp, 'dy', -20, 1.6), g.tween(sp, 'alpha', 0, 1.6)]);
        } else {
          await g.say('hospital', '…네. 그렇군요. …그 애한테, 미안하다고 전해 주세요.');
          await Promise.all([g.tween(sp, 'dy', 520, 3), g.tween(sp, 'alpha', 0, 3)]);
        }
        sp.visible = false;
        g.flag('spiritsDone');
        g.toast('옆 건물의 옥상으로 건너가세요. 날이 밝아 오고 있어요.', 7000);
      } },
      // 황혼 타임 #3
      { x: 3560, layers: ['r_b'], if: (G) => G.flags.spiritsDone, run: async (g) => {
        const G = g.G;
        g.toastOff();
        await g.walk(G.day, 'r_b', 3610);
        g.face(G.day, 1);
        await g.tod(2.75, 3);
        await g.cam(3800, 2);
        await H.summonNight(g, 'r_c', 3890, -1);
        await g.talk([
          ['narr', '새벽이 오기 직전. 맞은편 옥상에 나이트가 서 있다.\n이번에는, 이쪽을 보고.'],
          ['day', '나이트. 저 사람들을 봐. 다치고, 길을 잃고, 무서워하고 있어. 인간을 구해야 해.'],
          ['night', '구해? 누가, 누구를.'],
          ['night', '약속은 언니가 먼저 깼잖아.'],
          ['day', '…뭐? 무슨 소리야. 나는 약속을 깬 적 없어.'],
        ]);
        if (g.run2) await g.say('night', '…또 그 얼굴이네. 정말로 모르는 얼굴.');
        const v = await H.duskChoice(g, {
          hostile: '말 돌리지 마. 빛을 훔친 건 너야.',
          understand: '내가… 뭘 했는데? 기억이 나지 않아.',
          trust: '네가 그렇게 말한다면 까닭이 있겠지. 찾아볼게.',
        });
        await g.say('night', {
          hostile: '…훔쳤다고. 그래, 언니한테는 그렇게 보이겠지.',
          understand: '기억이 안 나는 게 제일 나빠, 언니.',
          trust: '…정말로 찾아볼 거야? 이번에는?',
        }[v]);
        await g.say('night', '첫 불이 켜진 곳을 찾아. 인간 아이가 길을 알 거야.');
        await g.tween(G.night, 'alpha', 0, 2);
        await g.talk([
          ['hari', '첫 불…? 할아버지 노래에 나와!'],
          ['hari', '♪ 첫 불은 산 아래 굴에서, 빛나는 손이 건넸지…'],
          ['day', '…빛나는 손.'],
        ]);
        await g.fade(true, 1200);
        g.next();
      } },
    ],
    intro: async (g) => {
      await g.wait(2.4);
      await g.talk([
        ['narr', '대도시. 해가 건물들 사이로 가라앉고 있다.'],
        ['hari', '여긴 밤이 없던 곳이래. 한 번도 어두워진 적이 없대.'],
        ['day', '그래서 더 무서울 거야. 처음 보는 어둠이니까.'],
      ]);
    },
  };
})(typeof globalThis !== 'undefined' ? globalThis : window);
