/* 데이 & 나이트 — 장면들 (2/3): 2장 항구, 3장 대도시 */
(function (root) {
  'use strict';
  const DN = (root.DN = root.DN || {});
  const U = DN.U, L = DN.LEVELS, H = DN.LevelHelp;

  /* ═════════ 2장 — 항구: 길 잃은 배들 ═════════
   * 등불을 끄는 법을 배운다. 불을 꺼야 별이 보이고, 배들은 그 별을 보고 돌아온다.
   * 하지만 밧줄을 받아 줄 사람에게는 빛이 있어야 한다 — 필요한 만큼만 켠다. */
  const QY = 500, CY = 404;                 // 부두 길 높이, 곶 위의 높이
  const MAST_X = 2700, FOG_X = 3010, LH_X = 3900, PIER_X = 3470;
  const W1 = 566, W2 = 618, W3 = 668;
  const BERTH = [3330, 3290, 3250];

  L.ch2 = {
    id: 'ch2', title: '2장 · 항구', sub: '길 잃은 배들',
    width: 4600, theme: 'harbor',
    tod: [[0, 0.75], [1000, 0.9], [1700, 1]],
    sky: { lastStar: { x: 3330, y: 96, par: 1, r: 3.4 } },
    backdrop: [
      { kind: 'mountains', par: 0.1, base: 300, amp: 110, freq: 0.002, fade: 0.75, seed: 61 },
      { kind: 'mountains', par: 0.2, base: 330, amp: 60, freq: 0.0045, fade: 0.5, seed: 67 },
    ],
    layers: [
      { id: 'h_far', walk: false, tone: 0.05, pts: H.band(-200, 5000, 250, 16, 201) },
      { id: 'h_mid', walk: false, tone: 0.3, pts: H.band(-200, 5000, 330, 10, 202) },
      // 부두 길 → 곶으로 오르는 벼랑길
      { id: 'road', tone: 0.72, pts: H.band(-200, 2200, QY, 4, 204).concat([[2330, QY], [2600, 468], [2900, 428], [3200, 410], [3500, CY], [3900, CY], [4300, CY], [4900, CY]]) },
      { id: 'w1', style: 'water', water: true, tone: 0.15, pts: H.band(-200, 5000, W1, 2, 205, 300) },
      { id: 'w2', style: 'water', water: true, tone: 0.55, pts: H.band(-200, 5000, W2, 2, 206, 300) },
      { id: 'w3', style: 'water', water: true, tone: 0.95, pts: H.band(-200, 5000, W3, 2, 207, 300) },
    ],
    props: [
      { type: 'pine', layer: 'h_far', x: 500, s: 0.8 }, { type: 'pine', layer: 'h_far', x: 1900, s: 0.9 }, { type: 'pine', layer: 'h_far', x: 3300, s: 0.8 },
      { type: 'tree', layer: 'h_mid', x: 400, seed: 2 }, { type: 'house', layer: 'h_mid', x: 760, roof: '#5f7f96' }, { type: 'pine', layer: 'h_mid', x: 1250, s: 1 },
      { type: 'tree', layer: 'h_mid', x: 2200, seed: 6, autumn: true }, { type: 'pine', layer: 'h_mid', x: 3000, s: 1.1 },
      { type: 'house', layer: 'road', x: 300, roof: '#5f7f96', w: 50 }, { type: 'lamp', layer: 'road', x: 420 },
      { type: 'crate', layer: 'road', x: 640 }, { type: 'crate', layer: 'road', x: 662, s: 0.8 },
      { type: 'house', layer: 'road', x: 1000, roof: '#b4664a', w: 56, h: 32 }, { type: 'lamp', layer: 'road', x: 1120 },
      { type: 'sundial', layer: 'road', x: 1300 }, { type: 'crate', layer: 'road', x: 1560 }, { type: 'house', layer: 'road', x: 2080, roof: '#8a7a5a' },
      { type: 'lamp', layer: 'road', x: 2250 },
      { type: 'mast', layer: 'road', x: MAST_X, h: 262 },
      { type: 'pine', layer: 'road', x: 3560, s: 0.9 },
      { type: 'lighthouse', layer: 'road', x: LH_X, lit: 'A_lit_lighthouse' },
      { type: 'house', layer: 'road', x: LH_X + 110, w: 40, h: 26, roof: '#b9523f', lit: 'A_lit_lighthouse' },
      { type: 'boat', layer: 'w1', x: 700, s: 0.8, hull: '#6f8296', seed: 1 }, { type: 'boat', layer: 'w1', x: 1640, s: 0.85, dir: -1, seed: 4 },
      { type: 'boat', layer: 'w2', x: 1180, s: 0.9, hull: '#7a6a8a', seed: 2 }, { type: 'boat', layer: 'w2', x: 2260, s: 0.9, seed: 7 },
      { type: 'pier', layer: 'w1', x: PIER_X - 70, w: 150, dy: -8 },
      { type: 'post', layer: 'w1', x: PIER_X + 40, h: 52, dy: -8, arm: 0 },
    ],
    start: { layer: 'road', x: 130 },
    things: [
      { id: 'keeper', kind: 'npc', who: 'keeper', layer: 'road', x: 900, dir: -1 },
      H.clue({ id: 'hour', layer: 'road', x: 1300, dy: 50 }, 'hour', [
        ['narr', '낡은 해시계. 낮의 눈금과 밤의 눈금 사이에, 닳아서 읽을 수 없는 세 번째 눈금이 있다.'],
        ['hari', '여기 뭐라고 새겨져 있었나 봐. …"낮도 밤도 아닌 시간"?'],
        ['day', '낮도 밤도 아닌 시간이라. 교대할 때 말고는 그런 건 없는데.'],
      ]),
      H.soot('s1', 'road', 1960, 36), H.soot('s2', 'road', 2360, 34), H.soot('s3', 'road', 3330, 32),
      H.soot('fog', 'road', FOG_X, 54, 'dense'),
      H.hook('hk_mast', 'road', MAST_X - 34, 222),
      { id: 'refl', kind: 'mirror', look: 'reflector', layer: 'road', x: MAST_X, up: 244, fx: FOG_X, fy: 421 - 44, fr: 122 },
      // 선창: 밧줄을 받아 줄 사람은 빛이 있어야 나온다
      H.hook('hk_pier', 'w1', PIER_X + 40, 72),
      { id: 'docker', kind: 'npc', who: 'keeper', layer: 'w1', x: PIER_X, dy: 0, dir: -1, alpha: 0.25 },
      { id: 'lhLight', kind: 'none', layer: 'road', x: LH_X, up: 160, light: { r: 330, flag: 'A_lit_lighthouse' }, visible: false },
      { id: 'lh', kind: 'spot', layer: 'road', x: LH_X, standX: LH_X - 70, dy: 150, r: 110, touch: 40, touchY: 200,
        if: (G) => G.isNight && !G.flags.lhTalked,
        tap: async (g) => {
          const G = g.G;
          g.flag('lhTalked');
          const sp = G.addThing({ id: 'lsp', kind: 'spirit', spirit: 'lighthouse', layer: 'road', x: LH_X, dy: 162, tired: 0.85, alpha: 0, scale: 0.8 });
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
          g.learn('shutter');
          await g.say('narr', '등불의 빛을 줄이거나 끌 수 있게 되었다.');
          g.flag('nudgeLantern');
          g.toast('빛의 가장자리를 안쪽으로 끌거나, 오른쪽 아래의 등불 단추를 눌러 불을 꺼 보세요.', 20000);
          await g.until(() => G.lan.r < 8);
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
            ['day', '내 빛이 가리고 있었구나. …저 별빛이 물 위에 길을 내고 있어.'],
            ['lighthouse', '옛 뱃사람들은 저걸 보고 돌아왔지. 어둡게만 두면, 배들은 알아서 찾아올 거야.'],
          ]);
          g.flag('boatsOn');
          g.toast('배들은 어둠 속에서 별을 보고 돌아옵니다. 빛이 크면 별이 가려져요.', 9000);
        } },
    ],
    triggers: [
      { x: 800, run: async (g) => {
        await g.walk(g.day, 'road', 836);
        await g.talk([
          ['keeper', '등불을 든 아가씨라니. 불이 붙는 등은 오랜만에 보는구먼.'],
          ['keeper', '나는 저 곶의 등대지기요. 어젯밤 해가 지자 등대가 꺼졌어. 사십 년 만에 처음 있는 일이야.'],
          ['keeper', '배 세 척이 아직 바다에 있소. 등대 없이는 암초를 못 피해.'],
          ['hari', '어떡해요…!'],
          ['keeper', '옛날 뱃사람들은 별을 보고 길을 찾았다지. 허나 요즘 하늘엔 별이 없으니.'],
          ['day', '등대의 빛을 찾아올게요.'],
          ['keeper', '곶으로 가려면 벼랑길을 타시오. 곧 해가 지니, 부디 조심하고.'],
        ]);
      } },
      { x: 1760, run: async (g) => {
        await g.nightfall(3.4);
        await g.talk([
          ['narr', '해가 바다 너머로 잠기자, 낮은 등불 속으로 오므라들었다.'],
          ['hari', '부두에도 그을음이 끼기 시작했어. 다들 문을 걸어 잠갔나 봐.'],
        ]);
      } },
      { x: 2560, if: (G) => G.isNight, run: async (g) => {
        await g.talk([
          ['hari', '벼랑길에 바다 안개 같은 그을음이 꽉 찼어. 종 앞에 있던 것처럼 짙어.'],
          ['day', '저 돛대 위에 놋쇠 반사등이 있네. 저기에 빛을 주면 될 거야.'],
        ]);
        g.toast('돛대의 고리에 등불을 걸어 보세요.', 8000);
      } },
    ],
    setup: (g) => {
      const G = g.G;
      G.boats = [
        G.addAgent({ id: 'b1', kind: 'boat', layer: 'w1', x: 4380, dir: -1, speed: 70, seed: 3, slot: 0 }),
        G.addAgent({ id: 'b2', kind: 'boat', layer: 'w2', x: 4270, dir: -1, speed: 70, seed: 5, hull: '#6f8296', slot: 1 }),
        G.addAgent({ id: 'b3', kind: 'boat', layer: 'w3', x: 4470, dir: -1, speed: 70, seed: 8, hull: '#7a6a8a', slot: 2 }),
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
      const G = g.G, ter = G.terrain, lan = G.lan;
      if (!G.lastStar) return;
      // 별은 빛이 작을수록 또렷하다
      const seeing = G.flags.starSeen ? U.clamp(1.25 - lan.r / 160, 0.1, 1) : 0;
      G.lastStar.a = U.approach(G.lastStar.a, seeing, 1.6, dt);
      if (!G.flags.boatsOn || G.flags.boatsDone) return;
      const docker = G.thing('docker');
      const lit = ter.zoneAt(PIER_X, W1 - 40) === 'day';
      docker.alpha = U.approach(docker.alpha, lit ? 1 : 0.25, 4, dt);
      let home = 0, waiting = 0, dazzled = 0;
      for (const b of G.boats) {
        if (b.home) { home++; continue; }
        const gx = BERTH[b.slot];
        const dark = ter.zoneAt(b.x, b.y - 8) === 'night';
        if (Math.abs(b.x - gx) < 6) {
          // 선창 앞까지 왔다. 밧줄을 받아 줄 사람이 빛 속에 나와 있어야 하고, 배는 눈이 부시지 않아야 한다
          if (lit && dark) { b.home = true; g.sfx('join'); G.sparkle(b.x, b.y - 30, [210, 225, 255], 18, 60); }
          else if (!lit) waiting++; else dazzled++;
          continue;
        }
        if (seeing < 0.4 || !dark) { b.path = []; continue; }     // 별을 놓쳤다
        b.x = Math.max(gx, b.x - b.speed * dt);                    // 별빛을 따라 온다
        b.y = ter.yAt(b.layer, b.x);
      }
      if (!G.busy) {
        if (waiting && !G.flags.toldDocker) {
          G.flags.toldDocker = true;
          G.run(async (g2) => {
            await g2.talk([
              ['hari', '배가 왔는데… 밧줄을 받아 줄 사람이 없어!'],
              ['hari', '선창지기 아저씨가 저기 숨어 있어. 캄캄해서 못 나오는 거야.'],
              ['day', '저 사람에게는 빛이 필요해. 그런데 배들에게는 어둠이 필요하고.'],
            ]);
            g2.toast('선창의 고리에 등불을 걸고, 빛의 가장자리를 끌어 꼭 필요한 만큼만 밝히세요.', 14000);
          });
        } else if (dazzled && lit && !G.flags.toldDazzle && G.lan.mode === 'hung') {
          G.flags.toldDazzle = true;
          G.run(async (g2) => { await g2.say('keeper', '어이쿠, 눈이 부셔서 배가 안 보여! 빛을 조금만 줄여 다오!'); });
        } else if (home === G.boats.length) {
          G.flags.boatsDone = true;
          G.run(L.ch2.afterBoats);
        }
      }
    },
    afterBoats: async (g) => {
      const G = g.G, sp = G.thing('lsp');
      g.toastOff();
      await g.wait(1.2);
      await g.talk([
        ['narr', '세 척의 배가 별빛 아래로 돌아왔다. 선창에는 손바닥만 한 빛 하나.'],
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
        g.sfx('on');
        sp.tired = 0.3;
        g.flag('A_lit_lighthouse');
        await g.say('narr', '등대에 불이 돌아왔다. 곶 위가 환해지자, 별은 다시 그 빛에 묻혔다.');
      } else {
        if (r.v !== 'self') await g.say('lighthouse', '고마워. 처음으로, 눈을 감아 볼게.');
        g.sfx('star');
        await Promise.all([g.tween(sp, 'dy', 620, 3.4), g.tween(sp, 'alpha', 0, 3.4)]);
        sp.visible = false;
      }
      // 황혼 타임 #2
      await g.cam(4150, 2);
      await H.summonNight(g, 'h_mid', 4420, -1);
      await g.talk([
        ['narr', '새벽이 가까워 온다. 빛이 닿지 않는 벼랑 위에서, 나이트가 별을 올려다보고 있다.'],
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
      await g.daybreak(3.6);
      await g.say('hari', '별이 하나뿐이라니. …원래는 얼마나 많았을까?');
      await g.fade(true, 1200);
      g.next();
    },
    drawOver: (ctx, G, env, camX) => {
      // 별빛이 물 위에 내리는 길
      const a = G.lastStar ? G.lastStar.a : 0;
      if (a < 0.05 || env.pass !== 'night') return;
      const x = 3330 - camX;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const gr = ctx.createLinearGradient(0, 96, 0, W3 + 30);
      gr.addColorStop(0, `rgba(200,215,255,${0.16 * a})`); gr.addColorStop(1, `rgba(200,215,255,${0.03 * a})`);
      ctx.fillStyle = gr;
      ctx.beginPath(); ctx.moveTo(x - 3, 96); ctx.lineTo(x + 3, 96); ctx.lineTo(x + 90, W3 + 30); ctx.lineTo(x - 130, W3 + 30); ctx.closePath(); ctx.fill();
      for (let i = 0; i < 16; i++) {
        const tw = 0.5 + 0.5 * Math.sin(G.time * 2.4 + i * 1.7);
        ctx.fillStyle = `rgba(225,235,255,${0.75 * a * tw})`;
        ctx.beginPath(); ctx.ellipse(x - 110 + ((i * 53) % 190), W1 + 4 + ((i * 29) % 96), 5, 1.2, 0, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    },
  };

  /* ═════════ 3장 — 대도시: 별 없는 하늘 ═════════
   * 그림자 걸음: 그림자 다리는 어둠 속에서만 단단하다.
   * 빛을 먹는 그을음: 빛이 닿으면 깨어나 길을 막고, 어둠 속에서는 잔다. */
  const SY = 648, RA = 560, RH = 500;       // 길바닥, 옥상, 병원 옥상
  L.ch3 = {
    id: 'ch3', title: '3장 · 대도시', sub: '별 없는 하늘',
    width: 4600, theme: 'city',
    tod: [[0, 0.9], [560, 1]],
    sky: { cloudAlpha: 0.35 },
    backdrop: [
      { kind: 'skyline', par: 0.12, base: 430, amp: 300, fade: 0.62, seed: 5 },
      { kind: 'skyline', par: 0.26, base: 470, amp: 210, fade: 0.34, seed: 9 },
    ],
    layers: [
      { id: 'r_c', kind: 'poly', style: 'roof', tone: 0.18, walk: false,
        pts: [[-200, 790], [596, 790], [600, 360], [840, 360], [844, 790], [1896, 790], [1900, 330], [2140, 330], [2144, 790],
              [2996, 790], [3000, 380], [3260, 380], [3264, 790], [4196, 790], [4200, 380], [4520, 380], [4524, 790], [4800, 790]] },
      { id: 'r_b', kind: 'poly', style: 'roof', tone: 0.46, walk: false,
        pts: [[-200, 790], [196, 790], [200, 440], [520, 440], [524, 790], [1296, 790], [1300, 450], [1620, 450], [1624, 790],
              [2396, 790], [2400, 450], [2660, 450], [2664, 790], [3596, 790], [3600, 420], [3860, 420], [3864, 790], [4800, 790]] },
      // 걸어 다니는 옥상 줄: 계단, 건물, 골목(끊긴 곳)
      { id: 'r_a', kind: 'poly', style: 'roof', tone: 0.76,
        pts: [[-200, 790], [376, 790], [380, SY], [560, RA], [1000, RA], [1004, 790], [1236, 790], [1240, RA], [1700, RA], [1880, SY], [1884, 790],
              [2696, 790], [2700, SY], [2880, RA], [3400, RA], [3520, RH], [3900, RH], [3904, 790], [4046, 790], [4050, RH], [4420, RH], [4424, 790], [4800, 790]] },
      // 광고판 위: 걸어서는 닿지 못한다 (황혼 걸음을 아는 이만)
      { id: 'sign', style: 'rock', thick: 16, tone: 0.3, pts: [[1056, 446], [1120, 444], [1184, 446]] },
      H.shadow('sh1', 1000, 1240, RA),
      H.shadow('sh2', 3900, 4050, RH),
      { id: 'st', kind: 'poly', style: 'street', tone: 1, pts: [[-200, SY], [4800, SY]] },
    ],
    blocks: [
      { layer: 'st', x0: 760, x1: 900, prop: 'cars' },
      { layer: 'st', x0: 3000, x1: 3140, prop: 'cars' },
    ],
    props: [
      { type: 'tank', layer: 'r_c', x: 700 }, { type: 'antenna', layer: 'r_c', x: 2000 }, { type: 'antenna', layer: 'r_c', x: 3200, s: 0.8 }, { type: 'tank', layer: 'r_c', x: 4440, s: 0.9 },
      { type: 'tank', layer: 'r_b', x: 300 }, { type: 'neon', layer: 'r_b', x: 420, w: 70, col: '#5ad2ff', lit: 'cityLit' }, { type: 'antenna', layer: 'r_b', x: 1560 },
      { type: 'neon', layer: 'r_b', x: 2520, w: 80, col: '#ffd45a', lit: 'cityLit' }, { type: 'antenna', layer: 'r_b', x: 3640, s: 0.9 },
      { type: 'antenna', layer: 'r_a', x: 620, s: 0.8 }, { type: 'neon', layer: 'r_a', x: 880, w: 84, col: '#ff5ac8', lit: 'A_lit_neon' },
      { type: 'tank', layer: 'r_a', x: 1300, s: 0.9 }, { type: 'antenna', layer: 'r_a', x: 1660 },
      { type: 'tank', layer: 'r_a', x: 2960, s: 0.85 }, { type: 'antenna', layer: 'r_a', x: 3360, s: 0.8 },
      { type: 'cross', layer: 'r_a', x: 3600, lit: 'A_lit_hospital' }, { type: 'antenna', layer: 'r_a', x: 4380, s: 0.8 },
      { type: 'streetlight', layer: 'st', x: 250, lit: 'A_lit_street' }, { type: 'streetlight', layer: 'st', x: 1130, lit: 'A_lit_street' },
      { type: 'streetlight', layer: 'st', x: 1960, lit: 'A_lit_street' }, { type: 'streetlight', layer: 'st', x: 2244, lit: 'A_lit_street' },
      { type: 'subway', layer: 'st', x: 2470 }, { type: 'billboard', layer: 'sign', x: 1120 },
      { type: 'streetlight', layer: 'st', x: 3300, lit: 'A_lit_street' }, { type: 'streetlight', layer: 'st', x: 4100, lit: 'A_lit_street' },
    ],
    start: { layer: 'st', x: 120 },
    things: [
      { id: 'neon', kind: 'spirit', spirit: 'neon', layer: 'r_a', x: 902, dy: 30, tired: 0.2 },
      { id: 'street', kind: 'spirit', spirit: 'street', layer: 'st', x: 2470, dy: 12, tired: 0.7, scale: 0.85 },
      { id: 'hosp', kind: 'spirit', spirit: 'hospital', layer: 'r_a', x: 3720, dy: 30, tired: 0.6 },
      // 옥상: 그을음 다음에 빛 먹는 그을음
      H.soot('s1', 'r_a', 1350, 36), Object.assign(H.soot('e1', 'r_a', 1580, 40, 'eater'), { if: (G) => G.isNight }),
      // 길바닥: 그을음 · 빛 먹는 그을음 · 그을음이 붙어 있다. 빛의 가장자리를 꼭 그 경계에 놓아야 한다
      H.soot('s2', 'st', 2068, 35), Object.assign(H.soot('e2', 'st', 2130, 32, 'eater'), { if: (G) => G.isNight }), H.soot('s3', 'st', 2192, 35),
      H.hook('hk_street', 'st', 2244, 96),
      // 골목 아래의 낮은 고리 (2회차: 여기 걸면 빛의 가장자리가 광고판 위를 지난다)
      { id: 'hk_alley', kind: 'hook', x: 1120, y: 640, r: 46, run2: true },
      H.clue({ id: 'clock', run2: true, layer: 'sign', x: 1120 }, 'clock', [
        ['narr', '광고판 꼭대기에 멈춘 시계가 걸려 있다. 바늘은 해 질 녘을 가리킨다.'],
        ['narr', '열두 숫자 사이에, 지워진 눈금이 하나 더 있다. 낮의 끝과 밤의 처음 사이.'],
        ['day', '여기에도… 세 번째 자리.'],
      ]),
    ],
    triggers: [
      { x: 640, layers: ['st'], run: async (g) => {
        await g.say('day', '길이 막혔어. 저 계단으로 지붕 위에 올라가자.');
      } },
      { x: 600, layers: ['r_a'], run: async (g) => {
        await g.nightfall(3.2);
        await g.say('narr', '마지막 햇빛이 지자, 수백만 개의 창문이 한꺼번에 눈을 감았다.\n한 번도 어두워진 적 없던 도시가, 처음으로 밤을 만났다.');
      } },
      // 네온
      { x: 800, layers: ['r_a'], if: (G) => G.isNight, run: async (g) => {
        const G = g.G, sp = G.thing('neon');
        await g.talk([
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
          ['neon', '아, 가는 길은 알려 줄게. 저 건물 사이에 드리운 그림자 보여?'],
          ['neon', '빛이 닿으면 그냥 그림자야. 그런데 캄캄할 때 밟으면… 밤은 생각보다 단단하거든.'],
        ]);
        g.learn('shadowWalk');
        if (r.where === 'night') { await Promise.all([g.tween(sp, 'dy', 560, 3), g.tween(sp, 'alpha', 0, 3)]); sp.visible = false; }
        await g.say('narr', '그림자 걸음을 배웠다. 그림자는 어둠 속에서만 단단하다.');
        g.toast('등불을 끄고, 옥상 끝에서 이어지는 그림자를 밟아 건너세요.', 9000);
      } },
      { x: 1050, layers: ['sh1'], run: async (g) => {
        g.toastOff();
        await g.say('hari', '그, 그림자 위를 걷는 거야? 떨어지면 어떡해…');
        const v = await g.choose([
          { t: '내 손 잡아. 내가 먼저 밟을게.', v: 1 },
          { t: '눈 감고 따라와.', v: 0 },
        ]);
        if (v) { g.S.bond++; await g.say('hari', '…어, 진짜 단단하네! 물 위를 걷는 것 같아.'); }
        else await g.say('hari', '으으… 알았어. 꼭 잡고 갈게.');
      } },
      { x: 1420, layers: ['r_a'], run: async (g) => {
        await g.talk([
          ['day', '저 앞의 그을음은 다른 것들과 달라. 빛을 먹고 커지는 놈이야.'],
          ['day', '빛이 닿으면 깨어나서 길을 막을 거야. 어둠 속에서는 자고 있고.'],
        ]);
        g.toast('그을음은 빛으로 물리치고, 빛 먹는 그을음은 불을 끄고 지나가세요.', 8000);
      } },
      { x: 1940, layers: ['st'], run: async (g) => {
        await g.talk([
          ['hari', '어떡해. 그을음이랑 빛 먹는 놈이 딱 붙어 있어.'],
          ['hari', '불을 켜면 가운데 놈이 막고, 끄면 양옆이 막아.'],
          ['day', '…빛의 가장자리. 낮도 밤도 아닌 그 띠에서는, 둘 다 가만히 있었어.'],
        ]);
        g.toast('앞쪽 가로등의 고리에 등불을 걸고, 빛의 가장자리가 두 그을음의 경계에 오도록 크기를 맞추세요.', 14000);
      } },
      // 가로등
      { x: 2380, layers: ['st'], run: async (g) => {
        const G = g.G, sp = G.thing('street');
        g.toastOff();
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
      { x: 3640, layers: ['r_a'], run: async (g) => {
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
        g.toast('그림자를 밟고 옆 건물의 옥상으로 건너가세요. 날이 밝아 오고 있어요.', 7000);
      } },
      // 황혼 타임 #3
      { x: 4140, layers: ['r_a'], if: (G) => G.flags.spiritsDone, run: async (g) => {
        const G = g.G;
        g.toastOff();
        await g.walk(G.day, 'r_a', 4170);
        g.face(G.day, 1);
        G.setRadius(0, true);
        await g.cam(4280, 2);
        const n = G.addThing({ id: 'nightTop', kind: 'girl', who: 'night', layer: 'r_c', x: 4380, dir: -1, alpha: 0 });
        await g.tween(n, 'alpha', 1, 2.2);
        await g.talk([
          ['narr', '새벽이 오기 직전. 데이가 등불을 덮자, 맞은편 옥상의 어둠 속에 나이트가 서 있다.\n이번에는, 이쪽을 보고.'],
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
        await g.tween(n, 'alpha', 0, 1.6);
        n.visible = false;
        await g.daybreak(3.4);
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
