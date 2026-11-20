/* 데이 & 나이트 — 장면들 (1/3): 공용 도우미, 첫 화면, 프롤로그, 1장
 *
 * 장면 하나는 { 겹(layers), 소품(props), 사물(things), 발판(triggers), 대본(intro 등) } 으로 이루어진다.
 * 겹은 뒤에서 앞 순서로 적는다. 지형은 움직이지 않고, 길을 여닫는 것은 등불의 빛이다.
 *   zone: 'day'   빛 안에서만 실재하는 겹 (하늘 궁전의 구름)
 *   zone: 'night' 어둠 속에서만 실재하는 겹 (그림자 다리, 밤의 섬)
 *   needs: 깃발  누군가 내려 주어야 하는 다리
 */
(function (root) {
  'use strict';
  const DN = (root.DN = root.DN || {});
  const U = DN.U;
  const L = (DN.LEVELS = {});
  const H = (DN.LevelHelp = {});

  /** 완만하게 굽이치는 능선 띠 */
  H.band = function (x0, x1, base, amp, seed, step) {
    const rnd = U.rng(seed), pts = [];
    step = step || 230;
    for (let x = x0; x <= x1 + 1; x += step) pts.push([x, Math.round(base + (rnd() * 2 - 1) * amp)]);
    return pts;
  };
  /** 길이 끊긴 자리 (개울, 구덩이): 양 끝의 높이는 y */
  H.gap = (x0, x1, y) => [[x0 - 70, y], [x0 - 8, y], [x0, y + 4], [x0 + 30, 830], [x1 - 30, 830], [x1, y + 4], [x1 + 8, y], [x1 + 70, y]];
  /** 그림자 다리: 어둠 속에서만 단단하다 */
  H.shadow = (id, x0, x1, y, y1) => ({ id, zone: 'night', thin: true, pts: [[x0 - 34, y], [(x0 + x1) / 2, (y + (y1 === undefined ? y : y1)) / 2 + 20], [x1 + 34, y1 === undefined ? y : y1]] });
  /** 널다리: 깃발이 서야 놓인다 */
  H.plank = (id, x0, x1, y, needs) => ({ id, kind: 'poly', thin: true, needs, pts: [[x0 - 30, y], [x1 + 30, y]] });
  H.hook = (id, layer, x, up) => ({ id, kind: 'hook', layer, x, up, r: 46 });
  H.soot = (id, layer, x, rad, type) => ({ id, kind: 'soot', layer, x, rad, type: type || 'fear' });

  /** 빛 정령의 행방을 묻는 공통 선택 (축 A) */
  H.spiritChoice = async function (g, key, opt) {
    const v = await g.choose([
      { t: opt.human, v: 'human' },
      { t: opt.night, v: 'night' },
      { t: opt.self || '네가 정해. 네 빛이잖아.', v: 'self', extra: true, sub: '지난 여정의 기억이 연 선택' },
    ]);
    const sp = DN.Story.SPIRITS.find((s) => s.k === key);
    const where = v === 'self' ? sp.wish : v;
    g.S.A[key] = where;
    g.flag('A_' + key, where);
    return { v, where };
  };

  /** 황혼 타임의 대답 (축 B) */
  H.duskChoice = async function (g, opts) {
    const v = await g.choose([
      { t: opts.hostile, v: 'hostile' },
      { t: opts.understand, v: 'understand' },
      { t: opts.trust, v: 'trust' },
    ]);
    g.S.B += { hostile: -2, understand: 1, trust: 2 }[v] * (opts.weight || 1);
    return v;
  };

  /** 나이트를 어둠 속 먼 능선에 세운다 (그녀는 빛 속에 서지 않는다) */
  H.summonNight = function (g, layer, x, dir) {
    const G = g.G;
    let n = G.agent('night');
    if (!n) n = G.addAgent({ id: 'night', kind: 'night', layer, x, dir: dir || 1, alpha: 0 });
    G.night = n;
    return g.tween(n, 'alpha', 1, 2.2);
  };

  /** 단서를 살펴보는 사물 */
  H.clue = function (def, id, lines) {
    return Object.assign({
      kind: 'clue', r: 54, dy: 30,
      if: (G) => !G.S.clues.includes(id),
      tap: async (g) => { await g.talk(lines); g.clue(id); },
    }, def);
  };

  /* ═════════ 첫 화면: 한쪽은 낮, 한쪽은 밤, 그 사이의 의자 ═════════ */
  L.title = {
    id: 'title', width: 2200, theme: 'hill', tod: 1, camCenter: 1100, night: true, dayTod: 0.5,
    sky: { sun: { x: 760, y: 356, r: 60, par: 1, col: '#ffcf8f' }, stars: 0.5 },
    backdrop: [
      { kind: 'mountains', par: 1, base: 470, amp: 120, freq: 0.003, fade: 0.55, seed: 4 },
      { kind: 'mountains', par: 1, base: 520, amp: 80, freq: 0.005, fade: 0.25, seed: 9 },
    ],
    layers: [
      { id: 't_back', walk: false, tone: 0.4, pts: [[-100, 560], [400, 520], [800, 548], [1100, 560], [1400, 540], [1800, 526], [2300, 560]] },
      { id: 't_hill', walk: false, tone: 0.75, pts: [[-100, 660], [500, 630], [800, 588], [1000, 566], [1100, 562], [1200, 566], [1400, 590], [1700, 632], [2300, 660]] },
      { id: 't_fore', walk: false, tone: 1, pts: [[-100, 690], [600, 700], [1100, 684], [1600, 702], [2300, 688]] },
    ],
    props: [
      { type: 'chairs', layer: 't_hill', x: 1100, gap: 46, s: 1.5 },
      { type: 'lonetree', layer: 't_back', x: 1560, s: 1.3 },
    ],
    things: [
      { id: 'tday', kind: 'girl', who: 'day', layer: 't_hill', x: 962, dir: 1, h: 120 },
      { id: 'tnight', kind: 'girl', who: 'night', layer: 't_hill', x: 1238, dir: -1, h: 120 },
    ],
    // 왼쪽에서 밀려온 커다란 낮. 그 가장자리가 가운데 의자를 지난다.
    bubbles: () => [{ x: -1900, y: 500, r: 3000 }],
  };

  /* ═════════ 프롤로그 — 어긋난 교대 ═════════ */
  L.prologue = {
    id: 'prologue', title: '프롤로그', sub: '어긋난 교대',
    width: 3100, theme: 'sky', tod: 1, dayTod: 1,
    sky: { sun: { x: 960, y: 318, r: 56, par: 0.08, col: '#ffcf8f' }, cloudAlpha: 0.75 },
    backdrop: [
      { kind: 'mountains', par: 0.05, base: 668, amp: 60, freq: 0.004, color: '#5c4c7e', fade: 0.12, seed: 21 },
      { kind: 'lights', par: 0.05, base: 652, amp: 64, n: 130, seed: 5 },
    ],
    layers: [
      { id: 'p_far1', walk: false, style: 'cloud', thick: 60, tone: 0.05, zone: 'day', pts: [[250, 250], [420, 236], [640, 246], [800, 262]] },
      { id: 'p_far2', walk: false, style: 'cloud', thick: 70, tone: 0.1, zone: 'day', pts: [[2180, 250], [2400, 232], [2660, 244], [2860, 262]] },
      // 하늘 궁전의 구름은 낮의 것이다. 빛 속에서만 단단하다.
      { id: 'c3', style: 'cloud', thick: 120, tone: 0.42, zone: 'day', pts: [[1360, 396], [1500, 364], [1650, 340], [1800, 346], [2010, 374]] },
      { id: 'c2', style: 'cloud', thick: 84, tone: 0.68, zone: 'day', pts: [[740, 566], [860, 548], [1000, 476], [1250, 404], [1380, 396], [1500, 366]] },
      { id: 'c1', style: 'cloud', thick: 120, tone: 1, zone: 'day', pts: [[-80, 556], [150, 546], [400, 540], [650, 548], [900, 556]] },
      { id: 'c4', style: 'cloud', thick: 100, tone: 0.92, zone: 'day', pts: [[1880, 360], [2010, 376], [2250, 440], [2550, 530], [2800, 610], [3010, 660]] },
    ],
    props: [
      { type: 'column', layer: 'c1', x: 60, h: 120 },
      { type: 'column', layer: 'c1', x: 300, h: 84, broken: true },
      { type: 'arch', layer: 'c3', x: 1440, s: 1.1 },
      { type: 'column', layer: 'c3', x: 1880, h: 100, broken: true },
      { type: 'chairs', layer: 'c3', x: 1660, gap: 36 },
      { type: 'column', layer: 'c4', x: 2380, h: 70, broken: true },
    ],
    start: { layer: 'c1', x: 170 },
    things: [
      H.clue({ id: 'chairs', layer: 'c3', x: 1660, if: (G) => G.flags.sunDone && !G.S.clues.includes('chairs') }, 'chairs', [
        ['narr', '노을 언덕에는 의자가 세 개 놓여 있다.'],
        ['day', '나랑 나이트, 둘이서 쓰는데… 왜 셋일까.'],
        ['day', '한 번도 생각해 본 적이 없네.'],
      ]),
      { id: 'sun', sky: true, x: 960, y: 318, par: 0.08, r: 100, zone: [1400, 2100],
        if: (G) => G.flags.sunReady && !G.flags.sunDone,
        tap: async (g) => {
          const G = g.G, d = G.day;
          g.toastOff();
          g.sfx('chime');
          for (let i = 0; i < 26; i++) {
            const sx = DN.Render.sunScreen.x + G.cam.x, sy = DN.Render.sunScreen.y;
            G.particles.push({ x: sx, y: sy, vx: (d.x - sx) * 0.9 + (Math.random() - 0.5) * 80, vy: (d.y - 50 - sy) * 0.9 + (Math.random() - 0.5) * 60, g: 0, life: 0, max: 1 + Math.random() * 0.25, r: 1.5 + Math.random() * 2, col: [255, 226, 150], add: true });
          }
          await g.wait(1.1);
          g.learn('lantern');
          g.flag('sunDone');
          G.sparkle(d.x + 18, d.y - 40, [255, 230, 160], 22, 70);
          await g.talk([
            ['narr', '지는 해의 조각 하나가 등불 안에 내려앉았다.'],
            ['day', '됐어. 이거면—'],
          ]);
          await g.tween(G.sun, 'a', 0, 1.4);
          await g.nightfall(3.6);
          await g.talk([
            ['narr', '해가 졌다. 건네받을 이 없는 낮은, 데이의 등불 속으로 오므라들었다.'],
            ['narr', '등불 둘레에 남은 한 줌의 낮. 그 바깥은 전부 밤이다.'],
            ['day', '…구름이 흐려졌어. 하늘 궁전은 낮의 것이라, 빛 속에서만 단단하구나.'],
            ['day', '별도 없네. 나이트의 밤이, 원래 이렇게 비어 있었나.'],
            ['day', '내려가자. 빛이 왜 사라졌는지, 나이트가 무슨 짓을 한 건지 알아야 해.'],
          ]);
          g.toast('구름은 등불의 빛 안에서만 디딜 수 있어요. 오른쪽 아래로 내려가세요. 반짝이는 것은 눌러서 살펴볼 수 있습니다.', 9000);
        } },
    ],
    triggers: [
      { x: 1560, run: async (g) => {
        const G = g.G;
        g.toastOff();
        await g.walk(G.day, 'c3', 1604);
        g.face(G.day, 1);
        await g.talk([
          ['narr', '노을 언덕. 매일 이 시간, 쌍둥이는 여기서 손을 맞대고 하늘을 건넨다.'],
          ['day', '나이트? 나 왔어.'],
        ]);
        await g.wait(1.2);
        await g.talk([
          ['day', '…늦는 애가 아닌데.'],
          ['narr', '해가 다 기울도록, 나이트는 오지 않았다.'],
        ]);
        g.sfx('dark');
        await g.tween(G, 'farLights', 0, 2.4);
        await g.talk([
          ['day', '어…?'],
          ['day', '불빛이… 인간들의 불빛이, 한꺼번에 꺼졌어.'],
          ['narr', '화롯불도, 등대도, 도시의 가로등도. 인간이 만든 빛이 모두 사라졌다.'],
          ['day', '나이트. 네가 한 거야?'],
        ]);
        g.flag('sunReady');
        g.toast('지는 해를 눌러, 남은 빛을 등불에 담으세요.', 9000);
      } },
      { x: 2880, if: (G) => G.flags.sunDone, run: async (g) => {
        await g.talk([
          ['day', '이 아래가 인간의 세계.'],
          ['day', '기다려, 나이트. 빛은 내가 되찾을 거야.'],
        ]);
        await g.fade(true, 1300);
        g.next();
      } },
    ],
    intro: async (g) => {
      await g.wait(2.6);
      await g.talk([
        ['narr', '하늘에는 쌍둥이 자매가 산다.\n낮을 돌보는 언니 데이, 밤을 돌보는 동생 나이트.'],
        ['narr', '둘이 만나는 것은 하루에 두 번, 노을과 새벽뿐.\n"낮은 데이의 것, 밤은 나이트의 것." 오래된 약속이었다.'],
        ['day', '곧 노을이야. 나이트가 기다리겠다.'],
      ]);
      g.toast('가고 싶은 곳을 눌러 걸어가세요. 구름을 따라 노을 언덕으로.', 9000);
    },
  };

  /* ═════════ 1장 — 산골 마을: 꺼진 화롯불 ═════════ */
  const RY = 560;                     // 마을 길의 높이
  const HUT_X = 2930, BELL_X = 3300, DENSE_X = 3570, HEARTH_X = 4040;

  L.ch1 = {
    id: 'ch1', title: '1장 · 산골 마을', sub: '꺼진 화롯불',
    width: 4900, theme: 'village',
    tod: [[0, 0], [800, 0.2], [1450, 1]],
    sky: {},
    backdrop: [
      { kind: 'mountains', par: 0.12, base: 330, amp: 150, freq: 0.0024, fade: 0.7, seed: 31 },
      { kind: 'mountains', par: 0.22, base: 380, amp: 90, freq: 0.004, fade: 0.4, seed: 47 },
    ],
    layers: [
      { id: 'v_far', walk: false, tone: 0.05, pts: H.band(-200, 5200, 300, 16, 101) },
      { id: 'v_mid', walk: false, tone: 0.4, pts: H.band(-200, 5200, 418, 12, 102) },
      // 바위 턱: 걸어서는 닿지 못한다 (황혼 걸음을 아는 이만)
      { id: 'perch', style: 'rock', thick: 34, tone: 0.5, pts: [[3410, 478], [3470, 474], [3540, 477]] },
      { id: 'road', tone: 0.82, pts: H.band(-200, 2400, RY, 5, 104).concat(H.gap(2640, 2820, RY), [[3000, RY], [3300, RY], [3570, RY]], H.band(3800, 5200, RY, 5, 106)) },
      H.plank('draw', 2640, 2820, RY, 'bridgeDown'),
      { id: 'v_f', walk: false, tone: 1, pts: H.band(-200, 5200, 668, 10, 105) },
    ],
    props: [
      { type: 'pine', layer: 'v_far', x: 180, s: 0.8 }, { type: 'pine', layer: 'v_far', x: 250, s: 1 }, { type: 'pine', layer: 'v_far', x: 980, s: 0.9 },
      { type: 'pine', layer: 'v_far', x: 1700, s: 1 }, { type: 'pine', layer: 'v_far', x: 2400, s: 0.8 }, { type: 'pine', layer: 'v_far', x: 3900, s: 1 }, { type: 'pine', layer: 'v_far', x: 4500, s: 0.9 },
      { type: 'tree', layer: 'v_mid', x: 320, seed: 3 }, { type: 'house', layer: 'v_mid', x: 620, roof: '#8f6f88', lit: 'hearthHome' }, { type: 'pine', layer: 'v_mid', x: 900, s: 1.1 },
      { type: 'tree', layer: 'v_mid', x: 1400, seed: 8, autumn: true }, { type: 'house', layer: 'v_mid', x: 1960, lit: 'hearthHome' }, { type: 'pine', layer: 'v_mid', x: 2300, s: 1 },
      { type: 'tree', layer: 'v_mid', x: 3080, seed: 5 }, { type: 'house', layer: 'v_mid', x: 3800, roof: '#9a7a52', lit: 'hearthHome' }, { type: 'pine', layer: 'v_mid', x: 4300, s: 1.2 },
      { type: 'sign', layer: 'road', x: 260 }, { type: 'tree', layer: 'road', x: 430, seed: 21 }, { type: 'fence', layer: 'road', x: 700, n: 7 },
      { type: 'house', layer: 'road', x: 1010, lit: 'hearthHome' }, { type: 'woodpile', layer: 'road', x: 1090 }, { type: 'lamp', layer: 'road', x: 1240, lit: 'hearthHome' },
      { type: 'house', layer: 'road', x: 1420, roof: '#9a7a52', w: 54, lit: 'hearthHome' }, { type: 'lamp', layer: 'road', x: 1700, lit: 'hearthHome' },
      { type: 'house', layer: 'road', x: 2000, roof: '#8f6f88', lit: 'hearthHome' }, { type: 'fence', layer: 'road', x: 2330, n: 6 },
      { type: 'post', layer: 'road', x: 2880, h: 62, arm: -18 }, { type: 'hut', layer: 'road', x: HUT_X, lit: 'bridgeDown' },
      { type: 'belfry', layer: 'road', x: BELL_X, h: 250 },
      { type: 'house', layer: 'road', x: 3880, w: 52, lit: 'hearthHome' }, { type: 'hearth', layer: 'road', x: HEARTH_X, lit: 'hearthHome' },
      { type: 'woodpile', layer: 'road', x: 4130 }, { type: 'house', layer: 'road', x: 4230, roof: '#9a7a52', lit: 'hearthHome' }, { type: 'lamp', layer: 'road', x: 4340, lit: 'hearthHome' },
      { type: 'lonetree', layer: 'road', x: 4700, s: 0.9 },
    ],
    start: { layer: 'road', x: 140 },
    hari: false,
    things: [
      H.soot('s1', 'road', 1820, 36), H.soot('s2', 'road', 2110, 34), H.soot('s3', 'road', 2260, 32), H.soot('s4', 'road', 3080, 30),
      H.soot('dense', 'road', DENSE_X, 54, 'dense'),
      { id: 'harinpc', kind: 'npc', who: 'hari', layer: 'road', x: 2184, dir: -1, shiver: true, pole: true, if: (G) => G.isNight && !G.hari },
      { id: 'keeper', kind: 'npc', who: 'keeper', layer: 'road', x: HUT_X + 60, dir: -1, visible: false },
      H.hook('hk_hut', 'road', 2862, 86),
      H.hook('hk_bell', 'road', BELL_X - 38, 214),
      { id: 'bell', kind: 'mirror', look: 'bell', layer: 'road', x: BELL_X, up: 236, fx: DENSE_X, fy: RY - 44, fr: 122 },
      { id: 'hearthLight', kind: 'none', layer: 'road', x: HEARTH_X, up: 50, light: { r: 320, flag: 'hearthHome' }, visible: false },
      { id: 'hearth', kind: 'spot', layer: 'road', x: HEARTH_X, standX: HEARTH_X - 64, dy: 34, r: 64, touch: 30, if: (G) => G.isNight && !G.flags.hearthDone,
        tap: async (g) => {
          const G = g.G;
          const sp = G.addThing({ id: 'hsp', kind: 'spirit', spirit: 'hearth', layer: 'road', x: HEARTH_X, dy: 14, tired: 0.9, alpha: 0, scale: 0.9 });
          g.sfx('chime');
          await Promise.all([g.tween(sp, 'alpha', 1, 1.2), g.tween(sp, 'dy', 40, 1.2)]);
          await g.talk([
            ['narr', '식은 재가 들썩이더니, 작은 불꽃이 눈을 떴다.'],
            ['hearth', '…누구야. 다시 타라고 부르러 온 거야?'],
            ['day', '빛 정령이구나. 나이트한테 붙잡혀 간 게 아니었어?'],
            ['hearth', '붙잡혀? 아니야. 나는 숨은 거야.'],
            ['hearth', '겨울 내내 밤새 타느라 너무 지쳤어.\n한 번도, 단 한 번도 꺼져 본 적이 없어.'],
            ['hari', '그치만… 화로가 없으면 마을 사람들이 추운걸. 무서워서 그을음도 끼고.'],
            ['hearth', '알아. 그래서 더 못 쉬었지.'],
          ]);
          if (g.run2) await g.say('hearth', '…너, 어디서 본 것 같아. 전에도 누가 이렇게 물어봐 준 적이 있었는데.');
          const r = await H.spiritChoice(g, 'hearth', {
            human: '마을로 돌아가 줘. 사람들이 널 기다리고 있어.',
            night: '쉬어도 돼. 밤이 너를 맡아 줄 거야.',
          });
          if (r.v === 'self') await g.say('hearth', '내가…? 그런 건 아무도 물어본 적 없는데.\n…그럼, 조금만 잘래.');
          if (r.where === 'human') {
            if (r.v !== 'self') await g.say('hearth', '…알았어. 대신 봄이 오면, 하룻밤쯤은 쉬게 해 줘.');
            sp.tired = 0.3;
            g.sfx('on');
            await g.tween(sp, 'dy', 16, 0.9);
            sp.visible = false;
            g.flag('hearthHome');
            await g.talk([
              ['narr', '화로에 불이 돌아왔다. 마을 한가운데에, 꺼지지 않는 낮이 한 뼘 생겼다.'],
              ['hari', '와… 따뜻해. 그을음도 못 오겠다.'],
            ]);
          } else {
            if (r.v !== 'self') await g.say('hearth', '정말? …고마워. 그 말이, 불보다 따뜻하네.');
            g.sfx('star');
            await Promise.all([g.tween(sp, 'dy', 520, 3.2), g.tween(sp, 'alpha', 0, 3.2)]);
            sp.visible = false;
            await g.talk([
              ['narr', '불꽃은 밤하늘로 천천히 떠올라, 어둠 속에 누웠다.'],
              ['hari', '…추운 건, 껴입으면 되지 뭐. 무서운 건… 같이 있으면 되고.'],
            ]);
          }
          g.flag('hearthDone');
          await g.say('narr', '빛 정령과 이야기할 수 있게 되었다.');
          g.toast('오른쪽 언덕 끝으로 가 보세요. 밤이 물러가고 있어요.', 6000);
        } },
      // 2회차: 황혼 걸음으로만 닿는 바위 턱
      H.clue({ id: 'song', run2: true, layer: 'perch', x: 3496 }, 'song', [
        ['narr', '바위 턱에 낡은 등 고리가 박혀 있다. 하나, 둘… 셋.'],
        ['hari', '점등 노래에 그런 구절이 있었어. "낮과 밤 사이, 셋째 등은 누가 켜나."'],
        ['day', '…셋째?'],
      ]),
    ],
    triggers: [
      // 밤이 온다
      { x: 1500, run: async (g) => {
        const G = g.G;
        await g.walk(G.day, 'road', 1540);
        await g.nightfall(3.4);
        await g.talk([
          ['narr', '해가 넘어가자, 낮은 다시 등불 속으로 오므라들었다.'],
          ['narr', '마을은 캄캄하다. 부싯돌을 쳐도 불이 붙지 않는다. 등잔도, 화로도 켜지지 않는다.'],
          ['day', '밤이 되면 불이 붙지 않는구나. …내 등불만 빼고.'],
          ['narr', '어둠 속에서 무언가가 뭉쳐 든다.\n사람들의 두려움이 엉겨 붙은, 그을음.'],
          ['day', '어둠이 무서운 게 아니야. 무서워하는 마음이 저렇게 되는 거지.'],
        ]);
        g.toast('그을음은 밤에만 버팁니다. 등불의 빛이 닿으면 물러납니다.', 7000);
      } },
      // 하리
      { x: 2060, if: (G) => G.isNight, run: async (g) => {
        const G = g.G, npc = G.thing('harinpc');
        g.toastOff();
        await g.walk(G.day, 'road', 2136);
        g.face(G.day, 1);
        await g.wait(0.7);
        npc.shiver = false;
        await g.talk([
          ['hari', '오, 오지 마…! …어? 여기만 낮이야?'],
          ['day', '괜찮아. 이건 꺼지지 않는 불이야. 이 안에 있으면 그을음은 못 와.'],
          ['hari', '불이 붙는 등은 이제 없는데… 할아버지 등도 전부 꺼졌는데.'],
          ['hari', '나는 하리야. 우리 할아버지가 이 마을의 마지막 점등인이었어.\n해가 지면 막대를 들고 등을 켜러 다니는 사람.'],
          ['day', '나는 데이. 사라진 빛을 찾으러 내려왔어.'],
        ]);
        const v = await g.choose([
          { t: '같이 갈래? 어두운 데서는 내 옆에 있으면 돼.', v: 1 },
          { t: '위험하니까 집에 가 있어.', v: 0 },
        ]);
        if (v) { g.S.bond++; await g.say('hari', '…응! 나, 길은 잘 알아. 화롯불 있던 데도 알아!'); }
        else await g.say('hari', '집도 캄캄한걸. …따라갈래. 방해 안 할게.');
        g.S.hari = true;
        G.hari = G.addAgent({ id: 'hari', kind: 'hari', layer: 'road', x: npc.x, follow: G.day, pole: true });
        G.hari.ti = G.day.trail.length;
        npc.visible = false;
        g.sfx('join');
        await g.talk([
          ['narr', '하리가 함께 걷기 시작했다.'],
          ['hari', '이건 할아버지의 점등 막대야. 높은 고리에도 등을 걸 수 있어.'],
          ['hari', '걸어 두면 빛은 거기 머물러. 우리는 다른 데로 가도 되고.'],
        ]);
        g.learn('hooks');
        await g.say('narr', '등불을 고리에 걸 수 있게 되었다.');
      } },
      // 개울과 다리지기
      { x: 2540, if: (G) => !!G.hari && !G.flags.bridgeDown, run: async (g) => {
        await g.talk([
          ['hari', '다리가 올라가 있어. 다리지기 아저씨가 건너편 오두막에 숨었나 봐.'],
          ['day', '어둠이 무서운 거야. 우리는 못 건너가도, 빛은 건너갈 수 있어.'],
        ]);
        g.toast('건너편 등 기둥의 고리를 누르면 하리가 등불을 걸어 줍니다. 걸어 둔 등불을 누르면 돌아옵니다.', 12000);
      } },
      // 종과 짙은 그을음
      { x: 3180, if: (G) => !!G.hari, run: async (g) => {
        g.toastOff();
        await g.talk([
          ['hari', '저 앞의 건 너무 짙어. 등불을 대도 꿈쩍 안 할 거야.'],
          ['hari', '할아버지가 그랬어. 저 종이 빛을 받으면, 온 골짜기가 환했대.'],
          ['day', '종이 빛을 모아서 되비추는구나. 종 곁에 등불을 두면…'],
        ]);
        g.toast('종 곁의 고리에 등불을 걸어 보세요.', 9000);
      } },
      { x: 3680, if: (G) => !!G.hari, run: async (g) => {
        g.toastOff();
        await g.talk([
          ['hari', '됐다! 지나왔어!'],
          ['hari', '♪ 불은 하늘에서 빌려온 것, 해 지면 켜고 해 뜨면 갚지…'],
          ['day', '그 노래는 뭐야?'],
          ['hari', '점등 노래. 할아버지가 등을 켤 때마다 불렀어. 무슨 뜻인지는 나도 몰라.'],
        ]);
        g.toast('화로는 마을 한가운데에 있어요.', 5000);
      } },
      // 황혼 타임 #1
      { x: 4470, if: (G) => G.flags.hearthDone, run: async (g) => {
        const G = g.G;
        g.toastOff();
        if (G.lan.mode === 'hung') G.recall();
        await g.walk(G.day, 'road', 4510);
        g.face(G.day, 1);
        await g.cam(4650, 2);
        await H.summonNight(g, 'v_mid', 4800, 1);
        await g.talk([
          ['narr', '밤이 물러가는 짧은 틈. 빛이 닿지 않는 먼 능선에, 누군가 서 있다.'],
          ['day', '나이트!'],
          ['narr', '나이트는 돌아보지 않았다.'],
          ['night', '언니는 늘 인간 편이야.'],
        ]);
        if (g.run2) await g.say('night', '…이번엔 다를까.');
        const v = await H.duskChoice(g, {
          hostile: '네가 빛을 훔쳐 갔잖아! 당장 돌려놔.',
          understand: '…무슨 뜻이야? 말해 줘, 나이트.',
          trust: '네 편이기도 해. 그래서 여기까지 내려온 거야.',
        });
        await g.say('night', { hostile: '…그래. 그렇게 말할 줄 알았어.', understand: '…아직도 모르는구나.', trust: '…거짓말. 그래도, 듣기 싫지는 않네.' }[v]);
        await g.daybreak(3.6);
        await g.talk([
          ['narr', '해가 떠올랐다. 낮이 온 세상으로 퍼지자, 나이트의 모습은 그 가장자리에서 스러졌다.'],
          ['hari', '저 사람이… 밤이야? 생각보다, 슬퍼 보여.'],
        ]);
        await g.fade(true, 1200);
        g.next();
      } },
    ],
    intro: async (g) => {
      await g.wait(2.4);
      await g.talk([
        ['narr', '산골 마을. 해는 아직 높다.'],
        ['day', '해는 그대로인데… 사라진 건 인간이 만든 빛뿐이야.'],
        ['day', '빛이 있던 자리부터 찾아보자.'],
      ]);
    },
    update: (g) => {
      const G = g.G, ter = G.terrain;
      // 다리지기: 오두막 창에 빛이 닿으면 다리를 내려 준다 (한번 내린 다리는 그대로 둔다)
      if (G.isNight && !G.flags.bridgeDown && !G.busy && G.lan.mode === 'hung' && ter.zoneAt(HUT_X, RY - 34) === 'day') {
        G.flags.bridgeDown = true; G.flags.bridgeDownK = 0;
        G.run(async (g2) => {
          const k = G.thing('keeper');
          g2.toastOff();
          k.visible = true;
          await g2.talk([
            ['keeper', '…불빛? 정말 불빛이야?'],
            ['keeper', '미안하다, 얘들아. 캄캄하니 발이 떨어지질 않더구나. 다리를 내려 주마.'],
          ]);
          g2.sfx('bell');
          await g2.tween(G.flags, 'bridgeDownK', 1, 1.6, U.easeInOut);
          G.updateLight();
          await g2.say('hari', '고맙습니다, 아저씨!');
          g2.toast('건너간 뒤에, 걸어 둔 등불을 눌러 다시 불러오세요.', 7000);
        });
      }
    },
  };
})(typeof globalThis !== 'undefined' ? globalThis : window);
