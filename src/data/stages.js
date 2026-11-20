// 원정 스테이지 정의
// enemy: [유닛, 열(0~5), 줄(0=전열, 2=후열), 옵션{n, hold, holdFor, flank:'L'|'R', lvl}]
export const CHAPTERS = [
  { name: '첫째 고개 · 솔숲길', theme: 'pass', sub: '도깨비들이 넘어오기 시작한 산길' },
  { name: '둘째 고개 · 당산 숲', theme: 'grove', sub: '장승이 걷고 고목이 깨어난 숲' },
  { name: '셋째 고개 · 저승길', theme: 'dusk', sub: '해가 지면 망령이 걷는 길' },
];

export const MAPS = {
  meadow: { obstacles: [{ kind: 'rock', x: 138, y: 652, r: 22, v: 1 }, { kind: 'rock', x: 592, y: 606, r: 20, v: 2 }] },
  ruins: { mosaic: [360, 640, 118], obstacles: [{ kind: 'wall', x: 112, y: 628, w: 156, h: 22, v: 1, moss: true }, { kind: 'wall', x: 452, y: 628, w: 156, h: 22, v: 2, moss: true }, { kind: 'pillar', x: 292, y: 560, r: 14, v: 1 }, { kind: 'pillar', x: 428, y: 560, r: 14, v: 2 }, { kind: 'pillar', x: 292, y: 722, r: 14, v: 3 }, { kind: 'pillar', x: 428, y: 722, r: 14, v: 4 }] },
  pillars: { obstacles: [{ kind: 'pillar', x: 196, y: 566, r: 15, v: 1 }, { kind: 'pillar', x: 524, y: 566, r: 15, v: 2 }, { kind: 'rock', x: 360, y: 644, r: 24, v: 3 }, { kind: 'pillar', x: 196, y: 726, r: 15, v: 3 }, { kind: 'pillar', x: 524, y: 726, r: 15, v: 4 }] },
  arena: { mosaic: [360, 640, 150], obstacles: [{ kind: 'pillar', x: 150, y: 548, r: 15, v: 1 }, { kind: 'pillar', x: 570, y: 548, r: 15, v: 2 }, { kind: 'pillar', x: 104, y: 648, r: 15, v: 3 }, { kind: 'pillar', x: 616, y: 648, r: 15, v: 4 }, { kind: 'pillar', x: 150, y: 752, r: 15, v: 5 }, { kind: 'pillar', x: 570, y: 752, r: 15, v: 6 }] },
  forest: { obstacles: [{ kind: 'tree', x: 132, y: 566, r: 16, v: 1 }, { kind: 'tree', x: 176, y: 622, r: 16, v: 2 }, { kind: 'tree', x: 120, y: 676, r: 16, v: 3 }, { kind: 'tree', x: 594, y: 650, r: 16, v: 4 }, { kind: 'tree', x: 548, y: 708, r: 16, v: 5 }, { kind: 'tree', x: 604, y: 590, r: 16, v: 6 }, { kind: 'rock', x: 360, y: 650, r: 22, v: 4 }] },
  river: { river: { y: 612, h: 58, bridges: [{ x: 126, w: 112 }, { x: 482, w: 112 }], fords: [{ x: 318, w: 84 }] }, obstacles: [] },
  grove: { mosaic: [360, 640, 132], obstacles: [{ kind: 'tree', x: 128, y: 548, r: 16, v: 1 }, { kind: 'tree', x: 592, y: 548, r: 16, v: 2 }, { kind: 'tree', x: 96, y: 706, r: 16, v: 3 }, { kind: 'tree', x: 624, y: 706, r: 16, v: 4 }, { kind: 'rock', x: 226, y: 640, r: 16, v: 5 }, { kind: 'rock', x: 494, y: 640, r: 16, v: 6 }] },
  graveyard: { obstacles: [{ kind: 'barricade', x: 140, y: 640, w: 96, h: 14, v: 1 }, { kind: 'barricade', x: 484, y: 640, w: 96, h: 14, v: 2 }, { kind: 'rock', x: 360, y: 582, r: 20, v: 7 }, { kind: 'pillar', x: 252, y: 728, r: 14, v: 1 }, { kind: 'pillar', x: 468, y: 728, r: 14, v: 2 }] },
  fort: { obstacles: [{ kind: 'wall', x: 98, y: 478, w: 150, h: 22, v: 3 }, { kind: 'wall', x: 472, y: 478, w: 150, h: 22, v: 4 }, { kind: 'barricade', x: 306, y: 612, w: 108, h: 14, v: 3 }, { kind: 'rock', x: 150, y: 690, r: 18, v: 8 }, { kind: 'rock', x: 570, y: 690, r: 18, v: 9 }] },
  moat: { river: { y: 604, h: 56, bridges: [{ x: 300, w: 120 }], fords: [{ x: 84, w: 86 }, { x: 550, w: 86 }] }, obstacles: [{ kind: 'pillar', x: 270, y: 540, r: 14, v: 1 }, { kind: 'pillar', x: 450, y: 540, r: 14, v: 2 }] },
  throne: { mosaic: [360, 640, 160], obstacles: [{ kind: 'pillar', x: 140, y: 540, r: 15, v: 1 }, { kind: 'pillar', x: 580, y: 540, r: 15, v: 2 }, { kind: 'pillar', x: 140, y: 760, r: 15, v: 3 }, { kind: 'pillar', x: 580, y: 760, r: 15, v: 4 }] },
};

