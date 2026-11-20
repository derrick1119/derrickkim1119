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
  v: '#f0903a', V: '#a8551e', G: '#64ba5b', E: '#2f6c43', D: '#ff2d4b', k: '#0e0f22',
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
  const x = c.getContext('2d')!, im = x.createImageData(c.width, c.height); // M3 S8 렉: 칸마다 fillRect(배경 2만 5천 번) → 픽셀을 한 번에(판 진입 멈춤 · 첫 그림)
  g.forEach((r, j) => r.forEach((ch, i) => { if (ch === '.') return; const v = parseInt(PAL[ch].slice(1), 16), o = (j * c!.width + i) * 4; im.data.set([v >> 16, (v >> 8) & 255, v & 255, 255], o); }));
  x.putImageData(im, 0, 0);
  cache.set(key, c);
  return c;
}

// ── 주인공 '초침' — 사무라이(💬 오너 11-20 "닌자가 아니라 사무라이로 해줘") · 30×24 ──
//   상투(청록 끈) · 흰 머리띠(뒤로 날리는 끈) · 청록 하오리(금 태엽 문장) · 흰 기모노 깃 · 남색 하카마 · 금 코등이 카타나
//   청록은 겨눈 선·칼빛과 같은 주인공 색 · 하오리를 청록으로 해 파란 기와 위에서도 또렷하게(🧪 S12: 남색 옷과 파란 기와 대비 약함)
const HERO = [
  '.............TT2..............',
  '............22322.............',
  '.............222..............',
  '.........2222222222...........',
  '........223222222322..........',
  '.......22222222222222.........',
  '.....wwwwwwwwwwwwwwww.........',
  '...w8w.2pppppppppppp2.........',
  '..w8...2pppkwppppkwp2.........',
  '..8w...2pppkkppppkkp2.........',
  '....8..2prrppppppprr2.........',
  '........2pppppqqppp2..........',
  '.........2pppppppp2...........',
  '.......uttttw8ww8wttttu.......',
  '.....uutttttw8ww8wtttttuu.....',
  '....utTtttttww88wwtttttTtupp..',
  '....uttttytttwwttttttttttpp...',
  '....utttyYytnnnntttttttuu.....',
  '...nn.uttyttnnnnttttttuu......',
  '.nn....nNNNNNNNNNNNNNNn.......',
  '.......nNNmNNNnnNNNmNNn.......',
  '......nNNmNNNNnnNNNNmNNn......',
  '......nNmNNNn....nNNNmNn......',
  '.....22222.........22222......',
];
const BLADE: Dot[] = [[24, 16, '1'], [25, 16, '1'], [25, 14, 'Y'], [26, 14, 'Y'], [27, 14, 'Y'], [26, 13, 'w'], [26, 12, 'w'], [27, 11, 'w'], [27, 10, 'w'], [28, 9, 'w'], [28, 8, 'w'], [29, 7, 'w'], [27, 13, '8'], [27, 12, '8'], [28, 11, '8'], [28, 10, '8'], [29, 9, '8']];
/** 얼굴 줄 바꾸기: 0 기본 · 1 웃음(이김·싹쓸이) · 2 아야(맞음·짐) */
const FACES: Record<number, Record<number, string>> = {
  1: { 8: '..w8...2pppppppppppp2.........', 9: '..8w...2ppkppkppkppk2.........', 11: '........2ppppqrrqpp2..........' },
  2: { 8: '..w8...2ppkppppppkpp2.........', 9: '..8w...2pppkppppkppp2.........', 11: '........2pppkqkqkpp2..........' },
};
/** 주인공 스프라이트(발 = 아래 가운데) */
export const heroGrid = (face: number) => grid(HERO.map((r, i) => FACES[face]?.[i] ?? r), [], BLADE);
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
const HAT: Record<string, string[]> = { // 칼 병정 모자는 시안의 빨강 → 주황(빨강은 위험에만 · 🧪 S2: 보라는 남색 닌자와 한 덩어리)
  sword: ['.......ww', '.....vVVVVVV', '.....vvvvvVV', '.....vvvvvVV', '.....8888888', '....111111111'],
  archer: ['........r', '.......OOH', '......OOOHH', '.....OOOOOHH', '.....OOOOHHH', '...HHHHHHHHHHH'], // 🧪 S4: 초록 고깔이 잎 병정과 같은 '초록 머리' → 갈색 고깔 + 분홍 깃
  shield: ['........HH', '......677765', '.....67777665', '.....67777665', '....5666666655', '....111111111'],
  dummy: ['', '.....oooooo', '...ooOOOOOOoo', '..oooooooooooo'], // 연습 인형: 짚 삿갓 · 무기 없음
  shuri: ['', '', '', '.............r.r', '............rrr', '....rrrrrrrrrr'], // M3 S4 수리검 병정: 분홍 머리띠
  leaf: ['.......GG', '.....GGGGE', '....GGGEGEE', '...GGGEGGGE', '....EEGEEE', '.......E'], // M3 S4 잎 병정: 머리에 큰 잎(곧게 그으면 휙)
  boss: ['.......ww', '......wwww', '.....yyyyYY', '....yyYyyyYY', '....yyyyyyYY', '...YYYYYYYYYY'], // M3 S7 태엽 장군(1-10): 금빛 투구 + 흰 깃 · 두 배 크기
  doll: ['.......GG', '......GGE', '..rrr...rrr', '.rrrrrqrrrrr', '..rrr...rrr'], // M3 S7 태엽 큰 인형(2-10 · 잎 성질): 분홍 리본(고리 둘 + 매듭) + 잎
  bell: ['', '.....oooooo', '...ooOOOOOOoo', '..oooooooooooo'], // 보류된 종(그림만 맞춤)
};
const ARM: Record<string, Dot[]> = {
  sword: [[1, 2, 'j'], [2, 2, 'h'], [1, 3, 'j'], [2, 3, 'h'], [1, 4, 'j'], [2, 4, 'h'], [1, 5, 'j'], [2, 5, 'h'], [1, 6, 'j'], [2, 6, 'h'], [1, 7, 'j'], [2, 7, 'h'], [1, 1, 'j'], [0, 8, 'H'], [1, 8, 'H'], [2, 8, 'H'], [3, 8, 'H'], [1, 9, 'j'], [2, 9, 'h'], [2, 10, 'h'], [2, 11, 'h'], [14, 12, 'H'], [14, 13, 'H']],
  archer: [[1, 8, 'H'], [0, 9, 'H'], [0, 10, 'h'], [0, 11, 'h'], [0, 12, 'h'], [0, 13, 'h'], [0, 14, 'H'], [1, 15, 'H'], [1, 9, '8'], [1, 10, '8'], [1, 11, '8'], [1, 12, '8'], [1, 13, '8'], [1, 14, '8'], [2, 11, 'j'], [2, 12, 'h'], [14, 12, 'H'], [14, 13, 'H']],
  shield: [[14, 12, 'H'], [14, 13, 'H']], // 방패 원판은 게임이 따로 그린다(앞·뒤 판정이 보여야 해서)
  dummy: [],
  shuri: [[1, 10, '8'], [0, 11, '8'], [1, 11, '9'], [2, 11, '8'], [1, 12, '8'], [14, 12, 'H'], [14, 13, 'H']],
  leaf: [[14, 12, 'H'], [14, 13, 'H']],
  boss: [[1, 2, '9'], [2, 2, '8'], [1, 3, '9'], [2, 3, '8'], [1, 4, '9'], [2, 4, '8'], [1, 5, '9'], [2, 5, '8'], [1, 6, '9'], [2, 6, '8'], [0, 7, 'y'], [1, 7, 'y'], [2, 7, 'y'], [3, 7, 'y'], [1, 8, 'H'], [2, 8, 'H'], [14, 12, 'H'], [14, 13, 'H']], // 은빛 칼 + 금 손잡이
  doll: [[14, 12, 'H'], [14, 13, 'H']],
  bell: [],
};
export const SOLDIER = new Set(Object.keys(HAT).filter((k) => k !== 'doll')); // doll은 boss의 2-10 모습
/** 태엽 병정 스프라이트(발 = 아래 가운데) · 얼굴은 왼쪽을 본다 */
const COAT: Record<string, Record<string, string>> = { boss: { h: 'y', H: 'Y', j: 'o' }, doll: { h: 'r', H: 'q', j: 'p' } }; // 🧪 S7: 대장 몸이 졸개와 같아 포개지면 묻힘 → 장군 금 갑옷 · 큰 인형 분홍 옷
export const soldierGrid = (k: string) => grid(BODY.map((r, i) => (i >= 11 && COAT[k] ? r.replace(/[hHj]/g, (c) => COAT[k][c]) : r)), [KEY, HAT[k]], ARM[k]);
export const soldier = (k: string) => sprite('so' + k, () => soldierGrid(k));

