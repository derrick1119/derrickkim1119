/**
 * 🎨 M3 도트(오너 11-20 "도트가 괜찮네 도트로 가자"): 32색 팔레트 · 글자 픽셀 맵 스프라이트 · 자동 외곽선 · 처음 한 번 굽기.
 *   한 글자 = 팔레트 한 칸, '.' = 투명. 외곽선(k)은 구울 때 두른다. 그림은 시안(`concepts/pixel/sprites.js`) 그대로.
 *   세상은 가로 130칸(PX = 3 CSS px) 캔버스에 그리고 정수배로 키운다(game.ts drawAll).
 */
export const PX = 3;
/** 32색 — 0~9 느린 시간 청회색 램프 · 빨강(D)은 위험에만 */
export const PAL: Record<string, string> = {
  0: '#0e0f22', 1: '#1a1c3d', 2: '#252a53', 3: '#313c68', 4: '#3f527f', 5: '#556d97', 6: '#7490b4', 7: '#9db5d0', 8: '#cbdbea', 9: '#f1f6f4',
  o: '#f0cf8e', O: '#8f7657', n: '#22235c', N: '#373b93', m: '#5d68d4', p: '#ffdab5', q: '#e6a47c', r: '#ff8f92',
  u: '#0e6c74', t: '#19b6a7', T: '#7cf8dd', w: '#ffffff', y: '#ffd340', Y: '#c98919', H: '#7b4a2c', h: '#c6824b', j: '#f4c486',
  v: '#9a6ae0', V: '#5b3794', G: '#64ba5b', E: '#2f6c43', D: '#ff2d4b', k: '#0e0f22',
};
type Dot = [number, number, string];

/** 글자 맵(+덧칠 맵·점) → 테두리 1칸을 두른 글자 격자 */
function grid(rows: string[], over: string[][] = [], dots: Dot[] = []) {
  const W = Math.max(...rows.map((r) => r.length), ...over.flat().map((r) => r.length)) + 2, H = rows.length + 2;
  const g = Array.from({ length: H }, () => Array<string>(W).fill('.'));
  for (const m of [rows, ...over]) m.forEach((r, y) => [...r].forEach((c, x) => c !== '.' && (g[y + 1][x + 1] = c)));
  for (const [x, y, c] of dots) g[y + 1][x + 1] = c;
  return g.map((r, y) => r.map((c, x) => (c !== '.' ? c : [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => { const v = g[y + dy]?.[x + dx]; return v && v !== '.' && v !== 'k'; }) ? 'k' : '.')));
}
const cache = new Map<string, HTMLCanvasElement>();
/** 처음 부를 때 한 번만 캔버스로 굽는다(매 프레임은 drawImage만) */
export function sprite(key: string, make: () => string[][]): HTMLCanvasElement {
  let c = cache.get(key);
  if (c) return c;
  const g = make();
  c = document.createElement('canvas');
  (c.width = g[0].length), (c.height = g.length);
  const x = c.getContext('2d')!;
  g.forEach((r, j) => r.forEach((ch, i) => ch !== '.' && ((x.fillStyle = PAL[ch]), x.fillRect(i, j, 1, 1))));
  cache.set(key, c);
  return c;
}

// ── 주인공 '초침' (시안 그대로 · 30×24) ──
const HERO = [
  '...........NmmNNNNn...........',
  '.........NmmmmNNNNNnn.........',
  '........NmmmNNYYNNNNnn..nN....',
  '.......nnnnnnYyyYnnnnnnnn.....',
  '.......nnnnnnYwyYnnnnnnnNn....',
  '.......NNNqqqqqqqqqqnnn..nn...',
  '.......NNppppppppppppnn.......',
  '.......Npppkwppppkwpppn.......',
  '.......Npppkkppppkkpppn.......',
  'TT.....Npppkkppppkkpppn.......',
  'utTT...NprrpppppppprrpN.......',
  '..utTT..NNppppqqppppnn........',
  'T...utTT.Nqppppppppqn.........',
  'utT..utTTTTTTTTTTTTTtt........',
  '..utTTttttttttttttttuu........',
  '......uTmmmNNNNNNNNNnnn.......',
  '........mNmNNNNNNNNnnnnp......',
  '........mNNmNNNNNNNnn.........',
  '........ppNNmNNNNNNnn.........',
  '.........nnnmnnnnnnnn.........',
  '.........NNNNNNNNNNnn.........',
  '.........mNNNn..NNNnn.........',
  '........mNNn......NNnn........',
  '.......nnnnn......nnnnn.......',
];
const BLADE: Dot[] = [[24, 15, 'u'], [24, 14, 'u'], [25, 15, 'u'], [25, 14, '8'], [26, 13, 'w'], [27, 12, 'w'], [28, 11, 'w'], [29, 10, 'w'], [27, 11, '8'], [28, 12, '8']];
/** 얼굴 줄 바꾸기: 0 기본 · 1 웃음(이김·싹쓸이) · 2 아야(맞음·짐) */
const FACES: Record<number, Record<number, string>> = {
  1: { 7: '.......NppppppppppppppN.......', 8: '.......Npppkkppppkkpppn.......', 9: 'T......Nppkppkppkppkpn.......', 11: '.utTT...NNpppqSSqpppnn........' },
  2: { 7: '.......Nppkppppppppkppn.......', 9: 'T......Nppkppppppppkppn.......', 11: '.utTT...NNppkqkqkpppnn........' },
};
/** 주인공 스프라이트(발 = 아래 가운데) */
export const heroGrid = (face: number) => grid(HERO.map((r, i) => FACES[face]?.[i]?.replace(/S/g, 'q') ?? r), [], BLADE);
export const hero = (face: number) => sprite('hero' + face, () => heroGrid(face));

