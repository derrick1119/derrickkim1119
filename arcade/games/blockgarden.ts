/**
 * 블록 꽉꽉 정원 (25라운드: 검증된 요즘 캐주얼 뼈대 × 공장의 와우) — 줄 채워 지우기 × 타일 놓기 × 콤보 피버.
 * 장르 뼈대: '블록 놓아 줄 지우기'(8×8 판, 여러 모양 조각, 회전 없음, 가로·세로 줄이 꽉 차면 사라짐).
 * 세계: 담장 텃밭 디오라마 — 판 = 나무 틀 흙 밭, 조각 = 꽃모종 묶음. 두더지 정원사가 모종 상자를 들고 응원한다.
 * 기준 9(손이 하는 일은 하나): 밭을 누르고 있으면 그 자리에 놓일 모양이 반투명으로 보이고(못 놓으면 빨강, 채워질 줄은 반짝),
 *   떼면 심긴다. 끌기 없음. '지금 조각' 상자를 톡 하면 다음 조각과 맞바꾼다(보관 칸 1개). 키보드는 화살표 커서 + 스페이스.
 * 규칙(결정적, 2줄): 누른 자리에 조각이 놓인다 / 가로·세로 한 줄이 꽉 차면 꽃이 활짝 피며 사라진다, 놓을 데가 없으면 실패.
 *   꽃 = 지운 칸 수 × 콤보(놓을 때마다 연달아 줄을 지우면 ×2, ×3 …). 돌·잡초·황금 씨앗도 '찬 칸'으로 센다.
 * 와우: 한 줄을 채우면 모종이 한꺼번에 활짝 피며 꽃잎이 흩날리고, 두 줄 이상이면 꽃가루 폭죽 + 두더지 정원사의 춤(콤보가 클수록 크게).
 *   1판은 거의 찬 줄 셋이 고랑 하나만 비워 두고 깔려 있어서, 첫 놓기에 세 줄이 한꺼번에 팡팡.
 * 판(밭) 8개: 목표 = 꽃 N송이를 모종 K개 안에. 별 = ★ 목표 · ★ 모종 R개 이상 남기기 · ★ 판마다 다른 숙제(목표를 채우는 순간 판이
 *   끝나므로 숙제를 '먼저' 해야 한다 — 무엇을 먼저 할지가 수). 실패(놓을 데 없음 · 모종이 다 떨어짐) = 하트 -1, 같은 밭 다시.
 * 펼쳐짐(하는 일이 바뀐다): 1판 고랑 채우기 → 2판 바꿔 심기(다음 조각과 맞바꿔 순서 고르기, 숙제 콤보 ×3) → 3판 돌(두 번 피워야
 *   깨짐 — 돌이 든 줄을 노려 두 번) → 4판 번지는 잡초(3수마다 옆으로 번짐 — 잡초 줄부터 지우기) → 5판 물뿌리개(아무 칸에나 놓으면
 *   그 칸의 가로·세로 줄이 통째로 핌 — 꽉 찬 십자를 만들어 두고 아꼈다 쓰기) → 6판 황금 씨앗(몇 수 뒤 시든다 — 서둘러 그 줄 채우기)
 *   → 7판 꿀벌 줄(그 줄을 지우면 꽃 두 배, 꿀벌이 다른 줄로 옮김 — 쫓아가기) → 8판 꽃 잔치(돌·잡초·황금·물뿌리개 모두).
 * 웃음: 두더지 정원사는 놓을 때마다 고개를 끄덕이고, 줄이 피면 만세, 여러 줄이면 밀짚모자를 던지며 빙글빙글 춤.
 *   밭이 꽉 차 오면 땀을 뻘뻘, 실패하면 벌러덩 뒤집혀 어질어질 별. 담장 위 참새들은 꽃가루 폭죽에 놀라 폴짝,
 *   잡초 녀석은 심술궂게 히죽 웃다가 뽑힐 때 '으악!'.
 */
import { mulberry32, type Rng } from '../../engine/rng.ts';
import type { Bot, GameDef, Input, Theme } from '../core.ts';
import { juice } from '../juice.ts';

const A = 1.56;
const N = 8, NN = 64;
const EMPTY = 0, SEED = 1, STONE = 2, WEED = 3, GOLD = 4;
/** 시든 황금 씨앗(돌처럼 남는다)의 tint 표시 */
const WITHER = 9;
const CAN = -1;
/** 화면 배치 (가로 0~1, 세로 0~A, 단위 = 캔버스 폭) */
const BX = 0.1, BY = 0.305, CS = 0.1;
const TRAY_Y = 1.15, TRAY_H = 0.2;
const CUR = { x: 0.215, y: TRAY_Y, w: 0.3, h: TRAY_H };
const NXT = [{ x: 0.545, y: TRAY_Y + 0.025, w: 0.2, h: TRAY_H - 0.035 }, { x: 0.77, y: TRAY_Y + 0.025, w: 0.2, h: TRAY_H - 0.035 }];
const BAND = 1.375;
const MOLE = { x: 0.105, y: TRAY_Y + 0.175 };
const RESULT_OK = 210, RESULT_FAIL = 170, NEWS_T = 170, CARD_T = 130, CARD_DELAY = 55;
const STAR_PTS = 100, LEFT_PTS = 10, WIN_PTS = 300;
const MAXM = 8;

/** 조각 모양 (회전 없음 — 돌린 모양은 다른 조각) */
const SHAPES: number[][][] = [
  [[0, 0]],
  [[0, 0], [1, 0]],
  [[0, 0], [0, 1]],
  [[0, 0], [1, 0], [2, 0]],
  [[0, 0], [0, 1], [0, 2]],
  [[0, 0], [1, 0], [0, 1]],
  [[0, 0], [1, 0], [1, 1]],
  [[0, 0], [0, 1], [1, 1]],
  [[1, 0], [0, 1], [1, 1]],
  [[0, 0], [1, 0], [0, 1], [1, 1]],
  // 10~23, 33~36: 넷
  [[0, 0], [1, 0], [2, 0], [3, 0]],
  [[0, 0], [0, 1], [0, 2], [0, 3]],
  [[0, 0], [1, 0], [2, 0], [1, 1]],
  [[1, 0], [0, 1], [1, 1], [2, 1]],
  [[0, 0], [0, 1], [0, 2], [1, 1]],
  [[1, 0], [1, 1], [1, 2], [0, 1]],
  [[1, 0], [2, 0], [0, 1], [1, 1]],
  [[0, 0], [1, 0], [1, 1], [2, 1]],
  [[0, 0], [0, 1], [1, 1], [1, 2]],
  [[1, 0], [0, 1], [1, 1], [0, 2]],
  [[0, 0], [0, 1], [0, 2], [1, 2]],
  [[1, 0], [1, 1], [1, 2], [0, 2]],
  [[0, 0], [1, 0], [2, 0], [0, 1]],
  [[0, 0], [1, 0], [2, 0], [2, 1]],
  // 24~32: 큰 것
  [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0]],
  [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4]],
  [[0, 0], [1, 0], [2, 0], [0, 1], [0, 2]],
  [[0, 0], [1, 0], [2, 0], [2, 1], [2, 2]],
  [[0, 0], [0, 1], [0, 2], [1, 2], [2, 2]],
  [[2, 0], [2, 1], [2, 2], [1, 2], [0, 2]],
  [[0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [2, 1]],
  [[0, 0], [1, 0], [0, 1], [1, 1], [0, 2], [1, 2]],
  [[0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [2, 1], [0, 2], [1, 2], [2, 2]],
  [[0, 0], [1, 0], [1, 1], [1, 2]],
  [[0, 0], [1, 0], [0, 1], [0, 2]],
  [[2, 0], [0, 1], [1, 1], [2, 1]],
  [[0, 0], [0, 1], [1, 1], [2, 1]],
];
const TIERS = [[0, 1, 2, 3, 4, 5, 6, 7, 8, 9], [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 33, 34, 35, 36], [24, 25, 26, 27, 28, 29, 30, 31, 32]];
const shW = (sh: number) => (sh === CAN ? 1 : 1 + Math.max(...SHAPES[sh].map((c) => c[0])));
const shH = (sh: number) => (sh === CAN ? 1 : 1 + Math.max(...SHAPES[sh].map((c) => c[1])));
const cellsOf = (sh: number) => (sh === CAN ? SHAPES[0] : SHAPES[sh]);

type Star3 = 'multi' | 'combo3' | 'stones' | 'weeds' | 'can' | 'gold' | 'bee' | 'all';
interface StageDef {
  key: string;
  name: string;
  news: string;
  hint: string;
  /** '.' 빈 흙 · 'x' 모종 · 'o' 돌 · 'w' 잡초 · 'g' 황금 씨앗 */
  map: string[];
  goal: number;
  pieces: number;
  /** ★: 모종을 이만큼 이상 남기고 목표 달성 */
  spare: number;
  star3: Star3;
  /** 조각 크기 비율 [작은, 넷, 큰] */
  pool: number[];
  /** 놓을 데 없는 조각이 뽑히면 다시 뽑는 횟수 (판이 쉬울수록 많이) */
  mercy: number;
  first?: number[];
  weedEvery?: number;
  canEvery?: number;
  goldLife?: number;
  bee?: boolean;
  /** 배우는 판: 놓을 데가 없으면 두더지가 한 칸짜리 모종으로 바꿔 준다 */
  rescue?: boolean;
}

/** 밭 8개. 판마다 시드로 좌우·위아래를 뒤집는다 */
export const STAGES: StageDef[] = [
  {
    key: '', name: '첫 꽃밭', news: '', hint: '빈 고랑을 채우면 세 줄이 한꺼번에!',
    map: ['xxx.xxxx', 'xxx.xxxx', 'xxx.xxxx', 'xxxxx.xx', 'xxxxx.xx', 'xxxxx.xx', '..x.x.xx', 'xx.x.x..'],
    goal: 60, pieces: 12, spare: 10, star3: 'multi', pool: [8, 2, 0], mercy: 12, first: [4, 4, 1], rescue: true,
  },
  {
    key: 'swap', name: '바꿔 심기', news: '🔄 지금 조각을 톡 = 다음 조각과 맞바꾸기', hint: '연달아 줄을 지우면 콤보 ×2, ×3!',
    map: ['........', '........', '........', 'xxxx.xxx', 'xx.xxxxx', 'xxxxxx.x', '.xxxxxxx', 'xxx.xxxx'],
    goal: 40, pieces: 18, spare: 6, star3: 'combo3', pool: [5, 4, 1], mercy: 6, rescue: true,
  },
  {
    key: 'stone', name: '돌밭', news: '🪨 돌은 그 줄을 두 번 피워야 깨져요', hint: '돌이 든 줄을 노려요 — 두 번!',
    map: ['........', '..o..o..', '........', '........', '........', '........', '........', '........'],
    goal: 45, pieces: 16, spare: 3, star3: 'stones', pool: [4, 5, 2], mercy: 4,
  },
  {
    key: 'weed', name: '잡초 습격', news: '🌿 잡초는 3수마다 옆으로 번져요 — 줄로 뽑아요', hint: '잡초가 든 줄부터 지워요!',
    map: ['........', '......w.', '........', '........', '........', '..w.....', '........', '........'],
    goal: 50, pieces: 16, spare: 3, star3: 'weeds', pool: [4, 5, 2], mercy: 3, weedEvery: 3,
  },
  {
    key: 'can', name: '물뿌리개', news: '🚿 물뿌리개는 아무 칸에나! 가로·세로 줄이 통째로 펴요', hint: '꽉 찬 십자에 물뿌리개 — 아꼈다 써요',
    map: ['........', '........', '........', '........', '........', '........', '........', '........'],
    goal: 60, pieces: 16, spare: 3, star3: 'can', pool: [3, 5, 3], mercy: 2, canEvery: 5,
  },
  {
    key: 'gold', name: '황금 씨앗', news: '✨ 황금 씨앗은 몇 수 뒤 시들어요 — 그 줄을 먼저!', hint: '숫자 = 시들기까지 남은 수',
    map: ['........', '.g....g.', '........', '........', '........', '....g...', '........', '........'],
    goal: 55, pieces: 16, spare: 3, star3: 'gold', pool: [3, 5, 3], mercy: 2, goldLife: 10,
  },
  {
    key: 'bee', name: '꿀벌 줄', news: '🐝 꿀벌 줄을 지우면 꽃 두 배 — 꿀벌은 다른 줄로 날아가요', hint: '꿀벌이 앉은 줄을 쫓아가요',
    map: ['........', '........', '........', '........', '........', '........', '........', '........'],
    goal: 70, pieces: 16, spare: 3, star3: 'bee', pool: [3, 5, 3], mercy: 2, bee: true,
  },
  {
    key: 'fair', name: '꽃 잔치', news: '🎪 꽃 잔치 — 돌·잡초·황금·물뿌리개가 다 나와요', hint: '황금도 돌도 다 피우면 ★',
    map: ['........', '.o....o.', '........', '....w...', '........', '..g.....', '........', '..g.....'],
    goal: 70, pieces: 18, spare: 3, star3: 'all', pool: [3, 5, 3], mercy: 2, weedEvery: 4, canEvery: 6, goldLife: 12,
  },
];
export const STAGE_COUNT = STAGES.length;

interface Piece { sh: number; tint: number }
interface Board { k: Int8Array; hp: Int8Array }
/** 한 번 놓은 결과 */
interface Res {
  lines: number; rows: number[]; cols: number[];
  seeds: number; gold: number; weeds: number; hits: number; broke: number; bee: number;
  cells: number[]; kinds: number[];
}
interface Ev { t: number; kind: string; x: number; y: number; text?: string; n?: number; col?: string }
/** 연출: 핀 꽃(지워진 칸) · 놓인 칸의 툭 내려앉기 · 나비 */
interface Bloom { x: number; y: number; tint: number; kind: number; t: number; big: number }

export interface BGState {
  rng: Rng; seed: number; t: number; stage: number; phase: 'play' | 'result'; pt: number;
  b: Board; tint: Int8Array; drop: Int16Array;
  cur: Piece; nx: Piece[]; drawn: number;
  left: number; used: number; flowers: number; streak: number; best: number; multi: number; canBest: number;
  bee: number; beeHits: number; weedTick: number; stones0: number; gold0: number; goldGot: number; goldLost: number; weeds0: number;
  hearts: number; stars: number; got: number; starOk: boolean[]; pts: number; ok: boolean; why: string;
  down: boolean; press: 0 | 1 | 2; aim: { x: number; y: number } | null;
  seen: Set<string>; newsQ: string[]; news: { text: string; t: number } | null; events: Ev[];
  dead: boolean; won: boolean; again: boolean; tries: number; firstPlace: boolean; lastPlace: number; flips: number[];
  blooms: Bloom[]; mood: number; moodT: number; power: number; swapT: number; stuck: boolean;
}

const ev = (s: BGState, kind: string, x: number, y: number, text?: string, n?: number, col?: string) => s.events.push({ t: s.t, kind, x, y, text, n, col });
function see(s: BGState, key: string, text: string) {
  if (!key || s.seen.has(key)) return;
  s.seen.add(key);
  s.newsQ.push(text);
}

// ───────────────────────────── 판 규칙 (게임·봇 공용) ─────────────────────────────
function fits(b: Board, sh: number, ox: number, oy: number) {
  if (sh === CAN) return ox >= 0 && oy >= 0 && ox < N && oy < N;
  if (ox < 0 || oy < 0 || ox + shW(sh) > N || oy + shH(sh) > N) return false;
  for (const [dx, dy] of SHAPES[sh]) if (b.k[(oy + dy) * N + ox + dx] !== EMPTY) return false;
  return true;
}
function anyFit(b: Board, sh: number) {
  if (sh === CAN) return true;
  const w = shW(sh), h = shH(sh);
  for (let oy = 0; oy + h <= N; oy++) for (let ox = 0; ox + w <= N; ox++) if (fits(b, sh, ox, oy)) return true;
  return false;
}
const MARK = new Uint8Array(NN);
/** 조각을 놓고(물뿌리개면 그 칸의 가로·세로를) 찬 줄을 피운다. 돌은 한 번 맞으면 금, 두 번이면 깨짐 */
function applyMove(b: Board, sh: number, ox: number, oy: number, bee: number, rec: boolean): Res {
  const r: Res = { lines: 0, rows: [], cols: [], seeds: 0, gold: 0, weeds: 0, hits: 0, broke: 0, bee: 0, cells: [], kinds: [] };
  if (sh === CAN) {
    // 물뿌리개: 그 칸의 가로·세로 줄을 통째로 (빈 줄은 세지 않는다)
    let rowAny = false, colAny = false;
    for (let k = 0; k < N; k++) (rowAny ||= b.k[oy * N + k] !== EMPTY), (colAny ||= b.k[k * N + ox] !== EMPTY);
    if (rowAny) r.rows.push(oy);
    if (colAny) r.cols.push(ox);
  } else {
    for (const [dx, dy] of SHAPES[sh]) {
      const i = (oy + dy) * N + ox + dx;
      b.k[i] = SEED;
      b.hp[i] = 0;
    }
    for (let y = 0; y < N; y++) {
      let full = true;
      for (let x = 0; x < N; x++) if (b.k[y * N + x] === EMPTY) { full = false; break; }
      if (full) r.rows.push(y);
    }
    for (let x = 0; x < N; x++) {
      let full = true;
      for (let y = 0; y < N; y++) if (b.k[y * N + x] === EMPTY) { full = false; break; }
      if (full) r.cols.push(x);
    }
  }
  r.lines = r.rows.length + r.cols.length;
  if (!r.lines) return r;
  MARK.fill(0);
  for (const y of r.rows) for (let x = 0; x < N; x++) MARK[y * N + x] = 1;
  for (const x of r.cols) for (let y = 0; y < N; y++) MARK[y * N + x] = 1;
  if (bee >= 0 && (bee < N ? r.rows.includes(bee) : r.cols.includes(bee - N)))
    for (let k = 0; k < N; k++) {
      const i = bee < N ? bee * N + k : k * N + bee - N;
      if (b.k[i] === SEED || b.k[i] === GOLD) r.bee++;
    }
  for (let i = 0; i < NN; i++) {
    if (!MARK[i]) continue;
    const k = b.k[i];
    if (k === EMPTY) continue;
    if (rec) r.cells.push(i), r.kinds.push(k);
    if (k === SEED) (r.seeds++, (b.k[i] = EMPTY));
    else if (k === GOLD) (r.gold++, (b.k[i] = EMPTY));
    else if (k === WEED) (r.weeds++, (b.k[i] = EMPTY));
    else if (k === STONE) {
      // 가로·세로가 한꺼번에 지나가면 두 번 맞는다 (십자로 지우면 한 번에 와장창)
      const hit = (r.rows.includes(Math.floor(i / N)) ? 1 : 0) + (r.cols.includes(i % N) ? 1 : 0);
      r.hits += hit;
      if ((b.hp[i] -= hit) <= 0) (r.broke++, (b.k[i] = EMPTY));
    }
  }
  return r;
}
/** 놓은 뒤 황금 씨앗이 한 수씩 시든다. 시든 칸 수를 돌려준다 */
function wilt(b: Board, tint: Int8Array | null, out?: number[]) {
  let n = 0;
  for (let i = 0; i < NN; i++)
    if (b.k[i] === GOLD && --b.hp[i] <= 0) {
      b.k[i] = STONE;
      b.hp[i] = 1;
      if (tint) tint[i] = WITHER;
      out?.push(i);
      n++;
    }
  return n;
}
/** 꽃 배수 = 한 번에 지운 줄 수 + 연달아 지운 횟수 (1줄 ×1 · 2줄 ×2 · 연달아 한 번 더 +1) */
const multOf = (lines: number, streak: number) => Math.min(MAXM, lines + streak);
const gainOf = (r: Res, streak: number) => (r.lines ? (r.seeds + r.gold + r.bee) * multOf(r.lines, streak) : 0);

function cloneB(b: Board): Board {
  return { k: b.k.slice(), hp: b.hp.slice() };
}
function countK(b: Board, k: number, tint?: Int8Array) {
  let n = 0;
  for (let i = 0; i < NN; i++) if (b.k[i] === k && (!tint || tint[i] !== WITHER)) n++;
  return n;
}

// ───────────────────────────── 판 흐름 ─────────────────────────────
function drawPiece(s: BGState): Piece {
  const d = STAGES[s.stage];
  const n = s.drawn++;
  const tint = Math.floor(s.rng() * 6);
  if (d.first && n < d.first.length) return { sh: d.first[n], tint };
  if (d.canEvery && n % d.canEvery === d.canEvery - 1) return { sh: CAN, tint };
  let sh = 0;
  for (let k = 0; k <= d.mercy; k++) {
    const tot = d.pool[0] + d.pool[1] + d.pool[2];
    let u = s.rng() * tot, ti = 0;
    while (ti < 2 && u >= d.pool[ti]) (u -= d.pool[ti]), ti++;
    const tier = TIERS[ti];
    sh = tier[Math.floor(s.rng() * tier.length)];
    if (anyFit(s.b, sh)) break;
  }
  return { sh, tint };
}

function newStage(s: BGState) {
  const d = STAGES[s.stage], fl = s.flips[s.stage];
  s.b = { k: new Int8Array(NN), hp: new Int8Array(NN) };
  s.tint = new Int8Array(NN);
  s.drop = new Int16Array(NN).fill(-999);
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) {
      const c = d.map[y][x], X = fl & 1 ? N - 1 - x : x, Y = fl & 2 ? N - 1 - y : y, i = Y * N + X;
      s.tint[i] = Math.floor(s.rng() * 6);
      if (c === 'x') s.b.k[i] = SEED;
      else if (c === 'o') (s.b.k[i] = STONE), (s.b.hp[i] = 2);
      else if (c === 'w') s.b.k[i] = WEED;
      else if (c === 'g') (s.b.k[i] = GOLD), (s.b.hp[i] = d.goldLife ?? 9);
    }
  s.drawn = 0;
  s.left = d.pieces;
  s.cur = drawPiece(s);
  s.nx = [drawPiece(s), drawPiece(s)];
  s.used = 0;
  s.flowers = 0;
  s.streak = 0;
  s.best = 0;
  s.multi = 0;
  s.canBest = 0;
  s.beeHits = 0;
  s.bee = d.bee ? Math.floor(s.rng() * 2 * N) : -1;
  s.weedTick = 0;
  s.stones0 = countK(s.b, STONE);
  s.gold0 = countK(s.b, GOLD);
  s.weeds0 = countK(s.b, WEED);
  s.goldGot = 0;
  s.goldLost = 0;
  s.phase = 'play';
  s.pt = 0;
  s.starOk = [false, false, false];
  s.lastPlace = s.t;
  s.stuck = false;
  s.blooms = [];
  if (d.key) s.seen.add(d.key);
}

