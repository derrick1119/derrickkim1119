// 고개(장)와 전장 지형 정의
export const CHAPTERS = [
  { name: '첫째 고개 · 솔숲길', short: '첫째 고개', theme: 'pass', sub: '도깨비들이 넘어오기 시작한 산길' },
  { name: '둘째 고개 · 당산 숲', short: '둘째 고개', theme: 'grove', sub: '장승이 걷고 고목이 깨어난 숲' },
  { name: '셋째 고개 · 저승길', short: '셋째 고개', theme: 'dusk', sub: '해가 지면 망령이 걷는 길' },
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