// ── 태엽 병정(시안 그대로 · 공통 몸 + 등 태엽 열쇠 + 모자 + 무기) ──
const BODY = [
  '', '', '', '', '', '',
  '....jjjjjjjhh',
  '....jjkwjkwhh',
  '....jjkkjkkhh',
  '....jrjHHHjrh',
  '.....jjjjjhh',
  '....hjjhhhhhH',
  '...hjjhh8hhhHH',
  '...hjhhhhhhhHH',
  '...hjhhh8hhhHH',
  '...11111811111',
  '...HhhhhhhhhHH',
  '.....HH...HH',
  '....111...111',
];
const KEY = ['.............88...77.', '.............8.8.7.6.', '.............8887666.', '...............876...', '................6....', '...............6.....', '..............6......'];
const HAT: Record<string, string[]> = { // 칼 병정 모자는 시안의 빨강 → 보라(빨강은 위험에만 · 🧪 캐릭터 시안 규칙)
  sword: ['.......ww', '.....vVVVVVV', '.....vvvvvVV', '.....vvvvvVV', '.....8888888', '....111111111'],
  archer: ['........G', '.......GGE', '......GGGEE', '.....GGGGGEE', '.....GGGGEEE', '...EEEEEEEEEEE'],
  shield: ['........HH', '......677765', '.....67777665', '.....67777665', '....5666666655', '....111111111'],
  dummy: ['', '.....oooooo', '...ooOOOOOOoo', '..oooooooooooo'], // 연습 인형: 짚 삿갓 · 무기 없음
};
const ARM: Record<string, Dot[]> = {
  sword: [[1, 2, 'j'], [2, 2, 'h'], [1, 3, 'j'], [2, 3, 'h'], [1, 4, 'j'], [2, 4, 'h'], [1, 5, 'j'], [2, 5, 'h'], [1, 6, 'j'], [2, 6, 'h'], [1, 7, 'j'], [2, 7, 'h'], [1, 1, 'j'], [0, 8, 'H'], [1, 8, 'H'], [2, 8, 'H'], [3, 8, 'H'], [1, 9, 'j'], [2, 9, 'h'], [2, 10, 'h'], [2, 11, 'h'], [14, 12, 'H'], [14, 13, 'H']],
  archer: [[1, 8, 'H'], [0, 9, 'H'], [0, 10, 'h'], [0, 11, 'h'], [0, 12, 'h'], [0, 13, 'h'], [0, 14, 'H'], [1, 15, 'H'], [1, 9, '8'], [1, 10, '8'], [1, 11, '8'], [1, 12, '8'], [1, 13, '8'], [1, 14, '8'], [2, 11, 'j'], [2, 12, 'h'], [14, 12, 'H'], [14, 13, 'H']],
  shield: [[14, 12, 'H'], [14, 13, 'H']], // 방패 원판은 게임이 따로 그린다(앞·뒤 판정이 보여야 해서)
  dummy: [],
};
export const SOLDIER = new Set(Object.keys(HAT));
/** 태엽 병정 스프라이트(발 = 아래 가운데) · 얼굴은 왼쪽을 본다 */
export const soldierGrid = (k: string) => grid(BODY, [KEY, HAT[k]], ARM[k]);
export const soldier = (k: string) => sprite('so' + k, () => soldierGrid(k));