/** 이 판의 숙제(★ 셋째)를 했는가 · 아직 할 수 있는가 · 얼마나 했나(0~1) */
function special(s: { b: Board; tint?: Int8Array; best: number; multi: number; canBest: number; beeHits: number; goldGot: number; gold0: number; goldLost: number; weeds0: number; stones0: number; streak: number }, d: StageDef): { done: boolean; can: boolean; prog: number } {
  const stonesLeft = () => {
    let n = 0, hp = 0;
    for (let i = 0; i < NN; i++) if (s.b.k[i] === STONE && !(s.tint && s.tint[i] === WITHER) && s.b.hp[i] > 0 && (s.tint ? true : s.b.hp[i] <= 2)) (n++, (hp += s.b.hp[i]));
    return { n, hp };
  };
  switch (d.star3) {
    case 'multi':
      return { done: s.multi >= 2, can: true, prog: Math.min(1, s.multi / 2) };
    case 'combo3':
      return { done: s.best >= 3, can: true, prog: Math.min(1, Math.max(s.best, s.streak) / 3) };
    case 'stones': {
      const st = stonesLeft();
      return { done: st.n === 0, can: true, prog: 1 - st.hp / Math.max(1, s.stones0 * 2) };
    }
    case 'weeds': {
      const w = countK(s.b, WEED);
      return { done: w === 0, can: true, prog: Math.max(0, 1 - w / Math.max(1, s.weeds0 + 2)) };
    }
    case 'can':
      return { done: s.canBest >= 10, can: true, prog: Math.min(1, s.canBest / 10) };
    case 'gold':
      return { done: s.goldGot >= s.gold0, can: s.goldLost === 0, prog: s.goldGot / Math.max(1, s.gold0) };
    case 'bee':
      return { done: s.beeHits >= 2, can: true, prog: Math.min(1, s.beeHits / 2) };
    case 'all': {
      const st = stonesLeft();
      return { done: s.goldGot >= s.gold0 && st.n === 0, can: s.goldLost === 0, prog: 0.5 * (s.goldGot / Math.max(1, s.gold0)) + 0.5 * (1 - st.hp / Math.max(1, s.stones0 * 2)) };
    }
  }
}
const STAR3_LABEL: Record<Star3, string> = { multi: '2줄 한 번에', combo3: '콤보 ×3', stones: '돌 다 깨기', weeds: '잡초 0', can: '물뿌리개 꽃 10', gold: '황금 다 피우기', bee: '꿀벌 줄 2번', all: '황금+돌 다' };

function star3Text(s: BGState) {
  const d = STAGES[s.stage];
  switch (d.star3) {
    case 'stones': return `돌 ${s.stones0 - countK(s.b, STONE, s.tint)}/${s.stones0} 깨기`;
    case 'weeds': return `잡초 ${countK(s.b, WEED)} → 0`;
    case 'gold': return `황금 ${s.goldGot}/${s.gold0}`;
    case 'bee': return `꿀벌 줄 ${Math.min(2, s.beeHits)}/2`;
    case 'combo3': return `콤보 ×3${s.best >= 3 ? '' : ` (${Math.max(s.streak, s.best)}/3)`}`;
    case 'can': return `물뿌리개 꽃 ${Math.min(10, s.canBest)}/10`;
    case 'all': return `황금 ${s.goldGot}/${s.gold0}·돌 ${s.stones0 - countK(s.b, STONE, s.tint)}/${s.stones0}`;
    default: return STAR3_LABEL[d.star3];
  }
}

function endStage(s: BGState, ok: boolean, why: string) {
  s.phase = 'result';
  s.pt = 0;
  s.ok = ok;
  s.why = why;
  s.down = false;
  s.aim = null;
  const d = STAGES[s.stage];
  if (ok) {
    s.starOk = [true, s.left >= d.spare, special(s, d).done];
    s.got = s.starOk.filter(Boolean).length;
    s.stars += s.got;
    s.pts += s.got * STAR_PTS + s.left * LEFT_PTS;
    if (s.stage === STAGES.length - 1) (s.won = true), (s.pts += WIN_PTS);
    ev(s, 'clear', 3.5, 3.5, s.won ? '꽃 잔치 대성공! 🌷' : '밭 완성!');
    if (s.mood !== 4 || s.moodT <= 0) (s.mood = 5), (s.moodT = RESULT_OK);
  } else {
    s.hearts--;
    s.tries++;
    ev(s, 'fail', 3.5, 3.5, why);
    (s.mood = 6), (s.moodT = RESULT_FAIL);
  }
}

/** 손가락(화면 좌표)이 가리키는 조각 자리: 조각의 가운데가 손가락에 오게, 밭 안으로 당긴다 */
function placeAt(sh: number, x: number, y: number) {
  const fx = (x - BX) / CS, fy = (y - BY) / CS;
  if (fx < -0.6 || fy < -0.6 || fx > N + 0.6 || fy > N + 0.6) return null;
  const w = shW(sh), h = shH(sh);
  const ox = Math.max(0, Math.min(N - w, Math.round(fx - w / 2))), oy = Math.max(0, Math.min(N - h, Math.round(fy - h / 2)));
  return { ox, oy };
}
const inBox = (r: { x: number; y: number; w: number; h: number }, x: number, y: number) => x >= r.x - 0.01 && x <= r.x + r.w + 0.01 && y >= r.y - 0.01 && y <= r.y + r.h + 0.01;

function swap(s: BGState) {
  if (s.phase !== 'play' || s.left < 2) return void ev(s, 'nope', 2, 8.6, '바꿀 조각이 없어요');
  [s.cur, s.nx[0]] = [s.nx[0], s.cur];
  s.swapT = s.t;
  ev(s, 'swap', 2.5, 8.9, '휙!');
  see(s, 'swap', '🔄 지금 조각을 톡 = 다음 조각과 맞바꾸기');
  checkStuck(s);
}

function checkStuck(s: BGState) {
  const canCur = anyFit(s.b, s.cur.sh), canNext = s.left >= 2 && anyFit(s.b, s.nx[0].sh);
  s.stuck = !canCur && canNext;
  if (!canCur && !canNext && STAGES[s.stage].rescue && anyFit(s.b, 0)) {
    s.cur = { sh: 0, tint: s.cur.tint };
    s.stuck = false;
    ev(s, 'rescue', 2.5, 8.9, '두더지가 작은 모종으로 바꿔 줬어요!');
    return;
  }
  if (!canCur && !canNext) endStage(s, false, '밭에 놓을 데가 없어요');
}

function place(s: BGState, sx: number, sy: number) {
  if (s.phase !== 'play') return;
  const sh = s.cur.sh, p = placeAt(sh, sx, sy);
  if (!p) return; // 밭 밖에서 떼면 취소
  if (!fits(s.b, sh, p.ox, p.oy)) return void ev(s, 'nope', p.ox + shW(sh) / 2, p.oy + shH(sh) / 2, '자리가 없어요');
  const d = STAGES[s.stage];
  const pre = s.b.k.slice();
  const r = applyMove(s.b, sh, p.ox, p.oy, s.bee, true);
  for (const [dx, dy] of cellsOf(sh)) {
    const i = (p.oy + dy) * N + p.ox + dx;
    if (sh !== CAN) (s.tint[i] = s.cur.tint), (s.drop[i] = s.t);
  }
  s.left--;
  s.used++;
  s.lastPlace = s.t;
  s.firstPlace = true;
  const cx = p.ox + shW(sh) / 2, cy = p.oy + shH(sh) / 2;
  if (sh === CAN) ev(s, 'can', p.ox + 0.5, p.oy + 0.5, '촤아아~ 🚿'), see(s, 'can', '🚿 물뿌리개는 아무 칸에나! 그 칸의 가로·세로가 통째로 펴요');
  else ev(s, 'place', cx, cy, undefined, cellsOf(sh).length);
  if (r.lines) {
    const mult = multOf(r.lines, s.streak), gain = gainOf(r, s.streak);
    s.flowers += gain;
    s.streak++;
    s.best = Math.max(s.best, s.streak);
    s.multi = Math.max(s.multi, r.lines);
    if (sh === CAN) s.canBest = Math.max(s.canBest, r.seeds + r.gold);
    s.goldGot += r.gold;
    for (let k = 0; k < r.cells.length; k++) {
      const i = r.cells[k], kd = r.kinds[k];
      if (kd === STONE && s.b.k[i] === STONE) continue; // 금만 감
      s.blooms.push({ x: i % N, y: Math.floor(i / N), tint: kd === GOLD ? 7 : kd === WEED ? 8 : kd === STONE ? 10 : s.tint[i], kind: kd, t: s.t, big: r.lines });
    }
    if (s.blooms.length > 140) s.blooms.splice(0, s.blooms.length - 140);
    for (const y of r.rows) ev(s, 'line', 3.5, y + 0.5, undefined, 0);
    for (const x of r.cols) ev(s, 'line', x + 0.5, 3.5, undefined, 1);
    ev(s, r.lines >= 2 ? 'multi' : 'bloom', cx, cy, `꽃 +${gain}${mult > 1 ? ` ×${mult}` : ''}`, r.lines);
    see(s, 'bloom', '🌸 한 줄이 꽉 차면 꽃이 활짝 피며 사라져요');
    if (r.lines >= 2) see(s, 'multi', '🎆 두 줄 이상 한꺼번에 = 꽃가루 폭죽!');
    if (s.streak >= 2) ev(s, 'combo', 3.5, 2.2, `콤보 ${s.streak}연속!`, s.streak), see(s, 'combo', '🔥 놓을 때마다 연달아 지우면 콤보 — 꽃이 ×2, ×3!');
    if (r.hits) {
      for (let k = 0; k < r.cells.length; k++)
        if (r.kinds[k] === STONE) ev(s, s.b.k[r.cells[k]] === STONE ? 'crack' : 'break', (r.cells[k] % N) + 0.5, Math.floor(r.cells[k] / N) + 0.5, s.b.k[r.cells[k]] === STONE ? '쩍!' : '와장창!');
    }
    if (r.weeds) for (let k = 0; k < r.cells.length; k++) if (r.kinds[k] === WEED) ev(s, 'weedpull', (r.cells[k] % N) + 0.5, Math.floor(r.cells[k] / N) + 0.5, '으악!');
    if (r.gold) for (let k = 0; k < r.cells.length; k++) if (r.kinds[k] === GOLD) ev(s, 'gold', (r.cells[k] % N) + 0.5, Math.floor(r.cells[k] / N) + 0.5, '황금 꽃! ★');
    if (r.bee) {
      const old = s.bee;
      let nb = Math.floor(s.rng() * (2 * N - 1));
      if (nb >= old) nb++;
      s.bee = nb;
      s.beeHits++;
      ev(s, 'bee', old < N ? 3.5 : old - N + 0.5, old < N ? old + 0.5 : 3.5, `꿀벌 줄! 꽃 두 배 🐝`);
    }
    (s.mood = r.lines >= 2 || s.streak >= 2 ? 4 : 3), (s.moodT = r.lines >= 2 || s.streak >= 2 ? 80 + 20 * Math.min(4, r.lines + s.streak) : 50), (s.power = r.lines + s.streak - 1);
  } else {
    if (s.streak >= 2) ev(s, 'break', 3.5, 2.2, '콤보 끊김…');
    s.streak = 0;
    if (s.moodT <= 0 || s.mood <= 2) (s.mood = 1), (s.moodT = 18);
  }
  // 잡초가 번진다 · 황금 씨앗이 시든다
  if (d.weedEvery) {
    s.weedTick++;
    if (s.weedTick % d.weedEvery === 0) spread(s);
  }
  if (d.goldLife) {
    const out: number[] = [];
    if (wilt(s.b, s.tint, out)) {
      s.goldLost += out.length;
      for (const i of out) ev(s, 'wilt', (i % N) + 0.5, Math.floor(i / N) + 0.5, '시들었다…');
    }
  }
  void pre;
  // 다음 조각
  s.cur = s.nx[0];
  s.nx = [s.nx[1], drawPiece(s)];
  if (s.flowers >= d.goal) return endStage(s, true, '');
  if (s.left <= 0) return endStage(s, false, '모종이 다 떨어졌어요');
  checkStuck(s);
}