// ── 배경(M3 S3 · 🧪 🔴1: 대숲 벡터를 줄인 '모자이크' → 32색 도트 · 후광·그라데이션 0) ──
const BAY = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const hs = (n: number) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
/**
 * 판 배경 한 장(lw×lh 도트)을 굽는다. place 0 태엽 마을 골목(돌길) · 1 지붕(기와) · 2 시계탑 광장(타일).
 * hz = 지평선 줄(도트), gb = 땅 끝 줄. '멈춘 시간' 표식 = 시계탑(초침은 청록 — 주인공 이름).
 */
export const pixBg = (lw: number, lh: number, place: number, hz: number, gb: number, v = 0) => sprite(`bg${lw}x${lh}:${place}:${v}`, () => bgGrid(lw, lh, place, hz, gb, v));
/** v(M3 S7 · 🧪 🔴B 월드마다 조합 3가지): 지붕(place 1)에서 0 푸른 기와 · 1 검은 기와(따뜻한 빛 줄) + 굴뚝 · 2 밤 기와 + 빨랫줄 · 3 대장 판(큰 시계탑) — 🧪: 갈색 기와는 병정 코트와 같은 색이라 뺌 */
export function bgGrid(lw: number, lh: number, place: number, hz: number, gb: number, v = 0): string[][] {
  {
    const g = Array.from({ length: lh }, () => Array<string>(lw).fill('0'));
    const put = (x: number, y: number, c: string) => { x |= 0; y |= 0; if (x >= 0 && y >= 0 && x < lw && y < lh) g[y][x] = c; };
    const rect = (x: number, y: number, w: number, h: number, c: string) => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) put(x + i, y + j, c); };
    // 하늘: 0 → 1 → 2 디더링 띠 · 별
    for (let y = 0; y < hz; y++) for (let x = 0; x < lw; x++) { const v = (y / hz) * 2.2; g[y][x] = String(Math.min(2, Math.floor(v) + ((v % 1) * 16 > BAY[(y & 3) * 4 + (x & 3)] ? 1 : 0))); }
    for (let k = 0; k < 26; k++) put(hs(k) * lw, hs(k + 50) * hz * 0.7, k % 5 ? '7' : '9');
    // 달(왼쪽 위 · 초승달)
    const mx = lw * 0.2, my = Math.max(hz * 0.28, 21), mr = 7; // 🧪 S3: 위 판 띠(HUD ≈ 11칸)에 가리지 않게
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
    const big = place === 2 || v === 3, tw = big ? 22 : 14, tx = Math.round(big ? lw / 2 - tw / 2 : lw * 0.66), th = hz - (big ? 21 : 23), ty = hz - th; // 뾰족 끝도 HUD 아래
    rect(tx, ty, tw, th, '3');
    rect(tx + tw - 3, ty, 3, th, '2'); // 그늘 쪽
    for (let j = 0; j < 8; j++) rect(tx + j, ty - 8 + j, tw - 2 * j, 1, j ? '2' : '1'); // 뾰족 지붕
    put(tx + tw / 2, ty - 9, 'y');
    const cx = tx + tw / 2, cy = ty + (big ? 10 : 7), cr = big ? 7 : 5;
    for (let y = -cr; y <= cr; y++) for (let x = -cr; x <= cr; x++) { const d = x * x + y * y; if (d <= cr * cr) put(cx + x, cy + y, d > (cr - 1) ** 2 ? '6' : '9'); }
    for (let j = 1; j < cr - 1; j++) (put(cx, cy - j, '1'), put(cx + j * 0.6, cy + j * 0.3, '1')); // 시침·분침
    for (let j = 1; j < cr; j++) put(cx - j * 0.7, cy - j * 0.7, 't'); // 멈춘 초침(청록)
    rect(tx + 4, ty + th - 8, tw - 8, 5, 'o'); // 아래 문 불빛
    if (place === 1 && v === 1) for (const cx of [0.12, 0.42, 0.86]) { const x = Math.round(lw * cx); rect(x, hz - 14, 4, 12, 'O'); rect(x - 1, hz - 15, 6, 2, 'H'); for (let j = 0; j < 4; j++) put(x + 1 + (j % 2), hz - 17 - j * 2, '6'); } // 굴뚝 + 연기
    if (place === 1 && v === 2) for (let k = 0; k < 2; k++) { const y0 = hz - 18 + k * 7; for (let x = 0; x < lw; x++) { const y = y0 + Math.round(Math.sin(x / lw * Math.PI) * 3); put(x, y, '6'); if (x % 9 === 3) rect(x, y + 1, 3, 4, 'rmyGo'[(x + k) % 5]); } } // 빨랫줄
    // 지평선 담(용마루)
    rect(0, hz, lw, 2, '4');
    for (let x = 0; x < lw; x += 4) put(x, hz, '5');
    // 땅: 원근(멀수록 줄이 촘촘)
    const base = place === 2 ? ['5', '6', '4'] : place === 1 ? [['3', '4', '2'], ['1', '2', '0'], ['2', '3', '1'], ['3', '4', '2']][v] : ['3', '4', '2'];
    for (let y = hz + 2, row = 0; y < lh; row++) {
      const hgt = Math.max(2, Math.round(2 + ((y - hz) / (gb - hz)) * 5)), off = row % 2 && place !== 1 ? 0.5 : 0, cw = place === 1 ? hgt + 2 : hgt * (place === 2 ? 3 : 2) + 2;
      for (let x = -cw; x < lw + cw; x += cw) {
        const x0 = Math.round(x + off * cw), c = hs(row * 31 + x) < 0.5 ? base[0] : base[1];
        for (let j = 0; j < hgt; j++) for (let i = 0; i < cw; i++) {
          let ch = c;
          if (place === 1) ch = i === 0 ? base[2] : i === 1 ? (v === 1 ? 'O' : '5') : j === hgt - 1 ? base[0] : base[1]; // 기와: 세로 골 · 빛 줄 · 단 끝 — 돌길과 다른 무늬(🧪 S3)
          else if (j === hgt - 1 || i === cw - 1) ch = base[2]; // 줄눈
          else if (place !== 1 && i === 0 && j === 0) ch = place === 2 ? '7' : '5';
          put(x0 + i, y + j, ch);
        }
      }
      y += hgt;
    }
    return g;
  }
}

