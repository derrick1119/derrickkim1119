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

// ── 배경(M3 S3 · 🧪 🔴1: 대숲 벡터를 줄인 '모자이크' → 32색 도트 · 후광·그라데이션 0) ──
const BAY = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const hs = (n: number) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
/**
 * 판 배경 한 장(lw×lh 도트)을 굽는다. place 0 태엽 마을 골목(돌길) · 1 지붕(기와) · 2 시계탑 광장(타일).
 * hz = 지평선 줄(도트), gb = 땅 끝 줄. '멈춘 시간' 표식 = 시계탑(초침은 청록 — 주인공 이름).
 */
export const pixBg = (lw: number, lh: number, place: number, hz: number, gb: number) => sprite(`bg${lw}x${lh}:${place}`, () => bgGrid(lw, lh, place, hz, gb));
export function bgGrid(lw: number, lh: number, place: number, hz: number, gb: number): string[][] {
  {
    const g = Array.from({ length: lh }, () => Array<string>(lw).fill('0'));
    const put = (x: number, y: number, c: string) => { x |= 0; y |= 0; if (x >= 0 && y >= 0 && x < lw && y < lh) g[y][x] = c; };
    const rect = (x: number, y: number, w: number, h: number, c: string) => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) put(x + i, y + j, c); };
    // 하늘: 0 → 1 → 2 디더링 띠 · 별
    for (let y = 0; y < hz; y++) for (let x = 0; x < lw; x++) { const v = (y / hz) * 2.2; g[y][x] = String(Math.min(2, Math.floor(v) + ((v % 1) * 16 > BAY[(y & 3) * 4 + (x & 3)] ? 1 : 0))); }
    for (let k = 0; k < 26; k++) put(hs(k) * lw, hs(k + 50) * hz * 0.7, k % 5 ? '7' : '9');
    // 달(왼쪽 위 · 초승달)
    const mx = lw * 0.2, my = hz * 0.28, mr = 7;
    for (let y = -mr; y <= mr; y++) for (let x = -mr; x <= mr; x++) if (x * x + y * y <= mr * mr && (x + 3) ** 2 + (y - 2) ** 2 > (mr - 1) ** 2) put(mx + x, my + y, x * x + y * y > (mr - 1) ** 2 ? '8' : '9');
    // 먼 집들(실루엣 + 불 켜진 창)
    const roofC = place === 1 ? '3' : '2';
    for (let k = 0, x = -4; x < lw; k++) {
      const bw = 10 + Math.floor(hs(k + 9) * 9), bh = 8 + Math.floor(hs(k + 19) * (place === 1 ? 8 : 12)), top = hz - bh;
      rect(x, top, bw, bh, roofC);
      for (let j = 0; j < 5; j++) rect(x - 1 + j, top - j, bw + 2 - 2 * j, 1, j ? roofC : '1'); // 지붕 경사
      for (let j = 0; j < 3; j++) if (hs(k * 7 + j) < 0.55) { const wx = x + 2 + Math.floor(hs(k * 3 + j) * (bw - 4)), wy = top + 2 + j * 3; if (wy < hz - 2) (rect(wx, wy, 2, 2, 'o'), put(wx + 1, wy + 1, 'O')); }
      x += bw + 1 + Math.floor(hs(k + 29) * 3);
    }
    // 시계탑(광장은 크게 가운데 · 나머지는 오른쪽 멀리)
    const big = place === 2, tw = big ? 22 : 14, tx = Math.round(big ? lw / 2 - tw / 2 : lw * 0.66), th = big ? hz - 4 : hz * 0.8, ty = hz - th;
    rect(tx, ty, tw, th, '3');
    rect(tx + tw - 3, ty, 3, th, '2'); // 그늘 쪽
    for (let j = 0; j < 8; j++) rect(tx + j, ty - 8 + j, tw - 2 * j, 1, j ? '2' : '1'); // 뾰족 지붕
    put(tx + tw / 2, ty - 9, 'y');
    const cx = tx + tw / 2, cy = ty + (big ? 10 : 7), cr = big ? 7 : 5;
    for (let y = -cr; y <= cr; y++) for (let x = -cr; x <= cr; x++) { const d = x * x + y * y; if (d <= cr * cr) put(cx + x, cy + y, d > (cr - 1) ** 2 ? '6' : '9'); }
    for (let j = 1; j < cr - 1; j++) (put(cx, cy - j, '1'), put(cx + j * 0.6, cy + j * 0.3, '1')); // 시침·분침
    for (let j = 1; j < cr; j++) put(cx - j * 0.7, cy - j * 0.7, 't'); // 멈춘 초침(청록)
    rect(tx + 4, ty + th - 8, tw - 8, 5, 'o'); // 아래 문 불빛
    // 지평선 담(용마루)
    rect(0, hz, lw, 2, '4');
    for (let x = 0; x < lw; x += 4) put(x, hz, '5');
    // 땅: 원근(멀수록 줄이 촘촘)
    const base = place === 2 ? ['5', '6', '4'] : place === 1 ? ['3', '4', '2'] : ['3', '4', '2'];
    for (let y = hz + 2, row = 0; y < lh; row++) {
      const hgt = Math.max(2, Math.round(2 + ((y - hz) / (gb - hz)) * 5)), off = row % 2 ? 0.5 : 0, cw = hgt * (place === 2 ? 3 : 2) + 2;
      for (let x = -cw; x < lw + cw; x += cw) {
        const x0 = Math.round(x + off * cw), c = hs(row * 31 + x) < 0.5 ? base[0] : base[1];
        for (let j = 0; j < hgt; j++) for (let i = 0; i < cw; i++) {
          let ch = c;
          if (j === hgt - 1 || i === cw - 1) ch = base[2]; // 줄눈
          else if (place === 1 && j === 0) ch = '5'; // 기와 윗줄 빛
          else if (place !== 1 && i === 0 && j === 0) ch = place === 2 ? '7' : '5';
          put(x0 + i, y + j, ch);
        }
      }
      y += hgt;
    }
    return g;
  }
}