function spread(s: BGState) {
  const cand: number[][] = [];
  for (let i = 0; i < NN; i++) {
    if (s.b.k[i] !== WEED) continue;
    const x = i % N, y = Math.floor(i / N);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const X = x + dx, Y = y + dy;
      if (X >= 0 && Y >= 0 && X < N && Y < N && s.b.k[Y * N + X] === EMPTY) cand.push([i, Y * N + X]);
    }
  }
  if (!cand.length) return;
  const [from, to] = cand[Math.floor(s.rng() * cand.length)];
  s.b.k[to] = WEED;
  s.drop[to] = s.t;
  ev(s, 'spread', (to % N) + 0.5, Math.floor(to / N) + 0.5, '히히 번졌다', from);
}

export const blockgarden: GameDef<BGState> = {
  id: 'blockgarden',
  name: '블록 꽉꽉 정원',
  genes: ['linefill', 'tiles', 'combo'],
  twist: '꽃 목표를 채우는 순간 밭이 끝나서, 돌 깨기·잡초 뽑기·황금 씨앗 같은 판마다의 숙제를 목표보다 "먼저" 해야 한다 — 그리고 물뿌리개는 꽉 찬 칸 위에도 놓여 그 칸의 가로·세로를 통째로 피운다',
  rules: [
    '밭을 누르면 놓일 자리가 보이고, 떼면 꽃모종 조각이 심겨요 (지금 조각을 톡 = 다음 조각과 바꾸기).',
    '가로·세로 한 줄이 꽉 차면 꽃이 활짝 피며 사라져요 — 연달아 피우면 콤보, 놓을 데가 없으면 실패!',
  ],
  controls: 'touch',
  hint: '밭을 누르면 미리 보기, 떼면 심기 · 지금 조각 톡 = 바꾸기 / 화살표 + 스페이스',
  aspect: A,
  art: {
    concept: '담장 텃밭 디오라마 — 두더지 정원사의 꽃모종 심기',
    mood: '햇살 드는 벽돌 담장 아래 나무 틀 텃밭. 촉촉한 흙에 꽃모종 묶음을 꾹꾹 심으면 한 줄이 꽉 찰 때 봉오리가 한꺼번에 활짝 터지고, 밀짚모자 두더지 정원사가 모종 상자 옆에서 만세를 부르며 춤춘다. 담장 위 참새들과 꿀벌이 구경한다.',
    palette: { bg: '#3d6b3a', ink: '#fffaf0', muted: '#d8e8c8', accent: '#ffd84a', hot: '#ff6b6b', soft: '#f6efd8' },
  },
  reveals: (s) => s.seen.size,
  create(seed) {
    const rng = mulberry32(seed);
    const flips = STAGES.map(() => Math.floor(rng() * 4));
    const s = {
      rng, seed, t: 0, stage: 0, phase: 'play', pt: 0,
      b: { k: new Int8Array(NN), hp: new Int8Array(NN) }, tint: new Int8Array(NN), drop: new Int16Array(NN),
      cur: { sh: 0, tint: 0 }, nx: [], drawn: 0,
      left: 0, used: 0, flowers: 0, streak: 0, best: 0, multi: 0, canBest: 0, bee: -1, beeHits: 0, weedTick: 0, stones0: 0, gold0: 0, goldGot: 0, goldLost: 0, weeds0: 0,
      hearts: 3, stars: 0, got: 0, starOk: [false, false, false], pts: 0, ok: false, why: '',
      down: false, press: 0, aim: null, seen: new Set<string>(), newsQ: [], news: null, events: [],
      dead: false, won: false, again: false, tries: 0, firstPlace: false, lastPlace: 0, flips,
      blooms: [], mood: 0, moodT: 0, power: 0, swapT: -999, stuck: false,
    } as BGState;
    newStage(s);
    return s;
  },
  step(s, inp: Input) {
    s.t++;
    s.pt++;
    // 누르고 있는 동안 미리 보기, 떼면 심기. '지금 조각' 상자를 누르면 바꾸기 (누른 순간 한 번)
    const p = inp.pointer ?? null;
    if (p) {
      const x = p.x, y = p.y * A;
      if (!s.down) {
        s.down = true;
        s.press = inBox(CUR, x, y) || inBox(NXT[0], x, y) ? 2 : 1;
        if (s.press === 2) swap(s);
      }
      s.aim = { x, y };
    } else if (s.down) {
      s.down = false;
      if (s.press === 1 && s.aim) place(s, s.aim.x, s.aim.y);
      s.aim = null;
      s.press = 0;
    }
    s.events = s.events.filter((e) => s.t - e.t < 110);
    if (!s.news || s.t - s.news.t > NEWS_T) s.news = s.newsQ.length ? { text: s.newsQ.shift()!, t: s.t } : s.news;
    if (s.moodT > 0 && --s.moodT === 0) s.mood = 0;
    if (s.blooms.length && s.t - s.blooms[0].t > 90) s.blooms = s.blooms.filter((b) => s.t - b.t < 90);
    if (s.phase === 'result') {
      if (s.pt >= (s.ok ? RESULT_OK : RESULT_FAIL)) {
        if (s.ok) {
          if (s.won) s.dead = true;
          else (s.again = false), s.stage++, newStage(s);
        } else if (s.hearts <= 0) s.dead = true;
        else (s.again = true), newStage(s);
      }
    }
  },
  over: (s) => s.dead,
  score: (s) => s.pts,
  draw(ctx, s, w, h, th: Theme) {
    drawAll(ctx, s, w, h, th);
  },
};

/** 스크립트에서 특정 판부터 재 볼 때 */
export function startAt(s: BGState, stage: number) {
  s.stage = stage;
  newStage(s);
}

// ───────────────────────────── 봇 ─────────────────────────────
const NO: Input = { tap: false, dir: 0, pointer: null };
const ptr = (x: number, y: number): Input => ({ tap: false, dir: 0, pointer: { x, y: y / A } });
/** (ox, oy)에 놓으려면 누를 화면 자리 */
const aimFor = (sh: number, ox: number, oy: number) => ptr(BX + (ox + shW(sh) / 2) * CS, BY + (oy + shH(sh) / 2) * CS);
const THINK = 42;

/** 봇의 저울 (실험용으로 밖에서 바꿀 수 있게) */
export const TUNE = { fw: 900, sw: 1800, spw: 9000, perMove: 10, reserve: 1, depth2: 16, mix: 0.75, ew: 120, hole: 900, rough: 45, conv: 120, open: 300, swap: 1 };
const fillRow = (b: Board, y: number) => { let n = 0; for (let x = 0; x < N; x++) if (b.k[y * N + x] !== EMPTY) n++; return n; };
const fillCol = (b: Board, x: number) => { let n = 0; for (let y = 0; y < N; y++) if (b.k[y * N + x] !== EMPTY) n++; return n; };
/** 판의 생김새 점수: 빈 칸·구멍·큰 조각이 들어갈 자리·울퉁불퉁함·잡초 */
function shapeValue(b: Board) {
  let empt = 0, holes = 0, rough = 0, weeds = 0, weedEdge = 0;
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) {
      const i = y * N + x, e = b.k[i] === EMPTY;
      if (b.k[i] === WEED) {
        weeds++;
        if (x > 0 && b.k[i - 1] === EMPTY) weedEdge++;
        if (x < N - 1 && b.k[i + 1] === EMPTY) weedEdge++;
        if (y > 0 && b.k[i - N] === EMPTY) weedEdge++;
        if (y < N - 1 && b.k[i + N] === EMPTY) weedEdge++;
      }
      if (!e) continue;
      empt++;
      let nb = 0;
      if (x > 0 && b.k[i - 1] === EMPTY) nb++;
      if (x < N - 1 && b.k[i + 1] === EMPTY) nb++;
      if (y > 0 && b.k[i - N] === EMPTY) nb++;
      if (y < N - 1 && b.k[i + N] === EMPTY) nb++;
      if (nb === 0) holes++;
      if (x < N - 1 && b.k[i + 1] !== EMPTY) rough++;
      if (x > 0 && b.k[i - 1] !== EMPTY) rough++;
      if (y < N - 1 && b.k[i + N] !== EMPTY) rough++;
      if (y > 0 && b.k[i - N] !== EMPTY) rough++;
    }
  let v = empt * TUNE.ew - holes * TUNE.hole - rough * TUNE.rough - weeds * 1600 - weedEdge * 250;
  for (let k = 0; k < N; k++) {
    const fr = fillRow(b, k), fc = fillCol(b, k);
    v += (fr * fr + fc * fc) * TUNE.conv - ((fr > 0 && fr < N ? 1 : 0) + (fc > 0 && fc < N ? 1 : 0)) * TUNE.open;
  }
  if (anyFit(b, 32)) v += 1500;
  if (anyFit(b, 24)) v += 600;
  if (anyFit(b, 25)) v += 600;
  if (empt < 22) v -= (22 - empt) * 900;
  return v;
}

interface SimS { b: Board; streak: number; best: number; multi: number; canBest: number; flowers: number; goldGot: number; goldLost: number; beeHits: number; bee: number; left: number }
function simMove(S: SimS, sh: number, ox: number, oy: number, d: StageDef): { S: SimS; gain: number } {
  const b = cloneB(S.b);
  const r = applyMove(b, sh, ox, oy, S.bee, false);
  const T: SimS = { ...S, b, left: S.left - 1 };
  const gain = gainOf(r, S.streak);
  if (r.lines) {
    T.flowers += gain;
    T.streak = S.streak + 1;
    T.best = Math.max(S.best, T.streak);
    T.multi = Math.max(S.multi, r.lines);
    if (sh === CAN) T.canBest = Math.max(S.canBest, r.seeds + r.gold);
    T.goldGot += r.gold;
    if (r.bee) (T.beeHits++, (T.bee = -2)); // 꿀벌은 어디로 갈지 모른다
  } else T.streak = 0;
  if (d.goldLife) T.goldLost += wilt(b, null);
  return { S: T, gain };
}
/** 숙제가 얼마나 됐나 (단위: 돌 한 번 맞히기 · 잡초 하나 · 황금 하나 · 꿀벌 줄 한 번 ≈ 1) — 다 찬 줄에 가까울수록 조금 더 */
function chores(s: BGState, T: SimS, d: StageDef, queue: number[]) {
  const b = T.b;
  let u = 0;
  const near = (i: number) => {
    const f = Math.max(fillRow(b, Math.floor(i / N)), fillCol(b, i % N));
    return f >= 5 ? (f - 4) * 0.08 : 0;
  };
  if (d.star3 === 'stones' || d.star3 === 'all') {
    let hp = 0;
    for (let i = 0; i < NN; i++) if (b.k[i] === STONE && b.hp[i] > 0 && b.hp[i] <= 2 && !isWither(s, T, i)) (hp += b.hp[i]), (u += near(i));
    u += s.stones0 * 2 - hp;
  }
  if (d.star3 === 'weeds') {
    for (let i = 0; i < NN; i++) if (b.k[i] === WEED) u -= 1.2 - near(i);
  }
  if (d.star3 === 'gold' || d.star3 === 'all') {
    u += T.goldGot * 1.3 - T.goldLost * 3;
    for (let i = 0; i < NN; i++) if (b.k[i] === GOLD) u += near(i) * (b.hp[i] <= 3 ? 2.5 : 1);
  }
  if (d.star3 === 'bee') {
    u += Math.min(2, T.beeHits) * 1.2;
    if (T.bee >= 0) {
      const f = T.bee < N ? fillRow(b, T.bee) : fillCol(b, T.bee - N);
      u += f >= 4 ? (f - 3) * 0.1 : 0;
    }
  }
  if (d.star3 === 'combo3') u += Math.min(3, Math.max(T.best, T.streak)) * 0.6;
  if (d.star3 === 'multi') u += T.multi >= 2 ? 1 : 0;
  if (d.star3 === 'can') {
    u += Math.min(10, T.canBest) * 0.25;
    if (T.canBest < 10 && queue.includes(CAN)) {
      let bx = 0;
      for (let i = 0; i < NN; i++) {
        const y = Math.floor(i / N), x = i % N;
        let c = 0;
        for (let k = 0; k < N; k++) (c += b.k[y * N + k] === SEED || b.k[y * N + k] === GOLD ? 1 : 0), (c += k !== y && (b.k[k * N + x] === SEED || b.k[k * N + x] === GOLD) ? 1 : 0);
        bx = Math.max(bx, c);
      }
      u += Math.min(10, bx) * 0.12;
    }
  }
  return u;
}
/** 시든 황금(돌처럼 남은 칸)인가 — 시뮬레이션에서는 처음 판의 돌 자리로 가린다 */
function isWither(s: BGState, T: SimS, i: number) {
  return T.b === s.b ? s.tint[i] === WITHER : s.tint[i] === WITHER || (s.b.k[i] === GOLD && T.b.k[i] === STONE);
}
const estMoves = (need: number) => Math.ceil(need / TUNE.perMove);
/** 판을 끝낸 값(별) 또는 계속할 때의 값. phaseA = 숙제가 남았고 아직 여유가 있다 → 숙제 전에 목표를 채우지 않는다 */
function valueOf(s: BGState, T: SimS, queueNext: number[], phaseA: boolean): number {
  const d = STAGES[s.stage];
  if (T.flowers >= d.goal) {
    const sp = special({ ...T, tint: undefined, gold0: s.gold0, weeds0: s.weeds0, stones0: s.stones0 }, d);
    if (phaseA && !sp.done) return -3e6 + T.flowers;
    return 1e7 + 1e6 * (1 + (T.left >= d.spare ? 1 : 0) + (sp.done ? 1 : 0)) + T.left * 1e4;
  }
  if (T.left <= 0) return -1e7;
  if (queueNext.length && !queueNext.some((sh) => anyFit(T.b, sh))) return -5e6;
  const behind = Math.max(0, estMoves(d.goal - T.flowers) - T.left + 1);
  return Math.min(T.flowers, d.goal) * TUNE.fw + T.streak * TUNE.sw + shapeValue(T.b) + chores(s, T, d, queueNext) * TUNE.spw * (phaseA ? 1 : 0.25) - behind * 6000;
}

function placements(b: Board, sh: number) {
  const out: number[] = [];
  if (sh === CAN) {
    for (let i = 0; i < NN; i++) out.push(i);
    return out;
  }
  const w = shW(sh), h = shH(sh);
  for (let oy = 0; oy + h <= N; oy++) for (let ox = 0; ox + w <= N; ox++) if (fits(b, sh, ox, oy)) out.push(oy * N + ox);
  return out;
}