// ── M3 S4 소품(🧪 🔴A: 흐린 벡터 → 외곽선 도트) ──
const disc = (r: number, f: (x: number, y: number, d: number) => string) => {
  const n = r * 2 + 1;
  return Array.from({ length: n }, (_, y) => Array.from({ length: n }, (_, x) => { const d = Math.hypot(x - r, y - r); return d > r + 0.3 ? '.' : f(x - r, y - r, d); }).join(''));
};
/** 냄비뚜껑 방패 — 0 앞(은빛) · 1 뒤(어두움) */
export const lid = (back: number) => sprite('lid' + back, () => grid(disc(5, (x, y, d) => (back ? (d > 4.3 ? '3' : '4') : d > 4.3 ? (x + y < 0 ? '8' : '5') : d < 1.3 ? 'H' : x < -1 && y < -1 ? '9' : '7'))));
/** 폭탄 통 — 심지에 불이 붙으면 1 */
export const barrel = (lit: number) => sprite('br' + lit, () => grid(['....' + (lit ? 'wy' : 'yD'), '....DO', '.....O', '..HHHHH', '.hjjhhhH', '.DDDDDDDD', '.hjjhhhHH', '.hjjhhhHH', '.DDDDDDDD', '.hjjhhhHH', '..HHHHHH'])); // 🧪 S4: 병정과 섞여서 심지·불씨 + 빨간 띠(터지는 위험)
/** 가시덤불(위험) — 1이면 걸린다(가시가 하얗게) */
export const thorn = (hot: number) => sprite('th' + hot, () => grid(['...D....D...D', '.D.EE.D.EE.EE.D', '..EGGEEGGEEGGE', 'D.EGGGEGGGEGGE.D', '.EEGGEEGGGEEGGE', '..EEEEEEEEEEEE'].map((r) => (hot ? r.replace(/D/g, 'w') : r))));
/** 구경꾼 부엉이(가지 위) */
export const owl = (blink: number) => sprite('ow' + blink, () => grid(['..H.....H', '..HhhhhhH', '.Hjjhhjjh', blink ? '.HkkjjkkH' : '.Hykjjkyh', '.HjjhyhjjH', '..hhhhhhH', '..hjhjhhH', '..hhhhhhH', '...y..y', 'HHHHHHHHHHHH']));
/** 안내 손가락(검지가 위) — 손끝은 (2, 0) */
export const hand = () => sprite('hd', () => grid(['..w', '..ww', '..ww', '..ww.w', '..wwwww.w', '.8wwwwwww', '8wwwwwwww', '.8wwwwww8', '..8wwww8', '...8888']));