export const STAGES = [
  { id: '1-1', ch: 0, name: '고갯마루의 불청객', enemyName: '도깨비 떼', map: 'meadow', lvl: 1, time: 110, starDeaths: 4, starTime: 45,
    enemy: [['goblin', 1, 0], ['goblin', 4, 0], ['orc', 2.5, 1, { n: 3 }]], intro: ['goblin', 'orc'],
    tip: '아래 패를 끌어 부대를 배치하세요. 싸움이 시작되면 부대를 끌어 이동시키고, 요괴 위에 놓아 집중 공격을 명령할 수 있습니다.' },
  { id: '1-2', ch: 0, name: '솥뚜껑 방벽', enemyName: '솥뚜껑 패거리', map: 'ruins', lvl: 1, time: 110, starDeaths: 5, starTime: 55,
    enemy: [['rshield', 2, 0, { n: 3 }], ['rshield', 3, 0, { n: 3 }], ['garcher', 1, 1, { n: 4 }], ['garcher', 4, 1, { n: 4 }], ['goblin', 2.5, 2, { n: 6 }]], intro: ['rshield', 'garcher'],
    tip: '솥뚜껑 도깨비는 정면 화살을 막습니다. 부대를 옆이나 뒤로 돌려 배후를 치면 피해 +50%!' },
  { id: '1-3', ch: 0, name: '여우 울음', enemyName: '불여우 무리', map: 'pillars', lvl: 1, time: 110, starDeaths: 6, starTime: 55,
    enemy: [['orc', 1, 0], ['orc', 4, 0], ['goblin', 2.5, 0], ['garcher', 2.5, 1], ['rassassin', 1, 2, { n: 2 }], ['rassassin', 4, 2, { n: 2 }]], intro: ['rassassin'],
    tip: '불여우가 후방으로 도약합니다. 배치 중 부대를 탭해 [대기]로 바꾸면 제자리를 지킵니다.' },
  { id: '1-4', ch: 0, boss: true, name: '두억시니', enemyName: '도깨비 두목 두억시니', map: 'arena', lvl: 1, time: 130, starDeaths: 8, starTime: 75,
    enemy: [['warchief', 2.5, 1], ['orc', 1, 0], ['orc', 4, 0], ['goblin', 2.5, 0, { n: 6 }], ['garcher', 0.5, 2, { n: 4 }], ['garcher', 4.5, 2, { n: 4 }]], intro: ['warchief'],
    tip: '붉은 원이 보이면 부대를 드래그해 빼세요. 체력이 절반이 되면 무리 전체가 광분합니다.' },

  { id: '2-1', ch: 1, name: '걸어오는 장승', enemyName: '장승 행렬', map: 'forest', lvl: 2, time: 120, starDeaths: 6, starTime: 60,
    enemy: [['treant', 2, 0], ['treant', 3.5, 0], ['goblin', 0.5, 0], ['goblin', 5, 0], ['orc', 2.75, 1], ['garcher', 1.5, 2], ['garcher', 4, 2]], intro: ['treant'],
    tip: '장승은 느리고 단단합니다. 창병은 거대 적에게 1.5배 피해를 줍니다.' },
  { id: '2-2', ch: 1, name: '푸른 불빛', enemyName: '도깨비불 떼', map: 'river', lvl: 2, time: 120, starDeaths: 7, starTime: 60,
    enemy: [['bomber', 1.5, 0], ['bomber', 3.5, 0], ['orc', 2.5, 0, { n: 5 }], ['rshield', 0.5, 1, { n: 3 }], ['rshield', 4.5, 1, { n: 3 }], ['garcher', 2, 2], ['garcher', 3.5, 2]], intro: ['bomber'],
    tip: '도깨비불은 닿기 전에 잡으면 그 자리에서 터져 적도 휘말립니다. 다리와 징검다리가 길목입니다.' },
  { id: '2-3', ch: 1, name: '멧돼지 몰이', enemyName: '멧돼지 몰이패', map: 'forest', lvl: 2, time: 120, starDeaths: 7, starTime: 65,
    enemy: [['wolf', 0, 1, { flank: 'L', n: 3 }], ['wolf', 5, 1, { flank: 'R', n: 2 }], ['orc', 2, 0], ['orc', 3.5, 0], ['treant', 2.75, 1, { n: 1 }], ['shaman', 2.75, 2], ['garcher', 1, 2, { n: 4 }], ['garcher', 4.5, 2, { n: 4 }]], intro: ['wolf', 'shaman'],
    tip: '멧돼지가 양 측면으로 우회합니다. 창병을 후방에 [대기]시키고, 북 도깨비를 먼저 노리세요.' },
  { id: '2-4', ch: 1, boss: true, name: '당산 목신', enemyName: '천년 묵은 당산 목신', map: 'grove', lvl: 3, time: 140, starDeaths: 9, starTime: 85,
    enemy: [['elder', 2.5, 1], ['treant', 1, 0, { n: 1 }], ['treant', 4, 0, { n: 1 }], ['shaman', 2.5, 2, { n: 2 }], ['garcher', 0.5, 2, { n: 4 }], ['garcher', 4.5, 2, { n: 4 }], ['goblin', 2.5, 0, { n: 6 }]], intro: ['elder'],
    tip: '초록 원(뿌리 감옥)을 피하세요. 아기 장승이 쌓이기 전에 목신에게 화력을 집중!' },

  { id: '3-1', ch: 2, name: '되살아나는 자들', enemyName: '망령의 선봉', map: 'graveyard', lvl: 3, time: 125, starDeaths: 8, starTime: 70,
    enemy: [['skel', 0.5, 0], ['skel', 2, 0], ['skel', 3.5, 0], ['skel', 5, 0], ['rshield', 2.75, 1, { n: 3 }], ['skelarcher', 1, 1], ['skelarcher', 4.5, 1], ['shaman', 2.75, 2], ['rassassin', 1, 2, { n: 2 }], ['rassassin', 4.5, 2, { n: 2 }]], intro: ['skel', 'skelarcher'],
    tip: '망령은 한 번 되살아납니다. 정화 굿 범위 안에서 쓰러진 망령은 되살아나지 못합니다.' },
  { id: '3-2', ch: 2, name: '바위 세례', enemyName: '고갯길 수비대', map: 'fort', lvl: 3, time: 130, starDeaths: 8, starTime: 75,
    enemy: [['catapult', 1, 2], ['catapult', 4, 2], ['rshield', 1.75, 0, { n: 3 }], ['rshield', 3.25, 0, { n: 3 }], ['skelarcher', 0.5, 1, { hold: true, holdFor: 14, n: 3 }], ['skelarcher', 4.5, 1, { hold: true, holdFor: 14, n: 3 }], ['bomber', 2.5, 1, { n: 3 }], ['skel', 2.5, 0, { n: 4 }]], intro: ['catapult'],
    tip: '붉은 원에 바위가 떨어집니다. 부대를 움직여 피하고, 기마 무사를 보내 투석기를 부수세요.' },
  { id: '3-3', ch: 2, name: '저승사자의 명부', enemyName: '저승사자 일행', map: 'moat', lvl: 4, time: 135, starDeaths: 9, starTime: 80,
    enemy: [['necro', 1.75, 2], ['necro', 3.25, 2], ['skel', 1, 0], ['skel', 2.5, 0], ['skel', 4, 0], ['treant', 2.5, 1, { n: 1 }], ['orc', 0, 1, { n: 3 }], ['orc', 5, 1, { n: 3 }], ['wolf', 0, 2, { flank: 'L', wait: 6, n: 2 }], ['shaman', 2.5, 2, { n: 1 }], ['skelarcher', 1, 1, { n: 3 }], ['skelarcher', 4, 1, { n: 3 }]], intro: ['necro'],
    tip: '저승사자는 쓰러진 자를 망령으로 일으킵니다. 살려두면 끝이 없으니 가장 먼저 잡으세요.' },
  { id: '3-4', ch: 2, boss: true, name: '어둑시니', enemyName: '어둠의 주인 어둑시니', map: 'throne', lvl: 4, time: 150, starDeaths: 10, starTime: 95,
    enemy: [['skelking', 2.5, 1], ['skel', 1, 0, { n: 4 }], ['skel', 2.5, 0, { n: 4 }], ['skel', 4, 0, { n: 4 }], ['rshield', 0, 0, { n: 2 }], ['skelarcher', 1, 2, { n: 3 }], ['skelarcher', 4, 2, { n: 3 }], ['necro', 2.5, 2], ['rassassin', 5, 2, { n: 2 }]], intro: ['skelking'],
    tip: '보라 원(어둠의 낙인)을 피하고, 후방에 불려 나오는 망령에 대비해 예비대를 남겨두세요.' },
];
export function foodCap(stageIdx) { return 8 + stageIdx; }