/** 두 수 앞까지 내다본다: 지금 조각(또는 바꾼 조각)을 어디에 → 그다음 조각(또는 다음다음)을 어디에 */
function plan(s: BGState): { swap: boolean; ox: number; oy: number } | null {
  const d = STAGES[s.stage];
  const q = [s.cur.sh, ...s.nx.map((p) => p.sh)].slice(0, Math.max(1, s.left));
  const S0: SimS = { b: s.b, streak: s.streak, best: s.best, multi: s.multi, canBest: s.canBest, flowers: s.flowers, goldGot: s.goldGot, goldLost: s.goldLost, beeHits: s.beeHits, bee: s.bee, left: s.left };
  const sp0 = special(s, d);
  const phaseA = !sp0.done && sp0.can && s.left - 1 > estMoves(d.goal - s.flowers) + TUNE.reserve;
  const opts: { swap: boolean; sh: number; rest: number[] }[] = [{ swap: false, sh: q[0], rest: q.slice(1) }];
  if (TUNE.swap && q.length >= 2 && q[1] !== q[0]) opts.push({ swap: true, sh: q[1], rest: [q[0], ...q.slice(2)] });
  const first: { o: (typeof opts)[0]; pos: number; S: SimS; v: number }[] = [];
  for (const o of opts)
    for (const pos of placements(s.b, o.sh)) {
      const { S } = simMove(S0, o.sh, pos % N, Math.floor(pos / N), d);
      first.push({ o, pos, S, v: valueOf(s, S, o.rest.slice(0, 2), phaseA) });
    }
  if (!first.length) return null;
  first.sort((a, b) => b.v - a.v);
  let best = first[0], bv = -Infinity;
  for (const f of first.slice(0, TUNE.depth2)) {
    let v = f.v;
    if (f.S.flowers < d.goal && f.o.rest.length && f.S.left > 0) {
      let v2 = -Infinity;
      const rest = f.o.rest.slice(0, 2);
      for (let k = 0; k < (TUNE.swap ? rest.length : 1); k++) {
        const sh2 = rest[k], rest2 = rest.filter((_, j) => j !== k);
        for (const pos of placements(f.S.b, sh2)) {
          const { S } = simMove(f.S, sh2, pos % N, Math.floor(pos / N), d);
          const vv = valueOf(s, S, rest2, phaseA);
          if (vv > v2) v2 = vv;
        }
      }
      v = v2 === -Infinity ? -5e6 : (1 - TUNE.mix) * f.v + TUNE.mix * v2;
    }
    if (v > bv) (bv = v), (best = f);
  }
  return { swap: best.o.swap, ox: best.pos % N, oy: Math.floor(best.pos / N) };
}

const brain = new WeakMap<object, { key: string; m: { swap: boolean; ox: number; oy: number } | null; k: number; want?: number }>();
/** 봇: 사람처럼 잠깐 생각하고, 두 수 앞(바꾸기 포함)을 내다봐 가장 좋은 자리에 꾹 눌렀다 뗀다 */
export const blockgardenSmart: Bot<BGState> = {
  name: '정원사 할머니',
  act(s) {
    if (s.phase !== 'play') return NO;
    if (s.pt < 50 || s.t - s.lastPlace < THINK || s.t - s.swapT < 12) return NO;
    const key = `${s.stage}:${s.tries}:${s.used}:${s.cur.sh}:${s.nx[0]?.sh}`;
    let m = brain.get(s);
    if (!m || m.key !== key) {
      // 바꾸기 직후: 바꾸기 전에 세운 계획(바꾼 조각을 어디에)을 그대로 쓴다
      const keep = m && m.m && m.m.swap && m.want === s.cur.sh && fits(s.b, s.cur.sh, m.m.ox, m.m.oy);
      const pl = keep ? { swap: false, ox: m!.m!.ox, oy: m!.m!.oy } : plan(s);
      brain.set(s, (m = { key, m: pl, k: 0, want: pl && pl.swap ? s.nx[0].sh : undefined }));
    }
    return press(m, s);
  },
};
/** 계획대로 두 번 눌렀다가(미리 보기) 뗀다. 바꾸기면 지금 조각 상자를 톡 */
function press(m: { m: { swap: boolean; ox: number; oy: number } | null; k: number }, s: BGState): Input {
  if (!m.m) return NO;
  m.k++;
  if (m.k >= 3) return NO;
  if (m.m.swap) return ptr(CUR.x + CUR.w / 2, CUR.y + CUR.h / 2);
  return aimFor(s.cur.sh, m.m.ox, m.m.oy);
}

/** 버릇 봇: 늘 '가장 위·가장 왼쪽 빈자리'에 놓는다 (바꾸기 안 씀) — 전략 깊이 재기용 (브리프 13) */
export const blockgardenHabit: Bot<BGState> = {
  name: '왼쪽 위부터',
  act(s) {
    if (s.phase !== 'play') return NO;
    if (s.pt < 50 || s.t - s.lastPlace < THINK) return NO;
    const key = `${s.stage}:${s.tries}:${s.used}:${s.cur.sh}`;
    let m = brain.get(s);
    if (!m || m.key !== key) {
      const ps = placements(s.b, s.cur.sh);
      const pos = s.cur.sh === CAN ? 0 : ps[0];
      brain.set(s, (m = { key, m: pos === undefined ? { swap: true, ox: 0, oy: 0 } : { swap: false, ox: pos % N, oy: Math.floor(pos / N) }, k: 0 }));
    }
    return press(m, s);
  },
};

/** 버릇 봇 2: 늘 '지금 가장 많이 지우는 자리'(같으면 왼쪽 위) — 더 그럴듯한 버릇 */
export const blockgardenGreedy: Bot<BGState> = {
  name: '지금 많이',
  act(s) {
    if (s.phase !== 'play') return NO;
    if (s.pt < 50 || s.t - s.lastPlace < THINK) return NO;
    const key = `${s.stage}:${s.tries}:${s.used}:${s.cur.sh}`;
    let m = brain.get(s);
    if (!m || m.key !== key) {
      let bp = -1, bl = -1;
      for (const pos of placements(s.b, s.cur.sh)) {
        const b = cloneB(s.b), r = applyMove(b, s.cur.sh, pos % N, Math.floor(pos / N), s.bee, false);
        const sc = r.lines * 100 + r.seeds;
        if (sc > bl) (bl = sc), (bp = pos);
      }
      brain.set(s, (m = { key, m: bp < 0 ? { swap: true, ox: 0, oy: 0 } : { swap: false, ox: bp % N, oy: Math.floor(bp / N) }, k: 0 }));
    }
    return press(m, s);
  },
};

const dumbMem = new WeakMap<object, { next: number; hold: number; x: number; y: number }>();
/** 봇: 아무 데나, 아무 때나 꾹 눌렀다 뗀다 (대개 밭 위, 가끔 조각 상자) */
export const blockgardenRandom: Bot<BGState> = {
  name: '아무 데나 콕',
  act(s, rng) {
    let m = dumbMem.get(s);
    if (!m) dumbMem.set(s, (m = { next: s.t + 20 + Math.floor(rng() * 60), hold: 0, x: 0, y: 0 }));
    if (m.hold > 0) {
      m.hold--;
      return m.hold > 0 ? ptr(m.x, m.y) : NO;
    }
    if (s.t < m.next) return NO;
    m.next = s.t + 25 + Math.floor(rng() * 80);
    const u = rng();
    if (u < 0.08) (m.x = CUR.x + rng() * CUR.w), (m.y = CUR.y + rng() * CUR.h);
    else if (u < 0.13) (m.x = rng()), (m.y = rng() * A);
    else (m.x = BX + rng() * N * CS), (m.y = BY + rng() * N * CS);
    m.hold = 2 + Math.floor(rng() * 6);
    return ptr(m.x, m.y);
  },
};

