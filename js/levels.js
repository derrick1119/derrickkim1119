/* 데이 & 나이트 — 장면들 (1/3): 공용 도우미, 첫 화면, 프롤로그, 1장
 *
 * 장면 하나는 { 겹(layers), 소품(props), 사물(things), 발판(triggers), 대본(intro 등) } 으로 이루어진다.
 * 겹은 뒤에서 앞 순서로 적는다. knobs = 끌어서 움직일 수 있는 부분 (c 중심, w 폭, lo~hi 움직이는 범위; 음수가 위쪽).
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
    g.flags['A_' + key] = where;
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

  /** 나이트를 먼 능선에 세운다 */
  H.summonNight = function (g, layer, x, dir) {
    const G = g.G;
    let n = G.agent('night');
    if (!n) n = G.addAgent({ id: 'night', kind: 'night', layer, x, dir: dir || 1, alpha: 0, rides: true });
    G.night = n;
    return g.tween(n, 'alpha', 1, 2.2);
  };

  /** 단서를 살펴보는 사물 */
  H.clue = function (def, id, lines) {
    return Object.assign({
      kind: 'clue', r: 50, dy: 26,
      if: (G) => !G.S.clues.includes(id),
      tap: async (g) => { await g.talk(lines); g.clue(id); },
    }, def);
  };

  /* ═════════ 첫 화면 ═════════ */
  L.title = {
    id: 'title', width: 2200, theme: 'hill', tod: 1, camCenter: 1100,
    sky: { sun: { x: 1100, y: 372, r: 64, par: 1, col: '#ffc98a' }, stars: 0.18 },
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
      { id: 'tday', kind: 'girl', who: 'day', layer: 't_hill', x: 962, dir: 1, h: 128 },
      { id: 'tnight', kind: 'girl', who: 'night', layer: 't_hill', x: 1238, dir: -1, h: 128 },
    ],
  };

  /* ═════════ 프롤로그 — 어긋난 교대 ═════════ */
  L.prologue = {
    id: 'prologue', title: '프롤로그', sub: '어긋난 교대',
    width: 3100, theme: 'sky', tod: 1,
    sky: { sun: { x: 960, y: 318, r: 56, par: 0.08, col: '#ffcf8f' }, cloudAlpha: 0.75 },
    backdrop: [
      { kind: 'mountains', par: 0.05, base: 668, amp: 60, freq: 0.004, color: '#5c4c7e', fade: 0.12, seed: 21 },
      { kind: 'lights', par: 0.05, base: 652, amp: 64, n: 130, seed: 5 },
    ],
    layers: [
      // 멀리 흐르는 구름 (걸을 수 없음)
      { id: 'p_far1', walk: false, style: 'cloud', thick: 60, tone: 0.05, pts: [[250, 250], [420, 236], [640, 246], [800, 262]] },
      { id: 'p_far2', walk: false, style: 'cloud', thick: 70, tone: 0.1, pts: [[2080, 300], [2300, 280], [2560, 292], [2760, 312]] },
      // 노을 언덕
      { id: 'c3', style: 'cloud', thick: 120, tone: 0.42,
        pts: [[1180, 372], [1300, 342], [1450, 322], [1600, 318], [1750, 330], [1880, 356]] },
      // 가운데 구름: 왼쪽은 끌어내리고, 오른쪽은 끌어올린다
      { id: 'c2', style: 'cloud', thick: 82, tone: 0.68,
        pts: [[560, 450], [700, 432], [900, 422], [1100, 432], [1280, 450]],
        knobs: [{ c: 700, w: 230, lo: 0, hi: 125 }, { c: 1165, w: 215, lo: -152, hi: 0 }] },
      // 출발하는 구름
      { id: 'c1', style: 'cloud', thick: 120, tone: 1,
        pts: [[-80, 556], [150, 546], [400, 540], [650, 550], [860, 568]] },
      // 지상으로 내려가는 구름
      { id: 'c4', style: 'cloud', thick: 100, tone: 0.92,
        pts: [[1820, 470], [2000, 452], [2200, 470], [2450, 520], [2700, 580], [2900, 640], [3010, 668]],
        knobs: [{ c: 1930, w: 200, lo: -128, hi: 0 }] },
    ],
    props: [
      { type: 'column', layer: 'c1', x: 60, h: 120 },
      { type: 'column', layer: 'c1', x: 300, h: 84, broken: true },
      { type: 'arch', layer: 'c3', x: 1330, s: 1.1 },
      { type: 'column', layer: 'c3', x: 1760, h: 100, broken: true },
      { type: 'chairs', layer: 'c3', x: 1530, gap: 36 },
      { type: 'column', layer: 'c4', x: 2380, h: 70, broken: true },
    ],
    start: { layer: 'c1', x: 170 },
    things: [
      H.clue({ id: 'chairs', layer: 'c3', x: 1530, if: (G) => G.flags.sunDone && !G.S.clues.includes('chairs') }, 'chairs', [
        ['narr', '노을 언덕에는 의자가 세 개 놓여 있다.'],
        ['day', '나랑 나이트, 둘이서 쓰는데… 왜 셋일까.'],
        ['day', '한 번도 생각해 본 적이 없네.'],
      ]),
      { id: 'sun', sky: true, x: 960, y: 318, par: 0.08, r: 96, zone: [1300, 1900],
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
          g.give('lantern');
          g.flag('sunDone');
          G.sparkle(d.x + 18, d.y - 40, [255, 230, 160], 22, 70);
          await g.talk([
            ['narr', '지는 해의 조각 하나가 등불 안에 내려앉았다.'],
            ['day', '이거면 어둠 속에서도 길을 밝힐 수 있어.'],
            ['day', '내려가자. 빛이 왜 사라졌는지, 나이트가 무슨 짓을 한 건지 알아야 해.'],
          ]);
          g.toast('구름을 끌어올려 내려가는 길을 이으세요. 반짝이는 것은 눌러서 살펴볼 수 있어요.', 6500);
        } },
    ],
    triggers: [
      { x: 1440, layers: ['c3'], run: async (g) => {
        const G = g.G;
        g.toastOff();
        await g.walk(G.day, 'c3', 1470);
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
        await Promise.all([g.tween(G, 'farLights', 0, 2.4), g.tod(1.75, 2.8)]);
        await g.talk([
          ['day', '어…?'],
          ['day', '불빛이… 인간들의 불빛이, 한꺼번에 꺼졌어.'],
          ['narr', '화롯불도, 등대도, 도시의 가로등도. 인간이 만든 빛이 모두 사라졌다.'],
          ['day', '나이트. 네가 한 거야?'],
        ]);
        g.flag('sunReady');
        g.toast('지는 해를 눌러, 남은 빛을 등불에 담으세요.', 9000);
      } },
      { x: 2880, layers: ['c4'], run: async (g) => {
        await g.talk([
          ['day', '이 아래가 인간의 세계.'],
          ['day', '기다려, 나이트. 빛은 내가 되찾을 거야.'],
        ]);
        await g.fade(true, 1300);
        g.next();
      } },
    ],
    intro: async (g) => {
      const G = g.G;
      await g.wait(2.6);
      await g.talk([
        ['narr', '하늘에는 쌍둥이 자매가 산다.\n낮을 돌보는 언니 데이, 밤을 돌보는 동생 나이트.'],
        ['narr', '둘이 만나는 것은 하루에 두 번, 노을과 새벽뿐.\n"낮은 데이의 것, 밤은 나이트의 것." 오래된 약속이었다.'],
        ['day', '곧 노을이야. 나이트가 기다리겠다.'],
      ]);
      g.toast('가고 싶은 곳을 눌러 걸어가세요.', 7000);
      await g.until(() => G.day.x > 480);
      g.toast('뒤쪽 구름을 아래로 끌어내려, 발밑의 구름과 만나게 해 보세요.', 12000);
      await g.until(() => G.day.layer.id === 'c2');
      g.toast('이번엔 오른쪽 구름을 끌어올려 보세요. 발밑의 땅은 움직이지 않으니, 한 걸음 물러서서.', 12000);
      await g.until(() => G.day.layer.id === 'c3');
      g.toastOff();
    },
  };

  /* ═════════ 1장 — 산골 마을: 꺼진 화롯불 ═════════ */
  const BELL_X = 2400, STAND_X = 2296, WALL_X = 2566;

  L.ch1 = {
    id: 'ch1', title: '1장 · 산골 마을', sub: '꺼진 화롯불',
    width: 4400, theme: 'village',
    tod: [[0, 0], [900, 0.15], [1500, 1], [1750, 2], [3700, 2], [4050, 3]],
    sky: {},
    backdrop: [
      { kind: 'mountains', par: 0.12, base: 330, amp: 150, freq: 0.0024, fade: 0.7, seed: 31 },
      { kind: 'mountains', par: 0.22, base: 380, amp: 90, freq: 0.004, fade: 0.4, seed: 47 },
    ],
    layers: [
      { id: 'v_far', walk: false, tone: 0.05, pts: H.band(-200, 4700, 300, 16, 101) },
      { id: 'v_c', tone: 0.3, pts: H.band(-200, 4700, 385, 7, 102),
        knobs: [{ c: BELL_X, w: 260, lo: -40, hi: 104 }] },
      { id: 'v_b', tone: 0.58, pts: H.band(-200, 4700, 472, 7, 103),
        knobs: [{ c: 560, w: 250, lo: 0, hi: 116 }, { c: 1900, w: 230, lo: 0, hi: 116 }] },
      { id: 'v_a', tone: 0.84, pts: H.band(-200, 4700, 562, 7, 104),
        knobs: [{ c: 1130, w: 240, lo: -116, hi: 0 }, { c: 2880, w: 240, lo: -116, hi: 0 }] },
      { id: 'v_f', walk: false, tone: 1, pts: H.band(-200, 4700, 668, 10, 105) },
    ],
    blocks: [
      { layer: 'v_a', x0: 770, x1: 850, prop: 'rocks' },
      { layer: 'v_b', x0: 1290, x1: 1370, prop: 'bramble' },
      { layer: 'v_a', x0: 2440, x1: 2530, prop: 'rocks' },
      { layer: 'v_b', x0: 3060, x1: 3140, prop: 'bramble' },
    ],
    props: [
      { type: 'pine', layer: 'v_far', x: 180, s: 0.8 }, { type: 'pine', layer: 'v_far', x: 250, s: 1 }, { type: 'pine', layer: 'v_far', x: 980, s: 0.9 },
      { type: 'pine', layer: 'v_far', x: 1700, s: 1 }, { type: 'pine', layer: 'v_far', x: 1770, s: 0.8 }, { type: 'pine', layer: 'v_far', x: 2900, s: 1 },
      { type: 'pine', layer: 'v_far', x: 3500, s: 0.9 }, { type: 'pine', layer: 'v_far', x: 3570, s: 1.1 },
      { type: 'tree', layer: 'v_c', x: 320, seed: 3 }, { type: 'pine', layer: 'v_c', x: 900, s: 1.1 }, { type: 'tree', layer: 'v_c', x: 1500, seed: 8, autumn: true },
      { type: 'tree', layer: 'v_c', x: 3300, seed: 5 }, { type: 'pine', layer: 'v_c', x: 3800, s: 1.2 },
      { type: 'tree', layer: 'v_b', x: 150, seed: 11, autumn: true }, { type: 'fence', layer: 'v_b', x: 860, n: 6 }, { type: 'pine', layer: 'v_b', x: 1560, s: 1 },
      { type: 'house', layer: 'v_b', x: 1680, lit: 'hearthHome' }, { type: 'house', layer: 'v_b', x: 2780, roof: '#8f6f88', lit: 'hearthHome' }, { type: 'tree', layer: 'v_b', x: 3400, seed: 4 },
      { type: 'sign', layer: 'v_a', x: 260 }, { type: 'tree', layer: 'v_a', x: 420, seed: 21 }, { type: 'woodpile', layer: 'v_a', x: 1420 },
      { type: 'house', layer: 'v_a', x: 1520, lit: 'hearthHome' }, { type: 'lamp', layer: 'v_a', x: 1620, lit: 'hearthHome' },
      { type: 'house', layer: 'v_a', x: 1730, roof: '#9a7a52', w: 54, lit: 'hearthHome' }, { type: 'lamp', layer: 'v_a', x: 2030, lit: 'hearthHome' },
      { type: 'house', layer: 'v_a', x: 2180, roof: '#8f6f88', lit: 'hearthHome' }, { type: 'fence', layer: 'v_a', x: 2250, n: 7 },
      { type: 'house', layer: 'v_a', x: 2650, w: 52, lit: 'hearthHome' }, { type: 'lamp', layer: 'v_a', x: 2740, lit: 'hearthHome' },
      { type: 'hearth', layer: 'v_a', x: 3250, lit: 'hearthHome' }, { type: 'house', layer: 'v_a', x: 3420, roof: '#9a7a52', lit: 'hearthHome' },
      { type: 'woodpile', layer: 'v_a', x: 3330 }, { type: 'lamp', layer: 'v_a', x: 3560, lit: 'hearthHome' },
      { type: 'lonetree', layer: 'v_a', x: 4150, s: 0.9 },
      { type: 'bell', layer: 'v_c', x: BELL_X }, { type: 'stand', layer: 'v_b', x: STAND_X },
    ],
    start: { layer: 'v_a', x: 140 },
    hari: false,
    things: [
      { id: 's1', kind: 'soot', layer: 'v_a', x: 1880, rad: 34, visible: false, gone: true },
      { id: 's2', kind: 'soot', layer: 'v_b', x: 2075, rad: 36, visible: false, gone: true },
      { id: 's3', kind: 'soot', layer: 'v_b', x: 2235, rad: 32, visible: false, gone: true },
      { id: 'wall', kind: 'soot', layer: 'v_b', x: WALL_X, rad: 54, sturdy: true, visible: false, gone: true },
      { id: 'harinpc', kind: 'npc', who: 'hari', layer: 'v_b', x: 2150, dir: -1, shiver: true, pole: true, visible: false },
      { id: 'hearth', kind: 'spot', layer: 'v_a', x: 3250, standX: 3186, dy: 34, r: 64, touch: 30, if: (G) => !G.flags.hearthDone,
        tap: async (g) => {
          const G = g.G;
          const sp = G.addThing({ id: 'hsp', kind: 'spirit', spirit: 'hearth', layer: 'v_a', x: 3250, dy: 14, tired: 0.9, alpha: 0, scale: 0.9 });
          g.sfx('chime');
          await Promise.all([g.tween(sp, 'alpha', 1, 1.2), g.tween(sp, 'dy', 40, 1.2)]);
          await g.talk([
            ['narr', '식은 재가 들썩이더니, 작은 불꽃이 눈을 떴다.'],
            ['hearth', '…누구야. 다시 타라고 부르러 온 거야?'],
            ['day', '빛 정령이구나. 나이트한테 붙잡혀 간 게 아니었어?'],
            ['hearth', '붙잡혀? 아니야. 나는 숨은 거야.'],
            ['hearth', '겨울 내내 밤새 타느라 너무 지쳤어.\n한 번도, 단 한 번도 꺼져 본 적이 없어.'],
            ['hari', '그치만… 화로가 없으면 마을 사람들이 추운걸.'],
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
            g.flag('hearthHome');
            sp.tired = 0.3;
            g.sfx('on');
            await g.tween(sp, 'dy', 16, 0.9);
            sp.visible = false;
            await g.talk([
              ['narr', '화로에 불이 돌아왔다. 창마다 하나둘, 따스한 빛이 번진다.'],
              ['hari', '와… 따뜻해. 다들 좋아하겠다.'],
            ]);
          } else {
            if (r.v !== 'self') await g.say('hearth', '정말? …고마워. 그 말이, 불보다 따뜻하네.');
            g.sfx('star');
            await Promise.all([g.tween(sp, 'dy', 520, 3.2), g.tween(sp, 'alpha', 0, 3.2)]);
            sp.visible = false;
            await g.talk([
              ['narr', '불꽃은 밤하늘로 천천히 떠올라, 어둠 속에 누웠다.'],
              ['hari', '…추운 건, 껴입으면 되지 뭐.'],
            ]);
          }
          g.flag('hearthDone');
          await g.say('narr', '빛 정령과 이야기할 수 있게 되었다.');
          g.toast('오른쪽 언덕 끝으로 가 보세요. 밤이 물러가고 있어요.', 6000);
        } },
      H.clue({ id: 'song', run2: true, layer: 'v_a', x: 3560, dy: 62 }, 'song', [
        ['hari', '어? 이 등 기둥, 고리가 세 개네. 하나는 아침에 끄는 등, 하나는 저녁에 켜는 등…'],
        ['hari', '점등 노래에도 그런 구절이 있었어. "낮과 밤 사이, 셋째 등은 누가 켜나."'],
        ['day', '…셋째?'],
      ]),
    ],
    triggers: [
      { x: 650, layers: ['v_a'], run: async (g) => {
        await g.say('day', '돌담이 무너져 있네. 저 뒤쪽 언덕으로 돌아가야겠어.');
        g.toast('뒤쪽 언덕을 끌어내려 길을 이으세요.', 6000);
      } },
      { x: 1210, layers: ['v_b'], run: async (g) => {
        await g.say('day', '이번엔 가시덤불. 아래쪽 길을 끌어올리면 되겠다.');
      } },
      // 밤이 온다
      { x: 1640, run: async (g) => {
        const G = g.G;
        await g.tod(2, 3);
        g.sfx('dark');
        await g.talk([
          ['narr', '해가 넘어가자, 마을은 그대로 어둠에 잠겼다.'],
          ['narr', '부싯돌을 쳐도 불이 붙지 않는다. 등잔도, 화로도 켜지지 않는다.'],
          ['day', '밤이 되면 불이 붙지 않는구나. …내 등불만 빼고.'],
        ]);
        for (const id of ['s1', 's2', 's3', 'wall']) {
          const s = G.thing(id);
          s.gone = false; s.visible = true; s.awake = 0;
          g.tween(s, 'awake', 1, 1.6);
        }
        G.thing('harinpc').visible = true;
        G.refreshBlocks();
        g.todFree();
        await g.wait(1.2);
        await g.talk([
          ['narr', '어둠 속에서 무언가가 뭉쳐 든다.\n사람들의 두려움이 엉겨 붙은, 그을음.'],
          ['day', '어둠이 무서운 게 아니야. 무서워하는 마음이 저렇게 되는 거지.'],
        ]);
        g.toast('그을음에 등불을 가까이 가져가면 흩어집니다.', 6000);
      } },
      // 하리를 만난다
      { x0: 2100, x1: 2210, layers: ['v_b'], run: async (g) => {
        const G = g.G, npc = G.thing('harinpc');
        g.toastOff();
        for (const id of ['s2', 's3']) G.disperse(G.thing(id));
        await g.walk(G.day, 'v_b', 2108);
        g.face(G.day, 1);
        await g.wait(0.7);
        npc.shiver = false;
        await g.talk([
          ['hari', '오, 오지 마…! …어? 빛?'],
          ['day', '괜찮아. 이건 꺼지지 않는 불이야.'],
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
        npc.visible = false;
        g.S.hari = true;
        G.hari = G.addAgent({ id: 'hari', kind: 'hari', layer: 'v_b', x: npc.x, follow: G.day, pole: true });
        G.hari.ti = G.day.trail.length;
        g.sfx('join');
        await g.say('narr', '하리가 함께 걷기 시작했다.');
      } },
      // 종과 짙은 그을음
      { x: 2240, layers: ['v_b'], if: (G) => !!G.hari, run: async (g) => {
        await g.talk([
          ['hari', '저건 너무 짙어. 등불 하나로는 안 될 거야.'],
          ['hari', '저기 뒷언덕에 옛날 종이 있어. 할아버지가 그랬어.\n저 종이 반짝이면 온 골짜기가 환했대.'],
          ['day', '빛을 종에 비춰서, 저쪽으로 되쏘면…'],
        ]);
        g.toast('돌 받침에 서서, 종이 달린 언덕을 위아래로 끌어 빛줄기를 그을음에 맞추세요.', 12000);
      } },
      // 황혼 타임 #1
      { x: 3950, layers: ['v_a'], if: (G) => G.flags.hearthDone, run: async (g) => {
        const G = g.G;
        g.toastOff();
        await g.walk(G.day, 'v_a', 3990);
        g.face(G.day, 1);
        await g.cam(4130, 2);
        await H.summonNight(g, 'v_c', 4290, 1);
        await g.talk([
          ['narr', '밤이 물러가는 짧은 틈. 먼 능선에 누군가 서 있다.'],
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
        await g.tween(G.night, 'alpha', 0, 2);
        await g.talk([
          ['narr', '해가 떠오르자, 나이트의 모습은 능선 너머로 스러졌다.'],
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
    /* 종에 되비친 빛 */
    update: (g, dt) => {
      const G = g.G, ter = G.terrain, wall = G.thing('wall');
      const beam = (G.beam = G.beam || { on: 0, hit: 0 });
      const d = G.day;
      const ready = wall && !wall.gone && !wall.fading && wall.visible && G.lantern.on && d.layer.id === 'v_b' && Math.abs(d.x - STAND_X) < 40 && d.moving < 0.3;
      beam.on = U.approach(beam.on, ready ? 1 : 0, 6, dt);
      if (!ready) { beam.hit = 0; return; }
      // 빛줄기는 종 높이에서 수평으로 뻗는다. 그을음 덩어리에 닿아야 한다.
      const by = ter.yAt('v_c', BELL_X) - 64, ground = ter.yAt('v_b', WALL_X), wy = ground - wall.rad * 0.85;
      beam.by = by; beam.wy = wy;
      beam.aligned = by > ground - wall.rad * 1.6 && by < ground - 12;
      if (beam.aligned && !G.pointer) {
        beam.hit += dt;
        if (beam.hit > 0.9 && !G.busy) {
          G.disperse(wall);
          g.sfx('bell');
          G.sparkle(WALL_X, wy, [255, 230, 160], 40, 140);
          G.run(async (g2) => {
            g2.toastOff();
            await g2.wait(1.4);
            await g2.talk([
              ['hari', '됐다! 길이 열렸어!'],
              ['hari', '♪ 불은 하늘에서 빌려온 것, 해 지면 켜고 해 뜨면 갚지…'],
              ['day', '그 노래는 뭐야?'],
              ['hari', '점등 노래. 할아버지가 등을 켤 때마다 불렀어. 무슨 뜻인지는 나도 몰라.'],
            ]);
            g2.toast('화로는 마을 아래쪽 길 끝에 있어요.', 5000);
          });
        }
      } else beam.hit = 0;
    },
    drawOver: (ctx, G, env, camX) => {
      const beam = G.beam;
      if (!beam || beam.on < 0.02 || !G.lanternPos || beam.by === undefined) return;
      const lx = G.lanternPos.x - camX, ly = G.lanternPos.y, bx = BELL_X - camX, by = beam.by;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineCap = 'round';
      const a = beam.on * (0.5 + 0.1 * Math.sin(G.time * 8));
      for (const [w, al] of [[10, 0.12], [4, 0.3], [1.5, 0.8]]) {
        ctx.strokeStyle = `rgba(255,232,170,${al * a})`; ctx.lineWidth = w;
        ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(bx, by);
        ctx.lineTo(bx + (beam.aligned ? WALL_X - BELL_X : 330), by); ctx.stroke();
      }
      ctx.restore();
      DN.Render.glows.push({ x: bx * DN.Render.scale, y: by * DN.Render.scale, r: 46 * DN.Render.scale, rgb: [255, 226, 150], a: 0.6 * beam.on });
    },
  };
})(typeof globalThis !== 'undefined' ? globalThis : window);
