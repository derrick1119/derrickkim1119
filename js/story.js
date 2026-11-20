/* 데이 & 나이트 — 이야기의 뼈대: 세 축, 열한 개의 결말 */
(function (root) {
  'use strict';
  const DN = (root.DN = root.DN || {});
  const Story = (DN.Story = {});

  DN.CHAPTERS = ['prologue', 'ch1', 'ch2', 'ch3', 'ch4', 'ch5', 'finale'];

  /* 축 A — 빛의 행방을 정하는 다섯 정령 */
  Story.SPIRITS = [
    { k: 'hearth', name: '화롯불', col: '#ffb070', wish: 'night' },
    { k: 'lighthouse', name: '등대', col: '#ffe9a6', wish: 'night' },
    { k: 'neon', name: '네온', col: '#ff9ade', wish: 'night' },
    { k: 'street', name: '가로등', col: '#ffc680', wish: 'night' },
    { k: 'hospital', name: '병원 야간등', col: '#a9ebc8', wish: 'human' },
  ];
  /* 황혼의 단서. run2 = 두 번째 여정부터 보이는 것 */
  Story.CLUES = ['chairs', 'song', 'hour', 'clock', 'mural'];
  Story.BOND_MAX = 5;

  /* 문서에서 "아직 정하지 않았다"고 한 부분:
   * 최종장에서 "함께 있고 싶어"를 고르면 다른 조건보다 먼저 '영원한 노을'로 갈 것인가.
   * true  = 마지막 선택이 (히든을 빼고) 모든 것에 앞선다
   * false = 다른 결말 조건이 하나도 맞지 않을 때만 '영원한 노을'이 된다 */
  Story.WISH_FIRST = true;

  Story.axes = function (S) {
    let human = 0, n = 0;
    for (const sp of Story.SPIRITS) { if (S.A[sp.k]) { n++; if (S.A[sp.k] === 'human') human++; } }
    const A = n === 0 ? 'balance' : human >= 4 ? 'human' : human <= 1 ? 'night' : 'balance';
    const B = S.B >= 8 ? 'trust' : S.B <= -3 ? 'hostile' : 'understand';
    const C = S.C.hari && S.C.night ? 'both' : S.C.night ? 'night' : S.C.hari ? 'hari' : 'none';
    return {
      A, B, C, human,
      bondMax: S.bond >= Story.BOND_MAX,
      allClues: Story.CLUES.every((c) => S.clues.includes(c)),
      together: S.wish === 'together',
    };
  };

  DN.ENDINGS = [
    { id: 'dusk', name: '황혼', kind: '히든',
      desc: '잊혀 있던 셋째가 깨어난다. 처음으로 셋이 함께 하늘에 선다.',
      hint: '의자가 세 개인 까닭을 끝까지 따라가고, 숨긴 것을 털어놓는다면.',
      when: (x) => x.allClues && x.C !== 'none' },
    { id: 'dawn', name: '새벽', kind: '트루',
      desc: '인간은 필요한 빛만 켜고, 쌍둥이는 노을과 새벽을 함께 보낸다.',
      hint: '빛을 고르게 나누고, 동생을 믿고, 두 사람 모두에게 진실을 말한다면.',
      when: (x) => x.A === 'balance' && x.B === 'trust' && x.C === 'both' },
    { id: 'starlight', name: '별빛 시대', kind: '해피',
      desc: '인간이 불 대신 별을 읽는 법을 다시 배운다.',
      hint: '빛을 밤에 맡기고, 동생을 믿는다면.',
      when: (x) => x.A === 'night' && x.B === 'trust' },
    { id: 'lamplighter', name: '점등인', kind: '해피',
      desc: '하리가 인간의 대표로 약속에 이름을 적고, 빛을 켜고 끄는 일을 대대로 맡는다.',
      hint: '빛을 고르게 나누고, 하리와 누구보다 가까워진다면.',
      when: (x) => x.A === 'balance' && x.bondMax },
    { id: 'falsedawn', name: '거짓 새벽', kind: '씁쓸함',
      desc: '모든 것이 새벽과 같아 보인다. 다만 나이트는 안다. 언니가 끝까지 말하지 않았다는 것을.',
      hint: '모든 것이 잘 풀렸지만, 한 가지를 끝내 말하지 않는다면.',
      when: (x) => x.A === 'balance' && x.B === 'trust' && x.C === 'none' },
    { id: 'whitenight', name: '백야', kind: '씁쓸함',
      desc: '나이트가 스스로 물러난다. 데이는 매일 혼자 노을을 본다.',
      hint: '동생을 믿으면서도, 빛은 모두 인간에게 돌려준다면.',
      when: (x) => x.A === 'human' && x.B === 'trust' },
    { id: 'swap', name: '자리 바꾸기', kind: '씁쓸함',
      desc: '둘이 자리를 바꾼다. 데이는 밤의 외로움을, 나이트는 사랑받는 느낌을 처음 알게 된다.',
      hint: '아직 다 이해하지는 못해도, 동생에게만은 고백한다면.',
      when: (x) => x.B === 'understand' && (x.C === 'night' || x.C === 'both') },
    { id: 'noon', name: '대낮', kind: '배드',
      desc: '도시는 다시 밝지만 하늘에는 별이 없다. 나이트는 영영 사라진다.',
      hint: '빛을 모두 되찾고, 동생에게 끝내 등을 돌린다면.',
      when: (x) => x.A === 'human' && x.B === 'hostile' },
    { id: 'longnight', name: '긴 밤', kind: '배드',
      desc: '인간 세계에 불 없는 시대가 온다. 데이는 다시 내려오지 못한다.',
      hint: '빛을 모두 밤에 두고도, 동생에게 등을 돌린다면.',
      when: (x) => x.A === 'night' && x.B === 'hostile' },
    { id: 'sunset', name: '영원한 노을', kind: '배드',
      desc: '둘이 해를 멈춘다. 함께이지만, 세상의 시간도 함께 멈춘다.',
      hint: '약속 대신, 그저 함께 있기만을 바란다면.',
      when: (x) => x.B === 'trust' && x.together },
    { id: 'repeat', name: '되풀이', kind: '특수',
      desc: '약속이 또 깨졌다. 노을은 처음으로 돌아간다.',
      hint: '어느 쪽으로도 마음을 정하지 못한다면.',
      when: () => true },
  ];
  // 히든 > 트루 > 해피 > 씁쓸함 > 배드 순. 목록의 순서가 곧 우선순위다.

  Story.decide = function (S) {
    const x = Story.axes(S);
    const by = (id) => DN.ENDINGS.find((e) => e.id === id);
    if (by('dusk').when(x)) return by('dusk');
    if (Story.WISH_FIRST && by('sunset').when(x)) return by('sunset');
    for (const e of DN.ENDINGS) if (e.when(x)) return e;
    return by('repeat');
  };

  /* 결말마다의 마지막 장면: 황혼의 언덕을 다시 비춘다 */
  const EPILOGUE = {
    dusk: {
      tod: 1, stars: 0.5, lights: 0.45, who: ['day', 'night', 'dusk', 'hari'], third: true,
      lines: [
        ['narr', '세 번째 의자에, 누군가 앉아 있었다.'],
        ['dusk', '…오래 잤네. 너희가 나를 다시 떠올릴 때까지.'],
        ['night', '황혼… 언니.'],
        ['dusk', '데이. 네가 맡긴 기억, 이제 돌려줄게. 무거웠지만, 버리지 않았어.'],
        ['day', '고마워. 그리고 미안해. 너를 잊어서, 경계를 흐리게 해서.'],
        ['dusk', '낮과 밤 사이에는 원래 자리가 하나 더 있었어. 누구의 것도 아니어서, 둘이 만날 수 있는 시간.'],
        ['narr', '그날부터 노을은 조금 더 길어졌다. 하늘에는 처음으로, 셋이 나란히 섰다.'],
      ],
    },
    dawn: {
      tod: 3, stars: 0.55, lights: 0.4, who: ['day', 'night', 'hari'],
      lines: [
        ['narr', '새 약속은 짧았다.'],
        ['narr', '낮은 데이의 것, 밤은 나이트의 것. 그리고 그 사이의 빛은, 꼭 필요한 만큼만.'],
        ['hari', '아픈 사람 곁의 불, 길 잃은 배의 불. 그건 켜 둘게요. 나머지는… 별한테 양보할게요.'],
        ['night', '…언니가 말해 줘서, 나도 말할 수 있었어. 무서웠다고.'],
        ['day', '이제 노을에도, 새벽에도 올게. 교대하러가 아니라, 너를 보러.'],
        ['narr', '인간은 필요한 빛만 켠다. 쌍둥이는 하루에 두 번, 같은 의자에 나란히 앉는다.'],
      ],
    },
    starlight: {
      tod: 2, stars: 1, lights: 0.05, who: ['night', 'hari'], dayFar: true,
      lines: [
        ['narr', '빛 정령들은 밤하늘에 남았다. 쉬는 동안, 그들은 조금씩 별을 닮아 갔다.'],
        ['hari', '할아버지가 그랬어요. 옛날 뱃사람들은 별을 보고 길을 찾았다고.'],
        ['night', '가르쳐 줄게. 저건 길잡이별. 저건, 네 할아버지가 좋아하던 별.'],
        ['narr', '인간은 불을 켜는 대신 고개를 드는 법을 다시 배웠다.'],
        ['narr', '밤은 어두워졌고, 그래서 다시 눈부셨다.'],
      ],
    },
    lamplighter: {
      tod: 1, stars: 0.4, lights: 0.4, who: ['day', 'night', 'hari'], hariFront: true,
      lines: [
        ['narr', '약속의 끝에는 이름이 세 개 적혔다. 데이, 나이트, 그리고 하리.'],
        ['hari', '제가 켤게요. 그리고 제가 끌게요. 켤 때마다 밤한테 물어보고요.'],
        ['night', '…인간이 내게 허락을 구하는 건 처음이야.'],
        ['day', '점등인은 원래 그런 일이었을지도 몰라. 빛을 켜는 사람이 아니라, 빛을 빌리는 사람.'],
        ['narr', '하리의 막대는 딸에게, 그 딸의 아들에게 이어졌다. 불은 하늘에서 빌려온 것. 노래는 다시 불렸다.'],
      ],
    },
    falsedawn: {
      tod: 3, stars: 0.5, lights: 0.4, who: ['day', 'night', 'hari'], apart: true,
      lines: [
        ['narr', '새 약속은 짧았다. 낮은 데이의 것, 밤은 나이트의 것. 그 사이의 빛은, 꼭 필요한 만큼만.'],
        ['day', '이제 다 괜찮아질 거야.'],
        ['narr', '인간은 필요한 빛만 켠다. 쌍둥이는 하루에 두 번, 같은 의자에 나란히 앉는다.'],
        ['narr', '모든 것이 잘된 것처럼 보였다.'],
        ['night', '…언니는 끝까지 말 안 하네.'],
      ],
    },
    whitenight: {
      tod: 1, stars: 0, lights: 1, who: ['day'], emptyChair: true,
      lines: [
        ['night', '됐어, 언니. 저 사람들한테는 정말 빛이 필요한가 봐.'],
        ['night', '나는 조금 더 멀리 가 있을게. 빛이 닿지 않는 데까지.'],
        ['day', '나이트, 그런 뜻이 아니었어. 나는—'],
        ['narr', '나이트는 화내지 않았다. 그래서 붙잡을 수 없었다.'],
        ['narr', '밤은 대낮처럼 밝다. 데이는 매일 혼자 노을을 본다. 옆자리는 늘 비어 있다.'],
      ],
    },
    swap: {
      tod: 2, stars: 0.35, lights: 0.4, who: ['day', 'hari'], dayAsNight: true,
      lines: [
        ['night', '말로는 모를 거야. 그러니까… 바꿔 보자, 언니.'],
        ['narr', '데이는 밤을 맡았다. 아무도 올려다보지 않는 하늘에서, 처음으로 별 하나가 꺼지는 것을 지켜보았다.'],
        ['narr', '나이트는 낮을 맡았다. 사람들이 창을 열고 햇살에 인사했다. 나이트는 한참 동안 대답하는 법을 몰랐다.'],
        ['day', '이렇게 조용했구나. 이렇게, 오래.'],
        ['narr', '둘은 아직 서로를 다 알지 못한다. 하지만 이제, 서로의 자리가 어땠는지는 안다.'],
      ],
    },
    noon: {
      tod: 2, stars: 0, lights: 1, who: ['day'], bright: true,
      lines: [
        ['narr', '빛은 모두 제자리로 돌아갔다. 가로등이, 네온이, 창문이 한꺼번에 켜졌다.'],
        ['narr', '사람들은 환호했다. 아무도 하늘을 올려다보지 않았다.'],
        ['day', '나이트. …나이트?'],
        ['narr', '마지막 별이 꺼진 자리에는 아무것도 없었다.'],
        ['narr', '밤은 이제 대낮과 다르지 않다. 노을 언덕에는 의자가 세 개. 앉는 이는 하나뿐이다.'],
      ],
    },
    longnight: {
      tod: 2, stars: 0.8, lights: 0, who: ['hari'], hariAlone: true,
      lines: [
        ['night', '그럼 됐네. 언니는 낮에나 있어. 다시는 내려오지 마.'],
        ['narr', '밤의 문이 닫혔다. 불은 다시 붙지 않았고, 전기는 돌아오지 않았다.'],
        ['narr', '인간들은 해가 지면 문을 걸어 잠갔다. 불 없는 시대가 왔다.'],
        ['hari', '데이 언니… 등불, 제가 갖고 있을게요. 언젠가 돌려드릴 수 있게.'],
        ['narr', '별은 돌아왔다. 올려다볼 사람은 얼마 남지 않았다.'],
      ],
    },
    sunset: {
      tod: 1, stars: 0.12, lights: 0.2, who: ['day', 'night'], frozen: true,
      lines: [
        ['day', '약속 같은 건 필요 없어. 해가 지지 않으면, 헤어지지 않아도 되잖아.'],
        ['night', '…그래. 한 번만, 언니 뜻대로 해 보자.'],
        ['narr', '둘은 손을 맞잡고 해를 붙들었다. 노을은 지지 않았다.'],
        ['narr', '강물이 멈췄다. 새가 하늘에 걸렸다. 하리는 걸음을 내딛다 만 채로 서 있다.'],
        ['narr', '쌍둥이는 함께 있다. 영원히, 같은 일 분 안에.'],
      ],
    },
    repeat: {
      tod: 1.5, stars: 0.05, lights: 0, who: ['day'], fadeAll: true,
      lines: [
        ['narr', '데이는 끝내 마음을 정하지 못했다. 나이트도 그랬다.'],
        ['night', '…이번에도 아니네.'],
        ['day', '이번에도? 나이트, 그게 무슨—'],
        ['narr', '노을이 거꾸로 흘렀다. 의자 세 개, 등불 하나, 꺼진 불빛들.'],
        ['narr', '약속이 또 깨졌다.'],
      ],
    },
  };
  Story.EPILOGUE = EPILOGUE;

  Story.playEnding = async function (g, E, S) {
    const G = g.G, ep = EPILOGUE[E.id];
    await g.fade(true, 1200, E.id === 'noon' || E.id === 'whitenight');
    G.endingId = E.id;
    G.loadEnding(ep);
    await g.wait(0.4);
    await g.fade(false, 1600);
    await g.wait(0.6);
    await g.talk(ep.lines);
    await g.wait(0.5);
  };

  /* 주소창의 ?level= 로 중간 장부터 볼 때 필요한 능력을 채워 준다 */
  Story.sceneChapter = (id) => ({ memory: 4, cavemouth: 4, nightwalk: 5 }[id] || 0);
  Story.debugState = function (S, id) {
    const i = DN.CHAPTERS.includes(id) ? DN.CHAPTERS.indexOf(id) : Story.sceneChapter(id);
    if (i >= 1) S.lantern.has = true;
    if (i >= 2) S.hari = true;
    if (i >= 3) S.lantern.canOff = true;
    if (i >= 4) S.shadowWalk = true;
  };
})(typeof globalThis !== 'undefined' ? globalThis : window);