// ───────────────────────────── 그리기 ─────────────────────────────
const hsh = (k: number) => {
  const x = Math.sin(k * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
/** 꽃모종 색 6가지: 화분 윗면 · 옆면 · 봉오리 · 꽃잎 */
const TINT = [
  { top: '#ffc6d6', side: '#d9708f', bud: '#ff4f81', petal: '#ff8fb3' },
  { top: '#ffe7a0', side: '#d6a11e', bud: '#ffc61a', petal: '#ffdc4a' },
  { top: '#d9c8ff', side: '#8a6bd6', bud: '#8a55f0', petal: '#b18cff' },
  { top: '#ffd0a6', side: '#de8238', bud: '#ff7a1a', petal: '#ffa65a' },
  { top: '#ffb0a8', side: '#cf5a52', bud: '#f0352f', petal: '#ff6b5e' },
  { top: '#b8e2ff', side: '#4f93cf', bud: '#2f86f0', petal: '#6fb4ff' },
];
const SPECIAL_PETAL: Record<number, string> = { 7: '#ffd43b', 8: '#5aa83a', 10: '#b9b3a8' };
const recentSay = new WeakMap<object, { x: number; y: number; t: number }[]>();

function star(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath();
  for (let k = 0; k < 10; k++) {
    const a = -Math.PI / 2 + (k * Math.PI) / 5, rr = k % 2 ? r * 0.45 : r;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
}

/** 활짝 핀 꽃 한 송이 (꽃잎 다섯 + 노란 가운데) */
function flower(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, petal: string, rot: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.fillStyle = petal;
  for (let k = 0; k < 5; k++) {
    const a = (k / 5) * Math.PI * 2;
    ctx.beginPath();
    ctx.ellipse(Math.cos(a) * r * 0.55, Math.sin(a) * r * 0.55, r * 0.5, r * 0.32, a, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = 'rgba(255,255,255,.45)';
  for (let k = 0; k < 5; k++) {
    const a = (k / 5) * Math.PI * 2;
    ctx.beginPath();
    ctx.ellipse(Math.cos(a) * r * 0.5, Math.sin(a) * r * 0.5, r * 0.22, r * 0.1, a, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#ffd23a';
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#e09a10';
  ctx.beginPath();
  ctx.arc(r * 0.06, r * 0.06, r * 0.14, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** 꽃모종 한 칸: 색 화분(윗면·옆면 두께) + 흙 + 잎 두 장 + 봉오리. open 0~1이면 봉오리가 벌어진다 */
function seedCell(ctx: CanvasRenderingContext2D, x: number, y: number, c: number, tint: number, t: number, i: number, lift: number, open: number, alpha = 1) {
  const T = TINT[tint % 6], d = c * 0.17, rr = c * 0.16;
  ctx.globalAlpha = alpha;
  ctx.fillStyle = 'rgba(40,20,5,.3)';
  ctx.beginPath();
  ctx.roundRect(x + c * 0.12, y + c * 0.16, c * 0.92, c * 0.9, rr);
  ctx.fill();
  const y0 = y - lift;
  ctx.fillStyle = T.side;
  ctx.beginPath();
  ctx.roundRect(x + 1.5, y0 + 1.5, c - 3, c - 3, rr);
  ctx.fill();
  const g = ctx.createLinearGradient(x, y0, x + c, y0 + c);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(0.18, T.top);
  g.addColorStop(1, T.top);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.roundRect(x + 1.5, y0 + 1.5, c - 3, c - 3 - d, rr);
  ctx.fill();
  // 흙
  ctx.fillStyle = '#6b4325';
  ctx.beginPath();
  ctx.ellipse(x + c * 0.5, y0 + c * 0.47, c * 0.3, c * 0.2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#8a5a33';
  ctx.beginPath();
  ctx.ellipse(x + c * 0.47, y0 + c * 0.43, c * 0.2, c * 0.11, 0, 0, Math.PI * 2);
  ctx.fill();
  // 잎 (살랑)
  const sw = Math.sin(t * 0.06 + i * 1.7) * 0.12;
  ctx.fillStyle = '#3f9a3a';
  for (const sd of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(x + c * 0.5 + sd * c * 0.15, y0 + c * 0.38, c * 0.16, c * 0.07, sd * 0.5 + sw, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#6cc552';
  for (const sd of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(x + c * 0.5 + sd * c * 0.13, y0 + c * 0.36, c * 0.09, c * 0.035, sd * 0.5 + sw, 0, Math.PI * 2);
    ctx.fill();
  }
  // 줄기 + 봉오리
  ctx.strokeStyle = '#3f9a3a';
  ctx.lineWidth = Math.max(1, c * 0.05);
  ctx.beginPath();
  ctx.moveTo(x + c * 0.5, y0 + c * 0.42);
  ctx.lineTo(x + c * 0.5 + sw * c * 0.3, y0 + c * 0.2);
  ctx.stroke();
  const bx = x + c * 0.5 + sw * c * 0.3, by = y0 + c * 0.18;
  if (open > 0.05) flower(ctx, bx, by, c * (0.14 + 0.2 * open), T.petal, i);
  else {
    ctx.fillStyle = T.bud;
    ctx.beginPath();
    ctx.moveTo(bx, by - c * 0.13);
    ctx.quadraticCurveTo(bx + c * 0.11, by - c * 0.02, bx, by + c * 0.06);
    ctx.quadraticCurveTo(bx - c * 0.11, by - c * 0.02, bx, by - c * 0.13);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.5)';
    ctx.beginPath();
    ctx.ellipse(bx - c * 0.025, by - c * 0.05, c * 0.02, c * 0.04, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

/** 돌 (hp 2 멀쩡 · 1 금 감) 또는 시든 황금 씨앗 */
function stoneCell(ctx: CanvasRenderingContext2D, x: number, y: number, c: number, hp: number, wither: boolean, i: number) {
  ctx.fillStyle = 'rgba(40,20,5,.32)';
  ctx.beginPath();
  ctx.ellipse(x + c * 0.56, y + c * 0.78, c * 0.44, c * 0.18, 0, 0, Math.PI * 2);
  ctx.fill();
  if (wither) {
    ctx.fillStyle = '#8c7a5c';
    ctx.beginPath();
    ctx.roundRect(x + 2, y + 2, c - 4, c - 4, c * 0.16);
    ctx.fill();
    ctx.fillStyle = '#a8977a';
    ctx.beginPath();
    ctx.roundRect(x + 2, y + 2, c - 4, c * 0.75, c * 0.16);
    ctx.fill();
    ctx.strokeStyle = '#5c4a30';
    ctx.lineWidth = Math.max(1, c * 0.05);
    ctx.beginPath();
    ctx.moveTo(x + c * 0.5, y + c * 0.55);
    ctx.quadraticCurveTo(x + c * 0.52, y + c * 0.3, x + c * 0.3, y + c * 0.32);
    ctx.moveTo(x + c * 0.5, y + c * 0.45);
    ctx.quadraticCurveTo(x + c * 0.6, y + c * 0.28, x + c * 0.72, y + c * 0.36);
    ctx.stroke();
    return;
  }
  const g = ctx.createRadialGradient(x + c * 0.38, y + c * 0.32, c * 0.05, x + c * 0.5, y + c * 0.5, c * 0.55);
  g.addColorStop(0, '#e9e6df');
  g.addColorStop(0.55, '#a9a49a');
  g.addColorStop(1, '#6e695f');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(x + c * 0.12, y + c * 0.7);
  ctx.quadraticCurveTo(x + c * 0.05, y + c * 0.25, x + c * 0.4, y + c * 0.12);
  ctx.quadraticCurveTo(x + c * 0.85, y + c * 0.05, x + c * 0.92, y + c * 0.5);
  ctx.quadraticCurveTo(x + c * 0.95, y + c * 0.85, x + c * 0.5, y + c * 0.86);
  ctx.quadraticCurveTo(x + c * 0.2, y + c * 0.88, x + c * 0.12, y + c * 0.7);
  ctx.fill();
  ctx.fillStyle = 'rgba(110,160,70,.7)';
  ctx.beginPath();
  ctx.ellipse(x + c * (0.3 + hsh(i) * 0.3), y + c * 0.62, c * 0.1, c * 0.05, 0.3, 0, Math.PI * 2);
  ctx.fill();
  if (hp <= 1) {
    ctx.strokeStyle = '#3a362f';
    ctx.lineWidth = Math.max(1.2, c * 0.05);
    ctx.beginPath();
    ctx.moveTo(x + c * 0.45, y + c * 0.12);
    ctx.lineTo(x + c * 0.52, y + c * 0.35);
    ctx.lineTo(x + c * 0.4, y + c * 0.5);
    ctx.lineTo(x + c * 0.55, y + c * 0.7);
    ctx.moveTo(x + c * 0.52, y + c * 0.35);
    ctx.lineTo(x + c * 0.75, y + c * 0.42);
    ctx.stroke();
  } else {
    ctx.fillStyle = 'rgba(255,255,255,.55)';
    ctx.beginPath();
    ctx.ellipse(x + c * 0.36, y + c * 0.28, c * 0.12, c * 0.06, -0.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** 잡초 녀석: 삐죽삐죽 + 심술궂은 얼굴 */
function weedCell(ctx: CanvasRenderingContext2D, x: number, y: number, c: number, t: number, i: number, lift: number) {
  const y0 = y - lift, sw = Math.sin(t * 0.09 + i) * 0.1;
  ctx.fillStyle = 'rgba(20,40,5,.3)';
  ctx.beginPath();
  ctx.ellipse(x + c * 0.55, y + c * 0.8, c * 0.42, c * 0.16, 0, 0, Math.PI * 2);
  ctx.fill();
  for (let k = 0; k < 7; k++) {
    const a = -Math.PI / 2 + (k - 3) * 0.38 + sw, len = c * (0.42 + 0.12 * hsh(i * 7 + k));
    ctx.fillStyle = k % 2 ? '#2f6b1f' : '#3f8a2a';
    ctx.beginPath();
    ctx.moveTo(x + c * 0.5 - c * 0.12, y0 + c * 0.8);
    ctx.lineTo(x + c * 0.5 + Math.cos(a) * len, y0 + c * 0.72 + Math.sin(a) * len);
    ctx.lineTo(x + c * 0.5 + c * 0.12, y0 + c * 0.8);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = '#2b5c1a';
  ctx.beginPath();
  ctx.ellipse(x + c * 0.5, y0 + c * 0.66, c * 0.3, c * 0.2, 0, 0, Math.PI * 2);
  ctx.fill();
  // 얼굴 (게슴츠레 눈 + 히죽)
  for (const sd of [-1, 1]) {
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(x + c * 0.5 + sd * c * 0.1, y0 + c * 0.62, c * 0.075, c * 0.06, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath();
    ctx.arc(x + c * 0.5 + sd * c * 0.1 + c * 0.02, y0 + c * 0.635, c * 0.035, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#163a0c';
    ctx.lineWidth = Math.max(1, c * 0.04);
    ctx.beginPath();
    ctx.moveTo(x + c * 0.5 + sd * c * 0.18, y0 + c * 0.53 - sd * c * 0.02);
    ctx.lineTo(x + c * 0.5 + sd * c * 0.03, y0 + c * 0.565 + sd * c * 0.02);
    ctx.stroke();
  }
  ctx.strokeStyle = '#ffe9a8';
  ctx.lineWidth = Math.max(1, c * 0.04);
  ctx.beginPath();
  ctx.arc(x + c * 0.52, y0 + c * 0.68, c * 0.1, 0.2, Math.PI - 0.6);
  ctx.stroke();
}

/** 황금 씨앗: 금빛 화분 + 반짝이는 새싹 + 시들기까지 남은 수 */
function goldCell(ctx: CanvasRenderingContext2D, x: number, y: number, c: number, life: number, t: number, i: number, font: (sz: number, wgt?: number) => void) {
  const d = c * 0.17, rr = c * 0.16;
  ctx.fillStyle = 'rgba(80,50,0,.3)';
  ctx.beginPath();
  ctx.roundRect(x + c * 0.12, y + c * 0.16, c * 0.92, c * 0.9, rr);
  ctx.fill();
  ctx.save();
  ctx.shadowColor = '#fff2a0';
  ctx.shadowBlur = c * 0.35 * (0.6 + 0.4 * Math.sin(t * 0.12 + i));
  ctx.fillStyle = '#b8860b';
  ctx.beginPath();
  ctx.roundRect(x + 1.5, y + 1.5, c - 3, c - 3, rr);
  ctx.fill();
  ctx.restore();
  const g = ctx.createLinearGradient(x, y, x + c, y + c);
  g.addColorStop(0, '#fffbe0');
  g.addColorStop(0.3, '#ffd84a');
  g.addColorStop(1, '#f0b020');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.roundRect(x + 1.5, y + 1.5, c - 3, c - 3 - d, rr);
  ctx.fill();
  ctx.fillStyle = '#7a5a1a';
  ctx.beginPath();
  ctx.ellipse(x + c * 0.5, y + c * 0.47, c * 0.26, c * 0.17, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffe14d';
  for (const sd of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(x + c * 0.5 + sd * c * 0.12, y + c * 0.33, c * 0.13, c * 0.06, sd * 0.6, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#ffffff';
  star(ctx, x + c * 0.5, y + c * 0.2, c * 0.12 * (1 + 0.25 * Math.sin(t * 0.2 + i)));
  ctx.fill();
  // 남은 수 배지
  const urgent = life <= 3;
  ctx.fillStyle = urgent ? '#e8402a' : '#3a2a10';
  ctx.beginPath();
  ctx.arc(x + c * 0.8, y + c * 0.2, c * 0.2 * (urgent ? 1 + 0.12 * Math.sin(t * 0.35) : 1), 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  font(0.036, 900);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(life), x + c * 0.8, y + c * 0.21);
}

/** 물뿌리개 (조각 상자·미리 보기용) */
function canIcon(ctx: CanvasRenderingContext2D, x: number, y: number, u: number, tilt: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(tilt);
  ctx.fillStyle = 'rgba(0,0,0,.25)';
  ctx.beginPath();
  ctx.ellipse(u * 0.1, u * 0.62, u * 0.7, u * 0.18, 0, 0, Math.PI * 2);
  ctx.fill();
  const g = ctx.createLinearGradient(0, -u * 0.5, 0, u * 0.6);
  g.addColorStop(0, '#9fe0ff');
  g.addColorStop(1, '#2f86c8');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.roundRect(-u * 0.5, -u * 0.35, u * 0.9, u * 0.9, u * 0.15);
  ctx.fill();
  ctx.strokeStyle = '#1f5f94';
  ctx.lineWidth = Math.max(1.5, u * 0.08);
  ctx.beginPath();
  ctx.arc(-u * 0.05, -u * 0.4, u * 0.32, Math.PI, 0);
  ctx.stroke();
  ctx.fillStyle = '#2f86c8';
  ctx.beginPath();
  ctx.moveTo(u * 0.35, u * 0.05);
  ctx.lineTo(u * 0.95, -u * 0.45);
  ctx.lineTo(u * 1.02, -u * 0.32);
  ctx.lineTo(u * 0.4, u * 0.25);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#d6f2ff';
  ctx.beginPath();
  ctx.ellipse(u * 0.99, -u * 0.42, u * 0.1, u * 0.16, -0.7, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.5)';
  ctx.fillRect(-u * 0.38, -u * 0.25, u * 0.12, u * 0.6);
  ctx.restore();
}

/** 두더지 정원사. mood 0 쉼 · 1 끄덕 · 2 땀 · 3 만세 · 4 춤 · 5 우쭐 · 6 벌러덩 */
function drawMole(ctx: CanvasRenderingContext2D, x: number, y: number, u: number, mood: number, t: number, power: number) {
  ctx.save();
  // 그림자
  ctx.fillStyle = 'rgba(40,25,5,.3)';
  ctx.beginPath();
  ctx.ellipse(x, y + u * 0.05, u * 1.0, u * 0.25, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.translate(x, y);
  let jump = 0, rot = 0, hatUp = 0, sc = 1;
  if (mood === 1) jump = Math.abs(Math.sin(t * 0.35)) * u * 0.12;
  if (mood === 3) jump = Math.abs(Math.sin(t * 0.25)) * u * 0.35;
  if (mood === 4) {
    const p = Math.min(4, Math.max(1, power));
    jump = Math.abs(Math.sin(t * 0.22)) * u * (0.35 + 0.15 * p);
    rot = Math.sin(t * 0.18) * (0.25 + 0.08 * p);
    hatUp = Math.abs(Math.sin(t * 0.11)) * u * (0.6 + 0.3 * p);
    sc = 1 + 0.06 * p;
  }
  if (mood === 5) jump = Math.abs(Math.sin(t * 0.1)) * u * 0.1;
  if (mood === 6) (rot = -Math.PI / 2 + Math.sin(t * 0.3) * 0.12), ctx.translate(u * 1.05, -u * 0.15);
  ctx.translate(0, -jump);
  ctx.rotate(rot);
  ctx.scale(sc, sc);
  const kick = mood === 6 ? Math.sin(t * 0.5) * 0.4 : 0;
  // 발
  ctx.fillStyle = '#f2a0b0';
  for (const sd of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(sd * u * 0.38, -u * 0.05 + (sd > 0 ? kick : -kick) * u * 0.3, u * 0.26, u * 0.12, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // 몸
  const g = ctx.createRadialGradient(-u * 0.25, -u * 0.95, u * 0.1, 0, -u * 0.6, u * 0.95);
  g.addColorStop(0, '#9c7a66');
  g.addColorStop(0.6, '#6e5040');
  g.addColorStop(1, '#4a3428');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(0, -u * 0.62, u * 0.66, u * 0.72, 0, 0, Math.PI * 2);
  ctx.fill();
  // 배
  ctx.fillStyle = '#c9a78a';
  ctx.beginPath();
  ctx.ellipse(0, -u * 0.4, u * 0.38, u * 0.36, 0, 0, Math.PI * 2);
  ctx.fill();
  // 앞치마 (초록)
  ctx.fillStyle = '#4f9a48';
  ctx.beginPath();
  ctx.moveTo(-u * 0.36, -u * 0.55);
  ctx.lineTo(u * 0.36, -u * 0.55);
  ctx.lineTo(u * 0.3, -u * 0.08);
  ctx.quadraticCurveTo(0, u * 0.02, -u * 0.3, -u * 0.08);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#ffd84a';
  ctx.beginPath();
  ctx.arc(0, -u * 0.32, u * 0.07, 0, Math.PI * 2);
  ctx.fill();
  // 팔 (만세·춤이면 위로)
  const up = mood === 3 || mood === 4 || mood === 5;
  ctx.strokeStyle = '#6e5040';
  ctx.lineCap = 'round';
  ctx.lineWidth = u * 0.2;
  for (const sd of [-1, 1]) {
    const wave = up ? Math.sin(t * 0.3 + sd) * 0.3 : 0;
    ctx.beginPath();
    ctx.moveTo(sd * u * 0.5, -u * 0.72);
    if (up) ctx.lineTo(sd * u * (0.85 + wave * 0.2), -u * (1.35 + wave * 0.2));
    else ctx.lineTo(sd * u * 0.78, -u * 0.38);
    ctx.stroke();
    ctx.fillStyle = '#f2a0b0';
    ctx.beginPath();
    if (up) ctx.arc(sd * u * (0.85 + wave * 0.2), -u * (1.38 + wave * 0.2), u * 0.13, 0, Math.PI * 2);
    else ctx.arc(sd * u * 0.8, -u * 0.34, u * 0.13, 0, Math.PI * 2);
    ctx.fill();
  }
  // 모종삽 (오른손)
  if (!up) {
    ctx.strokeStyle = '#8a5a2a';
    ctx.lineWidth = u * 0.08;
    ctx.beginPath();
    ctx.moveTo(u * 0.82, -u * 0.36);
    ctx.lineTo(u * 0.98, -u * 0.62);
    ctx.stroke();
    ctx.fillStyle = '#c9d2d8';
    ctx.beginPath();
    ctx.ellipse(u * 1.04, -u * 0.74, u * 0.09, u * 0.17, 0.5, 0, Math.PI * 2);
    ctx.fill();
  }
  // 얼굴: 큰 분홍 코 · 작은 눈
  const fy = -u * 0.98;
  ctx.fillStyle = '#ff8fa8';
  ctx.beginPath();
  ctx.ellipse(0, fy + u * 0.22, u * 0.17, u * 0.13, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.6)';
  ctx.beginPath();
  ctx.ellipse(-u * 0.05, fy + u * 0.18, u * 0.05, u * 0.03, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#2a1a10';
  ctx.fillStyle = '#2a1a10';
  ctx.lineWidth = Math.max(1.2, u * 0.06);
  const blink = mood === 0 && t % 170 < 7;
  for (const sd of [-1, 1]) {
    const ex = sd * u * 0.2, ey = fy;
    if (mood === 6) {
      ctx.beginPath();
      for (let k = 0; k < 10; k++) {
        const a = k * 0.8 + t * 0.3, r = (k / 10) * u * 0.1;
        ctx.lineTo(ex + Math.cos(a) * r, ey + Math.sin(a) * r);
      }
      ctx.stroke();
    } else if (mood === 3 || mood === 4) {
      ctx.beginPath();
      ctx.arc(ex, ey + u * 0.03, u * 0.07, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
    } else if (mood === 5) {
      ctx.beginPath();
      ctx.moveTo(ex - u * 0.07, ey);
      ctx.lineTo(ex + u * 0.07, ey);
      ctx.stroke();
    } else if (blink) {
      ctx.beginPath();
      ctx.moveTo(ex - u * 0.06, ey);
      ctx.lineTo(ex + u * 0.06, ey);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(ex, ey, u * (mood === 2 ? 0.07 : 0.05), 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // 입
  ctx.beginPath();
  if (mood === 3 || mood === 4) {
    ctx.fillStyle = '#c2405a';
    ctx.ellipse(0, fy + u * 0.4, u * 0.1, u * 0.08, 0, 0, Math.PI);
    ctx.fill();
  } else if (mood === 2 || mood === 6) {
    ctx.arc(0, fy + u * 0.45, u * 0.07, Math.PI * 1.15, Math.PI * 1.85);
    ctx.stroke();
  } else {
    ctx.arc(0, fy + u * 0.32, u * 0.08, 0.3, Math.PI - 0.3);
    ctx.stroke();
  }
  // 밀짚모자 (춤추면 하늘로)
  ctx.save();
  ctx.translate(0, fy - u * 0.32 - hatUp);
  ctx.rotate(mood === 4 ? t * 0.2 : mood === 5 ? -0.25 : 0);
  ctx.fillStyle = '#e8c068';
  ctx.beginPath();
  ctx.ellipse(0, 0, u * 0.62, u * 0.16, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#f2d488';
  ctx.beginPath();
  ctx.ellipse(0, -u * 0.12, u * 0.34, u * 0.22, 0, Math.PI, 0);
  ctx.fill();
  ctx.fillStyle = '#e05a5a';
  ctx.fillRect(-u * 0.34, -u * 0.1, u * 0.68, u * 0.08);
  ctx.fillStyle = '#ff9ec4';
  ctx.beginPath();
  ctx.arc(u * 0.22, -u * 0.1, u * 0.08, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // 땀
  if (mood === 2) {
    ctx.fillStyle = '#9fe3ff';
    for (const sd of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(sd * u * 0.62, fy - u * 0.05 + ((t * 0.6) % 14) * u * 0.02, u * 0.06, u * 0.1, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
  if (mood === 6)
    for (let k = 0; k < 3; k++) {
      const a = t * 0.12 + (k * Math.PI * 2) / 3;
      ctx.fillStyle = '#fff27a';
      star(ctx, x + u * 0.2 + Math.cos(a) * u * 0.5, y - u * 0.75 + Math.sin(a) * u * 0.18, u * 0.14);
      ctx.fill();
    }
}

/** 담장 위 참새 */
function sparrow(ctx: CanvasRenderingContext2D, x: number, y: number, u: number, face: number, hop: number, t: number, k: number) {
  ctx.save();
  ctx.translate(x, y - hop);
  ctx.scale(face, 1);
  ctx.fillStyle = 'rgba(0,0,0,.18)';
  ctx.beginPath();
  ctx.ellipse(0, hop + u * 0.05, u * 0.6, u * 0.12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#8a5a3a';
  ctx.beginPath();
  ctx.moveTo(-u * 0.5, -u * 0.35);
  ctx.lineTo(-u * 0.95, -u * 0.55);
  ctx.lineTo(-u * 0.9, -u * 0.3);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#b07a52';
  ctx.beginPath();
  ctx.ellipse(0, -u * 0.38, u * 0.55, u * 0.38, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#f2e2c8';
  ctx.beginPath();
  ctx.ellipse(u * 0.1, -u * 0.25, u * 0.35, u * 0.22, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#7a4a2a';
  ctx.beginPath();
  ctx.ellipse(-u * 0.12, -u * 0.42, u * 0.3, u * 0.16, 0.3 + (hop > 0 ? Math.sin(t * 0.8) * 0.6 : 0), 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#9a6844';
  ctx.beginPath();
  ctx.arc(u * 0.42, -u * 0.72, u * 0.27, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#5a3a24';
  ctx.beginPath();
  ctx.arc(u * 0.42, -u * 0.86, u * 0.2, Math.PI, 0);
  ctx.fill();
  ctx.fillStyle = '#f0a020';
  ctx.beginPath();
  ctx.moveTo(u * 0.66, -u * 0.74);
  ctx.lineTo(u * 0.88, -u * 0.68 + (hop > 0 ? u * 0.05 : 0));
  ctx.lineTo(u * 0.66, -u * 0.62);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#1a1a1a';
  ctx.beginPath();
  ctx.arc(u * 0.5, -u * 0.76, u * (hop > 0 ? 0.07 : 0.05), 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#6a4a2a';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(-u * 0.05, -u * 0.02);
  ctx.lineTo(-u * 0.05, u * 0.04);
  ctx.moveTo(u * 0.15, -u * 0.02);
  ctx.lineTo(u * 0.15, u * 0.04);
  ctx.stroke();
  ctx.restore();
  void k;
}

function bee(ctx: CanvasRenderingContext2D, x: number, y: number, u: number, t: number, face: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(face, 1);
  ctx.fillStyle = 'rgba(255,255,255,.75)';
  const fl = Math.sin(t * 1.3) * 0.4;
  ctx.beginPath();
  ctx.ellipse(-u * 0.1, -u * 0.45, u * 0.32, u * 0.2, -0.6 + fl, 0, Math.PI * 2);
  ctx.ellipse(u * 0.15, -u * 0.45, u * 0.28, u * 0.18, 0.5 - fl, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffcf2a';
  ctx.beginPath();
  ctx.ellipse(0, 0, u * 0.5, u * 0.36, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#2a2010';
  for (const sx of [-0.15, 0.12]) ctx.fillRect(u * sx - u * 0.06, -u * 0.34, u * 0.12, u * 0.68);
  ctx.beginPath();
  ctx.arc(u * 0.48, -u * 0.04, u * 0.18, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(u * 0.53, -u * 0.08, u * 0.06, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** 조각 상자 속 조각 (가운데 정렬) */
function pieceMini(ctx: CanvasRenderingContext2D, p: Piece, cx: number, cy: number, c: number, t: number, alpha: number) {
  if (p.sh === CAN) return canIcon(ctx, cx - c * 0.15, cy + c * 0.05, c * 0.9, Math.sin(t * 0.08) * 0.15);
  const w = shW(p.sh), h = shH(p.sh), x0 = cx - (w * c) / 2, y0 = cy - (h * c) / 2;
  for (const [dx, dy] of SHAPES[p.sh]) seedCell(ctx, x0 + dx * c, y0 + dy * c, c, p.tint, t, dx * 3 + dy * 7, 0, 0, alpha);
}

function drawAll(ctx: CanvasRenderingContext2D, s: BGState, w: number, h: number, th: Theme) {
  const fx = juice(s), X = (x: number) => x * w, R = X, t = s.t, d = STAGES[s.stage];
  const font = (sz: number, wgt = 800) => (ctx.font = `${wgt} ${R(sz)}px system-ui, sans-serif`);
  const c = R(CS);
  const CX = (x: number) => X(BX) + x * c, CY = (y: number) => X(BY) + y * c;
  const say = (x: number, y: number, text: string, col: string, size: number) => {
    let rec = recentSay.get(s);
    if (!rec) recentSay.set(s, (rec = []));
    for (let k = 0; k < 6 && rec.some((q) => s.t - q.t < 40 && Math.abs(q.x - x) < w * 0.25 && Math.abs(q.y - y) < size + 4); k++) y -= size + 4;
    rec.push({ x, y, t: s.t });
    if (rec.length > 14) rec.shift();
    fx.pop(Math.max(w * 0.14, Math.min(w * 0.86, x)), y, text, col, size);
  };
  // 최근 큰 사건 (참새·구경꾼 반응)
  let bigT = -999, bigN = 0;
  for (const e of s.events) if ((e.kind === 'multi' || e.kind === 'combo' || e.kind === 'clear') && e.t > bigT) (bigT = e.t), (bigN = e.n ?? 2);
  const bigAge = t - bigT;

  ctx.save();
  fx.begin(ctx);
  // ═════ 하늘 · 해 ═════
  const sky = ctx.createLinearGradient(0, 0, 0, X(0.2));
  sky.addColorStop(0, '#8fd3ff');
  sky.addColorStop(1, '#d8f2ff');
  ctx.fillStyle = sky;
  ctx.fillRect(-10, -10, w + 20, X(0.2) + 10);
  {
    const sx = X(0.86), sy = X(0.1);
    const sg = ctx.createRadialGradient(sx, sy, 2, sx, sy, X(0.16));
    sg.addColorStop(0, 'rgba(255,250,200,.95)');
    sg.addColorStop(0.3, 'rgba(255,240,150,.5)');
    sg.addColorStop(1, 'rgba(255,240,150,0)');
    ctx.fillStyle = sg;
    ctx.fillRect(sx - X(0.2), sy - X(0.2), X(0.4), X(0.4));
  }
  for (let k = 0; k < 3; k++) {
    const cx2 = ((k * 0.37 + t * 0.00012 * (1 + k * 0.3)) % 1.3) * w - X(0.15), cy2 = X(0.095 + k * 0.012);
    ctx.fillStyle = 'rgba(255,255,255,.85)';
    for (const [ox, oy, r] of [[0, 0, 0.03], [0.03, -0.012, 0.035], [0.065, 0, 0.028]]) {
      ctx.beginPath();
      ctx.arc(cx2 + X(ox), cy2 + X(oy), X(r), 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // ═════ 땅 (잔디 · 자갈길) ═════
  const gy0 = X(0.27);
  const grass = ctx.createLinearGradient(0, gy0, 0, h);
  grass.addColorStop(0, '#5f9a48');
  grass.addColorStop(1, '#3f7234');
  ctx.fillStyle = grass;
  ctx.fillRect(-10, gy0, w + 20, h - gy0 + 10);
  for (let k = 0; k < 70; k++) {
    const gx = hsh(k * 3.1) * w, gyy = gy0 + hsh(k * 7.7) * (h - gy0);
    ctx.strokeStyle = k % 3 ? 'rgba(140,200,100,.5)' : 'rgba(30,70,20,.4)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(gx, gyy);
    ctx.lineTo(gx - 2, gyy - 5);
    ctx.moveTo(gx + 2, gyy);
    ctx.lineTo(gx + 3, gyy - 6);
    ctx.stroke();
  }
  // 자갈길 (조각 상자 밑)
  ctx.fillStyle = '#d9c9a6';
  ctx.beginPath();
  ctx.roundRect(X(0.01), X(TRAY_Y - 0.005), w - X(0.02), X(TRAY_H + 0.03), X(0.04));
  ctx.fill();
  for (let k = 0; k < 60; k++) {
    ctx.fillStyle = k % 2 ? 'rgba(150,130,100,.5)' : 'rgba(255,250,235,.6)';
    ctx.beginPath();
    ctx.ellipse(X(0.03) + hsh(k * 5.3) * X(0.94), X(TRAY_Y + 0.005) + hsh(k * 9.1) * X(TRAY_H + 0.01), 2.2, 1.5, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // ═════ 벽돌 담장 ═════
  const wy0 = X(0.115), wy1 = X(0.285);
  ctx.fillStyle = '#b5654a';
  ctx.fillRect(-10, wy0, w + 20, wy1 - wy0);
  const bh = X(0.034), bw = X(0.1);
  for (let r = 0; wy0 + X(0.018) + r * bh < wy1; r++)
    for (let k = -1; k * bw < w + bw; k++) {
      const bx = k * bw + (r % 2 ? bw / 2 : 0), by = wy0 + X(0.018) + r * bh, hv = hsh(r * 17 + k * 3);
      ctx.fillStyle = `hsl(${12 + hv * 8}, ${45 + hv * 10}%, ${46 + hv * 10}%)`;
      ctx.fillRect(bx + 1, by + 1, bw - 2, bh - 2);
      ctx.fillStyle = 'rgba(255,220,190,.25)';
      ctx.fillRect(bx + 2, by + 1.5, bw * 0.6, 1.4);
    }
  // 담장 위 갓돌
  ctx.fillStyle = '#d8cfc0';
  ctx.fillRect(-10, wy0 - X(0.008), w + 20, X(0.024));
  ctx.fillStyle = '#a89c8a';
  ctx.fillRect(-10, wy0 + X(0.012), w + 20, X(0.006));
  // 담쟁이
  ctx.fillStyle = '#4f8f3a';
  for (let k = 0; k < 18; k++) {
    const vx = (k < 9 ? X(0.02) + hsh(k) * X(0.12) : w - X(0.14) + hsh(k) * X(0.12)), vy = wy0 + X(0.02) + hsh(k * 2.3) * (wy1 - wy0 - X(0.03));
    ctx.beginPath();
    ctx.ellipse(vx, vy, X(0.016), X(0.01), hsh(k * 4) * 3, 0, Math.PI * 2);
    ctx.fill();
  }
  // 담장 그림자 (밭 쪽으로)
  const shg = ctx.createLinearGradient(0, wy1, 0, wy1 + X(0.05));
  shg.addColorStop(0, 'rgba(30,40,10,.35)');
  shg.addColorStop(1, 'rgba(30,40,10,0)');
  ctx.fillStyle = shg;
  ctx.fillRect(-10, wy1, w + 20, X(0.05));
  // 참새 셋 (큰 사건에 폴짝)
  for (let k = 0; k < 3; k++) {
    const sx = X([0.24, 0.5, 0.74][k]), hop = bigAge < 50 ? Math.abs(Math.sin((bigAge + k * 6) * 0.25)) * X(0.04) * Math.min(3, bigN) * 0.5 : t % (240 + k * 50) < 10 ? Math.abs(Math.sin(t * 0.6)) * X(0.01) : 0;
    sparrow(ctx, sx, wy0 - X(0.004), X(0.04), k === 1 ? -1 : 1, hop, t, k);
  }

  // ═════ 나무 틀 텃밭 ═════
  const bx0 = X(BX), by0 = X(BY), bs = c * N, fr = X(0.026), ft = X(0.038);
  ctx.fillStyle = 'rgba(30,40,10,.4)';
  ctx.beginPath();
  ctx.roundRect(bx0 - fr + X(0.012), by0 - fr + X(0.02), bs + fr * 2, bs + fr * 2 + ft, X(0.02));
  ctx.fill();
  // 앞면 판자 (두께)
  const fg = ctx.createLinearGradient(0, by0 + bs, 0, by0 + bs + fr + ft);
  fg.addColorStop(0, '#9a6234');
  fg.addColorStop(1, '#6e4220');
  ctx.fillStyle = fg;
  ctx.beginPath();
  ctx.roundRect(bx0 - fr, by0 + bs, bs + fr * 2, fr + ft, [0, 0, X(0.016), X(0.016)]);
  ctx.fill();
  ctx.strokeStyle = 'rgba(60,30,10,.45)';
  ctx.lineWidth = 1;
  for (let k = 1; k < 3; k++) {
    ctx.beginPath();
    ctx.moveTo(bx0 - fr, by0 + bs + fr + (ft * k) / 3);
    ctx.lineTo(bx0 + bs + fr, by0 + bs + fr + (ft * k) / 3);
    ctx.stroke();
  }
  // 윗면 테두리
  ctx.fillStyle = '#c08a52';
  ctx.beginPath();
  ctx.roundRect(bx0 - fr, by0 - fr, bs + fr * 2, bs + fr * 2, X(0.016));
  ctx.fill();
  ctx.fillStyle = 'rgba(255,230,180,.45)';
  ctx.fillRect(bx0 - fr + 3, by0 - fr + 2, bs + fr * 2 - 6, 2);
  for (const [px, py] of [[bx0 - fr * 0.5, by0 - fr * 0.5], [bx0 + bs + fr * 0.5, by0 - fr * 0.5], [bx0 - fr * 0.5, by0 + bs + fr * 0.5], [bx0 + bs + fr * 0.5, by0 + bs + fr * 0.5]]) {
    ctx.fillStyle = '#7a5a3a';
    ctx.beginPath();
    ctx.arc(px, py, 2.2, 0, Math.PI * 2);
    ctx.fill();
  }
  // 흙
  ctx.fillStyle = '#5a3a20';
  ctx.fillRect(bx0, by0, bs, bs);
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) {
      const hv = hsh(y * 13 + x * 5 + 1);
      ctx.fillStyle = (x + y) % 2 ? `hsl(26, 40%, ${26 + hv * 5}%)` : `hsl(28, 42%, ${30 + hv * 5}%)`;
      ctx.fillRect(CX(x) + 0.5, CY(y) + 0.5, c - 1, c - 1);
      ctx.fillStyle = 'rgba(255,220,170,.12)';
      ctx.fillRect(CX(x) + c * (0.2 + hv * 0.4), CY(y) + c * (0.3 + hsh(hv * 9) * 0.4), 2, 2);
    }
  // 안쪽 그림자 (틀이 흙에 드리운)
  const ig = ctx.createLinearGradient(0, by0, 0, by0 + c * 0.4);
  ig.addColorStop(0, 'rgba(20,10,0,.4)');
  ig.addColorStop(1, 'rgba(20,10,0,0)');
  ctx.fillStyle = ig;
  ctx.fillRect(bx0, by0, bs, c * 0.4);

  // 꿀벌 줄
  if (s.bee >= 0 && s.phase === 'play') {
    const isRow = s.bee < N, k = isRow ? s.bee : s.bee - N, pul = 0.22 + 0.1 * Math.sin(t * 0.12);
    ctx.fillStyle = `rgba(255,214,60,${pul})`;
    if (isRow) ctx.fillRect(bx0, CY(k), bs, c);
    else ctx.fillRect(CX(k), by0, c, bs);
    ctx.strokeStyle = 'rgba(255,214,60,.9)';
    ctx.setLineDash([5, 4]);
    ctx.lineWidth = 2;
    if (isRow) ctx.strokeRect(bx0 + 1, CY(k) + 1, bs - 2, c - 2);
    else ctx.strokeRect(CX(k) + 1, by0 + 1, c - 2, bs - 2);
    ctx.setLineDash([]);
  }

  // ═════ 미리 보기 계산 ═════
  let ghost: { ox: number; oy: number; ok: boolean; rows: number[]; cols: number[]; gain: number } | null = null;
  if (s.down && s.press === 1 && s.aim && s.phase === 'play') {
    const p = placeAt(s.cur.sh, s.aim.x, s.aim.y);
    if (p) {
      const ok = fits(s.b, s.cur.sh, p.ox, p.oy);
      let rows: number[] = [], cols: number[] = [], gain = 0;
      if (ok) {
        const r = applyMove(cloneB(s.b), s.cur.sh, p.ox, p.oy, s.bee, false);
        (rows = r.rows), (cols = r.cols), (gain = gainOf(r, s.streak));
      }
      ghost = { ...p, ok, rows, cols, gain };
    }
  }
  // 첫 놓기 안내: 가장 많이 지우는 자리를 반짝
  let guide: { ox: number; oy: number } | null = null;
  if (s.stage === 0 && !s.firstPlace && s.phase === 'play' && !ghost) {
    let bl = 0;
    for (const pos of placements(s.b, s.cur.sh)) {
      const r = applyMove(cloneB(s.b), s.cur.sh, pos % N, Math.floor(pos / N), -1, false);
      if (r.lines > bl) (bl = r.lines), (guide = { ox: pos % N, oy: Math.floor(pos / N) });
    }
  }
  // 채워질 줄 반짝 (미리 보기)
  if (ghost && ghost.ok && (ghost.rows.length || ghost.cols.length)) {
    const pul = 0.28 + 0.14 * Math.sin(t * 0.3);
    ctx.fillStyle = `rgba(255,236,120,${pul})`;
    for (const y of ghost.rows) ctx.fillRect(bx0, CY(y), bs, c);
    for (const x of ghost.cols) ctx.fillRect(CX(x), by0, c, bs);
  }
  if (ghost && s.cur.sh === CAN) {
    ctx.fillStyle = 'rgba(140,220,255,.28)';
    ctx.fillRect(bx0, CY(ghost.oy), bs, c);
    ctx.fillRect(CX(ghost.ox), by0, c, bs);
  }

  // ═════ 칸들 (위 줄부터) ═════
  const glowCell = (i: number) => !!ghost && ghost.ok && (ghost.rows.includes(Math.floor(i / N)) || ghost.cols.includes(i % N));
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) {
      const i = y * N + x, k = s.b.k[i];
      if (!k) continue;
      const age = t - s.drop[i], lift = age >= 0 && age < 10 ? (1 - age / 10) * c * 0.5 : 0;
      const gl = glowCell(i);
      if (k === SEED) seedCell(ctx, CX(x), CY(y), c, s.tint[i], t, i, lift + (gl ? Math.abs(Math.sin(t * 0.3 + i)) * c * 0.06 : 0), gl ? 0.35 + 0.2 * Math.sin(t * 0.3 + i) : 0);
      else if (k === STONE) stoneCell(ctx, CX(x), CY(y), c, s.b.hp[i], s.tint[i] === WITHER, i);
      else if (k === WEED) weedCell(ctx, CX(x), CY(y), c, t, i, lift);
      else if (k === GOLD) goldCell(ctx, CX(x), CY(y), c, s.b.hp[i], t, i, font);
      if (gl && k !== SEED) {
        ctx.strokeStyle = '#fff6a0';
        ctx.lineWidth = 2;
        ctx.strokeRect(CX(x) + 2, CY(y) + 2, c - 4, c - 4);
      }
    }
  // 채워질 줄: 칸들 위로 빛나는 테두리
  if (ghost && ghost.ok && (ghost.rows.length || ghost.cols.length)) {
    ctx.save();
    ctx.shadowColor = '#fff6a0';
    ctx.shadowBlur = X(0.03);
    ctx.strokeStyle = `rgba(255,240,140,${0.75 + 0.25 * Math.sin(t * 0.3)})`;
    ctx.lineWidth = 3;
    for (const y of ghost.rows) {
      ctx.beginPath();
      ctx.roundRect(bx0 + 1, CY(y) + 1, bs - 2, c - 2, c * 0.2);
      ctx.stroke();
    }
    for (const x of ghost.cols) {
      ctx.beginPath();
      ctx.roundRect(CX(x) + 1, by0 + 1, c - 2, bs - 2, c * 0.2);
      ctx.stroke();
    }
    ctx.restore();
  }
  // 꿀벌 줄의 꿀벌들
  if (s.bee >= 0 && s.phase === 'play') {
    const isRow = s.bee < N, k = isRow ? s.bee : s.bee - N;
    for (let j = 0; j < 2; j++) {
      const a = t * 0.05 + j * Math.PI;
      const bxx = isRow ? bx0 + bs * (0.25 + 0.5 * j) + Math.cos(a) * c * 0.8 : CX(k) + c * 0.5 + Math.sin(a) * c * 0.4;
      const byy = isRow ? CY(k) + c * 0.5 + Math.sin(a * 2) * c * 0.3 : by0 + bs * (0.25 + 0.5 * j) + Math.cos(a) * c * 0.8;
      bee(ctx, bxx, byy - c * 0.3, X(0.022), t, Math.cos(a) > 0 ? 1 : -1);
    }
  }

  // ═════ 미리 보기 조각 ═════
  if (ghost) {
    if (s.cur.sh === CAN) canIcon(ctx, CX(ghost.ox) + c * 0.4, CY(ghost.oy) + c * 0.45, c * 0.42, -0.5 + Math.sin(t * 0.2) * 0.1);
    else
      for (const [dx, dy] of SHAPES[s.cur.sh]) {
        const gx = CX(ghost.ox + dx), gy = CY(ghost.oy + dy);
        if (ghost.ok) {
          seedCell(ctx, gx, gy, c, s.cur.tint, t, dx + dy * 5, c * 0.14, 0, 0.8);
          ctx.strokeStyle = `rgba(255,255,255,${0.75 + 0.25 * Math.sin(t * 0.3)})`;
          ctx.lineWidth = 2;
          ctx.setLineDash([4, 3]);
          ctx.beginPath();
          ctx.roundRect(gx + 1.5, gy + 1.5 - c * 0.14, c - 3, c - 3, c * 0.16);
          ctx.stroke();
          ctx.setLineDash([]);
        } else {
          ctx.fillStyle = 'rgba(255,70,60,.5)';
          ctx.beginPath();
          ctx.roundRect(gx + 2, gy + 2, c - 4, c - 4, c * 0.16);
          ctx.fill();
          ctx.strokeStyle = '#ffdddd';
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      }
    // 결과 미리 말하기: 꽃 +N
    const gw = shW(s.cur.sh), tx = CX(ghost.ox + gw / 2), ty = CY(ghost.oy) - X(0.03);
    if (ghost.ok && ghost.gain > 0) {
      font(0.046, 900);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineWidth = 4;
      ctx.strokeStyle = 'rgba(60,30,0,.75)';
      const lab = `🌸 +${ghost.gain}${ghost.rows.length + ghost.cols.length + s.streak > 1 ? ` ×${multOf(ghost.rows.length + ghost.cols.length, s.streak)}` : ''}`;
      ctx.strokeText(lab, tx, Math.max(X(BY) + X(0.02), ty));
      ctx.fillStyle = '#fff3a0';
      ctx.fillText(lab, tx, Math.max(X(BY) + X(0.02), ty));
    } else if (!ghost.ok) {
      font(0.04, 900);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineWidth = 4;
      ctx.strokeStyle = 'rgba(80,0,0,.7)';
      ctx.strokeText('자리가 없어요', tx, Math.max(X(BY) + X(0.02), ty));
      ctx.fillStyle = '#ffd6d0';
      ctx.fillText('자리가 없어요', tx, Math.max(X(BY) + X(0.02), ty));
    }
  }

  // ═════ 활짝 피는 꽃 (지운 칸) ═════
  for (const b of s.blooms) {
    const a = t - b.t;
    if (a < 0 || a > 90) continue;
    const px = CX(b.x) + c * 0.5, py = CY(b.y) + c * 0.45;
    if (b.kind === STONE) {
      ctx.globalAlpha = Math.max(0, 1 - a / 30);
      for (let k = 0; k < 4; k++) {
        ctx.fillStyle = '#9a958b';
        ctx.beginPath();
        ctx.arc(px + Math.cos(k * 1.7) * a * 0.8, py + Math.sin(k * 1.7) * a * 0.6 + a * a * 0.02, c * 0.12, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      continue;
    }
    if (b.kind === WEED) {
      ctx.globalAlpha = Math.max(0, 1 - a / 40);
      ctx.save();
      ctx.translate(px, py - a * 1.2);
      ctx.rotate(a * 0.15);
      weedCell(ctx, -c * 0.5, -c * 0.5, c * 0.8, t, b.x, 0);
      ctx.restore();
      ctx.globalAlpha = 1;
      continue;
    }
    const grow = Math.min(1, a / 10), sc = a < 10 ? 0.3 + 1.0 * grow : 1.3 - Math.min(0.3, (a - 10) / 40);
    const rise = a > 25 ? (a - 25) * (0.9 + b.big * 0.25) : 0, fade = a > 45 ? Math.max(0, 1 - (a - 45) / 45) : 1;
    ctx.globalAlpha = fade;
    const petal = b.tint >= 7 ? SPECIAL_PETAL[b.tint] ?? '#ffd43b' : TINT[b.tint % 6].petal;
    // 줄기
    if (a < 30) {
      ctx.strokeStyle = '#3f9a3a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(px, py + c * 0.3);
      ctx.lineTo(px, py - c * 0.1 * sc);
      ctx.stroke();
    }
    flower(ctx, px + Math.sin(a * 0.1 + b.x) * rise * 0.3, py - c * 0.15 * sc - rise, c * 0.36 * sc, petal, a * 0.05 + b.x);
    if (b.kind === GOLD) {
      ctx.fillStyle = '#fffbe0';
      star(ctx, px, py - c * 0.15 * sc - rise, c * 0.15);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  // 줄이 피는 빛 (쓸고 지나가는 빛줄기)
  for (const e of s.events) {
    if (e.kind !== 'line') continue;
    const a = t - e.t;
    if (a > 26) continue;
    const isRow = e.n === 0, p = a / 26;
    ctx.globalAlpha = 1 - p;
    const lg = isRow ? ctx.createLinearGradient(bx0, 0, bx0 + bs, 0) : ctx.createLinearGradient(0, by0, 0, by0 + bs);
    const m = Math.min(0.95, p * 1.4);
    lg.addColorStop(0, 'rgba(255,255,220,0)');
    lg.addColorStop(Math.max(0, m - 0.05), 'rgba(255,255,220,.2)');
    lg.addColorStop(m, 'rgba(255,255,240,.95)');
    lg.addColorStop(Math.min(1, m + 0.05), 'rgba(255,255,220,.2)');
    lg.addColorStop(1, 'rgba(255,255,220,0)');
    ctx.fillStyle = lg;
    if (isRow) ctx.fillRect(bx0, CY(e.y - 0.5) - c * 0.15, bs, c * 1.3);
    else ctx.fillRect(CX(e.x - 0.5) - c * 0.15, by0, c * 1.3, bs);
    ctx.globalAlpha = 1;
  }
  // 꿀벌 한 마리 (구경꾼): 밭 위를 빙글빙글
  if (s.bee < 0) {
    const a = t * 0.013;
    bee(ctx, bx0 + bs * (0.5 + 0.42 * Math.sin(a * 1.3)), by0 + bs * (0.5 + 0.45 * Math.sin(a * 2.1 + 1)) - X(0.02), X(0.02), t, Math.cos(a * 1.3) > 0 ? 1 : -1);
  }
  // 첫 안내: 빈 고랑이 반짝 + 손가락
  if (guide) {
    const pul = 0.45 + 0.3 * Math.sin(t * 0.15);
    ctx.save();
    ctx.shadowColor = '#fff6a0';
    ctx.shadowBlur = X(0.05);
    ctx.fillStyle = `rgba(255,246,160,${pul})`;
    for (const [dx, dy] of cellsOf(s.cur.sh)) {
      ctx.beginPath();
      ctx.roundRect(CX(guide.ox + dx) + 3, CY(guide.oy + dy) + 3, c - 6, c - 6, c * 0.18);
      ctx.fill();
    }
    ctx.restore();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 4]);
    for (const [dx, dy] of cellsOf(s.cur.sh)) {
      ctx.beginPath();
      ctx.roundRect(CX(guide.ox + dx) + 3, CY(guide.oy + dy) + 3, c - 6, c - 6, c * 0.18);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    const gw = shW(s.cur.sh), gh = shH(s.cur.sh), hx = CX(guide.ox + gw / 2) + c * 0.3, hy = CY(guide.oy + gh / 2) + c * 0.2 + Math.abs(Math.sin(t * 0.12)) * c * 0.35;
    ctx.fillStyle = '#ffffff';
    font(0.09, 400);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('👆', hx, hy + c * 0.6);
  }

  // ═════ 조각 상자 · 두더지 ═════
  const crate = (bx: { x: number; y: number; w: number; h: number }, main: boolean, dim: boolean, warn: boolean) => {
    const x = X(bx.x), y = X(bx.y), ww = X(bx.w), hh = X(bx.h), dep = X(0.024);
    ctx.fillStyle = 'rgba(40,25,5,.3)';
    ctx.beginPath();
    ctx.roundRect(x + 3, y + 5, ww, hh, X(0.02));
    ctx.fill();
    ctx.fillStyle = main ? '#8a5a2e' : '#7a5230';
    ctx.beginPath();
    ctx.roundRect(x, y, ww, hh, X(0.02));
    ctx.fill();
    ctx.fillStyle = main ? '#c99a5e' : '#b08a5e';
    ctx.beginPath();
    ctx.roundRect(x, y, ww, hh - dep, X(0.02));
    ctx.fill();
    ctx.fillStyle = main ? '#5a3a1e' : '#5e4228';
    ctx.beginPath();
    ctx.roundRect(x + X(0.012), y + X(0.012), ww - X(0.024), hh - dep - X(0.024), X(0.012));
    ctx.fill();
    if (dim) {
      ctx.fillStyle = 'rgba(0,0,0,.25)';
      ctx.fill();
    }
    if (warn) {
      ctx.strokeStyle = `rgba(255,90,70,${0.6 + 0.4 * Math.sin(t * 0.3)})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(x - 2, y - 2, ww + 4, hh + 4, X(0.024));
      ctx.stroke();
    }
  };
  crate(CUR, true, false, s.stuck && s.phase === 'play');
  crate(NXT[0], false, false, false);
  crate(NXT[1], false, true, false);
  {
    const cc = Math.min(X(0.052), (X(CUR.w) - X(0.05)) / Math.max(shW(s.cur.sh), 1), (X(CUR.h) - X(0.06)) / Math.max(shH(s.cur.sh), 1));
    const pop = t - s.swapT < 12 ? 1 + 0.25 * Math.sin(((t - s.swapT) / 12) * Math.PI) : 1;
    ctx.save();
    ctx.translate(X(CUR.x + CUR.w / 2), X(CUR.y + CUR.h / 2 - 0.008));
    ctx.scale(pop, pop);
    if (s.phase === 'play' && !(s.down && s.press === 1)) pieceMini(ctx, s.cur, 0, 0, cc, t, 1);
    else if (s.phase === 'play') pieceMini(ctx, s.cur, 0, 0, cc, t, 0.35);
    ctx.restore();
    for (let k = 0; k < 2; k++) {
      const p = s.nx[k], bxx = NXT[k];
      if (!p || s.left < k + 2) {
        ctx.fillStyle = 'rgba(255,255,255,.35)';
        font(0.04, 900);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('—', X(bxx.x + bxx.w / 2), X(bxx.y + bxx.h / 2 - 0.01));
        continue;
      }
      const c2 = Math.min(X(0.034), (X(bxx.w) - X(0.04)) / shW(p.sh), (X(bxx.h) - X(0.05)) / shH(p.sh));
      pieceMini(ctx, p, X(bxx.x + bxx.w / 2), X(bxx.y + bxx.h / 2 - 0.008), c2, t, k ? 0.75 : 0.95);
    }
    // 이름표
    const tag = (x: number, y: number, text: string, col: string) => {
      font(0.036, 900);
      const tw = ctx.measureText(text).width + X(0.03);
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.roundRect(x - tw / 2, y - X(0.022), tw, X(0.044), X(0.022));
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, x, y + 1);
    };
    tag(X(CUR.x + 0.07), X(CUR.y - 0.004), '지금', '#3f8a3a');
    tag(X(CUR.x + CUR.w - 0.055), X(CUR.y - 0.004), '⇄ 톡', s.stuck ? '#e05a40' : '#6a5a9a');
    tag(X(NXT[0].x + NXT[0].w / 2), X(NXT[0].y - 0.004), '다음', '#7a6a50');
  }
  // 두더지 정원사
  {
    let mood = s.mood;
    if (s.phase === 'result' && s.moodT <= 0) mood = s.ok ? 5 : 6;
    if (s.moodT <= 0 && s.phase === 'play') {
      let filled = 0;
      for (let i = 0; i < NN; i++) if (s.b.k[i]) filled++;
      if (s.stuck || filled > 46) mood = 2;
    }
    drawMole(ctx, X(MOLE.x), X(MOLE.y), X(0.066), mood, t, s.power);
    if (mood === 4 && s.moodT > 0) {
      ctx.fillStyle = '#ffffff';
      font(0.05, 900);
      ctx.textAlign = 'center';
      ctx.fillText(['', '', '🎉', '💃', '🌟', '🔥'][Math.min(5, s.power + 1)] || '🔥', X(MOLE.x + 0.06), X(MOLE.y - 0.15) - Math.abs(Math.sin(t * 0.2)) * X(0.02));
    }
  }

  // ═════ 사건 연출 ═════
  const seenT = fx.memo.t ?? -1;
  for (const e of s.events) {
    if (e.t <= seenT) continue;
    const x = CX(e.x), y = CY(e.y);
    switch (e.kind) {
      case 'place':
        fx.burst(x, y, '#8a5a33', 8, 2, 2.2), fx.kick(1);
        break;
      case 'line': {
        const isRow = e.n === 0;
        for (let k = 0; k < 6; k++) {
          const px = isRow ? bx0 + (k + 0.5) * (bs / 6) : x, py = isRow ? y : by0 + (k + 0.5) * (bs / 6);
          fx.burst(px, py, TINT[(k + Math.floor(e.x + e.y)) % 6].petal, 6, 3, 2.6);
        }
        break;
      }
      case 'bloom':
        fx.burst(x, y, '#ffe066', 14, 3.4, 2.4), fx.ring(x, y, '#fff6c8', X(0.08), 3), say(x, y - X(0.05), e.text!, '#fff3a0', 18), fx.kick(2.5);
        break;
      case 'multi': {
        const n = e.n ?? 2;
        for (let k = 0; k < 3 + n * 2; k++) {
          const px = bx0 + hsh(e.t + k * 3.3) * bs, py = by0 + hsh(e.t * 1.7 + k) * bs;
          fx.burst(px, py, ['#ffe066', '#ff9ec4', '#ffffff', '#b8e2ff', '#c9b3ff'][k % 5], 18, 4.5, 2.8);
          fx.ring(px, py, '#fff6c8', X(0.06 + 0.02 * n), 3);
        }
        fx.kick(4 + n * 2), fx.blink('#fff6c8', 0.15 + 0.05 * n);
        say(w / 2, by0 + bs * 0.42, `${n}줄! 꽃가루 폭죽!`, '#ffffff', 22 + n * 2);
        say(x, y - X(0.05), e.text!, '#fff3a0', 20);
        break;
      }
      case 'combo':
        say(w / 2, by0 + bs * 0.25, e.text!, '#ffb84a', 20 + Math.min(4, e.n ?? 2) * 2), fx.ring(w / 2, by0 + bs * 0.25, '#ffb84a', X(0.2), 4);
        break;
      case 'crack':
        fx.burst(x, y, '#b9b3a8', 12, 3, 2.4), fx.kick(3), say(x, y - X(0.05), e.text!, '#e8e4dc', 16);
        break;
      case 'break':
        if (e.text === '콤보 끊김…') say(w / 2, by0 + bs * 0.25, e.text, '#d8e8c8', 15);
        else fx.burst(x, y, '#9a958b', 26, 4.5, 3), fx.ring(x, y, '#ffffff', X(0.08), 4), fx.kick(6), say(x, y - X(0.06), e.text!, '#ffffff', 19);
        break;
      case 'weedpull':
        fx.burst(x, y, '#5aa83a', 16, 3.6, 2.4), say(x, y - X(0.05), e.text!, '#c8f0a8', 16);
        break;
      case 'spread':
        fx.burst(x, y, '#2f6b1f', 12, 2.6, 2.2), fx.kick(2), say(x, y - X(0.05), e.text!, '#c8f0a8', 15);
        break;
      case 'gold':
        fx.burst(x, y, '#ffd43b', 34, 5, 3), fx.ring(x, y, '#ffe066', X(0.12), 5), fx.blink('#fff6c8', 0.2), say(x, y - X(0.06), e.text!, '#ffd84a', 19);
        break;
      case 'wilt':
        fx.burst(x, y, '#8c7a5c', 14, 2.4, 2.2), say(x, y - X(0.05), e.text!, '#e8d8b8', 15);
        break;
      case 'bee':
        fx.burst(x, y, '#ffcf2a', 24, 4, 2.6), say(x, y - X(0.06), e.text!, '#ffe066', 18);
        break;
      case 'can':
        for (let k = 0; k < N; k++) fx.burst(CX(k + 0.5), y, '#9fe3ff', 5, 2.6, 2.2), fx.burst(x, CY(k + 0.5), '#9fe3ff', 5, 2.6, 2.2);
        fx.ring(x, y, '#bff3ff', X(0.2), 5), fx.kick(4), say(x, y - X(0.06), e.text!, '#bff3ff', 18);
        break;
      case 'nope':
        say(x, y - X(0.03), e.text!, '#ffd6cc', 15), fx.kick(1.5);
        break;
      case 'swap':
        fx.burst(X(CUR.x + CUR.w / 2), X(CUR.y + CUR.h / 2), '#ffffff', 12, 3, 2.2), say(X(CUR.x + CUR.w / 2), X(CUR.y - 0.03), e.text!, '#ffffff', 15);
        break;
      case 'rescue':
        say(X(CUR.x + CUR.w / 2), X(CUR.y - 0.03), e.text!, '#fff3a0', 14);
        break;
      case 'fail':
        fx.kick(8), fx.blink(th.hot, 0.18);
        break;
    }
  }
  fx.memo.t = s.t;
  // 밭 완성 축하는 꽃이 다 핀 뒤에 (카드와 함께)
  if (s.phase === 'result' && s.ok && s.pt >= CARD_DELAY && (fx.memo.clr ?? -1) !== s.t - s.pt) {
    fx.memo.clr = s.t - s.pt;
    for (let k = 0; k < 5; k++) fx.burst(bx0 + bs * (0.1 + 0.2 * k), by0 + bs * (0.3 + 0.2 * (k % 2)), ['#ffe066', '#ff9ec4', '#ffffff', '#b8e2ff', '#c9b3ff'][k], 30, 6, 3.2);
    fx.ring(w / 2, by0 + bs / 2, '#ffe066', X(0.45), 7), fx.blink('#fff6c8', 0.22);
  }
  ctx.restore();

  // ═════════════ HUD ═════════════
  const hb = X(0.075);
  ctx.fillStyle = 'rgba(44,72,34,.92)';
  ctx.fillRect(0, 0, w, hb);
  ctx.fillStyle = 'rgba(255,255,255,.12)';
  ctx.fillRect(0, hb - 2, w, 2);
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffffff';
  font(0.045, 900);
  const ttl = `🌷 ${s.stage + 1}번째 밭`, tw1 = ctx.measureText(ttl).width;
  ctx.fillText(ttl, X(0.03), hb * 0.52);
  font(0.036, 800);
  ctx.fillStyle = '#cfe6b8';
  ctx.fillText(` / ${STAGE_COUNT}`, X(0.03) + tw1, hb * 0.56);
  ctx.textAlign = 'right';
  font(0.042, 900);
  ctx.fillStyle = '#ffd84a';
  const stt = `★ ${s.stars}/${STAGE_COUNT * 3}`;
  ctx.fillText(stt, w - X(0.03), hb * 0.52);
  ctx.fillStyle = '#ff7a7a';
  ctx.fillText('♥'.repeat(Math.max(0, s.hearts)) + '♡'.repeat(Math.max(0, 3 - s.hearts)), w - X(0.05) - ctx.measureText(stt).width, hb * 0.52);
  // 목표 팻말 (담장에 걸린 나무 팻말): 꽃 진행 + 남은 모종
  {
    const py = X(0.152), ph = X(0.058), px0 = X(0.04), pw = w - X(0.08);
    ctx.fillStyle = 'rgba(40,20,5,.35)';
    ctx.beginPath();
    ctx.roundRect(px0 + 2, py + 3, pw, ph, X(0.016));
    ctx.fill();
    ctx.fillStyle = '#e8c890';
    ctx.beginPath();
    ctx.roundRect(px0, py, pw, ph, X(0.016));
    ctx.fill();
    ctx.strokeStyle = '#9a6a3a';
    ctx.lineWidth = 2;
    ctx.stroke();
    const mid = py + ph / 2;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    font(0.04, 900);
    ctx.fillStyle = '#5a3418';
    const ft = `🌸 ${Math.min(s.flowers, 999)}/${d.goal}`;
    ctx.fillText(ft, px0 + X(0.02), mid + 1);
    const fw = ctx.measureText(ft).width;
    const combo = s.streak >= 1 && s.phase === 'play';
    const barX = px0 + X(0.03) + fw, barW = pw - fw - X(combo ? 0.39 : 0.28), prog = Math.min(1, s.flowers / d.goal);
    ctx.fillStyle = 'rgba(90,52,24,.25)';
    ctx.beginPath();
    ctx.roundRect(barX, mid - X(0.012), barW, X(0.024), X(0.012));
    ctx.fill();
    if (prog > 0) {
      const bg2 = ctx.createLinearGradient(barX, 0, barX + barW, 0);
      bg2.addColorStop(0, '#ff8fb3');
      bg2.addColorStop(1, '#ffd84a');
      ctx.fillStyle = bg2;
      ctx.beginPath();
      ctx.roundRect(barX, mid - X(0.012), Math.max(X(0.024), barW * prog), X(0.024), X(0.012));
      ctx.fill();
    }
    ctx.textAlign = 'right';
    font(0.038, 900);
    ctx.fillStyle = s.left <= 3 ? '#c0392b' : '#5a3418';
    ctx.fillText(`🌱 모종 ${s.left}`, px0 + pw - X(0.02), mid + 1);
    if (combo) {
      // 콤보 배지: 다음에 또 지우면 배수가 오른다
      ctx.textAlign = 'center';
      font(0.036, 900);
      const ct = `🔥${s.streak}`, cx3 = barX + barW + X(0.055);
      const pul = 1 + 0.08 * Math.sin(t * 0.25);
      ctx.save();
      ctx.translate(cx3, mid);
      ctx.scale(pul, pul);
      ctx.fillStyle = '#ff7a2a';
      ctx.beginPath();
      ctx.roundRect(-X(0.04), -X(0.021), X(0.08), X(0.042), X(0.021));
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.fillText(ct, 0, 1);
      ctx.restore();
    }
  }
  // 새것 알림 띠 (담장 아래쪽)
  if (s.news && s.t - s.news.t < NEWS_T) {
    const age = s.t - s.news.t, a = Math.min(1, age / 10, (NEWS_T - age) / 20), drop = Math.max(0, 10 - age) * 2;
    ctx.globalAlpha = a;
    font(0.037, 900);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const tx = s.news.text, tw2 = Math.min(w - 10, ctx.measureText(tx).width + 24), by2 = X(0.247) + drop;
    ctx.fillStyle = 'rgba(36,60,28,.94)';
    ctx.beginPath();
    ctx.roundRect(w / 2 - tw2 / 2, by2 - X(0.027), tw2, X(0.054), X(0.027));
    ctx.fill();
    ctx.strokeStyle = th.accent;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.fillText(tx, w / 2, by2 + 1, w - 24);
    ctx.globalAlpha = 1;
  }
  // 판 카드: 시작 · 완성 · 실패
  {
    let head = '', sub = '', nw = '', col = '#ffffff', age = 0, a = 1;
    if (s.phase === 'result' && s.pt >= (s.ok ? CARD_DELAY : 20)) {
      age = s.pt - (s.ok ? CARD_DELAY : 20);
      if (s.ok) (head = s.won ? '꽃 잔치 대성공! 🌷' : '밭 완성!'), (sub = `꽃 ✓ · 모종 ${s.left}개 남김${s.starOk[1] ? ' ✓' : ` (≥${d.spare} ✗)`} · ${STAR3_LABEL[d.star3]} ${s.starOk[2] ? '✓' : '✗'}`), (col = '#ffd84a');
      else (head = `앗… ${s.why}`), (sub = s.hearts > 0 ? '하트 -1 · 같은 밭 다시' : '끝 — 두더지가 고마워해요!'), (col = '#ffb3a8');
    } else if (s.phase === 'play' && s.pt < CARD_T) {
      age = s.pt;
      a = Math.min(1, (CARD_T - s.pt) / 20);
      head = s.again ? `다시! ${s.stage + 1}번째 밭 · ${d.name}` : `${s.stage + 1}번째 밭 · ${d.name}`;
      sub = `꽃 ${d.goal}송이 · 모종 ${d.pieces}개 · ★ ${STAR3_LABEL[d.star3]}`;
      nw = d.news;
    }
    if (head) {
      const sc = Math.min(1, 0.6 + age / 12), cyy = s.phase === 'result' ? X(BY + 0.3) : X(nw ? 0.17 : 0.19), ch = nw ? 0.158 : 0.11;
      ctx.save();
      ctx.globalAlpha = a;
      ctx.translate(w / 2, cyy);
      ctx.scale(sc, sc);
      ctx.fillStyle = 'rgba(36,60,28,.94)';
      ctx.beginPath();
      ctx.roundRect(-X(0.44), -X(0.055), X(0.88), X(ch), X(0.04));
      ctx.fill();
      ctx.strokeStyle = col;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = col;
      font(0.048, 900);
      if (s.phase === 'result' && s.ok) {
        const hw = ctx.measureText(head).width, sw = X(0.056), x0 = -(hw + X(0.02) + sw * 3) / 2;
        ctx.textAlign = 'left';
        ctx.fillText(head, x0, -X(0.018));
        for (let k = 0; k < 3; k++) {
          const ag = age - (10 + k * 13);
          if (ag < 0) continue;
          const got = s.starOk[k], pop = ag < 8 ? 1.9 - 0.9 * (ag / 8) : 1, sx = x0 + hw + X(0.02) + sw * (k + 0.5);
          ctx.save();
          ctx.translate(sx, -X(0.018));
          ctx.scale(pop, pop);
          star(ctx, 0, 0, X(0.024));
          ctx.fillStyle = got ? '#ffd43b' : 'rgba(255,255,255,.12)';
          ctx.fill();
          ctx.strokeStyle = got ? '#fff3b0' : 'rgba(255,255,255,.45)';
          ctx.lineWidth = 1.5;
          ctx.stroke();
          ctx.restore();
          if (got && (fx.memo['star' + k] ?? -1) < s.t - ag) (fx.memo['star' + k] = s.t - ag), fx.burst(w / 2 + sx, cyy - X(0.018), '#ffe066', 16, 3, 2.4);
        }
        ctx.textAlign = 'center';
      } else ctx.fillText(head, 0, -X(0.018), X(0.82));
      ctx.fillStyle = '#fffaf0';
      font(0.036, 800);
      ctx.fillText(sub, 0, X(0.03), X(0.82));
      if (nw) {
        ctx.fillStyle = '#ffe9a8';
        font(0.036, 900);
        ctx.fillText(nw, 0, X(0.077), X(0.84));
      }
      ctx.restore();
    }
  }
  // ═════════════ 아래 띠: 별 셋 + 안내 ═════════════
  {
    const ty = X(BAND);
    const g = ctx.createLinearGradient(0, ty, 0, h);
    g.addColorStop(0, 'rgba(44,72,34,.95)');
    g.addColorStop(1, 'rgba(30,52,24,.98)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.roundRect(0, ty, w, h - ty + 4, [X(0.03), X(0.03), 0, 0]);
    ctx.fill();
    const sp = special(s, d);
    const res = s.phase === 'result' && s.ok;
    const okk = res ? s.starOk : [s.flowers >= d.goal, false, sp.done];
    const bad = [s.phase === 'result' && !s.ok, s.left < d.spare, !sp.can];
    const labels = [`꽃 ${d.goal}`, `모종 ${d.spare}+ 남김`, star3Text(s)];
    const widths = [0.24, 0.3, 0.38], r2 = ty + X(0.045);
    let cx1 = X(0.025);
    for (let k = 0; k < 3; k++) {
      const cw2 = X(widths[k]);
      const on = okk[k], off = bad[k] && !on;
      ctx.fillStyle = on ? 'rgba(255,216,74,.25)' : off ? 'rgba(0,0,0,.35)' : 'rgba(255,255,255,.08)';
      ctx.beginPath();
      ctx.roundRect(cx1, r2 - X(0.027), cw2, X(0.054), X(0.027));
      ctx.fill();
      ctx.strokeStyle = on ? '#ffd84a' : off ? 'rgba(255,255,255,.15)' : 'rgba(255,255,255,.3)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = on ? '#ffd84a' : off ? 'rgba(255,255,255,.3)' : 'rgba(255,255,255,.6)';
      font(0.04, 900);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(off ? '✗' : '★', cx1 + X(0.028), r2 + 1);
      ctx.fillStyle = on ? '#fff6dc' : off ? 'rgba(255,255,255,.4)' : '#eef8e4';
      font(0.036, 800);
      ctx.textAlign = 'left';
      ctx.fillText(labels[k], cx1 + X(0.052), r2 + 1, cw2 - X(0.06));
      cx1 += cw2 + X(0.012);
    }
    let hint = d.hint;
    const first = s.stage === 0 && !s.firstPlace && s.phase === 'play';
    if (first) hint = s.down ? '떼면 심어요! 반짝이는 줄이 꽃으로 펴요' : '👆 빛나는 고랑을 누르고 있다가 떼요!';
    else if (s.stuck && s.phase === 'play') hint = '🔄 이 조각은 놓을 데가 없어요 — 지금 조각을 톡!';
    else if (s.down && s.press === 1 && s.phase === 'play') hint = ghost && !ghost.ok ? '빨강 = 못 놓아요 · 다른 자리로 옮겨요' : '떼면 심어요 · 밭 밖에서 떼면 취소';
    else if (s.phase === 'result') hint = s.ok ? (s.won ? '모든 밭 완성! 두더지가 덩실덩실' : `★ ${s.got}개! 다음 밭엔 새것이 나와요`) : '누르고 있으면 채워질 줄이 반짝여요';
    else if (s.stage === 1 && s.used < 3) hint = '⇄ 지금 조각을 톡 하면 다음 조각과 바뀌어요';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = first ? '#ffffff' : '#ffe9a8';
    font(first ? 0.042 : 0.038, 900);
    ctx.fillText(hint, w / 2, ty + X(0.122), w - X(0.05));
  }
}
